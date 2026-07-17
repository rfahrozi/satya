# SATYA — Vertical Slice 01, Tahap 3
## Dashboard, Notifikasi, Frontend Operasional, Hardening, dan Release Gate

Tahap ini dimulai setelah evidence, submit, approval, revision, verification, dan follow-up telah lulus integration test.

---

## 1. Tujuan

Mengubah vertical slice backend menjadi fitur yang dapat dipakai oleh pengguna nyata:

```text
Admin membuka periode
→ generate target
→ Collector melihat tugas
→ Collector melengkapi evidence
→ Approver menilai
→ Verifier memverifikasi
→ Follow-up ditangani
→ Pimpinan melihat ringkasan
```

Tahap ini belum memperluas jenis frekuensi. Fokusnya menutup satu alur bulanan sampai siap UAT.

---

## 2. Gate Masuk

Semua syarat berikut harus lulus:

```text
[ ] Migration vertical slice lulus up/down/up
[ ] Generator bulanan idempotent
[ ] Evidence typed dan versioned berjalan
[ ] Submit, approval, revision, resubmit, verify berjalan
[ ] Follow-up lifecycle berjalan
[ ] Object-level authorization lulus
[ ] Optimistic locking lulus
[ ] Activity log lengkap
[ ] Regression PN lulus
```

Jika satu syarat gagal, jangan mulai frontend.

---

## 3. Backend Read Model dan Dashboard

### 3.1 Endpoint minimum

```text
GET /internal-monitoring/dashboard/my
GET /internal-monitoring/dashboard/operational
GET /internal-monitoring/dashboard/executive
GET /internal-monitoring/review-queue
GET /internal-monitoring/follow-up-queue
```

### 3.2 Query parameters

```text
period_id
unit_id
position_id
status
due_state
has_open_follow_up
page
page_size
sort
```

### 3.3 Response `dashboard/my`

```json
{
  "summary": {
    "total": 12,
    "notStarted": 2,
    "inProgress": 3,
    "awaitingApproval": 2,
    "awaitingVerification": 1,
    "revisionRequired": 1,
    "verified": 3,
    "overdue": 2,
    "openFollowUps": 1
  },
  "urgentTargets": [],
  "recentActivities": []
}
```

### 3.4 Response `dashboard/operational`

```json
{
  "summary": {
    "totalTargets": 51,
    "verified": 30,
    "overdue": 4,
    "revisionRequired": 3,
    "awaitingVerification": 5,
    "openFollowUps": 2
  },
  "byUnit": [],
  "reviewQueue": [],
  "followUpQueue": []
}
```

### 3.5 Response `dashboard/executive`

```json
{
  "complianceRate": 88.24,
  "verifiedOnTimeRate": 74.51,
  "overdueCount": 4,
  "openFollowUpCount": 2,
  "byUnit": [],
  "criticalItems": []
}
```

### 3.6 KPI definitions

```text
compliance_rate =
  VERIFIED targets / applicable targets × 100

verified_on_time_rate =
  targets verified before or on due_at / applicable targets × 100

applicable targets exclude:
  CANCELLED
  NOT_APPLICABLE
```

Jangan mencampur target belum jatuh tempo dengan target terlambat.

### 3.7 Repository methods

```js
getMyDashboard(userId, periodId, filters, trx)
getOperationalDashboard(periodId, filters, trx)
getExecutiveDashboard(periodId, filters, trx)
listReviewQueue(actor, filters, pagination, trx)
listFollowUpQueue(actor, filters, pagination, trx)
```

Gunakan query agregat; hindari N+1.

---

## 4. Notification Domain

Gunakan in-app notification existing. Email dapat diaktifkan setelah template dan queue stabil.

### 4.1 Event minimum

```text
TARGET_ASSIGNED
TARGET_DUE_SOON
TARGET_OVERDUE
TARGET_SUBMITTED
TARGET_AWAITING_APPROVAL
TARGET_APPROVED
TARGET_AWAITING_VERIFICATION
TARGET_REVISION_REQUESTED
TARGET_VERIFIED
FOLLOW_UP_ASSIGNED
FOLLOW_UP_DUE_SOON
FOLLOW_UP_REOPENED
```

### 4.2 Recipient rules

```text
TARGET_ASSIGNED
→ Collector, Supporting PIC

TARGET_SUBMITTED
→ Approver / Accountable Owner

TARGET_APPROVED
→ Verifier

TARGET_REVISION_REQUESTED
→ Collector

TARGET_VERIFIED
→ Collector, Approver, Supervisor

FOLLOW_UP_ASSIGNED
→ Follow-up owner

FOLLOW_UP_REOPENED
→ Follow-up owner
```

### 4.3 Delivery reliability

Notification tidak boleh menyebabkan transaction bisnis gagal.

