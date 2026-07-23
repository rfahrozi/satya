const knex = require('../config/knex');
const logger = require('../config/logger');

class InternalMonitoringEscalationService {
  async scanEscalations(now = new Date()) {
    const rules = await knex('monitoring_escalation_rules').where('is_active', true);
    for (const rule of rules) {
      await this._processEscalationRule(rule, now);
    }
  }

  async _processEscalationRule(rule, now) {
    const trx = await knex.transaction();
    try {
      // Find targets matching from_status (e.g. IN_PROGRESS, REVISION_REQUIRED, NOT_STARTED)
      const targets = await trx('monitoring_targets')
        .where('workflow_status', rule.from_status)
        .where('due_at', '<=', now); // Overdue
        
      for (const target of targets) {
        // Calculate age
        const ageMs = now.getTime() - new Date(target.due_at).getTime();
        const ageDays = ageMs / (1000 * 60 * 60 * 24);
        
        // TODO: Handle working days offset properly if trigger_after_working_days is set
        if (ageDays >= rule.trigger_after_days) {
           await this.triggerEscalation(rule, target, trx);
        }
      }
      await trx.commit();
    } catch (err) {
      await trx.rollback();
      logger.error('Error processing escalation rule', { ruleCode: rule.code, error: err.message, stack: err.stack });
    }
  }

  async triggerEscalation(rule, target, trx) {
    // 1. Ensure escalation at this level doesn't already exist for this target
    const existing = await trx('monitoring_escalations')
      .where('target_id', target.id)
      .where('level', rule.escalation_level)
      .whereIn('status', ['OPEN', 'ACKNOWLEDGED', 'RESOLVED'])
      .first();

    if (existing) return;

    // 2. Find recipient based on capability policy
    const assignees = await trx('monitoring_target_assignees')
      .where('monitoring_target_id', target.id)
      .where('capability', rule.recipient_capability);

    for (const assignee of assignees) {
      let createdFollowUpId = null;

      // 3. Auto Follow-up creation
      if (rule.create_follow_up) {
         let dueDate = new Date();
         if (rule.follow_up_due_days) {
            dueDate.setDate(dueDate.getDate() + rule.follow_up_due_days);
         }
         
         // Assuming Follow-up goes to Collector
         const collector = await trx('monitoring_target_assignees')
           .where('monitoring_target_id', target.id)
           .where('capability', 'COLLECTOR')
           .first();
           
         const [followUp] = await trx('monitoring_follow_ups').insert({
           monitoring_target_id: target.id,
           title: `Auto-escalation: ${rule.escalation_level}`,
           description: `System generated follow-up due to escalation ${rule.code}`,
           owner_user_id: collector ? collector.user_id : assignee.user_id,
           due_at: dueDate,
           status: 'OPEN',
           created_by: assignee.user_id // System logic impersonating recipient or null
         }).returning('id');
         
         createdFollowUpId = followUp.id;
      }

      await trx('monitoring_escalations').insert({
        target_id: target.id,
        rule_id: rule.id,
        level: rule.escalation_level,
        reason: `Target is overdue by ${rule.trigger_after_days} days`,
        recipient_user_id: assignee.user_id,
        status: 'OPEN',
        created_follow_up_id: createdFollowUpId,
        metadata_json: JSON.stringify({ source: 'SYSTEM_ESCALATION' })
      });
      
      // Also notify the recipient
      await trx('in_app_notifications').insert({
        user_id: assignee.user_id,
        title: `Escalation: ${rule.escalation_level}`,
        message: `A target has been escalated to you because it is overdue.`,
        event_type: 'ESCALATION',
        is_read: false
      });
    }
  }

  async acknowledgeEscalation(actor, escalationId, note) {
    const rows = await knex('monitoring_escalations')
      .where('id', escalationId)
      .where('status', 'OPEN')
      .update({
        status: 'ACKNOWLEDGED',
        acknowledged_at: knex.fn.now(),
        acknowledged_by: actor.id,
        metadata_json: knex.raw('metadata_json || ?::jsonb', [JSON.stringify({ ack_note: note })])
      });
    return rows > 0;
  }

  async resolveEscalation(actor, escalationId, note) {
    const rows = await knex('monitoring_escalations')
      .where('id', escalationId)
      .whereIn('status', ['OPEN', 'ACKNOWLEDGED'])
      .update({
        status: 'RESOLVED',
        resolved_at: knex.fn.now(),
        metadata_json: knex.raw('metadata_json || ?::jsonb', [JSON.stringify({ resolve_note: note })])
      });
    return rows > 0;
  }
}

module.exports = new InternalMonitoringEscalationService();
