const { startReminderScheduler } = require('./internalMonitoringReminderScheduler');
const { startWeeklyDigestScheduler } = require('./weeklyDigestScheduler');
const logger = require('../config/winston');

function initSchedulers() {
  logger.info('[SCHEDULER] Inisialisasi scheduler...');
  
  // Nonaktifkan spam reminder per item per jam (Alert Fatigue fix)
  // startReminderScheduler(); 
  
  // Aktifkan Weekly Digest Email (Senin jam 8 pagi)
  startWeeklyDigestScheduler();
  
  logger.info('[SCHEDULER] Weekly Digest Scheduler telah aktif.');
}

initSchedulers();

module.exports = { initSchedulers };
