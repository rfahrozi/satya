/**
 * SATYA - Sistem Administrasi dan Tata kelola Yudisial yang Akuntabel - Database Configuration
 * Menggunakan Knex.js untuk Query Builder & Koneksi PostgreSQL
 */

const knex = require('knex');
require('dotenv').config();
const config = require('../../knexfile');

// Mendeteksi apakah aplikasi sedang berjalan dalam mode testing atau produksi
const environment = process.env.NODE_ENV || 'development';

// Inisialisasi instance Knex berdasarkan environment
const db = knex(config[environment]);

// Verifikasi Koneksi saat Startup
if (environment !== 'test') {
    db.raw('SELECT 1')
      .then(() => console.log('✅ [Database] PostgreSQL terhubung dengan sukses.'))
      .catch((err) => {
        console.error('❌ [Database] Gagal terhubung ke PostgreSQL:', err.message);
      });
}

module.exports = db;