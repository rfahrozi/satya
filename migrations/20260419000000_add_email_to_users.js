/**
 * SATYA - Migration: Add email column to users table
 * Diperlukan untuk sistem reminder otomatis (H-3, H-1, Hari-H)
 * Email bersifat nullable agar backward-compatible dengan data lama.
 */

exports.up = async function(knex) {
    await knex.schema.alterTable('users', (table) => {
        table.string('email', 255).nullable().comment('Alamat email penanggung jawab satker untuk notifikasi otomatis');
    });
};

exports.down = async function(knex) {
    await knex.schema.alterTable('users', (table) => {
        table.dropColumn('email');
    });
};
