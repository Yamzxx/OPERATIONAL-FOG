/**
 * Operational Fog - Deterministic Scenario Event Engine
 * Implements Multi-Domain Information Asymmetry:
 * - GeneratedEvent: Authoritative ground-truth event known to the simulation engine.
 * - DeliveredEvent: Participant-specific degraded version delivered to a specific trainee.
 * Supports: Team Leader, Land Member, Air Member, Cyber/EW Member, and Instructor roles.
 * Domains: LAND | AIR | CYBER | EW | JOINT
 */

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
  instructor: 'Instructor',
  commander: 'Team Leader',
  field_unit: 'Land Member'
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

export const DIFFICULTY_LEVELS = {
  FUNDAMENTAL: 'Fundamental',
  INTERMEDIATE: 'Intermediate',
  ADVANCED: 'Advanced',
  HIGH_FRICTION: 'High Friction'
};

export const DIFFICULTY_ORDER = [
  'Fundamental',
  'Intermediate',
  'Advanced',
  'High Friction'
];

/**
 * Normalizes difficulty labels into standard 4-tier scale:
 * Fundamental | Intermediate | Advanced | High Friction
 */
export function normalizeDifficulty(diff) {
  if (!diff) return DIFFICULTY_LEVELS.INTERMEDIATE;
  const clean = String(diff).trim().toLowerCase();
  if (clean === 'easy' || clean === 'fundamental' || clean === 'low') return DIFFICULTY_LEVELS.FUNDAMENTAL;
  if (clean === 'intermediate' || clean === 'medium' || clean === 'standard') return DIFFICULTY_LEVELS.INTERMEDIATE;
  if (clean === 'advanced' || clean === 'hard') return DIFFICULTY_LEVELS.ADVANCED;
  if (clean === 'high friction' || clean === 'high' || clean === 'severe') return DIFFICULTY_LEVELS.HIGH_FRICTION;
  return DIFFICULTY_LEVELS.INTERMEDIATE;
}

/**
 * Normalizes any role string into canonical trainee roles.
 */
export function normalizeRole(role) {
  if (!role || role === 'all') return 'all';
  const r = role.toLowerCase().trim().replace(/[\s\-_/]+/g, '_');
  if (r.includes('lead') || r === 'commander') return TRAINEE_ROLES.TEAM_LEADER;
  if (r.includes('land') || r === 'field_unit') return TRAINEE_ROLES.LAND_MEMBER;
  if (r.includes('air')) return TRAINEE_ROLES.AIR_MEMBER;
  if (r.includes('cyber') || r.includes('ew') || r.includes('signals')) return TRAINEE_ROLES.CYBER_EW_MEMBER;
  if (r.includes('inst')) return TRAINEE_ROLES.INSTRUCTOR;
  return r;
}

/**
 * Converts "MM:SS" or seconds integer to total seconds.
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
 * Converts seconds integer to "MM:SS" format string.
 */
