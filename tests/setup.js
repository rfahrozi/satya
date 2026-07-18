/**
 * SATYA - Test Database Setup
 * Menyediakan fungsi untuk reset database ke kondisi bersih sebelum setiap test suite.
 *
 * clearDatabase() melakukan TRUNCATE semua tabel dan re-seed data awal
 * sehingga setiap test suite mendapatkan state database yang identik dan deterministic.
 */
const knex = require('../src/config/knex');
const seed01 = require('../seeds/01_initial_data');

/**
 * Reset penuh: hapus semua data lalu seed ulang.
 * Urutan TRUNCATE menghormati FK constraint (leaf table first, atau CASCADE).
 */
async function clearDatabase() {
    // TRUNCATE dengan CASCADE otomatis menghapus data di seluruh tabel operasional dan relasional
    const tables = [
        'satkers', 'users', 'report_types', 'report_submissions', 'report_revision_logs',
        'internal_units', 'positions', 'internal_assignments',
        'monitoring_packages', 'monitoring_items', 'monitoring_item_assignments',
        'monitoring_periods', 'monitoring_targets', 'monitoring_target_assignees',
        'monitoring_evidence_requirements', 'monitoring_evidences', 'monitoring_follow_ups',
        'monitoring_target_activities', 'in_app_notifications', 'business_calendars',
        'business_holidays', 'monitoring_frequency_rules', 'monitoring_events',
        'monitoring_event_targets', 'monitoring_deadline_overrides', 'monitoring_master_imports',
        'monitoring_master_import_rows', 'monitoring_reminder_rules', 'monitoring_reminder_deliveries',
        'monitoring_escalations', 'monitoring_escalation_rules', 'monitoring_sla_snapshots',
        'monitoring_report_templates', 'monitoring_report_runs', 'monitoring_export_files',
        'monitoring_evidence_manifests', 'monitoring_audit_seals', 'monitoring_retention_policies',
        'monitoring_legal_holds', 'monitoring_findings', 'monitoring_risks', 'monitoring_risk_links',
        'monitoring_action_plans', 'monitoring_action_milestones', 'monitoring_action_evidence',
        'monitoring_effectiveness_reviews', 'monitoring_management_reviews', 'monitoring_management_review_items',
        'monitoring_risk_acceptances', 'monitoring_repeat_finding_candidates', 'monitoring_risk_snapshots',
        'monitoring_master_versions', 'monitoring_source_assessments', 'monitoring_source_criteria',
        'monitoring_item_criteria', 'monitoring_item_parameters', 'monitoring_item_regulations',
        'monitoring_evidence_requirement_templates', 'monitoring_requirement_criteria',
        'monitoring_target_parameter_values', 'monitoring_target_relations', 'regulator_deadline_calendars',
        'monitoring_target_criteria', 'monitoring_criterion_assessments', 'monitoring_criterion_evidence_links',
        'monitoring_criterion_parameter_links', 'monitoring_target_assessment_summaries',
        'monitoring_assessment_findings', 'monitoring_target_verifications', 'activity_logs'
    ];

    const truncateQuery = `TRUNCATE TABLE ${tables.join(', ')} RESTART IDENTITY CASCADE;`;
    await knex.raw(truncateQuery);

    // Re-seed untuk memastikan data awal (admin, satker, user, report types) selalu ada
    await seed01.seed(knex);
}

/**
 * Tutup koneksi pool database setelah test suite selesai.
 */
async function closeDatabase() {
    await knex.destroy();
}

module.exports = { clearDatabase, closeDatabase };