const knex = require('../config/knex');
const RiskScoring = require('../domain/internalMonitoring/riskScoring');
const FindingStateMachine = require('../domain/internalMonitoring/findingStateMachine');

class InternalMonitoringRiskService {
  
  async createFinding(targetId, actorId, findingData) {
    const finding = {
      finding_code: `FND-${Date.now()}`,
      monitoring_target_id: targetId,
      title: findingData.title,
      description: findingData.description,
      finding_type: findingData.finding_type,
      severity: findingData.severity,
      identified_by: actorId,
      status: 'OPEN'
    };
    const [result] = await knex('monitoring_findings').insert(finding).returning('*');
    return result;
  }

  async assessRisk(findingId, riskData, actorId) {
    const finding = await knex('monitoring_findings').where('id', findingId).first();
    if (!finding) throw new Error('Finding not found');

    const scoreData = RiskScoring.calculate(riskData.likelihood, riskData.impact);

    const risk = {
      risk_code: `RSK-${Date.now()}`,
      title: riskData.title || finding.title,
      description: riskData.description || finding.description,
      risk_category: riskData.category,
      source_type: 'FINDING',
      source_id: findingId,
      inherent_likelihood: scoreData.likelihood,
      inherent_impact: scoreData.impact,
      inherent_score: scoreData.score,
      risk_level: scoreData.level,
      risk_owner_user_id: riskData.owner_user_id,
      status: 'OPEN'
    };

    const trx = await knex.transaction();
    try {
      const [newRisk] = await trx('monitoring_risks').insert(risk).returning('*');
      
      await trx('monitoring_risk_links').insert({
        risk_id: newRisk.id,
        finding_id: findingId,
        relationship_type: 'ORIGINATED_FROM'
      });

      // Update Finding state
      const newState = FindingStateMachine.transition(finding.status, 'ASSESS');
      await trx('monitoring_findings')
        .where('id', findingId)
        .update({ status: newState });

      await trx.commit();
      return newRisk;
    } catch (err) {
      await trx.rollback();
      throw err;
    }
  }

  async closeFinding(findingId, closureData, actorId) {
    const finding = await knex('monitoring_findings').where('id', findingId).first();
    if (!finding) throw new Error('Finding not found');

    const updatedData = { ...finding, root_cause_category: closureData.root_cause_category };
    const newState = FindingStateMachine.transition(finding.status, 'CLOSE', updatedData);

    const [closed] = await knex('monitoring_findings')
      .where('id', findingId)
      .update({
        status: newState,
        root_cause_category: closureData.root_cause_category,
        root_cause_description: closureData.root_cause_description,
        closed_at: new Date(),
      }).returning('*');
    return closed;
  }

  async acceptRisk(riskId, payload, actorId, actorRole) {
    const risk = await knex('monitoring_risks').where('id', riskId).first();
    if (!risk) throw new Error('Risk not found');

    const score = risk.residual_score || risk.inherent_score;
    // [BUG-02] Perbaiki dead code: gunakan residual_level jika ada
    const level = risk.residual_level || risk.risk_level; 
    // Usually residual risk level is recalculated, we assume it's stored in risk_level or we use the current one

    // Authority checks
    let allowed = false;
    let requiredReason = false;
    let requiredValidity = false;

    if (level === 'LOW') {
      allowed = ['UNIT_HEAD', 'PIMPINAN', 'ADMIN_PT'].includes(actorRole);
    } else if (level === 'MEDIUM') {
      allowed = ['UNIT_HEAD', 'PIMPINAN', 'ADMIN_PT'].includes(actorRole);
    } else if (level === 'HIGH') {
      allowed = ['PIMPINAN', 'ADMIN_PT'].includes(actorRole);
    } else if (level === 'CRITICAL') {
      allowed = ['PIMPINAN', 'ADMIN_PT'].includes(actorRole);
      requiredReason = true;
      requiredValidity = true;
    }

    if (!allowed) {
      throw new Error(`Role ${actorRole} is not authorized to accept ${level} risk`);
    }

    if (requiredReason && !payload.accepted_reason) {
      throw new Error(`Accepted reason is required for ${level} risk`);
    }

    if (requiredValidity && !payload.valid_until) {
      throw new Error(`Validity period is required for ${level} risk`);
    }

    const acceptance = {
      risk_id: riskId,
      accepted_level: level,
      accepted_score: score,
      accepted_reason: payload.accepted_reason || 'Accepted by policy',
      authority_level: actorRole,
      accepted_by: actorId,
      valid_until: payload.valid_until || null,
      review_due_at: payload.review_due_at || null,
      status: 'ACTIVE'
    };

    const trx = await knex.transaction();
    try {
      // Invalidate previous acceptances
      await trx('monitoring_risk_acceptances')
        .where('risk_id', riskId)
        .where('status', 'ACTIVE')
        .update({ status: 'SUPERSEDED' });

      const [newAcceptance] = await trx('monitoring_risk_acceptances')
        .insert(acceptance)
        .returning('*');

      // Update risk
      await trx('monitoring_risks')
        .where('id', riskId)
        .update({
          accepted_reason: newAcceptance.accepted_reason,
          accepted_by: actorId,
          accepted_at: new Date()
        });

      await trx.commit();
      return newAcceptance;
    } catch (err) {
      await trx.rollback();
      throw err;
    }
  }

  async revokeRiskAcceptance(acceptanceId, payload, actorId) {
    const trx = await knex.transaction();
    try {
      const acceptance = await trx('monitoring_risk_acceptances')
        .where('id', acceptanceId).forUpdate().first();
      
      if (!acceptance) throw new Error('Risk acceptance not found');
      if (acceptance.status !== 'ACTIVE') throw new Error('Cannot revoke inactive risk acceptance');

      const [revoked] = await trx('monitoring_risk_acceptances')
        .where('id', acceptanceId)
        .update({
          status: 'REVOKED',
          revoked_at: new Date(),
          revoked_by: actorId,
          revoke_reason: payload.revoke_reason || 'No reason provided'
        })
        .returning('*');

      // Clear risk acceptance info from risk
      await trx('monitoring_risks')
        .where('id', acceptance.risk_id)
        .update({
          accepted_reason: null,
          accepted_by: null,
          accepted_at: null
        });

      await trx.commit();
      return revoked;
    } catch (err) {
      await trx.rollback();
      throw err;
    }
  }
}

module.exports = InternalMonitoringRiskService;
