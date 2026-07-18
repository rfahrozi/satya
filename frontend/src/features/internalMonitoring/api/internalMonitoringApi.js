import axios from '../../../lib/axios';

const BASE_URL = '/api/v1/internal-monitoring';

export const internalMonitoringApi = {
  // ── Periods & Master Items ───────────────────────────────────────────────────
  listPeriods: (params = {}) => axios.get(`${BASE_URL}/periods`, { params }),
  createPeriod: (payload)   => axios.post(`${BASE_URL}/periods`, payload),
  openPeriod: (id)          => axios.post(`${BASE_URL}/periods/${id}/open`),
  listMasterItems: ()       => axios.get(`${BASE_URL}/master-items`),

  // ── Dashboards ─────────────────────────────────────────────────────────────
  // periodId opsional — jika null/undefined, backend menggunakan periode aktif
  getMyDashboard:         (periodId) => axios.get(`${BASE_URL}/dashboard/my`,          { params: { period_id: periodId } }),
  getOperationalDashboard:(periodId) => axios.get(`${BASE_URL}/dashboard/operational`, { params: { period_id: periodId } }),
  getExecutiveDashboard:  (periodId) => axios.get(`${BASE_URL}/dashboard/executive`,   { params: { period_id: periodId } }),

  // ── Queues ─────────────────────────────────────────────────────────────────
  listReviewQueue:   (periodId) => axios.get(`${BASE_URL}/review-queue`,    { params: { period_id: periodId } }),
  listFollowUpQueue: (periodId) => axios.get(`${BASE_URL}/follow-up-queue`, { params: { period_id: periodId } }),

  // ── Targets ────────────────────────────────────────────────────────────────
  listTargets: (params) => axios.get(`${BASE_URL}/targets`,     { params }),
  getTarget:   (id)     => axios.get(`${BASE_URL}/targets/${id}`),

  // ── Evidence ───────────────────────────────────────────────────────────────
  addEvidenceText: (targetId, requirementId, text, evidenceType = 'TEXT') =>
    axios.post(`${BASE_URL}/targets/${targetId}/evidence`, {
      requirement_id: requirementId,
      evidence_type: evidenceType,
      value_text: text
    }),

  addEvidenceFile: (targetId, requirementId, file) => {
    const formData = new FormData();
    formData.append('file', file);
    return axios.post(
      `${BASE_URL}/targets/${targetId}/evidence/${requirementId}/file`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
  },

  getEvidenceDownloadUrl: (targetId, evidenceId) =>
    axios.get(`${BASE_URL}/targets/${targetId}/evidence/${evidenceId}/download`),

  // ── Workflow ───────────────────────────────────────────────────────────────
  saveDraft:       (targetId)        => axios.patch(`${BASE_URL}/targets/${targetId}/draft`),
  submitTarget:    (targetId)        => axios.post(`${BASE_URL}/targets/${targetId}/submit`),
  approveTarget:   (targetId)        => axios.post(`${BASE_URL}/targets/${targetId}/approve`),
  requestRevision: (targetId, notes) => axios.post(`${BASE_URL}/targets/${targetId}/request-revision`, { note: notes }),
  verifyTarget:    (targetId, notes) => axios.post(`${BASE_URL}/targets/${targetId}/verify`,           { note: notes }),

  // ── Follow-ups ─────────────────────────────────────────────────────────────
  createFollowUp:     (targetId, payload)              => axios.post(`${BASE_URL}/targets/${targetId}/follow-ups`, payload),
  listFollowUps:      (targetId)                       => axios.get(`${BASE_URL}/targets/${targetId}/follow-ups`),
  startFollowUp:      (followUpId)                     => axios.post(`${BASE_URL}/follow-ups/${followUpId}/start`),
  submitFollowUpResolution: (followUpId, resolution_note) =>
    axios.post(`${BASE_URL}/follow-ups/${followUpId}/submit-resolution`, { resolution_note }),
  closeFollowUp:      (followUpId)                     => axios.post(`${BASE_URL}/follow-ups/${followUpId}/close`),
  reopenFollowUp:     (followUpId)                     => axios.post(`${BASE_URL}/follow-ups/${followUpId}/reopen`),

  // Legacy — dipertahankan agar komponen lama tidak rusak
  updateFollowUpStatus: (targetId, followUpId, action, notes) =>
    axios.post(`${BASE_URL}/follow-ups/${followUpId}/${action}`, { resolution_note: notes }),

  // ── Risk Governance ────────────────────────────────────────────────────────
  getRiskHeatmap:        (params) => axios.get(`${BASE_URL}/dashboard/risk-heatmap`,    { params }),
  getRiskTrends:         (params) => axios.get(`${BASE_URL}/dashboard/risk-trends`,     { params }),
  getRepeatFindings:     ()       => axios.get(`${BASE_URL}/dashboard/repeat-findings`),
  getActionAging:        ()       => axios.get(`${BASE_URL}/dashboard/action-aging`),
  getRiskAcceptances:    ()       => axios.get(`${BASE_URL}/dashboard/risk-acceptances`),

  // Repeat Findings — deteksi, konfirmasi, tolak
  detectRepeatFindings:  ()       => axios.post(`${BASE_URL}/repeat-finding-candidates/detect`),
  confirmRepeatFinding:  (id)     => axios.post(`${BASE_URL}/repeat-finding-candidates/${id}/confirm`),
  rejectRepeatFinding:   (id, note) => axios.post(`${BASE_URL}/repeat-finding-candidates/${id}/reject`, { review_note: note }),

  // Risk Acceptances — cabut
  revokeRiskAcceptance:  (id)     => axios.post(`${BASE_URL}/risk-acceptances/${id}/revoke`),

  // ── Management Reviews ─────────────────────────────────────────────────────
  listManagementReviews:  ()         => axios.get(`${BASE_URL}/management-reviews`),
  createManagementReview: (payload)  => axios.post(`${BASE_URL}/management-reviews`, payload),
  buildReviewPack:        (id)       => axios.post(`${BASE_URL}/management-reviews/${id}/build-pack`),
  finalizeReview:         (id)       => axios.post(`${BASE_URL}/management-reviews/${id}/finalize`),
};
