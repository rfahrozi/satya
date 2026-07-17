# SATYA — Matriks Verifikasi Aktual dan Rencana Pemulihan

## Kesimpulan

Source inventory aktual sudah tersedia, tetapi working tree berada dalam kondisi WIP dan modul internal monitoring belum dapat dianggap runnable. Route internal sudah diregister, sementara beberapa controller, repository, validator, generator, dan dashboard service yang diimpor belum tersedia. Prioritas pertama bukan menambah fitur baru, melainkan memulihkan module graph sampai aplikasi dapat start dan test baseline lulus.

## Matriks

| Area | Komponen | Status | Prioritas | Masalah | Tindakan |
|---|---|---|---|---|---|
| Git baseline | Branch dan commit | EXISTS | P0 | Working tree tidak bersih; hasil audit mencakup perubahan yang belum menjadi commit. | Buat branch feature dan checkpoint commit terpisah sebelum refactor. |
| Repository hygiene | Working tree | BROKEN | P0 | Baseline tidak reproducible dan perubahan internal monitoring belum terlindungi histori Git. | Commit WIP secara terstruktur atau stash; jangan lanjut di main dengan file untracked. |
| Runtime verification | Build dan test execution | MISSING | P0 | Keberadaan 26 test tidak membuktikan aplikasi dapat start atau test lulus. | Jalankan audit ulang dengan --run-tests dan simpan output lengkap. |
| Internal monitoring | Migration foundation | PARTIAL | P0 | File masih untracked dan belum diuji migrate/down/up. | Review skema, jalankan migration pada DB kosong dan clone data existing. |
| Internal monitoring | Route registration | BROKEN | P0 | Route langsung memuat controller yang tidak tersedia pada tree. | Lengkapi module graph sebelum route diregister, atau feature-flag route sementara. |
| Internal monitoring | internalMonitoringRoutes.js | BROKEN | P0 | Mengimpor internalMonitoringMasterController, internalMonitoringController, dan internalMonitoringDashboardController yang tidak ditemukan. | Implementasikan controller atau ubah route agar hanya mengekspor endpoint yang sudah siap. |
| Internal monitoring | internalMonitoringService.js | BROKEN | P0 | Mengimpor repository dan validator yang tidak ditemukan. | Buat internalMonitoringRepo.js dan internalMonitoringValidator.js beserta unit test. |
| Internal monitoring | internalMonitoringRepo.js | MISSING | P0 | Service tidak dapat dimuat. | Implementasikan repository untuk master, period, target, history, activity, dan dashboard. |
| Internal monitoring | Operational controller | MISSING | P0 | Seluruh endpoint period/target/upload/review tidak dapat dijalankan. | Implementasikan controller tipis yang memanggil service. |
| Internal monitoring | Master controller | MISSING | P0 | Endpoint unit, position, package, item, assignment tidak dapat dijalankan. | Buat controller khusus domain PT internal; jangan mencampur dengan master PN. |
| Internal monitoring | Dashboard controller/service | MISSING | P1 | Endpoint executive, operational, my, heatmap, trends tidak dapat dijalankan. | Tunda sampai vertical slice operasional stabil, lalu implementasikan query agregat. |
| Internal monitoring | Generator service | MISSING | P0 | Tidak ada engine idempotent untuk membuat target. | Implementasikan preview, natural key, transaction, snapshot, dan concurrency guard. |
| Auth | Role scope mapping | PARTIAL | P0 | Masih berbasis role global; belum berdasarkan assignment/capability per target. | Tambahkan target-level authorization dan object-level access checks. |
| Period | Monthly/quarterly/semesterly/annually | EXISTS | P1 | Implementasi ini berasal dari domain laporan PN dan belum cukup untuk seluruh checklist internal. | Reuse bagian periodik, jangan duplikasi. |
| Period | On-change, continuous, event + recap | MISSING | P0 | CHK tahunan-saat-perubahan, kewajiban kontinu, dan perkara per-kejadian tidak dapat digenerate. | Tambahkan trigger_type, monitoring_events, event occurrences, dan recap parent. |
| Deadline | Deadline per report type/period type | EXISTS | P1 | Belum mencakup hari kerja, regulator override, effective dating, atau aturan komposit. | Ekstensikan menjadi rule engine, bukan hanya day_of_period. |
| Workflow | Upload/reupload | PARTIAL | P0 | Master memerlukan multi-evidence dan tipe FILE/URL/TEXT/NUMBER/DATE/BOOLEAN. | Pisahkan monitoring_evidence dari report_submissions. |
| Workflow | Approval accountable owner | MISSING | P0 | Pengesah/pemilik akuntabilitas pada master tidak terwakili. | Tambah submit, approve, return-revision, dan stage-aware resubmit. |
| Workflow | Reject | BROKEN | P0 | Tidak sesuai workflow fase 1 yang dikunci: ketidaksesuaian memakai REVISION_REQUIRED; cancel/NA memakai governance. | Hapus endpoint reject atau ubah menjadi controlled cancellation dengan permission berbeda. |
| Workflow | Follow-up | MISSING | P0 | Tindak lanjut checklist tidak dapat ditugaskan, dilacak, diverifikasi, atau ditutup. | Buat monitoring_follow_ups dan state machine terpisah. |
| Frontend | Internal monitoring UI | MISSING | P1 | Tidak tersedia workspace tugas, target detail, period generation, atau review internal. | Mulai setelah API vertical slice stabil. |
| Testing | Internal monitoring tests | MISSING | P0 | Tidak ada test module graph, migration internal, generation, authorization, atau workflow internal. | Tambahkan smoke require app, migration test, service test, API integration, dan role matrix. |

