# SATYA — Rencana Perbaikan Berikutnya
## Stabilization, Hardening, dan Release Readiness setelah Vertical Slice 01

Dokumen ini digunakan setelah alur bulanan end-to-end tersedia. Fokusnya menutup cacat, mengurangi risiko regresi, dan menyiapkan modul untuk UAT serta rollout bertahap.

## 1. Tujuan

Menjadikan modul internal monitoring:

```text
bootable
→ functionally complete
→ secure
→ observable
→ performant
→ testable
→ deployable
```

Prioritas:

```text
P0 = wajib sebelum UAT
P1 = wajib sebelum production
P2 = perbaikan lanjutan setelah rollout awal
```

# 2. P0 — Perbaikan sebelum UAT

## 2.1 Hilangkan seluruh endpoint skeleton

Cari:

```powershell
rg -n "501|NOT_IMPLEMENTED|TODO|FIXME|throw new Error|console\.log" src frontend/src tests
```

Kriteria:

```text
[ ] Tidak ada route aktif yang masih 501
[ ] Tidak ada controller kosong
[ ] Tidak ada service method yang hanya return null/[]
[ ] Tidak ada repository method generik tanpa filter domain
```

## 2.2 Audit state transition

Buat satu sumber kebenaran:

```text
src/domain/internalMonitoringStateMachine.js
```

```js
const TARGET_TRANSITIONS = {
  NOT_STARTED: ['IN_PROGRESS'],
  IN_PROGRESS: ['AWAITING_APPROVAL'],
  AWAITING_APPROVAL: ['AWAITING_VERIFICATION', 'REVISION_REQUIRED'],
  AWAITING_VERIFICATION: ['VERIFIED', 'REVISION_REQUIRED'],
  REVISION_REQUIRED: ['AWAITING_APPROVAL', 'AWAITING_VERIFICATION'],
  VERIFIED: [],
  CANCELLED: [],
  NOT_APPLICABLE: []
};
```

Kriteria:

```text
[ ] Controller tidak mengubah status langsung
[ ] Repository tidak menentukan transition
[ ] Semua transition melalui service
[ ] Invalid transition menghasilkan 409
[ ] Terminal state tidak dapat dimutasi
```

## 2.3 Perbaiki transaction boundary

Operasi atomic:

```text
generate target + assignee + activity
save evidence version + supersede previous + activity
submit + lock evidence + activity + notification outbox
approve + activity + notification outbox
request revision + review record + activity
verify + verification record + target update + follow-up + activity
follow-up close/reopen + activity
```

Cari write tanpa transaction:

```powershell
rg -n "knex\(|\.insert\(|\.update\(|\.delete\(" src/services src/controllers
```

Kriteria:

```text
[ ] Controller tidak melakukan write langsung
[ ] Service menerima trx
[ ] Error menyebabkan rollback
[ ] Notification tidak menggagalkan business transaction
```

## 2.4 Perbaiki object-level authorization

Gunakan:

```text
src/services/internalMonitoringAuthorizationService.js
```

Pemeriksaan:

```text
view target
edit evidence
submit
approve
verify
request revision
create follow-up
resolve follow-up
download evidence
```

Test negatif:

```text
[ ] User unit lain tidak dapat membaca target
[ ] Collector tidak dapat approve
[ ] Submitter tidak dapat verify
[ ] Approver yang tidak assigned ditolak
[ ] Verifier yang tidak assigned ditolak
[ ] Pimpinan read-only
[ ] ADMIN_PT override tercatat
```

## 2.5 Perbaiki evidence file security

Periksa:

```text
MIME sniffing server-side
extension allowlist
size limit
filename sanitization
random object key
checksum
short-lived presigned URL
target-level download authorization
virus scanning hook
content-disposition attachment
```

Metadata:

```text
original_filename
stored_object_key
mime_type
size_bytes
sha256
uploaded_by
uploaded_at
```

Test:

```text
[ ] File executable ditolak
[ ] Double extension ditolak
[ ] Oversize ditolak
[ ] User tidak assigned tidak dapat download
[ ] URL expired tidak dapat digunakan
```

