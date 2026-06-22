# SATYA (Sistem Administrasi dan Tata kelola Yudisial yang Akuntabel)

Aplikasi Monitoring dan Evaluasi (MONEV) berbasis web untuk Pengadilan Tinggi Kepulauan Riau. Proyek ini dibangun dengan Node.js (Express), React (Vite), PostgreSQL, dan berbagai teknologi modern lainnya.

---

## Pembaharuan Fitur Terbaru (Berdasarkan Laporan Evaluasi)

Berdasarkan analisis evaluasi sistem, telah dilakukan pembaruan dan penambahan berbagai fitur kritikal (Feature Gaps) untuk memastikan sistem ini _enterprise-ready_ dan dapat dioperasikan secara penuh tanpa hambatan teknis.

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

- **Deskripsi:** Menambahkan fitur notifikasi _real-time_ secara langsung pada _interface_ aplikasi web (berupa ikon lonceng/bell), sebagai pelengkap notifikasi email _background job_ via BullMQ.
- **Dampak:** Proses perbaikan laporan oleh Satker menjadi jauh lebih responsif, karena Satker dapat segera melihat jika laporan mereka ditolak atau membutuhkan revisi tanpa harus membuka _email_ atau mencari di daftar laporan.

### 6. Diferensiasi Dashboard (Pimpinan vs Admin PT)

- **Deskripsi:** Memisahkan tampilan (_View_) dashboard antara role `ADMIN_PT` dan `PIMPINAN`.
  - **Admin PT:** Mendapatkan tampilan antrean (_queue_) operasional yang _actionable_ (tombol periksa/verifikasi, detail catatan, dsb).
  - **Pimpinan:** Mendapatkan tampilan _Executive Summary_, grafik tren performa, dan klasemen/ranking Satker.
- **Dampak:** Pimpinan memiliki akses langsung ke poin-poin evaluasi yang paling esensial (manajerial) tanpa terganggu oleh detail teknis operasional.

### 7. Peningkatan Antarmuka Pengguna (UI), Aksesibilitas & Animasi

- **Deskripsi:** Merombak Landing Page dan Dashboard Pimpinan/Admin dengan animasi halus (_scroll reveal_, `framer-motion`), desain modern (_Glassmorphism_), komponen _Progress Bar_ kepatuhan yang memukau, serta memperbaiki standar aksesibilitas visual (tingkat kontras warna) untuk kenyamanan pimpinan.
- **Dampak:** Pengalaman pengguna (UX) yang sangat berkelas, informatif, dan memberikan citra profesional serta kenyamanan maksimal bagi pimpinan dalam mengevaluasi data Satker.

### 8. Peningkatan Kualitas Kode & Test Coverage (>90%)

- **Deskripsi:** Sistem ini sekarang dilindungi oleh ratusan _Unit Test_ dan _Integration Test_ secara ketat (berbasis Jest dan React Testing Library).
- **Cakupan Pengujian:**
  - **Backend:** 100% Passed, coverage mencapai **>90%** (Statements & Lines). Menutup skenario kelemahan koneksi (redis/db).
  - **Frontend:** 100% Passed, coverage mencapai **>90%** (Statements & Lines). Termasuk skenario kegagalan UI dan verifikasi _edge-cases_.
- **Dampak:** Memastikan aplikasi sangat stabil, reliabel, dan bebas hambatan kritis (_bugs_/_memory leaks_) untuk peluncuran (_deployment_) level _enterprise_ jangka panjang.

---

## Teknologi yang Digunakan

- **Backend:** Node.js (Express), Knex.js, Jest, Supertest
- **Frontend:** React.js, Vite, TailwindCSS v4, Framer Motion, React Testing Library
- **Database:** PostgreSQL
- **Penyimpanan Berkas:** MinIO (S3 Compatible Object Storage)
- **Background Jobs:** Redis, BullMQ (untuk email dan reminder)

Saran Pengembangan Selanjutnya (Roadmap Fase 3: Inovasi & AI)
Untuk membuat sistem MONEV ini menjadi State-of-the-Art dan menjadi percontohan (benchmark) bagi Pengadilan Tinggi lain di seluruh Indonesia, saya menyarankan beberapa fitur Advanced berikut untuk fase pengembangan selanjutnya:

A. Otomatisasi Verifikasi Berbasis AI (OCR / LLM)
Saat ini, Admin PT harus memverifikasi dokumen secara manual satu persatu.

Saran: Integrasikan sistem dengan modul Optical Character Recognition (OCR) dan Model Bahasa AI.
Use Case: Sistem dapat memindai file PDF yang diunggah secara otomatis untuk mendeteksi:
Apakah dokumen sudah ditandatangani dan dicap oleh Ketua Pengadilan Negeri setempat?
Apakah format tabel laporan sudah sesuai standar?
Dampak: Memangkas beban kerja verifikasi Admin PT hingga 70%. Dokumen yang jelas-jelas tidak ada tanda tangan bisa otomatis ditolak oleh sistem dalam hitungan detik.
B. Analitik Prediktif & Laporan Naratif Otomatis (Generative AI)
Dashboard agregat saat ini memberikan visualisasi statistik yang sangat bagus (Heatmap & Bar chart).

Saran: Tambahkan fitur "AI Executive Summary Generator" khusus untuk layar PIMPINAN.
Use Case: AI menganalisis data heatmap dan otomatis merangkum kalimat naratif seperti: "Pada bulan ini, PN Batam mengalami penurunan kepatuhan sebesar 15% pada laporan X. Disarankan untuk memberikan surat peringatan."
Dampak: Pimpinan tidak perlu menganalisis angka sendiri, cukup membaca narasi insight yang dihasilkan oleh AI secara otomatis.
C. Progressive Web App (PWA) & Push Notification Native
Aplikasi web saat ini sangat responsif, tetapi Pimpinan / Ketua Satker mungkin lebih banyak menggunakan smartphone.

Saran: Konversi frontend React/Vite menjadi Progressive Web App (PWA).
Use Case: Pengguna dapat menekan tombol "Install to Home Screen" di HP mereka tanpa melalui App Store / Play Store. Tambahkan fitur Web Push API via Service Worker untuk mengirimkan notifikasi pop-up persis seperti notifikasi WhatsApp.
Dampak: Aksesibilitas melonjak drastis, notifikasi jatuh tempo (deadline) tidak mungkin terlewat.
D. Single Sign-On (SSO) Mahkamah Agung
Saat ini sistem menggunakan manajemen user dan password mandiri (authController.js & bcryptjs).

Saran: Integrasikan autentikasi menggunakan protokol OAuth2 atau LDAP milik Mahkamah Agung RI.
Dampak: User (Pimpinan/Admin Satker) cukup login menggunakan NIP/Akun SIKEP mereka. Tidak perlu menghafal banyak password, keamanan terpusat.
E. Kolaborasi & Diskusi Dokumen Real-time
Saran: Ubah fitur "Catatan Admin" yang satu arah menjadi fitur Comment Thread interaktif.
Use Case: Saat Admin PT menolak laporan, mereka bisa menandai (highlight) bagian PDF yang salah, dan berdiskusi dengan Admin Satker di kolom komentar dokumen layaknya Google Docs.
Dampak: Menghilangkan kebiasaan "bertanya lewat WhatsApp" yang tidak tercatat di dalam sistem audit.
