/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  // [SEC-L06] Menambahkan kolom soft delete ke tabel audit
  await knex.schema.alterTable('monitoring_targets', (table) => {
    table.timestamp('deleted_at').nullable();
  });
  await knex.schema.alterTable('monitoring_evidences', (table) => {
    table.timestamp('deleted_at').nullable();
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  await knex.schema.alterTable('monitoring_targets', (table) => {
    table.dropColumn('deleted_at');
  });
  await knex.schema.alterTable('monitoring_evidences', (table) => {
    table.dropColumn('deleted_at');
  });
};
