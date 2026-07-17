# Checklist Eksekusi Proyek — Fitur Monev Dokumen Monitoring Internal PT (SATYA)

Dokumen ini dipakai sebagai panduan kerja proyek sebelum dan selama implementasi fitur monev dokumen monitoring internal Pengadilan Tinggi berbasis fitur existing SATYA. Fokusnya adalah memastikan tim memiliki urutan kerja yang jelas, pembagian tanggung jawab yang tegas, dan gerbang validasi sebelum pengkodean file baru dilanjutkan.

## Tujuan dokumen

Dokumen ini menyatukan tiga hal: checklist eksekusi per sprint, matriks RACI per peran tim, dan urutan kerja praktis dari kondisi proyek saat ini. Dengan dokumen ini, tim dapat langsung memakainya untuk koordinasi harian, monitoring progres mingguan, dan pengambilan keputusan sebelum masuk ke tahap coding lanjutan.

## Asumsi durasi

Rencana dibagi ke dalam enam sprint. Jika tim kecil atau tidak memakai scrum formal, setiap sprint tetap bisa dipakai sebagai fase berurutan.

## Peran tim

Peran yang dipakai dalam dokumen ini adalah sebagai berikut. PO/Bisnis bertugas memfinalkan kebutuhan dan penerimaan hasil. Tech Lead memimpin keputusan arsitektur. Backend Dev mengerjakan database, API, dan integrasi backend. Frontend Dev mengerjakan dashboard dan UI. DBA/Data Engineer meninjau skema, migration, dan performa query. QA/Tester menangani skenario uji dan regresi. DevOps/Infra bertanggung jawab pada staging, deployment, queue, storage, dan observability. Admin PT/User Kunci menjadi validator proses bisnis dan data master awal.

## Sprint 0 — Discovery, validasi scope, dan design gate

Tujuan sprint ini adalah memastikan desain sudah benar sebelum coding file baru dilanjutkan lebih jauh.

### Checklist Sprint 0

- [ ] Tulis ulang tujuan fitur dalam satu dokumen resmi.
- [ ] Finalkan ruang lingkup fase 1.
- [ ] Tegaskan pemisahan domain antara monitoring PN existing dan monev dokumen internal PT.
- [ ] Inventarisasi file existing SATYA yang akan direuse.
- [ ] Audit tabel existing yang benar-benar dipakai.
- [ ] Verifikasi skema `users`, `report_types`, `report_submissions`, `report_revision_logs`, dan `in_app_notifications`.
- [ ] Verifikasi role nyata pada `users.role`.
- [ ] Finalkan mapping role ke `ADMIN_PT`, `PIMPINAN_PT`, `UNIT_PIC`, dan `VERIFIER`.
- [ ] Finalkan daftar unit internal PT.
- [ ] Finalkan daftar jabatan/position.
- [ ] Finalkan package monitoring.
- [ ] Finalkan item checklist monitoring.
- [ ] Finalkan aturan assignment item ke unit/jabatan.
- [ ] Finalkan definisi status periode.
- [ ] Finalkan definisi status target.
- [ ] Finalkan transisi status yang sah.
- [ ] Finalkan keputusan bahwa submission file tetap reuse `report_submissions`.
- [ ] Finalkan keputusan integrasi dengan `reportService` existing.
- [ ] Review blueprint endpoint backend.
- [ ] Review kontrak request/response minimal untuk frontend.
- [ ] Buat daftar gap desain yang sengaja ditunda.
- [ ] Lakukan design review lintas tim.
- [ ] Tetapkan go/no-go untuk mulai coding sprint berikutnya.

### Output Sprint 0

- [ ] Dokumen kebutuhan bisnis final.
- [ ] Dokumen arsitektur integrasi final.
- [ ] Mapping role final.
- [ ] Matriks unit, jabatan, dan item final.
- [ ] Keputusan reuse `report_submissions` dan `reportService`.
- [ ] Signoff go/no-go.

## Sprint 1 — Finalisasi data model dan migration

Tujuan sprint ini adalah mengunci fondasi database agar aman sebelum service dan controller diperluas.

### Checklist Sprint 1

