/**
 * tests/upload.test.jsx
 *
 * Integration test for SatkerPortal file upload, including progress handling.
 * - Mocks the main api wrapper to control GET (report list) and POST (upload).
 * - Simulates file selection and asserts that the simulated progress triggers state updates.
 *
 * Run with: npm test -- tests/upload.test.jsx
 */

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import SatkerPortal from '../src/pages/SatkerPortal';

// Mock the API wrapper
jest.mock('../src/lib/axios', () => ({
  get: jest.fn(),
  post: jest.fn(),
  delete: jest.fn(),
}));

import api from '../src/lib/axios';

const mockReports = {
  data: [
    {
      report_type_id: 1,
      nama_laporan: 'Laporan Test Upload Progress',
      submission_id: null,
      is_wajib: true,
      status_ketepatan_waktu: null,
    },
  ],
};

function renderWithClient(ui) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

describe('SatkerPortal Upload and Progress handling', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    global.alert = jest.fn();

    // Mock initial GET my-progress
    api.get.mockImplementation((url) => {
      if (url.includes('/reports/my-progress')) {
        return Promise.resolve({ data: mockReports.data });
      }
      return Promise.resolve({ data: [] });
    });
  });

  test('simulates file upload with progress handling', async () => {
    // 1. Render the component
    renderWithClient(<SatkerPortal />);

    // 2. Wait for the report to be displayed
    await waitFor(() => {
      expect(screen.getByText('Laporan Test Upload Progress')).toBeInTheDocument();
    });

    // 3. Click the upload button to open the modal
    const uploadBtn = screen.getByRole('button', { name: /Unggah/i });
    fireEvent.click(uploadBtn);

    // 4. Modal should appear
    await waitFor(() => {
      expect(screen.getByText('Dokumen PDF')).toBeInTheDocument();
    });

    // 5. Select a mock PDF file
    const fileInputs = document.querySelectorAll('input[type="file"]');
    const mockPdf = new File(['dummy content'], 'report.pdf', { type: 'application/pdf' });
    const mockExcel = new File(['dummy excel content'], 'data.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    
    // Using fireEvent.change to simulate file selection
    fireEvent.change(fileInputs[0], { target: { files: [mockPdf] } });
    fireEvent.change(fileInputs[1], { target: { files: [mockExcel] } });

    // File name should appear
    await waitFor(() => {
      expect(screen.getByText('report.pdf')).toBeInTheDocument();
      expect(screen.getByText('data.xlsx')).toBeInTheDocument();
    });

    // 6. Mock the POST API to simulate progress, then resolve
    api.post.mockImplementation((url, formData, config) => {
      // Simulate an progress event being called mid-flight
      if (config && config.onUploadProgress) {
        config.onUploadProgress({ loaded: 50, total: 100 });
      }
      return Promise.resolve({ data: { success: true } });
    });

    // 7. Click the submit button inside the modal
    const submitBtn = screen.getByRole('button', { name: /Unggah Dokumen/i });
    fireEvent.click(submitBtn);

    // 8. Assertions
    await waitFor(() => {
      expect(api.post).toHaveBeenCalledTimes(1);
    });

    // We can also check if a success toast appears because we resolved the promise
    await waitFor(() => {
      expect(screen.getByText(/Unggah berhasil/i)).toBeInTheDocument();
    });
    
    // Check that api post was called with proper URL and FormData
    const [url, formData] = api.post.mock.calls[0];
    expect(url).toContain('/reports/upload');
    expect(formData).toBeInstanceOf(FormData);
    expect(formData.get('dokumen_monev')).toBe(mockPdf);
    expect(formData.get('dokumen_excel')).toBe(mockExcel);
    expect(formData.get('report_type_id')).toBe('1');
  });
});
