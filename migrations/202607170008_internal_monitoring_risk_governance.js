/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  await knex.schema.alterTable('monitoring_management_reviews', (table) => {
    table.string('title', 255).notNullable().defaultTo('Review');
    table.integer('version_no').notNullable().defaultTo(1);
    table.integer('supersedes_review_id').nullable().references('id').inTable('monitoring_management_reviews').onDelete('SET NULL');
    table.timestamp('finalized_at').nullable();
    table.integer('finalized_by').nullable().references('id').inTable('users').onDelete('RESTRICT');
    table.integer('lock_version').notNullable().defaultTo(1);
  });

  await knex.schema.alterTable('monitoring_management_review_items', (table) => {
    table.jsonb('snapshot_json').nullable();
    table.string('status', 50).notNullable().defaultTo('OPEN');
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('monitoring_risk_acceptances', (table) => {
    table.increments('id').primary();
    table.integer('risk_id').notNullable().references('id').inTable('monitoring_risks').onDelete('CASCADE');
    table.string('accepted_level', 20).notNullable();
    table.integer('accepted_score').notNullable();
    table.text('accepted_reason').notNullable();
    table.string('authority_level', 50).notNullable();
    table.integer('accepted_by').notNullable().references('id').inTable('users').onDelete('RESTRICT');
    table.timestamp('accepted_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('valid_until').nullable();
    table.timestamp('review_due_at').nullable();
    table.string('status', 50).notNullable().defaultTo('ACTIVE'); // ACTIVE, EXPIRED, REVOKED, SUPERSEDED
    table.timestamp('revoked_at').nullable();
    table.integer('revoked_by').nullable().references('id').inTable('users').onDelete('SET NULL');
    table.text('revoke_reason').nullable();
    table.timestamps(true, true);
    
    table.index(['risk_id']);
    table.index(['status']);
  });

  await knex.schema.createTable('monitoring_repeat_finding_candidates', (table) => {
    table.increments('id').primary();
    table.integer('finding_id').notNullable().references('id').inTable('monitoring_findings').onDelete('CASCADE');
    table.integer('matched_finding_id').notNullable().references('id').inTable('monitoring_findings').onDelete('CASCADE');
    table.integer('match_score').notNullable();
    table.jsonb('match_reasons_json').notNullable(); // Array of reasons
    table.string('status', 50).notNullable().defaultTo('PENDING_REVIEW'); // PENDING_REVIEW, CONFIRMED, REJECTED, MERGED
    table.integer('reviewed_by').nullable().references('id').inTable('users').onDelete('SET NULL');
    table.timestamp('reviewed_at').nullable();
    table.text('review_note').nullable();
    table.timestamps(true, true);
    
    table.unique(['finding_id', 'matched_finding_id']);
    table.index(['status']);
  });

  await knex.schema.createTable('monitoring_risk_snapshots', (table) => {
    table.increments('id').primary();
    table.integer('risk_id').notNullable().references('id').inTable('monitoring_risks').onDelete('CASCADE');
    table.timestamp('snapshot_at').notNullable().defaultTo(knex.fn.now());
    table.integer('inherent_score').notNullable();
    table.integer('residual_score').nullable();
    table.string('risk_level', 20).notNullable();
    table.string('status', 50).notNullable();
    table.integer('open_action_count').notNullable().defaultTo(0);
    table.integer('overdue_action_count').notNullable().defaultTo(0);
    table.integer('open_finding_count').notNullable().defaultTo(0);
    table.jsonb('metadata_json').nullable();
    table.timestamps(true, true);
    
    table.index(['risk_id']);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('monitoring_risk_snapshots');
  await knex.schema.dropTableIfExists('monitoring_repeat_finding_candidates');
  await knex.schema.dropTableIfExists('monitoring_risk_acceptances');

  await knex.schema.alterTable('monitoring_management_review_items', (table) => {
    table.dropColumn('snapshot_json');
    table.dropColumn('status');
    table.dropColumn('updated_at');
  });

  await knex.schema.alterTable('monitoring_management_reviews', (table) => {
    table.dropColumn('title');
    table.dropColumn('version_no');
    table.dropForeign('supersedes_review_id');
    table.dropColumn('supersedes_review_id');
    table.dropColumn('finalized_at');
    table.dropForeign('finalized_by');
    table.dropColumn('finalized_by');
    table.dropColumn('lock_version');
  });
};