- [ ] Review migration `202607170001_internal_monitoring_foundation.js`.
- [ ] Pastikan semua foreign key valid terhadap skema nyata.
- [ ] Pastikan kolom tambahan pada `report_submissions` aman.
- [ ] Pastikan kolom tambahan pada `report_types` aman.
- [ ] Pastikan constraint unik pada `monitoring_targets` sesuai kebutuhan bisnis.
- [ ] Review nullability setiap kolom.
- [ ] Tambahkan atau validasi index untuk query dashboard.
- [ ] Siapkan rollback plan migration.
- [ ] Siapkan seed data awal untuk `internal_units`, `positions`, `monitoring_packages`, dan `monitoring_items`.
- [ ] Tentukan apakah seed assignment dilakukan lewat script atau admin UI.
- [ ] Jalankan migration di local.
- [ ] Jalankan migration di staging clone.
- [ ] Verifikasi tidak merusak data existing.
- [ ] Uji rollback migration.
- [ ] Dokumentasikan hasil validasi skema.

### Output Sprint 1

- [ ] Migration final tervalidasi.
- [ ] Strategi seed/master data.
- [ ] Checklist kompatibilitas DB existing.
- [ ] Hasil uji migrate dan rollback.

## Sprint 2 — Integrasi backend fondasi: route, auth, repo, validator

Tujuan sprint ini adalah membuat modul internal monitoring aktif di backend dengan fondasi yang stabil.

### Checklist Sprint 2

- [ ] Finalkan `internalMonitoringRoutes.js`.
- [ ] Pastikan `tenantContext` kompatibel untuk modul internal PT.
- [ ] Finalkan aturan penolakan akses role PN/non-PT.
- [ ] Finalkan validator enum dan payload.
- [ ] Finalkan `internalMonitoringRepo.js`.
- [ ] Cocokkan semua query dengan tabel nyata.
- [ ] Lengkapi query list units, positions, assignments, packages, items, periods, targets, target detail, global activity log, dan submission history by target.
- [ ] Pastikan semua import path benar.
- [ ] Tambahkan route baru ke `src/routes/index.js`.
- [ ] Uji seluruh endpoint master data dengan Postman/Insomnia.
- [ ] Uji akses role valid dan invalid.
- [ ] Uji validasi payload salah.
- [ ] Uji pagination dan filter dasar.

### Output Sprint 2

- [ ] Route backend aktif.
- [ ] Repository layer stabil.
- [ ] Validator stabil.
- [ ] Route terdaftar di master router.

## Sprint 3 — Flow bisnis inti: period, generation, target, upload, verify, revision

Tujuan sprint ini adalah membuat alur monev internal PT dapat dipakai end-to-end oleh Admin PT dan PIC unit.

### Checklist Sprint 3

- [ ] Finalkan `internalMonitoringService.js`.
- [ ] Finalkan `internalMonitoringController.js`.
- [ ] Finalkan `internalMonitoringGeneratorService.js`.
- [ ] Implementasikan create, update, open, dan close period.
- [ ] Implementasikan generate preview target.
- [ ] Implementasikan generate target final.
- [ ] Implementasikan reassign target.
- [ ] Integrasikan upload target dengan `reportService.uploadReportDocument()`.
- [ ] Pastikan hasil upload di-link ke `monitoring_target_id`, `scope_type = PT_INTERNAL`, `internal_unit_id`, dan `position_id`.
- [ ] Integrasikan download latest dengan `reportService.generatePresignedUrl()`.
- [ ] Integrasikan verify dengan `reportService.verifyAndNotify()`.
- [ ] Integrasikan request revision dengan `reportService.verifyAndNotify()`.
- [ ] Putuskan final apakah `reject` dipertahankan atau disamakan dengan `revisi`.
- [ ] Sinkronkan status target dan status submission.
- [ ] Catat activity log untuk generate target, upload, reupload, verify, revision, reject, dan reassign.
- [ ] Catat verification history.
- [ ] Uji seluruh alur backend end-to-end tanpa frontend.
- [ ] Uji role PIC, Admin PT, dan Pimpinan PT.
- [ ] Uji negative flow seperti verify tanpa submission, upload tanpa file, akses target unit lain, dan period tertutup.

### Output Sprint 3

- [ ] Alur operasional backend siap pakai.
- [ ] End-to-end API berjalan.
- [ ] Status bisnis dan log sinkron.

