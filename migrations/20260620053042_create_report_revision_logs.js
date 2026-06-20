/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  await knex.schema.createTable('report_revision_logs', (table) => {
      table.increments('id').primary();
      table.integer('submission_id').unsigned().references('id').inTable('report_submissions').onDelete('CASCADE').notNullable();
      table.string('action_type', 50).notNullable(); // 'UPLOADED', 'VERIFIED_LENGKAP', 'VERIFIED_REVISI'
      table.text('catatan').nullable();
      table.string('file_url', 500).nullable();
      table.string('actor', 100).nullable();
      table.timestamps(true, true);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('report_revision_logs');
};
