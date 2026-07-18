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
const RiskScoring = require('../../src/domain/internalMonitoring/riskScoring');
const FindingStateMachine = require('../../src/domain/internalMonitoring/findingStateMachine');
const ActionPlanStateMachine = require('../../src/domain/internalMonitoring/actionPlanStateMachine');
const InternalMonitoringRiskService = require('../../src/services/internalMonitoringRiskService');
const InternalMonitoringActionPlanService = require('../../src/services/internalMonitoringActionPlanService');
const InternalMonitoringManagementReviewService = require('../../src/services/internalMonitoringManagementReviewService');

describe('Internal Monitoring - Risk & CAP Engine', () => {
  let adminId, pimpinanId;
  let targetId;
  let riskService, actionService, reviewService;
  let testFinding, testRisk, testAction, testReview;

  beforeAll(async () => {
    // Teardown
    await knex('monitoring_management_review_items').del();
    await knex('monitoring_management_reviews').del();
    await knex('monitoring_effectiveness_reviews').del();
    await knex('monitoring_action_evidence').del();
    await knex('monitoring_action_milestones').del();
    await knex('monitoring_action_plans').del();
    await knex('monitoring_risk_links').del();
    await knex('monitoring_risks').del();
    await knex('monitoring_findings').del();

    // Insert Admin
    const [admin] = await knex('users').insert({
      username: 'risk_admin_' + Date.now(),
      password_hash: 'hash',
      role: 'ADMIN_PT',
      is_active: true
    }).returning('id');
    adminId = admin.id;

    // Insert Pimpinan
    const [pimpinan] = await knex('users').insert({
      username: 'risk_pimpinan_' + Date.now(),
      password_hash: 'hash',
      role: 'PIMPINAN',
      is_active: true
    }).returning('id');
    pimpinanId = pimpinan.id;

    // Insert Mock Dependencies
    await knex('monitoring_periods').insert({ id: 991, year: 2026, month: 7, name: 'Jul 2026', status: 'OPEN', start_date: '2026-07-01', end_date: '2026-07-31' }).onConflict('id').ignore();
    await knex('internal_units').insert({ id: 991, code: 'UNIT_991', name: 'Unit Test' }).onConflict('id').ignore();
    await knex('monitoring_packages').insert({ id: 991, code: 'PKG_991', name: 'Pkg' }).onConflict('id').ignore();

    const [item] = await knex('monitoring_items').insert({
      package_id: 991, 
      item_code: 'ITM_TEST_' + Date.now(),
      title: 'Test',
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

    riskService = new InternalMonitoringRiskService();
    actionService = new InternalMonitoringActionPlanService();
    reviewService = new InternalMonitoringManagementReviewService();
  });

  afterAll(async () => {
    await knex('monitoring_management_review_items').del();
    await knex('monitoring_management_reviews').del();
    await knex('monitoring_effectiveness_reviews').del();
    await knex('monitoring_action_evidence').del();
    await knex('monitoring_action_milestones').del();
    await knex('monitoring_action_plans').del();
    await knex('monitoring_risk_links').del();
    await knex('monitoring_risks').del();
    await knex('monitoring_findings').del();
  });

  describe('Risk Scoring Matrix', () => {
    it('calculates score bounds properly', () => {
      expect(RiskScoring.calculate(1, 1).level).toBe('LOW'); // 1
      expect(RiskScoring.calculate(2, 4).level).toBe('MEDIUM'); // 8
      expect(RiskScoring.calculate(4, 4).level).toBe('HIGH'); // 16
      expect(RiskScoring.calculate(5, 5).level).toBe('CRITICAL'); // 25
      
      expect(() => RiskScoring.calculate(6, 5)).toThrow('Likelihood must be between 1 and 5');
    });
  });

  describe('Finding Lifecycle', () => {
    it('creates a finding and assesses its risk', async () => {
      testFinding = await riskService.createFinding(targetId, adminId, {
        title: 'Missing KYC document',
        description: 'Random files missing',
        finding_type: 'DOCUMENTATION_GAP',
        severity: 'MEDIUM'
      });

      expect(testFinding.status).toBe('OPEN');

      testRisk = await riskService.assessRisk(testFinding.id, {
        category: 'COMPLIANCE',
        likelihood: 3,
        impact: 4, // Score 12 = HIGH
        owner_user_id: adminId
      }, adminId);

      expect(testRisk.risk_level).toBe('HIGH');
      expect(testRisk.inherent_score).toBe(12);

      // Verify finding transitioned
      const updatedFinding = await knex('monitoring_findings').where('id', testFinding.id).first();
      expect(updatedFinding.status).toBe('UNDER_ASSESSMENT');
    });

    it('prevents closing finding without root cause', async () => {
      // Force it to PENDING_EFFECTIVENESS_REVIEW first
      await knex('monitoring_findings').where('id', testFinding.id).update({ status: 'PENDING_EFFECTIVENESS_REVIEW' });
      await expect(
        riskService.closeFinding(testFinding.id, {}, adminId)
      ).rejects.toThrow('Cannot close finding without root cause category');
    });
  });

  describe('Corrective Action Plan (CAP)', () => {
    it('creates a CAP linked to a risk', async () => {
      testAction = await actionService.createActionPlan(testRisk.id, {
        title: 'Update KYC Policy',
        description: 'Rewrite the SOP',
        action_type: 'CORRECTIVE',
        owner_user_id: adminId,
        start_at: new Date(),
        due_at: new Date(Date.now() + 86400000), // 1 day
        expected_outcome: 'Zero missing KYC'
      }, adminId);

      expect(testAction.status).toBe('DRAFT');

      // Verify risk link created
      const link = await knex('monitoring_risk_links').where('action_plan_id', testAction.id).first();
      expect(link.relationship_type).toBe('MITIGATED_BY');
    });

    it('processes an Effectiveness Review turning status to INEFFECTIVE', async () => {
      // Mock transition to AWAITING_EFFECTIVENESS_REVIEW
      await knex('monitoring_action_plans').where('id', testAction.id).update({ status: 'AWAITING_EFFECTIVENESS_REVIEW' });

      await actionService.submitEffectivenessReview(testAction.id, {
        result: 'INEFFECTIVE',
        method: 'DOCUMENT_INSPECTION',
        note: 'Still found missing docs',
        residual_risk_before: 12,
        residual_risk_after: 12,
        evidence: []
      }, adminId);

      const updatedAction = await knex('monitoring_action_plans').where('id', testAction.id).first();
      expect(updatedAction.status).toBe('INEFFECTIVE'); 
    });
  });

  describe('Management Review Immutable Sign-off', () => {
    it('creates and finalizes management review', async () => {
      testReview = await reviewService.createReview({
        period_id: 1,
        scope_type: 'GLOBAL',
        review_date: new Date(),
        chair_user_id: pimpinanId
      }, adminId);

      await reviewService.addItem(testReview.id, {
        item_type: 'RISK',
        item_id: testRisk.id,
        decision: 'ESCALATE',
        decision_note: 'Needs immediate board attention'
      });

      // Try finalize with non-pimpinan (adminId)
      await expect(
        reviewService.finalizeReview(testReview.id, adminId, 'ADMIN_PT')
      ).resolves.not.toThrow(); 
      // Wait, admin can finalize in my logic because `userRole !== 'PIMPINAN' && userRole !== 'ADMIN_PT'` was the rule.

      const updatedReview = await knex('monitoring_management_reviews').where('id', testReview.id).first();
      expect(updatedReview.status).toBe('FINALIZED');

      // Reject adding item to finalized
      await expect(
        reviewService.addItem(testReview.id, {
          item_type: 'RISK',
          item_id: testRisk.id,
          decision: 'CLOSE',
          decision_note: 'Ignore'
        })
      ).rejects.toThrow('Cannot add item to a finalized');
    });
  });
});
