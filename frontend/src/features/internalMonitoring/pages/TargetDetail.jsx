import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { internalMonitoringApi } from '../api/internalMonitoringApi';
import StatusBadge from '../components/StatusBadge';
import EvidenceEditor from '../components/EvidenceEditor';
import FollowUpPanel from '../components/FollowUpPanel';

const TargetDetail = () => {
  const { id } = useParams();
  const [target, setTarget] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchTarget = async () => {
    try {
      setLoading(true);
      const res = await internalMonitoringApi.getTarget(id);
      setTarget(res.data?.data);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Gagal memuat detail target.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTarget();
  }, [id]);

  const handleWorkflowAction = async (actionFn, ...args) => {
    try {
      setLoading(true);
      await actionFn(id, ...args);
      await fetchTarget(); // Refresh data after success
    } catch (err) {
      alert('Gagal melakukan aksi: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  if (loading && !target) return <div className="p-4 text-center">Memuat target...</div>;
  if (error) return <div className="p-4 text-red-600">{error}</div>;
  if (!target) return <div className="p-4">Target tidak ditemukan.</div>;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header Panel */}
      <div className="bg-slate-900 shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6 flex justify-between items-start">
          <div>
            <h3 className="text-lg leading-6 font-medium text-white">
              {target.monitoring_item_title || target.item_code}
            </h3>
            <p className="mt-1 max-w-2xl text-sm text-slate-400">
              {target.package_name} - Periode {target.period_name} ({target.period_year})
            </p>
          </div>
          <StatusBadge status={target.workflow_status} className="text-sm px-3 py-1" />
        </div>
        <div className="border-t border-slate-700/50 px-4 py-5 sm:px-6">
          <dl className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2">
            <div className="sm:col-span-1">
              <dt className="text-sm font-medium text-slate-400">Unit / Posisi</dt>
              <dd className="mt-1 text-sm text-white">{target.unit_name || target.position_name || '-'}</dd>
            </div>
            <div className="sm:col-span-1">
              <dt className="text-sm font-medium text-slate-400">Jatuh Tempo</dt>
              <dd className="mt-1 text-sm text-white">{target.due_date ? new Date(target.due_date).toLocaleDateString('id-ID') : '-'}</dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Action Bar */}
      <div className="bg-slate-900 shadow sm:rounded-lg p-4 flex justify-end space-x-3">
        {['NOT_STARTED', 'IN_PROGRESS', 'REVISION'].includes(target.workflow_status) && (
          <>
            <button onClick={() => handleWorkflowAction(internalMonitoringApi.saveDraft)} className="px-4 py-2 border rounded text-slate-300 hover:bg-slate-800">
              Simpan Draft
            </button>
            <button onClick={() => handleWorkflowAction(internalMonitoringApi.submitTarget)} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 shadow-lg shadow-blue-900/20">
              Submit Target
            </button>
          </>
        )}
        {target.workflow_status === 'AWAITING_APPROVAL' && (
          <button onClick={() => handleWorkflowAction(internalMonitoringApi.approveTarget)} className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-500 shadow-lg shadow-amber-900/20">
            Approve
          </button>
        )}
        {target.workflow_status === 'AWAITING_VERIFICATION' && (
          <>
            <button onClick={() => {
              const note = prompt('Catatan revisi:');
              if(note) handleWorkflowAction(internalMonitoringApi.requestRevision, note);
            }} className="px-4 py-2 border-red-500/50 text-red-400 rounded-lg hover:bg-red-500/10 border">
              Minta Revisi
            </button>
            <button onClick={() => {
              const note = prompt('Catatan verifikasi (opsional):');
              handleWorkflowAction(internalMonitoringApi.verifyTarget, note || '');
            }} className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 shadow-lg shadow-emerald-900/20">
              Verifikasi
            </button>
          </>
        )}
      </div>

      {/* Evidence Editor */}
      <EvidenceEditor
        targetId={target.id}
        requirements={target.requirements || []}
        evidences={target.evidences || []}
        onEvidenceChanged={fetchTarget}
        itemTitle={target.monitoring_item_title}
      />

      {/* Follow-up Panel */}
      <FollowUpPanel 
        targetId={target.id}
        followUps={target.follow_ups || []}
        onFollowUpChanged={fetchTarget}
      />
    </div>
  );
};

export default TargetDetail;
