const knex = require('../config/knex');

class InternalMonitoringRetentionService {

  async placeLegalHold(scopeType, scopeId, reason, actorId, referenceNumber = null) {
    const [hold] = await knex('monitoring_legal_holds').insert({
      scope_type: scopeType,
      scope_id: scopeId,
      reason: reason,
      reference_number: referenceNumber,
      created_by: actorId,
      started_at: new Date()
    }).returning('*');

    return hold;
  }

  async releaseLegalHold(holdId) {
    const [hold] = await knex('monitoring_legal_holds')
      .where('id', holdId)
      .whereNull('ended_at')
      .update({
        ended_at: new Date()
      }).returning('*');
    return hold;
  }

  async checkLegalHold(scopeType, scopeId) {
    const hold = await knex('monitoring_legal_holds')
      .where('scope_type', scopeType)
      .where('scope_id', scopeId)
      .whereNull('ended_at')
      .first();
    
    return hold != null;
  }

  async cleanExpiredExportFiles() {
    const now = new Date();
    
    const expiredFiles = await knex('monitoring_export_files')
      .whereNotNull('expires_at')
      .where('expires_at', '<', now);

    let deletedCount = 0;
    for (const file of expiredFiles) {
      // Check if report run is under legal hold (scope_type: 'REPORT_RUN')
      const underHold = await this.checkLegalHold('REPORT_RUN', file.report_run_id.toString());
      
      if (!underHold) {
        // Here we would call S3 / Minio to delete the file.object_key
        // e.g. await minioClient.removeObject(BUCKET, file.object_key);
        
        await knex('monitoring_export_files').where('id', file.id).del();
        deletedCount++;
      }
    }
    return deletedCount;
  }
}

module.exports = InternalMonitoringRetentionService;
