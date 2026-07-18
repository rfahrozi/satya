const TARGET_TRANSITIONS = {
  NOT_STARTED: ['IN_PROGRESS'],
  IN_PROGRESS: ['AWAITING_APPROVAL'],
  AWAITING_APPROVAL: ['AWAITING_VERIFICATION', 'REVISION_REQUIRED'],
  AWAITING_VERIFICATION: ['VERIFIED', 'REVISION_REQUIRED'],
  REVISION_REQUIRED: ['AWAITING_APPROVAL', 'AWAITING_VERIFICATION'],
  VERIFIED: [],
  CANCELLED: [],
  NOT_APPLICABLE: []
};

/**
 * Asserts if a state transition is valid.
 * Throws a 409 INVALID_STATE_TRANSITION error if invalid.
 */
function assertValidTransition(currentStatus, nextStatus) {
  const allowed = TARGET_TRANSITIONS[currentStatus];
  if (!allowed) {
    const err = new Error(`Unknown current status: ${currentStatus}`);
    err.status = 500;
    err.code = 'INVALID_STATE_MACHINE';
    throw err;
  }

  if (!allowed.includes(nextStatus)) {
    const err = new Error(`Cannot transition from ${currentStatus} to ${nextStatus}`);
    err.status = 409;
    err.code = 'INVALID_STATE_TRANSITION';
    throw err;
  }
}

module.exports = {
  TARGET_TRANSITIONS,
  assertValidTransition
};
