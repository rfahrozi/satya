/**
 * Migration 202607170009 - Master Engine Schema
 */

exports.up = async function(knex) {
  const hasMasterVersions = await knex.schema.hasTable('monitoring_master_versions');
  if (!hasMasterVersions) {
    await knex.schema.createTable('monitoring_master_versions', (table) => {
      table.increments('id').primary();
      table.string('version_code').notNullable();
      table.string('source_name').notNullable();
      table.string('source_hash').notNullable();
      table.date('effective_from').notNullable();
      table.date('effective_to');
      table.string('status').notNullable().defaultTo('DRAFT');
      table.integer('created_by').unsigned().references('id').inTable('users');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('committed_at');
    });
  }

  await knex.schema.alterTable('monitoring_items', (table) => {
    table.integer('package_id').nullable().alter();
  });

  const hasMasterVersionId = await knex.schema.hasColumn('monitoring_items', 'master_version_id');
  const hasTitle = await knex.schema.hasColumn('monitoring_items', 'title');
  const hasDutyCluster = await knex.schema.hasColumn('monitoring_items', 'duty_cluster');
  const hasFrequencyType = await knex.schema.hasColumn('monitoring_items', 'frequency_type');
  const hasNormalizationType = await knex.schema.hasColumn('monitoring_items', 'normalization_type');
  const hasFrequencyConfig = await knex.schema.hasColumn('monitoring_items', 'frequency_config_json');
  const hasDeadlineConfig = await knex.schema.hasColumn('monitoring_items', 'deadline_config_json');
  const hasEvidenceSummary = await knex.schema.hasColumn('monitoring_items', 'evidence_summary');

  await knex.schema.alterTable('monitoring_items', (table) => {
    if (!hasMasterVersionId) {
      table.integer('master_version_id').unsigned().references('id').inTable('monitoring_master_versions');
      table.unique(['master_version_id', 'item_code']);
    }
    if (!hasTitle) table.string('title', 255);
    if (!hasDutyCluster) table.string('duty_cluster', 255);
    if (!hasFrequencyType) table.string('frequency_type', 100);
    if (!hasNormalizationType) table.string('normalization_type');
    if (!hasFrequencyConfig) table.string('frequency_config_json', 10000);
    if (!hasDeadlineConfig) table.string('deadline_config_json', 10000);
    if (!hasEvidenceSummary) table.string('evidence_summary', 10000);
  });

  const hasSourceAssessments = await knex.schema.hasTable('monitoring_source_assessments');
  if (!hasSourceAssessments) {
    await knex.schema.createTable('monitoring_source_assessments', (table) => {
      table.increments('id').primary();
      table.string('code').notNullable().unique();
      table.string('name').notNullable();
      table.string('description');
    });
  }

  const hasSourceCriteria = await knex.schema.hasTable('monitoring_source_criteria');
  if (!hasSourceCriteria) {
    await knex.schema.createTable('monitoring_source_criteria', (table) => {
      table.increments('id').primary();
      table.integer('assessment_id').unsigned().references('id').inTable('monitoring_source_assessments');
      table.string('criterion_code').notNullable();
      table.text('criterion_text');
      table.boolean('parameterized').defaultTo(false);
      table.date('effective_from');
      table.date('effective_to');
      table.unique(['assessment_id', 'criterion_code', 'effective_from']);
    });
  }

  const hasItemCriteria = await knex.schema.hasTable('monitoring_item_criteria');
  if (!hasItemCriteria) {
    await knex.schema.createTable('monitoring_item_criteria', (table) => {
      table.increments('id').primary();
      table.integer('monitoring_item_id').unsigned().references('id').inTable('monitoring_items');
      table.integer('source_criterion_id').unsigned().references('id').inTable('monitoring_source_criteria');
      table.boolean('is_primary').defaultTo(false);
      table.integer('sort_order').defaultTo(1);
      table.unique(['monitoring_item_id', 'source_criterion_id']);
    });
  }

  const hasItemParameters = await knex.schema.hasTable('monitoring_item_parameters');
  if (!hasItemParameters) {
    await knex.schema.createTable('monitoring_item_parameters', (table) => {
      table.increments('id').primary();
      table.integer('monitoring_item_id').unsigned().references('id').inTable('monitoring_items');
      table.integer('source_criterion_id').unsigned().references('id').inTable('monitoring_source_criteria');
      table.string('parameter_code').notNullable();
      table.string('label').notNullable();
      table.string('data_type').notNullable(); // INTEGER, DECIMAL, PERCENTAGE, BOOLEAN, DATE, TEXT, ENUM
      table.string('unit');
      table.string('formula_json', 10000);
      table.string('validation_json', 10000);
      table.boolean('required').defaultTo(true);
      table.integer('sort_order').defaultTo(1);
    });
  }

  const hasItemRegulations = await knex.schema.hasTable('monitoring_item_regulations');
  if (!hasItemRegulations) {
    await knex.schema.createTable('monitoring_item_regulations', (table) => {
      table.increments('id').primary();
      table.integer('monitoring_item_id').unsigned().references('id').inTable('monitoring_items');
      table.string('regulation_code').notNullable();
      table.string('title').notNullable();
      table.string('source_url', 10000);
      table.date('effective_from');
      table.date('effective_to');
      table.boolean('is_deadline_authority').defaultTo(false);
      table.integer('sort_order').defaultTo(1);
    });
  }

  const hasTemplates = await knex.schema.hasTable('monitoring_evidence_requirement_templates');
  if (!hasTemplates) {
    await knex.schema.createTable('monitoring_evidence_requirement_templates', (table) => {
      table.increments('id').primary();
      table.integer('monitoring_item_id').unsigned().references('id').inTable('monitoring_items');
      table.string('requirement_code').notNullable();
      table.string('label').notNullable();
      table.text('description');
      table.string('evidence_type').notNullable(); // FILE, URL, TEXT, NUMBER, DATE, BOOLEAN
      table.boolean('required').defaultTo(true);
      table.boolean('allows_multiple').defaultTo(false);
      table.string('validation_json', 10000);
      table.integer('sort_order').defaultTo(1);
    });
  }

  const hasRequirementCriteria = await knex.schema.hasTable('monitoring_requirement_criteria');
  if (!hasRequirementCriteria) {
    await knex.schema.createTable('monitoring_requirement_criteria', (table) => {
      table.increments('id').primary();
      table.integer('requirement_template_id').unsigned().references('id').inTable('monitoring_evidence_requirement_templates');
      table.integer('source_criterion_id').unsigned().references('id').inTable('monitoring_source_criteria');
    });
  }

  const hasParamValues = await knex.schema.hasTable('monitoring_target_parameter_values');
  if (!hasParamValues) {
    await knex.schema.createTable('monitoring_target_parameter_values', (table) => {
      table.increments('id').primary();
      table.integer('monitoring_target_id').unsigned().references('id').inTable('monitoring_targets');
      table.integer('parameter_id').unsigned().references('id').inTable('monitoring_item_parameters');
      table.text('value_text');
      table.decimal('value_number', 19, 4);
      table.boolean('value_boolean');
      table.date('value_date');
      table.integer('version_no').defaultTo(1);
      table.string('status').notNullable().defaultTo('DRAFT');
      table.integer('submitted_by').unsigned().references('id').inTable('users');
      table.timestamp('submitted_at');
      table.timestamp('created_at').defaultTo(knex.fn.now());
    });
  }

  const hasTargetRelations = await knex.schema.hasTable('monitoring_target_relations');
  if (!hasTargetRelations) {
    await knex.schema.createTable('monitoring_target_relations', (table) => {
      table.increments('id').primary();
      table.integer('parent_target_id').unsigned().references('id').inTable('monitoring_targets');
      table.integer('child_target_id').unsigned().references('id').inTable('monitoring_targets');
      table.string('relation_type').notNullable(); // EVENT_CHILD, MONTHLY_RECAP, CHANGE_CHILD, CONTINUOUS_REVIEW
    });
  }

  const hasRegulatorCalendars = await knex.schema.hasTable('regulator_deadline_calendars');
  if (!hasRegulatorCalendars) {
    await knex.schema.createTable('regulator_deadline_calendars', (table) => {
      table.increments('id').primary();
      table.integer('monitoring_item_id').unsigned().references('id').inTable('monitoring_items');
      table.integer('year').notNullable();
      table.date('deadline_date').notNullable();
      table.unique(['monitoring_item_id', 'year']);
    });
  }
};

