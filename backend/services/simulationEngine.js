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

/**
 * Normalizes a decision option into a structured option object with nextBranch and consequence.
 */
export function normalizeDecisionOption(opt, index = 0) {
  if (!opt) return null;
  if (typeof opt === 'string') {
    const slug = opt.toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 24).replace(/^_+|_+$/g, '');
    const branchKey = `branch_${slug || index}`;
    return {
      id: `opt-${index}-${slug || index}`,
      label: opt,
      text: opt,
      nextBranch: branchKey,
      consequence: {
        description: `Squad executes directive: "${opt}". Subsequent scenario timeline and communication conditions adapt.`,
        difficultyChange: 'none',
        communicationConditions: null,
        outcome: `Directive executed: ${opt}`
      }
    };
  }

  const label = opt.label || opt.text || opt.title || `Option ${index + 1}`;
  const slug = (opt.nextBranch || opt.branchId || label).toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 24).replace(/^_+|_+$/g, '');
  const nextBranch = opt.nextBranch || opt.branchId || `branch_${slug || index}`;

  return {
    id: opt.id || `opt-${index}`,
    label,
    text: label,
    nextBranch,
    consequence: opt.consequence || {
      description: opt.description || `Tactical directive selected: ${label}`,
      difficultyChange: opt.difficultyChange || 'none',
      communicationConditions: opt.communicationConditions || null,
      outcome: opt.outcome || `Executed option: ${label}`
    }
  };
}

/**
 * Resolves the selected option, resulting nextBranch, and consequence from a decision point.
 */
export function resolveOptionBranchAndConsequence(decisionPoint, selectedOptionOrId) {
  if (!decisionPoint || !decisionPoint.decisionOptions || decisionPoint.decisionOptions.length === 0) {
    const fallbackText = typeof selectedOptionOrId === 'string' ? selectedOptionOrId : 'Default Tactical Action';
    return {
      selectedOption: fallbackText,
      selectedOptionId: 'opt-default',
      nextBranch: 'branch_default',
      consequence: {
        description: `Tactical directive executed: "${fallbackText}".`,
        difficultyChange: 'none',
        communicationConditions: null,
        outcome: 'Standard operational continuation.'
      }
    };
  }

  const normalizedOptions = decisionPoint.decisionOptions.map((opt, i) => normalizeDecisionOption(opt, i));
  const cleanQuery = typeof selectedOptionOrId === 'string' ? selectedOptionOrId.trim() : '';

  const match = normalizedOptions.find(o => 
    o.id === cleanQuery || 
    o.label === cleanQuery || 
    o.text === cleanQuery ||
    o.label.toLowerCase() === cleanQuery.toLowerCase()
  );

  if (match) {
    return {
      selectedOption: match,
      selectedOptionId: match.id,
      selectedOptionLabel: match.label,
      nextBranch: match.nextBranch,
      consequence: match.consequence
    };
  }

  const customOpt = normalizeDecisionOption(cleanQuery || 'Custom Directive');
  return {
    selectedOption: customOpt,
    selectedOptionId: 'opt-custom',
    selectedOptionLabel: customOpt.label,
    nextBranch: `branch_${cleanQuery.toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 20) || 'custom'}`,
    consequence: {
      description: `Custom directive executed: "${cleanQuery}".`,
      difficultyChange: 'none',
      communicationConditions: null,
      outcome: `Adapted to custom squad directive: ${cleanQuery}`
    }
  };
}

/**
 * Determines whether a scenario event is eligible to be scheduled/delivered given the active scenario branch.
 */
export function isEventEligibleForBranch(event, activeBranch = null) {
  if (!event) return false;
  const evBranch = event.branch || event.branchId || event.requiredBranch || null;
  if (!evBranch || evBranch === 'all' || evBranch === 'default' || evBranch === 'baseline') {
    return true;
  }
  if (!activeBranch) {
    return false;
  }
  if (Array.isArray(event.branches)) {
    return event.branches.includes(activeBranch);
  }
  return evBranch === activeBranch;
}

export const DIFFICULTY_LEVELS = {
  FUNDAMENTAL: 'Fundamental',
  INTERMEDIATE: 'Intermediate',
  ADVANCED: 'Advanced',
  HIGH_FRICTION: 'High Friction'
};

export const DIFFICULTY_ORDER = [
  DIFFICULTY_LEVELS.FUNDAMENTAL,
  DIFFICULTY_LEVELS.INTERMEDIATE,
  DIFFICULTY_LEVELS.ADVANCED,
  DIFFICULTY_LEVELS.HIGH_FRICTION
];