## Sprint 4 — Dashboard, query analitik, notifikasi, dan audit

Tujuan sprint ini adalah menyediakan visibilitas manajerial dan operasional.

### Checklist Sprint 4

- [ ] Finalkan `internalMonitoringDashboardService.js`.
- [ ] Finalkan `internalMonitoringDashboardController.js`.
- [ ] Implementasikan executive dashboard.
- [ ] Implementasikan operational dashboard.
- [ ] Implementasikan personal dashboard.
- [ ] Implementasikan compliance heatmap.
- [ ] Putuskan apakah trend dashboard dikerjakan di sprint ini atau ditunda.
- [ ] Finalkan query ranking unit.
- [ ] Finalkan query package compliance.
- [ ] Finalkan query overdue dan priority issues.
- [ ] Finalkan global activity log endpoint.
- [ ] Finalkan verification history endpoint.
- [ ] Finalkan kebijakan notifikasi in-app dan email.
- [ ] Pastikan notifikasi internal PT tidak bentrok dengan flow PN.
- [ ] Review penggunaan `in_app_notifications` untuk domain PT internal.
- [ ] Tambahkan logging error backend untuk flow monitoring internal.
- [ ] Uji performa query dashboard dasar.
- [ ] Uji filter, pagination, dan agregasi.

### Output Sprint 4

- [ ] Dashboard backend contract lengkap.
- [ ] Query analitik stabil.
- [ ] Audit log dan verification log siap dipakai frontend.

## Sprint 5 — Frontend operasional dan dashboard

Tujuan sprint ini adalah membuat fitur dapat digunakan oleh user nyata.

### Checklist Sprint 5

- [ ] Finalkan kontrak endpoint untuk frontend.
- [ ] Buat halaman dashboard pimpinan.
- [ ] Buat halaman dashboard admin.
- [ ] Buat halaman dashboard saya.
- [ ] Buat list target.
- [ ] Buat detail target.
- [ ] Buat form upload dan reupload.
- [ ] Buat panel verifikasi dan revisi.
- [ ] Buat period management.
- [ ] Buat master package dan item.
- [ ] Tambahkan filter periode, unit, package, dan status.
- [ ] Tampilkan histori revisi.
- [ ] Tampilkan activity log.
- [ ] Tampilkan indikator due dan overdue.
- [ ] Samakan label status dengan istilah backend.
- [ ] Uji UX dengan user kunci/Admin PT.
- [ ] Pastikan frontend baru tidak mematahkan flow frontend existing PN.

### Output Sprint 5

- [ ] UI operasional siap UAT.
- [ ] Dashboard siap dinilai user bisnis.
- [ ] Integrasi frontend-backend stabil.

## Sprint 6 — QA penuh, regresi, hardening, dan release readiness

Tujuan sprint ini adalah memastikan fitur aman dirilis tanpa merusak modul existing.

### Checklist Sprint 6

- [ ] Jalankan functional test penuh.
- [ ] Jalankan regression test pada modul PN existing.
- [ ] Uji migration di staging final.
- [ ] Uji rollback skenario buruk.
- [ ] Uji upload file berbagai format valid.
- [ ] Uji file invalid dan file terlalu besar.
- [ ] Uji akses role yang tidak berhak.
- [ ] Uji beberapa target dalam satu periode.
- [ ] Uji period open/close.
- [ ] Uji reminder/notifikasi.
- [ ] Uji dashboard dengan data realistis.
- [ ] Review query lambat.
- [ ] Review log error.
- [ ] Review queue status jika email aktif.
- [ ] Perbaiki bug prioritas tinggi.
- [ ] Siapkan SOP Admin PT.
- [ ] Siapkan panduan data setup awal.
- [ ] Lakukan UAT dengan user kunci.
- [ ] Ambil signoff bisnis.
- [ ] Siapkan release checklist.
- [ ] Jadwalkan deploy bertahap.

### Output Sprint 6

- [ ] Hasil QA dan UAT.
- [ ] Release checklist.
- [ ] Signoff untuk deploy.

## Matriks RACI

Keterangan: **R** = Responsible, **A** = Accountable, **C** = Consulted, **I** = Informed.

### 1. Finalisasi kebutuhan bisnis dan scope

