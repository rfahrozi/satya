/**
 * tests/dashboard.verify.test.jsx
 *
 * Integration-style component test for the Dashboard verify mutation flow.
 * - Mocks the api module (../src/lib/axios) to control GET and PATCH responses.
 * - Renders Dashboard inside a QueryClientProvider and simulates user interaction:
 *   open verify modal -> select status 'revisi' -> enter catatan -> submit
 * - Asserts that PATCH was called with the correct payload.
 *
 * Run with: npm test -- tests/dashboard.verify.test.jsx
 */

import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Dashboard from '../src/pages/Dashboard' // adjust path if needed

// Mock API wrapper used by Dashboard (lib/axios)
jest.mock('../src/lib/axios', () => ({
  get: jest.fn(),
  patch: jest.fn(),
}))

import api from '../src/lib/axios'

const sampleDashboard = {
  data: [
    {
      nama_satker: 'PN Tanjungpinang',
      statistik: { total_wajib: 28, total_upload: 28, persentase_kepatuhan: 100 },
      detail_laporan: [
        {
          report_type_id: 1,
          nama_laporan: 'Laporan Keadaan Perkara Pidana',
          submission_id: 101,
          status_verifikasi: 'belum_verif',
          status_ketepatan_waktu: 'Tepat Waktu',
        },
      ],
    },
  ],
}

function renderWithClient(ui) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>)
}

describe('Dashboard verify flow', () => {
  beforeEach(() => {
    jest.resetAllMocks()
    global.alert = jest.fn()
    // GET dashboard-agregat returns the sample Dashboard payload
    api.get.mockImplementation((url) => {
      if (url.includes('/dashboard-agregat')) {
        return Promise.resolve({ data: sampleDashboard.data })
      }
      // default fallback for download endpoint etc.
      return Promise.resolve({ data: {} })
    })
    api.patch.mockResolvedValue({ data: { success: true } })
    // seed local user as admin
    localStorage.setItem('satya_user', JSON.stringify({ username: 'admin', role: 'ADMIN_PT' }))
    localStorage.setItem('satya_token', 'dummy-token')
  })

  test('admin can verify a report - PATCH called with expected payload', async () => {
    renderWithClient(<Dashboard />)

    // Wait for the satker card to appear
    await waitFor(() => expect(screen.getAllByText('PN Tanjungpinang')[0]).toBeInTheDocument())

    // There should be a Verify button; click it
    const verifyBtn = screen.getByRole('button', { name: /verifikasi/i })
    expect(verifyBtn).toBeInTheDocument()
    fireEvent.click(verifyBtn)

    // The modal should appear
    await waitFor(() => expect(screen.getByText(/Keputusan Verifikasi/i)).toBeInTheDocument())

    // Select status 'revisi' in the verification modal
    // Find the verification select specifically (has "-- Pilih status --" option)
    const selects = screen.getAllByRole('combobox')
    const select = selects.find(s => s.querySelector('option[value=""]'))
    fireEvent.change(select, { target: { value: 'revisi' } })

    // Fill catatan (shown only after selecting revisi)
    const textarea = await screen.findByPlaceholderText(/Jelaskan perbaikan yang dibutuhkan/i)
    fireEvent.change(textarea, { target: { value: 'Perbaiki format tabel pada halaman 2' } })

    // Submit form
    const submitBtn = screen.getByRole('button', { name: /Simpan Verifikasi/i })
    fireEvent.click(submitBtn)

    // Await patch call
    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledTimes(1)
      const [url, body] = api.patch.mock.calls[0]
      // url should include reports/:id/verify
      expect(url).toMatch(/\/reports\/\d+\/verify$/)
      // body should include expected fields
      expect(body).toEqual({
        status_verifikasi: 'revisi',
        catatan_admin: 'Perbaiki format tabel pada halaman 2',
        nilai_angka: null,
      })
    })
  })
})
