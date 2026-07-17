const repo = require('../repositories/internalMonitoringRepo');
const generator = require('../services/internalMonitoringGeneratorService');

exports.listPeriods = async (req, res, next) => {
  try {
    const periods = await repo.listPeriods(req.query);
    res.json({ success: true, data: periods });
  } catch (err) { next(err); }
};

exports.createPeriod = async (req, res, next) => {
  try {
    const id = await repo.createPeriod(req.body, req.user.id);
    res.status(201).json({ success: true, data: { id } });
  } catch (err) { next(err); }
};

exports.openPeriod = async (req, res, next) => {
  try {
    await repo.updatePeriod(req.params.id, { status: 'OPEN', opened_at: new Date() });
    res.json({ success: true, message: 'Period opened' });
  } catch (err) { next(err); }
};

exports.generatePreview = async (req, res, next) => {
  try {
    const result = await generator.previewMonthlyTargets(req.params.id, req.user);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
};

exports.generateTargets = async (req, res, next) => {
  try {
    const result = await generator.generateMonthlyTargets(req.params.id, req.user);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
};