Pola yang disarankan:

```text
business transaction
→ insert activity
→ insert notification outbox
→ commit
→ worker mengirim in-app/email
```

Jika outbox belum dibuat, minimal gunakan retry-safe notification insert dengan idempotency key.

Contoh key:

```text
TARGET_SUBMITTED:{targetId}:{lockVersion}
```

---

## 5. Frontend Structure

Tambahkan area terpisah agar tidak mengganggu portal PN.

```text
frontend/src/features/internalMonitoring/
  api/
    internalMonitoringApi.js
  components/
    StatusBadge.jsx
    DueBadge.jsx
    EvidenceEditor.jsx
    EvidenceHistory.jsx
    ActivityTimeline.jsx
    FollowUpPanel.jsx
    ReviewDecisionPanel.jsx
  pages/
    InternalMonitoringDashboard.jsx
    MyTargets.jsx
    TargetDetail.jsx
    PeriodManagement.jsx
    ReviewQueue.jsx
    FollowUpQueue.jsx
  hooks/
    useInternalMonitoringPermissions.js
  utils/
    status.js
    deadlines.js
```

### 5.1 Routes

```text
/internal-monitoring
/internal-monitoring/my-targets
/internal-monitoring/targets/:id
/internal-monitoring/periods
/internal-monitoring/review
/internal-monitoring/follow-ups
```

### 5.2 Route access

```text
Admin PT:
  dashboard, periods, all targets, review, follow-ups

Collector:
  dashboard/my, my-targets, assigned target detail

Approver:
  dashboard/my, review queue, assigned target detail

Verifier:
  dashboard/operational, review queue, follow-up queue

Pimpinan:
  dashboard/executive, read-only target detail
```

Frontend guard hanya untuk UX. Backend tetap menjadi authority utama.

---

## 6. Page Contracts

### 6.1 Internal Monitoring Dashboard

Tampilkan:

```text
status cards
overdue card
open follow-up card
urgent target table
recent activity
unit compliance summary
```

### 6.2 My Targets

Kolom:

```text
item code
item title
period
unit
capability
status
due date
late state
open follow-up
last activity
action
```

Filter:

```text
status
due state
period
unit
search
```

### 6.3 Target Detail

Bagian:

```text
target header
master snapshot
assignment snapshot
workflow status
due date
evidence requirements
evidence versions
submit/approve/verify panel
revision note
follow-up panel
activity timeline
```

UI harus membaca capability dari API, bukan menebak dari role.

Contoh:

```json
{
  "permissions": {
    "canEditEvidence": true,
    "canSubmit": true,
    "canApprove": false,
    "canVerify": false,
    "canRequestRevision": false,
    "canCreateFollowUp": false
  }
}
```

### 6.4 Period Management

Fungsi:

```text
create period
open period
preview generation
show warnings
generate targets
show created/skipped result
close period
```

Generation wajib mempunyai confirm dialog dan idempotency feedback.

### 6.5 Review Queue

Tampilkan:

```text
awaiting approval
awaiting verification
revision age
due state
submitter
last submission time
evidence completeness
```

### 6.6 Follow-up Queue

Tampilkan:

```text
owner
target
status
due date
overdue
resolution note
action
```

---

## 7. Frontend State dan API Handling

### 7.1 Error mapping

```text
401 → kembali ke login
403 → akses ditolak
404 → target tidak ditemukan
409 VERSION_CONFLICT → refresh data dan tampilkan konflik
422 EVIDENCE_INCOMPLETE → tampilkan requirement yang kurang
500 → generic error + correlation id
```

### 7.2 Mutation pattern

Setiap mutation:

1. disable button;
2. kirim `lockVersion`;
3. tampilkan loading state;
4. setelah sukses, refetch target detail;
5. jika 409, jangan retry otomatis;
6. tampilkan audit-friendly result.

### 7.3 Unsaved changes

Evidence editor harus:

```text
menandai draft belum tersimpan
memberi konfirmasi sebelum meninggalkan halaman
tidak menghapus file draft pada refresh tanpa pesan
```

---

## 8. File Security

Untuk evidence FILE:

```text
[ ] MIME type divalidasi server-side
[ ] Extension divalidasi
[ ] Size limit diterapkan
[ ] Object key tidak berasal langsung dari filename user
[ ] Filename asli disimpan sebagai metadata
[ ] Download memakai authorization target-level
[ ] Presigned URL short-lived
[ ] Content-Disposition aman
[ ] File checksum disimpan
```

Jangan mempercayai `Content-Type` dari browser.

---

## 9. Activity dan Observability

### 9.1 Activity events minimum

