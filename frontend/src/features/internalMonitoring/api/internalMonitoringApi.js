import axios from '../../../lib/axios';

const BASE_URL = '/internal-monitoring';

export const internalMonitoringApi = {
  // Dashboards
  getMyDashboard: (periodId) => axios.get(`${BASE_URL}/dashboard/my`, { params: { period_id: periodId } }),
  getOperationalDashboard: (periodId) => axios.get(`${BASE_URL}/dashboard/operational`, { params: { period_id: periodId } }),
  getExecutiveDashboard: (periodId) => axios.get(`${BASE_URL}/dashboard/executive`, { params: { period_id: periodId } }),
  
  // Queues
  listReviewQueue: (periodId) => axios.get(`${BASE_URL}/review-queue`, { params: { period_id: periodId } }),
  listFollowUpQueue: (periodId) => axios.get(`${BASE_URL}/follow-up-queue`, { params: { period_id: periodId } }),

  // Targets
  listTargets: (params) => axios.get(`${BASE_URL}/targets`, { params }),
  getTarget: (id) => axios.get(`${BASE_URL}/targets/${id}`),

  // Evidence
  addEvidenceText: (targetId, requirementId, text) => 
    axios.post(`${BASE_URL}/targets/${targetId}/evidence`, { requirement_id: requirementId, evidence_type: 'TEXT', value_text: text }),
  
  addEvidenceFile: (targetId, requirementId, file) => {
    const formData = new FormData();
    formData.append('file', file);
    return axios.post(`${BASE_URL}/targets/${targetId}/evidence/${requirementId}/file`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },

  getEvidenceDownloadUrl: (targetId, evidenceId) => 
    axios.get(`${BASE_URL}/targets/${targetId}/evidence/${evidenceId}/download`),

  // Workflow
  saveDraft: (targetId) => axios.patch(`${BASE_URL}/targets/${targetId}/draft`),
  submitTarget: (targetId) => axios.post(`${BASE_URL}/targets/${targetId}/submit`),
  approveTarget: (targetId) => axios.post(`${BASE_URL}/targets/${targetId}/approve`),
  requestRevision: (targetId, notes) => axios.post(`${BASE_URL}/targets/${targetId}/request-revision`, { notes }),
  verifyTarget: (targetId, notes) => axios.post(`${BASE_URL}/targets/${targetId}/verify`, { notes }),

  // Follow-ups
  createFollowUp: (targetId, payload) => axios.post(`${BASE_URL}/targets/${targetId}/follow-ups`, payload),
  listFollowUps: (targetId) => axios.get(`${BASE_URL}/targets/${targetId}/follow-ups`),
  updateFollowUpStatus: (targetId, followUpId, status, notes) => 
    axios.patch(`${BASE_URL}/targets/${targetId}/follow-ups/${followUpId}/status`, { status, notes })
};
