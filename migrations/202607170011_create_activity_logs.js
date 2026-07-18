/**
 * SATYA - Audit Trail & Activity Logs Migration
 * Table ini digunakan untuk mencatat seluruh aktivitas manajerial dan operasional
 * di luar submission logs biasa (yang dicatat di report_revision_logs).
 */

exports.up = async function(knex) {
    const exists = await knex.schema.hasTable('activity_logs');
    if (!exists) {
        await knex.schema.createTable('activity_logs', (table) => {
            table.increments('id').primary();
            table.integer('user_id').unsigned().references('id').inTable('users').onDelete('SET NULL');
            table.string('action', 100).notNullable();
            table.string('entity_type', 100).notNullable(); // e.g. 'TARGET', 'FOLLOW_UP', 'PERIOD', 'REVIEW'
            table.integer('entity_id').notNullable();
            table.text('old_value');
            table.text('new_value');
            table.text('description');
            table.timestamp('timestamp').defaultTo(knex.fn.now());

            // Indexing for faster history queries
            table.index(['entity_type', 'entity_id']);
            table.index(['user_id']);
            table.index(['timestamp']);
        });
    }
};

exports.down = async function(knex) {
    await knex.schema.dropTableIfExists('activity_logs');
};
