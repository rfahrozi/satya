/**
 * tests/axios.refresh.test.js
 */

import axios from 'axios'
import instance, * as axiosLib from '../src/lib/axios'

jest.mock('axios', () => {
  const orig = jest.requireActual('axios');
  const mockInst = orig.create();
  mockInst.post = jest.fn();
  const mockCreate = jest.fn(() => mockInst);
  return {
    ...orig,
    create: mockCreate,
    post: jest.fn(),
  };
});

describe('axios token helpers and refresh flow', () => {
  beforeAll(() => {
    instance.defaults.adapter = async (config) => {
      return { data: 'retry-success', status: 200, statusText: 'OK', config, headers: {} };
    };
  })

  beforeEach(() => {
    localStorage.clear()
    jest.clearAllMocks()
    axios.post.mockClear();
  })

  test('get/set/clear token helpers store tokens in localStorage', () => {
    expect(axiosLib.getAccessToken()).toBeNull()
    axiosLib.setTokens({ accessToken: 'at-1', refreshToken: 'rt-1' })
    expect(axiosLib.getAccessToken()).toBe('at-1')
    axiosLib.clearTokens()
    expect(axiosLib.getAccessToken()).toBeNull()
  })

  test('refreshAuth successfully obtains new tokens and stores them', async () => {
    axios.post.mockResolvedValueOnce({ data: { accessToken: 'new-at', refreshToken: 'new-rt' } })
    const p1 = axiosLib.refreshAuth();
    const p2 = axiosLib.refreshAuth();
    expect(axios.post).toHaveBeenCalledTimes(1);
    const newToken = await p1;
    expect(newToken).toBe('new-at')
    expect(localStorage.getItem('satya_token')).toBe('new-at')
  })

  test('request interceptor attaches token', () => {
    const reqHandler = instance.interceptors.request.handlers[0].fulfilled;
    localStorage.setItem('satya_token', 'my-token');
    const config = reqHandler({ headers: {} });
    expect(config.headers.Authorization).toBe('Bearer my-token');
    localStorage.removeItem('satya_token');
    const configEmpty = reqHandler({ headers: {} });
    expect(configEmpty.headers.Authorization).toBeUndefined();
  })

  test('response interceptor handles 401 using refresh flow', async () => {
    const resSuccess = instance.interceptors.response.handlers[0].fulfilled;
    const resError = instance.interceptors.response.handlers[0].rejected;

    const resp = { status: 200, data: 'ok' };
    expect(resSuccess(resp)).toBe(resp);

    await expect(resError({})).rejects.toEqual({});
    await expect(resError({ config: { url: '/auth/refresh' }, response: { status: 401 } })).rejects.toBeTruthy();
    expect(localStorage.getItem('satya_token')).toBeNull();
  })

  test('logoutAndRedirect', () => {
      axiosLib.setTokens({ accessToken: 'a', refreshToken: 'b' });
      const navigateFn = jest.fn();
      axiosLib.logoutAndRedirect(navigateFn);
      expect(navigateFn).toHaveBeenCalledWith('/login');
      expect(axiosLib.getAccessToken()).toBeNull();
  })
})
