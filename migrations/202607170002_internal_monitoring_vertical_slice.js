exports.up = async function up(knex) {
  // 1. Alter monitoring_targets
  await knex.schema.alterTable('monitoring_targets', (table) => {
    table.string('natural_key', 255).notNullable().defaultTo(''); // Temporary default to allow adding notNullable
    table.jsonb('master_snapshot').notNullable().defaultTo('{}');
    table.jsonb('assignment_snapshot').notNullable().defaultTo('{}');
    table.string('workflow_status', 50).notNullable().defaultTo('NOT_STARTED');
    table.string('current_review_stage', 30).nullable();
    table.timestamp('submitted_at', { useTz: true }).nullable();
    table.timestamp('approved_at', { useTz: true }).nullable();
    // verified_at already exists in foundation
    table.timestamp('due_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.boolean('was_submitted_late').notNullable().defaultTo(false);
    table.integer('lock_version').notNullable().defaultTo(0);
    table.integer('created_by').nullable().references('id').inTable('users').onDelete('SET NULL');
    table.integer('updated_by').nullable().references('id').inTable('users').onDelete('SET NULL');

    table.unique(['natural_key']);
    table.index(['workflow_status', 'due_at']);
    table.index(['period_id', 'monitoring_item_id'], 'idx_targets_period_item');
  });

  // Remove the temporary default from natural_key if possible, or just leave it. Postgres sometimes requires dropping default.
  await knex.raw('ALTER TABLE monitoring_targets ALTER COLUMN natural_key DROP DEFAULT');
  
  await knex.raw(`
    ALTER TABLE monitoring_targets 
    ADD CONSTRAINT chk_workflow_status 
    CHECK (workflow_status IN (
      'NOT_STARTED', 'IN_PROGRESS', 'AWAITING_APPROVAL', 'AWAITING_VERIFICATION', 
      'REVISION_REQUIRED', 'VERIFIED', 'CANCELLED', 'NOT_APPLICABLE'
    ))
  `);

  // 2. monitoring_target_assignees
  await knex.schema.createTable('monitoring_target_assignees', (table) => {
    table.increments('id').primary();
    table.integer('monitoring_target_id').notNullable().references('id').inTable('monitoring_targets').onDelete('CASCADE');
    table.integer('user_id').notNullable().references('id').inTable('users').onDelete('RESTRICT');
    table.integer('position_id').nullable().references('id').inTable('positions').onDelete('RESTRICT');
    table.string('capability', 40).notNullable();
    table.boolean('is_primary').notNullable().defaultTo(false);
    table.integer('source_assignment_id').nullable();
    table.string('snapshot_name', 255).nullable();
    table.string('snapshot_position_name', 255).nullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

    table.unique(['monitoring_target_id', 'user_id', 'capability'], { indexName: 'uniq_target_assignees_user_cap' });
    table.index(['user_id', 'capability']);
  });

  // 3. monitoring_evidence_requirements
  await knex.schema.createTable('monitoring_evidence_requirements', (table) => {
    table.increments('id').primary();
    table.integer('monitoring_item_id').notNullable().references('id').inTable('monitoring_items').onDelete('CASCADE');
    table.string('code', 100).notNullable();
    table.string('label', 255).notNullable();
    table.string('evidence_type', 50).notNullable();
    table.boolean('is_required').notNullable().defaultTo(true);
    table.boolean('allows_multiple').notNullable().defaultTo(false);
    table.integer('sort_order').notNullable().defaultTo(0);
    table.jsonb('validation_config').nullable();
    table.timestamp('effective_from').nullable();
    table.timestamp('effective_to').nullable();
  });

  // 4. monitoring_evidences
  await knex.schema.createTable('monitoring_evidences', (table) => {
    table.increments('id').primary();
    table.integer('monitoring_target_id').notNullable().references('id').inTable('monitoring_targets').onDelete('CASCADE');
    table.integer('requirement_id').notNullable().references('id').inTable('monitoring_evidence_requirements').onDelete('RESTRICT');
    table.integer('version_no').notNullable();
    table.string('evidence_type', 50).notNullable();
    table.text('value_text').nullable();
    table.decimal('value_number', 18, 4).nullable();
    table.date('value_date').nullable();
    table.boolean('value_boolean').nullable();
    table.integer('file_submission_id').nullable().references('id').inTable('report_submissions').onDelete('SET NULL');
    table.integer('submitted_by').notNullable().references('id').inTable('users');
    table.string('evidence_status', 30).notNullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('superseded_at').nullable();

    table.unique(['monitoring_target_id', 'requirement_id', 'version_no'], { indexName: 'uniq_target_req_version' });
    table.index(['monitoring_target_id', 'evidence_status']);
  });

  // 5. monitoring_follow_ups
  await knex.schema.createTable('monitoring_follow_ups', (table) => {
    table.increments('id').primary();
    table.integer('monitoring_target_id').notNullable().references('id').inTable('monitoring_targets').onDelete('CASCADE');
    table.integer('verification_id').nullable().references('id').inTable('monitoring_target_verifications').onDelete('SET NULL');
    table.string('title', 255).notNullable();
    table.text('description').nullable();
    table.integer('owner_user_id').notNullable().references('id').inTable('users');
    table.timestamp('due_at').notNullable();
    table.string('status', 50).notNullable();
    table.text('resolution_note').nullable();
    table.timestamp('submitted_at').nullable();
    table.timestamp('closed_at').nullable();
    table.integer('created_by').nullable().references('id').inTable('users');
    table.timestamps(true, true); // created_at, updated_at

    table.index(['owner_user_id', 'status', 'due_at']);
  });

  // 6. Additional index on monitoring_target_activities
  await knex.schema.alterTable('monitoring_target_activities', (table) => {
    // The columns exist in foundation, but we need a compound index
    table.index(['monitoring_target_id', 'created_at'], 'idx_target_activities_target_created');
  });
};

exports.down = async function down(knex) {
  await knex.schema.alterTable('monitoring_target_activities', (table) => {
    table.dropIndex(['monitoring_target_id', 'created_at'], 'idx_target_activities_target_created');
  });

  await knex.schema.dropTableIfExists('monitoring_follow_ups');
  await knex.schema.dropTableIfExists('monitoring_evidences');
  await knex.schema.dropTableIfExists('monitoring_evidence_requirements');
  await knex.schema.dropTableIfExists('monitoring_target_assignees');

  await knex.raw('ALTER TABLE monitoring_targets DROP CONSTRAINT IF EXISTS chk_workflow_status');

  await knex.schema.alterTable('monitoring_targets', (table) => {
    table.dropIndex(['period_id', 'monitoring_item_id'], 'idx_targets_period_item');
    table.dropIndex(['workflow_status', 'due_at']);
    table.dropUnique(['natural_key']);

    table.dropColumn('updated_by');
    table.dropColumn('created_by');
    table.dropColumn('lock_version');
    table.dropColumn('was_submitted_late');
    table.dropColumn('due_at');
    table.dropColumn('approved_at');
    table.dropColumn('submitted_at');
    table.dropColumn('current_review_stage');
    table.dropColumn('workflow_status');
    table.dropColumn('assignment_snapshot');
    table.dropColumn('master_snapshot');
    table.dropColumn('natural_key');
  });
};
