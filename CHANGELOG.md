# Changelog

Semua perubahan yang mencolok pada proyek ini akan didokumentasikan dalam file ini.

Format didasarkan pada [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), dan proyek ini mematuhi [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
