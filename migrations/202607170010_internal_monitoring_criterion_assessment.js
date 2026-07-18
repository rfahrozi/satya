exports.up = async function(knex) {
  // 1. monitoring_target_criteria
  if (!(await knex.schema.hasTable('monitoring_target_criteria'))) {
    await knex.schema.createTable('monitoring_target_criteria', (table) => {
      table.increments('id').primary();
      table.integer('monitoring_target_id').notNullable().references('id').inTable('monitoring_targets').onDelete('CASCADE');
      table.integer('source_criterion_id').nullable().references('id').inTable('monitoring_source_criteria').onDelete('SET NULL');
      table.string('criterion_code', 50).notNullable();
      table.text('criterion_text').notNullable();
      table.string('assessment_code', 50).nullable();
      table.boolean('is_required').defaultTo(true);
      table.decimal('weight', 5, 2).defaultTo(1.0);
      table.integer('sort_order').defaultTo(0);
      table.jsonb('snapshot_json').nullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.unique(['monitoring_target_id', 'assessment_code', 'criterion_code'], { indexName: 'idx_unique_target_criteria' });
    });
  }

  // 2. monitoring_criterion_assessments
  if (!(await knex.schema.hasTable('monitoring_criterion_assessments'))) {
    await knex.schema.createTable('monitoring_criterion_assessments', (table) => {
      table.increments('id').primary();
      table.integer('target_criterion_id').notNullable().references('id').inTable('monitoring_target_criteria').onDelete('CASCADE');
      table.integer('assessment_cycle_no').notNullable().defaultTo(1);
      table.string('status', 50).notNullable().defaultTo('NOT_ASSESSED'); // NOT_ASSESSED, MET, PARTIALLY_MET, NOT_MET, NOT_APPLICABLE
      table.decimal('score', 5, 2).nullable();
      table.text('review_note').nullable();
      table.integer('reviewer_user_id').nullable().references('id').inTable('users').onDelete('SET NULL');
      table.jsonb('reviewer_position_snapshot').nullable();
      table.jsonb('reviewed_evidence_versions_json').nullable();
      table.jsonb('reviewed_parameter_versions_json').nullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
    });
  }

  // 3. monitoring_criterion_evidence_links
  if (!(await knex.schema.hasTable('monitoring_criterion_evidence_links'))) {
    await knex.schema.createTable('monitoring_criterion_evidence_links', (table) => {
      table.increments('id').primary();
      table.integer('target_criterion_id').notNullable().references('id').inTable('monitoring_target_criteria').onDelete('CASCADE');
      table.integer('evidence_id').notNullable().references('id').inTable('monitoring_evidences').onDelete('CASCADE');
      table.integer('evidence_version_no').notNullable();
      table.string('link_type', 50).notNullable().defaultTo('PRIMARY'); // PRIMARY, SUPPORTING, CONTRADICTING
      table.integer('created_by').nullable().references('id').inTable('users').onDelete('SET NULL');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.unique(['target_criterion_id', 'evidence_id'], { indexName: 'idx_unique_target_criterion_evidence' });
    });
  }

  // 4. monitoring_criterion_parameter_links
  if (!(await knex.schema.hasTable('monitoring_criterion_parameter_links'))) {
    await knex.schema.createTable('monitoring_criterion_parameter_links', (table) => {
      table.increments('id').primary();
      table.integer('target_criterion_id').notNullable().references('id').inTable('monitoring_target_criteria').onDelete('CASCADE');
      table.integer('target_parameter_value_id').notNullable().references('id').inTable('monitoring_target_parameter_values').onDelete('CASCADE');
      table.integer('parameter_version_no').notNullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.unique(['target_criterion_id', 'target_parameter_value_id'], { indexName: 'idx_unique_target_criterion_parameter' });
    });
  }

  // 5. monitoring_target_assessment_summaries
  if (!(await knex.schema.hasTable('monitoring_target_assessment_summaries'))) {
    await knex.schema.createTable('monitoring_target_assessment_summaries', (table) => {
      table.increments('id').primary();
      table.integer('monitoring_target_id').notNullable().references('id').inTable('monitoring_targets').onDelete('CASCADE');
      table.integer('assessment_cycle_no').notNullable().defaultTo(1);
      table.integer('required_criterion_count').notNullable().defaultTo(0);
      table.integer('assessed_criterion_count').notNullable().defaultTo(0);
      table.integer('met_count').notNullable().defaultTo(0);
      table.integer('partially_met_count').notNullable().defaultTo(0);
      table.integer('not_met_count').notNullable().defaultTo(0);
      table.integer('not_applicable_count').notNullable().defaultTo(0);
      table.decimal('weighted_score', 8, 2).defaultTo(0);
      table.decimal('compliance_percentage', 5, 2).defaultTo(0);
      table.string('decision', 50).nullable(); // COMPLIANT, PARTIALLY_COMPLIANT, NON_COMPLIANT, NOT_APPLICABLE
      table.integer('created_by').nullable().references('id').inTable('users').onDelete('SET NULL');
      table.timestamp('created_at').defaultTo(knex.fn.now());
    });
  }

  // 6. monitoring_assessment_findings
  if (!(await knex.schema.hasTable('monitoring_assessment_findings'))) {
    await knex.schema.createTable('monitoring_assessment_findings', (table) => {
      table.increments('id').primary();
      table.integer('criterion_assessment_id').notNullable().references('id').inTable('monitoring_criterion_assessments').onDelete('CASCADE');
      table.integer('finding_id').notNullable().references('id').inTable('monitoring_findings').onDelete('CASCADE');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.unique(['criterion_assessment_id', 'finding_id'], { indexName: 'idx_unique_assessment_finding' });
    });
  }

  // 7. Alter monitoring_target_verifications
  if (await knex.schema.hasTable('monitoring_target_verifications')) {
    const hasSummaryId = await knex.schema.hasColumn('monitoring_target_verifications', 'assessment_summary_id');
    if (!hasSummaryId) {
      await knex.schema.alterTable('monitoring_target_verifications', (table) => {
        table.integer('assessment_summary_id').nullable().references('id').inTable('monitoring_target_assessment_summaries').onDelete('SET NULL');
        table.string('decision', 50).nullable();
        table.integer('verified_criterion_count').nullable();
        table.jsonb('verification_snapshot_json').nullable();
      });
    }
  }
};

exports.down = async function(knex) {
  // Alter monitoring_target_verifications
  if (await knex.schema.hasTable('monitoring_target_verifications')) {
    const hasSummaryId = await knex.schema.hasColumn('monitoring_target_verifications', 'assessment_summary_id');
    if (hasSummaryId) {
      await knex.schema.alterTable('monitoring_target_verifications', (table) => {
        table.dropColumn('assessment_summary_id');
        table.dropColumn('decision');
        table.dropColumn('verified_criterion_count');
        table.dropColumn('verification_snapshot_json');
      });
    }
  }

  await knex.schema.dropTableIfExists('monitoring_assessment_findings');
  await knex.schema.dropTableIfExists('monitoring_target_assessment_summaries');
  await knex.schema.dropTableIfExists('monitoring_criterion_parameter_links');
  await knex.schema.dropTableIfExists('monitoring_criterion_evidence_links');
  await knex.schema.dropTableIfExists('monitoring_criterion_assessments');
  await knex.schema.dropTableIfExists('monitoring_target_criteria');
};
