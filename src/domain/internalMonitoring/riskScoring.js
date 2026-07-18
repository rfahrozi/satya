class RiskScoring {
  static getLevel(score) {
    if (score >= 17 && score <= 25) return 'CRITICAL';
    if (score >= 10 && score <= 16) return 'HIGH';
    if (score >= 5 && score <= 9) return 'MEDIUM';
    if (score >= 1 && score <= 4) return 'LOW';
    throw new Error('Invalid score range');
  }

  static calculate(likelihood, impact) {
    if (likelihood < 1 || likelihood > 5) throw new Error('Likelihood must be between 1 and 5');
    if (impact < 1 || impact > 5) throw new Error('Impact must be between 1 and 5');
    
    const score = likelihood * impact;
    const level = this.getLevel(score);
    
    return {
      score,
      level,
      likelihood,
      impact
    };
  }
}

module.exports = RiskScoring;
