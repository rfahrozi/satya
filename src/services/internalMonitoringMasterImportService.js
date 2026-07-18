const knex = require('../config/knex');
const crypto = require('crypto');
const { EXPECTED_CHECKLIST_COUNT, FREQUENCY_TYPES, ASSIGNEE_CAPABILITIES } = require('../constants/checklistConfig');

class InternalMonitoringMasterImportService {
  /**
   * Validates canonical JSON, calculates coverage, and stores in DRAFT state.
   */
  async previewImport(actorId, canonicalMaster) {
    if (!canonicalMaster.masterVersion || !canonicalMaster.effectiveFrom || !canonicalMaster.items) {
      throw new Error('Invalid canonical master format');
    }
    if (canonicalMaster.items.length !== EXPECTED_CHECKLIST_COUNT) {
      throw new Error(`Expected exactly ${EXPECTED_CHECKLIST_COUNT} items, but got ${canonicalMaster.items.length}`);
    }

    const sourceHash = crypto.createHash('sha256').update(JSON.stringify(canonicalMaster)).digest('hex');

    // Check if hash already exists
    const existing = await knex('monitoring_master_versions').where({ source_hash: sourceHash }).first();
    if (existing) {
      throw new Error(`Master version with this exact content already exists (ID: ${existing.id})`);
    }

    const report = {
      expectedItems: EXPECTED_CHECKLIST_COUNT,
      importedItems: canonicalMaster.items.length,
      missingChecklists: [],
      duplicateChecklists: [],
      missingAssignments: [],
      missingRequirements: [],
      invalidFrequencies: []
    };

    const itemCodeSet = new Set();
    // Checklist codes sekarang berformat AMP-xxx, PZ-xxx, AKIP-xxx, REG-xxx
    // Validasi dilakukan terhadap item yang dikirim (bukan hardcode CHK-xxx)

    canonicalMaster.items.forEach(item => {
      if (itemCodeSet.has(item.itemCode)) {
        report.duplicateChecklists.push(item.itemCode);
      }
      itemCodeSet.add(item.itemCode);

      // Validate assignment coverage
      const capabilities = item.assignments.map(a => a.capability);
      if (!capabilities.includes('COLLECTOR')) report.missingAssignments.push(`${item.itemCode}: missing COLLECTOR`);
      if (!capabilities.includes('ACCOUNTABLE_OWNER') && !capabilities.includes('APPROVER')) {
        report.missingAssignments.push(`${item.itemCode}: missing ACCOUNTABLE_OWNER/APPROVER`);
      }
      if (!capabilities.includes('VERIFIER')) report.missingAssignments.push(`${item.itemCode}: missing VERIFIER`);

      if (!item.requirements || item.requirements.length === 0) {
        report.missingRequirements.push(item.itemCode);
      }

      if (!FREQUENCY_TYPES.includes(item.frequencyType)) {
        report.invalidFrequencies.push(`${item.itemCode}: ${item.frequencyType}`);
      }
    });

    // Validasi duplikasi: tidak boleh ada item code yang sama
    // (missingChecklists tidak lagi divalidasi per CHK-xxx — format kode bebas)

    return {
      isValid: report.duplicateChecklists.length === 0 &&
               report.missingAssignments.length === 0 && report.missingRequirements.length === 0 &&
               report.invalidFrequencies.length === 0,
      report,
      canonicalMaster,
      sourceHash
    };
  }

  /**
   * Commits a canonical master payload transactionally.
   */
  async commitImport(actorId, canonicalMaster, sourceHash) {
    return await knex.transaction(async trx => {
      const [versionId] = await trx('monitoring_master_versions').insert({
        version_code: canonicalMaster.masterVersion,
        source_name: 'CANONICAL_JSON',
        source_hash: sourceHash,
        effective_from: canonicalMaster.effectiveFrom,
        status: 'VALIDATED',
        created_by: actorId
      }).returning('id');

      for (const item of canonicalMaster.items) {
        // Insert item
        const [itemId] = await trx('monitoring_items').insert({
          master_version_id: versionId.id || versionId,
          item_code: item.itemCode,
          title: item.title,
          duty_cluster: item.dutyCluster,
          normalization_type: item.normalizationType,
          frequency_type: item.frequencyType,
          frequency_config_json: JSON.stringify(item.frequencyConfig || {}),
          deadline_config_json: JSON.stringify(item.deadlineConfig || {}),
          effective_from: canonicalMaster.effectiveFrom,
          is_active: true
        }).returning('id');

        // Insert assessments & criteria
        if (item.criteria) {
          for (const crit of item.criteria) {
            let assessment = await trx('monitoring_source_assessments').where('code', crit.assessment).first();
            let assessmentId = assessment ? assessment.id : null;
            if (!assessmentId) {
              const [insertedAssessment] = await trx('monitoring_source_assessments').insert({ code: crit.assessment, name: crit.assessment }).returning('id');
              assessmentId = insertedAssessment.id || insertedAssessment;
            }

            let criterion = await trx('monitoring_source_criteria').where({ assessment_id: assessmentId, criterion_code: crit.criterionCode }).first();
            let criterionId = criterion ? criterion.id : null;
            if (!criterionId) {
              const [insertedCrit] = await trx('monitoring_source_criteria').insert({
                assessment_id: assessmentId,
                criterion_code: crit.criterionCode,
                criterion_text: crit.criterionText || ''
              }).returning('id');
              criterionId = insertedCrit.id || insertedCrit;
            }

            await trx('monitoring_item_criteria').insert({
              monitoring_item_id: itemId.id || itemId,
              source_criterion_id: criterionId
            });
          }
        }

        // Insert parameters
        if (item.parameters) {
          for (const param of item.parameters) {
            await trx('monitoring_item_parameters').insert({
              monitoring_item_id: itemId.id || itemId,
              parameter_code: param.parameterCode,
              label: param.label,
              data_type: param.dataType,
              unit: param.unit,
              required: param.required !== false,
              validation_json: JSON.stringify(param.validation || {})
            });
          }
        }

        // Insert evidence requirements
        if (item.requirements) {
          for (const req of item.requirements) {
            await trx('monitoring_evidence_requirement_templates').insert({
              monitoring_item_id: itemId.id || itemId,
              requirement_code: req.requirementCode,
              label: req.label,
              evidence_type: req.type,
              required: req.required !== false,
              allows_multiple: req.allowsMultiple === true,
              validation_json: JSON.stringify(req.validation || {})
            });
          }
        }

        // Insert regulations
        if (item.regulations) {
          for (const reg of item.regulations) {
            await trx('monitoring_item_regulations').insert({
              monitoring_item_id: itemId.id || itemId,
              regulation_code: reg.code,
              title: reg.title,
              source_url: reg.url,
              is_deadline_authority: reg.isDeadlineAuthority === true
            });
          }
        }
      }

      return versionId.id || versionId;
    });
  }

  async activateMasterVersion(actorId, masterVersionId) {
    return await knex.transaction(async trx => {
      await trx('monitoring_master_versions').update({ status: 'SUPERSEDED' }).where('status', 'ACTIVE');
      await trx('monitoring_master_versions').where('id', masterVersionId).update({
        status: 'ACTIVE',
        committed_at: knex.fn.now()
      });
      return true;
    });
  }

  async getCoverage(masterVersionId) {
    const items = await knex('monitoring_items').where('master_version_id', masterVersionId);
    return {
      totalItems: items.length,
      isFullyCovered: items.length === EXPECTED_CHECKLIST_COUNT
    };
  }
}

module.exports = new InternalMonitoringMasterImportService();
