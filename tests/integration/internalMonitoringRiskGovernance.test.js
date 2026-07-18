const request = require('supertest');

jest.mock('../../src/config/minio', () => ({
  minioClient: {
    bucketExists: jest.fn().mockResolvedValue(true),
    makeBucket: jest.fn().mockResolvedValue(true),
    putObject: jest.fn().mockResolvedValue(true),
    removeObject: jest.fn().mockResolvedValue(true),
    presignedGetObject: jest.fn().mockResolvedValue('http://mock/url')
  }
}));
const app = require('../../src/app');
const knex = require('../../src/config/knex');
const InternalMonitoringRiskService = require('../../src/services/internalMonitoringRiskService');
const InternalMonitoringManagementReviewService = require('../../src/services/internalMonitoringManagementReviewService');
const InternalMonitoringRepeatFindingService = require('../../src/services/internalMonitoringRepeatFindingService');

describe('Internal Monitoring - Risk Governance & MR', () => {
  let adminId;
  let pimpinanId;
  let unitHeadId;
  let targetId;
  let riskService;
  let mrService;
  let repeatService;

  beforeAll(async () => {
    riskService = new InternalMonitoringRiskService();
    mrService = new InternalMonitoringManagementReviewService();
    repeatService = new InternalMonitoringRepeatFindingService();

    // Clean up
    await knex.raw('TRUNCATE TABLE monitoring_management_reviews, monitoring_management_review_items, monitoring_repeat_finding_candidates, monitoring_risk_acceptances, monitoring_risk_snapshots, monitoring_action_plans, monitoring_risk_links, monitoring_risks, monitoring_findings, monitoring_targets, monitoring_item_assignments, monitoring_items, monitoring_packages, internal_assignments, positions, internal_units, monitoring_periods, users RESTART IDENTITY CASCADE');

    const [admin] = await knex('users').insert({ username: 'admin', role: 'ADMIN_PT', password_hash: 'hash', is_active: true }).returning('id');
    adminId = admin.id;

    const [pimpinan] = await knex('users').insert({ username: 'pimpinan', role: 'PIMPINAN', password_hash: 'hash', is_active: true }).returning('id');
    pimpinanId = pimpinan.id;

    const [unitHead] = await knex('users').insert({ username: 'unithead', role: 'UNIT_HEAD', password_hash: 'hash', is_active: true }).returning('id');
    unitHeadId = unitHead.id;

    // Dependencies
    await knex('monitoring_periods').insert({ id: 991, year: 2026, month: 7, name: 'Jul 2026', status: 'OPEN', start_date: '2026-07-01', end_date: '2026-07-31' });
    await knex('internal_units').insert({ id: 991, code: 'UNIT_991', name: 'Unit Test' });
    await knex('monitoring_packages').insert({ id: 991, code: 'PKG_991', name: 'Pkg' });

    const [item] = await knex('monitoring_items').insert({
      package_id: 991,
      item_code: 'ITM_TEST',
      title: 'Test Item',
      frequency_type: 'MONTHLY'
    }).returning('id');

    const [target] = await knex('monitoring_targets').insert({
      monitoring_item_id: item.id,
      natural_key: 'KEY_TEST_' + Date.now(),
      period_id: 991,
      internal_unit_id: 991,
      due_date: new Date()
    }).returning('id');
    targetId = target.id;
  });

  afterAll(async () => {
    await knex.destroy();
  });

  describe('Management Review Pack', () => {
    let reviewId;
    let highRiskId;
    let criticalRiskId;

    it('creates a new draft review', async () => {
      const review = await mrService.createReview({
        period_id: 991,
        scope_type: 'MONTHLY_MONITORING',
        review_date: new Date(),
        chair_user_id: pimpinanId,
        title: 'Q3 Executive Review'
      }, adminId);
      expect(review.status).toBe('DRAFT');
      reviewId = review.id;
    });

    it('builds review pack gathering high/critical risks', async () => {
      // Create some risks
      const findingData = {
        title: 'Test Finding',
        description: 'Test Desc',
        finding_type: 'COMPLIANCE',
        severity: 'HIGH'
      };
      const finding = await riskService.createFinding(targetId, adminId, findingData);
      const finding2 = await riskService.createFinding(targetId, adminId, findingData);
      
      const highRisk = await riskService.assessRisk(finding.id, {
        likelihood: 4, impact: 4, category: 'OPERATIONAL', owner_user_id: unitHeadId
      }, adminId);
      highRiskId = highRisk.id; // Score 16 -> HIGH

      const criticalRisk = await riskService.assessRisk(finding2.id, {
        likelihood: 5, impact: 5, category: 'COMPLIANCE', owner_user_id: unitHeadId
      }, adminId);
      criticalRiskId = criticalRisk.id; // Score 25 -> CRITICAL

      // Build pack
      const result = await mrService.buildReviewPack(reviewId, adminId);
      expect(result.itemCount).toBe(2);

      const items = await knex('monitoring_management_review_items').where('management_review_id', reviewId);
      expect(items.length).toBe(2);
      expect(items[0].decision).toBe('PENDING');
      expect(items[0].snapshot_json).toBeDefined();
    });

    it('updates item decisions', async () => {
      const items = await knex('monitoring_management_review_items').where('management_review_id', reviewId);
      const highRiskItem = items.find(i => i.item_id === highRiskId);

      const updated = await mrService.updateReviewItemDecision(reviewId, highRiskItem.id, {
        decision: 'ACCEPT',
        decision_note: 'Risk accepted due to resource constraints'
      }, adminId);

      expect(updated.decision).toBe('ACCEPT');
    });

    it('submits review', async () => {
      const submitted = await mrService.submitReview(reviewId, adminId, 1);
      expect(submitted.status).toBe('IN_REVIEW');
    });

    it('finalizes review which creates risk acceptance record', async () => {
      const finalized = await mrService.finalizeReview(reviewId, pimpinanId, 'PIMPINAN');
      expect(finalized.status).toBe('FINALIZED');

      // Check if ACCEPT decision was executed and marked COMPLETED
      const items = await knex('monitoring_management_review_items').where('management_review_id', reviewId);
      const highRiskItem = items.find(i => i.item_id === highRiskId);
      expect(highRiskItem.status).toBe('COMPLETED');
    });

    it('prevents changes on finalized review', async () => {
      await expect(
        mrService.submitReview(reviewId, adminId, 2)
      ).rejects.toThrow('Can only submit DRAFT review');
    });

    it('amends review creating a new version', async () => {
      const newReview = await mrService.amendReview(reviewId, 'Need to include overdue caps', adminId);
      expect(newReview.version_no).toBe(2);
      expect(newReview.status).toBe('DRAFT');
      expect(newReview.supersedes_review_id).toBe(reviewId);

      const oldReview = await knex('monitoring_management_reviews').where('id', reviewId).first();
      expect(oldReview.status).toBe('SUPERSEDED');
    });
  });

  describe('Risk Acceptance', () => {
    let riskId;
    beforeAll(async () => {
      const finding = await riskService.createFinding(targetId, adminId, {
        title: 'Acc Finding',
        description: 'Test',
        finding_type: 'COMPLIANCE',
        severity: 'MEDIUM'
      });
      const risk = await riskService.assessRisk(finding.id, {
        likelihood: 5, impact: 5, category: 'STRATEGIC'
      }, adminId); // CRITICAL
      riskId = risk.id;
    });

    it('rejects CRITICAL risk acceptance by UNIT_HEAD', async () => {
      await expect(
        riskService.acceptRisk(riskId, { accepted_reason: 'I said so' }, unitHeadId, 'UNIT_HEAD')
      ).rejects.toThrow('Role UNIT_HEAD is not authorized to accept CRITICAL risk');
    });

    it('accepts CRITICAL risk by PIMPINAN with valid arguments', async () => {
      const validUntil = new Date();
      validUntil.setFullYear(validUntil.getFullYear() + 1);

      const acceptance = await riskService.acceptRisk(riskId, {
        accepted_reason: 'Strategic direction',
        valid_until: validUntil
      }, pimpinanId, 'PIMPINAN');

      expect(acceptance.status).toBe('ACTIVE');
      expect(acceptance.authority_level).toBe('PIMPINAN');
      
      const risk = await knex('monitoring_risks').where('id', riskId).first();
      expect(risk.accepted_by).toBe(pimpinanId);
    });

    it('revokes risk acceptance', async () => {
      const acceptances = await knex('monitoring_risk_acceptances').where('risk_id', riskId);
      const active = acceptances.find(a => a.status === 'ACTIVE');

      const revoked = await riskService.revokeRiskAcceptance(active.id, { revoke_reason: 'Strategy changed' }, pimpinanId);
      expect(revoked.status).toBe('REVOKED');

      const risk = await knex('monitoring_risks').where('id', riskId).first();
      expect(risk.accepted_by).toBeNull();
    });
  });

  describe('Repeat Findings Detection', () => {
    let finding1, finding2;
    beforeAll(async () => {
      finding1 = await riskService.createFinding(targetId, adminId, {
        title: 'Same finding',
        description: 'Blah blah',
        finding_type: 'COMPLIANCE',
        severity: 'LOW'
      });
      // Simulate older time
      await knex('monitoring_findings').where('id', finding1.id).update({ created_at: knex.raw("NOW() - INTERVAL '10 DAYS'") });

      finding2 = await riskService.createFinding(targetId, adminId, {
        title: 'Another same finding',
        description: 'Blah blah',
        finding_type: 'COMPLIANCE',
        severity: 'LOW'
      });
    });

    it('detects repeat findings with high score', async () => {
      const result = await repeatService.detectCandidates();
      expect(result.detected).toBeGreaterThan(0);

      const candidate = await knex('monitoring_repeat_finding_candidates')
        .where({ finding_id: finding2.id, matched_finding_id: finding1.id }).first();
      
      expect(candidate).toBeDefined();
      expect(candidate.match_score).toBeGreaterThanOrEqual(60); // 35 (item) + 20 (unit) + 15 (type) + 10 (time) = 80
      expect(candidate.status).toBe('PENDING_REVIEW');
    });

    it('confirms a repeat finding candidate', async () => {
      const candidate = await knex('monitoring_repeat_finding_candidates')
        .where({ finding_id: finding2.id, matched_finding_id: finding1.id }).first();

      const confirmed = await repeatService.confirmCandidate(candidate.id, adminId);
      expect(confirmed.status).toBe('CONFIRMED');
      expect(confirmed.reviewed_by).toBe(adminId);
    });
  });

});
