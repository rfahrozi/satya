async function createInternalUnits(knex) {
  const exists = await knex.schema.hasTable('internal_units');
  if (exists) return;

  await knex.schema.createTable('internal_units', (table) => {
    table.increments('id').primary();
    table.string('code', 100).notNullable().unique();
    table.string('name', 255).notNullable();
    table.integer('parent_id').nullable();
    table.string('unit_type', 50).notNullable().defaultTo('OTHER');
    table.boolean('is_active').notNullable().defaultTo(true);
    table.timestamps(true, true);

    table.index(['code']);
    table.index(['unit_type']);
    table.index(['is_active']);
  });
}

async function createPositions(knex) {
  const exists = await knex.schema.hasTable('positions');
  if (exists) return;

  await knex.schema.createTable('positions', (table) => {
    table.increments('id').primary();
    table.string('code', 100).notNullable().unique();
    table.string('name', 255).notNullable();
    table.string('level', 50).nullable();
    table.boolean('is_active').notNullable().defaultTo(true);
    table.timestamps(true, true);

    table.index(['code']);
    table.index(['is_active']);
  });
}

async function createInternalAssignments(knex) {
  const exists = await knex.schema.hasTable('internal_assignments');
  if (exists) return;

  await knex.schema.createTable('internal_assignments', (table) => {
    table.increments('id').primary();
    table.integer('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.integer('internal_unit_id').nullable().references('id').inTable('internal_units').onDelete('SET NULL');
    table.integer('position_id').nullable().references('id').inTable('positions').onDelete('SET NULL');
    table.string('role_scope', 50).notNullable().defaultTo('UNIT_PIC');
    table.boolean('is_primary').notNullable().defaultTo(false);
    table.boolean('is_active').notNullable().defaultTo(true);
    table.timestamps(true, true);

    table.index(['user_id']);
    table.index(['internal_unit_id']);
    table.index(['position_id']);
    table.index(['role_scope']);
    table.index(['is_active']);
  });
}

async function createMonitoringPackages(knex) {
  const exists = await knex.schema.hasTable('monitoring_packages');
  if (exists) return;

  await knex.schema.createTable('monitoring_packages', (table) => {
    table.increments('id').primary();
    table.string('code', 100).notNullable().unique();
    table.string('name', 255).notNullable();
    table.text('description').nullable();
    table.integer('sort_order').notNullable().defaultTo(0);
    table.boolean('is_active').notNullable().defaultTo(true);
    table.timestamps(true, true);

    table.index(['sort_order']);
    table.index(['is_active']);
  });
}

async function createMonitoringItems(knex) {
  const exists = await knex.schema.hasTable('monitoring_items');
  if (exists) return;

  await knex.schema.createTable('monitoring_items', (table) => {
    table.increments('id').primary();
    table.integer('package_id').notNullable().references('id').inTable('monitoring_packages').onDelete('CASCADE');
    table.string('item_code', 100).notNullable().unique();
    table.string('title', 255).notNullable();
    table.text('description').nullable();
    table.string('frequency_type', 50).notNullable().defaultTo('MONTHLY');
    table.jsonb('deadline_rule').nullable();
    table.jsonb('required_file_types').nullable();
    table.boolean('verification_required').notNullable().defaultTo(true);
    table.boolean('scoring_enabled').notNullable().defaultTo(false);
    table.boolean('is_active').notNullable().defaultTo(true);
    table.timestamps(true, true);

    table.index(['package_id']);
    table.index(['frequency_type']);
    table.index(['is_active']);
  });
}

async function createMonitoringItemAssignments(knex) {
  const exists = await knex.schema.hasTable('monitoring_item_assignments');
  if (exists) return;

  await knex.schema.createTable('monitoring_item_assignments', (table) => {
    table.increments('id').primary();
    table.integer('monitoring_item_id').notNullable().references('id').inTable('monitoring_items').onDelete('CASCADE');
    table.integer('internal_unit_id').nullable().references('id').inTable('internal_units').onDelete('SET NULL');
    table.integer('position_id').nullable().references('id').inTable('positions').onDelete('SET NULL');
    table.string('responsibility_type', 50).notNullable().defaultTo('PRIMARY');
    table.integer('sla_days').nullable();
    table.text('notes').nullable();
    table.boolean('is_active').notNullable().defaultTo(true);
    table.timestamps(true, true);

    table.index(['monitoring_item_id']);
    table.index(['internal_unit_id']);
    table.index(['position_id']);
    table.index(['responsibility_type']);
    table.index(['is_active']);
  });
}

async function createMonitoringPeriods(knex) {
  const exists = await knex.schema.hasTable('monitoring_periods');
  if (exists) return;

  await knex.schema.createTable('monitoring_periods', (table) => {
    table.increments('id').primary();
    table.string('name', 255).notNullable();
    table.integer('year').notNullable();
    table.integer('month').nullable();
    table.integer('quarter').nullable();
    table.string('period_type', 30).nullable(); // Ditambahkan untuk filter frekuensi: MONTHLY, QUARTERLY, SEMIANNUAL, ANNUAL
    table.integer('period_unit').nullable();
    table.date('start_date').notNullable();
    table.date('end_date').notNullable();
    table.string('status', 50).notNullable().defaultTo('DRAFT');
    table.integer('created_by').nullable().references('id').inTable('users').onDelete('SET NULL');
    table.timestamp('opened_at').nullable();
    table.timestamp('closed_at').nullable();
    table.timestamps(true, true);

    table.index(['year']);
    table.index(['month']);
    table.index(['quarter']);
    table.index(['period_type']);
    table.index(['status']);
  });
}

async function createMonitoringTargets(knex) {
  const exists = await knex.schema.hasTable('monitoring_targets');
  if (exists) return;

  await knex.schema.createTable('monitoring_targets', (table) => {
    table.increments('id').primary();
    table.integer('period_id').notNullable().references('id').inTable('monitoring_periods').onDelete('CASCADE');
    table.integer('monitoring_item_id').notNullable().references('id').inTable('monitoring_items').onDelete('CASCADE');
    table.integer('internal_unit_id').nullable().references('id').inTable('internal_units').onDelete('SET NULL');
    table.integer('position_id').nullable().references('id').inTable('positions').onDelete('SET NULL');
    table.integer('assigned_user_id').nullable().references('id').inTable('users').onDelete('SET NULL');
    table.date('due_date').notNullable();
    table.string('status', 50).notNullable().defaultTo('NOT_STARTED');
    table.integer('latest_report_id').nullable().references('id').inTable('report_submissions').onDelete('SET NULL');
    table.decimal('score', 8, 2).nullable();
    table.string('grade', 10).nullable();
    table.integer('verified_by').nullable().references('id').inTable('users').onDelete('SET NULL');
    table.timestamp('verified_at').nullable();
    table.integer('revision_count').notNullable().defaultTo(0);
    table.text('remarks').nullable();
    table.timestamps(true, true);

    table.unique(['period_id', 'monitoring_item_id', 'internal_unit_id', 'position_id'], {
      indexName: 'uniq_monitoring_targets_scope'
    });
    table.index(['period_id']);
    table.index(['monitoring_item_id']);
    table.index(['internal_unit_id']);
    table.index(['position_id']);
    table.index(['assigned_user_id']);
    table.index(['status']);
    table.index(['due_date']);
  });
}

async function createMonitoringTargetActivities(knex) {
  const exists = await knex.schema.hasTable('monitoring_target_activities');
  if (exists) return;

  await knex.schema.createTable('monitoring_target_activities', (table) => {
    table.increments('id').primary();
    table.integer('monitoring_target_id').nullable().references('id').inTable('monitoring_targets').onDelete('SET NULL');
    table.integer('actor_user_id').nullable().references('id').inTable('users').onDelete('SET NULL');
    table.string('action', 100).notNullable();
    table.text('description').nullable();
    table.jsonb('payload').nullable();
    table.timestamps(true, true);

    table.index(['monitoring_target_id']);
    table.index(['actor_user_id']);
    table.index(['action']);
  });
}

async function createMonitoringTargetVerifications(knex) {
  const exists = await knex.schema.hasTable('monitoring_target_verifications');
  if (exists) return;

  await knex.schema.createTable('monitoring_target_verifications', (table) => {
    table.increments('id').primary();
    table.integer('monitoring_target_id').notNullable().references('id').inTable('monitoring_targets').onDelete('CASCADE');
    table.integer('actor_user_id').nullable().references('id').inTable('users').onDelete('SET NULL');
    table.string('action', 50).notNullable();
    table.text('note').nullable();
    table.decimal('score', 8, 2).nullable();
    table.string('grade', 10).nullable();
    table.date('revision_due_date').nullable();
    table.jsonb('payload').nullable();
    table.timestamps(true, true);

    table.index(['monitoring_target_id']);
    table.index(['actor_user_id']);
    table.index(['action']);
  });
}

async function alterReportSubmissions(knex) {
  const exists = await knex.schema.hasTable('report_submissions');
  if (!exists) return;

  if (!(await knex.schema.hasColumn('report_submissions', 'scope_type'))) {
    await knex.schema.alterTable('report_submissions', (table) => {
      table.string('scope_type', 30).notNullable().defaultTo('PN');
    });
  }

  if (!(await knex.schema.hasColumn('report_submissions', 'internal_unit_id'))) {
    await knex.schema.alterTable('report_submissions', (table) => {
      table.integer('internal_unit_id').nullable();
    });
  }

  if (!(await knex.schema.hasColumn('report_submissions', 'position_id'))) {
    await knex.schema.alterTable('report_submissions', (table) => {
      table.integer('position_id').nullable();
    });
  }

  if (!(await knex.schema.hasColumn('report_submissions', 'monitoring_target_id'))) {
    await knex.schema.alterTable('report_submissions', (table) => {
      table.integer('monitoring_target_id').nullable();
    });
  }

  if (!(await knex.schema.hasColumn('report_submissions', 'submitted_by_user_id'))) {
    await knex.schema.alterTable('report_submissions', (table) => {
      table.integer('submitted_by_user_id').nullable();
    });
  }

  if (!(await knex.schema.hasColumn('report_submissions', 'verified_by_user_id'))) {
    await knex.schema.alterTable('report_submissions', (table) => {
      table.integer('verified_by_user_id').nullable();
    });
  }

  if (!(await knex.schema.hasColumn('report_submissions', 'submission_context'))) {
    await knex.schema.alterTable('report_submissions', (table) => {
      table.jsonb('submission_context').nullable();
    });
  }
}

async function alterReportTypes(knex) {
  const exists = await knex.schema.hasTable('report_types');
  if (!exists) return;

  if (!(await knex.schema.hasColumn('report_types', 'scope_type'))) {
    await knex.schema.alterTable('report_types', (table) => {
      table.string('scope_type', 30).notNullable().defaultTo('PN');
    });
  }

  if (!(await knex.schema.hasColumn('report_types', 'monitoring_item_id'))) {
    await knex.schema.alterTable('report_types', (table) => {
      table.integer('monitoring_item_id').nullable();
    });
  }

  if (!(await knex.schema.hasColumn('report_types', 'owner_mode'))) {
    await knex.schema.alterTable('report_types', (table) => {
      table.string('owner_mode', 30).notNullable().defaultTo('SATKER');
    });
  }
}

exports.up = async function up(knex) {
  await createInternalUnits(knex);
  await createPositions(knex);
  await createInternalAssignments(knex);
  await createMonitoringPackages(knex);
  await createMonitoringItems(knex);
  await createMonitoringItemAssignments(knex);
  await createMonitoringPeriods(knex);
  await createMonitoringTargets(knex);
  await createMonitoringTargetActivities(knex);
  await createMonitoringTargetVerifications(knex);
  await alterReportSubmissions(knex);
  await alterReportTypes(knex);
};

exports.down = async function down(knex) {
  if (await knex.schema.hasTable('report_types')) {
    if (await knex.schema.hasColumn('report_types', 'owner_mode')) {
      await knex.schema.alterTable('report_types', (table) => table.dropColumn('owner_mode'));
    }
    if (await knex.schema.hasColumn('report_types', 'monitoring_item_id')) {
      await knex.schema.alterTable('report_types', (table) => table.dropColumn('monitoring_item_id'));
    }
    if (await knex.schema.hasColumn('report_types', 'scope_type')) {
      await knex.schema.alterTable('report_types', (table) => table.dropColumn('scope_type'));
    }
  }

  if (await knex.schema.hasTable('report_submissions')) {
    if (await knex.schema.hasColumn('report_submissions', 'submission_context')) {
      await knex.schema.alterTable('report_submissions', (table) => table.dropColumn('submission_context'));
    }
    if (await knex.schema.hasColumn('report_submissions', 'verified_by_user_id')) {
      await knex.schema.alterTable('report_submissions', (table) => table.dropColumn('verified_by_user_id'));
    }
    if (await knex.schema.hasColumn('report_submissions', 'submitted_by_user_id')) {
      await knex.schema.alterTable('report_submissions', (table) => table.dropColumn('submitted_by_user_id'));
    }
    if (await knex.schema.hasColumn('report_submissions', 'monitoring_target_id')) {
      await knex.schema.alterTable('report_submissions', (table) => table.dropColumn('monitoring_target_id'));
    }
    if (await knex.schema.hasColumn('report_submissions', 'position_id')) {
      await knex.schema.alterTable('report_submissions', (table) => table.dropColumn('position_id'));
    }
    if (await knex.schema.hasColumn('report_submissions', 'internal_unit_id')) {
      await knex.schema.alterTable('report_submissions', (table) => table.dropColumn('internal_unit_id'));
    }
    if (await knex.schema.hasColumn('report_submissions', 'scope_type')) {
      await knex.schema.alterTable('report_submissions', (table) => table.dropColumn('scope_type'));
    }
  }

  await knex.schema.dropTableIfExists('monitoring_target_verifications');
  await knex.schema.dropTableIfExists('monitoring_target_activities');
  await knex.schema.dropTableIfExists('monitoring_targets');
  await knex.schema.dropTableIfExists('monitoring_periods');
  await knex.schema.dropTableIfExists('monitoring_item_assignments');
  await knex.schema.dropTableIfExists('monitoring_items');
  await knex.schema.dropTableIfExists('monitoring_packages');
  await knex.schema.dropTableIfExists('internal_assignments');
  await knex.schema.dropTableIfExists('positions');
  await knex.schema.dropTableIfExists('internal_units');
};
