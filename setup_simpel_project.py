import os

project_name = "simpel-project"

# Dictionary ini menampung seluruh struktur file dan isinya
files_and_content = {
    # --- ROOT CONFIG ---
    "docker-compose.yml": """version: '3.8'
services:
  db:
    image: postgres:15-alpine
    container_name: simpel_postgres
    environment:
      POSTGRES_USER: simpel_admin
      POSTGRES_PASSWORD: secure_password_here
      POSTGRES_DB: simpel_db
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
  minio:
    image: minio/minio
    environment:
      MINIO_ROOT_USER: minio_admin
      MINIO_ROOT_PASSWORD: minio_secure_password
    command: server /data --console-address ":9001"
    ports:
      - "9000:9000"
      - "9001:9001"
    volumes:
      - miniodata:/data
volumes:
  pgdata:
  miniodata:""",

    ".env": """PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_USER=simpel_admin
DB_PASSWORD=secure_password_here
DB_NAME=simpel_db
JWT_SECRET=super_secret_key_pt_kepri_2026
JWT_EXPIRES_IN=8h
MINIO_ENDPOINT=127.0.0.1
MINIO_PORT=9000
MINIO_ACCESS_KEY=minio_admin
MINIO_SECRET_KEY=minio_secure_password
MINIO_BUCKET_NAME=simpel-documents
REDIS_HOST=127.0.0.1
REDIS_PORT=6379""",

    "package.json": """{
  "name": "simpel-backend",
  "version": "1.0.0",
  "scripts": {
    "start:api": "node src/app.js",
    "start:worker": "node src/worker-app.js",
    "dev:api": "nodemon src/app.js",
    "test": "cross-env NODE_ENV=test jest --runInBand --detectOpenHandles --coverage"
  },
  "dependencies": {
    "bcryptjs": "^2.4.3",
    "bullmq": "^5.0.0",
    "cors": "^2.8.5",
    "dotenv": "^16.0.3",
    "express": "^4.18.2",
    "ioredis": "^5.3.2",
    "jsonwebtoken": "^9.0.0",
    "knex": "^2.4.2",
    "minio": "^7.1.1",
    "multer": "^1.4.5-lts.1",
    "nodemailer": "^6.9.1",
    "pg": "^8.10.0"
  },
  "devDependencies": {
    "cross-env": "^7.0.3",
    "jest": "^29.5.0",
    "nodemon": "^2.0.22",
    "supertest": "^6.3.3"
  }
}""",

    # --- BACKEND CORE ---
    "src/app.js": """require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { initMinio } = require('./config/minio');
const routes = require('./routes');
const { errorHandler } = require('./middlewares/errorHandler');

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api/v1', routes);
app.use(errorHandler);

if (process.env.NODE_ENV !== 'test') {
    initMinio().then(() => {
        app.listen(process.env.PORT, () => console.log(`🚀 API Running on port ${process.env.PORT}`));
    });
}
module.exports = app;""",

    "src/middlewares/tenant.js": """const jwt = require('jsonwebtoken');
const { AppError } = require('./errorHandler');

const tenantContext = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return next(new AppError('Unauthorized: Token missing', 401));
    }
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.tenant = { userId: decoded.id, role: decoded.role, satkerId: decoded.satkerId };
        next();
    } catch (err) {
        next(new AppError('Invalid Token', 401));
    }
};
module.exports = tenantContext;""",

    "src/repositories/reportRepo.js": """const knex = require('../config/knex');

async function getSatkerProgress(satkerId, bulan, tahun) {
    return await knex('report_types as rt')
        .select('rt.id as report_type_id', 'rt.nama_laporan', 'rs.id as submission_id', 'rs.status_verifikasi')
        .leftJoin('report_submissions as rs', function() {
            this.on('rt.id', '=', 'rs.report_type_id')
                .andOn('rs.satker_id', '=', knex.raw('?', [satkerId]))
                .andOn('rs.periode_bulan', '=', knex.raw('?', [bulan]))
                .andOn('rs.periode_tahun', '=', knex.raw('?', [tahun]));
        }).orderBy('rt.id', 'asc');
}
module.exports = { getSatkerProgress };""",

    "src/services/reportService.js": """const { minioClient, BUCKET_NAME } = require('../config/minio');
const knex = require('../config/knex');

async function uploadReportDocument(tenant, file, reportTypeId, bulan, tahun) {
    const existing = await knex('report_submissions').where({ satker_id: tenant.satkerId, report_type_id: reportTypeId, periode_bulan: bulan, periode_tahun: tahun }).first();
    if (existing) await minioClient.removeObject(BUCKET_NAME, existing.file_url);

    const filename = `${tenant.satkerId}/${tahun}/${bulan}/${Date.now()}-${file.originalname}`;
    await minioClient.putObject(BUCKET_NAME, filename, file.buffer, file.size);

    const data = { satker_id: tenant.satkerId, report_type_id: reportTypeId, periode_bulan: bulan, periode_tahun: tahun, file_url: filename, nama_file_asli: file.originalname, status_waktu: 'tepat_waktu' };
    return existing ? knex('report_submissions').where({ id: existing.id }).update(data) : knex('report_submissions').insert(data);
}
module.exports = { uploadReportDocument };""",

    # --- INTEGRATION TESTS ---
    "tests/setup.js": """const knex = require('../src/config/knex');

async function clearDatabase() {
    await knex.raw('TRUNCATE TABLE report_submissions CASCADE');
}
async function closeDatabase() {
    await knex.destroy();
}
module.exports = { clearDatabase, closeDatabase };""",

    "tests/__mocks__/externalServices.js": """jest.mock('../../src/config/minio', () => ({
    BUCKET_NAME: 'test-bucket',
    initMinio: jest.fn().mockResolvedValue(true),
    minioClient: {
        putObject: jest.fn().mockResolvedValue('etag'),
        removeObject: jest.fn().mockResolvedValue(true),
        presignedGetObject: jest.fn().mockResolvedValue('http://mock.url')
    }
}));
jest.mock('../../src/workers/emailWorker', () => ({
    emailQueue: { add: jest.fn().mockResolvedValue({ id: '1' }) }
}));""",

    "tests/integration/reportFlow.test.js": """const request = require('supertest');
const app = require('../../src/app');
const knex = require('../../src/config/knex');
const { clearDatabase, closeDatabase } = require('../setup');
require('../__mocks__/externalServices');

describe('End-to-End Report Flow', () => {
    let token;
    beforeAll(async () => { await clearDatabase(); });
    afterAll(async () => { await closeDatabase(); });

    it('Should login and upload report successfully', async () => {
        // 1. Login Mock
        const loginRes = await request(app).post('/api/v1/auth/login').send({ username: 'admin_pt', password: 'password123' });
        token = loginRes.body.data?.token;

        // 2. Upload (Happy Path)
        const res = await request(app)
            .post('/api/v1/reports/upload')
            .set('Authorization', `Bearer ${token}`)
            .field('report_type_id', 1)
            .field('periode_bulan', 4)
            .field('periode_tahun', 2026)
            .attach('dokumen_monev', Buffer.from('PDF'), 'test.pdf');

        expect(res.statusCode).toBe(201);
    });
});""",

    # --- MANUAL BOOK ---
    "manual-book-deployment.html": """<!DOCTYPE html><html><head><title>SOP Deployment</title></head>
    <body style="font-family:sans-serif; padding:40px;">
    <h1>Panduan Deployment SIMPEL</h1>
    <p>1. <code>cd simpel-project</code></p>
    <p>2. <code>docker-compose up -d</code></p>
    <p>3. <code>npm install</code></p>
    <p>4. <code>npm run test</code></p>
    </body></html>"""
}

def setup_project():
    print(f"🛠️  Memulai Setup Proyek: {project_name}")
    if not os.path.exists(project_name):
        os.makedirs(project_name)

    for path, content in files_and_content.items():
        full_path = os.path.join(project_name, path)
        os.makedirs(os.path.dirname(full_path), exist_ok=True)
        with open(full_path, "w", encoding="utf-8") as f:
            f.write(content)
            print(f"✅ Created: {path}")

    print(f"\\n✨ Selesai! Masuk ke direktori proyek dengan 'cd {project_name}', lalu jalankan 'npm install' dan 'npm run test'.")

if __name__ == "__main__":
    setup_project()