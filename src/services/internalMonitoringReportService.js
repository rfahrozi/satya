const knex = require('../config/knex');
const InternalMonitoringAuditManifestService = require('./internalMonitoringAuditManifestService');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');

class InternalMonitoringReportService {
  constructor() {
    this.manifestService = new InternalMonitoringAuditManifestService();
  }

  async createReportRun(actor, templateCode, scope, parameters) {
    const template = await knex('monitoring_report_templates')
      .where('code', templateCode)
      .where('is_active', true)
      .first();

    if (!template) {
      const error = new Error('Template not found or inactive');
      error.statusCode = 404;
      throw error;
    }

    const idempotencyKey = crypto.randomUUID(); // Simplification, could be hashed from parameters

    const [run] = await knex('monitoring_report_runs').insert({
      template_id: template.id,
      requested_by: actor.id,
      scope_type: template.scope_type,
      scope_json: JSON.stringify(scope || {}),
      parameters_json: JSON.stringify(parameters || {}),
      idempotency_key: idempotencyKey,
      status: 'QUEUED'
    }).returning('*');

    return run;
  }

  async processReportRun(reportRunId) {
    const trx = await knex.transaction();
    try {
      // 1. Lock the run
      const run = await trx('monitoring_report_runs')
        .where('id', reportRunId)
        .whereIn('status', ['QUEUED', 'FAILED'])
        .forUpdate()
        .first();

      if (!run) {
        await trx.rollback();
        return; // Already processed or doesn't exist
      }

      await trx('monitoring_report_runs').where('id', run.id).update({
        status: 'PROCESSING',
        started_at: new Date(),
        progress_percent: 10
      });

      const template = await trx('monitoring_report_templates').where('id', run.template_id).first();

      await trx.commit();

      // Proceed out of transaction to avoid long locks
      await this.updateProgress(run.id, 20);

      // 2. Build Snapshot
      const snapshot = await this.buildSnapshot(run);
      await this.updateProgress(run.id, 30);

      const files = [];

      // 3. Generate Reports based on template
      if (template.report_type === 'EXECUTIVE_SUMMARY' || template.report_type === 'EVIDENCE_PACKAGE') {
        const pdfFile = await this.renderPdf(run, snapshot, template);
        files.push(pdfFile);
      }

      if (template.report_type === 'COMPLIANCE_DETAIL' || template.report_type === 'EVIDENCE_PACKAGE') {
        const xlsxFile = await this.renderSpreadsheet(run, snapshot, template);
        files.push(xlsxFile);
      }
      
      await this.updateProgress(run.id, 50);

      // 4. Evidence Manifest and ZIP
      if (template.report_type === 'EVIDENCE_PACKAGE') {
        const manifest = await this.manifestService.buildManifest(run, snapshot);
        files.push(manifest);

        const zipFile = await this.buildEvidenceZip(run, files, manifest);
        files.push(zipFile);
      }

      await this.updateProgress(run.id, 80);

      // 5. Audit Seal
      await this.manifestService.sealAuditSnapshot(run, snapshot);

      // 6. Save Export Files
      for (const f of files) {
        await knex('monitoring_export_files').insert({
          report_run_id: run.id,
          file_type: f.type,
          original_filename: f.filename,
          object_key: f.key,
          mime_type: f.mime,
          size_bytes: f.size,
          sha256: f.hash,
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
        });
      }

      // 7. Complete
      await knex('monitoring_report_runs').where('id', run.id).update({
        status: 'COMPLETED',
        progress_percent: 100,
        completed_at: new Date()
      });

    } catch (err) {
      if (trx && !trx.isCompleted()) {
        await trx.rollback();
      }
      console.error(`Error processing report run ${reportRunId}:`, err);
      await knex('monitoring_report_runs').where('id', reportRunId).update({
        status: 'FAILED',
        failed_at: new Date(),
        failure_message: err.message
      });
    }
  }

  async updateProgress(runId, percent) {
    await knex('monitoring_report_runs').where('id', runId).update({ progress_percent: percent });
  }

  async buildSnapshot(run) {
    // In a real implementation, this gathers all data up to run.snapshot_at
    const targets = await knex('monitoring_targets')
      .where('period_id', run.scope_json.period_id || 0)
      .where('created_at', '<=', run.snapshot_at);
      
    return {
      targets: targets,
      snapshot_at: run.snapshot_at
    };
  }

