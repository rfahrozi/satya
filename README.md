# SATYA (Sistem Administrasi dan Tata Kelola Yudisial yang Akuntabel)
## Sistem Monitoring & Evaluasi Terpadu | Pengadilan Tinggi Kepulauan Riau

![Version](https://img.shields.io/badge/Version-2.1.0-emerald.svg)
![Node.js](https://img.shields.io/badge/Node.js-v20-blue.svg)
![React](https://img.shields.io/badge/React-19-61dafb.svg)
![Docker](https://img.shields.io/badge/Docker-Ready-2496ed.svg)

**SATYA** adalah platform digital *Enterprise-grade* yang dirancang sebagai instrumen strategis penyelenggaraan tugas administrasi peradilan di lingkungan Pengadilan Tinggi (PT) Kepulauan Riau.

Sistem ini menjalankan **"Dual Track Monitoring"**:
1. **Pengawasan Eksternal (PN → PT):** Mengelola 12 Laporan Wajib bulanan dari seluruh Pengadilan Negeri di bawah yurisdiksi PT Kepri.
2. **Evaluasi Mandiri Internal (Bagian PT):** Memonitor pemenuhan dokumen dari tiap bagian di dalam PT sendiri untuk mendukung standar **AMPUH, PMPZI, dan AKIP** melalui 295 *Master Checklist* yang tersebar ke 15 Jabatan Resmi.

---

## 🌟 Fitur Utama (v2.1.0)

### 1. Sistem "Dual Track" Terintegrasi
- **Portal Satker (PN):** Antarmuka unggah mandiri untuk PN (Pengadilan Negeri) yang dilengkapi dengan notifikasi revisi seketika.
- **Portal Internal (PT):** Antarmuka terpisah untuk Kepala Bagian & Koordinator Pengadilan Tinggi dengan dukungan unggahan *Evidence* tekstual dan *File* berdasar Standar Kriteria (AMPUH/PMPZI/AKIP).

### 2. Dashboard Eksekutif & Heatmap
- **Pimpinan Dashboard:** Menyajikan metrik kepatuhan (*Compliance Rate*), item kritis/terlambat (*Overdue*), dan progres langsung dari masing-masing Unit.
- **Risk Heatmap & Trend:** Matriks interaktif 5×5 (Likelihood × Impact) dan grafik tren bulanan untuk tata kelola risiko manajemen.
- **Ekspor PDF & Excel:** Otomatis menghasilkan rekapitulasi data kepatuhan bulanan, semesteran, hingga tahunan (menggunakan `jsPDF` & `exceljs`).

### 3. Otomasi & Alur Kerja (Workflow) Cerdas
- **State Machine Workflow:** Dokumen akan bertransisi secara ketat: `NOT_STARTED` → `IN_PROGRESS` → `AWAITING_APPROVAL` → `AWAITING_VERIFICATION` → `VERIFIED` atau `REVISION_REQUIRED`.
- **Frequency Generator Pintar:** Engine yang otomatis memilah kriteria mana yang harus muncul pada periode Triwulan, Semester, atau Tahunan, menyesuaikan beban kerja tanpa input ganda.
- **Weekly Digest Email (Anti-Spam):** Meringankan "Kelelahan Notifikasi" (*Alert Fatigue*) dengan merangkum semua tugas *Overdue* dan *Revision Required* ke dalam 1 email mingguan (via *Cron Scheduler*), bukan mengirim spam setiap hari.
- **Batch Verification & Quick Copy:** Dilengkapi antarmuka sentral untuk memverifikasi puluhan dokumen sekaligus (Batch Verify) serta tombol "Salin Tautan" GDrive cepat untuk uploader.

### 4. Skalabilitas & Keamanan (SRE & DevSecOps)
- **High-Performance Upload (Direct Streaming):** Proses unggah langsung di-*stream* dari Disk-ke-S3 (MinIO) tanpa membebani RAM NodeJS (Mencegah *Out-of-Memory / OOM Crash*).
- **Caching & Optimisasi N+1 Query:** Dashboard memanfaatkan Redis Cache, dan *Batch Query* (WHERE IN) telah diimplementasikan untuk menjamin operasi database tetap ringan di bawah trafik puluhan ribu baris data.
- **Circuit Breaker (Opossum):** Node.js tidak akan *hang* jika koneksi ke Object Storage melambat atau terputus berkat perlindungan *Circuit Breaker*.
- **Security Hardening:** Implementasi JWT Revocation (Redis Blacklisting), Sanitasi Path Traversal pada _filename_, Validasi _Magic Bytes_ dari _file type_, pencegahan SQL Injection via *parameterized query binding*, hingga pembatasan *Rate Limiting* berlapis pada Endpoint Login & Lupa Kata Sandi.
- **Deep Health & APM Tracing:** Integrasi `@sentry/node` untuk penelusuran Query Database serta ketersediaan `GET /metrics` yang telah diproteksi otentikasi token untuk *Prometheus Analytics Scraping*.

---

## 🏗️ Arsitektur Teknologi

SATYA dirancang dengan pemisahan lapisan (*layered architecture*), memudahkan pemeliharaan dan pengujian.

| Lapisan | Teknologi Utama | Keterangan |
|---|---|---|
| **Frontend** | React 19, Vite 8, TailwindCSS 4 | SPA, TanStack Query, Framer Motion, *Role-Based Access Control* (RBAC) pada router (`App.jsx`). |
| **Backend API** | Node.js, Express.js | Arsitektur: Router → Controller → Service → Repository → Database. |
| **Database** | PostgreSQL 15, Knex.js | Relasional, Query builder & *Schema Migration*. |
| **Penyimpanan** | MinIO (S3-Compatible) | Penyimpanan file PDF & Excel dengan `Presigned URL`. |
| **Antrean & Job** | Redis 7, BullMQ 5 | Antrean tugas asinkron (pengiriman Email dan Pengecekan SLA Cron). |
| **Infrastruktur** | Docker, Docker Compose | Orkestrasi kontainer dev & production (*multi-container environment*). |

---

## 🗺️ Roadmap Pengembangan (Masa Datang)

Pengembangan selanjutnya pasca MVP (V2.1) diproyeksikan untuk berfokus pada pengalaman Administrator PT dan skalabilitas sistem:

### Fase 2: Skalabilitas Operasional (Bulan 3-6) — Fokus Admin
- [ ] **Bangun halaman CRUD Master Data (Manajemen Checklist)** di UI Admin, untuk membebaskan sistem dari ketergantungan script manual, namun **tetap mempertahankan/mendukung** fitur impor *generate* langsung dari dokumen format Excel melalui script Python.
- [ ] **Implementasikan Auto-Generate Period Scheduler**, biarkan sistem *NodeJS* (`node-cron` / BullMQ) yang mengeksekusi dan membuka periode/bulan evaluasi baru secara otomatis tanpa menunggu klik dari Administrator.
- [ ] **Terapkan Data Retention Policy pada MinIO**, yakni pembuatan layanan *Garbage Collector* untuk menghapus otomatis berkas-berkas `DRAFT` atau `SUPERSEDED` yang kadaluwarsa (lebih dari 30 hari) guna menghemat kapasitas peladen objek.

---

## 🚀 Panduan Instalasi & Menjalankan (Docker Lokal)

Aplikasi ini sudah dipaketkan menggunakan *Docker Compose*, membuat instalasi lokal bisa berjalan secara instan.

### Prasyarat
- [Docker Desktop](https://www.docker.com/products/docker-desktop)
- Node.js (V20+) *untuk pengembangan lokal jika dibutuhkan*

### Langkah-langkah
1. **Salin Environment Variables**
   ```bash
   cp .env.example .env
   # Buka file .env dan pastikan PT_INTERNAL_MONITORING_ENABLED=true
   ```

2. **Jalankan Infrastruktur via Docker Compose**
   ```bash
   docker-compose -f docker-compose.dev.yml up -d --build
   ```
   *Proses ini akan membangun ulang UI React, lalu menjalankan kontainer Node (App & Worker), PostgreSQL, Redis, dan MinIO.*
   *Script entrypoint secara otomatis akan menjalankan migrasi database dari folder `migrations/` hanya pada container App, menghindari `lock collision` dari worker.*

3. **Inisialisasi Master Data & Seed (PENTING)**
   Aplikasi membutuhkan data awal agar bisa digunakan. Jalankan command ini ke dalam container:
   ```bash
   # Masukkan master data konfigurasi & 295 Checklist Kriteria (dengan mapping jabatan yg akurat)
   docker exec satya_app_dev npx knex seed:run --specific=40_rebuild_assignments_by_jabatan.js
   
   # Buat akun User Testing (15 Jabatan Resmi PT: KPT, Hakim, Panitera, dll)
   docker exec satya_app_dev npx knex seed:run --specific=50_add_jabatan_pt_accounts.js
   
   # Generate target dokumen untuk periode aktif berjalan
   docker exec satya_app_dev node scripts/generate_uat_targets.js
   ```

4. **Akses Aplikasi**
   - Web App: [http://localhost:3000/satya](http://localhost:3000/satya)
   - MinIO Console: [http://localhost:9001](http://localhost:9001)

---

## 🔑 Kredensial Uji Coba (UAT) & Matriks Akses Peran

Sistem SATYA memisahkan hak akses secara ketat (*Strict Segregation of Duties*) agar tidak ada peran ganda yang tumpang tindih (misalnya Admin tidak boleh merangkap sebagai Uploader). Setiap pengguna hanya akan melihat menu dan halaman yang relevan dengan tugasnya.

*(Semua akun di bawah menggunakan kata sandi default: `password123`)*

| Kategori Peran | Akun Username | Role Code | Hak Akses Menu & Fungsi Utama |
|---|---|---|---|
| **1. Pimpinan Eksekutif** | `ketua_pt`, `wakil_ketua`, `hakim_tinggi` | `KPT`, `WKPT`, `HAKIM_PT` | **Dashboard Eksekutif PT** & **Monitoring Internal PT**.<br>Melihat seluruh statistik progres, grafik *Heatmap* risiko, serta mengesahkan *Management Review*. |
| **2. Pejabat Eselon III** | `panitera_pt`, `sekretaris_pt`, `kabag_perenc`, `kabag_umum` | `PANITERA_PT`, `SEKRETARIS_PT`, `KABAG_PERENC_KEP`, `KABAG_UMUM_KEU` | **Monitoring Internal PT** & **Portal Checklist PT**.<br>Memonitor progres pengunggahan dari sub-bagian di bawahnya, memberi *Approval*, sekaligus mengunggah dokumen target mereka sendiri. |
| **3. Koordinator Proses (Uploader)** | `panmud_hukum`, `pan_pengganti`, `kasubbag_turt`, `kasubbag_ptip`, dsb | `PANMUD_*`, `KASUBBAG_*`, `STAFF_*`, `PANITERA_PENGGANTI` | **Portal Checklist PT**.<br>Mengunggah (*upload*) berkas/bukti dukung format PDF/Excel pada 295 item checklist sesuai tupoksi masing-masing dan menekan tombol *Submit Target*. |
| **4. Verifikator Mutu** | `tim_verifier` | `VERIFIER` | **Monitoring Internal PT (Antrian Review)** & **Portal Checklist PT (Read-Only)**.<br>Melakukan verifikasi akhir setelah dokumen di-*approve*. Memberikan nilai atau menolak (*Revisi*) berkas yang tidak memenuhi kriteria. |
| **5. Administrator PT** | `admin_pt` | `ADMIN_PT` | **Manajemen User**, **Master Data PN**, & **Master Data PT**.<br>Mengelola akun pengguna, membuka/menutup periode pelaporan aktif, generate target monitoring, serta mengelola referensi 295 Master Checklist. Admin **tidak dapat mengupload** bukti di portal checklist. |

---

## 📚 Dokumentasi Lanjutan
Untuk dokumentasi pengoperasian dan standar alur, Anda dapat merujuk ke file dan folder berikut:
- **[Panduan Kontribusi (CONTRIBUTING.md)](CONTRIBUTING.md)** — Jika Anda developer baru, mulailah dari sini.
- **[Changelog (CHANGELOG.md)](CHANGELOG.md)** — Daftar riwayat perubahan rilis (berbasis standar *Keep a Changelog*).
- **[SOP Penggunaan Peran (SOP_PENGGUNAAN_PERAN.md)](docs/SOP_PENGGUNAAN_PERAN.md)** — Rincian tugas untuk KPT, Kabag, Koordinator, Verifikator, & Admin PT.
- **[Checklist Deployment Production (DEPLOYMENT_CHECKLIST.md)](docs/DEPLOYMENT_CHECKLIST.md)** — Daftar pengecekan sebelum *go-live* ke server publik.
- **API Documentation (Swagger)** — Saat server berjalan di mode development lokal, buka `http://localhost:3000/api-docs` untuk spesifikasi rute.

---

## 🧪 Menjalankan Test (Developer)
Aplikasi ini dilengkapi 121 unit & integration tests berbasis Jest. Jalankan dengan:

```bash
# Menjalankan seluruh test suite beserta coverage report
npm test

# Menjalankan spesifik ke modul auth/dashboard saja
npm test -- --testPathPattern=authFlow
npm test -- --testPathPattern=internalMonitoringDashboard
```

---
*Dikembangkan secara khusus untuk menyokong ekosistem digital institusi hukum Pengadilan Tinggi di lingkungan Mahkamah Agung Republik Indonesia.*
