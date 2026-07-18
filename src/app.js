require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');
const Sentry = require('@sentry/node');
const { initMinio } = require('./config/minio');
const routes = require('./routes');
const { errorHandler, notFoundHandler } = require('./middlewares/errorHandler');

// ─── [OPS-01] Sentry Initialization ──────────────────────────────────────────
if (process.env.SENTRY_DSN) {
    Sentry.init({
        dsn: process.env.SENTRY_DSN,
        environment: process.env.NODE_ENV,
        tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1.0,
    });
}

const app = express();

// Sentry request handler (harus menjadi middleware pertama)
if (process.env.SENTRY_DSN) {
    app.use(Sentry.Handlers.requestHandler());
}

// ─── [SEC-04] CORS Whitelist ──────────────────────────────────────────────────
// Hanya origin yang terdaftar di ALLOWED_ORIGINS yang diizinkan.
// Isi di .env: ALLOWED_ORIGINS=https://satya.pt-kepri.go.id,http://localhost:3000
const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
    : ['http://localhost:3000'];

app.use(cors({
    origin: (origin, callback) => {
        // Izinkan request tanpa origin (curl, Postman, server-to-server)
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) return callback(null, true);
        callback(new Error(`CORS: Origin '${origin}' tidak diizinkan.`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());

// ─── [BUG-01] Single Mount Strategy ──────────────────────────────────────────
// Karena Vite mem-build frontend dengan "base: '/satya/'", file aset (js/css)
// akan dicari di /satya/assets/*. Oleh karena itu, kita mount Express static
// secara spesifik agar /satya/assets merujuk ke isi folder public/assets.

const BASE_PATH = process.env.BASE_PATH || '/satya';

const baseRouter = express.Router();

// ─── Routing Frontend (Vite Build) ─────────────────────────────────────────
// Konfigurasi agar file statis pada /satya/* maupun /* langsung merujuk ke public/
app.use(BASE_PATH, express.static(path.resolve(__dirname, '../public')));
app.use(express.static(path.resolve(__dirname, '../public')));

// Dokumentasi Swagger API
baseRouter.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, { customSiteTitle: 'SATYA API Docs' }));

// Semua API route
baseRouter.use('/api/v1', routes);

// Penanganan API 404 — harus sebelum SPA fallback
baseRouter.all('/api/v1/*', (req, res, next) => {
    const error = new Error('API Endpoint tidak ditemukan.');
    error.statusCode = 404;
    next(error);
});

// SPA Fallback untuk React Router — pastikan tidak menangkap API requests
baseRouter.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, '../public', 'index.html'));
});

// Mount baseRouter dua kali agar aplikasi tetap jalan baik di belakang reverse proxy maupun akses lokal langsung
app.use(BASE_PATH, baseRouter);
app.use('/', baseRouter);

// ─── Global Error Handler — harus sesudah semua route ────────────────────────
if (process.env.SENTRY_DSN) {
    app.use(Sentry.Handlers.errorHandler());
}
app.use(errorHandler);

if (process.env.NODE_ENV !== 'test') {
    initMinio().then(() => {
        app.listen(process.env.PORT || 3000, () =>
            console.log(`[SATYA] API berjalan di port ${process.env.PORT || 3000} | BASE_PATH: ${BASE_PATH}`)
        );
    });
}

module.exports = app;
