const service = require('../services/internalMonitoringMasterImportService');

exports.previewImport = async (req, res, next) => {
  try {
    if (!req.file) throw new Error('File excel required');
    const result = await service.previewImport(req.user, req.file);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
};

exports.commitImport = async (req, res, next) => {
  try {
    const result = await service.commitImport(req.user, req.params.id);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
};

exports.getCoverageReport = async (req, res, next) => {
  try {
    const result = await service.getCoverageReport(req.user, req.params.id);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
};