export function normalizeDifficulty(diff) {
  if (!diff || typeof diff !== 'string') return DIFFICULTY_LEVELS.INTERMEDIATE;
  const lower = diff.toLowerCase().trim();
  if (lower === 'easy' || lower === 'fundamental' || lower === 'basic') return DIFFICULTY_LEVELS.FUNDAMENTAL;
  if (lower === 'intermediate' || lower === 'standard' || lower === 'medium') return DIFFICULTY_LEVELS.INTERMEDIATE;
  if (lower === 'advanced' || lower === 'hard') return DIFFICULTY_LEVELS.ADVANCED;
  if (lower === 'high friction' || lower === 'high_friction' || lower === 'friction' || lower === 'high' || lower === 'expert') return DIFFICULTY_LEVELS.HIGH_FRICTION;
  return DIFFICULTY_LEVELS.INTERMEDIATE;
}


/**
 * Evaluates tactical command decision performance using 6 transparent, deterministic pillars:
 * 1. Timeliness (Response Time vs Deadline)
 * 2. Information Handling (Exploitation of available intel, citations, conflicting report verification)
 * 3. Team Coordination (Cross-role discussion, shared awareness, consensus)
 * 4. Confidence Calibration (Alignment between reported confidence and factual evidence)
 * 5. Decision Quality (Consequence outcome, tactical justification depth)
 * 6. Overall Training Score (Weighted composite 0-100)
 */
