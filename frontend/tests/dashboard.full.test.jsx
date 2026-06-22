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

const mockDashboardData = {
  data: [
    {
      nama_satker: 'Satker Test A',
      statistik: {
        total_wajib: 1,
        total_upload: 1,
        persentase_kepatuhan: '100'
      },
      detail_laporan: [
        {
          report_type_id: 1,
          nama_laporan: 'Laporan 1',
          status_ketepatan_waktu: 'Tepat Waktu',
          status_verifikasi: 'revisi',
          submission_id: 'sub-1'
        }
      ]
    }
  ]
};

function renderWithClient(ui) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

describe('Dashboard component coverage', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    global.alert = jest.fn();
    window.open = jest.fn();
    localStorage.setItem('satya_user', JSON.stringify({ role: 'ADMIN_PT' }));
    
    api.get.mockImplementation((url) => {
      if (url.includes('/dashboard-agregat')) return Promise.resolve(mockDashboardData);
      if (url.includes('/download')) return Promise.resolve({ data: { url: 'http://example.com/test.pdf' } });
      return Promise.resolve({ data: [] });
    });
  });

  test('render and handle download', async () => {
    renderWithClient(<Dashboard />);
    await waitFor(() => {
      expect(screen.getAllByText('Satker Test A')[0]).toBeInTheDocument();
    });

    fireEvent.click(screen.getAllByText('Satker Test A')[0]);

    // click satker block (not strictly necessary for visibility since table is rendered, but good for interactions)
    // there are two buttons: download and Verifikasi, let's query by class/content
    // Since download icon is there, let's find Verifikasi button and its previous sibling
    const verifyBtn = await screen.findByText('Verifikasi');
    fireEvent.click(verifyBtn.previousSibling); // click download button

    await waitFor(() => {
      expect(window.open).toHaveBeenCalledWith('http://example.com/test.pdf', '_blank');
    });

    // Simulate download error
    api.get.mockRejectedValueOnce(new Error('Gagal download'));
    fireEvent.click(verifyBtn.previousSibling);
    await waitFor(() => {
      expect(screen.getByText('Gagal mengunduh file Excel.')).toBeInTheDocument();
    });

    // Simulate missing URL wrapper
    api.get.mockResolvedValueOnce({ });
    fireEvent.click(verifyBtn.previousSibling);
    await waitFor(() => {
      expect(screen.getByText('Tautan unduh Excel tidak tersedia.')).toBeInTheDocument();
    });
  });

  test('verify modal form validation and submit', async () => {
    renderWithClient(<Dashboard />);
    await waitFor(() => {
      expect(screen.getAllByText('Satker Test A')[0]).toBeInTheDocument();
    });

    fireEvent.click(screen.getAllByText('Satker Test A')[0]);

    const verifyBtn = await screen.findByText('Verifikasi');
    fireEvent.click(verifyBtn);

    await waitFor(() => {
      expect(screen.getByText('Keputusan Verifikasi')).toBeInTheDocument();
    });

    const submitBtn = screen.getByText('Simpan Verifikasi');

    // Case 1: Empty status
    fireEvent.click(submitBtn);
    await waitFor(() => {
      expect(screen.getByText('Pilih status verifikasi.')).toBeInTheDocument();
    });

    // Case 2: Status revisi but empty catatan
    const select = screen.getAllByRole('combobox').find(el => el.querySelector('option[value="lengkap"]'));
    fireEvent.change(select, { target: { value: 'revisi' } });
    fireEvent.click(submitBtn);
    expect(screen.getByText('Catatan revisi minimal 5 karakter.')).toBeInTheDocument();

    // Case 3: Failed patch
    const textArea = screen.getByPlaceholderText(/Jelaskan secara detail bagian mana yang perlu diperbaiki oleh satker/i);
    fireEvent.change(textArea, { target: { value: 'harap perbaiki' } });
    api.patch.mockRejectedValueOnce(new Error('Network error'));
    fireEvent.click(submitBtn);
    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });

    // Case 4: Success patch
    api.patch.mockResolvedValueOnce({ data: { success: true } });
    fireEvent.click(submitBtn);
    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith(expect.stringContaining('/reports/sub-1/verify'), {
        status_verifikasi: 'revisi',
        catatan_admin: 'harap perbaiki',
        nilai_angka: null
      });
      expect(screen.getByText('Verifikasi tersimpan.')).toBeInTheDocument();
    });

    // Case 5: Open verify modal again and click Batal button
    fireEvent.click(verifyBtn);
    await waitFor(() => {
      expect(screen.getByText('Keputusan Verifikasi')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Batal'));
    await waitFor(() => {
      expect(screen.queryByText('Keputusan Verifikasi')).not.toBeInTheDocument();
    });

    // Test search filter
    const searchInput = screen.getByPlaceholderText('Cari Satuan Kerja...');
    fireEvent.change(searchInput, { target: { value: 'Other Satker' } });
    await waitFor(() => {
      expect(screen.getByText('Tidak ditemukan satker yang cocok dengan pencarian.')).toBeInTheDocument();
    });
    fireEvent.change(searchInput, { target: { value: '' } });

    // Try changing bulan / tahun filters
    const bulanSelects = screen.getAllByRole('combobox');
    fireEvent.change(bulanSelects[0], { target: { value: '2' } });
    fireEvent.change(bulanSelects[1], { target: { value: '2027' } });
  });
});
