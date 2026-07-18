'use strict';
/**
 * SATYA — Konfigurasi Konstanta Master Checklist PT
 * ──────────────────────────────────────────────────
 * Single source of truth untuk angka-angka kritis sistem monitoring internal.
 *
 * Sumber kebenaran: "5 Master Dokumen Final.pdf" (audit 18 Juli 2026)
 * Diverifikasi silang dengan: "4 Monitoring Checklist Akhir.pdf"
 *
 * TOTAL: 70 AMP + 134 PZ + 79 AKIP + 12 REG = 295 item
 *
 * Gunakan file ini sebagai referensi di:
 *   - src/services/internalMonitoringMasterImportService.js
 *   - seeds/
 *   - tests/
 */

module.exports = {
  // ── Jumlah total item checklist final (semua kategori) ──────────────────
  EXPECTED_CHECKLIST_COUNT: 295,

  // ── Breakdown per kategori ──────────────────────────────────────────────
  CHECKLIST_COUNTS: {
    AMPUH:    70,   // AMP-001 s.d. AMP-070
    PMPZI:    134,  // PZ-001  s.d. PZ-134
    AKIP:     79,   // AKIP-001 s.d. AKIP-079
    REGULASI: 12,   // REG-001 s.d. REG-012
  },

  // ── Kode assessment yang valid ──────────────────────────────────────────
  ASSESSMENT_CODES: ['AMPUH', 'PMPZI', 'AKIP', 'REGULASI'],

  // ── Tipe frekuensi yang valid ───────────────────────────────────────────
  FREQUENCY_TYPES: [
    'MONTHLY',
    'QUARTERLY',
    'SEMIANNUAL',
    'ANNUAL_REGULATOR_CALENDAR',
    'ANNUAL_WITH_CHANGE_EVENTS',
    'CONTINUOUS_WITH_MONTHLY_REVIEW',
    'EVENT_WITH_MONTHLY_RECAP',
  ],

  // ── Kapabilitas assignee yang valid ─────────────────────────────────────
  ASSIGNEE_CAPABILITIES: [
    'COLLECTOR',
    'SUPPORTING_PIC',
    'APPROVER',
    'ACCOUNTABLE_OWNER',
    'VERIFIER',
  ],

  // ── Status workflow target yang valid ───────────────────────────────────
  TARGET_WORKFLOW_STATUSES: [
    'NOT_STARTED',
    'IN_PROGRESS',
    'AWAITING_APPROVAL',
    'AWAITING_VERIFICATION',
    'REVISION_REQUIRED',
    'VERIFIED',
    'CANCELLED',
    'NOT_APPLICABLE',
  ],
};
