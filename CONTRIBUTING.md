# 🤝 Panduan Kontribusi SATYA

Terima kasih telah meluangkan waktu untuk berkontribusi pada SATYA (Sistem Administrasi dan Tata Kelola Yudisial yang Akuntabel) - Pengadilan Tinggi Kepulauan Riau. Panduan ini menjelaskan proses dan standar yang kami gunakan.

## 🛠️ Persiapan Lingkungan

1. Clone repositori.
2. Salin `.env.example` ke `.env` dan konfigurasikan variabel environment (lihat panduan di `.env.example`).
3. Jalankan `docker-compose -f docker-compose.dev.yml up -d --build`.
4. Jalankan migrasi dan seed:
   ```bash
   docker exec satya_app_dev npx knex migrate:latest
   docker exec satya_app_dev npx knex seed:run
   ```

## 🌿 Branching Strategy

Kami menggunakan variasi sederhana dari Git Flow:
- `main`: Selalu stabil, mencerminkan apa yang ada di Production.
- `feat/nama-fitur`: Untuk pengembangan fitur baru.
- `fix/nama-bug`: Untuk perbaikan bug.
- `hotfix/nama-bug`: Untuk perbaikan kritis langsung ke main.

Gunakan huruf kecil dan kebab-case (misal: `feat/internal-monitoring-dashboard`).

## ✍️ Gaya Kode (Code Style)

- **Backend**: Kami menggunakan ES6+ standard. Perhatikan penggunaan Async/Await. Kami juga menerapkan pattern Facade untuk Repositori dan optimasi query DB guna menghindari isu N+1.
- **Frontend**: Kami menggunakan React, TailwindCSS, dan Framer Motion. Pecah komponen yang terlalu panjang ke dalam sub-komponen modular.
- **Linting**: Pastikan menjalankan linter sebelum commit: `npm run lint`.

## 🧪 Pengujian (Testing)

Setiap fitur baru dan perbaikan bug wajib disertai Unit/Integration Test:
```bash
# Menjalankan seluruh test suite
npm test

# Menjalankan test pada file tertentu
npm test -- --testPathPattern=authFlow
```
Semua test integration backend kami berjalan pada Database terisolasi sehingga perlu dipastikan state database clean di akhir test.

## 🚀 Mengajukan Pull Request (PR)

1. Pastikan seluruh test lulus dengan menjalankan `npm test`.
2. Push branch Anda ke repository remote.
3. Buka Pull Request menuju branch `main`.
4. Tulis deskripsi PR secara rinci, jelaskan "Kenapa" perubahan ini dibuat, dan sertakan tautan ke issue terkait jika ada.
5. Tunggu proses Code Review (minimal 1 approved reviewer).

Terima kasih atas kontribusi Anda untuk sistem keadilan yang lebih baik!
