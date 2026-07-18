const knex = require('../config/knex');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

class InternalMonitoringAuditManifestService {
  
  async buildManifest(run, snapshot) {
    const targets = snapshot.targets;
    const targetIds = targets.map(t => t.id);
    
    // In reality, this would fetch 'monitoring_evidences' versions up to snapshot_at
    const manifestItems = [];

    if (targetIds.length > 0) {
      const evidences = await knex('monitoring_evidences')
        .whereIn('monitoring_target_id', targetIds)
        .where('created_at', '<=', run.snapshot_at);
        
      for (const ev of evidences) {
        manifestItems.push({
          report_run_id: run.id,
          target_id: ev.monitoring_target_id,
          evidence_id: ev.id,
          evidence_version_no: ev.version_no,
          requirement_code: ev.requirement_id.toString(), // Mock
          original_filename: ev.filename,
          object_key: ev.object_key,
          sha256: ev.file_hash,
          included: true
        });
      }
    }

    if (manifestItems.length > 0) {
      await knex('monitoring_evidence_manifests').insert(manifestItems);
    }
    
    const manifestJson = {
      packageVersion: "1.0",
      generatedAt: new Date().toISOString(),
      snapshotAt: run.snapshot_at,
      scope: run.scope_json,
      files: manifestItems
    };

    const filename = `evidence_manifest_${run.id}.json`;
    const tempPath = path.join(process.cwd(), 'tmp', filename);
    
    if (!fs.existsSync(path.join(process.cwd(), 'tmp'))) {
      fs.mkdirSync(path.join(process.cwd(), 'tmp'), { recursive: true });
    }

    fs.writeFileSync(tempPath, JSON.stringify(manifestJson, null, 2));

    const fileBuffer = fs.readFileSync(tempPath);
    const hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
    const stat = fs.statSync(tempPath);

    return {
      type: 'MANIFEST_JSON',
      filename: filename,
      key: `reports/${run.id}/${filename}`,
      mime: 'application/json',
      size: stat.size,
      hash: hash,
      localPath: tempPath
    };
  }

  async sealAuditSnapshot(run, snapshot) {
    // Generate an overall hash for the snapshot data
    const snapshotString = JSON.stringify({
      runId: run.id,
      snapshotAt: run.snapshot_at,
      targetsCount: snapshot.targets.length
    });
    const rootHash = crypto.createHash('sha256').update(snapshotString).digest('hex');
    
    // Find previous seal
    const previous = await knex('monitoring_audit_seals')
      .where('aggregate_type', 'REPORT_RUN')
      .orderBy('snapshot_at', 'desc')
      .first();

    await knex('monitoring_audit_seals').insert({
      aggregate_type: 'REPORT_RUN',
      aggregate_id: run.id,
      snapshot_at: run.snapshot_at,
      record_count: snapshot.targets.length,
      root_hash: rootHash,
      previous_seal_hash: previous ? previous.root_hash : null,
      created_by: run.requested_by
    });
  }
}

module.exports = InternalMonitoringAuditManifestService;