export function calculatePerformanceScore(decision, context = {}) {
  if (!decision) {
    return {
      decisionQuality: 50,
      informationHandling: 50,
      coordination: 50,
      timeliness: 50,
      confidenceCalibration: 50,
      overallScore: 50,
      performanceBand: 'Moderate',
      explainability: {
        decisionQualityReason: 'Baseline decision assessment.',
        informationHandlingReason: 'Baseline information utilization.',
        coordinationReason: 'Baseline coordination.',
        timelinessReason: 'Baseline response window.',
        confidenceCalibrationReason: 'Baseline calibration.',
        overallReason: 'Default baseline evaluation.'
      }
    };
  }

  const {
    decisionPoint,
    deliveredEvents = [],
    allEventsUpToNow = [],
    teamMessages = [],
    sharedAwareness = 75,
    evidenceSnapshot
  } = context;

  // --- 1. TIMELINESS (Decision Response Time) ---
  const schedSec = decisionPoint?.scheduledTimeSec !== undefined
    ? Number(decisionPoint.scheduledTimeSec)
    : (parseTimeToSeconds(decisionPoint?.time) || 60);

  const subSec = decision.elapsedSeconds !== undefined
    ? Number(decision.elapsedSeconds)
    : (decision.elapsedMinutes !== undefined ? Number(decision.elapsedMinutes) * 60 : schedSec + 25);

  const responseTimeSec = Math.max(0, subSec - schedSec);
  const deadlineSec = decisionPoint?.deadlineSeconds !== undefined
    ? Number(decisionPoint.deadlineSeconds)
    : schedSec + 60;
  const allowedWindowSec = Math.max(15, deadlineSec - schedSec);
  const timeRatio = responseTimeSec / allowedWindowSec;

  let timelinessScore = 90;
  let timelinessReason = '';

  if (responseTimeSec === 0) {
    timelinessScore = 75;
    timelinessReason = 'Decision submitted instantaneously at trigger point without deliberation.';
  } else if (timeRatio < 0.15) {
    timelinessScore = 85;
    timelinessReason = `Extremely rapid response (${responseTimeSec}s of ${allowedWindowSec}s window); swift but risked skimming incomplete intel.`;
  } else if (timeRatio <= 0.75) {
    timelinessScore = Math.min(100, Math.round(92 + (1 - timeRatio) * 8));
    timelinessReason = `Optimal deliberative response window (${responseTimeSec}s / ${allowedWindowSec}s, ${Math.round(timeRatio * 100)}% of limit).`;
  } else if (timeRatio <= 1.0) {
    timelinessScore = Math.max(70, Math.round(85 - (timeRatio - 0.75) * 60));
    timelinessReason = `Late-stage response (${responseTimeSec}s / ${allowedWindowSec}s); decision made near deadline pressure.`;
  } else {
    const overdue = responseTimeSec - allowedWindowSec;
    timelinessScore = Math.max(20, Math.round(65 - overdue * 2));
    timelinessReason = `Deadline exceeded by ${overdue}s; tactical command delayed beyond operational tolerance.`;
  }

  // --- 2. INFORMATION HANDLING & CONFLICTING VERIFICATION ---
  const totalScheduled = allEventsUpToNow.length > 0 ? allEventsUpToNow.length : 4;
  const deliveredCount = deliveredEvents.length > 0 ? deliveredEvents.length : 3;
  const rawInfoPct = evidenceSnapshot?.metrics?.informationAvailabilityPct !== undefined
    ? Number(evidenceSnapshot.metrics.informationAvailabilityPct)
    : Math.min(100, Math.round((deliveredCount / Math.max(1, totalScheduled)) * 100));

  let infoHandlingScore = Math.round(rawInfoPct * 0.55); // base up to 55
  const sourcesCited = Array.isArray(decision.informationSources) ? decision.informationSources.length : 0;
  if (sourcesCited >= 2) infoHandlingScore += 20;
  else if (sourcesCited === 1) infoHandlingScore += 12;

  const rationaleText = (decision.rationale || '').toLowerCase();
  const mentionsIntel = /patrol|scout|radar|jamming|convoy|sector|mile|battery|channel|defilade|choke/i.test(rationaleText);
  if (mentionsIntel) infoHandlingScore += 10;

  // Check verification of conflicting/incomplete dispatches
  const hasConflicting = deliveredEvents.some(e => e.isConflicting || e.deliveryBehavior === 'conflicting') ||
                         allEventsUpToNow.some(e => e.deliveryBehavior === 'conflicting');
  const hasIncomplete = deliveredEvents.some(e => e.isTruncated || e.deliveryBehavior === 'incomplete') ||
                        allEventsUpToNow.some(e => e.deliveryBehavior === 'incomplete');

  const selectedOptionLabel = typeof decision.selectedOption === 'object' 
    ? (decision.selectedOption.label || decision.selectedOption.text || '') 
    : String(decision.selectedOption || '');

  const verifiedConflicting = /verif|confirm|check|scout|recon|unconfirmed|defilade|wait|hold|caution/i.test(rationaleText) ||
                             /verify|recon|scout/i.test(selectedOptionLabel);

  let infoHandlingReason = `Exploited ${rawInfoPct}% available intelligence (${deliveredCount}/${totalScheduled} dispatches).`;
  if (hasConflicting || hasIncomplete) {
    if (verifiedConflicting) {
      infoHandlingScore += 20;
      infoHandlingReason += ' Accurately identified and verified conflicting/partial sensor data before committing forces.';
    } else {
      infoHandlingScore = Math.max(15, infoHandlingScore - 15);
      infoHandlingReason += ' Overlooked conflicting or degraded dispatches without requesting ground confirmation.';
    }
  } else {
    infoHandlingScore += 15;
  }
  infoHandlingScore = Math.max(15, Math.min(100, infoHandlingScore));

  // --- 3. TEAM COORDINATION & SHARED AWARENESS ---
  const relevantMsgs = teamMessages.filter(m => {
    if (!m) return false;
    const t = m.timestampSec !== undefined ? Number(m.timestampSec) : 0;
    return t <= subSec;
  });
  const chatCount = relevantMsgs.length;
  const distinctRoles = new Set(relevantMsgs.map(m => m.senderRole || m.role).filter(Boolean)).size;

  let chatCoordScore = 50;
  let coordReason = '';
  if (chatCount >= 4 && distinctRoles >= 3) {
    chatCoordScore = 95;
    coordReason = `High cross-domain collaboration: ${chatCount} communications exchanged across ${distinctRoles} roles.`;
  } else if (chatCount >= 2 && distinctRoles >= 2) {
    chatCoordScore = 85;
    coordReason = `Effective team communication: ${chatCount} dispatches shared across ${distinctRoles} roles prior to action.`;
  } else if (chatCount >= 1) {
    chatCoordScore = 70;
    coordReason = `Limited team coordination: only ${chatCount} message exchanged prior to order submission.`;
  } else {
    chatCoordScore = 40;
    coordReason = 'Zero squad communications logged prior to decision; unilateral command action with isolated awareness.';
  }

  const awarenessVal = Math.min(100, Math.max(20, Number(sharedAwareness) || 70));
  const coordinationScore = Math.max(20, Math.min(100, Math.round(0.55 * chatCoordScore + 0.45 * awarenessVal)));
  coordReason += ` Shared Awareness rated at ${awarenessVal}%.`;

  // --- 4. CONFIDENCE CALIBRATION ---
  let confVal = 70;
  if (typeof decision.confidence === 'number') {
    confVal = decision.confidence <= 1 ? Math.round(decision.confidence * 100) : decision.confidence;
  } else if (typeof decision.confidence === 'string') {
    const parsed = parseInt(decision.confidence.replace(/[^0-9]/g, ''), 10);
    if (!isNaN(parsed)) confVal = parsed;
    else if (/high/i.test(decision.confidence)) confVal = 85;
    else if (/medium/i.test(decision.confidence)) confVal = 60;
    else if (/low/i.test(decision.confidence)) confVal = 35;
  }

  const consequenceObj = decision.consequence || {};
  const outcomeText = String(consequenceObj.outcome || consequenceObj.description || '').toLowerCase();
  const outcomePositive = /bypass|preserv|neutraliz|clear|safe|recon|success|defilade|victory/i.test(outcomeText) &&
                          !/ambush sprung|heavy fire|pinned down|casualt/i.test(outcomeText);

  let calibrationScore = 75;
  let calibrationReason = '';

  const confGap = confVal - rawInfoPct;
  if (confVal >= 75 && rawInfoPct < 50) {
    calibrationScore = Math.max(25, Math.round(85 - confGap * 1.1));
    calibrationReason = `Overconfidence penalty: claimed ${confVal}% confidence despite severe fog of war (${rawInfoPct}% info availability).`;
  } else if (confVal >= 75 && rawInfoPct >= 65) {
    calibrationScore = Math.min(100, Math.round(90 + (outcomePositive ? 10 : 0)));
    calibrationReason = `Well-calibrated confidence (${confVal}%) grounded in strong intelligence availability (${rawInfoPct}%).`;
  } else if (confVal <= 65 && confVal >= 35 && rawInfoPct <= 60) {
    calibrationScore = Math.min(100, Math.round(92 + (outcomePositive ? 8 : 0)));
    calibrationReason = `Prudent caution: reported confidence (${confVal}%) appropriately acknowledged incomplete telemetry (${rawInfoPct}%).`;
  } else if (confVal < 35 && rawInfoPct >= 80) {
    calibrationScore = Math.max(45, Math.round(75 - (rawInfoPct - confVal) * 0.5));
    calibrationReason = `Underconfidence: reported ${confVal}% confidence despite comprehensive intelligence verification (${rawInfoPct}%).`;
  } else {
    calibrationScore = Math.max(30, Math.min(100, Math.round(95 - Math.abs(confGap) * 0.6)));
    calibrationReason = `Confidence level (${confVal}%) moderately aligned with telemetry fidelity (${rawInfoPct}%).`;
  }

  // --- 5. DECISION QUALITY ---
  let qualityScore = 35;
  let qualityReason = '';

  if (outcomePositive) {
    qualityScore += 40;
    qualityReason = 'Selected tactical branch achieved favorable force preservation and threat neutralization.';
  } else if (/ambush|heavy fire|pinned|casualt|jammed/i.test(outcomeText)) {
    qualityScore += 10;
    qualityReason = 'Selected route exposed vanguard to tactical ambush or electronic countermeasures.';
  } else {
    qualityScore += 25;
    qualityReason = 'Tactical branch achieved baseline mission continuation.';
  }

  const rationaleLen = (decision.rationale || '').trim().length;
  if (rationaleLen >= 40) {
    qualityScore += 15;
    qualityReason += ' Rationale articulated clear operational reasoning.';
  } else if (rationaleLen >= 15) {
    qualityScore += 10;
  } else {
    qualityScore += 2;
    qualityReason += ' Brief or minimal tactical rationale provided.';
  }

  if (verifiedConflicting) {
    qualityScore += 10;
  }

  qualityScore = Math.max(20, Math.min(100, qualityScore));

  // --- 6. OVERALL TRAINING SCORE ---
  const overallScore = Math.max(
    10,
    Math.min(
      100,
      Math.round(
        0.25 * qualityScore +
        0.20 * infoHandlingScore +
        0.20 * coordinationScore +
        0.15 * timelinessScore +
        0.20 * calibrationScore
      )
    )
  );

  let performanceBand = 'Moderate';
  if (overallScore >= 75) performanceBand = 'Strong';
  else if (overallScore < 50) performanceBand = 'Weak';

  const overallReason = `Overall Score ${overallScore}% (${performanceBand}) based on Quality (${qualityScore}%), Info Handling (${infoHandlingScore}%), Coordination (${coordinationScore}%), Timeliness (${timelinessScore}%), and Calibration (${calibrationScore}%).`;

  return {
    decisionQuality: qualityScore,
    informationHandling: infoHandlingScore,
    coordination: coordinationScore,
    timeliness: timelinessScore,
    confidenceCalibration: calibrationScore,
    overallScore,
    performanceBand,
    explainability: {
      decisionQualityReason: qualityReason,
      informationHandlingReason: infoHandlingReason,
      coordinationReason: coordReason,
      timelinessReason: timelinessReason,
      confidenceCalibrationReason: calibrationReason,
      overallReason
    }
  };
}

