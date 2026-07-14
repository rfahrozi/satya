exports.up = async function(knex) {
    await knex.schema.alterTable('report_submissions', (table) => {
        table.string('file_url', 500).nullable().alter();
        table.string('nama_file_asli', 255).nullable().alter();
    });
};

exports.down = async function(knex) {
    await knex.schema.alterTable('report_submissions', (table) => {
        table.string('file_url', 500).notNullable().alter();
        table.string('nama_file_asli', 255).notNullable().alter();
    });
};
