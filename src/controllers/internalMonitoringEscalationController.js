const knex = require('../config/knex');
const escalationService = require('../services/internalMonitoringEscalationService');

exports.listRules = async (req, res, next) => {
  try {
    const rules = await knex('monitoring_escalation_rules');
    res.json({ success: true, data: rules });
  } catch (err) { next(err); }
};

exports.createRule = async (req, res, next) => {
  try {
    const [id] = await knex('monitoring_escalation_rules').insert(req.body).returning('id');
    res.status(201).json({ success: true, data: { id } });
  } catch (err) { next(err); }
};

exports.updateRule = async (req, res, next) => {
  try {
    await knex('monitoring_escalation_rules').where('id', req.params.id).update(req.body);
    res.json({ success: true, message: 'Rule updated' });
  } catch (err) { next(err); }
};

exports.listEscalations = async (req, res, next) => {
  try {
    const data = await knex('monitoring_escalations').orderBy('triggered_at', 'desc');
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

exports.acknowledgeEscalation = async (req, res, next) => {
  try {
    const success = await escalationService.acknowledgeEscalation(req.user, req.params.id, req.body.note || '');
    if (!success) return res.status(404).json({ success: false, message: 'Escalation not found or not OPEN' });
    res.json({ success: true, message: 'Acknowledged' });
  } catch (err) { next(err); }
};

exports.resolveEscalation = async (req, res, next) => {
  try {
    const success = await escalationService.resolveEscalation(req.user, req.params.id, req.body.note || '');
    if (!success) return res.status(404).json({ success: false, message: 'Escalation not found or closed' });
    res.json({ success: true, message: 'Resolved' });
  } catch (err) { next(err); }
};
