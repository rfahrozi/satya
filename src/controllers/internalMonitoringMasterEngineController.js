const masterImportService = require('../services/internalMonitoringMasterImportService');
const frequencyService = require('../services/internalMonitoringFrequencyService');
const knex = require('../config/knex');

exports.previewImport = async (req, res, next) => {
  try {
    const actorId = req.user.id;
    const result = await masterImportService.previewImport(actorId, req.body);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

exports.commitImport = async (req, res, next) => {
  try {
    const actorId = req.user.id;
    const { canonicalMaster, sourceHash } = req.body;
    const versionId = await masterImportService.commitImport(actorId, canonicalMaster, sourceHash);
    res.json({ message: 'Master version committed successfully', versionId });
  } catch (err) {
    next(err);
  }
};

exports.activateVersion = async (req, res, next) => {
  try {
    const actorId = req.user.id;
    const { id } = req.params;
    await masterImportService.activateMasterVersion(actorId, id);
    res.json({ message: 'Master version activated successfully' });
  } catch (err) {
    next(err);
  }
};

exports.getCoverage = async (req, res, next) => {
  try {
    const { id } = req.params;
    const coverage = await masterImportService.getCoverage(id);
    res.json(coverage);
  } catch (err) {
    next(err);
  }
};

exports.generateTargetsPreview = async (req, res, next) => {
  try {
    const actorId = req.user.id;
    const { periodId, itemCodes } = req.body;
    const previews = await frequencyService.previewTargets(periodId, itemCodes, actorId);
    res.json(previews);
  } catch (err) {
    next(err);
  }
};

exports.generateTargets = async (req, res, next) => {
  try {
    const actorId = req.user.id;
    const { periodId, itemCodes } = req.body;
    const targetIds = await frequencyService.generateTargets(periodId, itemCodes, actorId);
    res.json({ message: 'Targets generated successfully', targetIds });
  } catch (err) {
    next(err);
  }
};

exports.createEvent = async (req, res, next) => {
  try {
    const actorId = req.user.id;
    const { event_type, title, description, event_date, internal_unit_id } = req.body;
    
    const [eventId] = await knex('monitoring_events').insert({
      event_type, title, description, event_date, internal_unit_id, created_by: actorId
    }).returning('id');
    
    res.json({ message: 'Event created successfully', eventId: eventId.id || eventId });
  } catch (err) {
    next(err);
  }
};

exports.generateEventTargets = async (req, res, next) => {
  try {
    const actorId = req.user.id;
    const { id } = req.params;
    const targetIds = await frequencyService.generateEventTargets(id, actorId);
    res.json({ message: 'Event targets generated successfully', targetIds });
  } catch (err) {
    next(err);
  }
};
