/**
 * SATYA - Update Roles Enum Migration
 */

exports.up = async function(knex) {
    // For PostgreSQL, updating an enum type is complex. We'll alter the column to string first,
    // or recreate the check constraint if it's using VARCHAR with checks.
    // Assuming knex created an enum type natively in PostgreSQL.
    // However, Knex often creates a check constraint for enum if not using native enums.

    // In Knex, enums are typically created as text with a check constraint in PG, or native enum.
    // The safest way is to change the column type to string, then redefine the enum, but
    // for simplicity and compatibility across dialects, altering it natively is tricky.

    // Let's drop the constraint and alter the type to string, then back to enum.
    await knex.schema.alterTable('users', table => {
        table.string('role_new', 50).defaultTo('SATKER_PN');
    });

    await knex.raw(`UPDATE users SET role_new = CAST(role AS VARCHAR)`);

    await knex.schema.alterTable('users', table => {
        table.dropColumn('role');
    });

    await knex.schema.alterTable('users', table => {
        table.renameColumn('role_new', 'role');
    });
};

exports.down = async function(knex) {
    await knex.schema.alterTable('users', table => {
        table.string('role_old', 50).defaultTo('SATKER_PN');
    });

    await knex.raw(`UPDATE users SET role_old = CAST(role AS VARCHAR)`);

    await knex.schema.alterTable('users', table => {
        table.dropColumn('role');
    });

    await knex.schema.alterTable('users', table => {
        table.renameColumn('role_old', 'role');
    });
};
