const masterRepo = require('./internalMonitoring/masterRepo');
const targetRepo = require('./internalMonitoring/targetRepo');
const evidenceRepo = require('./internalMonitoring/evidenceRepo');
const dashboardRepo = require('./internalMonitoring/dashboardRepo');

module.exports = {
  ...masterRepo,
  ...targetRepo,
  ...evidenceRepo,
  ...dashboardRepo
};