| Aktivitas | PO/Bisnis | Tech Lead | Backend | Frontend | DBA | QA | DevOps | Admin PT |
|---|---|---|---|---|---|---|---|---|
| Finalisasi tujuan fitur | A | C | I | I | I | I | I | R |
| Finalisasi scope fase 1 | A | R | C | C | I | I | I | C |
| Finalisasi daftar unit/jabatan/item | A | C | I | I | I | I | I | R |
| Finalisasi role bisnis | A | C | C | I | I | I | I | R |

### 2. Audit repo dan skema existing

| Aktivitas | PO/Bisnis | Tech Lead | Backend | Frontend | DBA | QA | DevOps | Admin PT |
|---|---|---|---|---|---|---|---|---|
| Audit file existing SATYA | I | A | R | C | C | I | I | I |
| Audit tabel existing | I | C | R | I | A | I | I | I |
| Verifikasi role pada users | I | C | R | I | C | I | I | A |
| Matriks asumsi vs fakta | I | A | R | I | C | I | I | C |

### 3. Desain arsitektur dan model data

| Aktivitas | PO/Bisnis | Tech Lead | Backend | Frontend | DBA | QA | DevOps | Admin PT |
|---|---|---|---|---|---|---|---|---|
| Keputusan reuse `report_submissions` | I | A | R | I | C | I | I | C |
| Finalisasi arsitektur integrasi | I | A | R | C | C | I | I | I |
| Finalisasi skema tabel baru | I | C | R | I | A | I | I | C |
| Finalisasi enum/status | C | A | R | C | C | C | I | C |
| Review migration | I | C | R | I | A | C | I | I |

### 4. Routing, auth, dan backend foundation

| Aktivitas | PO/Bisnis | Tech Lead | Backend | Frontend | DBA | QA | DevOps | Admin PT |
|---|---|---|---|---|---|---|---|---|
| Finalisasi route internal monitoring | I | A | R | I | I | C | I | I |
| Mapping tenantContext ke role internal PT | I | A | R | I | I | C | I | C |
| Validator payload backend | I | C | A/R | I | I | C | I | I |
| Repository query dasar | I | C | R | I | A | C | I | I |

### 5. Flow bisnis inti backend

| Aktivitas | PO/Bisnis | Tech Lead | Backend | Frontend | DBA | QA | DevOps | Admin PT |
|---|---|---|---|---|---|---|---|---|
| Period management | C | A | R | I | C | C | I | C |
| Target generation | C | A | R | I | C | C | I | C |
| Upload target document | I | A | R | I | C | C | C | I |
| Verify/revision/reject | C | A | R | I | I | C | I | C |
| Sinkronisasi ke reportService | I | A | R | I | C | C | I | I |
| Activity dan verification log | I | C | R | I | C | A | I | I |

### 6. Dashboard dan analytics

| Aktivitas | PO/Bisnis | Tech Lead | Backend | Frontend | DBA | QA | DevOps | Admin PT |
|---|---|---|---|---|---|---|---|---|
| Definisi KPI dashboard | A | C | C | C | I | I | I | R |
| Query executive dashboard | I | A | R | I | C | C | I | C |
| Query operational dashboard | I | A | R | I | C | C | I | C |
| Heatmap dan trend | C | A | R | C | C | C | I | I |

### 7. Frontend

| Aktivitas | PO/Bisnis | Tech Lead | Backend | Frontend | DBA | QA | DevOps | Admin PT |
|---|---|---|---|---|---|---|---|---|
| Desain halaman dashboard | C | C | I | A/R | I | C | I | C |
| Halaman list/detail target | I | C | C | A/R | I | C | I | C |
| Form upload dan verifikasi | I | C | C | A/R | I | C | I | C |
| Integrasi API ke frontend | I | C | C | A/R | I | C | I | I |

### 8. Testing, regresi, dan release

| Aktivitas | PO/Bisnis | Tech Lead | Backend | Frontend | DBA | QA | DevOps | Admin PT |
|---|---|---|---|---|---|---|---|---|
| Test case fungsional | I | C | C | C | I | A/R | I | C |
| Regression test modul PN | I | C | C | C | I | A/R | I | I |
| UAT bisnis | A | I | I | I | I | C | I | R |
| Deploy staging | I | I | I | I | I | I | A/R | I |
| Deploy production | I | C | I | I | I | I | A/R | I |
| Go-live signoff | A | C | I | I | I | C | I | R |

