# Changelog

Semua perubahan yang mencolok pada proyek ini akan didokumentasikan dalam file ini.

Format didasarkan pada [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), dan proyek ini mematuhi [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.1.1] - 2026-07-20
### Added
- **Batch Verification**: Fitur untuk melakukan verifikasi (Approval/Verify) pada puluhan dokumen sekaligus, menyederhanakan *bottleneck* kerja Tim Mutu & Admin.
- **Weekly Digest Email**: Otomatis merangkum notifikasi dokumen tertunda (*Overdue*, *Revision*) menjadi satu surel mingguan anti-spam melalui `weeklyDigestScheduler.js`.
- **Quick Copy GDrive URL**: Fitur salin tautan antar kriteria pada komponen *EvidenceEditor* untuk mempersingkat alur unggah.
- **Smart Period Generator Filter**: *InternalMonitoringGeneratorService* kini memfilter tipe kriteria secara cerdas (contoh: Kriteria Tahunan hanya di-generate jika Admin membuat periode siklus Tahunan/Desember).

### Changed
- **UI Master Data & Dashboard**: Peralihan antarmuka dari *Light Mode* ke *Dark Mode* penuh (Slate/Navy blue), termasuk integrasi pemilih *Dropdown* Siklus di Formulir Pembuatan Periode.
- **Master Evidence Requirement Extraction**: *Monitoring Evidence Requirements* tak lagi menggunakan *template dummy*, melainkan secara persis disinkronisasikan dari parsing data JSON yang diekstrak langsung via skrip Python terhadap dokumen Excel Resmi Pengadilan Tinggi.

### Fixed
- **SQL Injection**: Menambal celah *Raw String Interpolation* menggunakan *parameterized bindings* di fungsi pengisian catatan (`internalMonitoringEscalationService.js`).
- **Authorization Bypass**: Menghapus duplikasi endpoint `/master-imports/preview` tanpa Middleware Auth (*Route Shadow*).
- **Metric Exposure**: Endpoint Prometheus `/metrics` diproteksi menggunakan token otentikasi.
- **OOM Crash (MinIO)**: Memperbaiki kesalahan relasi object-key pada `internalMonitoringService.js` sehingga payload metadata tersimpan pada struktur EAV database dengan benar.
- **Production CMD Crash**: Memperbaiki deklarasi argumen `CMD ["npm", "run", "start:api"]` pada berkas `Dockerfile.prod`.

## [2.1.0] - 2026-07-18
### Added
- **Internal Monitoring PT**: Fitur utama untuk monitoring 295 item checklist mandiri PT berdasarkan Standar AMPUH, PMPZI, dan AKIP.
- **Workflow State Machine**: Penerapan workflow ketat (Not Started -> In Progress -> Approval -> Verification -> Revision/Verified).
- **Risk Governance & Dashboard**: Heatmap interaktif untuk level risiko dan metrik kepatuhan.
- **Queue/Follow Up**: Sistem follow-up berbasis tiket otomatis akibat eskalasi temuan mutlak.

### Changed
- **Pemisahan Modul Repo**: Pemecahan file *God Object* `internalMonitoringRepo.js` menjadi `masterRepo`, `targetRepo`, `evidenceRepo`, dan `dashboardRepo` untuk optimisasi test dan pembacaan yang lebih bersih.
- **Checklist Config Master**: Pemusatan "Magic Number" dalam `src/constants/checklistConfig.js` sehingga sinkron dengan master PDF-5 Final.
- **Logging Management**: Menggantikan standard console.error menggunakan *Structured Logger* dengan `winston`.

### Fixed
- **Keamanan (Security)**: Perbaikan kerentanan CORS terbuka (whitelist strict).
- **Rate Limiter**: Pemisahan `loginLimiter` dan `passwordLimiter` yang di-hardening khusus mencegah Brute-force & Exhaustion Token Attack.
- **File Validation**: Pengetatan keamanan *Upload Multipart MIME-Type* berbasis pengecekan Magic Bytes.

## [2.0.0] - 2026-06-20
### Added
- Dual-track external (Pelaporan PN ke PT).
- Integrasi *Object Storage* MinIO.

## [1.0.0] - 2024-01-01
### Added
- Inisialisasi *Initial Schema* Database aplikasi.
