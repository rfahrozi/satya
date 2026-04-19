require('dotenv').config();
const path = require('path');

module.exports = {
  development: {
    client: 'pg',
    connection: {
      host: process.env.DB_HOST || '127.0.0.1',
      port: process.env.DB_PORT || 5432,
      user: process.env.DB_USER || 'satya_admin',
      password: process.env.DB_PASSWORD || 'secure_password_here',
      database: process.env.DB_NAME || 'satya_db',
    },
    pool: {
      min: 2,
      max: 10
    },
    migrations: { directory: path.join(__dirname, 'migrations') },
    seeds: { directory: path.join(__dirname, 'seeds') }
  },
  test: {
    client: 'pg',
    connection: {
      host: '127.0.0.1',
      port: parseInt(process.env.DB_PORT) || 5432,
      user: process.env.TEST_DB_USER || 'postgres',
      password: process.env.TEST_DB_PASSWORD || 'rafa',
      database: 'satya_db_test',
    },
    migrations: { directory: path.join(__dirname, 'migrations') },
    seeds: { directory: path.join(__dirname, 'seeds') }
  }
};