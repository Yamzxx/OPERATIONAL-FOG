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
    this.generatedEvents = (scenario?.events || []).map((ev, index) => {
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
        instructorNotes: ev.instructorNotes || '',
        roleVariations: ev.roleVariations || {},
        status: DELIVERY_STATUS.PENDING,
        deliveredToParticipant: false
      };
    }).sort((a, b) => a.scheduledTimeSec - b.scheduledTimeSec);

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
      activeDisruptions: [...this.activeDisruptions],
      disruptionsLog: [...this.disruptionsLog]
    };
  }

  /**
   * Returns active decision events that have triggered at or before current elapsed time.
   */
  getActiveDecisionPoints(userRole = 'all', elapsedSec = null) {
    const checkElapsed = elapsedSec !== null ? elapsedSec : this.elapsedSeconds;
    const normRole = normalizeRole(userRole);
    return this.generatedEvents.filter(ev => {
      if (!isDecisionEvent(ev)) return false;
      const targetRole = normalizeRole(ev.targetRole || ev.intendedRecipient || 'team_leader');
      const roleMatches = targetRole === 'all' || targetRole === normRole || normRole === TRAINEE_ROLES.INSTRUCTOR;
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
