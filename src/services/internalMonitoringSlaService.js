const knex = require('../config/knex');

class InternalMonitoringSlaService {
  async calculateSlaSnapshot(targetId) {
    const target = await knex('monitoring_targets').where('id', targetId).first();
    if (!target) return null;

    // Fetch activities for precise timestamping
    const activities = await knex('monitoring_target_activities')
      .where('monitoring_target_id', targetId)
      .orderBy('created_at', 'asc');

    let timeToFirstDraft = null;
    let timeToSubmit = null;
    let approvalWaitTime = 0;
    let verificationWaitTime = 0;
    
    let lastSubmitDate = null;
    let lastApproveDate = null;

    const createdDate = new Date(target.due_at); // Simplification for base age
    
    // Simplistic timeline parser
    for (const act of activities) {
      if (act.action === 'EVIDENCE_DRAFTED' && !timeToFirstDraft) {
         timeToFirstDraft = new Date(act.created_at).getTime() - createdDate.getTime();
      }
      if (act.action === 'TARGET_SUBMITTED') {
         lastSubmitDate = new Date(act.created_at);
         if (!timeToSubmit) timeToSubmit = lastSubmitDate.getTime() - createdDate.getTime();
      }
      if (act.action === 'TARGET_APPROVED') {
         lastApproveDate = new Date(act.created_at);
         if (lastSubmitDate) {
           approvalWaitTime += (lastApproveDate.getTime() - lastSubmitDate.getTime());
         }
      }
      if (act.action === 'TARGET_VERIFIED') {
         if (lastApproveDate) {
           verificationWaitTime += (new Date(act.created_at).getTime() - lastApproveDate.getTime());
         }
      }
    }

    const now = new Date();
    let ageHours = (now.getTime() - createdDate.getTime()) / (1000 * 60 * 60);
    
    let overdueHours = 0;
    if (now.getTime() > createdDate.getTime() && target.workflow_status !== 'VERIFIED') {
       overdueHours = (now.getTime() - createdDate.getTime()) / (1000 * 60 * 60);
    }

    const { count } = await knex('monitoring_follow_ups')
      .where('monitoring_target_id', targetId)
      .where('status', 'OPEN')
      .count('id as count')
      .first();

    return {
      target_id: targetId,
      status: target.workflow_status,
      due_at: target.due_at,
      age_hours: ageHours,
      overdue_hours: overdueHours,
      approval_wait_hours: approvalWaitTime / (1000 * 60 * 60),
      verification_wait_hours: verificationWaitTime / (1000 * 60 * 60),
      open_follow_up_count: parseInt(count, 10)
    };
  }

  async snapshotAllActiveTargets() {
     const trx = await knex.transaction();
     try {
       const targets = await trx('monitoring_targets')
         .whereNotIn('workflow_status', ['CANCELLED', 'NOT_APPLICABLE']);
         
       const snapshots = [];
       for (const t of targets) {
          const s = await this.calculateSlaSnapshot(t.id);
          if (s) snapshots.push(s);
       }
       
       if (snapshots.length > 0) {
          // Batch insert snapshots
          // A real implementation would batch chunk this.
          await trx('monitoring_sla_snapshots').insert(snapshots);
       }
       await trx.commit();
     } catch (err) {
       await trx.rollback();
       console.error('SLA Snapshot failed:', err);
     }
  }

  async getDashboardSla() {
    // Return high level aggregates from the latest snapshots
    const total = await knex('monitoring_sla_snapshots').count('id as count').first();
    const overdue = await knex('monitoring_sla_snapshots').where('overdue_hours', '>', 0).count('id as count').first();
    
    return {
      on_time_rate: total.count > 0 ? (1 - (overdue.count / total.count)) * 100 : 100,
      overdue_rate: total.count > 0 ? (overdue.count / total.count) * 100 : 0,
      total_measured: parseInt(total.count, 10),
      total_overdue: parseInt(overdue.count, 10)
    };
  }
}

module.exports = new InternalMonitoringSlaService();
