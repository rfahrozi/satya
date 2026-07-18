const repo = require('../repositories/internalMonitoring/masterRepo');
const generator = require('../services/internalMonitoringGeneratorService');
const knex = require('../config/knex');

exports.listMasterItems = async (req, res, next) => {
  try {
    // Mengambil daftar checklist dan unit yang bertanggung jawab
    const items = await knex('monitoring_items')
      .leftJoin('monitoring_item_assignments as mia', 'monitoring_items.id', 'mia.monitoring_item_id')
      .leftJoin('internal_units as iu', 'mia.internal_unit_id', 'iu.id')
      .select(
        'monitoring_items.id',
        'monitoring_items.item_code',
        'monitoring_items.title',
        'monitoring_items.duty_cluster',
        'monitoring_items.frequency_type',
        'monitoring_items.is_active',
        'iu.name as unit_name'
      )
      .where('monitoring_items.is_active', true)
      .orderBy('monitoring_items.item_code', 'asc');

    res.json({ success: true, data: items });
  } catch (err) {
    next(err);
  }
};

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
    const result = await generator.previewTargets(req.params.id, req.user);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
};

exports.generateTargets = async (req, res, next) => {
  try {
    const result = await generator.generateTargets(req.params.id, req.user);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
};
