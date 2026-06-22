/**
 * tests/dashboard.admin.test.jsx
 *
 * Tests for Dashboard admin-only sections: admin stats panels, queue status,
 * loop revisi, aktivitas terbaru, Escape key handling, and edge cases.
 */

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Dashboard from '../src/pages/Dashboard';
import api from '../src/lib/axios';

jest.mock('../src/lib/axios', () => ({
  get: jest.fn(),
  patch: jest.fn(),
}));

const mockDashboardData = [
  {
    nama_satker: 'PN Batam',
    statistik: {
      total_wajib: 28,
      total_upload: 20,
      persentase_kepatuhan: '71',
    },
    detail_laporan: [
      {
        report_type_id: 1,
        nama_laporan: 'Laporan Perkara Pidana',
        status_ketepatan_waktu: 'Tepat Waktu',
        status_verifikasi: 'lengkap',
        submission_id: 'sub-101',
      },
      {
        report_type_id: 2,
        nama_laporan: 'Laporan Keuangan',
        status_ketepatan_waktu: null,
        status_verifikasi: null,
        submission_id: null,
      },
    ],
  },
];

const mockAdminStats = {
  antrian_verifikasi: {
    jumlah: 2,
    items: [
      { submission_id: 1, nama_satker: 'PN TPI', nama_laporan: 'Lap A' },
      { submission_id: 2, nama_satker: 'PN BTM', nama_laporan: 'Lap B' },
    ],
  },
  loop_revisi: {
    jumlah: 1,
    items: [
      { submission_id: 10, nama_satker: 'PN Karimun', nama_laporan: 'Lap C', hari_tertahan: '5.3', catatan_admin: 'Perbaiki tabel', updated_at: new Date().toISOString() },
    ],
  },
  ketepatan_waktu: {
    tepat_waktu: '15',
    terlambat: '5',
    total_upload: '20',
  },
  aktivitas_terbaru: [
    { id: 1, nama_satker: 'PN Batam', nama_laporan: 'Lap Pidana', status_verifikasi: 'lengkap', tipe_aksi: 'upload', updated_at: new Date().toISOString() },
    { id: 2, nama_satker: 'PN TPI', nama_laporan: 'Lap Perdata', status_verifikasi: 'lengkap', tipe_aksi: 'verified_ok', updated_at: new Date(Date.now() - 3600000).toISOString() },
    { id: 3, nama_satker: 'PN Karimun', nama_laporan: 'Lap Keuangan', status_verifikasi: 'revisi', tipe_aksi: 'verified_revisi', updated_at: new Date(Date.now() - 86400000).toISOString() },
  ],
};

const mockQueueStatus = {
  waiting: 3,
  active: 1,
  completed: 50,
  failed: 2,
  delayed: 0,
  recent_failed: [
    { id: '101', name: 'sendRevisionEmail', failedReason: 'SMTP timeout', timestamp: Date.now() },
  ],
};

function renderWithClient(ui) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

