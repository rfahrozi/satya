import React, { useState } from 'react';
import { internalMonitoringApi } from '../api/internalMonitoringApi';
import StatusBadge from './StatusBadge';

const EvidenceEditor = ({ targetId, requirements, evidences, onEvidenceChanged, readOnly = false, itemTitle = '' }) => {
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
    <div className="bg-slate-900 border border-slate-700/50 shadow-xl rounded-2xl mb-6 overflow-hidden">
      <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
        <h3 className="text-lg leading-6 font-medium text-white">Evidence (Bukti Dukung)</h3>
      </div>
      
      {error && <div className="px-4 py-2 bg-red-500/10 text-red-400 border border-red-500/30 rounded-lg text-sm">{error}</div>}

      <div className="border-t border-slate-700/50">
        <dl>
          {requirements.map((req, idx) => {
            const currentEvidence = evidences?.find(e => e.requirement_id === req.id && e.evidence_status !== 'SUPERSEDED');
            
            return (
              <div key={req.id} className={`${idx % 2 === 0 ? 'bg-slate-800' : 'bg-slate-900'} px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6`}>
                <dt className="text-sm font-medium text-slate-400">
                  <div className="font-bold text-slate-200 mb-1">{req.label}</div>
                  {itemTitle && <div className="text-xs text-blue-300 bg-blue-500/10 p-2 rounded-lg border border-blue-500/20 italic">" {itemTitle} "</div>}
                  {req.is_required && <div className="mt-1 text-xs text-red-400 font-semibold">* Wajib Diunggah</div>}
                </dt>
                <dd className="mt-1 text-sm text-white sm:mt-0 sm:col-span-2">
                  <div className="flex flex-col space-y-3">
                    {/* Display existing evidence */}
                    {currentEvidence ? (
                      <div className="flex items-center space-x-4">
                        <StatusBadge status={currentEvidence.evidence_status} />
                        {currentEvidence.evidence_type === 'FILE' ? (
                          <button onClick={() => handleDownload(currentEvidence.id)} className="text-blue-400 hover:underline">
                            Lihat File (v{currentEvidence.version_no})
                          </button>
                        ) : currentEvidence.evidence_type === 'LINK' ? (
                          <a href={currentEvidence.value_text} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline flex items-center gap-1">
                            <span>🔗 Buka Link GDrive (v{currentEvidence.version_no})</span>
                          </a>
                        ) : (
                          <span className="text-slate-300 italic">"{currentEvidence.value_text}"</span>
                        )}
                      </div>
                    ) : (
                      <span className="text-slate-500">Belum ada bukti yang disubmit.</span>
                    )}

                    {/* Editor based on requirement type — HANYA jika bukan readOnly */}
                    {!readOnly && (
                      <div className="mt-2 bg-slate-800/50 p-3 rounded-lg border border-slate-700/50">
                        {req.evidence_type === 'FILE' ? (
                          <div className="space-y-4">
                            <div>
                              <label className="block text-xs font-medium text-slate-300 mb-1">Unggah Dokumen (PDF/Excel):</label>
                              <div className="flex items-center">
                                <input
                                  type="file"
                                  onChange={(e) => handleFileUpload(req.id, e)}
                                  disabled={uploading === req.id}
                                  className="block w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-500/10 file:text-blue-400 hover:file:bg-blue-500/20"
                                />
                                {uploading === req.id && <span className="text-xs text-blue-500 ml-2 whitespace-nowrap">Mengupload...</span>}
                              </div>
                            </div>

                            <div className="relative">
                              <div className="absolute inset-0 flex items-center" aria-hidden="true">
                                <div className="w-full border-t border-slate-700/50"></div>
                              </div>
                              <div className="relative flex justify-center">
                                <span className="px-2 bg-slate-800 text-xs text-slate-400 italic">ATAU</span>
                              </div>
                            </div>

                            <div>
                              <div className="flex justify-between items-center mb-1">
                                <label className="block text-xs font-medium text-slate-300">Gunakan Tautan Google Drive (Jika ukuran file terlalu besar):</label>
                                {idx > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      // Cari nilai input link dari requirement sebelumnya
                                      const prevInput = document.getElementById(`link-req-${requirements[idx-1].id}`);
                                      const currInput = document.getElementById(`link-req-${req.id}`);
                                      if(prevInput && prevInput.value && currInput) {
                                        currInput.value = prevInput.value;
                                      }
                                    }}
                                    className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-1"
                                  >
                                    📋 Salin Tautan Sebelumnya
                                  </button>
                                )}
                              </div>
                              <div className="flex space-x-2">
                                <input
                                  type="url"
                                  id={`link-req-${req.id}`}
                                  className="w-full p-2 border border-slate-600 rounded-lg bg-slate-800 text-sm text-slate-200 outline-none focus:border-blue-500"
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
                                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-slate-300 bg-gray-200 hover:bg-gray-300"
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
                              className="w-full p-2 border border-slate-600 rounded-lg bg-slate-800 text-sm text-slate-200 outline-none focus:border-blue-500"
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
