const knex = require('../config/knex');
const InternalMonitoringReportService = require('../services/internalMonitoringReportService');

class InternalMonitoringReportWorker {
  constructor() {
    this.reportService = new InternalMonitoringReportService();
    this.isRunning = false;
  }

  async start(intervalMs = 5000) {
    if (this.isRunning) return;
    this.isRunning = true;

    console.log('Internal Monitoring Report Worker started.');
    
    // Simple polling mechanism
    const poll = async () => {
      if (!this.isRunning) return;
      try {
        await this.processNextRun();
      } catch (err) {
        console.error('Report Worker Error:', err);
      }
      setTimeout(poll, intervalMs);
    };

    poll();
  }

  stop() {
    this.isRunning = false;
    console.log('Internal Monitoring Report Worker stopped.');
  }

  async processNextRun() {
    // Find the oldest QUEUED run
    const queuedRun = await knex('monitoring_report_runs')
      .where('status', 'QUEUED')
      .orderBy('created_at', 'asc')
      .first();

    if (!queuedRun) return;

    console.log(`Report Worker processing run ${queuedRun.id}`);
    await this.reportService.processReportRun(queuedRun.id);
  }
}

module.exports = new InternalMonitoringReportWorker();
