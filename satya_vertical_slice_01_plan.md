# SATYA — Vertical Slice 01: Monitoring Internal PT Bulanan

## 1. Tujuan

Menyelesaikan satu alur bulanan end-to-end yang benar-benar dapat dipakai:

```text
master aktif
→ period bulanan
→ generate preview
→ generate target
→ assignment
→ draft evidence
→ submit
→ approve
→ verify / request revision
→ follow-up
→ dashboard ringkas
→ audit log
```

Checklist fixture pertama: `CHK-045` atau satu item bulanan lain yang assignment dan bukti minimumnya sudah disepakati. Seluruh implementasi tetap generik dan tidak boleh hard-code ke satu CHK.

## 2. Kondisi awal yang diterima

- Express boot berhasil.
- Module graph tidak memiliki unresolved import.
- Migration foundation lulus up/down/up.
- Sepuluh tabel fondasi tersedia.
- Route skeleton tersedia.
- Controller dapat mengembalikan `501 NOT_IMPLEMENTED`.
- Repository, generator, workflow, evidence, approval, dan follow-up belum fungsional.

## 3. Scope Vertical Slice

### Termasuk

- master item read-only;
- period bulanan;
- preview dan final target generation;
- snapshot master dan assignment;
- target-level authorization;
- draft metadata;
- multi-evidence dasar;
- submit;
- approval accountable owner;
- verification;
- revision loop;
- follow-up;
- activity log;
- dashboard ringkas;
- integration tests.

### Tidak termasuk

- triwulanan, semesteran, tahunan;
- annual-change event;
- continuous monitoring;
- event occurrence dan recap;
- kalender hari libur nasional;
- import master massal;
- dashboard heatmap/trend lengkap;
- notifikasi email/queue;
- frontend lengkap.

## 4. Migration Delta

Buat migration baru, jangan mengubah migration foundation yang sudah stabil:

```text
migrations/202607170002_internal_monitoring_vertical_slice.js
```

### 4.1 Perubahan `monitoring_targets`

Tambahkan:

```text
natural_key                 varchar(255) not null
master_snapshot             jsonb not null
assignment_snapshot         jsonb not null
workflow_status             varchar(50) not null default 'NOT_STARTED'
current_review_stage        varchar(30) null
submitted_at                timestamptz null
approved_at                 timestamptz null
verified_at                 timestamptz null
due_at                      timestamptz not null
was_submitted_late          boolean not null default false
lock_version                integer not null default 0
created_by                  integer null FK users
updated_by                  integer null FK users
```

Constraint:

```text
unique(natural_key)
check workflow_status in (
  'NOT_STARTED',
  'IN_PROGRESS',
  'AWAITING_APPROVAL',
  'AWAITING_VERIFICATION',
  'REVISION_REQUIRED',
  'VERIFIED',
  'CANCELLED',
  'NOT_APPLICABLE'
)
```

Natural key bulanan:

```text
PT_INTERNAL:{monitoring_item_id}:MONTH:{YYYY-MM}:{assignment_scope_key}
```

### 4.2 `monitoring_target_assignees`

```text
id
monitoring_target_id FK cascade
user_id FK restrict
position_id FK restrict
capability varchar(40)
is_primary boolean default false
source_assignment_id nullable
snapshot_name
snapshot_position_name
created_at
```

Capability:

```text
COLLECTOR
ACCOUNTABLE_OWNER
APPROVER
VERIFIER
SUPPORTING_PIC
SUPERVISOR
```

Unique:

```text
unique(monitoring_target_id, user_id, capability)
```

### 4.3 `monitoring_evidence_requirements`

```text
id
monitoring_item_id FK cascade
code
label
evidence_type
is_required
allows_multiple
sort_order
validation_config jsonb
effective_from
effective_to
```

Evidence type:

```text
FILE
URL
TEXT
NUMBER
DATE
BOOLEAN
```

### 4.4 `monitoring_evidences`

