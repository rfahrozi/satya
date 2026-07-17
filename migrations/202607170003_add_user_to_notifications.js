exports.up = async function(knex) {
  await knex.schema.alterTable('in_app_notifications', (table) => {
    table.integer('user_id').unsigned().references('id').inTable('users').onDelete('CASCADE').nullable();
    table.string('idempotency_key', 255).nullable().unique();
    table.string('event_type', 100).nullable();
  });
};

exports.down = async function(knex) {
  await knex.schema.alterTable('in_app_notifications', (table) => {
    table.dropColumn('event_type');
    table.dropColumn('idempotency_key');
    table.dropColumn('user_id');
  });
};
