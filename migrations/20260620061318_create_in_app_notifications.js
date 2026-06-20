/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  await knex.schema.createTable('in_app_notifications', (table) => {
    table.increments('id').primary();
    table.integer('satker_id').unsigned().references('id').inTable('satkers').onDelete('CASCADE').nullable();
    table.string('title', 255).notNullable();
    table.text('message').notNullable();
    table.boolean('is_read').defaultTo(false);
    table.timestamps(true, true);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('in_app_notifications');
};