/**
 * Evaluates adaptive scenario difficulty based on trainee performance score.
 * Deterministic rules:
 * - Strong performance (overallScore >= 75) -> Step up difficulty (+1 level)
 * - Moderate performance (50 <= overallScore < 75) -> Maintain current difficulty
 * - Weak performance (overallScore < 50) -> Step down difficulty (-1 level)
 * Supports instructor manual overrides and disabled mode.
 */
export function evaluateAdaptiveDifficulty(currentDifficulty, performanceScore, options = {}) {
  const normCurrent = normalizeDifficulty(currentDifficulty);
  const currentIndex = DIFFICULTY_ORDER.indexOf(normCurrent);
  const safeIndex = currentIndex >= 0 ? currentIndex : 1; // default Intermediate (1)

  const {
    enabled = true,
    isManualOverride = false,
    overrideTarget = null,
    overrideReason = null
  } = options;

  // 1. Manual Instructor Override
  if (isManualOverride && overrideTarget) {
    const targetNorm = normalizeDifficulty(overrideTarget);
    return {
      previousDifficulty: normCurrent,
      newDifficulty: targetNorm,
      adaptationDirection: 'manual_override',
      isManualOverride: true,
      triggerReason: overrideReason || `Instructor manual override: adjusted scenario difficulty to ${targetNorm}.`,
      performanceScore
    };
  }

  // 2. Adaptive Mode Disabled
  if (!enabled) {
    return {
      previousDifficulty: normCurrent,
      newDifficulty: normCurrent,
      adaptationDirection: 'none',
      isManualOverride: false,
      triggerReason: `Adaptive difficulty engine disabled by instructor; maintaining ${normCurrent}.`,
      performanceScore
    };
  }

  // 3. Rule-Based Automatic Adaptation
  const score = performanceScore?.overallScore !== undefined ? performanceScore.overallScore : 65;
  const band = performanceScore?.performanceBand || (score >= 75 ? 'Strong' : score < 50 ? 'Weak' : 'Moderate');

  if (band === 'Strong' || score >= 75) {
    const nextIdx = Math.min(DIFFICULTY_ORDER.length - 1, safeIndex + 1);
    const newDifficulty = DIFFICULTY_ORDER[nextIdx];
    if (nextIdx > safeIndex) {
      return {
        previousDifficulty: normCurrent,
        newDifficulty,
        adaptationDirection: 'increase',
        isManualOverride: false,
        triggerReason: `Strong squad performance (Overall: ${score}%, Quality: ${performanceScore?.decisionQuality || score}%, Calibration: ${performanceScore?.confidenceCalibration || score}%). Escalated difficulty to ${newDifficulty} to test resilience under higher latency and sensor friction.`,
        performanceScore
      };
    }
    return {
      previousDifficulty: normCurrent,
      newDifficulty: normCurrent,
      adaptationDirection: 'maintain',
      isManualOverride: false,
      triggerReason: `Strong squad performance (Overall: ${score}%), already operating at maximum difficulty ceiling (${normCurrent}). Maintaining peak friction.`,
      performanceScore
    };
  }

  if (band === 'Weak' || score < 50) {
    const nextIdx = Math.max(0, safeIndex - 1);
    const newDifficulty = DIFFICULTY_ORDER[nextIdx];
    if (nextIdx < safeIndex) {
      return {
        previousDifficulty: normCurrent,
        newDifficulty,
        adaptationDirection: 'decrease',
        isManualOverride: false,
        triggerReason: `Weak squad performance (Overall: ${score}%, Quality: ${performanceScore?.decisionQuality || score}%, Info Handling: ${performanceScore?.informationHandling || score}%). De-escalated difficulty to ${newDifficulty} to facilitate command recovery and clearer channel telemetry.`,
        performanceScore
      };
    }
    return {
      previousDifficulty: normCurrent,
      newDifficulty: normCurrent,
      adaptationDirection: 'maintain',
      isManualOverride: false,
      triggerReason: `Weak squad performance (Overall: ${score}%), already operating at baseline difficulty floor (${normCurrent}). Maintaining baseline support.`,
      performanceScore
    };
  }

  // Moderate Performance (50 - 74)
  return {
    previousDifficulty: normCurrent,
    newDifficulty: normCurrent,
    adaptationDirection: 'maintain',
    isManualOverride: false,
    triggerReason: `Moderate squad performance (Overall: ${score}%). Stabilizing difficulty at ${normCurrent} to evaluate operational consistency.`,
    performanceScore
  };
}