## 2.6 Perbaiki optimistic locking

Semua mutation menerima:

```json
{
  "lockVersion": 4
}
```

Konflik:

```http
409 VERSION_CONFLICT
```

Kriteria:

```text
[ ] Tidak ada silent overwrite
[ ] UI tidak retry otomatis
[ ] Target direfresh setelah conflict
[ ] Activity tidak tercatat jika update gagal
```

## 2.7 Perbaiki generator concurrency

Generator harus:

```text
preview = read-only
generate = transaction
period lock
natural key unique
insert conflict safe
snapshot immutable
```

Test:

```text
[ ] Generate pertama membuat target
[ ] Generate kedua skip existing
[ ] Dua generate paralel tidak duplikat
[ ] Assignment kosong menghasilkan warning
[ ] December rollover benar
[ ] Period CLOSED tidak dapat generate
```

## 2.8 Perbaiki revision loop

Pastikan tersimpan:

```text
revision_return_stage
revision_requested_by
revision_requested_at
revision_note
revision_requirement_ids
```

Kriteria:

```text
[ ] Revisi approval kembali ke AWAITING_APPROVAL
[ ] Revisi verification kembali ke AWAITING_VERIFICATION
[ ] Evidence versi lama tetap ada
[ ] Resubmit hanya memakai evidence aktif
[ ] Review history tidak hilang
```

## 2.9 Perbaiki follow-up lifecycle

Validasi:

```text
OPEN
→ IN_PROGRESS
→ AWAITING_VERIFICATION
→ CLOSED
```

Dengan:

```text
AWAITING_VERIFICATION → REOPENED → IN_PROGRESS
```

Kriteria:

```text
[ ] Owner hanya mengubah follow-up miliknya
[ ] Verifier menutup
[ ] Reopen wajib alasan
[ ] Target VERIFIED tetap dapat punya follow-up terbuka
[ ] Dashboard menampilkan open follow-up
```

# 3. P1 — Perbaikan sebelum production

## 3.1 Query dan pagination

Semua list endpoint:

```text
page
page_size
sort
filter
search
```

Default:

```text
page_size = 20
maximum = 100
```

Kriteria:

```text
[ ] Tidak ada endpoint mengembalikan seluruh tabel
[ ] Sort field di-allowlist
[ ] Search menggunakan parameterized query
[ ] Dashboard menghindari N+1
```

## 3.2 Index dan EXPLAIN ANALYZE

Index minimum:

```text
monitoring_targets(period_id, workflow_status)
monitoring_targets(due_at, workflow_status)
monitoring_target_assignees(user_id, capability)
monitoring_evidences(target_id, requirement_id, version_no)
monitoring_follow_ups(owner_user_id, status, due_at)
monitoring_target_activities(target_id, created_at)
```

Target:

```text
my dashboard < 500 ms
target detail < 500 ms
operational dashboard < 1 s
generation 51 target < 3 s
```

## 3.3 Notification outbox

Buat:

```text
notification_outbox
```

Kolom:

```text
id
event_type
aggregate_type
aggregate_id
recipient_user_id
payload_json
idempotency_key
status
attempt_count
next_attempt_at
last_error
created_at
processed_at
```

Status:

```text
PENDING
PROCESSING
SENT
FAILED
```

Kriteria:

```text
[ ] Duplicate notification dicegah
[ ] Retry exponential
[ ] Poison message tidak memblok queue
[ ] Business transaction tetap sukses jika worker mati
```

## 3.4 Structured logging

Tambahkan:

```text
request_id
actor_user_id
target_id
period_id
action
status_code
duration_ms
error_code
```

Jangan log:

```text
password
JWT
reset token
presigned URL
isi evidence sensitif
```

## 3.5 Standardisasi error

Gunakan:

```json
{
  "success": false,
  "error": {
    "code": "VERSION_CONFLICT",
    "message": "Data telah berubah.",
    "details": {},
    "requestId": "..."
  }
}
```

