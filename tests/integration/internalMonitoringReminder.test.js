const knex = require('../../src/config/knex');
const reminderService = require('../../src/services/internalMonitoringReminderService');

describe('Internal Monitoring - Reminder Engine', () => {
  let ruleId;
  let targetId;
  let userId;

  beforeAll(async () => {
    await knex.migrate.latest();
    // Clean up
    await knex('monitoring_reminder_deliveries').del();
    await knex('monitoring_reminder_rules').del();

    // Create User
    const username = 'rem_test_' + Date.now();
    const [user] = await knex('users').insert({
      username: username,
      password_hash: 'hash',
      role: 'SATKER_PN',
      is_active: true
    }).returning('id');
    userId = user.id;

    // Create Rule
    const [rule] = await knex('monitoring_reminder_rules').insert({
      code: 'REM_H7',
      name: 'H-7 Reminder',
      scope_type: 'GLOBAL',
      trigger_type: 'BEFORE_DUE',
      offset_value: 7,
      offset_unit: 'CALENDAR_DAY',
      recipient_policy: 'ASSIGNED_COLLECTOR',
      channel_policy: 'IN_APP',
      is_active: true
    }).returning('id');
    ruleId = rule.id;

    // Create Period
    const [period] = await knex('monitoring_periods').insert({
      name: 'Rem Period',
      year: 2026,
      month: 12,
      start_date: '2026-12-01',
      end_date: '2026-12-31',
      status: 'OPEN'
    }).returning('id');

    // Create Target due 7 days from now
    const dueAt = new Date();
    dueAt.setDate(dueAt.getDate() + 7);

    const pkgCode = 'REM_PKG_' + Date.now();
    const [pkg] = await knex('monitoring_packages').insert({
      code: pkgCode,
      name: 'Rem Package'
    }).returning('id');

    const itemCode = 'REM_ITM_' + Date.now();
    const [item] = await knex('monitoring_items').insert({
      package_id: pkg.id,
      item_code: itemCode,
      title: 'Rem Item',
      frequency_type: 'MONTHLY'
    }).returning('id');

    const [target] = await knex('monitoring_targets').insert({
      period_id: period.id,
      monitoring_item_id: item.id,
      workflow_status: 'NOT_STARTED',
      due_date: dueAt,
      due_at: dueAt,
      natural_key: 'PT_INTERNAL:REM_TEST_' + Date.now()
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

  it('1. scanDueReminders - Schedules reminder correctly', async () => {
    await reminderService.scanDueReminders(new Date());

    const deliveries = await knex('monitoring_reminder_deliveries')
      .where('rule_id', ruleId)
      .where('target_id', targetId);

    expect(deliveries.length).toBe(1);
    expect(deliveries[0].status).toBe('PENDING');
    expect(deliveries[0].recipient_user_id).toBe(userId);
  });

  it('2. scanDueReminders - Idempotent (does not duplicate)', async () => {
    // Run it again
    await reminderService.scanDueReminders(new Date());

    const deliveries = await knex('monitoring_reminder_deliveries')
      .where('rule_id', ruleId)
      .where('target_id', targetId);

    // Still exactly 1
    expect(deliveries.length).toBe(1);
  });
});
