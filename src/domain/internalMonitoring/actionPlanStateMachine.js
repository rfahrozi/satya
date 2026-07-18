class ActionPlanStateMachine {
  static getValidTransitions() {
    return {
      'DRAFT': ['PLANNED', 'IN_PROGRESS', 'CANCELLED'],
      'PLANNED': ['IN_PROGRESS', 'CANCELLED'],
      'IN_PROGRESS': ['AWAITING_APPROVAL', 'AWAITING_EFFECTIVENESS_REVIEW'], // Bypass approval if no approver
      'AWAITING_APPROVAL': ['APPROVED', 'IN_PROGRESS'], // Approve or Reject
      'APPROVED': ['AWAITING_EFFECTIVENESS_REVIEW'],
      'AWAITING_EFFECTIVENESS_REVIEW': ['EFFECTIVE', 'INEFFECTIVE'],
      'EFFECTIVE': [],
      'INEFFECTIVE': ['IN_PROGRESS'], // Rework
      'CANCELLED': []
    };
  }

  static transition(currentState, action) {
    const validNext = this.getValidTransitions()[currentState] || [];
    
    let targetState = null;

    if (action === 'PLAN' && validNext.includes('PLANNED')) {
      targetState = 'PLANNED';
    } else if (action === 'START' && validNext.includes('IN_PROGRESS')) {
      targetState = 'IN_PROGRESS';
    } else if (action === 'SUBMIT' && validNext.includes('AWAITING_APPROVAL')) {
      targetState = 'AWAITING_APPROVAL';
    } else if (action === 'SUBMIT_DIRECT' && validNext.includes('AWAITING_EFFECTIVENESS_REVIEW')) {
      targetState = 'AWAITING_EFFECTIVENESS_REVIEW';
    } else if (action === 'APPROVE' && validNext.includes('APPROVED')) {
      targetState = 'APPROVED';
    } else if (action === 'REJECT' && validNext.includes('IN_PROGRESS')) {
      targetState = 'IN_PROGRESS';
    } else if (action === 'COMPLETE' && validNext.includes('AWAITING_EFFECTIVENESS_REVIEW')) {
      targetState = 'AWAITING_EFFECTIVENESS_REVIEW';
    } else if (action === 'MARK_EFFECTIVE' && validNext.includes('EFFECTIVE')) {
      targetState = 'EFFECTIVE';
    } else if (action === 'MARK_INEFFECTIVE' && validNext.includes('INEFFECTIVE')) {
      targetState = 'INEFFECTIVE';
    } else if (action === 'REWORK' && validNext.includes('IN_PROGRESS')) {
      targetState = 'IN_PROGRESS';
    } else if (action === 'CANCEL' && validNext.includes('CANCELLED')) {
      targetState = 'CANCELLED';
    }

    if (!targetState) {
      throw new Error(`Invalid transition from ${currentState} using action ${action}`);
    }

    return targetState;
  }
}

module.exports = ActionPlanStateMachine;
