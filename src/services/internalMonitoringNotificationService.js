const knex = require('../config/knex');

class InternalMonitoringNotificationService {
  /**
   * Insert a notification safely with an idempotency key.
   * If a notification with the same idempotency_key exists, it will be ignored (ON CONFLICT DO NOTHING).
   */
  async emitNotification(payload, trx = knex) {
    const { userId, satkerId, title, message, idempotencyKey, eventType } = payload;
    
    if (!userId && !satkerId) {
      throw new Error('Notification requires either userId or satkerId');
    }

    // Insert into in_app_notifications
    await trx('in_app_notifications')
      .insert({
        user_id: userId || null,
        satker_id: satkerId || null,
        title,
        message,
        idempotency_key: idempotencyKey,
        event_type: eventType,
        is_read: false
      })
      .onConflict('idempotency_key')
      .ignore();
  }

  async notifyTargetAssigned(target, assignees, trx) {
    const promises = assignees.map(userId => 
      this.emitNotification({
        userId,
        title: 'Target Monitoring Ditugaskan',
        message: `Anda ditugaskan sebagai PIC untuk target ${target.natural_key}`,
        idempotencyKey: `TARGET_ASSIGNED:${target.id}:${userId}`,
        eventType: 'TARGET_ASSIGNED'
      }, trx)
    );
    await Promise.all(promises);
  }

  async notifyTargetSubmitted(target, approverIds, trx) {
    const promises = approverIds.map(userId => 
      this.emitNotification({
        userId,
        title: 'Target Diajukan',
        message: `Target ${target.natural_key} telah diajukan dan menunggu persetujuan Anda.`,
        idempotencyKey: `TARGET_SUBMITTED:${target.id}:${target.lock_version}:${userId}`,
        eventType: 'TARGET_SUBMITTED'
      }, trx)
    );
    await Promise.all(promises);
  }

  async notifyTargetApproved(target, verifierIds, trx) {
    const promises = verifierIds.map(userId => 
      this.emitNotification({
        userId,
        title: 'Target Disetujui',
        message: `Target ${target.natural_key} telah disetujui dan menunggu verifikasi Anda.`,
        idempotencyKey: `TARGET_APPROVED:${target.id}:${target.lock_version}:${userId}`,
        eventType: 'TARGET_APPROVED'
      }, trx)
    );
    await Promise.all(promises);
  }

  async notifyRevisionRequested(target, collectorIds, note, trx) {
    const promises = collectorIds.map(userId => 
      this.emitNotification({
        userId,
        title: 'Revisi Diperlukan',
        message: `Target ${target.natural_key} memerlukan revisi. Catatan: ${note}`,
        idempotencyKey: `TARGET_REVISION_REQUESTED:${target.id}:${target.lock_version}:${userId}`,
        eventType: 'TARGET_REVISION_REQUESTED'
      }, trx)
    );
    await Promise.all(promises);
  }

  async notifyTargetVerified(target, userIdsToNotify, trx) {
    const promises = userIdsToNotify.map(userId => 
      this.emitNotification({
        userId,
        title: 'Target Terverifikasi',
        message: `Target ${target.natural_key} telah berhasil diverifikasi.`,
        idempotencyKey: `TARGET_VERIFIED:${target.id}:${target.lock_version}:${userId}`,
        eventType: 'TARGET_VERIFIED'
      }, trx)
    );
    await Promise.all(promises);
  }

  async notifyFollowUpAssigned(followUp, target, trx) {
    await this.emitNotification({
      userId: followUp.owner_user_id,
      title: 'Follow-up Ditugaskan',
      message: `Anda ditugaskan untuk menyelesaikan follow-up: ${followUp.title}`,
      idempotencyKey: `FOLLOW_UP_ASSIGNED:${followUp.id}`,
      eventType: 'FOLLOW_UP_ASSIGNED'
    }, trx);
  }
}

module.exports = new InternalMonitoringNotificationService();
