exports.up = async function(knex) {
    await knex.schema.alterTable('report_submissions', (table) => {
        table.string('excel_file_url', 500).nullable();
        table.string('nama_excel_file_asli', 255).nullable();
    });

    await knex.schema.alterTable('report_revision_logs', (table) => {
        table.string('excel_file_url', 500).nullable();
    });
};

exports.down = async function(knex) {
    await knex.schema.alterTable('report_submissions', (table) => {
        table.dropColumn('excel_file_url');
        table.dropColumn('nama_excel_file_asli');
    });

    await knex.schema.alterTable('report_revision_logs', (table) => {
        table.dropColumn('excel_file_url');
    });
};