exports.down = async function(knex) {
  await knex.schema
    .dropTableIfExists('regulator_deadline_calendars')
    .dropTableIfExists('monitoring_target_relations')
    .dropTableIfExists('monitoring_target_parameter_values')
    .dropTableIfExists('monitoring_requirement_criteria')
    .dropTableIfExists('monitoring_evidence_requirement_templates')
    .dropTableIfExists('monitoring_item_regulations')
    .dropTableIfExists('monitoring_item_parameters')
    .dropTableIfExists('monitoring_item_criteria')
    .dropTableIfExists('monitoring_source_criteria')
    .dropTableIfExists('monitoring_source_assessments');

  const hasMasterVersionId = await knex.schema.hasColumn('monitoring_items', 'master_version_id');
  if (hasMasterVersionId) {
    await knex.schema.alterTable('monitoring_items', (table) => {
      table.dropUnique(['master_version_id', 'item_code']);
      table.dropColumn('title');
      table.dropColumn('duty_cluster');
      table.dropColumn('frequency_type');
      table.dropColumn('evidence_summary');
      table.dropColumn('deadline_config_json');
      table.dropColumn('frequency_config_json');
      table.dropColumn('normalization_type');
      table.dropForeign('master_version_id');
      table.dropColumn('master_version_id');
    });
  }

  await knex.schema.dropTableIfExists('monitoring_master_versions');
};