## Critical path 48 jam pengembangan

### Tahap 1 — Bekukan baseline

1. Buat branch `feat/pt-internal-monitoring-foundation`.
2. Pisahkan commit:
   - dokumen;
   - migration;
   - route skeleton;
   - service skeleton;
   - perubahan existing report controller/routes.
3. Pastikan tidak ada file domain internal yang tersisa untracked.

### Tahap 2 — Pulihkan aplikasi agar boot

1. Tambahkan `internalMonitoringValidator.js`.
2. Tambahkan `internalMonitoringRepo.js`.
3. Tambahkan:
   - `internalMonitoringMasterController.js`;
   - `internalMonitoringController.js`;
   - `internalMonitoringDashboardController.js`.
4. Untuk endpoint yang belum siap, return `501 NOT_IMPLEMENTED` secara eksplisit atau jangan daftarkan route.
5. Tambahkan smoke test `require('../../src/app')` dan health endpoint test.

### Tahap 3 — Jalankan verification gate

- backend install/test;
- frontend install/test/build;
- migration up/down/up;
- lint;
- app boot;
- route smoke;
- regression PN.

### Tahap 4 — Vertical slice pertama

Gunakan satu checklist bulanan:

`period → generate preview → generate target → evidence → submit → approve → verify/revision → activity log`

Follow-up ditambahkan sebelum vertical slice dinyatakan selesai.

## Command audit berikutnya

```bash
python satya_repo_audit.py "C:\My Project\satya"   --output "C:\My Project\satya-audit-2"   --run-tests
```

Tambahkan output command manual bila script berhenti karena dependency/environment:

```bash
npm ci
npm test -- --runInBand
npm run build

cd frontend
npm ci
npm test -- --runInBand
npm run build
```

## Exit criteria sebelum mengerjakan frontend internal

- working tree bersih;
- aplikasi backend boot;
- seluruh require module resolved;
- migration internal lulus up/down/up;
- period dan target API integration test lulus;
- authorization matrix lulus;
- regression PN lulus;
- OpenAPI/API contract dikunci;
- tidak ada endpoint route yang menunjuk method/controller kosong.
