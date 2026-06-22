/**
 * Menambahkan kolom reset_password_token dan reset_password_expires ke tabel users
 */
exports.up = function(knex) {
  return knex.schema.alterTable('users', function(table) {
    table.string('reset_password_token').nullable();
    table.bigInteger('reset_password_expires').nullable();
  });
};

exports.down = function(knex) {
  return knex.schema.alterTable('users', function(table) {
    table.dropColumn('reset_password_token');
    table.dropColumn('reset_password_expires');
  });
};
