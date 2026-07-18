const knex = require('../../src/config/knex');
const escalationService = require('../../src/services/internalMonitoringEscalationService');

describe('Internal Monitoring - Escalation Engine', () => {
  let ruleId;
  let targetId;
  let userId;

  beforeAll(async () => {
    await knex.migrate.latest();
    // Clean up
    await knex('monitoring_escalations').del();
    await knex('monitoring_escalation_rules').del();
    await knex('monitoring_follow_ups').del();

    const username = 'esc_test_' + Date.now();
    const [user] = await knex('users').insert({
      username: username,
      password_hash: 'hash',
      role: 'ADMIN_PT',
      is_active: true
    }).returning('id');
    userId = user.id;

    // Create Rule
    const [rule] = await knex('monitoring_escalation_rules').insert({
      code: 'ESC_L1',
      name: 'Overdue Level 1',
      trigger_after_days: 1,
      from_status: 'NOT_STARTED',
      recipient_capability: 'COLLECTOR',
      escalation_level: 'LEVEL_1',
      create_follow_up: true,
      follow_up_due_days: 3,
      is_active: true
    }).returning('id');
    ruleId = rule.id;

    const [period] = await knex('monitoring_periods').insert({
      name: 'Esc Period',
      year: 2026,
      month: 12,
      start_date: '2026-12-01',
      end_date: '2026-12-31',
      status: 'OPEN'
    }).returning('id');

    // Create Target overdue by 2 days
    const dueAt = new Date();
    dueAt.setDate(dueAt.getDate() - 2);

    const pkgCode = 'ESC_PKG_' + Date.now();
    const [pkg] = await knex('monitoring_packages').insert({
      code: pkgCode,
      name: 'Esc Package'
    }).returning('id');

    const itemCode = 'ESC_ITM_' + Date.now();
    const [item] = await knex('monitoring_items').insert({
      package_id: pkg.id,
      item_code: itemCode,
      title: 'Esc Item',
      frequency_type: 'MONTHLY'
    }).returning('id');

    const [target] = await knex('monitoring_targets').insert({
      period_id: period.id,
      monitoring_item_id: item.id,
      workflow_status: 'NOT_STARTED',
      due_date: dueAt,
      due_at: dueAt,
      natural_key: 'PT_INTERNAL:ESC_TEST_' + Date.now()
    }).returning('id');
    targetId = target.id;

    await knex('monitoring_target_assignees').insert({
      monitoring_target_id: targetId,
      user_id: userId,
      capability: 'COLLECTOR',
      is_primary: true
    });
  });

  afterAll(async () => {
    await knex.destroy();
  });

  it('1. scanEscalations - Triggers level 1 and creates Follow-up', async () => {
    await escalationService.scanEscalations(new Date());

    const escalations = await knex('monitoring_escalations')
      .where('rule_id', ruleId)
      .where('target_id', targetId);

    expect(escalations.length).toBe(1);
    expect(escalations[0].level).toBe('LEVEL_1');
    expect(escalations[0].status).toBe('OPEN');
    expect(escalations[0].created_follow_up_id).not.toBeNull();

    const followUp = await knex('monitoring_follow_ups').where('id', escalations[0].created_follow_up_id).first();
    expect(followUp).toBeDefined();
    expect(followUp.status).toBe('OPEN');
    expect(followUp.owner_user_id).toBe(userId);
  });

  it('2. scanEscalations - Idempotent (does not duplicate same level)', async () => {
    await escalationService.scanEscalations(new Date());

    const escalations = await knex('monitoring_escalations')
      .where('rule_id', ruleId)
      .where('target_id', targetId);

    expect(escalations.length).toBe(1);
  });
});
