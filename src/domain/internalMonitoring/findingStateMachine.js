class FindingStateMachine {
  static getValidTransitions() {
    return {
      'OPEN': ['UNDER_ASSESSMENT', 'CANCELLED'],
      'UNDER_ASSESSMENT': ['ACTION_REQUIRED', 'ACCEPTED_RISK'],
      'ACTION_REQUIRED': ['ACTION_IN_PROGRESS'],
      'ACTION_IN_PROGRESS': ['PENDING_EFFECTIVENESS_REVIEW'],
      'PENDING_EFFECTIVENESS_REVIEW': ['CLOSED', 'ACTION_IN_PROGRESS'],
      'CLOSED': [],
      'ACCEPTED_RISK': [],
      'CANCELLED': []
    };
  }

  static transition(currentState, action, findingData = {}) {
    const validNext = this.getValidTransitions()[currentState] || [];
    
    let targetState = null;

    if (action === 'CANCEL' && validNext.includes('CANCELLED')) {
      targetState = 'CANCELLED';
    } else if (action === 'ASSESS' && validNext.includes('UNDER_ASSESSMENT')) {
      targetState = 'UNDER_ASSESSMENT';
    } else if (action === 'REQUIRE_ACTION' && validNext.includes('ACTION_REQUIRED')) {
      targetState = 'ACTION_REQUIRED';
    } else if (action === 'ACCEPT_RISK' && validNext.includes('ACCEPTED_RISK')) {
      targetState = 'ACCEPTED_RISK';
    } else if (action === 'START_ACTION' && validNext.includes('ACTION_IN_PROGRESS')) {
      targetState = 'ACTION_IN_PROGRESS';
    } else if (action === 'SUBMIT_FOR_REVIEW' && validNext.includes('PENDING_EFFECTIVENESS_REVIEW')) {
      targetState = 'PENDING_EFFECTIVENESS_REVIEW';
    } else if (action === 'CLOSE' && validNext.includes('CLOSED')) {
      // Validate closure
      if (!findingData.root_cause_category) {
        throw new Error('Cannot close finding without root cause category');
      }
      targetState = 'CLOSED';
    } else if (action === 'REOPEN_ACTION' && validNext.includes('ACTION_IN_PROGRESS')) {
      targetState = 'ACTION_IN_PROGRESS';
    }

    if (!targetState) {
      throw new Error(`Invalid transition from ${currentState} using action ${action}`);
    }

    return targetState;
  }
}

module.exports = FindingStateMachine;