```text
id
monitoring_target_id FK cascade
requirement_id FK restrict
version_no integer
evidence_type
value_text nullable
value_number decimal nullable
value_date date nullable
value_boolean boolean nullable
file_submission_id nullable FK report_submissions
submitted_by FK users
evidence_status varchar(30)
created_at
superseded_at nullable
```

Status:

```text
DRAFT
SUBMITTED
SUPERSEDED
VOIDED
```

Unique:

```text
unique(monitoring_target_id, requirement_id, version_no)
```

### 4.5 `monitoring_follow_ups`

```text
id
monitoring_target_id FK cascade
verification_id nullable FK monitoring_target_verifications
title
description
owner_user_id FK users
due_at
status
resolution_note nullable
submitted_at nullable
closed_at nullable
created_by FK users
created_at
updated_at
```

Status:

```text
OPEN
IN_PROGRESS
AWAITING_VERIFICATION
CLOSED
REOPENED
```

### 4.6 Index minimum

```text
monitoring_targets(workflow_status, due_at)
monitoring_targets(monitoring_period_id, monitoring_item_id)
monitoring_target_assignees(user_id, capability)
monitoring_evidences(monitoring_target_id, evidence_status)
monitoring_follow_ups(owner_user_id, status, due_at)
monitoring_target_activities(monitoring_target_id, created_at)
```

## 5. Repository Contract

Implementasikan method eksplisit; helper generik boleh digunakan internal, tetapi controller/service tidak memanggil tabel secara bebas.

### Master

```js
listActiveItems(filters, trx)
getItemWithAssignments(itemId, effectiveAt, trx)
getEvidenceRequirements(itemId, effectiveAt, trx)
```

### Period

```js
createPeriod(payload, actorId, trx)
getPeriodById(id, trx)
listPeriods(filters, pagination, trx)
updatePeriod(id, payload, expectedLockVersion, trx)
```

### Generation

```js
listGenerationCandidates(periodId, trx)
findTargetByNaturalKey(naturalKey, trx)
insertTarget(payload, trx)
insertTargetAssignees(rows, trx)
```

### Target

```js
getTargetById(id, trx)
getTargetDetail(id, trx)
listTargets(filters, pagination, trx)
listTargetsForUser(userId, filters, pagination, trx)
updateTargetState(id, fromStatuses, patch, expectedLockVersion, trx)
```

### Evidence

```js
listEvidenceByTarget(targetId, trx)
getLatestEvidence(targetId, requirementId, trx)
insertEvidenceVersion(payload, trx)
supersedeEvidence(evidenceId, trx)
validateEvidenceCompleteness(targetId, trx)
```

### Review dan audit

```js
insertVerification(payload, trx)
listVerificationHistory(targetId, trx)
insertActivity(payload, trx)
listActivity(targetId, pagination, trx)
```

### Follow-up

```js
createFollowUp(payload, trx)
listFollowUpsByTarget(targetId, trx)
updateFollowUpState(id, fromStatuses, patch, trx)
```

### Dashboard

```js
getMySummary(userId, periodId, trx)
getOperationalSummary(periodId, trx)
```

## 6. Generator Contract

### Preview

```js
previewMonthlyTargets(periodId, actor)
```

Response:

```json
{
  "periodId": 1,
  "candidateCount": 1,
  "alreadyExistsCount": 0,
  "missingAssignmentCount": 0,
  "candidates": [
    {
      "itemCode": "CHK-045",
      "naturalKey": "PT_INTERNAL:45:MONTH:2026-07:UNIT-PTIP",
      "dueAt": "2026-08-05T16:59:59+07:00",
      "collectorCount": 1,
      "approverCount": 1,
      "verifierCount": 1,
      "warnings": []
    }
  ]
}
```

Preview tidak boleh melakukan write.

### Generate

```js
generateMonthlyTargets(periodId, actor)
```

Wajib:

- transaction;
- advisory lock atau database lock pada `periodId`;
- natural key unique;
- `ON CONFLICT DO NOTHING` atau equivalent;
- snapshot master;
- snapshot assignment;
- insert assignees;
- activity log;
- hasil idempotent.

Response:

```json
{
  "created": 1,
  "skippedExisting": 0,
  "failed": 0,
  "targetIds": [101]
}
```

## 7. Workflow yang Diimplementasikan

### 7.1 Draft

```text
NOT_STARTED → IN_PROGRESS
IN_PROGRESS → IN_PROGRESS
REVISION_REQUIRED → REVISION_REQUIRED
```

Actor:

```text
COLLECTOR
SUPPORTING_PIC hanya untuk evidence yang ditugaskan
ADMIN_PT untuk koreksi administratif dengan audit
```

### 7.2 Submit

```text
IN_PROGRESS → AWAITING_APPROVAL
REVISION_REQUIRED → stage asal revisi
```

Guard:

- actor adalah Collector;
- period tidak CLOSED;
- seluruh required evidence lengkap;
- evidence draft dikunci menjadi SUBMITTED;
- `was_submitted_late = now > due_at`;
- activity log dibuat dalam transaction yang sama.

### 7.3 Approve

```text
AWAITING_APPROVAL → AWAITING_VERIFICATION
```

Actor:

```text
ACCOUNTABLE_OWNER atau APPROVER
```

Guard:

- actor terdaftar pada target;
- actor bukan submitter, kecuali SOD override resmi;
- keputusan mengacu pada evidence version yang submitted.

### 7.4 Request Revision

Dari:

```text
AWAITING_APPROVAL
AWAITING_VERIFICATION
```

Ke:

```text
REVISION_REQUIRED
```

Wajib:

- notes;
- `return_stage` disimpan;
- evidence yang direvisi menjadi versi baru, tidak overwrite.

### 7.5 Verify

```text
AWAITING_VERIFICATION → VERIFIED
```

Actor:

```text
VERIFIER
```

Guard:

- actor assigned;
- actor bukan submitter;
- verification record dan activity log transactional.

### 7.6 Follow-up

Verification dapat membuat 0..n follow-up.

```text
OPEN → IN_PROGRESS
IN_PROGRESS → AWAITING_VERIFICATION
AWAITING_VERIFICATION → CLOSED
AWAITING_VERIFICATION → REOPENED
REOPENED → IN_PROGRESS
```

Target boleh berstatus VERIFIED sambil memiliki follow-up terbuka. Dashboard harus menampilkan flag `HAS_OPEN_FOLLOW_UP`.

## 8. Endpoint Vertical Slice

### Period dan generation

```text
GET  /internal-monitoring/periods
POST /internal-monitoring/periods
POST /internal-monitoring/periods/:id/open
POST /internal-monitoring/periods/:id/generate-preview
POST /internal-monitoring/periods/:id/generate
```

### Target

```text
GET   /internal-monitoring/targets
GET   /internal-monitoring/my-targets
GET   /internal-monitoring/targets/:id
PATCH /internal-monitoring/targets/:id/draft
POST  /internal-monitoring/targets/:id/submit
POST  /internal-monitoring/targets/:id/approve
POST  /internal-monitoring/targets/:id/request-revision
POST  /internal-monitoring/targets/:id/verify
```

Hapus/nonaktifkan pada slice:

```text
POST /internal-monitoring/targets/:id/reject
```

### Evidence

```text
GET  /internal-monitoring/targets/:id/evidence
POST /internal-monitoring/targets/:id/evidence
POST /internal-monitoring/targets/:id/evidence/:requirementId/file
```

### Follow-up

```text
GET  /internal-monitoring/targets/:id/follow-ups
POST /internal-monitoring/targets/:id/follow-ups
POST /internal-monitoring/follow-ups/:id/start
POST /internal-monitoring/follow-ups/:id/submit-resolution
POST /internal-monitoring/follow-ups/:id/close
POST /internal-monitoring/follow-ups/:id/reopen
```

### Dashboard

```text
GET /internal-monitoring/dashboard/my?period_id=:id
GET /internal-monitoring/dashboard/operational?period_id=:id
```

## 9. Authorization Matrix

