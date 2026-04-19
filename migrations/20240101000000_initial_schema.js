/**
 * SATYA - Initial Schema Migration
 * Membuat tabel: satkers, users, report_types, report_submissions
 */

exports.up = async function(knex) {
    // 1. Tabel Satuan Kerja (Kantor Pengadilan Negeri)
    await knex.schema.createTable('satkers', (table) => {
        table.increments('id').primary();
        table.string('nama_satker', 255).notNullable().unique();
        table.timestamps(true, true);
    });

    // 2. Tabel User (Admin PT, Pimpinan, Satker PN)
    await knex.schema.createTable('users', (table) => {
        table.increments('id').primary();
        table.string('username', 100).notNullable().unique();
        table.string('password_hash', 255).notNullable();
        table.enu('role', ['ADMIN_PT', 'PIMPINAN', 'SATKER_PN']).notNullable();
        table.integer('satker_id').unsigned().references('id').inTable('satkers').onDelete('SET NULL').nullable();
        table.boolean('is_active').defaultTo(true);
        table.timestamps(true, true);
    });

    // 3. Tabel Jenis Laporan
    await knex.schema.createTable('report_types', (table) => {
        table.increments('id').primary();
        table.string('nama_laporan', 500).notNullable();
        table.boolean('is_wajib').defaultTo(true);
        table.timestamps(true, true);
    });

    // 4. Tabel Pengumpulan Laporan (Inti Sistem Monev)
    await knex.schema.createTable('report_submissions', (table) => {
        table.increments('id').primary();
        table.integer('satker_id').unsigned().references('id').inTable('satkers').onDelete('CASCADE').notNullable();
        table.integer('report_type_id').unsigned().references('id').inTable('report_types').onDelete('CASCADE').notNullable();
        table.integer('periode_bulan').notNullable(); // 1-12
        table.integer('periode_tahun').notNullable(); // e.g. 2026
        table.string('file_url', 500).notNullable(); // Path di MinIO
        table.string('nama_file_asli', 255).notNullable();
        table.enu('status_verifikasi', ['belum_lengkap', 'lengkap', 'revisi']).defaultTo('belum_lengkap');
        table.text('catatan_admin').nullable();
        table.timestamps(true, true);

        // Satu satker hanya boleh memiliki satu submission per jenis laporan per periode
        table.unique(['satker_id', 'report_type_id', 'periode_bulan', 'periode_tahun']);
    });
};

exports.down = async function(knex) {
    await knex.schema.dropTableIfExists('report_submissions');
    await knex.schema.dropTableIfExists('report_types');
    await knex.schema.dropTableIfExists('users');
    await knex.schema.dropTableIfExists('satkers');
};
