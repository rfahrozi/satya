/**
 * SATYA - Test Database Setup
 * Menyediakan fungsi untuk reset database ke kondisi bersih sebelum setiap test suite.
 *
 * clearDatabase() melakukan TRUNCATE semua tabel dan re-seed data awal
 * sehingga setiap test suite mendapatkan state database yang identik dan deterministic.
 */
const knex = require('../src/config/knex');
const seedFn = require('../seeds/01_initial_data');

/**
 * Reset penuh: hapus semua data lalu seed ulang.
 * Urutan TRUNCATE menghormati FK constraint (leaf table first, atau CASCADE).
 */
async function clearDatabase() {
    // TRUNCATE dengan CASCADE otomatis menghapus data di tabel yang berelasi
    await knex.raw('TRUNCATE TABLE report_submissions, users, report_types, satkers RESTART IDENTITY CASCADE');
    // Re-seed untuk memastikan data awal (admin, satker, user, report types) selalu ada
    await seedFn.seed(knex);
}

/**
 * Tutup koneksi pool database setelah test suite selesai.
 */
async function closeDatabase() {
    await knex.destroy();
}

module.exports = { clearDatabase, closeDatabase };