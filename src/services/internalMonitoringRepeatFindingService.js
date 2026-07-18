const knex = require('../config/knex');

class InternalMonitoringRepeatFindingService {

  async detectCandidates() {
    // A background job or manual trigger to find repeat candidates
    // For simplicity, we compare recent OPEN or CLOSED findings with NEW findings
    // Match score logic:
    // same item: +35
    // same unit: +20
    // same finding type: +15
    // same root cause: +20
    // time proximity: +10

    const recentFindings = await knex('monitoring_findings')
      .join('monitoring_targets', 'monitoring_findings.monitoring_target_id', 'monitoring_targets.id')
      .select('monitoring_findings.*', 'monitoring_targets.monitoring_item_id', 'monitoring_targets.internal_unit_id')
      .where('monitoring_findings.created_at', '>=', knex.raw("NOW() - INTERVAL '6 MONTHS'"))
      .orderBy('monitoring_findings.created_at', 'asc');

    const candidates = [];

    for (let i = 0; i < recentFindings.length; i++) {
      for (let j = i + 1; j < recentFindings.length; j++) {
        const older = recentFindings[i];
        const newer = recentFindings[j];
        
        let score = 0;
        const reasons = [];

        if (older.monitoring_item_id === newer.monitoring_item_id) {
          score += 35;
          reasons.push('SAME_ITEM');
        }
        if (older.internal_unit_id === newer.internal_unit_id) {
          score += 20;
          reasons.push('SAME_UNIT');
        }
        if (older.finding_type === newer.finding_type) {
          score += 15;
          reasons.push('SAME_FINDING_TYPE');
        }
        if (older.root_cause_category && older.root_cause_category === newer.root_cause_category) {
          score += 20;
          reasons.push('SAME_ROOT_CAUSE');
        }
        
        const timeDiffDays = Math.abs(new Date(newer.created_at) - new Date(older.created_at)) / (1000 * 60 * 60 * 24);
        if (timeDiffDays < 90) { // Within 3 months
          score += 10;
          reasons.push('TIME_PROXIMITY');
        }

        if (score >= 60) {
          candidates.push({
            finding_id: newer.id,
            matched_finding_id: older.id,
            match_score: score,
            match_reasons_json: JSON.stringify(reasons),
            status: 'PENDING_REVIEW'
          });
        }
      }
    }

    let inserted = 0;
    for (const candidate of candidates) {
      // Use ON CONFLICT DO NOTHING (simulate by checking first since knex might not support it cleanly depending on PG version)
      const exists = await knex('monitoring_repeat_finding_candidates')
        .where({ finding_id: candidate.finding_id, matched_finding_id: candidate.matched_finding_id })
        .first();
      
      if (!exists) {
        await knex('monitoring_repeat_finding_candidates').insert(candidate);
        inserted++;
      }
    }

    return { detected: inserted };
  }

  async confirmCandidate(candidateId, actorId) {
    const trx = await knex.transaction();
    try {
      const candidate = await trx('monitoring_repeat_finding_candidates').where('id', candidateId).forUpdate().first();
      if (!candidate) throw new Error('Candidate not found');
      if (candidate.status !== 'PENDING_REVIEW') throw new Error('Candidate is not pending review');

      const [confirmed] = await trx('monitoring_repeat_finding_candidates')
        .where('id', candidateId)
        .update({
          status: 'CONFIRMED',
          reviewed_by: actorId,
          reviewed_at: new Date()
        }).returning('*');

      await trx.commit();
      return confirmed;
    } catch (err) {
      await trx.rollback();
      throw err;
    }
  }

  async rejectCandidate(candidateId, reviewNote, actorId) {
    const [rejected] = await knex('monitoring_repeat_finding_candidates')
      .where('id', candidateId)
      .where('status', 'PENDING_REVIEW')
      .update({
        status: 'REJECTED',
        reviewed_by: actorId,
        reviewed_at: new Date(),
        review_note: reviewNote
      }).returning('*');

    if (!rejected) throw new Error('Candidate not found or not in PENDING_REVIEW');
    return rejected;
  }

  async mergeCandidate(candidateId, actorId) {
    const trx = await knex.transaction();
    try {
      const candidate = await trx('monitoring_repeat_finding_candidates').where('id', candidateId).forUpdate().first();
      if (!candidate) throw new Error('Candidate not found');
      if (candidate.status !== 'PENDING_REVIEW') throw new Error('Candidate is not pending review');

      const [merged] = await trx('monitoring_repeat_finding_candidates')
        .where('id', candidateId)
        .update({
          status: 'MERGED',
          reviewed_by: actorId,
          reviewed_at: new Date(),
          review_note: 'Merged into previous finding'
        }).returning('*');
        
      // Usually, merge implies finding_id is closed or marked duplicate of matched_finding_id
      await trx('monitoring_findings').where('id', candidate.finding_id).update({
        status: 'CLOSED', // or 'DUPLICATE'
        closed_at: new Date(),
        description: knex.raw(`description || '\n\n[MERGED] Duplicate of finding ID: ${candidate.matched_finding_id}'`)
      });

      await trx.commit();
      return merged;
    } catch (err) {
      await trx.rollback();
      throw err;
    }
  }
}

module.exports = InternalMonitoringRepeatFindingService;
