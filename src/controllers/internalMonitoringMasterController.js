const repo = require('../repositories/internalMonitoring/masterRepo');
const generator = require('../services/internalMonitoringGeneratorService');
const knex = require('../config/knex');

exports.listMasterItems = async (req, res, next) => {
  try {
    // Filter opsional: assessment (AMPUH|PMPZI|AKIP|REGULASI) dan duty_cluster
    const { assessment, duty_cluster, limit, offset } = req.query;

    // Map assessment tab → prefix item_code
    const ASSESSMENT_PREFIX_MAP = {
      AMPUH:    'AMP-%',
      PMPZI:    'PZ-%',
      AKIP:     'AKIP-%',
      REGULASI: 'REG-%',
    };

    let query = knex('monitoring_items')
      .leftJoin('monitoring_item_assignments as mia', 'monitoring_items.id', 'mia.monitoring_item_id')
      .leftJoin('internal_units as iu', 'mia.internal_unit_id', 'iu.id')
      .select(
        'monitoring_items.id',
        'monitoring_items.item_code',
        'monitoring_items.title',
        'monitoring_items.duty_cluster',
        'monitoring_items.frequency_type',
        'monitoring_items.is_active',
        'iu.name as unit_name',
        'iu.code as unit_code'
      )
      .where('monitoring_items.is_active', true)
      .orderBy('monitoring_items.item_code', 'asc');

    // Filter berdasarkan assessment tab
    if (assessment && ASSESSMENT_PREFIX_MAP[assessment.toUpperCase()]) {
      query = query.whereLike('monitoring_items.item_code', ASSESSMENT_PREFIX_MAP[assessment.toUpperCase()]);
    }

    // Filter berdasarkan rumpun tupoksi
    if (duty_cluster) {
      query = query.where('monitoring_items.duty_cluster', duty_cluster);
    }

    // Pagination
    if (limit) query = query.limit(parseInt(limit, 10));
    if (offset) query = query.offset(parseInt(offset, 10));

    const items = await query;
    res.json({ success: true, data: items, total: items.length });
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
