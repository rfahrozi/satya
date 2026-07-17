const knex = require('../config/knex');
const repo = require('../repositories/internalMonitoringRepo');

async function _buildCandidates(periodId, trx) {
  const period = await repo.getPeriodById(periodId, trx);
  if (!period) throw new Error('Period not found');
  
  const items = await repo.listGenerationCandidates(periodId, trx);
  const candidates = [];
  
  for (const item of items) {
    const itemWithAssignments = await repo.getItemWithAssignments(item.id, new Date(), trx);
    if (!itemWithAssignments || !itemWithAssignments.assignments) continue;
    
    for (const assignment of itemWithAssignments.assignments) {
      if (assignment.responsibility_type !== 'PRIMARY') continue;
      
      const scopeKey = `U${assignment.internal_unit_id || 0}-P${assignment.position_id || 0}`;
      const periodKey = `${period.year}-${String(period.month).padStart(2, '0')}`;
      const naturalKey = `PT_INTERNAL:${item.id}:MONTH:${periodKey}:${scopeKey}`;
      
      const dueAt = new Date(period.end_date);
      if (assignment.sla_days) {
        dueAt.setDate(dueAt.getDate() + assignment.sla_days);
      }
      
      candidates.push({
        itemCode: item.item_code,
        itemId: item.id,
        naturalKey,
        dueAt,
        assignment,
        itemSnapshot: itemWithAssignments
      });
    }
  }
  
  return candidates;
}

async function previewMonthlyTargets(periodId, actor) {
  const candidates = await _buildCandidates(periodId, knex);
  let alreadyExistsCount = 0;
  const previewCandidates = [];
  
  for (const c of candidates) {
    const existing = await repo.findTargetByNaturalKey(c.naturalKey, knex);
    if (existing) {
      alreadyExistsCount++;
    } else {
      previewCandidates.push({
        itemCode: c.itemCode,
        naturalKey: c.naturalKey,
        dueAt: c.dueAt,
        collectorCount: 1,
        approverCount: 1,
        verifierCount: 1,
        warnings: []
      });
    }
  }
  
  return {
    periodId,
    candidateCount: candidates.length,
    alreadyExistsCount,
    missingAssignmentCount: 0,
    candidates: previewCandidates
  };
}

async function generateMonthlyTargets(periodId, actor) {
  return knex.transaction(async (trx) => {
    // 1. Lock the period
    const period = await trx('monitoring_periods').where('id', periodId).forUpdate().first();
    if (!period) throw new Error('Period not found');
    
    const candidates = await _buildCandidates(periodId, trx);
    
    let created = 0;
    let skippedExisting = 0;
    const targetIds = [];
    
    for (const c of candidates) {
      // 2. Check existence to ensure idempotency
      const existing = await repo.findTargetByNaturalKey(c.naturalKey, trx);
      if (existing) {
        skippedExisting++;
        continue;
      }
      
      // 3. Insert target
      const payload = {
        period_id: periodId,
        monitoring_item_id: c.itemId,
        internal_unit_id: c.assignment.internal_unit_id,
        position_id: c.assignment.position_id,
        due_at: c.dueAt,
        due_date: c.dueAt.toISOString().split('T')[0],
        natural_key: c.naturalKey,
        master_snapshot: JSON.stringify(c.itemSnapshot),
        assignment_snapshot: JSON.stringify(c.assignment),
        workflow_status: 'NOT_STARTED',
        created_by: actor?.id || null
      };
      
      const target = await repo.insertTarget(payload, trx);
      targetIds.push(target.id);
      
      // 4. Insert assignees (Collector, Approver, Verifier)
      const assigneesToInsert = [];
      
      // Collector(s) based on internal assignment to the unit
      if (c.assignment.internal_unit_id) {
        const unitUsers = await trx('internal_assignments').where('internal_unit_id', c.assignment.internal_unit_id).andWhere('is_active', true);
        for (const au of unitUsers) {
          assigneesToInsert.push({
            monitoring_target_id: target.id,
            user_id: au.user_id,
            position_id: au.position_id,
            capability: 'COLLECTOR',
            is_primary: true
          });
        }
      }
      
      // Approver(s) - Fallback to PIMPINAN_PT for vertical slice
      const approvers = await trx('users').where('role', 'PIMPINAN_PT').andWhere('is_active', true);
      if (approvers.length) {
        assigneesToInsert.push({
          monitoring_target_id: target.id,
          user_id: approvers[0].id,
          capability: 'APPROVER',
          is_primary: true
        });
      }
      
      // Verifier(s) - Fallback to ADMIN_PT
      const verifiers = await trx('users').where('role', 'ADMIN_PT').andWhere('is_active', true);
      if (verifiers.length) {
        assigneesToInsert.push({
          monitoring_target_id: target.id,
          user_id: verifiers[0].id,
          capability: 'VERIFIER',
          is_primary: true
        });
      }
      
      // Deduplicate by user + capability
      const uniqueMap = {};
      for (const a of assigneesToInsert) {
         uniqueMap[`${a.user_id}_${a.capability}`] = a;
      }
      
      const finalAssignees = Object.values(uniqueMap);
      if (finalAssignees.length > 0) {
        await repo.insertTargetAssignees(finalAssignees, trx);
      }
      
      // 5. Insert activity
      await repo.insertActivity({
        monitoring_target_id: target.id,
        actor_user_id: actor?.id || null,
        action: 'TARGET_GENERATED',
        description: 'Target generated via monthly schedule'
      }, trx);
      
      created++;
    }
    
    return { created, skippedExisting, failed: 0, targetIds };
  });
}

module.exports = { previewMonthlyTargets, generateMonthlyTargets };
