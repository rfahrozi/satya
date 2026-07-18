import React, { useState } from 'react';
import { internalMonitoringApi } from '../api/internalMonitoringApi';
import StatusBadge from './StatusBadge';

const EvidenceEditor = ({ targetId, requirements, evidences, onEvidenceChanged, readOnly = false }) => {
  const [uploading, setUploading] = useState(null);
  const [error, setError] = useState(null);

  const handleFileUpload = async (reqId, e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setUploading(reqId);
      setError(null);
      await internalMonitoringApi.addEvidenceFile(targetId, reqId, file);
      if (onEvidenceChanged) onEvidenceChanged();
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal mengupload file.');
    } finally {
      setUploading(null);
    }
  };

  const handleTextSubmit = async (reqId, text, evidenceType = 'TEXT') => {
    try {
      setUploading(reqId);
      setError(null);
      // Kirim tipe evidence yang benar (bisa TEXT atau LINK) ke API
      await internalMonitoringApi.addEvidenceText(targetId, reqId, text, evidenceType);
      if (onEvidenceChanged) onEvidenceChanged();
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal menyimpan tautan/teks.');
    } finally {
      setUploading(null);
    }
  };

  const handleDownload = async (evidenceId) => {
    try {
      const res = await internalMonitoringApi.getEvidenceDownloadUrl(targetId, evidenceId);
      if (res.data?.data?.url) {
        window.open(res.data.data.url, '_blank');
      } else {
        alert('URL download tidak tersedia.');
      }
    } catch (err) {
      alert('Gagal mendapatkan URL download: ' + (err.response?.data?.message || err.message));
    }
  };

  return (
    <div className="bg-white shadow sm:rounded-lg mb-6">
      <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
        <h3 className="text-lg leading-6 font-medium text-gray-900">Evidence (Bukti Dukung)</h3>
      </div>
      
      {error && <div className="px-4 py-2 bg-red-100 text-red-700 text-sm">{error}</div>}

      <div className="border-t border-gray-200">
        <dl>
          {requirements.map((req, idx) => {
            const currentEvidence = evidences?.find(e => e.requirement_id === req.id && e.evidence_status !== 'SUPERSEDED');
            
            return (
              <div key={req.id} className={`${idx % 2 === 0 ? 'bg-gray-50' : 'bg-white'} px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6`}>
                <dt className="text-sm font-medium text-gray-500">
                  {req.label}
                  {req.is_required && <span className="text-red-500 ml-1">*</span>}
                </dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  <div className="flex flex-col space-y-3">
                    {/* Display existing evidence */}
                    {currentEvidence ? (
                      <div className="flex items-center space-x-4">
                        <StatusBadge status={currentEvidence.evidence_status} />
                        {currentEvidence.evidence_type === 'FILE' ? (
                          <button onClick={() => handleDownload(currentEvidence.id)} className="text-blue-600 hover:underline">
                            Lihat File (v{currentEvidence.version_no})
                          </button>
                        ) : currentEvidence.evidence_type === 'LINK' ? (
                          <a href={currentEvidence.value_text} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline flex items-center gap-1">
                            <span>🔗 Buka Link GDrive (v{currentEvidence.version_no})</span>
                          </a>
                        ) : (
                          <span className="text-gray-700 italic">"{currentEvidence.value_text}"</span>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-400">Belum ada bukti yang disubmit.</span>
                    )}

                    {/* Editor based on requirement type — HANYA jika bukan readOnly */}
                    {!readOnly && (
                      <div className="mt-2 bg-gray-50/50 p-3 rounded-lg border border-gray-100">
                        {req.evidence_type === 'FILE' ? (
                          <div className="space-y-4">
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">Unggah Dokumen (PDF/Excel):</label>
                              <div className="flex items-center">
                                <input
                                  type="file"
                                  onChange={(e) => handleFileUpload(req.id, e)}
                                  disabled={uploading === req.id}
                                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                />
                                {uploading === req.id && <span className="text-xs text-blue-500 ml-2 whitespace-nowrap">Mengupload...</span>}
                              </div>
                            </div>

                            <div className="relative">
                              <div className="absolute inset-0 flex items-center" aria-hidden="true">
                                <div className="w-full border-t border-gray-200"></div>
                              </div>
                              <div className="relative flex justify-center">
                                <span className="px-2 bg-gray-50 text-xs text-gray-500 italic">ATAU</span>
                              </div>
                            </div>

                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">Gunakan Tautan Google Drive (Jika ukuran file terlalu besar):</label>
                              <div className="flex space-x-2">
                                <input
                                  type="url"
                                  id={`link-req-${req.id}`}
                                  className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                                  placeholder="https://drive.google.com/..."
                                  disabled={uploading === req.id}
                                />
                                <button
                                  type="button"
                                  disabled={uploading === req.id}
                                  onClick={() => {
                                    const input = document.getElementById(`link-req-${req.id}`);
                                    if(input.value.trim() && input.value.includes('http')) {
                                      // Menyimpan sebagai LINK
                                      handleTextSubmit(req.id, input.value.trim(), 'LINK');
                                      input.value = '';
                                    } else {
                                      alert('Harap masukkan URL Link yang valid (berawalan http)');
                                    }
                                  }}
                                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-gray-700 bg-gray-200 hover:bg-gray-300"
                                >
                                  Kirim Link
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="flex space-x-2">
                            <input
                              type="text"
                              id={`text-req-${req.id}`}
                              className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                              placeholder="Ketik teks evidence..."
                              disabled={uploading === req.id}
                            />
                            <button
                              type="button"
                              disabled={uploading === req.id}
                              onClick={() => {
                                const input = document.getElementById(`text-req-${req.id}`);
                                if(input.value.trim()) handleTextSubmit(req.id, input.value.trim());
                              }}
                              className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                            >
                              Simpan
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </dd>
              </div>
            );
          })}
        </dl>
      </div>
    </div>
  );
};

export default EvidenceEditor;
