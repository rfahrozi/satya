# SATYA — Vertical Slice 01, Tahap 2
## Evidence, Submit, Approval, Revision, Verification, dan Follow-up

Dokumen ini melanjutkan tahap setelah migration, repository, dan generator bulanan dinyatakan lulus gate.

---

## 1. Sasaran Tahap

Membuat satu target monitoring bulanan dapat diproses end-to-end:

```text
NOT_STARTED
→ IN_PROGRESS
→ AWAITING_APPROVAL
→ AWAITING_VERIFICATION
→ VERIFIED
```

Loop revisi:

```text
AWAITING_APPROVAL / AWAITING_VERIFICATION
→ REVISION_REQUIRED
→ resubmit ke tahap asal revisi
```

Follow-up:

```text
OPEN
→ IN_PROGRESS
→ AWAITING_VERIFICATION
→ CLOSED
```

---

## 2. Urutan Implementasi

### Commit 1 — Evidence domain

```text
feat(evidence): implement typed and versioned monitoring evidence
```

Kerjakan:

```text
src/repositories/internalMonitoringRepo.js
src/services/internalMonitoringService.js
src/controllers/internalMonitoringController.js
src/validators/internalMonitoringValidator.js
src/routes/internalMonitoringRoutes.js
```

Tambahkan route:

```text
GET  /internal-monitoring/targets/:id/evidence
POST /internal-monitoring/targets/:id/evidence
POST /internal-monitoring/targets/:id/evidence/:requirementId/file
```

### Commit 2 — Submit dan approval

```text
feat(workflow): implement submit and accountable-owner approval
```

Tambahkan route:

```text
POST /internal-monitoring/targets/:id/submit
POST /internal-monitoring/targets/:id/approve
```

### Commit 3 — Revision dan verification

```text
feat(workflow): implement revision loop and verification
```

Tambahkan route:

```text
POST /internal-monitoring/targets/:id/request-revision
POST /internal-monitoring/targets/:id/verify
```

Nonaktifkan:

```text
POST /internal-monitoring/targets/:id/reject
```

### Commit 4 — Follow-up

```text
feat(follow-up): implement monitoring follow-up lifecycle
```

Tambahkan route:

```text
GET  /internal-monitoring/targets/:id/follow-ups
POST /internal-monitoring/targets/:id/follow-ups
POST /internal-monitoring/follow-ups/:id/start
POST /internal-monitoring/follow-ups/:id/submit-resolution
POST /internal-monitoring/follow-ups/:id/close
POST /internal-monitoring/follow-ups/:id/reopen
```

### Commit 5 — Tests

```text
test(monev): cover evidence workflow approval verification and follow-up
```

---

## 3. Evidence Contract

### 3.1 Evidence types

```text
FILE
URL
TEXT
NUMBER
DATE
BOOLEAN
```

### 3.2 Evidence versioning rules

1. Evidence tidak pernah di-overwrite.
2. Reupload atau perubahan membuat `version_no + 1`.
3. Versi sebelumnya menjadi `SUPERSEDED`.
4. Hanya satu versi aktif per requirement.
5. Saat submit, versi aktif berubah dari `DRAFT` menjadi `SUBMITTED`.
6. Review mengacu pada evidence version yang submitted.

### 3.3 Repository methods

```js
listEvidenceRequirements(targetId, trx)
listEvidenceByTarget(targetId, trx)
getLatestEvidence(targetId, requirementId, trx)
insertEvidenceVersion(payload, trx)
supersedeEvidence(evidenceId, actorId, trx)
markEvidenceSubmitted(targetId, actorId, trx)
validateEvidenceCompleteness(targetId, trx)
```

### 3.4 Service methods

```js
listTargetEvidence(actor, targetId)
saveEvidence(actor, targetId, payload)
uploadEvidenceFile(actor, targetId, requirementId, file)
```

### 3.5 Validation

#### FILE

```text
allowed_mime_types
max_size_bytes
extension whitelist
checksum
storage_object_key
```

#### URL

```text
valid URL
protocol http/https
maximum length
```

#### TEXT

