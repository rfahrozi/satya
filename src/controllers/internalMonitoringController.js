const repo = require('../repositories/internalMonitoring/targetRepo');
const service = require('../services/internalMonitoringService');
const fileType = require('file-type');

exports.listTargets = async (req, res, next) => {
  try {
    const pagination = { limit: parseInt(req.query.limit) || 100, offset: parseInt(req.query.offset) || 0 };

    // [SEC-B03] Otorisasi Kondisional (Mencegah IDOR Massal)
    // Jika User BUKAN Admin/Pimpinan/Verifier, paksa mereka HANYA melihat data miliknya sendiri
    const privilegedRoles = ['ADMIN_PT', 'PIMPINAN_PT', 'VERIFIER'];
    if (!privilegedRoles.includes(req.user.role)) {
       const targets = await repo.listTargetsForUser(req.user.id, req.query, pagination);
       return res.json({ success: true, data: targets, pagination, enforced_personal_scope: true });
    }

    const targets = await repo.listTargets(req.query, pagination);
    res.json({ success: true, data: targets, pagination });
  } catch (err) { next(err); }
};

exports.listMyTargets = async (req, res, next) => {
  try {
    const pagination = { limit: parseInt(req.query.limit) || 100, offset: parseInt(req.query.offset) || 0 };
    const targets = await repo.listTargetsForUser(req.user.id, req.query, pagination);
    res.json({ success: true, data: targets, pagination });
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
    const result = await service.submitTarget(req.params.id, req.user, req.body);
    res.json(result);
  } catch (err) { next(err); }
};

exports.approveTarget = async (req, res, next) => {
  try {
    const result = await service.approveTarget(req.params.id, req.user, req.body);
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

exports.batchVerifyTargets = async (req, res, next) => {
  try {
    const result = await service.batchVerifyTargets(req.user, req.body);
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
        message: 'Tipe file tidak diizinkan di level header HTTP.'
      });
    }

    // [SEC-06] Validasi Magic Bytes (File Signature)
    // Karena kita memakai diskStorage (SRE-01), kita baca dari req.file.path
    const detected = await fileType.fromFile(req.file.path);
    if (!detected) {
      require('fs').unlinkSync(req.file.path); // Hapus file temporer
      return res.status(400).json({
        success: false,
        message: 'Tidak dapat memverifikasi isi file. File mungkin rusak atau format tidak dikenali.'
      });
    }

    const safeMimes = [...allowedMimeTypes, 'application/zip'];
    if (!safeMimes.includes(detected.mime)) {
      require('fs').unlinkSync(req.file.path); // Hapus file temporer
      return res.status(400).json({
        success: false,
        message: `Isi file (${detected.mime}) tidak sesuai dengan ekstensi yang diklaim.`
      });
    }

    const result = await service.uploadEvidenceFile(req.user, req.params.id, req.params.requirementId, req.file, req.body);
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    if (req.file && req.file.path) {
      try { require('fs').unlinkSync(req.file.path); } catch(e) {}
    }
    next(err);
  }
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
