/**
 * tests/axios.advanced.test.js
 *
 * Advanced tests for the axios instance covering:
 * - 401 response interceptor with refresh + retry flow
 * - processQueue function
 * - getRefreshToken helper
 * - logoutAndRedirect with window.location fallback
 * - Error rejection for non-401 errors
 * - Refresh failure clears tokens
 */

import axios from 'axios';
import instance, * as axiosLib from '../src/lib/axios';

jest.mock('axios', () => {
  const orig = jest.requireActual('axios');
  const mockInst = orig.create();
  mockInst.post = jest.fn();
  // Make instance callable for retry
  const mockCreate = jest.fn(() => mockInst);
  return {
    ...orig,
    create: mockCreate,
    post: jest.fn(),
  };
});

describe('axios advanced interceptor tests', () => {
  beforeAll(() => {
    instance.defaults.adapter = async (config) => {
      return { data: 'retry-success', status: 200, statusText: 'OK', config, headers: {} };
    };
  });

  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
    axios.post.mockClear();
  });

  test('getRefreshToken returns null when no token', () => {
    expect(axiosLib.getRefreshToken()).toBeNull();
  });

  test('getRefreshToken returns stored token', () => {
    localStorage.setItem('satya_refresh_token', 'rt-test');
    expect(axiosLib.getRefreshToken()).toBe('rt-test');
  });

  test('setTokens stores both accessToken and refreshToken', () => {
    axiosLib.setTokens({ accessToken: 'at-x', refreshToken: 'rt-x' });
    expect(localStorage.getItem('satya_token')).toBe('at-x');
    expect(localStorage.getItem('satya_refresh_token')).toBe('rt-x');
  });

  test('clearTokens removes all satya keys', () => {
    axiosLib.setTokens({ accessToken: 'at', refreshToken: 'rt' });
    localStorage.setItem('satya_user', JSON.stringify({ id: 1 }));
    axiosLib.clearTokens();
    expect(localStorage.getItem('satya_token')).toBeNull();
    expect(localStorage.getItem('satya_refresh_token')).toBeNull();
    expect(localStorage.getItem('satya_user')).toBeNull();
  });

  test('response interceptor retries request after successful refresh on 401', async () => {
    const resError = instance.interceptors.response.handlers[0].rejected;

    // Setup: have a valid refresh token
    localStorage.setItem('satya_refresh_token', 'old-rt');
    axios.post.mockResolvedValueOnce({
      data: { accessToken: 'new-at', refreshToken: 'new-rt' },
    });

    const error401 = {
      config: { url: '/api/v1/reports/my-progress', headers: {} },
      response: { status: 401 },
    };

    const result = await resError(error401);
    // Should have retried the request
    expect(result.data).toBe('retry-success');
    // Token should be updated
    expect(localStorage.getItem('satya_token')).toBe('new-at');
  });

  test('response interceptor rejects for non-401 errors (e.g., 500)', async () => {
    const resError = instance.interceptors.response.handlers[0].rejected;

    const error500 = {
      config: { url: '/api/v1/reports/upload', headers: {} },
      response: { status: 500 },
    };

    await expect(resError(error500)).rejects.toEqual(error500);
  });

  test('response interceptor clears tokens and rejects if refresh endpoint itself 401s', async () => {
    const resError = instance.interceptors.response.handlers[0].rejected;

    const refreshError = {
      config: { url: '/auth/refresh' },
      response: { status: 401 },
    };

    await expect(resError(refreshError)).rejects.toEqual(refreshError);
    expect(localStorage.getItem('satya_token')).toBeNull();
  });

  test('refreshAuth clears tokens on failure', async () => {
    localStorage.setItem('satya_refresh_token', 'rt-will-fail');
    axios.post.mockRejectedValueOnce(new Error('SMTP down'));

    await expect(axiosLib.refreshAuth()).rejects.toThrow('SMTP down');
    expect(localStorage.getItem('satya_token')).toBeNull();
    expect(localStorage.getItem('satya_refresh_token')).toBeNull();
  });

  test('logoutAndRedirect without navigateFn uses window.location', () => {
    axiosLib.setTokens({ accessToken: 'a', refreshToken: 'b' });

    // In jsdom, we can't directly set window.location.href, so we just call 
    // logoutAndRedirect and verify tokens are cleared (the navigation part 
    // throws in jsdom, so we catch it)
    try {
      axiosLib.logoutAndRedirect(); // no navigate function
    } catch (e) {
      // jsdom throws 'not implemented' for navigation - that's expected
    }

    expect(axiosLib.getAccessToken()).toBeNull();
  });

  test('request interceptor does not set Authorization if no token', () => {
    const reqHandler = instance.interceptors.request.handlers[0].fulfilled;
    localStorage.removeItem('satya_token');
    const config = reqHandler({ headers: {} });
    expect(config.headers.Authorization).toBeUndefined();
  });
});