```text
PERIOD_CREATED
PERIOD_OPENED
TARGET_GENERATED
TARGET_ASSIGNED
EVIDENCE_CREATED
EVIDENCE_SUPERSEDED
TARGET_DRAFT_SAVED
TARGET_SUBMITTED
TARGET_APPROVED
TARGET_REVISION_REQUESTED
TARGET_RESUBMITTED
TARGET_VERIFIED
FOLLOW_UP_CREATED
FOLLOW_UP_STARTED
FOLLOW_UP_RESOLUTION_SUBMITTED
FOLLOW_UP_CLOSED
FOLLOW_UP_REOPENED
SOD_OVERRIDE_USED
```

### 9.2 Structured logging

Log minimal:

```text
request_id
actor_user_id
route
target_id
period_id
action
result
duration_ms
error_code
```

Jangan mencatat isi evidence sensitif atau token.

---

## 10. Performance Gate

Data uji minimum:

```text
51 monitoring items
12 bulan
10–30 user internal
1.000 activity records
beberapa evidence version per target
```

Target awal:

```text
dashboard my            < 500 ms
target detail           < 500 ms
operational dashboard   < 1 s
generation 51 targets   < 3 s
paginated list          < 500 ms
```

Gunakan `EXPLAIN ANALYZE` untuk query dashboard dan queue.

---

## 11. Test Plan

### Backend integration

```text
internalMonitoringDashboard.test.js
internalMonitoringNotification.test.js
internalMonitoringDownloadAuthorization.test.js
internalMonitoringPagination.test.js
```

### Frontend component

```text
InternalMonitoringDashboard.test.jsx
MyTargets.test.jsx
TargetDetail.test.jsx
EvidenceEditor.test.jsx
ReviewDecisionPanel.test.jsx
FollowUpPanel.test.jsx
PeriodManagement.test.jsx
```

### E2E

```text
admin creates period and generates target
collector completes evidence and submits
approver approves
verifier requests revision
collector resubmits
verifier verifies
verifier creates follow-up
owner resolves follow-up
verifier closes follow-up
pimpinan sees updated dashboard
```

### Regression

```text
PN login
PN upload
PN report history
PT verification existing
notification bell
forgot/reset password
```

---

## 12. Feature Flag dan Rollout

Gunakan:

```text
PT_INTERNAL_MONITORING_ENABLED=true|false
```

Backend:

```text
false → route dapat tidak diregister atau return 404
```

Frontend:

```text
false → menu internal monitoring tidak ditampilkan
```

Rollout:

```text
local
→ test
→ staging
→ UAT terbatas
→ production disabled
→ production enabled untuk admin
→ enable unit per unit
```

---

## 13. UAT Scenario

Peran minimal:

```text
ADMIN_PT
Collector
Approver / Accountable Owner
Verifier
Pimpinan
Follow-up Owner
```

Checklist UAT:

```text
[ ] Admin dapat membuka periode
[ ] Preview menampilkan assignment warning
[ ] Generate tidak menggandakan target
[ ] Collector hanya melihat target sendiri
[ ] Evidence dapat disimpan dan direvisi
[ ] Required evidence memblok submit
[ ] Approver hanya melihat antrean terkait
[ ] Revision note terlihat jelas
[ ] Verifier dapat menilai evidence version
[ ] Follow-up dapat diselesaikan
[ ] Dashboard berubah sesuai transaksi
[ ] Audit log dapat ditelusuri
```

---

## 14. Definition of Done Tahap 3

```text
[ ] Dashboard my/operational/executive berfungsi
[ ] Review queue berfungsi
[ ] Follow-up queue berfungsi
[ ] Notification in-app berfungsi
[ ] Frontend vertical slice selesai
[ ] Semua mutation menangani lockVersion
[ ] Download evidence terotorisasi
[ ] Performance gate lulus
[ ] E2E flow lulus
[ ] Regression PN lulus
[ ] Feature flag tersedia
[ ] UAT sign-off tersedia
[ ] Working tree bersih
```

---

## 15. Urutan Commit

```text
feat(dashboard): implement internal monitoring read models
feat(notification): emit internal monitoring workflow notifications
feat(frontend): add internal monitoring dashboard and target workspace
feat(frontend): add review and follow-up queues
feat(security): harden evidence download and object authorization
test(e2e): cover monthly internal monitoring vertical slice
chore(release): add feature flag and rollout configuration
docs(uat): add internal monitoring UAT scenarios
```

---

## 16. Tahap Setelah Vertical Slice 01

Setelah Tahap 3 lulus UAT:

```text
Tahap 4:
  perluas generator ke quarterly dan semesterly

Tahap 5:
  annual + change event
  continuous + monthly review
  event occurrence + monthly recap
  regulator calendar

Tahap 6:
  import dan coverage seluruh CHK-001–CHK-051
```

Jangan mengimpor seluruh 51 checklist sebelum vertical slice bulanan dinyatakan stabil.
