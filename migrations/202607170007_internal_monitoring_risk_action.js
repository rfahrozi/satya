/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  await knex.schema.createTable('monitoring_findings', (table) => {
    table.increments('id').primary();
    table.string('finding_code', 100).notNullable().unique();
    table.integer('monitoring_target_id').notNullable().references('id').inTable('monitoring_targets').onDelete('CASCADE');
    table.integer('verification_id').nullable();
    table.integer('follow_up_id').nullable();
    table.string('title', 255).notNullable();
    table.text('description').notNullable();
    table.string('finding_type', 50).notNullable();
    table.string('severity', 20).notNullable();
    table.string('root_cause_category', 50).nullable();
    table.text('root_cause_description').nullable();
    table.string('status', 50).notNullable().defaultTo('OPEN');
    table.integer('identified_by').notNullable().references('id').inTable('users').onDelete('RESTRICT');
    table.timestamp('identified_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('closed_at').nullable();
    table.timestamps(true, true);

    table.index(['monitoring_target_id']);
    table.index(['status']);
  });

  await knex.schema.createTable('monitoring_risks', (table) => {
    table.increments('id').primary();
    table.string('risk_code', 100).notNullable().unique();
    table.string('title', 255).notNullable();
    table.text('description').notNullable();
    table.string('risk_category', 50).notNullable();
    table.string('source_type', 50).notNullable();
    table.integer('source_id').notNullable();
    
    table.integer('inherent_likelihood').notNullable();
    table.integer('inherent_impact').notNullable();
    table.integer('inherent_score').notNullable();
    
    table.string('control_effectiveness', 50).notNullable().defaultTo('NOT_ASSESSED');
    
    table.integer('residual_likelihood').nullable();
    table.integer('residual_impact').nullable();
    table.integer('residual_score').nullable();
    
    table.string('risk_level', 20).notNullable();
    
    table.integer('risk_owner_user_id').nullable().references('id').inTable('users').onDelete('SET NULL');
    table.integer('risk_owner_position_id').nullable(); // Not enforcing FK on position for now
    
    table.string('status', 50).notNullable().defaultTo('OPEN');
    table.timestamp('review_due_at').nullable();
    
    table.text('accepted_reason').nullable();
    table.integer('accepted_by').nullable().references('id').inTable('users').onDelete('SET NULL');
    table.timestamp('accepted_at').nullable();
    
    table.timestamps(true, true);

    table.index(['status']);
    table.index(['risk_owner_user_id']);
  });

  await knex.schema.createTable('monitoring_risk_links', (table) => {
    table.increments('id').primary();
    table.integer('risk_id').notNullable().references('id').inTable('monitoring_risks').onDelete('CASCADE');
    table.integer('finding_id').nullable().references('id').inTable('monitoring_findings').onDelete('CASCADE');
    table.integer('target_id').nullable().references('id').inTable('monitoring_targets').onDelete('CASCADE');
    table.integer('follow_up_id').nullable();
    table.integer('action_plan_id').nullable(); // Added later
    table.string('relationship_type', 50).notNullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('monitoring_action_plans', (table) => {
    table.increments('id').primary();
    table.string('action_code', 100).notNullable().unique();
    table.integer('risk_id').nullable().references('id').inTable('monitoring_risks').onDelete('CASCADE');
    table.integer('finding_id').nullable().references('id').inTable('monitoring_findings').onDelete('CASCADE');
    table.string('title', 255).notNullable();
    table.text('description').notNullable();
    table.string('action_type', 50).notNullable();
    
    table.integer('owner_user_id').notNullable().references('id').inTable('users').onDelete('RESTRICT');
    table.integer('approver_user_id').nullable().references('id').inTable('users').onDelete('SET NULL');
    
    table.timestamp('start_at').notNullable();
    table.timestamp('due_at').notNullable();
    table.string('priority', 20).notNullable().defaultTo('MEDIUM');
    table.string('status', 50).notNullable().defaultTo('DRAFT');
    
    table.integer('progress_percent').notNullable().defaultTo(0);
    table.text('expected_outcome').notNullable();
    table.text('completion_note').nullable();
    
    table.timestamp('submitted_at').nullable();
    table.timestamp('approved_at').nullable();
    table.timestamp('completed_at').nullable();
    table.timestamp('verified_at').nullable();
    
    table.integer('created_by').notNullable().references('id').inTable('users').onDelete('RESTRICT');
    table.timestamps(true, true);
    table.integer('lock_version').notNullable().defaultTo(1);
    
    table.index(['status']);
    table.index(['owner_user_id']);
  });
  
  // Alter monitoring_risk_links to add foreign key to action_plans
  await knex.schema.alterTable('monitoring_risk_links', table => {
    table.foreign('action_plan_id').references('id').inTable('monitoring_action_plans').onDelete('CASCADE');
  });

  await knex.schema.createTable('monitoring_action_milestones', (table) => {
    table.increments('id').primary();
    table.integer('action_plan_id').notNullable().references('id').inTable('monitoring_action_plans').onDelete('CASCADE');
    table.string('title', 255).notNullable();
    table.text('description').nullable();
    table.integer('owner_user_id').notNullable().references('id').inTable('users').onDelete('RESTRICT');
    table.timestamp('due_at').notNullable();
    table.string('status', 50).notNullable().defaultTo('NOT_STARTED');
    table.timestamp('completed_at').nullable();
    table.integer('sort_order').notNullable().defaultTo(0);
    table.timestamps(true, true);
  });

  await knex.schema.createTable('monitoring_action_evidence', (table) => {
    table.increments('id').primary();
    table.integer('action_plan_id').notNullable().references('id').inTable('monitoring_action_plans').onDelete('CASCADE');
    table.integer('milestone_id').nullable().references('id').inTable('monitoring_action_milestones').onDelete('CASCADE');
    table.integer('evidence_id').nullable(); // Link to standard evidence if reused
    table.string('file_object_key', 1024).nullable();
    table.string('evidence_type', 50).notNullable(); // 'FILE', 'TEXT', 'URL'
    table.text('value_text').nullable();
    table.integer('version_no').notNullable().defaultTo(1);
    table.string('status', 20).notNullable().defaultTo('ACTIVE');
    table.integer('submitted_by').notNullable().references('id').inTable('users').onDelete('RESTRICT');
    table.timestamp('submitted_at').notNullable().defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('monitoring_effectiveness_reviews', (table) => {
    table.increments('id').primary();
    table.integer('action_plan_id').notNullable().references('id').inTable('monitoring_action_plans').onDelete('CASCADE');
    table.integer('reviewer_user_id').notNullable().references('id').inTable('users').onDelete('RESTRICT');
    table.string('review_method', 100).notNullable();
    table.text('review_note').notNullable();
    table.string('result', 50).notNullable();
    table.integer('residual_risk_before').nullable();
    table.integer('residual_risk_after').nullable();
    table.jsonb('reviewed_evidence_json').notNullable();
    table.timestamp('reviewed_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('monitoring_management_reviews', (table) => {
    table.increments('id').primary();
    table.string('review_code', 100).notNullable().unique();
    table.integer('period_id').nullable(); 
    table.string('scope_type', 50).notNullable();
    table.jsonb('scope_json').notNullable();
    table.date('review_date').notNullable();
    table.integer('chair_user_id').notNullable().references('id').inTable('users').onDelete('RESTRICT');
    table.string('status', 50).notNullable().defaultTo('DRAFT');
    table.text('summary').nullable();
    table.jsonb('decision_json').nullable();
    table.integer('created_by').notNullable().references('id').inTable('users').onDelete('RESTRICT');
    table.timestamps(true, true);
  });

  await knex.schema.createTable('monitoring_management_review_items', (table) => {
    table.increments('id').primary();
    table.integer('management_review_id').notNullable().references('id').inTable('monitoring_management_reviews').onDelete('CASCADE');
    table.string('item_type', 50).notNullable(); // 'RISK', 'FINDING', 'ACTION_PLAN'
    table.integer('item_id').notNullable();
    table.string('decision', 50).notNullable();
    table.text('decision_note').notNullable();
    table.integer('assigned_to').nullable().references('id').inTable('users').onDelete('SET NULL');
    table.timestamp('due_at').nullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('monitoring_management_review_items');
  await knex.schema.dropTableIfExists('monitoring_management_reviews');
  await knex.schema.dropTableIfExists('monitoring_effectiveness_reviews');
  await knex.schema.dropTableIfExists('monitoring_action_evidence');
  await knex.schema.dropTableIfExists('monitoring_action_milestones');
  await knex.schema.alterTable('monitoring_risk_links', table => {
    table.dropForeign('action_plan_id');
  });
  await knex.schema.dropTableIfExists('monitoring_action_plans');
  await knex.schema.dropTableIfExists('monitoring_risk_links');
  await knex.schema.dropTableIfExists('monitoring_risks');
  await knex.schema.dropTableIfExists('monitoring_findings');
};