```text
required/non-empty
maximum length
```

#### NUMBER

```text
minimum
maximum
decimal precision
unit
```

#### DATE

```text
ISO date
minimum/maximum date when configured
```

#### BOOLEAN

```text
true/false only
```

### 3.6 Authorization

Evidence dapat diubah oleh:

```text
COLLECTOR
SUPPORTING_PIC, hanya bila requirement ditugaskan kepadanya
ADMIN_PT, sebagai override administratif
```

Evidence tidak dapat diubah ketika:

```text
AWAITING_APPROVAL
AWAITING_VERIFICATION
VERIFIED
CANCELLED
NOT_APPLICABLE
```

Pengecualian hanya setelah status masuk `REVISION_REQUIRED`.

---

## 4. Save Draft

### Endpoint

```text
PATCH /internal-monitoring/targets/:id/draft
```

### Payload

```json
{
  "notes": "Dokumen sedang dilengkapi",
  "lockVersion": 2
}
```

### Transition

```text
NOT_STARTED → IN_PROGRESS
IN_PROGRESS → IN_PROGRESS
REVISION_REQUIRED → REVISION_REQUIRED
```

### Guard

- actor assigned sebagai Collector;
- target belum terminal;
- period belum CLOSED;
- `lockVersion` cocok;
- update target dan activity log dalam satu transaction.

### Activity

```text
TARGET_DRAFT_SAVED
```

---

## 5. Submit Workflow

### Endpoint

```text
POST /internal-monitoring/targets/:id/submit
```

### Payload

```json
{
  "lockVersion": 3,
  "submissionNote": "Bukti lengkap untuk periode Juli 2026"
}
```

### Guard

1. Status `IN_PROGRESS` atau `REVISION_REQUIRED`.
2. Actor assigned sebagai `COLLECTOR`.
3. Period belum `CLOSED`.
4. Required evidence lengkap.
5. Tidak ada evidence required yang masih invalid.
6. `lockVersion` sesuai.
7. Evidence aktif dikunci menjadi `SUBMITTED`.

### Target state

Default:

```text
IN_PROGRESS → AWAITING_APPROVAL
```

Resubmit:

```text
REVISION_REQUIRED → return_stage
```

`return_stage` hanya:

```text
AWAITING_APPROVAL
AWAITING_VERIFICATION
```

### Late submission

```js
wasSubmittedLate = submittedAt > dueAt;
```

Submission terlambat tetap diterima.

### Transaction

Dalam satu transaction:

1. lock target `FOR UPDATE`;
2. validasi status;
3. validasi evidence;
4. mark evidence submitted;
5. update target;
6. insert activity;
7. commit.

### Activity

```text
TARGET_SUBMITTED
TARGET_RESUBMITTED
```

---

## 6. Approval Workflow

### Endpoint

```text
POST /internal-monitoring/targets/:id/approve
```

### Payload

```json
{
  "lockVersion": 4,
  "note": "Disetujui untuk diverifikasi"
}
```

### Transition

```text
AWAITING_APPROVAL → AWAITING_VERIFICATION
```

### Guard

- actor assigned sebagai `ACCOUNTABLE_OWNER` atau `APPROVER`;
- actor bukan submitter;
- evidence version masih sama dengan versi submitted;
- target belum mengalami perubahan setelah submit;
- `lockVersion` sesuai.

### Segregation of duties exception

Exception hanya bila:

```text
master memang menetapkan posisi sama
tidak ada incumbent alternatif
reason wajib
SOD_OVERRIDE dicatat
```

### Activity

```text
TARGET_APPROVED
SOD_OVERRIDE_USED
```

---

## 7. Request Revision

### Endpoint

```text
POST /internal-monitoring/targets/:id/request-revision
```

### Payload

```json
{
  "lockVersion": 5,
  "note": "Dokumen berita acara belum ditandatangani",
  "evidenceRequirementIds": [12]
}
```

### Transition

```text
AWAITING_APPROVAL → REVISION_REQUIRED
AWAITING_VERIFICATION → REVISION_REQUIRED
```

### Data tambahan pada target

