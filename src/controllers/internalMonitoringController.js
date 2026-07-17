const repo = require('../repositories/internalMonitoringRepo');
const service = require('../services/internalMonitoringService');

exports.listTargets = async (req, res, next) => {
  try {
    const targets = await repo.listTargets(req.query);
    res.json({ success: true, data: targets });
  } catch (err) { next(err); }
};

exports.listMyTargets = async (req, res, next) => {
  try {
    const targets = await repo.listTargetsForUser(req.user.id, req.query);
    res.json({ success: true, data: targets });
  } catch (err) { next(err); }
};

exports.getTargetDetail = async (req, res, next) => {
  try {
    const target = await service.getTarget(req.params.id, req.user);
    res.json({ success: true, data: target });
  } catch (err) { next(err); }
};

exports.saveDraft = async (req, res, next) => {
  try {
    const result = await service.saveDraft(req.params.id, req.body, req.user);
    res.json(result);
  } catch (err) { next(err); }
};

exports.submitTarget = async (req, res, next) => {
  try {
    const result = await service.submitTarget(req.params.id, req.user);
    res.json(result);
  } catch (err) { next(err); }
};

exports.approveTarget = async (req, res, next) => {
  try {
    const result = await service.approveTarget(req.params.id, req.user);
    res.json(result);
  } catch (err) { next(err); }
};

exports.requestRevision = async (req, res, next) => {
  try {
    const result = await service.requestRevision(req.params.id, req.user, req.body);
    res.json(result);
  } catch (err) { next(err); }
};

exports.verifyTarget = async (req, res, next) => {
  try {
    const result = await service.verifyTarget(req.params.id, req.user, req.body);
    res.json(result);
  } catch (err) { next(err); }
};

exports.listEvidence = async (req, res, next) => {
  try {
    const evs = await service.listTargetEvidence(req.user, req.params.id);
    res.json({ success: true, data: evs });
  } catch (err) { next(err); }
};

exports.addEvidenceFile = async (req, res, next) => {
  try {
    if (!req.file) throw new Error('File required');
    
    const allowedMimeTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // xlsx
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document' // docx
    ];

    if (!allowedMimeTypes.includes(req.file.mimetype)) {
      return res.status(400).json({
        success: false,
        message: 'Tipe file tidak diizinkan. Gunakan PDF, JPG, PNG, DOCX, atau XLSX.'
      });
    }

    const result = await service.uploadEvidenceFile(req.user, req.params.id, req.params.requirementId, req.file);
    res.status(201).json({ success: true, data: result });
  } catch (err) { next(err); }
};

exports.getEvidenceDownloadUrl = async (req, res, next) => {
  try {
    const url = await service.getEvidenceDownloadUrl(req.user, req.params.id, req.params.evidenceId);
    res.json({ success: true, data: { url } });
  } catch (err) { next(err); }
};

exports.addEvidence = async (req, res, next) => {
  try {
    const result = await service.saveEvidence(req.user, req.params.id, req.body);
    res.status(201).json({ success: true, data: result });
  } catch (err) { next(err); }
};

exports.listFollowUps = async (req, res, next) => {
  try {
    const data = await service.listFollowUps(req.params.id, req.user);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

exports.createFollowUp = async (req, res, next) => {
  try {
    const data = await service.createFollowUp(req.params.id, req.body, req.user);
    res.status(201).json({ success: true, data });
  } catch (err) { next(err); }
};

exports.startFollowUp = async (req, res, next) => {
  try {
    const data = await service.changeFollowUpStatus(req.params.id, 'start', req.body, req.user);
    res.json(data);
  } catch (err) { next(err); }
};

exports.submitFollowUpResolution = async (req, res, next) => {
  try {
    const data = await service.changeFollowUpStatus(req.params.id, 'submit-resolution', req.body, req.user);
    res.json(data);
  } catch (err) { next(err); }
};

exports.closeFollowUp = async (req, res, next) => {
  try {
    const data = await service.changeFollowUpStatus(req.params.id, 'close', req.body, req.user);
    res.json(data);
  } catch (err) { next(err); }
};

exports.reopenFollowUp = async (req, res, next) => {
  try {
    const data = await service.changeFollowUpStatus(req.params.id, 'reopen', req.body, req.user);
    res.json(data);
  } catch (err) { next(err); }
};
