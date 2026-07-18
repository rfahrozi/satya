# CHEKLIST DEPLOYMENT PRODUCTION (SATYA v2.1.0)
## Persiapan Go-Live Fitur Internal Monitoring

Pastikan semua langkah di bawah ini dicentang sebelum melakukan switch traffic ke server production.

---

### A. INFRASTRUKTUR & ENVIRONMENT 🖥️

- [ ] **Feature Flag:** Pastikan `PT_INTERNAL_MONITORING_ENABLED=true` di file `.env` server production.
- [ ] **MinIO Config:** Variabel `MONITORING_UPLOAD_MAX_BYTES=10485760` (10MB) dan `MONITORING_PRESIGNED_URL_TTL_SECONDS=3600` telah diset di `.env`.
- [ ] **MinIO Bucket:** Bucket `satya-docs` sudah dibuat di server MinIO production.
- [ ] **Redis:** Redis berjalan normal (dibutuhkan untuk BullMQ rate-limiter dan email).
- [ ] **Email SMTP:** `SMTP_USER` dan `SMTP_PASS` menggunakan kredensial asli institusi.

### B. DATABASE MIGRATION & SEEDING 🗄️

- [ ] **Backup:** Full database backup (pg_dump) telah dijalankan sebelum migrasi.
- [ ] **Migrasi Baru:** Jalankan `npx knex migrate:latest` untuk memastikan tabel `activity_logs` dan modifikasi `report_submissions` (period_type) ter-apply.
- [ ] **Data Master:** Jalankan `npx knex seed:run --specific=20_internal_monitoring_master_data.js` untuk memasukkan:
  - 4 Kriteria (AMPUH, PMPZI, AKIP, REGULASI)
  - 7 Unit Internal & 9 Jabatan
  - 51 Item Checklist Canonical
- [ ] **Validasi Master:** Cek via DBeaver/pgAdmin bahwa tabel `monitoring_items` berisi 51 baris data.

### C. BUILD & DEPLOY 🚀

- [ ] **Frontend Build:** Jalankan `npm run build` di folder `/frontend` (pastikan tidak ada error TypeScript/Vite).
- [ ] **Restart Service:** Gunakan `pm2 reload satya-api` atau `docker-compose up -d --build`.
- [ ] **Health Check:** Akses `https://domain-satya.go.id/api/v1/health` dan pastikan respons `200 OK`.

### D. POST-DEPLOYMENT VERIFICATION (SMOKE TEST) 🕵️‍♂️

Gunakan akun UAT atau akun Admin asli untuk mengetes di production:
- [ ] **Test Login:** Login sebagai ADMIN_PT.
- [ ] **Test Menu:** Pastikan menu **Dashboard Eksekutif**, **Monitoring Internal**, dan **Portal Checklist** muncul di sidebar kiri.
- [ ] **Test Upload:** Buka Portal Checklist, coba upload 1 file PDF (ukuran < 10MB) -> Pastikan masuk ke MinIO dan bisa di-download ulang.
- [ ] **Test Limit:** Coba upload file > 10MB -> Pastikan ditolak dengan error yang rapi.
- [ ] **Test Pimpinan:** Login sebagai KPT (Ketua) -> Pastikan hanya melihat Dashboard Eksekutif dan tidak bisa menghapus file.

### E. SOSIALISASI & HANDOVER 🤝

- [ ] Dokumen `SOP_PENGGUNAAN_PERAN.md` telah dibagikan ke seluruh Kabag dan Koordinator.
- [ ] Beri tahu tim terkait bahwa notifikasi email sekarang menggunakan alamat email (bukan username). Pastikan semua user memiliki email valid di sistem.