Kode minimum:

```text
VALIDATION_ERROR
FORBIDDEN
NOT_FOUND
INVALID_STATE_TRANSITION
EVIDENCE_INCOMPLETE
VERSION_CONFLICT
SOD_VIOLATION
STORAGE_ERROR
DATABASE_ERROR
```

## 3.6 Feature flag

Tambahkan:

```text
PT_INTERNAL_MONITORING_ENABLED
PT_INTERNAL_MONITORING_EMAIL_ENABLED
PT_INTERNAL_MONITORING_FOLLOW_UP_ENABLED
```

Kriteria:

```text
[ ] Backend route dapat dimatikan
[ ] Frontend menu dapat disembunyikan
[ ] Rollback tidak memerlukan revert code
```

## 3.7 Backup dan rollback

Sebelum staging/prod:

```text
database backup
object storage backup policy
migration rollback test
feature flag off
deployment rollback script
```

# 4. P2 — Perbaikan setelah rollout awal

## 4.1 Kalender hari kerja

Tambahkan:

```text
business_calendar
business_holidays
deadline_override
```

Untuk:

```text
10 hari kerja setelah perubahan
3 hari kerja setelah kejadian
regulator deadline override
```

## 4.2 Frekuensi lanjutan

Urutan:

```text
quarterly
semesterly
annual
annual + change
continuous + monthly review
event + monthly recap
regulator calendar
```

## 4.3 Import master 51 checklist

Fungsi:

```text
preview
validation
missing assignment report
transactional import
effective dating
versioning
coverage report
```

Kriteria:

```text
CHK-001 sampai CHK-051 terpetakan
tidak ada duplicate code
target lama tidak berubah
```

# 5. Test Suite Perbaikan

Backend:

```text
internalMonitoringStateMachine.test.js
internalMonitoringTransaction.test.js
internalMonitoringAuthorization.test.js
internalMonitoringConcurrency.test.js
internalMonitoringFileSecurity.test.js
internalMonitoringNotificationOutbox.test.js
internalMonitoringPerformance.test.js
```

Frontend:

```text
TargetDetailConflict.test.jsx
EvidenceUploadSecurity.test.jsx
PermissionRendering.test.jsx
RevisionLoop.test.jsx
FollowUpLifecycle.test.jsx
```

E2E:

```text
full monthly flow
revision from approval
revision from verification
late submission
concurrent generation
unauthorized download
open follow-up after verification
feature flag disabled
```

# 6. Urutan Sprint Perbaikan

Sprint 1:

```text
state machine
transaction boundary
object-level authorization
optimistic locking
generator concurrency
```

Sprint 2:

```text
evidence security
revision loop
follow-up lifecycle
error standardization
```

Sprint 3:

```text
pagination
dashboard query optimization
notification outbox
structured logging
```

Sprint 4:

```text
frontend conflict handling
E2E
performance
feature flag
UAT
```

# 7. Release Gate

Jangan rilis bila salah satu gagal:

```text
[ ] Semua P0 selesai
[ ] Tidak ada 501 aktif
[ ] Tidak ada unresolved TODO kritis
[ ] Migration up/down/up lulus
[ ] Backend test lulus
[ ] Frontend test dan build lulus
[ ] E2E lulus
[ ] Regression PN lulus
[ ] Authorization negatif lulus
[ ] Concurrent generation lulus
[ ] Evidence download aman
[ ] Performance gate lulus
[ ] Feature flag tersedia
[ ] Backup dan rollback siap
[ ] UAT sign-off tersedia
```

# 8. Urutan Commit

```text
refactor(workflow): centralize internal monitoring state transitions
fix(auth): enforce target-level authorization and segregation of duties
fix(concurrency): harden target generation and optimistic locking
fix(evidence): secure file handling and version integrity
fix(workflow): correct revision and follow-up lifecycle
perf(monev): optimize dashboard and queue queries
feat(notification): add reliable monitoring notification outbox
test(monev): add security concurrency and regression coverage
chore(release): add feature flags rollback and release checks
```
