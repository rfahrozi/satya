const InternalMonitoringReportService = require('../services/internalMonitoringReportService');
const knex = require('../config/knex');
const fs = require('fs');

class InternalMonitoringReportController {
  constructor() {
    this.reportService = new InternalMonitoringReportService();
  }

  createReportRun = async (req, res, next) => {
    try {
      const { templateCode, scope, parameters } = req.body;
      const run = await this.reportService.createReportRun(req.user, templateCode, scope, parameters);
      res.status(201).json({ success: true, data: run });
    } catch (err) {
      next(err);
    }
  };

  getReportRuns = async (req, res, next) => {
    try {
      const runs = await knex('monitoring_report_runs')
        .orderBy('created_at', 'desc')
        .limit(50);
      res.json({ success: true, data: runs });
    } catch (err) {
      next(err);
    }
  };

  getReportRunDetail = async (req, res, next) => {
    try {
      const run = await knex('monitoring_report_runs').where('id', req.params.id).first();
      if (!run) return res.status(404).json({ success: false, message: 'Not found' });
      
      const files = await knex('monitoring_export_files').where('report_run_id', run.id);
      
      res.json({ success: true, data: { ...run, files } });
    } catch (err) {
      next(err);
    }
  };

  downloadReportFile = async (req, res, next) => {
    try {
      const file = await knex('monitoring_export_files')
        .where('report_run_id', req.params.id)
        .where('id', req.params.fileId)
        .first();

      if (!file) return res.status(404).json({ success: false, message: 'File not found' });

      // In reality, this would check if the user is authorized for the run's scope.
      // E.g., if ADMIN_PT -> allow
      // If Unit PIC -> verify unitId matches run scope
      
      // If file expired
      if (file.expires_at && new Date() > new Date(file.expires_at)) {
        return res.status(410).json({ success: false, message: 'File has expired' });
      }

      // Stream from tmp directory (in production: redirect to Minio signed URL or stream from S3)
      const localPath = file.object_key; // Actually I stored key like `reports/${run.id}/${filename}`
      // The real local path from my mockup is process.cwd()/tmp/filename
      const actualPath = require('path').join(process.cwd(), 'tmp', file.original_filename);

      if (fs.existsSync(actualPath)) {
        res.setHeader('Content-Type', file.mime_type);
        res.setHeader('Content-Disposition', `attachment; filename="${file.original_filename}"`);
        const stream = fs.createReadStream(actualPath);
        stream.pipe(res);
      } else {
        return res.status(404).json({ success: false, message: 'Physical file not found on disk' });
      }
    } catch (err) {
      next(err);
    }
  };
}

module.exports = new InternalMonitoringReportController();
