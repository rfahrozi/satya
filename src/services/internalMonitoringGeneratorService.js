const knex = require('../config/knex');
const repo = require('../repositories/internalMonitoring/masterRepo');
const targetRepo = require('../repositories/internalMonitoring/targetRepo');
const strategies = require('../domain/internalMonitoring/frequency/index');
const deadlineService = require('./internalMonitoringDeadlineService');

class InternalMonitoringGeneratorService {

  async _buildCandidates(periodId, trx) {
    const period = await repo.getPeriodById(periodId, trx);
    if (!period) throw new Error('Period not found');

    const items = await repo.listGenerationCandidates(periodId, trx);
    const candidates = [];

    for (const item of items) {
      const itemWithAssignments = await repo.getItemWithAssignments(item.id, new Date(), trx);
      if (!itemWithAssignments || !itemWithAssignments.assignments) continue;

      // Mengonversi MONTHLY -> monthly, ANNUAL_REGULATOR_CALENDAR -> annualRegulator
      let freqKey = (item.frequency_type || 'MONTHLY').toLowerCase().replace(/_([a-z])/g, g => g[1].toUpperCase());

      // Fallback jika pemetaan regex tidak cocok dengan exports di index.js
      if (item.frequency_type === 'ANNUAL_REGULATOR_CALENDAR') freqKey = 'annualRegulator';
      if (item.frequency_type === 'ANNUAL_WITH_CHANGE_EVENTS') freqKey = 'annualChange';
      if (item.frequency_type === 'CONTINUOUS_WITH_MONTHLY_REVIEW') freqKey = 'continuousReview';
      if (item.frequency_type === 'EVENT_WITH_MONTHLY_RECAP') freqKey = 'eventRecap';

      const strategy = strategies[freqKey] || strategies.monthly;

      for (const assignment of itemWithAssignments.assignments) {
        if (assignment.responsibility_type !== 'PRIMARY') continue;

        const scopeKey = `U${assignment.internal_unit_id || 0}-P${assignment.position_id || 0}`;
        const context = { item, period, assignment, scopeKey };

        const naturalKey = strategy.buildNaturalKey(context);

        // Base deadline calculation
        const baseDueAt = new Date(period.end_date);
        if (assignment.sla_days) {
          baseDueAt.setDate(baseDueAt.getDate() + assignment.sla_days);
        }

        const dueAt = await deadlineService.calculateDueAt(item.frequency_type, item.frequency_config_json || {}, period.id, item.id, trx);

        candidates.push({
          itemCode: item.item_code,
          itemId: item.id,
          naturalKey,
          dueAt: dueAt || baseDueAt,
          assignment,
          itemSnapshot: itemWithAssignments
        });
      }
    }
    
    return { candidates, period };
  }

  async previewTargets(periodId, actor) {
    return knex.transaction(async (trx) => {
      const { candidates } = await this._buildCandidates(periodId, trx);
      let alreadyExistsCount = 0;
      const previewCandidates = [];
      
      for (const c of candidates) {
        const existing = await targetRepo.findTargetByNaturalKey(c.naturalKey, trx);
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
    });
  }

  async generateTargets(periodId, actor) {
    return knex.transaction(async (trx) => {
      const period = await trx('monitoring_periods').where('id', periodId).forUpdate().first();
      if (!period) throw new Error('Period not found');
      
      const { candidates } = await this._buildCandidates(periodId, trx);
      
      let created = 0;
      let skippedExisting = 0;
      const targetIds = [];
      
      for (const c of candidates) {
        const existing = await targetRepo.findTargetByNaturalKey(c.naturalKey, trx);
        if (existing) {
          skippedExisting++;
          continue;
        }
        
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
        
        const target = await targetRepo.insertTarget(payload, trx);
        if (!target) {
          skippedExisting++;
          continue;
        }
        targetIds.push(target.id);
        
        const assigneesToInsert = [];
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
        
        const approvers = await trx('users').where('role', 'PIMPINAN_PT').andWhere('is_active', true);
        if (approvers.length) {
          assigneesToInsert.push({
            monitoring_target_id: target.id,
            user_id: approvers[0].id,
            capability: 'APPROVER',
            is_primary: true
          });
        }
        
        const verifiers = await trx('users').where('role', 'ADMIN_PT').andWhere('is_active', true);
        if (verifiers.length) {
          assigneesToInsert.push({
            monitoring_target_id: target.id,
            user_id: verifiers[0].id,
            capability: 'VERIFIER',
            is_primary: true
          });
        }
        
        const uniqueMap = {};
        for (const a of assigneesToInsert) {
           uniqueMap[`${a.user_id}_${a.capability}`] = a;
        }
        
        const finalAssignees = Object.values(uniqueMap);
        if (finalAssignees.length > 0) {
          await targetRepo.insertTargetAssignees(finalAssignees, trx);
        }
        
        await targetRepo.insertActivity({
          monitoring_target_id: target.id,
          actor_user_id: actor?.id || null,
          action: 'TARGET_GENERATED',
          description: 'Target generated via frequency strategy schedule'
        }, trx);
        
        created++;
      }
      
      return { created, skippedExisting, failed: 0, targetIds };
    });
  }
}

module.exports = new InternalMonitoringGeneratorService();
