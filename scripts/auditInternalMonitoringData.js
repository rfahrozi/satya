const knex = require('../src/config/knex');

async function runAudit() {
  console.log('Starting internal monitoring data audit...');
  
  const report = {
    orphanAssignments: [],
    inactiveUsersAssigned: [],
    itemsWithoutCollector: [],
    itemsWithoutApprover: [],
    itemsWithoutVerifier: [],
    itemsWithoutEvidenceRequirements: [],
    invalidDeadlineRules: [],
    duplicateNaturalKeys: []
  };

  try {
    // 1. Inactive users still assigned
    const inactiveAssignees = await knex('monitoring_item_assignments as mia')
      .join('internal_assignments as ia', function() {
        this.on('mia.internal_unit_id', '=', 'ia.internal_unit_id')
            .andOn('mia.position_id', '=', 'ia.position_id');
      })
      .join('users as u', 'ia.user_id', 'u.id')
      .where('u.is_active', false)
      .select('mia.id as assignment_id', 'u.id as user_id', 'u.username');
    
    report.inactiveUsersAssigned = inactiveAssignees;

    // 2. Orphan assignments (assignment to non-existent unit or item)
    const orphans = await knex('monitoring_item_assignments')
      .leftJoin('monitoring_items', 'monitoring_item_assignments.monitoring_item_id', 'monitoring_items.id')
      .leftJoin('internal_units', 'monitoring_item_assignments.internal_unit_id', 'internal_units.id')
      .whereNull('monitoring_items.id')
      .orWhereNull('internal_units.id')
      .select('monitoring_item_assignments.id');
    
    report.orphanAssignments = orphans.map(o => o.id);

    // 3. Items missing capabilities
    const activeItems = await knex('monitoring_items').where('is_active', true).select('id', 'item_code');
    for (const item of activeItems) {
      // Collectors (Primary)
      const collectors = await knex('monitoring_item_assignments')
        .where('monitoring_item_id', item.id)
        .where('responsibility_type', 'PRIMARY');
      if (collectors.length === 0) report.itemsWithoutCollector.push(item.item_code);

      // We rely on ADMIN_PT and PIMPINAN_PT fallback for now. But strictly, an item should have rules for APPROVER / VERIFIER if specific.
      // If we are strictly checking:
      const approvers = await knex('monitoring_item_assignments')
        .where('monitoring_item_id', item.id)
        .where('responsibility_type', 'APPROVER');
      if (approvers.length === 0) report.itemsWithoutApprover.push(item.item_code);

      const verifiers = await knex('monitoring_item_assignments')
        .where('monitoring_item_id', item.id)
        .where('responsibility_type', 'VERIFIER');
      if (verifiers.length === 0) report.itemsWithoutVerifier.push(item.item_code);
    }

    // 4. Items without evidence requirements
    const itemsWithoutReq = await knex('monitoring_items')
      .leftJoin('monitoring_evidence_requirements', 'monitoring_items.id', 'monitoring_evidence_requirements.monitoring_item_id')
      .where('monitoring_items.is_active', true)
      .whereNull('monitoring_evidence_requirements.id')
      .select('monitoring_items.item_code');
      
    report.itemsWithoutEvidenceRequirements = itemsWithoutReq.map(i => i.item_code);

    // 5. Duplicate Natural Keys in targets
    const duplicates = await knex('monitoring_targets')
      .select('natural_key')
      .groupBy('natural_key')
      .havingRaw('COUNT(id) > 1');
      
    report.duplicateNaturalKeys = duplicates.map(d => d.natural_key);

    console.log(JSON.stringify(report, null, 2));

  } catch (err) {
    console.error('Audit failed:', err);
  } finally {
    await knex.destroy();
  }
}

runAudit();