export function formatSecondsToMMSS(totalSeconds) {
  const safe = Math.max(0, Math.floor(totalSeconds || 0));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Deterministic hash function for session seed + event ID + participant role.
 * Ensures identical simulation behavior across repeat runs.
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
    if (severity === 'slight' || severity === 'minimal') extraSec = 8;
    else if (severity === 'low') extraSec = 15;
    else if (severity === 'medium') extraSec = 30;
    else if (severity === 'high') extraSec = 60;

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
 * Transforms an authoritative GeneratedEvent (Ground Truth) into a trainee-specific DeliveredEvent.
 */
export function generateDeliveredEvent(generatedEvent, role, sessionSeed = 'OP_FOG_DEFAULT', activeDisruptions = []) {
  const normRole = normalizeRole(role);
  const scheduledSec = generatedEvent.scheduledTimeSec;
  const domain = generatedEvent.domain || DOMAINS.JOINT;

  let rawDelivered;

  // 1. Check for explicit role-specific variation override in the event definition
  const variations = generatedEvent.roleVariations || {};
  const explicitVar = variations[normRole] || variations[role];

  if (explicitVar) {
    const behavior = explicitVar.deliveryBehavior || DELIVERY_BEHAVIORS.NORMAL;
    const delaySec = behavior === DELIVERY_BEHAVIORS.DELAYED 
      ? (explicitVar.delaySeconds !== undefined ? Number(explicitVar.delaySeconds) : 20)
      : 0;
    const actualDeliverySec = scheduledSec + delaySec;

    rawDelivered = {
      id: generatedEvent.id, // Preserve ID for backwards compatibility
      deliveredId: `${generatedEvent.id}_${normRole}`,
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
      deliveredToParticipant: false,
      statusNote: explicitVar.statusNote || ''
    };
  } else {
    // 2. Check legacy target role specification
    const target = (generatedEvent.recipientRole || generatedEvent.intendedRecipient || 'all').toLowerCase();
    const isTargeted = target === 'all' || 
                       target === normRole || 
                       target === role ||
                       (target === 'commander' && (normRole === TRAINEE_ROLES.TEAM_LEADER || role === 'commander')) ||
                       (target === 'field_unit' && (normRole === TRAINEE_ROLES.LAND_MEMBER || role === 'field_unit'));

    if (!isTargeted) {
      // Message not targeted to this role — effectively dropped for this participant
      rawDelivered = {
        id: generatedEvent.id,
        deliveredId: `${generatedEvent.id}_${normRole}`,
        generatedEventId: generatedEvent.id,
        recipientRole: normRole,
        recipientRoleLabel: ROLE_LABELS[normRole] || normRole,
        domain,
        title: generatedEvent.title,
        content: null,
        confidence: 'N/A',
        deliveryBehavior: DELIVERY_BEHAVIORS.DROPPED,
        delaySeconds: 0,
        scheduledTimeSec: scheduledSec,
        actualDeliveryTimeSec: scheduledSec,
        isTruncated: false,
        isConflicting: false,
        status: DELIVERY_STATUS.DROPPED,
        deliveredToParticipant: false,
        statusNote: 'Filtered by recipient echelon'
      };
    } else {
      // 3. Honor base event delivery behavior directly if defined
      const behavior = generatedEvent.deliveryBehavior || DELIVERY_BEHAVIORS.NORMAL;
      const delaySec = behavior === DELIVERY_BEHAVIORS.DELAYED ? (generatedEvent.delaySeconds || 20) : 0;
      const actualDeliverySec = scheduledSec + delaySec;

      rawDelivered = {
        id: generatedEvent.id,
        deliveredId: `${generatedEvent.id}_${normRole}`,
        generatedEventId: generatedEvent.id,
        recipientRole: normRole,
        recipientRoleLabel: ROLE_LABELS[normRole] || normRole,
        domain,
        title: generatedEvent.title,
        content: generatedEvent.content,
        confidence: generatedEvent.confidence || '80%',
        deliveryBehavior: behavior,
        delaySeconds: delaySec,
        scheduledTimeSec: scheduledSec,
        actualDeliveryTimeSec: actualDeliverySec,
        isTruncated: behavior === DELIVERY_BEHAVIORS.INCOMPLETE,
        isConflicting: behavior === DELIVERY_BEHAVIORS.CONFLICTING,
        status: DELIVERY_STATUS.PENDING,
        deliveredToParticipant: false,
        statusNote: ''
      };
    }
  }

  // Apply any active instructor disruptions
  return applyDisruptionsToDeliveredEvent(rawDelivered, activeDisruptions);
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

  // Match by id or label or text
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

  // Fallback for custom entries
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
 * - Events with no branch (or branch: 'all' / 'default' / 'baseline') are universal.
 * - Events with a branch specified are only eligible if activeBranch matches that branch.
 */
export function isEventEligibleForBranch(event, activeBranch = null) {
  if (!event) return false;
  const evBranch = event.branch || event.branchId || event.requiredBranch || null;
  if (!evBranch || evBranch === 'all' || evBranch === 'default' || evBranch === 'baseline') {
    return true;
  }
  if (!activeBranch) {
    // Before any decision is submitted, branch-specific future events remain inactive
    return false;
  }
  if (Array.isArray(event.branches)) {
    return event.branches.includes(activeBranch);
  }
  return evBranch === activeBranch;
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

/**
 * Class representing a deterministic event engine instance for an exercise run.
 */
export class EventEngine {
  constructor(scenario, options = {}) {
    this.scenario = scenario;
    this.sessionSeed = options.sessionSeed || scenario?.id || 'OP_FOG_DEFAULT_SEED';
    this.elapsedSeconds = options.initialElapsed || 0;
    this.isRunning = false;
    this.isPaused = false;
    this.listeners = [];

    // Trainee roles to simulate
    this.traineeRoles = [
      TRAINEE_ROLES.TEAM_LEADER,
      TRAINEE_ROLES.LAND_MEMBER,
      TRAINEE_ROLES.AIR_MEMBER,
      TRAINEE_ROLES.CYBER_EW_MEMBER
    ];

    // 1. Authoritative GeneratedEvents (Ground Truth)
    this.allGeneratedEvents = (scenario?.events || []).map((ev, index) => {
      const scheduledSec = parseTimeToSeconds(ev.time || ev.scheduledTime || 0);
      const delaySec = ev.delaySeconds !== undefined ? Number(ev.delaySeconds) : (ev.deliveryBehavior === 'delayed' ? (ev.delayAmount || 20) : 0);
      const actualDeliverySec = ev.deliveryBehavior === 'delayed' ? scheduledSec + delaySec : scheduledSec;
      const domain = (ev.domain || DOMAINS.JOINT).toUpperCase();

      return {
        id: ev.id || `ev-${index + 1}`,
        title: ev.title || `Tactical Dispatch #${index + 1}`,
        content: ev.content || ev.messageContent || '',
        confidence: ev.confidence || '80%',
        domain,
        type: ev.type || 'info',
        deliveryBehavior: ev.deliveryBehavior || ev.delivery || DELIVERY_BEHAVIORS.NORMAL,
        scheduledTimeSec: scheduledSec,
        delaySeconds: delaySec,
        actualDeliveryTimeSec: actualDeliverySec,
        recipientRole: ev.recipientRole || ev.intendedRecipient || 'all',
        targetRole: ev.targetRole || ev.recipientRole || ev.intendedRecipient || 'all',
        deadlineSeconds: ev.deadlineSeconds,
        decisionOptions: ev.decisionOptions || [],
        requiresDecision: ev.requiresDecision,
        isDecisionPoint: ev.isDecisionPoint,
        branch: ev.branch || ev.branchId || ev.requiredBranch || null,
        branches: Array.isArray(ev.branches) ? ev.branches : (ev.branch ? [ev.branch] : []),
        instructorNotes: ev.instructorNotes || '',
        roleVariations: ev.roleVariations || {},
        status: DELIVERY_STATUS.PENDING,
        deliveredToParticipant: false
      };
    }).sort((a, b) => a.scheduledTimeSec - b.scheduledTimeSec);

    // Branching and Adaptive Difficulty state
    this.activeBranch = options.activeBranch || null;
    this.branchesHistory = options.branchesHistory ? [...options.branchesHistory] : [];
    this.decisionConsequencesLog = options.decisionConsequencesLog ? [...options.decisionConsequencesLog] : [];
    this.scenarioDifficulty = normalizeDifficulty(options.initialDifficulty || scenario?.difficulty || 'Intermediate');
    this.adaptiveDifficultyEnabled = options.adaptiveDifficultyEnabled !== undefined ? Boolean(options.adaptiveDifficultyEnabled) : true;
    this.difficultyAdaptationsLog = options.difficultyAdaptationsLog ? [...options.difficultyAdaptationsLog] : [];

    // Active subset of generated events eligible for current branch
    this.generatedEvents = this.allGeneratedEvents.filter(ev => isEventEligibleForBranch(ev, this.activeBranch));

    this.activeDisruptions = options.initialDisruptions || [];
    this.disruptionsLog = options.initialDisruptionsLog || [];

    // 2. Trainee DeliveredEvents Map: role -> DeliveredEvent[]
    this.deliveredEventsByRole = new Map();
    this.rebuildDeliveredEvents();

    // Legacy events accessor compatibility
    this.events = this.generatedEvents;
  }

  rebuildDeliveredEvents() {
    for (const role of this.traineeRoles) {
      const deliveredList = this.generatedEvents.map(genEv => 
        generateDeliveredEvent(genEv, role, this.sessionSeed, this.activeDisruptions)
      );
      this.deliveredEventsByRole.set(role, deliveredList);
    }

    // Also support legacy role strings for backward compatibility tests
    this.deliveredEventsByRole.set('commander', this.generatedEvents.map(genEv => generateDeliveredEvent(genEv, 'commander', this.sessionSeed, this.activeDisruptions)));
    this.deliveredEventsByRole.set('field_unit', this.generatedEvents.map(genEv => generateDeliveredEvent(genEv, 'field_unit', this.sessionSeed, this.activeDisruptions)));
  }

  injectDisruption({ target, disruptionType, severity, duration }) {
    const t = target || 'all';
    const type = (disruptionType || 'delay').toLowerCase();
    const sev = (severity || 'high').toLowerCase();
    const dur = parseInt(duration, 10) || 60;

    if (type === 'restore' || type === 'restore communication') {
      return this.clearDisruption(t);
    }

    const disruption = {
      id: `disrupt-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      target: t,
      targetLabel: TARGET_LABELS[t] || t,
      disruptionType: type,
      typeLabel: DISRUPTION_TYPE_LABELS[type] || type,
      severity: sev,
      duration: dur,
      remainingSec: dur,
      injectedAt: new Date().toISOString(),
      injectedAtSec: this.elapsedSeconds,
      status: 'Active'
    };

    this.activeDisruptions = this.activeDisruptions.filter(d => d.target !== t);
    this.activeDisruptions.push(disruption);
    this.disruptionsLog.push({ ...disruption });

    this.rebuildDeliveredEvents();
    this.evaluateEvents();
    this.notify();

    return disruption;
  }

  clearDisruption(target = 'all') {
    if (target === 'all') {
      this.activeDisruptions = [];
    } else {
      this.activeDisruptions = this.activeDisruptions.filter(d => d.target !== target);
    }

    this.disruptionsLog.push({
      id: `restored-${Date.now()}`,
      target,
      targetLabel: TARGET_LABELS[target] || target,
      disruptionType: 'restore',
      typeLabel: 'Restore Communication',
      severity: 'normal',
      duration: 0,
      remainingSec: 0,
      injectedAt: new Date().toISOString(),
      injectedAtSec: this.elapsedSeconds,
      status: 'Restored'
    });

    this.rebuildDeliveredEvents();
    this.evaluateEvents();
    this.notify();
  }

  setActiveDisruptions(list = []) {
    this.activeDisruptions = Array.isArray(list) ? [...list] : [];
    this.rebuildDeliveredEvents();
    this.evaluateEvents();
    this.notify();
  }

  setDisruptionsLog(list = []) {
    this.disruptionsLog = Array.isArray(list) ? [...list] : [];
    this.notify();
  }

  getActiveDisruptions() {
    return [...this.activeDisruptions];
  }

  getDisruptionsLog() {
    return [...this.disruptionsLog];
  }

  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  notify() {
    this.listeners.forEach(l => l(this.getState()));
  }

  start() {
    this.isRunning = true;
    this.isPaused = false;
    this.evaluateEvents();
    this.notify();
  }

  pause() {
    this.isPaused = true;
    this.notify();
  }

  resume() {
    if (this.isRunning && this.isPaused) {
      this.isPaused = false;
      this.notify();
    }
  }

  tick(seconds = 1) {
    if (!this.isRunning || this.isPaused) return;
    this.elapsedSeconds += seconds;

    // Automatic countdown and duration expiry restoration
    if (this.activeDisruptions && this.activeDisruptions.length > 0) {
      let expired = false;
      const remaining = [];
      for (const dis of this.activeDisruptions) {
        dis.remainingSec = Math.max(0, dis.remainingSec - seconds);
        if (dis.remainingSec <= 0) {
          expired = true;
          const logItem = this.disruptionsLog.find(l => l.id === dis.id);
          if (logItem) {
            logItem.status = 'Expired (Restored)';
            logItem.expiredAtSec = this.elapsedSeconds;
          }
        } else {
          remaining.push(dis);
        }
      }
      if (expired) {
        this.activeDisruptions = remaining;
        this.rebuildDeliveredEvents();
      }
    }

    this.evaluateEvents();
    this.notify();
  }

  step(seconds = 1) {
    this.elapsedSeconds += seconds;
    this.evaluateEvents();
    this.notify();
  }

  /**
   * Evaluates all ground truth and participant delivered events against elapsedSeconds.
   */
  evaluateEvents() {
    // 1. Evaluate Ground Truth GeneratedEvents
    this.generatedEvents.forEach(genEv => {
      if (this.elapsedSeconds >= genEv.scheduledTimeSec) {
        if (genEv.deliveryBehavior === DELIVERY_BEHAVIORS.DROPPED) {
          genEv.status = DELIVERY_STATUS.DROPPED;
          genEv.deliveredToParticipant = false;
        } else if (genEv.deliveryBehavior === DELIVERY_BEHAVIORS.DELAYED) {
          if (this.elapsedSeconds >= genEv.actualDeliveryTimeSec) {
            genEv.status = DELIVERY_STATUS.DELIVERED;
            genEv.deliveredToParticipant = true;
          } else {
            genEv.status = DELIVERY_STATUS.DELAYED;
            genEv.deliveredToParticipant = false;
          }
        } else {
          genEv.status = DELIVERY_STATUS.DELIVERED;
          genEv.deliveredToParticipant = true;
        }
      } else {
        genEv.status = DELIVERY_STATUS.PENDING;
        genEv.deliveredToParticipant = false;
      }
    });

    // 2. Evaluate Trainee DeliveredEvents for each role
    for (const [role, deliveredList] of this.deliveredEventsByRole.entries()) {
      deliveredList.forEach(delEv => {
        if (this.elapsedSeconds < delEv.scheduledTimeSec) {
          delEv.status = DELIVERY_STATUS.PENDING;
          delEv.deliveredToParticipant = false;
        } else if (delEv.deliveryBehavior === DELIVERY_BEHAVIORS.DROPPED) {
          // Permanently dropped for this participant
          delEv.status = DELIVERY_STATUS.DROPPED;
          delEv.deliveredToParticipant = false;
        } else if (delEv.deliveryBehavior === DELIVERY_BEHAVIORS.DELAYED) {
          if (this.elapsedSeconds >= delEv.actualDeliveryTimeSec) {
            delEv.status = DELIVERY_STATUS.DELIVERED;
            delEv.deliveredToParticipant = true;
          } else {
            // Still in delayed propagation transit
            delEv.status = DELIVERY_STATUS.DELAYED;
            delEv.deliveredToParticipant = false;
          }
        } else {
          // Normal, incomplete, conflicting
          delEv.status = DELIVERY_STATUS.DELIVERED;
          delEv.deliveredToParticipant = true;
        }
      });
    }
  }

  /**
   * Returns participant-specific delivered messages for a given trainee role.
   * Trainees NEVER see dropped messages or pending delays.
   */
  getParticipantMessages(userRole = 'all') {
    if (userRole === 'all') {
      // Return base delivered events that are marked deliveredToParticipant
      return this.generatedEvents.filter(ev => ev.status === DELIVERY_STATUS.DELIVERED && ev.deliveredToParticipant);
    }

    const norm = normalizeRole(userRole);

    if (norm === TRAINEE_ROLES.INSTRUCTOR) {
      // Instructors see all delivered ground truth events
      return this.generatedEvents.filter(e => e.status === DELIVERY_STATUS.DELIVERED);
    }

    // Check specific role map (handles 'commander', 'field_unit', or normalized trainee roles)
    const deliveredList = this.deliveredEventsByRole.get(userRole) || this.deliveredEventsByRole.get(norm);
    if (!deliveredList) {
      return this.generatedEvents.filter(ev => ev.status === DELIVERY_STATUS.DELIVERED && ev.deliveredToParticipant);
    }

    return deliveredList.filter(ev => ev.status === DELIVERY_STATUS.DELIVERED && ev.deliveredToParticipant);
  }

  /**
   * Returns authoritative ground-truth events list for Instructor view.
   */
  getGroundTruthEvents() {
    return this.generatedEvents.map(ev => ({
      ...ev,
      scheduledTimeFormatted: formatSecondsToMMSS(ev.scheduledTimeSec),
      actualDeliveryTimeFormatted: formatSecondsToMMSS(ev.actualDeliveryTimeSec)
    }));
  }

  /**
   * Returns the Information Asymmetry Matrix for the Instructor Live View table:
   * Event (Domain) | Team Leader | Land Member | Air Member | Cyber/EW Member
   */
  getAsymmetryMatrix() {
    return this.generatedEvents.map(genEv => {
      const row = {
        eventId: genEv.id,
        scheduledTimeSec: genEv.scheduledTimeSec,
        scheduledTimeFormatted: formatSecondsToMMSS(genEv.scheduledTimeSec),
        domain: genEv.domain || DOMAINS.JOINT,
        title: genEv.title,
        groundTruthContent: genEv.content,
        groundTruthConfidence: genEv.confidence || '80%',
        isGroundTruthOccurred: this.elapsedSeconds >= genEv.scheduledTimeSec,
        roleStatuses: {}
      };

      for (const role of this.traineeRoles) {
        const deliveredList = this.deliveredEventsByRole.get(role) || [];
        const delEv = deliveredList.find(d => d.generatedEventId === genEv.id);

        if (!delEv) {
          row.roleStatuses[role] = {
            statusKey: 'pending',
            statusText: 'Pending',
            behavior: DELIVERY_BEHAVIORS.NORMAL,
            isDelivered: false
          };
          continue;
        }

        let statusKey = 'pending';
        let statusText = 'Pending';

        if (this.elapsedSeconds < delEv.scheduledTimeSec) {
          statusKey = 'pending';
          statusText = `T-${formatSecondsToMMSS(delEv.scheduledTimeSec - this.elapsedSeconds)}`;
        } else if (delEv.deliveryBehavior === DELIVERY_BEHAVIORS.DROPPED) {
          statusKey = 'dropped';
          statusText = delEv.isInjectedDisruption ? 'Dropped [Injected]' : 'Dropped';
        } else if (delEv.deliveryBehavior === DELIVERY_BEHAVIORS.DELAYED) {
          if (this.elapsedSeconds >= delEv.actualDeliveryTimeSec) {
            statusKey = 'delivered';
            statusText = delEv.isInjectedDisruption 
              ? `Delivered (+${delEv.delaySeconds}s) [Injected]` 
              : `Delivered (+${delEv.delaySeconds}s)`;
          } else {
            statusKey = 'delayed';
            const remaining = delEv.actualDeliveryTimeSec - this.elapsedSeconds;
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
          isDelivered: delEv.deliveredToParticipant,
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
   * Backward-compatible Instructor Control Log.
   */
  getInstructorLog() {
    return this.generatedEvents.map(ev => ({
      ...ev,
      scheduledTimeFormatted: formatSecondsToMMSS(ev.scheduledTimeSec),
      actualDeliveryTimeFormatted: formatSecondsToMMSS(ev.actualDeliveryTimeSec)
    }));
  }

  getState() {
    let totalDelivered = 0;
    let totalDelayed = 0;
    let totalDropped = 0;

    for (const deliveredList of this.deliveredEventsByRole.values()) {
      totalDelivered += deliveredList.filter(e => e.status === DELIVERY_STATUS.DELIVERED).length;
      totalDelayed += deliveredList.filter(e => e.status === DELIVERY_STATUS.DELAYED).length;
      totalDropped += deliveredList.filter(e => e.status === DELIVERY_STATUS.DROPPED).length;
    }

    return {
      elapsedSeconds: this.elapsedSeconds,
      elapsedFormatted: formatSecondsToMMSS(this.elapsedSeconds),
      isRunning: this.isRunning,
      isPaused: this.isPaused,
      totalGeneratedEvents: this.generatedEvents.length,
      occurredEventsCount: this.generatedEvents.filter(e => e.status === DELIVERY_STATUS.DELIVERED).length,
      deliveredCount: totalDelivered,
      delayedCount: totalDelayed,
      droppedCount: totalDropped,
      activeBranch: this.activeBranch,
      branchesHistory: [...this.branchesHistory],
      decisionConsequencesLog: [...this.decisionConsequencesLog],
      scenarioDifficulty: this.scenarioDifficulty,
      adaptiveDifficultyEnabled: this.adaptiveDifficultyEnabled,
      difficultyAdaptationsLog: [...this.difficultyAdaptationsLog],
      activeDisruptions: [...this.activeDisruptions],
      disruptionsLog: [...this.disruptionsLog]
    };
  }

  /**
   * Applies a submitted decision, activating its consequence, calculating performance scores,
   * triggering deterministic adaptive difficulty scaling, and activating the resulting scenario branch.
   */
  applyDecision(decisionData) {
    if (!decisionData) return null;

    // 1. Locate matching decision point
    const dp = this.allGeneratedEvents.find(ev => 
      isDecisionEvent(ev) && (ev.id === decisionData.decisionPointId || ev.id === decisionData.id)
    ) || this.allGeneratedEvents.find(isDecisionEvent);

    // 2. Resolve option, nextBranch, and consequence
    const selectedInput = decisionData.selectedOption || decisionData.selectedOptionId || decisionData.title;
    const resolved = resolveOptionBranchAndConsequence(dp, selectedInput);

    const nextBranch = decisionData.nextBranch || resolved.nextBranch;
    const consequence = decisionData.consequence || resolved.consequence;
    const selectedOption = resolved.selectedOption || decisionData.selectedOption;
    const selectedOptionId = resolved.selectedOptionId || decisionData.selectedOptionId;

    // 3. Assemble full context for performance scoring
    const deliveredEvents = decisionData.deliveredEvents || this.getDeliveredEvents(decisionData.submittedRole || 'all');
    const allEventsUpToNow = decisionData.allEventsUpToNow || this.allGeneratedEvents.filter(ev => ev.scheduledTimeSec <= this.elapsedSeconds);
    const scoreContext = {
      decisionPoint: dp,
      decisionScheduledTime: dp?.scheduledTimeSec || 0,
      deadlineSeconds: dp?.deadlineSeconds || (dp?.scheduledTimeSec ? dp.scheduledTimeSec + 60 : 60),
      deliveredEvents,
      allEventsUpToNow,
      teamMessages: decisionData.teamMessages || [],
      sharedAwareness: decisionData.sharedAwareness || {}
    };

    // 4. Calculate transparent deterministic performance score
    const performanceScore = decisionData.performanceScore || calculatePerformanceScore(decisionData, scoreContext);

    // 5. Evaluate deterministic adaptive difficulty or honor authored consequence script
    const hasExplicitDifficultyChange = Boolean(
      consequence?.difficultyChange && 
      !['none', 'standard', 'maintain', 'same'].includes(String(consequence.difficultyChange).toLowerCase().trim())
    );

    let adaptationResult;
    if (hasExplicitDifficultyChange) {
      const dc = String(consequence.difficultyChange).toLowerCase().trim();
      let newDiff = this.scenarioDifficulty;
      let dir = 'maintain';

      if (dc === 'decrease' || dc === 'lower' || dc === 'easy') {
        newDiff = (this.scenarioDifficulty === 'Advanced' || this.scenarioDifficulty === 'High Friction') ? 'Intermediate' : 'Fundamental';
        dir = 'decrease';
      } else if (dc === 'increase' || dc === 'higher' || dc === 'hard') {
        newDiff = (this.scenarioDifficulty === 'Fundamental' || this.scenarioDifficulty === 'Easy') ? 'Intermediate' : 'Advanced';
        dir = 'increase';
      } else {
        newDiff = normalizeDifficulty(consequence.difficultyChange);
        const oldIdx = DIFFICULTY_ORDER.indexOf(normalizeDifficulty(this.scenarioDifficulty));
        const newIdx = DIFFICULTY_ORDER.indexOf(newDiff);
        dir = newIdx > oldIdx ? 'increase' : newIdx < oldIdx ? 'decrease' : 'maintain';
      }

      adaptationResult = {
        previousDifficulty: this.scenarioDifficulty,
        newDifficulty: newDiff,
        adaptationDirection: dir,
        isManualOverride: false,
        triggerReason: `Branch consequence directive: ${consequence.difficultyChange} (${consequence.description || consequence.outcome || 'tactical branch adaptation'}).`,
        performanceScore
      };
    } else {
      adaptationResult = evaluateAdaptiveDifficulty(
        this.scenarioDifficulty,
        performanceScore,
        { enabled: this.adaptiveDifficultyEnabled }
      );
    }

    const adaptationEntry = {
      id: `diff-adapt-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      decisionId: decisionData.id || `dec-${Date.now()}`,
      decisionPointId: dp?.id || decisionData.decisionPointId || null,
      decisionTitle: decisionData.title || (typeof selectedOption === 'object' ? selectedOption.label : selectedOption),
      timestamp: decisionData.timestamp || new Date().toISOString(),
      elapsedSeconds: this.elapsedSeconds,
      elapsedFormatted: formatSecondsToMMSS(this.elapsedSeconds),
      previousDifficulty: adaptationResult.previousDifficulty,
      newDifficulty: adaptationResult.newDifficulty,
      adaptationDirection: adaptationResult.adaptationDirection,
      isManualOverride: adaptationResult.isManualOverride,
      triggerReason: adaptationResult.triggerReason,
      performanceScore
    };

    this.difficultyAdaptationsLog.push(adaptationEntry);
    this.scenarioDifficulty = adaptationResult.newDifficulty;

    // 6. Apply difficulty-driven operational friction or relief
    if (adaptationResult.adaptationDirection === 'increase') {
      // Strong performance -> slightly increase degradation/event complexity
      const willRestore = consequence?.communicationConditions?.type === 'restore' || consequence?.communicationConditions?.type === 'restore communication';
      if (!willRestore && !this.activeDisruptions.some(d => d.disruptionType === 'delay' || d.disruptionType === 'latency')) {
        this.injectDisruption({
          target: 'all',
          disruptionType: 'delay',
          severity: 'slight',
          duration: 45
        });
      }
    } else if (adaptationResult.adaptationDirection === 'decrease') {
      // Weak performance or de-escalation -> reduce complexity or provide clearer channel telemetry
      this.clearDisruption('all');
    }

    // 7. Update active branch and record history
    this.activeBranch = nextBranch;
    this.branchesHistory.push(nextBranch);

    // 8. Record decision consequence log with 5-step AAR causality trail:
    // Information -> Decision -> Performance Metrics -> Consequence -> Difficulty Adaptation
    const consequenceEntry = {
      id: `conseq-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      decisionId: decisionData.id,
      decisionPointId: dp?.id || decisionData.decisionPointId || null,
      decisionTitle: decisionData.title || (typeof selectedOption === 'object' ? selectedOption.label : selectedOption),
      selectedOption,
      selectedOptionId,
      activeBranch: nextBranch,
      nextBranch,
      consequence,
      informationAvailable: (deliveredEvents || []).map(e => ({
        id: e.id,
        title: e.title,
        domain: e.domain,
        confidence: e.confidence,
        status: e.status
      })),
      performanceScore,
      difficultyAdaptation: adaptationEntry,
      timestamp: decisionData.timestamp || new Date().toISOString(),
      elapsedSeconds: this.elapsedSeconds,
      elapsedFormatted: formatSecondsToMMSS(this.elapsedSeconds),
      submittedBy: decisionData.submittedBy || 'Leader-01',
      submittedRole: decisionData.submittedRole || 'team_leader'
    };
    this.decisionConsequencesLog.push(consequenceEntry);

    // 9. Apply explicit communication conditions if authored
    if (consequence?.communicationConditions) {
      const cc = consequence.communicationConditions;
      if (cc.type === 'restore' || cc.type === 'restore communication') {
        this.clearDisruption(cc.target || 'all');
      } else if (cc.type) {
        this.injectDisruption({
          target: cc.target || 'all',
          disruptionType: cc.type,
          severity: cc.severity || 'high',
          duration: cc.duration || 60
        });
      }
    }

    // 10. Re-filter active generated events for the newly selected branch
    this.updateBranchEvents();

    return consequenceEntry;
  }

  /**
   * Re-evaluates which events are active given the current branch and rebuilds participant feeds.
   */
  updateBranchEvents() {
    this.generatedEvents = this.allGeneratedEvents.filter(ev => isEventEligibleForBranch(ev, this.activeBranch));
    this.events = this.generatedEvents;
    this.rebuildDeliveredEvents();
    this.evaluateEvents();
    this.notify();
  }

  getActiveBranch() {
    return this.activeBranch;
  }

  getBranchesHistory() {
    return [...this.branchesHistory];
  }

  getDecisionConsequencesLog() {
    return [...this.decisionConsequencesLog];
  }

  getScenarioDifficulty() {
    return this.scenarioDifficulty;
  }

  isAdaptiveDifficultyEnabled() {
    return this.adaptiveDifficultyEnabled;
  }

  setAdaptiveDifficultyEnabled(enabled) {
    this.adaptiveDifficultyEnabled = Boolean(enabled);
    this.notify();
    return this.adaptiveDifficultyEnabled;
  }

  getDifficultyAdaptationsLog() {
    return [...this.difficultyAdaptationsLog];
  }

  /**
   * Allows the Instructor or Evaluator to manually override the scenario difficulty level.
   * Trainee overrides are strictly forbidden.
   */
  overrideScenarioDifficulty(newDifficulty, reason = '', userRole = 'instructor') {
    const normRole = normalizeRole(userRole);
    if (normRole !== TRAINEE_ROLES.INSTRUCTOR && normRole !== 'admin' && normRole !== 'lead_evaluator') {
      throw new Error(`Unauthorized: Role '${userRole}' cannot override scenario difficulty. Instructor privileges required.`);
    }

    const adaptationResult = evaluateAdaptiveDifficulty(this.scenarioDifficulty, null, {
      isManualOverride: true,
      overrideTarget: newDifficulty,
      overrideReason: reason
    });

    const adaptationEntry = {
      id: `diff-override-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      decisionId: null,
      decisionPointId: null,
      decisionTitle: 'Instructor Manual Override',
      timestamp: new Date().toISOString(),
      elapsedSeconds: this.elapsedSeconds,
      elapsedFormatted: formatSecondsToMMSS(this.elapsedSeconds),
      previousDifficulty: adaptationResult.previousDifficulty,
      newDifficulty: adaptationResult.newDifficulty,
      adaptationDirection: adaptationResult.adaptationDirection,
      isManualOverride: true,
      triggerReason: adaptationResult.triggerReason,
      performanceScore: null
    };

    this.scenarioDifficulty = adaptationResult.newDifficulty;
    this.difficultyAdaptationsLog.push(adaptationEntry);
    this.notify();
    return adaptationEntry;
  }

  /**
   * Returns delivered events for a given participant role at or before elapsedSeconds.
   */
  getDeliveredEvents(role = 'all', elapsedSeconds = null) {
    const sec = elapsedSeconds !== null && elapsedSeconds !== undefined ? Number(elapsedSeconds) : this.elapsedSeconds;
    const norm = normalizeRole(role);
    if (norm === TRAINEE_ROLES.INSTRUCTOR || role === 'all') {
      return this.generatedEvents.filter(ev => {
        if (ev.deliveryBehavior === DELIVERY_BEHAVIORS.DROPPED) return false;
        const deliverAt = ev.deliveryBehavior === DELIVERY_BEHAVIORS.DELAYED ? ev.actualDeliveryTimeSec : ev.scheduledTimeSec;
        return sec >= deliverAt;
      });
    }

    const list = this.deliveredEventsByRole.get(norm) || this.deliveredEventsByRole.get(role) || [];
    return list.filter(ev => {
      if (ev.deliveryBehavior === DELIVERY_BEHAVIORS.DROPPED) return false;
      const deliverAt = ev.deliveryBehavior === DELIVERY_BEHAVIORS.DELAYED ? ev.actualDeliveryTimeSec : ev.scheduledTimeSec;
      return sec >= deliverAt;
    });
  }

  /**
   * Returns active decision events that have triggered at or before current elapsed time.
   */
  getActiveDecisionPoints(userRole = 'all', elapsedSec = null) {
    const checkElapsed = elapsedSec !== null ? elapsedSec : this.elapsedSeconds;
    const normRole = normalizeRole(userRole);
    return this.generatedEvents.filter(ev => {
      if (!isDecisionEvent(ev)) return false;
      const roleMatches = normRole === 'all' || isRoleAllowedForDecision(ev, normRole);
      return ev.scheduledTimeSec <= checkElapsed && roleMatches;
    });
  }

  /**
   * Returns information availability percentage for a given role at current elapsed time.
   */
  getInformationAvailability(userRole = 'team_leader') {
    return calculateInformationAvailability(
      this.scenario?.events || this.generatedEvents,
      userRole,
      this.elapsedSeconds,
      this.sessionSeed,
      this.activeDisruptions
    );
  }

  /**
   * Returns current shared awareness level across the squad.
   */
  getSharedAwareness(teamMessages = []) {
    return calculateSharedAwareness(
      this.scenario?.events || this.generatedEvents,
      this.elapsedSeconds,
      this.sessionSeed,
      this.activeDisruptions,
      teamMessages
    );
  }

  /**
   * Captures an Evidence Snapshot at current elapsed time.
   */
  createEvidenceSnapshot({
    decidingRole = 'team_leader',
    decidingParticipantId = 'Operator',
    decisionText = '',
    confidence = 'Medium',
    rationale = '',
    sourcesUsed = [],
    elapsedSeconds = null,
    teamMessages = [],
    decisionTriggerTimeSec = 0
  }) {
    return createEvidenceSnapshot({
      scenarioEvents: this.scenario?.events || this.generatedEvents,
      decidingRole,
      decidingParticipantId,
      decisionText,
      confidence,
      rationale,
      sourcesUsed,
      elapsedSeconds: elapsedSeconds !== null ? elapsedSeconds : this.elapsedSeconds,
      sessionSeed: this.sessionSeed,
      activeDisruptions: this.activeDisruptions,
      teamMessages,
      decisionTriggerTimeSec
    });
  }
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
 * Evaluates participant-specific delivered messages for a given trainee role.
 * Trainees NEVER see dropped messages or un-elapsed delays.
 */
export function evaluateParticipantDeliveredEvents(eventsList = [], userRole = 'team_leader', elapsedSeconds = 0, sessionSeed = 'OP_FOG_DEFAULT', activeDisruptions = []) {
  const normRole = normalizeRole(userRole);

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

  return deliveredEvents.filter(ev => ev.status === DELIVERY_STATUS.DELIVERED && ev.deliveredToParticipant);
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
      const delEv = generateDeliveredEvent(ev, normRole, sessionSeed, activeDisruptions);
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
      informationAvailabilityPct: infoAvailabilityPct,
      confidenceNum,
      confidenceVsAvailabilityDelta: confidenceNum - infoAvailabilityPct,
      sharedAwarenessPct
    }
  };
}
