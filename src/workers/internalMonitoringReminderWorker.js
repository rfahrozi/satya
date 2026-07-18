const knex = require('../config/knex');

class InternalMonitoringReminderWorker {
  async processPendingDeliveries(batchSize = 100) {
    const trx = await knex.transaction();
    try {
      // 1. Claim a batch of PENDING deliveries
      const pendingDeliveries = await trx('monitoring_reminder_deliveries')
        .where('status', 'PENDING')
        .where('scheduled_at', '<=', knex.fn.now())
        .limit(batchSize)
        .forUpdate()
        .skipLocked();

      if (pendingDeliveries.length === 0) {
        await trx.rollback();
        return 0;
      }

      // Mark them as PROCESSING
      const ids = pendingDeliveries.map(d => d.id);
      await trx('monitoring_reminder_deliveries')
        .whereIn('id', ids)
        .update({ status: 'PROCESSING' });

      await trx.commit();

      // 2. Process each delivery
      let processedCount = 0;
      for (const delivery of pendingDeliveries) {
        const success = await this._sendDelivery(delivery);
        
        if (success) {
          await knex('monitoring_reminder_deliveries')
            .where('id', delivery.id)
            .update({ 
              status: 'SENT', 
              sent_at: knex.fn.now(),
              attempt_count: delivery.attempt_count + 1 
            });
        } else {
          const maxRetries = parseInt(process.env.MONITORING_NOTIFICATION_RETRY_LIMIT || '3', 10);
          const nextStatus = delivery.attempt_count + 1 >= maxRetries ? 'FAILED' : 'PENDING';
          
          await knex('monitoring_reminder_deliveries')
            .where('id', delivery.id)
            .update({ 
              status: nextStatus,
              last_error: 'Failed to send via channel',
              attempt_count: delivery.attempt_count + 1 
            });
        }
        processedCount++;
      }
      return processedCount;

    } catch (err) {
      await trx.rollback();
      console.error('Worker failed to process batch:', err);
      return 0;
    }
  }

  async _sendDelivery(delivery) {
    try {
      if (delivery.channel === 'IN_APP') {
        // Insert into standard notification table
        await knex('in_app_notifications').insert({
          user_id: delivery.recipient_user_id,
          title: 'Monitoring Reminder',
          message: 'You have a pending or overdue monitoring target.',
          event_type: 'REMINDER',
          is_read: false
        });
        return true;
      } else if (delivery.channel === 'EMAIL') {
        if (process.env.PT_MONITORING_EMAIL_ENABLED === 'true') {
          // TODO: Integrate with internal emailService or node-mailer directly
          // For now, assume success as a placeholder
          return true;
        } else {
           // Silently skip if email disabled
           return true;
        }
      }
      return false;
    } catch (error) {
      console.error(`Failed to send delivery ${delivery.id}:`, error);
      return false;
    }
  }
}

module.exports = new InternalMonitoringReminderWorker();