```text
revision_return_stage
revision_requested_by
revision_requested_at
revision_note
```

### Guard

- actor adalah assigned Approver atau Verifier sesuai current stage;
- note wajib;
- evidence requirement yang perlu direvisi dapat dicatat;
- target dan review record disimpan transactional.

### Evidence behavior

Evidence submitted tidak dihapus.

Saat Collector memperbaiki:

```text
versi lama tetap SUBMITTED/SUPERSEDED
versi baru dibuat sebagai DRAFT
```

### Activity

```text
TARGET_REVISION_REQUESTED
```

---

## 8. Verification Workflow

### Endpoint

```text
POST /internal-monitoring/targets/:id/verify
```

### Payload

```json
{
  "lockVersion": 7,
  "note": "Bukti sesuai dan lengkap",
  "score": 100,
  "findings": []
}
```

### Transition

```text
AWAITING_VERIFICATION → VERIFIED
```

### Guard

- actor assigned sebagai Verifier;
- actor bukan submitter;
- actor bukan approver, kecuali policy membolehkan dan dicatat;
- semua evidence submitted;
- tidak ada revision request terbuka;
- `lockVersion` sesuai.

### Transaction

1. lock target;
2. validate target state;
3. insert `monitoring_target_verifications`;
4. update target;
5. insert activity;
6. optionally create follow-ups;
7. commit.

### Activity

```text
TARGET_VERIFIED
```

---

## 9. Verification Record

Minimal menyimpan:

```text
id
monitoring_target_id
decision
note
score
findings_json
reviewed_evidence_versions_json
reviewer_user_id
reviewer_position_snapshot
created_at
```

Decision fase ini:

```text
APPROVED
REVISION_REQUIRED
```

Jangan gunakan `REJECTED`.

---

## 10. Follow-up Domain

### 10.1 Create follow-up

Endpoint:

```text
POST /internal-monitoring/targets/:id/follow-ups
```

Payload:

```json
{
  "title": "Lengkapi tanda tangan pejabat terkait",
  "description": "Unggah berita acara yang telah ditandatangani",
  "ownerUserId": 21,
  "dueAt": "2026-08-10T16:00:00+07:00"
}
```

Actor:

```text
VERIFIER
ADMIN_PT
```

### 10.2 Start

```text
OPEN → IN_PROGRESS
```

Actor:

```text
FOLLOW_UP_OWNER
ADMIN_PT override
```

### 10.3 Submit resolution

```text
IN_PROGRESS / REOPENED → AWAITING_VERIFICATION
```

Payload:

```json
{
  "resolutionNote": "Dokumen telah dilengkapi",
  "evidenceIds": [301]
}
```

### 10.4 Close

```text
AWAITING_VERIFICATION → CLOSED
```

Actor:

```text
VERIFIER
ADMIN_PT
```

### 10.5 Reopen

```text
AWAITING_VERIFICATION → REOPENED
CLOSED → REOPENED, hanya ADMIN_PT atau Verifier dengan alasan
```

### 10.6 Target relation

Target tetap boleh `VERIFIED` dengan follow-up terbuka.

Derived flag:

```text
HAS_OPEN_FOLLOW_UP
```

---

## 11. Object-Level Authorization Helper

Buat helper terpusat:

```text
src/services/internalMonitoringAuthorizationService.js
```

Contract:

```js
assertCanViewTarget(actor, target)
assertHasCapability(actor, targetId, capabilities, trx)
assertCanEditEvidence(actor, targetId, requirementId, trx)
assertSegregationOfDuties(actor, target, action, trx)
```

Jangan ulangi array role pada setiap controller.

Controller hanya:

```js
const result = await service.submitTarget(req.tenant, req.params.id, req.body);
res.status(200).json({ success: true, data: result });
```

Authorization dan state transition berada di service.

---

## 12. Optimistic Locking

Semua mutation menerima `lockVersion`.

SQL pattern:

```sql
UPDATE monitoring_targets
SET workflow_status = ?,
    lock_version = lock_version + 1,
    updated_at = NOW()
WHERE id = ?
  AND lock_version = ?
  AND workflow_status IN (...);
```

