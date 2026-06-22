import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import SatkerPortal from '../src/pages/SatkerPortal';
import api from '../src/lib/axios';

jest.mock('../src/lib/axios', () => ({
  get: jest.fn(),
  post: jest.fn(),
  delete: jest.fn(),
}));

const mockReportsWithSubmission = {
  data: [
    {
      report_type_id: 1,
      nama_laporan: 'Laporan Test Download & Delete',
      submission_id: 'sub-1',
      is_wajib: true,
      status_ketepatan_waktu: 'Tepat Waktu',
      created_at: '2026-04-10T10:00:00.000Z'
    },
  ],
};

function renderWithClient(ui) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

describe('SatkerPortal extended actions', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    global.alert = jest.fn();
    window.open = jest.fn();
    
    api.get.mockImplementation((url) => {
      if (url.includes('/reports/my-progress')) {
        return Promise.resolve({ data: mockReportsWithSubmission.data });
      }
      if (url.includes('/download')) {
        return Promise.resolve({ data: { url: 'http://example.com/download.pdf' } });
      }
      return Promise.resolve({ data: [] });
    });
  });

  test('simulates download file', async () => {
    renderWithClient(<SatkerPortal />);
    await waitFor(() => {
      expect(screen.getByText('Laporan Test Download & Delete')).toBeInTheDocument();
    });

    const downloadBtn = screen.getByTitle('Unduh PDF');
    fireEvent.click(downloadBtn);

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith(expect.stringContaining('/reports/sub-1/download'));
      expect(window.open).toHaveBeenCalledWith('http://example.com/download.pdf', '_blank', 'noopener');
    });
  });

  test('simulates delete failure and success', async () => {
    renderWithClient(<SatkerPortal />);
    await waitFor(() => {
      expect(screen.getByText('Laporan Test Download & Delete')).toBeInTheDocument();
    });

    const deleteBtn = screen.getByTitle('Hapus');
    
    // Simulasikan penghapusan yang gagal
    api.delete.mockRejectedValueOnce(new Error('Gagal delete'));
    fireEvent.click(deleteBtn);
    
    // Tunggu dialog konfirmasi muncul dan klik 'Ya, Hapus Dokumen'
    const confirmDeleteBtn = await screen.findByRole('button', { name: 'Ya, Hapus Dokumen' });
    fireEvent.click(confirmDeleteBtn);

    await waitFor(() => {
      expect(api.delete).toHaveBeenCalledWith(expect.stringContaining('/reports/sub-1'));
      expect(screen.getAllByText('Gagal delete')[0]).toBeInTheDocument(); // expect error toast
    });

    // Simulasikan penghapusan sukses
    api.delete.mockResolvedValueOnce({ data: { success: true } });
    fireEvent.click(deleteBtn);
    
    const confirmDeleteBtn2 = await screen.findByRole('button', { name: 'Ya, Hapus Dokumen' });
    fireEvent.click(confirmDeleteBtn2);

    await waitFor(() => {
      expect(screen.getAllByText('Laporan dihapus.')[0]).toBeInTheDocument(); // expect success toast
    });
  });

  test('handles drag drop and validation', async () => {
    renderWithClient(<SatkerPortal />);
    await waitFor(() => {
      expect(screen.getByText('Laporan Test Download & Delete')).toBeInTheDocument();
    });

    // open modal
    const overrideBtn = screen.getByRole('button', { name: /Perbarui/i });
    fireEvent.click(overrideBtn);
    
    await waitFor(() => {
      expect(screen.getByText('Dokumen PDF')).toBeInTheDocument();
    });

    const dropZone = screen.getByText('Dokumen PDF').parentElement;

    // test drag and drop
    fireEvent.dragOver(dropZone);
    fireEvent.dragLeave(dropZone);

    const txtFile = new File(['dummy txt'], 'test.txt', { type: 'text/plain' });
    fireEvent.drop(dropZone, {
      dataTransfer: {
        files: [txtFile]
      }
    });

    await waitFor(() => {
      expect(screen.getAllByText('Format tidak didukung. Gunakan PDF atau XLSX.')[0]).toBeInTheDocument();
    });

    // Over size
    const largeFile = new File([new ArrayBuffer(11 * 1024 * 1024)], 'large.pdf', { type: 'application/pdf' });
    fireEvent.drop(dropZone, {
      dataTransfer: {
        files: [largeFile]
      }
    });

    await waitFor(() => {
      expect(screen.getAllByText('Ukuran file terlalu besar (maks 10MB).')[0]).toBeInTheDocument();
    });
    
    // Valid file drop
    const validFile = new File(['dummy pdf'], 'valid.pdf', { type: 'application/pdf' });
    fireEvent.drop(dropZone, {
      dataTransfer: {
        files: [validFile]
      }
    });

    await waitFor(() => {
      expect(screen.getByText('valid.pdf')).toBeInTheDocument();
    });
    
    // close modal
    fireEvent.click(screen.getByText('Batal'));
  });

  test('covers missing edge cases in user interactions', async () => {
    // missing: download failure (catch branch), submit without file, submit without reportType
    renderWithClient(<SatkerPortal />);
    await waitFor(() => {
      expect(screen.getByText('Laporan Test Download & Delete')).toBeInTheDocument();
    });

    // 1. setBulan and setTahun
    const selects = screen.getAllByRole('combobox');
    fireEvent.change(selects[0], { target: { value: '5' } });
    fireEvent.change(selects[1], { target: { value: '2025' } });

    // 2. submit without file
    // wait for query to finish after changing params
    await waitFor(() => {
      expect(screen.getByText('Laporan Test Download & Delete')).toBeInTheDocument();
    });

    const overrideBtn = screen.getByRole('button', { name: /Perbarui/i });
    fireEvent.click(overrideBtn);

    const submitBtn = screen.getByRole('button', { name: /Timpa & Simpan/i });
    const form = submitBtn.closest('form');
    fireEvent.submit(form);
    await waitFor(() => {
      expect(screen.getAllByText('Pilih file PDF dan Excel terlebih dahulu.')[0]).toBeInTheDocument();
    });

  });

  test('covers missing edge cases in download interactions', async () => {
    api.get.mockImplementation((url) => {
      if (url.includes('/reports/my-progress')) return Promise.resolve({ data: mockReportsWithSubmission.data });
      return Promise.reject(new Error('Test fetch URL error'));
    });
    
    renderWithClient(<SatkerPortal />);
    await waitFor(() => {
      expect(screen.getByText('Laporan Test Download & Delete')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTitle('Unduh PDF'));
    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith(expect.stringContaining('download?type=pdf'));
    });
  });
});
