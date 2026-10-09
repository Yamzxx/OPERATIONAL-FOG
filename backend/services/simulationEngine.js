/**
 * Operational Fog - Authoritative Server-Side Communication Simulation Engine
 * Implements Multi-Domain Information Asymmetry:
 * - GeneratedEvent: Authoritative ground-truth event known to the simulation engine.
 * - DeliveredEvent: Participant-specific degraded version delivered to a specific trainee.
 * Supports: Team Leader, Land Member, Air Member, Cyber/EW Member, and Instructor roles.
 * Domains: LAND | AIR | CYBER | EW | JOINT
 */

export const EXERCISE_STATES = {
  DRAFT: 'Draft',
  READY: 'Ready',
  ACTIVE: 'In Progress',
  PAUSED: 'Paused',
  COMPLETED: 'Completed',
  REVIEWED: 'Reviewed'
};

export const TRAINEE_ROLES = {
  TEAM_LEADER: 'team_leader',
  LAND_MEMBER: 'land_member',
  AIR_MEMBER: 'air_member',
  CYBER_EW_MEMBER: 'cyber_ew_member',
  INSTRUCTOR: 'instructor'
};

export const ROLE_LABELS = {
  team_leader: 'Team Leader',
  land_member: 'Land Member',
  air_member: 'Air Member',
  cyber_ew_member: 'Cyber/EW Member',
  instructor: 'Instructor'
};

export const DOMAINS = {
  LAND: 'LAND',
  AIR: 'AIR',
  CYBER: 'CYBER',
  EW: 'EW',
  JOINT: 'JOINT'
};

export const DISRUPTION_TARGETS = {
  ALL: 'all',
  TEAM_LEADER: 'team_leader',
  LAND_MEMBER: 'land_member',
  AIR_MEMBER: 'air_member',
  CYBER_EW_MEMBER: 'cyber_ew_member'
};

export const DISRUPTION_TYPES = {
  DELAY: 'delay',
  DROPOUT: 'dropout',
  INCOMPLETE: 'incomplete',
  CONFLICTING: 'conflicting',
  RESTORE: 'restore'
};

export const DISRUPTION_SEVERITIES = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high'
};

export const TARGET_LABELS = {
  all: 'Entire Team',
  team_leader: 'Team Leader',
  land_member: 'Land Member',
  air_member: 'Air Member',
  cyber_ew_member: 'Cyber/EW Member'
};

export const DISRUPTION_TYPE_LABELS = {
  delay: 'Delay',
  dropout: 'Dropout',
  incomplete: 'Incomplete Information',
  conflicting: 'Conflicting Information',
  restore: 'Restore Communication'
};

export const DELIVERY_BEHAVIORS = {
  NORMAL: 'normal',
  DELAYED: 'delayed',
  DROPOUT: 'dropped',
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
  TEAM_LEADER: 'team_leader',
  LAND_MEMBER: 'land_member',
  AIR_MEMBER: 'air_member',
  CYBER_EW_MEMBER: 'cyber_ew_member',
  INSTRUCTOR: 'instructor',
  COMMANDER: 'commander',
  FIELD_UNIT: 'field_unit',
  LOGISTICS: 'logistics',
  SIGNALS: 'signals'
};

/**
 * Normalizes any role string into canonical trainee roles.
 */
export function normalizeRole(role) {
  if (!role) return TRAINEE_ROLES.TEAM_LEADER;
  const r = role.toLowerCase().trim().replace(/[\s\-_/]+/g, '_');
  if (r.includes('lead') || r.includes('commander')) return TRAINEE_ROLES.TEAM_LEADER;
  if (r.includes('land') || r.includes('field')) return TRAINEE_ROLES.LAND_MEMBER;
  if (r.includes('air')) return TRAINEE_ROLES.AIR_MEMBER;
  if (r.includes('cyber') || r.includes('ew') || r.includes('signal')) return TRAINEE_ROLES.CYBER_EW_MEMBER;
  if (r.includes('inst')) return TRAINEE_ROLES.INSTRUCTOR;
  return r;
}

/**
 * Helper to convert "MM:SS" or number to seconds.
 */
