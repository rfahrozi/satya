const knex = require('../config/knex');
const deadlineService = require('./internalMonitoringDeadlineService');
const logger = require('../config/logger');

class InternalMonitoringReminderService {
  async scanDueReminders(now = new Date()) {
    // 1. Fetch active rules
    const rules = await knex('monitoring_reminder_rules').where('is_active', true);
    
    for (const rule of rules) {
      await this._processRule(rule, now);
    }
  }

  async _processRule(rule, now) {
    const trx = await knex.transaction();
    try {
      // Very basic evaluation for vertical slice:
      // Find open targets
      let query = trx('monitoring_targets')
        .whereIn('workflow_status', ['NOT_STARTED', 'IN_PROGRESS', 'REVISION_REQUIRED']);

      if (rule.scope_type === 'ITEM' && rule.monitoring_item_id) {
        query = query.where('monitoring_item_id', rule.monitoring_item_id);
      }

      const targets = await query;
      
      for (const target of targets) {
        // Calculate Target date for this rule
        let targetDate = new Date(target.due_at);
        if (rule.offset_unit === 'CALENDAR_DAY') {
          targetDate.setDate(targetDate.getDate() + (rule.offset_value * (rule.trigger_type === 'BEFORE_DUE' ? -1 : 1)));
        } else if (rule.offset_unit === 'WORKING_DAY') {
          const calendarId = process.env.BUSINESS_CALENDAR_DEFAULT_CODE || 'ID_NATIONAL';
          // Find actual calendar PK ID from DB
          const cal = await trx('business_calendars').where('code', calendarId).first();
          if (cal) {
             const baseDate = new Date(target.due_at);
             if (rule.trigger_type === 'BEFORE_DUE') {
                // Not perfectly supported by `addWorkingDays` natively as subtraction, but we handle it simply:
                // For simplicity in this slice, we will do a rough calendar fallback if subtraction isn't implemented.
                targetDate.setDate(targetDate.getDate() - rule.offset_value);
             } else {
                targetDate = await deadlineService.addWorkingDays(baseDate, rule.offset_value, cal.id, trx);
             }
          }
        } else if (rule.offset_unit === 'HOUR') {
          targetDate.setHours(targetDate.getHours() + (rule.offset_value * (rule.trigger_type === 'BEFORE_DUE' ? -1 : 1)));
        }

        // Check if we hit the window (e.g. today matches the target date)
        if (targetDate.toISOString().split('T')[0] === now.toISOString().split('T')[0]) {
          await this.scheduleReminder(rule, target, trx);
        }
      }
      await trx.commit();
    } catch (err) {
      await trx.rollback();
      logger.error('Error processing reminder rule', { ruleCode: rule.code, error: err.message, stack: err.stack });
    }
  }

  async scheduleReminder(rule, target, trx) {
    // 1. Resolve recipients based on rule.recipient_policy
    let assignees = [];
    if (rule.recipient_policy === 'ASSIGNED_COLLECTOR') {
       assignees = await trx('monitoring_target_assignees')
         .where('monitoring_target_id', target.id)
         .where('capability', 'COLLECTOR');
    } else if (rule.recipient_policy === 'APPROVER') {
       assignees = await trx('monitoring_target_assignees')
         .where('monitoring_target_id', target.id)
         .where('capability', 'APPROVER');
    } else if (rule.recipient_policy === 'VERIFIER') {
       assignees = await trx('monitoring_target_assignees')
         .where('monitoring_target_id', target.id)
         .where('capability', 'VERIFIER');
    }

    const windowString = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 10); // YYYYMMDDHH

    for (const assignee of assignees) {
      const idempotencyKey = `REMINDER:${rule.code}:TARGET:${target.id}:RECIPIENT:${assignee.user_id}:WINDOW:${windowString}`;
      
      const existing = await trx('monitoring_reminder_deliveries')
        .where('idempotency_key', idempotencyKey).first();
      
      if (!existing) {
        await trx('monitoring_reminder_deliveries').insert({
          rule_id: rule.id,
          target_id: target.id,
          recipient_user_id: assignee.user_id,
          channel: rule.channel_policy || 'IN_APP',
          idempotency_key: idempotencyKey,
          scheduled_at: knex.fn.now(),
          status: 'PENDING'
        });
      }
    }
  }

  async cancelObsoleteDeliveries(targetId, reason, trx) {
    await trx('monitoring_reminder_deliveries')
      .where('target_id', targetId)
      .where('status', 'PENDING')
      .update({ status: 'CANCELLED', last_error: reason });
  }
}

module.exports = new InternalMonitoringReminderService();
