const cron = require('node-cron');
const reminderService = require('../services/internalMonitoringReminderService');

function startReminderScheduler() {
  if (process.env.PT_INTERNAL_MONITORING_ENABLED !== 'true') return;

  // Run every 4 hours or customizable via CRON expr
  cron.schedule('0 */4 * * *', async () => {
    console.log('Running internal monitoring reminder scheduler...');
    try {
      await reminderService.scanDueReminders();
      console.log('Reminder scheduler finished successfully.');
    } catch (err) {
      console.error('Reminder scheduler failed:', err);
    }
  });
}

module.exports = { startReminderScheduler };
