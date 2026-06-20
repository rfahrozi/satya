# Sistem MONEV PT. Kepulauan Riau (SATYA)

Aplikasi Monitoring dan Evaluasi (MONEV) berbasis web untuk Pengadilan Tinggi Kepulauan Riau. Proyek ini dibangun dengan Node.js (Express), React (Vite), PostgreSQL, dan berbagai teknologi modern lainnya.

---

## Pembaharuan Fitur Terbaru (Berdasarkan Laporan Evaluasi)

Berdasarkan analisis evaluasi sistem, telah dilakukan pembaruan dan penambahan berbagai fitur kritikal (Feature Gaps) untuk memastikan sistem ini *enterprise-ready* dan dapat dioperasikan secara penuh tanpa hambatan teknis. 

Berikut adalah rincian fitur-fitur baru yang telah diimplementasikan:

### 1. Manajemen Data Master (Master Data Management)
- **Deskripsi:** Menambahkan fungsionalitas CRUD penuh (Create, Read, Update, Delete) untuk mengelola data master, yang meliputi:
  - Jenis Laporan (`report_types`)
  - Satuan Kerja (`satkers`)
  - Konfigurasi Batas Waktu / Deadline (`deadline_configs`)
- **Dampak:** Admin PT kini memiliki antarmuka khusus untuk mengatur kebijakan laporan dan satker baru tanpa perlu menunggu _database engineer_ melakukan _seeding_ atau mengubah skema database secara manual.

### 2. Audit Trail & Riwayat Revisi Dokumen
- **Deskripsi:** Implementasi sistem rekam jejak (Audit Trail) melalui tabel log khusus (`report_revision_logs`). Sistem kini mencatat seluruh riwayat revisi, termasuk siapa yang mengubah, kapan dokumen diunggah, versi dokumen lama, dan catatan revisi admin.
- **Dampak:** Mencegah hilangnya konteks historis saat Satker mengunggah ulang (menimpa) laporan yang salah. Pimpinan dan Admin dapat melihat seberapa sering suatu Satker melakukan perbaikan untuk evaluasi kualitas kinerja.

### 3. Ekspor Laporan Rekapitulasi (Excel / PDF)
- **Deskripsi:** Mengintegrasikan kapabilitas unduh (Export) pada dashboard rekapitulasi dan _heatmap_ kepatuhan. Pengguna kini dapat mencetak laporan dalam bentuk **Microsoft Excel (.xlsx)** maupun **PDF**.
- **Dampak:** Memudahkan pembuatan laporan fisik atau dokumen lampiran resmi untuk rapat pimpinan secara berjenjang (misalnya untuk dikirimkan ke Mahkamah Agung).

### 4. Sistem Penilaian Kinerja (Scoring & Grading)
- **Deskripsi:** Evaluasi tidak lagi sebatas status "Belum Lengkap", "Lengkap", atau "Revisi", namun telah dilengkapi dengan parameter nilai angka (score `0-100`) untuk menilai kualitas akurasi dan ketepatan waktu.
- **Dampak:** Sistem MONEV kini memiliki klasemen (_Leaderboard_) kinerja tiap Satker yang dapat digunakan oleh Pimpinan sebagai instrumen kebijakan _reward and punishment_.

### 5. Notifikasi Dalam Aplikasi (In-App Notification)
- **Deskripsi:** Menambahkan fitur notifikasi _real-time_ secara langsung pada _interface_ aplikasi web (berupa ikon lonceng/bell), sebagai pelengkap notifikasi email *background job* via BullMQ.
- **Dampak:** Proses perbaikan laporan oleh Satker menjadi jauh lebih responsif, karena Satker dapat segera melihat jika laporan mereka ditolak atau membutuhkan revisi tanpa harus membuka _email_ atau mencari di daftar laporan.

### 6. Diferensiasi Dashboard (Pimpinan vs Admin PT)
- **Deskripsi:** Memisahkan tampilan (_View_) dashboard antara role `ADMIN_PT` dan `PIMPINAN`.
  - **Admin PT:** Mendapatkan tampilan antrean (_queue_) operasional yang *actionable* (tombol periksa/verifikasi, detail catatan, dsb).
  - **Pimpinan:** Mendapatkan tampilan _Executive Summary_, grafik tren performa, dan klasemen/ranking Satker.
- **Dampak:** Pimpinan memiliki akses langsung ke poin-poin evaluasi yang paling esensial (manajerial) tanpa terganggu oleh detail teknis operasional.

### 7. Peningkatan Antarmuka Pengguna (UI) & Animasi
- **Deskripsi:** Merombak Landing Page dengan menambahkan pustaka `framer-motion` untuk *scroll reveal animations*, *staggered text*, serta menyempurnakan aspek visual menggunakan pendekatan desain modern (Glassmorphism, Shimmer effects).
- **Dampak:** Pengalaman pengguna (UX) yang sangat berkelas sejak pandangan pertama, memberikan citra yang lebih profesional bagi institusi.

### 8. Peningkatan Kualitas Kode & Test Coverage (>80%)
- **Deskripsi:** Sistem ini sekarang dilindungi oleh ratusan *Unit Test* dan *Integration Test* berbasis Jest dan RTL (React Testing Library).
- **Cakupan Pengujian:**
  - **Backend:** 100% Passed, coverage mencapai >85% (Statements & Lines).
  - **Frontend:** 100% Passed, coverage mencapai >80% (Statements & Lines).
- **Dampak:** Memastikan aplikasi bebas *bug* kritis sebelum peluncuran (_deployment_) dan stabil untuk pengembangan jangka panjang.

---

## Teknologi yang Digunakan
- **Backend:** Node.js (Express), Knex.js, Jest, Supertest
- **Frontend:** React.js, Vite, TailwindCSS v4, Framer Motion, React Testing Library
- **Database:** PostgreSQL
- **Penyimpanan Berkas:** MinIO (S3 Compatible Object Storage)
- **Background Jobs:** Redis, BullMQ (untuk email dan reminder)
