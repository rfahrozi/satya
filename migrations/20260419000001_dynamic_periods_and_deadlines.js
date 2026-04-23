/**
 * SATYA - Dynamic Periods & Deadlines Migration
 */

exports.up = async function(knex) {
    // 1. Create deadline_configs table
    await knex.schema.createTable('deadline_configs', (table) => {
        table.increments('id').primary();
        table.integer('report_type_id').unsigned().references('id').inTable('report_types').onDelete('CASCADE').notNullable();
        table.enu('period_type', ['monthly', 'quarterly', 'semesterly', 'annually']).notNullable();
        table.integer('day_of_period').notNullable().defaultTo(10);
        table.timestamps(true, true);
        table.unique(['report_type_id', 'period_type']);
    });

    // 2. Modify report_submissions table
    await knex.schema.alterTable('report_submissions', (table) => {
        // Drop constraints that rely on periode_bulan
        table.dropUnique(['satker_id', 'report_type_id', 'periode_bulan', 'periode_tahun']);
        
        // Rename column
        table.renameColumn('periode_bulan', 'period_unit');
    });

    await knex.schema.alterTable('report_submissions', (table) => {
        // Add period_type column
        table.enu('period_type', ['monthly', 'quarterly', 'semesterly', 'annually']).notNullable().defaultTo('monthly');
        
        // Add new unique constraint
        table.unique(['satker_id', 'report_type_id', 'period_type', 'period_unit', 'periode_tahun']);
    });
};

exports.down = async function(knex) {
    await knex.schema.alterTable('report_submissions', (table) => {
        table.dropUnique(['satker_id', 'report_type_id', 'period_type', 'period_unit', 'periode_tahun']);
        table.dropColumn('period_type');
    });
    
    await knex.schema.alterTable('report_submissions', (table) => {
        table.renameColumn('period_unit', 'periode_bulan');
        table.unique(['satker_id', 'report_type_id', 'periode_bulan', 'periode_tahun']);
    });

    await knex.schema.dropTableIfExists('deadline_configs');
};
