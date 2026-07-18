/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  // 1. Business Calendars & Holidays
  await knex.schema.createTable('business_calendars', (table) => {
    table.increments('id').primary();
    table.string('code', 50).notNullable().unique();
    table.string('name', 255).notNullable();
    table.string('timezone', 100).defaultTo('Asia/Jakarta');
    table.timestamps(true, true);
  });

  await knex.schema.createTable('business_holidays', (table) => {
    table.increments('id').primary();
    table.integer('calendar_id').notNullable().references('id').inTable('business_calendars').onDelete('CASCADE');
    table.date('holiday_date').notNullable();
    table.string('description', 255);
    table.unique(['calendar_id', 'holiday_date']);
    table.timestamps(true, true);
  });

  // 2. Monitoring Frequency Rules
  await knex.schema.createTable('monitoring_frequency_rules', (table) => {
    table.increments('id').primary();
    table.string('code', 100).notNullable().unique();
    table.string('name', 255).notNullable();
    table.string('frequency_type', 50).notNullable();
    table.string('generation_strategy', 100).notNullable();
    table.string('deadline_strategy', 100).notNullable();
    table.jsonb('config_json').defaultTo('{}');
    table.date('effective_from').notNullable();
    table.date('effective_to').nullable();
    table.boolean('is_active').defaultTo(true);
    table.timestamps(true, true);
  });

  // 3. Alter monitoring_items
  await knex.schema.alterTable('monitoring_items', (table) => {
    table.integer('frequency_rule_id').nullable().references('id').inTable('monitoring_frequency_rules').onDelete('SET NULL');
    table.boolean('requires_event_occurrence').defaultTo(false);
    table.boolean('requires_monthly_recap').defaultTo(false);
    table.boolean('requires_change_event').defaultTo(false);
    table.string('regulator_deadline_source', 255).nullable();
    table.date('effective_from').defaultTo(knex.fn.now());
    table.date('effective_to').nullable();
    table.integer('master_version').defaultTo(1);
  });

  // 4. Monitoring Events
  await knex.schema.createTable('monitoring_events', (table) => {
    table.increments('id').primary();
    table.string('event_type', 50).notNullable(); // CHANGE, OCCURRENCE, REGULATOR_DEADLINE
    table.date('event_date').notNullable();
    table.string('title', 255).notNullable();
    table.text('description').nullable();
    table.string('source_reference', 255).nullable();
    table.integer('internal_unit_id').nullable().references('id').inTable('internal_units').onDelete('SET NULL');
    table.integer('position_id').nullable().references('id').inTable('positions').onDelete('SET NULL');
    table.integer('created_by').nullable().references('id').inTable('users').onDelete('SET NULL');
    table.timestamps(true, true);
  });

  // 5. Monitoring Event Targets
  await knex.schema.createTable('monitoring_event_targets', (table) => {
    table.increments('id').primary();
    table.integer('monitoring_event_id').notNullable().references('id').inTable('monitoring_events').onDelete('CASCADE');
    table.integer('monitoring_item_id').notNullable().references('id').inTable('monitoring_items').onDelete('CASCADE');
    table.integer('monitoring_target_id').nullable().references('id').inTable('monitoring_targets').onDelete('SET NULL');
    table.integer('event_sequence').defaultTo(1);
    table.timestamp('evidence_due_at').nullable();
    table.integer('recap_period_id').nullable().references('id').inTable('monitoring_periods').onDelete('SET NULL');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    
    table.unique(['monitoring_event_id', 'monitoring_item_id']);
  });

  // 6. Monitoring Deadline Overrides
  await knex.schema.createTable('monitoring_deadline_overrides', (table) => {
    table.increments('id').primary();
    table.string('entity_type', 50).notNullable(); // ITEM, PERIOD, EVENT
    table.integer('entity_id').notNullable();
    table.timestamp('override_due_at').notNullable();
    table.text('reason').nullable();
    table.string('source_reference', 255).nullable();
    table.integer('approved_by').nullable().references('id').inTable('users').onDelete('SET NULL');
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });

  // 7. Monitoring Master Imports
  await knex.schema.createTable('monitoring_master_imports', (table) => {
    table.increments('id').primary();
    table.string('status', 50).notNullable(); // PREVIEWED, VALIDATION_FAILED, COMMITTED, ROLLED_BACK
    table.string('filename', 255).notNullable();
    table.string('file_hash', 255).notNullable();
    table.jsonb('coverage_report_json').nullable();
    table.integer('created_by').nullable().references('id').inTable('users').onDelete('SET NULL');
    table.timestamps(true, true);
  });

  // 8. Monitoring Master Import Rows
  await knex.schema.createTable('monitoring_master_import_rows', (table) => {
    table.increments('id').primary();
    table.integer('import_id').notNullable().references('id').inTable('monitoring_master_imports').onDelete('CASCADE');
    table.integer('row_number').notNullable();
    table.jsonb('raw_data_json').notNullable();
    table.jsonb('parsed_data_json').nullable();
    table.jsonb('validation_errors_json').nullable();
    table.boolean('is_valid').defaultTo(false);
    table.string('action_type', 50).nullable(); // INSERT, UPDATE, IGNORE
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('monitoring_master_import_rows');
  await knex.schema.dropTableIfExists('monitoring_master_imports');
  await knex.schema.dropTableIfExists('monitoring_deadline_overrides');
  await knex.schema.dropTableIfExists('monitoring_event_targets');
  await knex.schema.dropTableIfExists('monitoring_events');
  
  await knex.schema.alterTable('monitoring_items', (table) => {
    table.dropColumn('master_version');
    table.dropColumn('effective_to');
    table.dropColumn('effective_from');
    table.dropColumn('regulator_deadline_source');
    table.dropColumn('requires_change_event');
    table.dropColumn('requires_monthly_recap');
    table.dropColumn('requires_event_occurrence');
    table.dropForeign('frequency_rule_id');
    table.dropColumn('frequency_rule_id');
  });

  await knex.schema.dropTableIfExists('monitoring_frequency_rules');
  await knex.schema.dropTableIfExists('business_holidays');
  await knex.schema.dropTableIfExists('business_calendars');
};
