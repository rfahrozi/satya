const knex = require('../config/knex');

class InternalMonitoringRiskDashboardService {
  async getRiskTrends(filters = {}) {
    // Ambil snapshot risiko per bulan berdasarkan created_at
    // Hitung jumlah risiko baru, closed, dan net per bulan
    const months = parseInt(filters.months || '6', 10);

    const rows = await knex('monitoring_risks')
      .select(
        knex.raw("TO_CHAR(created_at, 'YYYY-MM') as month"),
        knex.raw('COUNT(*) as new_risks'),
        knex.raw("COUNT(CASE WHEN status = 'CLOSED' THEN 1 END) as closed_risks"),
        knex.raw("AVG(risk_score) as avg_score")
      )
      .where('created_at', '>=', knex.raw(`NOW() - INTERVAL '${months} months'`))
      .groupByRaw("TO_CHAR(created_at, 'YYYY-MM')")
      .orderByRaw("TO_CHAR(created_at, 'YYYY-MM') ASC");

    // Breakdown per risk_level untuk periode yang dipilih
    const byLevel = await knex('monitoring_risks')
      .whereNot('status', 'CLOSED')
      .whereNot('status', 'CANCELLED')
      .select('risk_level')
      .count('* as count')
      .groupBy('risk_level');

    return {
      monthly: rows.map(r => ({
        month:       r.month,
        new_risks:   parseInt(r.new_risks) || 0,
        closed_risks: parseInt(r.closed_risks) || 0,
        net:         (parseInt(r.new_risks) || 0) - (parseInt(r.closed_risks) || 0),
        avg_score:   parseFloat(r.avg_score || 0).toFixed(2)
      })),
      byLevel: byLevel.reduce((acc, r) => {
        acc[r.risk_level || 'UNKNOWN'] = parseInt(r.count) || 0;
        return acc;
      }, {})
    };
  }

  async getRiskHeatmap(filters = {}) {
    // 5x5 Matrix: Likelihood (1-5) x Impact (1-5)
    // We count risks in each cell
    let query = knex('monitoring_risks')
      .whereNot('status', 'CLOSED')
      .whereNot('status', 'CANCELLED');

    if (filters.unit_id) {
      query = query
        .join('monitoring_targets', 'monitoring_risks.source_id', 'monitoring_targets.id')
        .where('monitoring_targets.internal_unit_id', filters.unit_id);
    }
    
    if (filters.risk_owner_user_id) {
      query.where('risk_owner_user_id', filters.risk_owner_user_id);
    }

    if (filters.risk_category) {
      query.where('risk_category', filters.risk_category);
    }

    const useResidual = filters.use_residual === 'true';
    const likelihoodCol = useResidual ? 'residual_likelihood' : 'inherent_likelihood';
    const impactCol = useResidual ? 'residual_impact' : 'inherent_impact';

    // We only want rows that have the score, if residual isn't assessed it might be null
    query.whereNotNull(likelihoodCol).whereNotNull(impactCol);

    const risks = await query.select(likelihoodCol, impactCol, 'id', 'risk_level');

    // Build the 5x5 matrix
    const matrix = Array.from({ length: 5 }, () => Array(5).fill(0));

    for (const r of risks) {
      const l = r[likelihoodCol];
      const i = r[impactCol];
      if (l >= 1 && l <= 5 && i >= 1 && i <= 5) {
        matrix[l - 1][i - 1]++;
      }
    }

    return {
      type: useResidual ? 'RESIDUAL' : 'INHERENT',
      matrix, // matrix[likelihood-1][impact-1] = count
      total: risks.length
    };
  }

  async getRepeatFindingsQueue() {
    return knex('monitoring_repeat_finding_candidates')
      .join('monitoring_findings as new_f', 'monitoring_repeat_finding_candidates.finding_id', 'new_f.id')
      .join('monitoring_findings as old_f', 'monitoring_repeat_finding_candidates.matched_finding_id', 'old_f.id')
      .select(
        'monitoring_repeat_finding_candidates.*',
        'new_f.title as finding_title',
        'old_f.title as matched_title',
        'new_f.finding_code',
        'old_f.finding_code as matched_code'
      )
      .where('monitoring_repeat_finding_candidates.status', 'PENDING_REVIEW')
      .orderBy('match_score', 'desc');
  }

  async getRiskAcceptances() {
    return knex('monitoring_risk_acceptances')
      .join('monitoring_risks', 'monitoring_risk_acceptances.risk_id', 'monitoring_risks.id')
      .select(
        'monitoring_risk_acceptances.*',
        'monitoring_risks.risk_code',
        'monitoring_risks.title as risk_title'
      )
      .whereIn('monitoring_risk_acceptances.status', ['ACTIVE', 'EXPIRED'])
      .orderBy('valid_until', 'asc');
  }
}

module.exports = InternalMonitoringRiskDashboardService;