  async renderPdf(run, snapshot, template) {
    return new Promise((resolve, reject) => {
      const filename = `executive_summary_${run.id}.pdf`;
      const key = `reports/${run.id}/${filename}`;
      const tempPath = path.join(process.cwd(), 'tmp', filename);
      
      // Ensure tmp dir exists
      if (!fs.existsSync(path.join(process.cwd(), 'tmp'))) {
        fs.mkdirSync(path.join(process.cwd(), 'tmp'), { recursive: true });
      }

      const doc = new PDFDocument();
      const stream = fs.createWriteStream(tempPath);
      
      doc.pipe(stream);
      
      // Content
      doc.fontSize(20).text(`Executive Summary`, { align: 'center' });
      doc.moveDown();
      doc.fontSize(12).text(`Report Run: ${run.id}`);
      doc.text(`Snapshot Time: ${run.snapshot_at}`);
      doc.text(`Total Targets: ${snapshot.targets.length}`);
      
      doc.end();

      stream.on('finish', () => {
        // Calculate hash
        const fileBuffer = fs.readFileSync(tempPath);
        const hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
        const stat = fs.statSync(tempPath);
        
        resolve({
          type: 'EXECUTIVE_SUMMARY',
          filename: filename,
          key: key,
          mime: 'application/pdf',
          size: stat.size,
          hash: hash,
          localPath: tempPath
        });
      });
      stream.on('error', reject);
    });
  }

  async renderSpreadsheet(run, snapshot, template) {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'SATYA Internal Monitoring';
    
    const summarySheet = workbook.addWorksheet('Summary');
    summarySheet.columns = [
      { header: 'Metric', key: 'metric', width: 30 },
      { header: 'Value', key: 'value', width: 30 }
    ];
    summarySheet.addRow({ metric: 'Total Targets', value: snapshot.targets.length });
    
    const targetSheet = workbook.addWorksheet('Targets');
    targetSheet.columns = [
      { header: 'ID', key: 'id' },
      { header: 'Status', key: 'workflow_status' },
      { header: 'Due At', key: 'due_at' }
    ];
    snapshot.targets.forEach(t => targetSheet.addRow(t));

    const filename = `compliance_detail_${run.id}.xlsx`;
    const key = `reports/${run.id}/${filename}`;
    const tempPath = path.join(process.cwd(), 'tmp', filename);

    if (!fs.existsSync(path.join(process.cwd(), 'tmp'))) {
      fs.mkdirSync(path.join(process.cwd(), 'tmp'), { recursive: true });
    }

    await workbook.xlsx.writeFile(tempPath);
    
    const fileBuffer = fs.readFileSync(tempPath);
    const hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
    const stat = fs.statSync(tempPath);

    return {
      type: 'COMPLIANCE_DETAIL',
      filename: filename,
      key: key,
      mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      size: stat.size,
      hash: hash,
      localPath: tempPath
    };
  }

  async buildEvidenceZip(run, existingFiles, manifest) {
    return new Promise((resolve, reject) => {
      const filename = `evidence_package_${run.id}.zip`;
      const key = `reports/${run.id}/${filename}`;
      const tempPath = path.join(process.cwd(), 'tmp', filename);

      const output = fs.createWriteStream(tempPath);
      const archive = archiver('zip', { zlib: { level: 9 } });

      output.on('close', () => {
        const fileBuffer = fs.readFileSync(tempPath);
        const hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
        const stat = fs.statSync(tempPath);
        
        resolve({
          type: 'EVIDENCE_PACKAGE',
          filename: filename,
          key: key,
          mime: 'application/zip',
          size: stat.size,
          hash: hash,
          localPath: tempPath
        });
      });

      archive.on('error', (err) => reject(err));
      archive.pipe(output);

      // Append readme
      archive.append('This is an automated evidence package.', { name: '00_README.txt' });
      
      // Append generated files
      existingFiles.forEach(f => {
        if (f.localPath) {
          archive.file(f.localPath, { name: f.filename });
        }
      });
      
      // Append manifest
      if (manifest && manifest.localPath) {
        archive.file(manifest.localPath, { name: '03_evidence_manifest.json' });
      }

      // Mock appending real evidence
      // In reality, this would stream from Minio
      // archive.append(streamFromMinio, { name: 'evidence/CHK-001/doc.pdf' });

      archive.finalize();
    });
  }
}

module.exports = InternalMonitoringReportService;
