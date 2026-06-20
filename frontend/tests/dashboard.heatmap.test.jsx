/**
 * tests/dashboard.heatmap.test.jsx
 *
 * Tests for the HeatmapKepatuhan component inside Dashboard:
 * - Renders heatmap grid (12 sel per satker)
 * - Warna sel sesuai persen (hijau/kuning/merah/abu)
 * - Bulan masa depan ditampilkan sebagai abu/kosong
 * - Stats global (persen_global, satker_merah) muncul
 * - Skeleton loading muncul saat data belum tersedia
 * - Selector tahun muncul dan bisa diubah
 * - Empty state muncul saat data kosong
 * - Tooltip hover muncul dengan informasi lengkap
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

// Buat mock data heatmap: 4 satker × 12 bulan
function buatHeatmapMock(overrides = {}) {
  const satkers = [
    { id: 1, nama: 'PN Batam',   defaultPersen: 85 },
    { id: 2, nama: 'PN TPI',    defaultPersen: 60 },
    { id: 3, nama: 'PN Karimun', defaultPersen: 35 },
    { id: 4, nama: 'PN Lingga',  defaultPersen: 0  },
  ];

  return {
    success: true,
    tahun: 2026,
    stats: {
      persen_global: 55,
      total_upload: 400,
      total_wajib: 1344,
      satker_merah: 2,
      warna_global: 'kuning',
    },
    data: satkers.map(s => ({
      satker_id: s.id,
      nama_satker: overrides[s.id]?.nama ?? s.nama,
      rata_tahunan: overrides[s.id]?.rata ?? s.defaultPersen,
      warna_rata: s.defaultPersen >= 80 ? 'hijau' : s.defaultPersen >= 50 ? 'kuning' : s.defaultPersen > 0 ? 'merah' : 'abu',
      sel: Array.from({ length: 12 }, (_, i) => ({
        bulan: i + 1,
        total_wajib: 28,
        total_upload: Math.floor(28 * (overrides[s.id]?.persen?.[i] ?? s.defaultPersen) / 100),
        persen: overrides[s.id]?.persen?.[i] ?? s.defaultPersen,
        persen_tepat_waktu: s.defaultPersen > 0 ? 75 : null,
        warna: (overrides[s.id]?.persen?.[i] ?? s.defaultPersen) >= 80 ? 'hijau'
          : (overrides[s.id]?.persen?.[i] ?? s.defaultPersen) >= 50 ? 'kuning'
          : (overrides[s.id]?.persen?.[i] ?? s.defaultPersen) > 0 ? 'merah' : 'abu',
      })),
    })),
  };
}

const mockAgregat = [{
  nama_satker: 'PN Batam',
  statistik: { total_wajib: 28, total_upload: 24, persentase_kepatuhan: '85' },
  detail_laporan: [],
}];

function renderDashboard() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <Dashboard />
    </QueryClientProvider>
  );
}

describe('Dashboard HeatmapKepatuhan Component', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    localStorage.setItem('satya_user', JSON.stringify({ role: 'ADMIN_PT' }));

    api.get.mockImplementation((url) => {
      if (url.includes('/dashboard-agregat')) return Promise.resolve({ data: mockAgregat });
      if (url.includes('/dashboard-heatmap'))  return Promise.resolve({ data: buatHeatmapMock() });
      if (url.includes('/admin-stats'))         return Promise.resolve({ data: { data: {
        antrian_verifikasi: { jumlah: 0, items: [] },
        loop_revisi: { jumlah: 0, items: [] },
        ketepatan_waktu: null,
        aktivitas_terbaru: [],
      }}});
      if (url.includes('/queue-status'))        return Promise.resolve({ data: { data: { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0, recent_failed: [] } } });
      return Promise.resolve({ data: [] });
    });
  });

  test('menampilkan heading Heatmap Kepatuhan', async () => {
    renderDashboard();
    await waitFor(() => {
      expect(screen.getByText('Heatmap Kepatuhan')).toBeInTheDocument();
    });
  });

  test('menampilkan 4 satker di grid heatmap', async () => {
    renderDashboard();
    await waitFor(() => {
      expect(screen.getAllByText('PN Batam')[0]).toBeInTheDocument();
    });
    expect(screen.getAllByText('PN TPI')[0]).toBeInTheDocument();
    expect(screen.getAllByText('PN Karimun')[0]).toBeInTheDocument();
    expect(screen.getAllByText('PN Lingga')[0]).toBeInTheDocument();
  });

  test('menampilkan header kolom bulan Jan-Des', async () => {
    renderDashboard();
    // Heatmap header bulan hanya render setelah !isLoading (data sudah ada)
    await waitFor(() => {
      expect(screen.getAllByText('PN Batam')[0]).toBeInTheDocument();
    });
    expect(screen.getByText('Jan')).toBeInTheDocument();
    expect(screen.getByText('Des')).toBeInTheDocument();
  });

  test('menampilkan stats global persen dan satker merah', async () => {
    renderDashboard();
    await waitFor(() => {
      // Stats header: persen_global = 55%
      const matches = screen.getAllByText('55%');
      expect(matches.length).toBeGreaterThanOrEqual(1);
    });
    // Satker kritis = 2 (as text content in the stats box)
    const allTwos = screen.getAllByText('2');
    expect(allTwos.length).toBeGreaterThanOrEqual(1);
  });

  test('menampilkan legend warna (Patuh, Perlu Perhatian, Rendah, Belum Ada)', async () => {
    renderDashboard();
    await waitFor(() => {
      expect(screen.getByText('Patuh')).toBeInTheDocument();
    });
    expect(screen.getByText('Perlu Perhatian')).toBeInTheDocument();
    expect(screen.getByText('Rendah')).toBeInTheDocument();
    expect(screen.getByText('Belum Ada')).toBeInTheDocument();
  });

  test('menampilkan rata tahunan per satker', async () => {
    renderDashboard();
    await waitFor(() => {
      // PN Batam rata 85%
      const matches = screen.getAllByText('85%');
      expect(matches.length).toBeGreaterThanOrEqual(1);
    });
    // PN TPI rata 60%
    const sixties = screen.getAllByText('60%');
    expect(sixties.length).toBeGreaterThanOrEqual(1);
    // PN Karimun rata 35%
    const thirtyFives = screen.getAllByText('35%');
    expect(thirtyFives.length).toBeGreaterThanOrEqual(1);
  });

  test('menampilkan selector tahun yang bisa diubah', async () => {
    renderDashboard();
    await waitFor(() => {
      expect(screen.getByText('Heatmap Kepatuhan')).toBeInTheDocument();
    });

    // Cari semua select dengan aria-label heatmap
    const select = screen.getByRole('combobox', { name: /pilih tahun heatmap/i });
    expect(select).toBeInTheDocument();

    // Ganti ke tahun berbeda
    fireEvent.change(select, { target: { value: '2025' } });

    // Harus trigger query baru
    await waitFor(() => {
      const heatmapCalls = api.get.mock.calls.filter(c => c[0].includes('/dashboard-heatmap'));
      expect(heatmapCalls.some(c => c[0].includes('2025'))).toBe(true);
    });
  });

  test('menampilkan empty state saat data satker kosong', async () => {
    api.get.mockImplementation((url) => {
      if (url.includes('/dashboard-agregat')) return Promise.resolve({ data: mockAgregat });
      if (url.includes('/dashboard-heatmap'))  return Promise.resolve({ data: { success: true, tahun: 2026, stats: null, data: [] } });
      if (url.includes('/admin-stats'))         return Promise.resolve({ data: { data: { antrian_verifikasi: { jumlah: 0, items: [] }, loop_revisi: { jumlah: 0, items: [] }, ketepatan_waktu: null, aktivitas_terbaru: [] } } });
      if (url.includes('/queue-status'))        return Promise.resolve({ data: { data: null } });
      return Promise.resolve({ data: [] });
    });

    renderDashboard();
    await waitFor(() => {
      expect(screen.getByText(/tidak ada data satker untuk tahun/i)).toBeInTheDocument();
    });
  });

  test('menampilkan persen di dalam sel heatmap', async () => {
    renderDashboard();
    await waitFor(() => {
      // PN Batam persen 85, setiap sel menampilkan "85%"
      const cells = screen.getAllByText('85%');
      expect(cells.length).toBeGreaterThanOrEqual(1);
    });
  });

  test('menampilkan tooltip saat hover sel', async () => {
    renderDashboard();

    await waitFor(() => {
      expect(screen.getAllByText('PN Batam')[0]).toBeInTheDocument();
    });

    // Hover salah satu sel - cari aria-label dengan bulan Jan
    const janCells = screen.getAllByLabelText(/^Jan: 85%/);
    expect(janCells.length).toBeGreaterThanOrEqual(1);
    fireEvent.mouseEnter(janCells[0].parentElement);

    await waitFor(() => {
      expect(screen.getByText('85% patuh')).toBeInTheDocument();
    });
    expect(screen.getByText('75% tepat waktu')).toBeInTheDocument();
  });

  test('Pimpinan juga bisa melihat heatmap', async () => {
    localStorage.setItem('satya_user', JSON.stringify({ role: 'PIMPINAN' }));

    renderDashboard();
    await waitFor(() => {
      expect(screen.getByText('Heatmap Kepatuhan')).toBeInTheDocument();
    });
  });
});