Jika affected row `0`:

```text
VERSION_CONFLICT
atau INVALID_STATE_TRANSITION
```

Reload target untuk membedakan penyebab.

---

## 13. Error Contract

```json
{
  "success": false,
  "error": {
    "code": "EVIDENCE_INCOMPLETE",
    "message": "Target belum dapat disubmit.",
    "details": {
      "missingRequirements": [
        {
          "id": 12,
          "code": "SIGNED_MINUTES",
          "label": "Berita acara yang ditandatangani"
        }
      ]
    }
  }
}
```

Kode minimum:

```text
VALIDATION_ERROR
FORBIDDEN
TARGET_NOT_FOUND
PERIOD_NOT_OPEN
INVALID_STATE_TRANSITION
EVIDENCE_INCOMPLETE
EVIDENCE_TYPE_MISMATCH
VERSION_CONFLICT
SOD_VIOLATION
FOLLOW_UP_NOT_FOUND
STORAGE_ERROR
```

---

## 14. Test Wajib

### Evidence

```text
[ ] Collector dapat membuat evidence draft
[ ] User lain tidak dapat mengubah evidence
[ ] Tipe evidence salah ditolak 422
[ ] Reupload membuat versi baru
[ ] Versi lama tidak hilang
[ ] Evidence required kosong memblok submit
```

### Submit

```text
[ ] Submit dari IN_PROGRESS berhasil
[ ] Submit dari NOT_STARTED ditolak
[ ] Submit terlambat diberi flag
[ ] Submit membuat activity
[ ] Submit dan evidence lock atomic
```

### Approval

```text
[ ] Assigned approver dapat approve
[ ] Collector tidak dapat approve
[ ] Approver lain tidak dapat approve
[ ] SOD violation ditolak
[ ] Version conflict menghasilkan 409
```

### Revision

```text
[ ] Approver dapat request revision
[ ] Verifier dapat request revision
[ ] Note kosong ditolak
[ ] return stage tersimpan
[ ] Resubmit kembali ke stage asal
```

### Verification

```text
[ ] Assigned verifier dapat verify
[ ] Non-assigned verifier ditolak
[ ] Submitter tidak dapat verify
[ ] Verification record tersimpan
[ ] Target dan verification atomic
```

### Follow-up

```text
[ ] Verifier dapat membuat follow-up
[ ] Owner dapat memulai
[ ] Owner dapat submit resolution
[ ] Verifier dapat close
[ ] Verifier dapat reopen
[ ] Dashboard flag berubah sesuai follow-up
```

### Regression

```text
[ ] Seluruh test PN existing tetap lulus
[ ] Upload laporan PN tidak terpengaruh
[ ] Verification laporan PN tidak terpengaruh
[ ] Notification existing tidak rusak
```

---

## 15. Gate Tahap 2

Tahap ini selesai bila:

```text
[ ] Tidak ada route scope tahap ini yang masih 501
[ ] Evidence typed dan versioned berjalan
[ ] Required evidence memblok submit
[ ] Submit menghasilkan AWAITING_APPROVAL
[ ] Approval menghasilkan AWAITING_VERIFICATION
[ ] Revision loop berjalan dari dua stage
[ ] Verification menghasilkan VERIFIED
[ ] Follow-up lifecycle berjalan
[ ] Object-level authorization lulus
[ ] SOD lulus
[ ] Optimistic locking lulus
[ ] Activity log lengkap
[ ] Regression PN lulus
[ ] Working tree bersih
```

---

## 16. Urutan Pengerjaan Harian

### Hari 1

```text
evidence repository
evidence validator
save evidence API
evidence versioning tests
```

### Hari 2

```text
save draft
submit transaction
completeness validation
late flag
submit tests
```

### Hari 3

```text
approval
SOD
revision request
resubmit
workflow tests
```

### Hari 4

```text
verification record
verify transaction
follow-up CRUD/state machine
```

### Hari 5

```text
authorization matrix
optimistic locking
regression
API documentation
cleanup dan commit review
```
