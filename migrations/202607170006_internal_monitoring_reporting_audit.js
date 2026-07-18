/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  await knex.schema.createTable('monitoring_report_templates', (table) => {
    table.increments('id').primary();
    table.string('code', 100).notNullable().unique();
    table.string('name', 255).notNullable();
    table.string('report_type', 50).notNullable();
    table.string('scope_type', 50).notNullable();
    table.string('format', 50).notNullable();
    table.string('template_version', 20).notNullable().defaultTo('1.0');
    table.jsonb('config_json').nullable();
    table.boolean('is_active').notNullable().defaultTo(true);
    table.date('effective_from').nullable();
    table.date('effective_to').nullable();
    table.integer('created_by').nullable().references('id').inTable('users').onDelete('SET NULL');
    table.timestamps(true, true);

    table.index(['report_type']);
    table.index(['is_active']);
  });

  await knex.schema.createTable('monitoring_report_runs', (table) => {
    table.increments('id').primary();
    table.integer('template_id').notNullable().references('id').inTable('monitoring_report_templates').onDelete('RESTRICT');
    table.integer('requested_by').nullable().references('id').inTable('users').onDelete('SET NULL');
    table.string('scope_type', 50).notNullable();
    table.jsonb('scope_json').notNullable();
    table.jsonb('parameters_json').nullable();
    table.timestamp('snapshot_at').notNullable().defaultTo(knex.fn.now());
    table.string('status', 50).notNullable().defaultTo('QUEUED');
    table.integer('progress_percent').notNullable().defaultTo(0);
    table.string('idempotency_key', 255).nullable().unique();
    table.timestamp('started_at').nullable();
    table.timestamp('completed_at').nullable();
    table.timestamp('failed_at').nullable();
    table.string('failure_code', 100).nullable();
    table.text('failure_message').nullable();
    table.timestamps(true, true);

    table.index(['status']);
    table.index(['requested_by']);
    table.index(['snapshot_at']);
  });

  await knex.schema.createTable('monitoring_export_files', (table) => {
    table.increments('id').primary();
    table.integer('report_run_id').notNullable().references('id').inTable('monitoring_report_runs').onDelete('CASCADE');
    table.string('file_type', 50).notNullable();
    table.string('original_filename', 255).notNullable();
    table.string('object_key', 1024).notNullable();
    table.string('mime_type', 100).notNullable();
    table.bigInteger('size_bytes').notNullable().defaultTo(0);
    table.string('sha256', 64).nullable();
    table.timestamp('expires_at').nullable();
    table.timestamps(true, true);

    table.index(['report_run_id']);
    table.index(['expires_at']);
  });

  await knex.schema.createTable('monitoring_evidence_manifests', (table) => {
    table.increments('id').primary();
    table.integer('report_run_id').notNullable().references('id').inTable('monitoring_report_runs').onDelete('CASCADE');
    table.integer('target_id').notNullable(); // No FK to allow retention of metadata even if target deleted
    table.integer('evidence_id').nullable(); // Not enforcing FK
    table.integer('evidence_version_no').nullable();
    table.string('requirement_code', 100).notNullable();
    table.string('original_filename', 255).nullable();
    table.string('object_key', 1024).nullable();
    table.string('sha256', 64).nullable();
    table.boolean('included').notNullable().defaultTo(true);
    table.string('exclusion_reason', 255).nullable();
    table.jsonb('metadata_json').nullable();
    table.timestamps(true, true);

    table.index(['report_run_id']);
    table.index(['target_id']);
  });

  await knex.schema.createTable('monitoring_audit_seals', (table) => {
    table.increments('id').primary();
    table.string('aggregate_type', 50).notNullable(); // e.g. 'REPORT_RUN'
    table.integer('aggregate_id').notNullable();
    table.timestamp('snapshot_at').notNullable();
    table.integer('record_count').notNullable();
    table.string('root_hash', 64).notNullable();
    table.string('algorithm', 20).notNullable().defaultTo('SHA256');
    table.string('previous_seal_hash', 64).nullable();
    table.integer('created_by').nullable().references('id').inTable('users').onDelete('SET NULL');
    table.timestamps(true, true);

    table.index(['aggregate_type', 'aggregate_id']);
    table.index(['root_hash']);
  });

  await knex.schema.createTable('monitoring_retention_policies', (table) => {
    table.increments('id').primary();
    table.string('code', 100).notNullable().unique();
    table.string('name', 255).notNullable();
    table.string('scope_type', 50).notNullable(); // e.g., 'REPORT', 'EVIDENCE'
    table.integer('retention_days').notNullable();
    table.integer('archive_after_days').nullable();
    table.integer('delete_after_days').nullable();
    table.boolean('legal_hold_supported').notNullable().defaultTo(true);
    table.boolean('is_active').notNullable().defaultTo(true);
    table.date('effective_from').nullable();
    table.date('effective_to').nullable();
    table.timestamps(true, true);
  });

  await knex.schema.createTable('monitoring_legal_holds', (table) => {
    table.increments('id').primary();
    table.string('scope_type', 50).notNullable();
    table.string('scope_id', 255).notNullable();
    table.string('reason', 500).notNullable();
    table.string('reference_number', 100).nullable();
    table.timestamp('started_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('ended_at').nullable();
    table.integer('created_by').nullable().references('id').inTable('users').onDelete('SET NULL');
    table.timestamps(true, true);

    table.index(['scope_type', 'scope_id']);
    table.index(['ended_at']);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('monitoring_legal_holds');
  await knex.schema.dropTableIfExists('monitoring_retention_policies');
  await knex.schema.dropTableIfExists('monitoring_audit_seals');
  await knex.schema.dropTableIfExists('monitoring_evidence_manifests');
  await knex.schema.dropTableIfExists('monitoring_export_files');
  await knex.schema.dropTableIfExists('monitoring_report_runs');
  await knex.schema.dropTableIfExists('monitoring_report_templates');
};
