/**
 * Operational Fog - Authoritative Server-Side Communication Simulation Engine
 * Manages deterministic scenario event delivery, latency applications, dropped dispatch exclusions,
 * recipient role visibility filtering, and exercise lifecycle state transitions.
 */

export const EXERCISE_STATES = {
  DRAFT: 'Draft',
  READY: 'Ready',
  ACTIVE: 'In Progress',
  PAUSED: 'Paused',
  COMPLETED: 'Completed',
  REVIEWED: 'Reviewed'
};

export const DELIVERY_BEHAVIORS = {
  NORMAL: 'normal',
  DELAYED: 'delayed',
  DROPPED: 'dropped',
  CONFLICTING: 'conflicting',
  INCOMPLETE: 'incomplete'
};

export const DELIVERY_STATUS = {
  PENDING: 'PENDING',
  DELIVERED: 'DELIVERED',
  DELAYED: 'DELAYED',
  DROPPED: 'DROPPED'
};

export const RECIPIENT_ROLES = {
  ALL: 'all',
  COMMANDER: 'commander',
  FIELD_UNIT: 'field_unit',
  LOGISTICS: 'logistics',
  SIGNALS: 'signals'
};

/**
 * Validates exercise lifecycle state transitions.
 */
export function validateStateTransition(currentStatus, targetStatus) {
  const validTransitions = {
    'Draft': ['Ready', 'In Progress', 'Completed'],
    'Ready': ['In Progress', 'Active', 'Completed'],
    'In Progress': ['Paused', 'Completed'],
    'Active': ['Paused', 'Completed'],
    'Paused': ['In Progress', 'Active', 'Completed'],
    'Completed': ['Reviewed'],
    'Reviewed': []
  };

  const allowed = validTransitions[currentStatus] || [];
  if (!allowed.includes(targetStatus) && currentStatus !== targetStatus) {
    throw new Error(`Invalid exercise lifecycle state transition from "${currentStatus}" to "${targetStatus}".`);
  }

  return true;
}

/**
 * Evaluates events up to the specified elapsed time.
 */
export function evaluateScenarioEvents(eventsList, elapsedSeconds = 0) {
  return (eventsList || []).map(ev => {
    const scheduledSec = typeof ev.time === 'number' 
      ? ev.time 
      : parseTimeToSeconds(ev.time || ev.scheduledTimeSec || 0);

    const delaySec = ev.delaySeconds !== undefined 
      ? Number(ev.delaySeconds) 
      : (ev.deliveryBehavior === 'delayed' ? (ev.delayAmount || 300) : 0);

    const actualDeliverySec = ev.deliveryBehavior === 'delayed' ? scheduledSec + delaySec : scheduledSec;

    let status = DELIVERY_STATUS.PENDING;
    let deliveredToParticipant = false;

    if (elapsedSeconds >= scheduledSec) {
      if (ev.deliveryBehavior === DELIVERY_BEHAVIORS.DROPPED) {
        status = DELIVERY_STATUS.DROPPED;
        deliveredToParticipant = false; // Never delivered to participant
      } else if (ev.deliveryBehavior === DELIVERY_BEHAVIORS.DELAYED) {
        if (elapsedSeconds >= actualDeliverySec) {
          status = DELIVERY_STATUS.DELIVERED;
          deliveredToParticipant = true;
        } else {
          status = DELIVERY_STATUS.DELAYED;
          deliveredToParticipant = false;
        }
      } else {
        status = DELIVERY_STATUS.DELIVERED;
        deliveredToParticipant = true;
      }
    }

    return {
      ...ev,
      scheduledTimeSec: scheduledSec,
      delaySeconds: delaySec,
      actualDeliveryTimeSec: actualDeliverySec,
      status,
      deliveredToParticipant
    };
  });
}

/**
 * Filters delivered messages strictly based on participant role and delivery status.
 */
export function filterParticipantMessages(evaluatedEvents, userRole = 'all') {
  return evaluatedEvents.filter(ev => {
    // 1. Dropped or pending/delayed messages are excluded
    if (!ev.deliveredToParticipant || ev.status !== DELIVERY_STATUS.DELIVERED) {
      return false;
    }

    // 2. Instructors see all delivered messages; participants see 'all' or role-specific
    if (userRole === 'instructor' || userRole === 'all') return true;

    const targetRole = ev.recipientRole || ev.intendedRecipient || 'all';
    return targetRole === 'all' || targetRole === userRole;
  });
}

/**
 * Helper to convert "MM:SS" to seconds.
 */
function parseTimeToSeconds(timeInput) {
  if (typeof timeInput === 'number') return timeInput;
  if (!timeInput || typeof timeInput !== 'string') return 0;
  const parts = timeInput.split(':');
  if (parts.length === 2) {
    const mins = parseInt(parts[0], 10) || 0;
    const secs = parseInt(parts[1], 10) || 0;
    return mins * 60 + secs;
  }
  return parseInt(timeInput, 10) || 0;
}

/**
 * Converts total seconds to "MM:SS" format string.
 */
export function formatSecondsToMMSS(totalSeconds) {
  const s = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  const mins = Math.floor(s / 60);
  const secs = s % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}