export function parseTimeToSeconds(timeInput) {
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
 * Helper to format seconds to MM:SS string.
 */
export function formatSecondsToMMSS(totalSeconds) {
  const safe = Math.max(0, Math.floor(totalSeconds || 0));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Deterministic hash for session seed + event ID + participant role.
 */
export function deterministicHash(seed, eventId, role) {
  const str = `${seed || 'FOG_SEED'}_${eventId || 'EV'}_${role || 'ROLE'}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash);
}

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
 * Applies active instructor-injected disruptions to a delivered event.
 * Modifies delivery behavior, delay amount, content truncation, or drops the message.
 */
export function applyDisruptionsToDeliveredEvent(delEv, activeDisruptions = []) {
  if (!activeDisruptions || !Array.isArray(activeDisruptions) || activeDisruptions.length === 0) {
    return delEv;
  }

  const targetRole = delEv.recipientRole;
  // Match most recent active disruption targeting this role or entire team
  const disruption = [...activeDisruptions].reverse().find(d => 
    d.target === 'all' || d.target === targetRole
  );

  if (!disruption) return delEv;

  const type = (disruption.disruptionType || '').toLowerCase();
  const severity = (disruption.severity || 'high').toLowerCase();

  const modified = { 
    ...delEv, 
    isInjectedDisruption: true, 
    injectedDisruptionType: type,
    injectedDisruptionSeverity: severity
  };

  if (type === 'dropout') {
    modified.deliveryBehavior = DELIVERY_BEHAVIORS.DROPPED;
    modified.content = null;
    modified.confidence = 'N/A';
    modified.status = DELIVERY_STATUS.DROPPED;
    modified.deliveredToParticipant = false;
  } else if (type === 'delay') {
    let extraSec = 30;
    if (severity === 'low') extraSec = 15;
    if (severity === 'medium') extraSec = 30;
    if (severity === 'high') extraSec = 60;

    modified.deliveryBehavior = DELIVERY_BEHAVIORS.DELAYED;
    modified.delaySeconds = (modified.delaySeconds || 0) + extraSec;
    modified.actualDeliveryTimeSec = modified.scheduledTimeSec + modified.delaySeconds;
  } else if (type === 'incomplete') {
    modified.deliveryBehavior = DELIVERY_BEHAVIORS.INCOMPLETE;
    modified.isTruncated = true;
    if (severity === 'high') {
      modified.content = '[SIGNAL CORRUPTED - DATA LOSS: INCOMING TELEMETRY UNREADABLE]';
      modified.confidence = 'Corrupted';
    } else if (severity === 'medium') {
      const orig = modified.content || '';
      modified.content = orig.slice(0, Math.max(15, Math.floor(orig.length * 0.45))) + '... [SIGNAL CUT OFF]';
      modified.confidence = 'Partial';
    } else {
      const orig = modified.content || '';
      modified.content = orig.slice(0, Math.max(20, Math.floor(orig.length * 0.75))) + '... [RADIO STATIC]';
      modified.confidence = 'Degraded';
    }
  } else if (type === 'conflicting') {
    modified.deliveryBehavior = DELIVERY_BEHAVIORS.CONFLICTING;
    modified.isConflicting = true;
    modified.content = `[ALERT - SENSOR CONFLICT]: ${modified.content || 'Dispatched order unverified.'} (Counter-signal indicates opposite condition)`;
    modified.confidence = 'Unverified (40%)';
  }

  return modified;
}

/**
 * Transforms an authoritative GeneratedEvent into a trainee-specific DeliveredEvent.
 */
export function generateDeliveredEvent(generatedEvent, role, sessionSeed = 'OP_FOG_DEFAULT', activeDisruptions = []) {
  const normRole = normalizeRole(role);
  const scheduledSec = typeof generatedEvent.time === 'number'
    ? generatedEvent.time
    : parseTimeToSeconds(generatedEvent.time || generatedEvent.scheduledTimeSec || 0);
  const domain = (generatedEvent.domain || DOMAINS.JOINT).toUpperCase();

  // 1. Explicit role variations
  const variations = generatedEvent.roleVariations || {};
  const explicitVar = variations[normRole] || variations[role];

  let rawDelivered;

  if (explicitVar) {
    const behavior = explicitVar.deliveryBehavior || DELIVERY_BEHAVIORS.NORMAL;
    const delaySec = behavior === DELIVERY_BEHAVIORS.DELAYED
      ? (explicitVar.delaySeconds !== undefined ? Number(explicitVar.delaySeconds) : 20)
      : 0;
    const actualDeliverySec = scheduledSec + delaySec;

    rawDelivered = {
      id: `${generatedEvent.id}_${normRole}`,
      generatedEventId: generatedEvent.id,
      recipientRole: normRole,
      recipientRoleLabel: ROLE_LABELS[normRole] || normRole,
      domain,
      title: explicitVar.title || generatedEvent.title,
      content: explicitVar.content !== undefined ? explicitVar.content : generatedEvent.content,
      confidence: explicitVar.confidence || generatedEvent.confidence || '80%',
      deliveryBehavior: behavior,
      delaySeconds: delaySec,
      scheduledTimeSec: scheduledSec,
      actualDeliveryTimeSec: actualDeliverySec,
      isTruncated: behavior === DELIVERY_BEHAVIORS.INCOMPLETE || !!explicitVar.isTruncated,
      isConflicting: behavior === DELIVERY_BEHAVIORS.CONFLICTING || !!explicitVar.isConflicting,
      status: DELIVERY_STATUS.PENDING,
      deliveredToParticipant: false
    };
  } else {
    // 2. Fallback deterministic degradation using sessionSeed + eventId + role
    const hash = deterministicHash(sessionSeed, generatedEvent.id, normRole);
    const behaviorMod = hash % 5;

    let behavior = generatedEvent.deliveryBehavior || DELIVERY_BEHAVIORS.NORMAL;
    let delaySec = generatedEvent.delaySeconds || 0;
    let content = generatedEvent.content;
    let confidence = generatedEvent.confidence || '80%';

    if (behavior === DELIVERY_BEHAVIORS.NORMAL && variations && Object.keys(variations).length === 0) {
      if (normRole === TRAINEE_ROLES.TEAM_LEADER) {
        if (behaviorMod === 1 || behaviorMod === 3) {
          behavior = DELIVERY_BEHAVIORS.DELAYED;
          delaySec = 20;
          confidence = '60%';
        }
      } else if (normRole === TRAINEE_ROLES.AIR_MEMBER && (behaviorMod === 2)) {
        behavior = DELIVERY_BEHAVIORS.INCOMPLETE;
        content = (content || '').replace(/(grid\s+[0-9A-Z-]+|route\s+[0-9A-Z-]+)/gi, '[AIR TELEMETRY CORRUPTED]');
        confidence = 'Partial';
      } else if (normRole === TRAINEE_ROLES.CYBER_EW_MEMBER && (behaviorMod === 4)) {
        behavior = DELIVERY_BEHAVIORS.DROPPED;
        content = null;
        confidence = 'N/A';
      }
    }

    if (behavior === DELIVERY_BEHAVIORS.DELAYED && delaySec === 0) {
      delaySec = 20;
    }

    rawDelivered = {
      id: `${generatedEvent.id}_${normRole}`,
      generatedEventId: generatedEvent.id,
      recipientRole: normRole,
      recipientRoleLabel: ROLE_LABELS[normRole] || normRole,
      domain,
      title: generatedEvent.title,
      content,
      confidence,
      deliveryBehavior: behavior,
      delaySeconds: delaySec,
      scheduledTimeSec: scheduledSec,
      actualDeliveryTimeSec: scheduledSec + delaySec,
      isTruncated: behavior === DELIVERY_BEHAVIORS.INCOMPLETE,
      isConflicting: behavior === DELIVERY_BEHAVIORS.CONFLICTING,
      status: DELIVERY_STATUS.PENDING,
      deliveredToParticipant: false
    };
  }

  // Apply any active instructor disruptions
  return applyDisruptionsToDeliveredEvent(rawDelivered, activeDisruptions);
}

/**
 * Evaluates Ground Truth events up to elapsed time.
 */
export function evaluateScenarioEvents(eventsList, elapsedSeconds = 0) {
  return (eventsList || []).map(ev => {
    const scheduledSec = typeof ev.time === 'number'
      ? ev.time
      : parseTimeToSeconds(ev.time || ev.scheduledTimeSec || 0);

    const delaySec = ev.delaySeconds !== undefined
      ? Number(ev.delaySeconds)
      : (ev.deliveryBehavior === 'delayed' ? (ev.delayAmount || 20) : 0);

    const actualDeliverySec = ev.deliveryBehavior === 'delayed' ? scheduledSec + delaySec : scheduledSec;
    const domain = (ev.domain || DOMAINS.JOINT).toUpperCase();

    let status = DELIVERY_STATUS.PENDING;
    let deliveredToParticipant = false;

    if (elapsedSeconds >= scheduledSec) {
      if (ev.deliveryBehavior === DELIVERY_BEHAVIORS.DROPPED) {
        status = DELIVERY_STATUS.DROPPED;
        deliveredToParticipant = false;
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
      domain,
      scheduledTimeSec: scheduledSec,
      delaySeconds: delaySec,
      actualDeliveryTimeSec: actualDeliverySec,
      status,
      deliveredToParticipant
    };
  });
}

/**
 * Evaluates participant-specific delivered messages for a given trainee role.
 * Trainees NEVER see dropped messages or un-elapsed delays.
 */
export function evaluateParticipantDeliveredEvents(eventsList, userRole, elapsedSeconds = 0, sessionSeed = 'OP_FOG_DEFAULT', activeDisruptions = []) {
  const normRole = normalizeRole(userRole);

  if (normRole === TRAINEE_ROLES.INSTRUCTOR) {
    return evaluateScenarioEvents(eventsList, elapsedSeconds);
  }

  const deliveredEvents = (eventsList || []).map(genEv => {
    const delEv = generateDeliveredEvent(genEv, normRole, sessionSeed, activeDisruptions);

    if (elapsedSeconds < delEv.scheduledTimeSec) {
      delEv.status = DELIVERY_STATUS.PENDING;
      delEv.deliveredToParticipant = false;
    } else if (delEv.deliveryBehavior === DELIVERY_BEHAVIORS.DROPPED) {
      delEv.status = DELIVERY_STATUS.DROPPED;
      delEv.deliveredToParticipant = false;
    } else if (delEv.deliveryBehavior === DELIVERY_BEHAVIORS.DELAYED) {
      if (elapsedSeconds >= delEv.actualDeliveryTimeSec) {
        delEv.status = DELIVERY_STATUS.DELIVERED;
        delEv.deliveredToParticipant = true;
      } else {
        delEv.status = DELIVERY_STATUS.DELAYED;
        delEv.deliveredToParticipant = false;
      }
    } else {
      delEv.status = DELIVERY_STATUS.DELIVERED;
      delEv.deliveredToParticipant = true;
    }

    return delEv;
  });

  // Filter ONLY delivered messages (no dropped, no pending, no unelapsed delayed)
  return deliveredEvents.filter(ev => ev.status === DELIVERY_STATUS.DELIVERED && ev.deliveredToParticipant);
}

/**
 * Returns the Information Asymmetry Matrix for Instructor view.
 */
export function generateAsymmetryMatrix(eventsList, elapsedSeconds = 0, sessionSeed = 'OP_FOG_DEFAULT', activeDisruptions = []) {
  const roles = [
    TRAINEE_ROLES.TEAM_LEADER,
    TRAINEE_ROLES.LAND_MEMBER,
    TRAINEE_ROLES.AIR_MEMBER,
    TRAINEE_ROLES.CYBER_EW_MEMBER
  ];

  return (eventsList || []).map(genEv => {
    const scheduledSec = typeof genEv.time === 'number'
      ? genEv.time
      : parseTimeToSeconds(genEv.time || genEv.scheduledTimeSec || 0);
    const domain = (genEv.domain || DOMAINS.JOINT).toUpperCase();

    const row = {
      eventId: genEv.id,
      scheduledTimeSec: scheduledSec,
      scheduledTimeFormatted: formatSecondsToMMSS(scheduledSec),
      domain,
      title: genEv.title,
      groundTruthContent: genEv.content,
      groundTruthConfidence: genEv.confidence || '80%',
      isGroundTruthOccurred: elapsedSeconds >= scheduledSec,
      roleStatuses: {}
    };

    for (const role of roles) {
      const delEv = generateDeliveredEvent(genEv, role, sessionSeed, activeDisruptions);
      let statusKey = 'pending';
      let statusText = 'Pending';

      if (elapsedSeconds < delEv.scheduledTimeSec) {
        statusKey = 'pending';
        statusText = `T-${formatSecondsToMMSS(delEv.scheduledTimeSec - elapsedSeconds)}`;
      } else if (delEv.deliveryBehavior === DELIVERY_BEHAVIORS.DROPPED) {
        statusKey = 'dropped';
        statusText = delEv.isInjectedDisruption ? 'Dropped [Injected]' : 'Dropped';
      } else if (delEv.deliveryBehavior === DELIVERY_BEHAVIORS.DELAYED) {
        if (elapsedSeconds >= delEv.actualDeliveryTimeSec) {
          statusKey = 'delivered';
          statusText = delEv.isInjectedDisruption 
            ? `Delivered (+${delEv.delaySeconds}s) [Injected]` 
            : `Delivered (+${delEv.delaySeconds}s)`;
        } else {
          statusKey = 'delayed';
          const remaining = delEv.actualDeliveryTimeSec - elapsedSeconds;
          statusText = delEv.isInjectedDisruption 
            ? `Delayed (${remaining}s left) [Injected]` 
            : `Delayed (${remaining}s left)`;
        }
      } else if (delEv.deliveryBehavior === DELIVERY_BEHAVIORS.INCOMPLETE) {
        statusKey = 'partial';
        statusText = delEv.isInjectedDisruption ? 'Partial [Injected]' : 'Partial';
      } else if (delEv.deliveryBehavior === DELIVERY_BEHAVIORS.CONFLICTING) {
        statusKey = 'conflicting';
        statusText = delEv.isInjectedDisruption ? 'Conflicting [Injected]' : 'Conflicting';
      } else {
        statusKey = 'delivered';
        statusText = 'Delivered';
      }

      row.roleStatuses[role] = {
        statusKey,
        statusText,
        behavior: delEv.deliveryBehavior,
        isDelivered: elapsedSeconds >= delEv.actualDeliveryTimeSec && delEv.deliveryBehavior !== DELIVERY_BEHAVIORS.DROPPED,
        deliveredContent: delEv.content,
        confidence: delEv.confidence,
        isTruncated: delEv.isTruncated,
        isConflicting: delEv.isConflicting,
        isInjected: !!delEv.isInjectedDisruption,
        injectedType: delEv.injectedDisruptionType || null
      };
    }

    return row;
  });
}

/**
 * Backward compatibility: filters delivered messages.
 */
export function filterParticipantMessages(evaluatedEvents, userRole = 'all') {
  return evaluateParticipantDeliveredEvents(evaluatedEvents, userRole, 99999);
}
<<<<<<< Updated upstream
=======

/**
 * Checks if an event is a structured Decision Point.
 */
export function isDecisionEvent(ev) {
  if (!ev) return false;
  const t = (ev.type || ev.eventType || ev.event_type || '').toUpperCase();
  return (
    ev.requiresDecision === true ||
    ev.isDecisionPoint === true ||
    t === 'DECISION' ||
    t === 'DECISION_REQUIRED' ||
    t === 'DECISION_POINT'
  );
}

/**
 * Resolves target roles array from a decision event / decision point.
 * Checks ev.targetRoles (array) or falls back to ev.targetRole (string) or ev.intendedRecipient.
 */
export function getDecisionTargetRoles(ev) {
  if (!ev) return [];
  if (Array.isArray(ev.targetRoles) && ev.targetRoles.length > 0) {
    return ev.targetRoles.map(r => normalizeRole(r));
  }
  if (ev.targetRole) {
    return [normalizeRole(ev.targetRole)];
  }
  if (ev.intendedRecipient) {
    return [normalizeRole(ev.intendedRecipient)];
  }
  return [];
}

/**
 * Checks if a specific role is allowed to submit / view decision form for a decision point.
 * Returns true if:
 * - targetRoles includes 'all'
 * - targetRoles is empty (unrestricted)
 * - targetRoles includes normalized user role
 * - user is instructor (instructors can preview/supervise)
 */
export function isRoleAllowedForDecision(ev, role) {
  if (!ev) return false;
  const normRole = normalizeRole(role);
  if (normRole === TRAINEE_ROLES.INSTRUCTOR) return true;
  const targets = getDecisionTargetRoles(ev);
  if (targets.length === 0 || targets.includes('all')) return true;
  return targets.includes(normRole);
}

/**
 * Calculates the percentage of scheduled information actually available to a trainee role up to elapsedSeconds.
 */
export function calculateInformationAvailability(events = [], role = 'team_leader', elapsedSeconds = 0, sessionSeed = 'OP_FOG_DEFAULT', activeDisruptions = []) {
  const normRole = normalizeRole(role);
  if (normRole === TRAINEE_ROLES.INSTRUCTOR) return 100;

  // Total ground-truth events scheduled up to elapsedSeconds (excluding meta decision events)
  const scheduledSoFar = events.filter(e => {
    const scheduledSec = parseTimeToSeconds(e.time || e.scheduledTimeSec || e.scheduled_time_sec || 0);
    return scheduledSec <= elapsedSeconds && !isDecisionEvent(e);
  });

  if (scheduledSoFar.length === 0) return 100;

  // Delivered events to this participant
  const deliveredList = evaluateParticipantDeliveredEvents(events, normRole, elapsedSeconds, sessionSeed, activeDisruptions).filter(e => !isDecisionEvent(e));
  const deliveredCount = deliveredList.length;

  return Math.min(100, Math.max(0, Math.round((deliveredCount / scheduledSoFar.length) * 100)));
}

/**
 * Calculates current Shared Awareness level (% alignment or shared knowledge across squad).
 */
export function calculateSharedAwareness(events = [], elapsedSeconds = 0, sessionSeed = 'OP_FOG_DEFAULT', activeDisruptions = [], teamMessages = []) {
  const traineeRoles = [
    TRAINEE_ROLES.TEAM_LEADER,
    TRAINEE_ROLES.LAND_MEMBER,
    TRAINEE_ROLES.AIR_MEMBER,
    TRAINEE_ROLES.CYBER_EW_MEMBER
  ];

  let totalAvailSum = 0;
  for (const r of traineeRoles) {
    totalAvailSum += calculateInformationAvailability(events, r, elapsedSeconds, sessionSeed, activeDisruptions);
  }
  const avgRoleAvailability = totalAvailSum / traineeRoles.length;

  // Bonus factor for team coordination chat messages sent up to elapsedSeconds
  const relevantMsgs = (teamMessages || []).length;
  const chatBoost = Math.min(15, relevantMsgs * 3);

  return Math.min(100, Math.max(10, Math.round(avgRoleAvailability * 0.85 + chatBoost)));
}

/**
 * Builds a complete, immutable Evidence Snapshot at the exact moment of decision submission.
 */
export function createEvidenceSnapshot({
  scenarioEvents = [],
  decidingRole = 'team_leader',
  decidingParticipantId = 'Operator',
  decisionText = '',
  confidence = 'Medium',
  rationale = '',
  sourcesUsed = [],
  elapsedSeconds = 0,
  sessionSeed = 'OP_FOG_DEFAULT',
  activeDisruptions = [],
  teamMessages = [],
  decisionTriggerTimeSec = 0
}) {
  const normRole = normalizeRole(decidingRole);
  const scheduledSoFar = scenarioEvents.filter(e => {
    const s = parseTimeToSeconds(e.time || e.scheduledTimeSec || e.scheduled_time_sec || 0);
    return s <= elapsedSeconds;
  });

  // What was actually delivered to this trainee
  const deliveredToTrainee = evaluateParticipantDeliveredEvents(scenarioEvents, normRole, elapsedSeconds, sessionSeed, activeDisruptions);

  // What was delayed or dropped from this trainee (ground truth that was withheld/degraded)
  const deliveredIds = new Set(deliveredToTrainee.map(d => d.id));
  const delayedOrDropped = [];

  for (const ev of scheduledSoFar) {
    if (!deliveredIds.has(ev.id)) {
      const delEv = createDeliveredEvent(ev, normRole, elapsedSeconds, sessionSeed, activeDisruptions);
      let statusDesc = 'DROPPED';
      let reason = delEv.droppedReason || 'Withheld by communication friction';
      if (delEv.deliveryBehavior === DELIVERY_BEHAVIORS.DELAYED) {
        statusDesc = 'DELAYED';
        reason = `Delayed: Arrives at T+${formatSecondsToMMSS(delEv.actualDeliveryTimeSec)} (+${delEv.delaySeconds}s lag)`;
      }

      delayedOrDropped.push({
        id: ev.id,
        title: ev.title,
        domain: ev.domain || 'JOINT',
        groundTruthContent: ev.content,
        scheduledTimeFormatted: formatSecondsToMMSS(delEv.scheduledTimeSec),
        status: statusDesc,
        deliveryBehavior: delEv.deliveryBehavior,
        reason
      });
    }
  }

  // Parse confidence as numeric percentage (e.g. "68%", 68, "High" -> 85%, etc.)
  let confidenceNum = 70;
  if (typeof confidence === 'number') {
    confidenceNum = Math.min(100, Math.max(0, Math.round(confidence)));
  } else if (typeof confidence === 'string') {
    const matched = confidence.match(/\d+/);
    if (matched) {
      confidenceNum = parseInt(matched[0], 10);
    } else {
      const lower = confidence.toLowerCase();
      if (lower.includes('high')) confidenceNum = 85;
      else if (lower.includes('low')) confidenceNum = 40;
      else confidenceNum = 65;
    }
  }

  const infoAvailabilityPct = calculateInformationAvailability(scenarioEvents, normRole, elapsedSeconds, sessionSeed, activeDisruptions);
  const sharedAwarenessPct = calculateSharedAwareness(scenarioEvents, elapsedSeconds, sessionSeed, activeDisruptions, teamMessages);
  const responseTimeSec = Math.max(0, elapsedSeconds - (decisionTriggerTimeSec || elapsedSeconds));

  // Active disruptions affecting this specific role
  const disruptionsAffectingRole = (activeDisruptions || []).filter(d => d.target === 'all' || d.target === normRole);

  return {
    participantId: decidingParticipantId,
    participantRole: normRole,
    decisionTimestamp: new Date().toISOString(),
    elapsedSeconds,
    elapsedTimeFormatted: formatSecondsToMMSS(elapsedSeconds),
    decision: decisionText,
    confidence: `${confidenceNum}%`,
    confidenceNum,
    rationale,
    sourcesUsed: sourcesUsed || [],
    eventsAvailable: deliveredToTrainee.map(e => ({
      id: e.id,
      title: e.title,
      domain: e.domain,
      content: e.content,
      deliveredAtSec: e.actualDeliveryTimeSec,
      deliveredTimeFormatted: formatSecondsToMMSS(e.actualDeliveryTimeSec),
      confidence: e.confidence,
      deliveryBehavior: e.deliveryBehavior
    })),
    eventsDelayedOrDropped: delayedOrDropped,
    communicationState: {
      isDegraded: disruptionsAffectingRole.length > 0,
      activeDisruptionsCount: disruptionsAffectingRole.length,
      disruptions: disruptionsAffectingRole
    },
    teamMessagesAvailable: (teamMessages || []).map(m => ({
      id: m.id,
      senderId: m.senderId,
      senderRole: m.senderRole,
      text: m.text,
      timestamp: m.timestamp
    })),
    activeDisruptions: activeDisruptions || [],
    metrics: {
      responseTimeSec,
      responseTimeFormatted: `${responseTimeSec}s`,
      informationAvailabilityPct,
      confidenceNum,
      confidenceVsAvailabilityDelta: confidenceNum - infoAvailabilityPct,
      sharedAwarenessPct
    }
  };
}

>>>>>>> Stashed changes
