exports.up = async function (knex) {
  // 1. monitoring_reminder_rules
  await knex.schema.createTable('monitoring_reminder_rules', (table) => {
    table.increments('id').primary();
    table.string('code', 100).notNullable().unique();
    table.string('name', 255).notNullable();
    table.string('scope_type', 50).notNullable(); // GLOBAL, ITEM, PACKAGE
    table.integer('monitoring_item_id').nullable().references('id').inTable('monitoring_items').onDelete('CASCADE');
    table.string('frequency_type', 50).nullable();
    table.string('trigger_type', 50).notNullable(); // BEFORE_DUE, ON_DUE, AFTER_DUE
    table.integer('offset_value').notNullable();
    table.string('offset_unit', 50).notNullable(); // CALENDAR_DAY, WORKING_DAY, HOUR
    table.string('recipient_policy', 255).notNullable();
    table.string('channel_policy', 255).notNullable();
    table.boolean('is_active').notNullable().defaultTo(true);
    table.timestamp('effective_from').nullable();
    table.timestamp('effective_to').nullable();
    table.timestamps(true, true);
  });

  // 2. monitoring_escalation_rules
  await knex.schema.createTable('monitoring_escalation_rules', (table) => {
    table.increments('id').primary();
    table.string('code', 100).notNullable().unique();
    table.string('name', 255).notNullable();
    table.integer('trigger_after_days').notNullable();
    table.integer('trigger_after_working_days').nullable();
    table.string('from_status', 50).notNullable();
    table.string('recipient_capability', 100).notNullable();
    table.string('escalation_level', 50).notNullable(); // LEVEL_1, LEVEL_2, LEVEL_3, CRITICAL
    table.boolean('create_follow_up').notNullable().defaultTo(false);
    table.integer('follow_up_due_days').nullable();
    table.boolean('is_active').notNullable().defaultTo(true);
    table.timestamp('effective_from').nullable();
    table.timestamp('effective_to').nullable();
    table.timestamps(true, true);
  });

  // 3. monitoring_reminder_deliveries
  await knex.schema.createTable('monitoring_reminder_deliveries', (table) => {
    table.increments('id').primary();
    table.integer('rule_id').notNullable().references('id').inTable('monitoring_reminder_rules').onDelete('CASCADE');
    table.integer('target_id').nullable().references('id').inTable('monitoring_targets').onDelete('CASCADE');
    table.integer('follow_up_id').nullable().references('id').inTable('monitoring_follow_ups').onDelete('CASCADE');
    table.integer('recipient_user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('channel', 50).notNullable();
    table.string('idempotency_key', 255).notNullable().unique();
    table.timestamp('scheduled_at').notNullable();
    table.timestamp('sent_at').nullable();
    table.string('status', 50).notNullable().defaultTo('PENDING'); // PENDING, PROCESSING, SENT, FAILED, SKIPPED, CANCELLED
    table.integer('attempt_count').notNullable().defaultTo(0);
    table.text('last_error').nullable();
    table.jsonb('payload_json').nullable();
    table.timestamps(true, true);

    table.index(['status', 'scheduled_at']);
    table.index(['target_id']);
  });

  // 4. monitoring_escalations
  await knex.schema.createTable('monitoring_escalations', (table) => {
    table.increments('id').primary();
    table.integer('target_id').nullable().references('id').inTable('monitoring_targets').onDelete('CASCADE');
    table.integer('follow_up_id').nullable().references('id').inTable('monitoring_follow_ups').onDelete('CASCADE');
    table.integer('rule_id').notNullable().references('id').inTable('monitoring_escalation_rules').onDelete('CASCADE');
    table.string('level', 50).notNullable();
    table.string('reason', 255).notNullable();
    table.integer('recipient_user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('status', 50).notNullable().defaultTo('OPEN'); // OPEN, ACKNOWLEDGED, RESOLVED, CANCELLED
    table.timestamp('triggered_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('acknowledged_at').nullable();
    table.integer('acknowledged_by').nullable().references('id').inTable('users').onDelete('SET NULL');
    table.timestamp('resolved_at').nullable();
    table.integer('created_follow_up_id').nullable().references('id').inTable('monitoring_follow_ups').onDelete('SET NULL');
    table.jsonb('metadata_json').nullable();
    table.timestamps(true, true);

    table.index(['target_id', 'status']);
  });

  // 5. monitoring_sla_snapshots
  await knex.schema.createTable('monitoring_sla_snapshots', (table) => {
    table.increments('id').primary();
    table.integer('target_id').notNullable().references('id').inTable('monitoring_targets').onDelete('CASCADE');
    table.string('status', 50).notNullable();
    table.timestamp('due_at').notNullable();
    table.decimal('age_hours', 18, 2).notNullable();
    table.decimal('overdue_hours', 18, 2).notNullable();
    table.decimal('approval_wait_hours', 18, 2).notNullable();
    table.decimal('verification_wait_hours', 18, 2).notNullable();
    table.integer('open_follow_up_count').notNullable().defaultTo(0);
    table.timestamp('captured_at').notNullable().defaultTo(knex.fn.now());

    table.index(['target_id', 'captured_at']);
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('monitoring_sla_snapshots');
  await knex.schema.dropTableIfExists('monitoring_escalations');
  await knex.schema.dropTableIfExists('monitoring_reminder_deliveries');
  await knex.schema.dropTableIfExists('monitoring_escalation_rules');
  await knex.schema.dropTableIfExists('monitoring_reminder_rules');
};