| Aksi | ADMIN_PT | Collector | Approver | Verifier | Pimpinan |
|---|---:|---:|---:|---:|---:|
| Create/open period | Ya | Tidak | Tidak | Tidak | Read |
| Generate | Ya | Tidak | Tidak | Tidak | Read |
| View target | Ya | Assigned | Assigned | Assigned | Ya |
| Save draft/evidence | Override | Ya | Tidak | Tidak | Tidak |
| Submit | Override | Ya | Tidak | Tidak | Tidak |
| Approve | Override | Tidak | Ya | Tidak | Tidak |
| Verify | Override | Tidak | Tidak | Ya | Tidak |
| Request revision | Override | Tidak | Ya | Ya | Tidak |
| Create follow-up | Ya | Tidak | Tidak | Ya | Tidak |
| Resolve follow-up | Override | Owner | Tidak | Tidak | Tidak |
| Close follow-up | Ya | Tidak | Tidak | Ya | Tidak |

Setiap akses harus melalui object-level authorization berdasarkan `monitoring_target_assignees`, bukan hanya role global.

## 10. Test Plan

### Unit test

```text
internalMonitoringValidator.test.js
internalMonitoringRepo.test.js
internalMonitoringGeneratorService.test.js
internalMonitoringService.test.js
internalMonitoringDeadline.test.js
```

### Integration test

```text
internalMonitoringMigration.test.js
internalMonitoringGeneration.test.js
internalMonitoringWorkflow.test.js
internalMonitoringAuthorization.test.js
internalMonitoringEvidence.test.js
internalMonitoringFollowUp.test.js
internalMonitoringRegression.test.js
```

### Skenario wajib

1. Preview tidak menulis data.
2. Generate pertama membuat target.
3. Generate kedua tidak membuat duplikat.
4. Dua generate paralel tidak membuat duplikat.
5. Collector lain tidak dapat membuka target.
6. Collector tidak dapat approve target sendiri.
7. Required evidence kosong menyebabkan submit 422.
8. Submit terlambat tetap diterima dan diberi flag.
9. Approval memindahkan target ke verification.
10. Revision menyimpan note dan return stage.
11. Reupload membuat evidence version baru.
12. Verifier tidak dapat verify bila tidak assigned.
13. Verify membuat verification dan activity secara atomik.
14. Follow-up dapat dibuat, diselesaikan, ditutup, dan dibuka ulang.
15. Flow PN existing tetap lulus.

## 11. HTTP Error Contract

```json
{
  "success": false,
  "error": {
    "code": "INVALID_STATE_TRANSITION",
    "message": "Target tidak dapat disubmit dari status AWAITING_VERIFICATION.",
    "details": {
      "targetId": 101,
      "currentStatus": "AWAITING_VERIFICATION",
      "requestedAction": "SUBMIT"
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
ASSIGNMENT_INCOMPLETE
VERSION_CONFLICT
DUPLICATE_TARGET
STORAGE_ERROR
```

## 12. Definition of Done

Vertical Slice 01 selesai ketika:

- migration delta lulus up/down/up;
- application boot tetap lulus;
- route tidak lagi mengembalikan 501 untuk scope slice;
- preview tidak melakukan write;
- generation idempotent dan concurrency-safe;
- target menyimpan master/assignment snapshot;
- authorization object-level lulus;
- evidence required dapat divalidasi;
- submit, approve, revision, resubmit, verify berjalan;
- follow-up berjalan;
- activity log lengkap;
- dashboard ringkas sesuai query detail;
- backend test lulus;
- regression PN lulus;
- working tree bersih;
- semua perubahan memiliki commit terpisah dan dapat direview.

## 13. Urutan Commit

```text
feat(db): add internal monitoring vertical slice schema
feat(repo): implement internal monitoring repository
feat(generator): implement monthly target generation
feat(evidence): add typed and versioned monitoring evidence
feat(workflow): implement submit approval revision and verification
feat(follow-up): implement monitoring follow-up lifecycle
feat(api): expose vertical slice endpoints
test(monev): add internal monitoring unit and integration tests
docs(monev): document vertical slice API and workflow
```
