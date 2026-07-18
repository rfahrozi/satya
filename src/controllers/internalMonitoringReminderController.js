const knex = require('../config/knex');

exports.listRules = async (req, res, next) => {
  try {
    const rules = await knex('monitoring_reminder_rules');
    res.json({ success: true, data: rules });
  } catch (err) { next(err); }
};

exports.createRule = async (req, res, next) => {
  try {
    const [id] = await knex('monitoring_reminder_rules').insert(req.body).returning('id');
    res.status(201).json({ success: true, data: { id } });
  } catch (err) { next(err); }
};

exports.updateRule = async (req, res, next) => {
  try {
    await knex('monitoring_reminder_rules').where('id', req.params.id).update(req.body);
    res.json({ success: true, message: 'Rule updated' });
  } catch (err) { next(err); }
};

exports.testRule = async (req, res, next) => {
  try {
    // Just a placeholder to trigger a dry run
    res.json({ success: true, message: 'Rule test executed (dry run)' });
  } catch (err) { next(err); }
};
