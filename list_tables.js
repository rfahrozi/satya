const knex = require('knex')(require('./knexfile').test);
knex.raw(`
  SELECT table_name
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND (
      table_name LIKE 'monitoring_%'
      OR table_name IN ('internal_units', 'positions', 'internal_assignments')
    )
  ORDER BY table_name;
`).then(res => {
  console.log('Tables found:', res.rows.map(r => r.table_name));
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