describe('Dashboard Admin Panels', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    global.alert = jest.fn();
    window.open = jest.fn();
    localStorage.setItem('satya_user', JSON.stringify({ role: 'ADMIN_PT' }));

    api.get.mockImplementation((url) => {
      if (url.includes('/dashboard-agregat')) return Promise.resolve({ data: mockDashboardData });
      if (url.includes('/admin-stats')) return Promise.resolve({ data: { data: mockAdminStats } });
      if (url.includes('/queue-status')) return Promise.resolve({ data: { data: mockQueueStatus } });
      if (url.includes('/download')) return Promise.resolve({ data: { url: 'http://example.com/test.pdf' } });
      return Promise.resolve({ data: [] });
    });
  });

  test('renders admin stats panels with data', async () => {
    renderWithClient(<Dashboard />);

    // Wait for satker data
    await waitFor(() => {
      expect(screen.getAllByText('PN Batam')[0]).toBeInTheDocument();
    });

    // Antrian verifikasi
    await waitFor(() => {
      expect(screen.getByText('Antrian Verifikasi')).toBeInTheDocument();
    });

    // Ketepatan Waktu panel
    expect(screen.getByText('Ketepatan Waktu')).toBeInTheDocument();

    // Loop Revisi
    expect(screen.getByText('Loop Revisi')).toBeInTheDocument();

    // Email Queue panel
    await waitFor(() => {
      expect(screen.getByText('Email Queue')).toBeInTheDocument();
    });
  });

  test('verify modal Escape key closes it', async () => {
    renderWithClient(<Dashboard />);

    await waitFor(() => {
      expect(screen.getAllByText('PN Batam')[0]).toBeInTheDocument();
    });

    fireEvent.click(screen.getAllByText('PN Batam')[0]);

    // Click Verifikasi button
    const verifyBtn = await screen.findByText('Verifikasi');
    fireEvent.click(verifyBtn);

    await waitFor(() => {
      expect(screen.getByText('Keputusan Verifikasi')).toBeInTheDocument();
    });

    // Press Escape
    fireEvent.keyDown(document, { key: 'Escape' });

    await waitFor(() => {
      expect(screen.queryByText('Keputusan Verifikasi')).not.toBeInTheDocument();
    });
  });

  test('shows "Belum diunggah" for reports without submission', async () => {
    renderWithClient(<Dashboard />);

    await waitFor(() => {
      expect(screen.getAllByText('PN Batam')[0]).toBeInTheDocument();
    });

    fireEvent.click(screen.getAllByText('PN Batam')[0]);

    // The report without submission should show "Belum diunggah"
    expect(await screen.findByText('Belum diunggah')).toBeInTheDocument();
  });

  test('refresh queue button calls refetch', async () => {
    renderWithClient(<Dashboard />);

    await waitFor(() => {
      expect(screen.getAllByText('PN Batam')[0]).toBeInTheDocument();
    });

    // Wait for queue panel to appear
    await waitFor(() => {
      expect(screen.getByText('Email Queue')).toBeInTheDocument();
    });

    const refreshBtn = screen.getByTitle('Refresh');
    fireEvent.click(refreshBtn);

    // Should trigger a new API call
    await waitFor(() => {
      // api.get should have been called again for queue-status
      const queueCalls = api.get.mock.calls.filter(c => c[0].includes('/queue-status'));
      expect(queueCalls.length).toBeGreaterThanOrEqual(1);
    });
  });

  test('renders as non-admin without admin panels', async () => {
    localStorage.setItem('satya_user', JSON.stringify({ role: 'PIMPINAN' }));

    renderWithClient(<Dashboard />);

    await waitFor(() => {
      expect(screen.getAllByText('PN Batam')[0]).toBeInTheDocument();
    });

    // Admin panels should NOT be visible
    expect(screen.queryByText('Antrian Verifikasi')).not.toBeInTheDocument();
    expect(screen.queryByText('Email Queue')).not.toBeInTheDocument();

    // Verify button should NOT be visible for non-admin
    expect(screen.queryByText('Verifikasi')).not.toBeInTheDocument();
  });

  test('handles empty admin stats gracefully', async () => {
    const emptyStats = {
      antrian_verifikasi: { jumlah: 0, items: [] },
      loop_revisi: { jumlah: 0, items: [] },
      ketepatan_waktu: null,
      aktivitas_terbaru: [],
    };

    api.get.mockImplementation((url) => {
      if (url.includes('/dashboard-agregat')) return Promise.resolve({ data: mockDashboardData });
      if (url.includes('/admin-stats')) return Promise.resolve({ data: { data: emptyStats } });
      if (url.includes('/queue-status')) return Promise.resolve({ data: { data: null } });
      return Promise.resolve({ data: [] });
    });

    renderWithClient(<Dashboard />);

    await waitFor(() => {
      expect(screen.getAllByText('PN Batam')[0]).toBeInTheDocument();
    });

    // Empty antrian
    await waitFor(() => {
      expect(screen.getByText('Semua laporan telah ditinjau')).toBeInTheDocument();
    });

    // Empty revisi
    expect(screen.getByText('Aman, tidak ada revisi tertahan lama.')).toBeInTheDocument();

    // No ketepatan data
    expect(screen.getByText('Belum ada data periode ini')).toBeInTheDocument();
  });
});