## Checklist siap pakai per peran

### Checklist PO/Bisnis

- [ ] Menyetujui scope fase 1.
- [ ] Menyetujui role bisnis.
- [ ] Menyetujui package dan item checklist.
- [ ] Menyetujui KPI dashboard.
- [ ] Menyetujui hasil UAT.
- [ ] Memberikan signoff go-live.

### Checklist Tech Lead

- [ ] Menyetujui arsitektur reuse `reportService`.
- [ ] Menyetujui desain migration.
- [ ] Menyetujui integrasi auth/tenant.
- [ ] Menyetujui strategi logging dan rollback.
- [ ] Menyetujui readiness sebelum release.

### Checklist Backend Dev

- [ ] Menyelesaikan migration final.
- [ ] Menyelesaikan repository final.
- [ ] Menyelesaikan service final.
- [ ] Menyelesaikan controller final.
- [ ] Menyelesaikan route registration.
- [ ] Menyelesaikan integration test backend.

### Checklist Frontend Dev

- [ ] Menyetujui kontrak API.
- [ ] Menyelesaikan dashboard admin.
- [ ] Menyelesaikan dashboard pimpinan.
- [ ] Menyelesaikan halaman target saya.
- [ ] Menyelesaikan upload dan verifikasi flow.
- [ ] Menyelesaikan handling error state.

### Checklist QA

- [ ] Menulis test case positif.
- [ ] Menulis test case negatif.
- [ ] Menulis regression checklist.
- [ ] Menjalankan API test.
- [ ] Menjalankan UI test.
- [ ] Menjalankan UAT support.

### Checklist DevOps

- [ ] Menyediakan environment staging.
- [ ] Menjalankan migration staging.
- [ ] Menyediakan akses log.
- [ ] Memastikan MinIO dan queue berjalan.
- [ ] Menyiapkan backup sebelum production.
- [ ] Menyiapkan rollback plan deploy.

### Checklist Admin PT / User Kunci

- [ ] Memvalidasi unit internal.
- [ ] Memvalidasi jabatan.
- [ ] Memvalidasi assignment item.
- [ ] Memvalidasi flow operasional.
- [ ] Memvalidasi dashboard.
- [ ] Menyetujui hasil UAT.

## Urutan eksekusi praktis dari kondisi proyek saat ini

### Gelombang 1 — Penutupan desain

- [ ] Verifikasi role existing nyata.
- [ ] Verifikasi skema `report_submissions` dan `report_types`.
- [ ] Finalkan rules bisnis upload, verify, dan revisi.
- [ ] Finalkan daftar item checklist dan assignment.

### Gelombang 2 — Backend core

- [ ] Tuntaskan `internalMonitoringRepo.js`.
- [ ] Review ulang `internalMonitoringService.js`.
- [ ] Review ulang `internalMonitoringController.js`.
- [ ] Tuntaskan `internalMonitoringGeneratorService.js`.
- [ ] Tuntaskan `internalMonitoringDashboardService.js`.
- [ ] Daftarkan route ke `src/routes/index.js`.

### Gelombang 3 — Uji backend

- [ ] Test migration.
- [ ] Test master data.
- [ ] Test period/generation.
- [ ] Test upload/download.
- [ ] Test verify/revisi.
- [ ] Test dashboard endpoints.

### Gelombang 4 — Frontend

- [ ] Buat halaman admin.
- [ ] Buat halaman pimpinan.
- [ ] Buat halaman PIC.
- [ ] Uji end-to-end.

### Gelombang 5 — Release

- [ ] UAT.
- [ ] Signoff staging.
- [ ] Deploy production.
- [ ] Monitoring pasca go-live.

## Cara memakai dokumen ini

Gunakan checklist sprint sebagai alat monitoring mingguan, gunakan RACI untuk memperjelas tanggung jawab lintas tim, dan gunakan checklist per peran sebagai kontrol kerja harian masing-masing anggota. Pada akhir setiap sprint, pastikan semua item yang belum selesai dipindahkan ke backlog sprint berikutnya dengan catatan risiko dan dependensi yang jelas.