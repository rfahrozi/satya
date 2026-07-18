module.exports = {
  monthly: require('./monthlyStrategy'),
  quarterly: require('./quarterlyStrategy'),
  semiannual: require('./semiannualStrategy'),
  annualRegulator: require('./annualRegulatorStrategy'),
  annualChange: require('./annualChangeStrategy'),
  continuousReview: require('./continuousReviewStrategy'),
  eventRecap: require('./eventRecapStrategy')
};