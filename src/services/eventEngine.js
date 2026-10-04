/**
 * Operational Fog - Deterministic Scenario Event Engine
 * Handles deterministic event delivery, latency application, dropped message tracking,
 * role targeting, and simulation clock management.
 */

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
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Class representing a deterministic event engine instance for an exercise run.
 */
export class EventEngine {
  constructor(scenario, options = {}) {
    this.scenario = scenario;
    this.elapsedSeconds = options.initialElapsed || 0;
    this.isRunning = false;
    this.isPaused = false;
    this.timerInterval = null;
    this.listeners = [];

    // Normalize events list into engine internal state
    this.events = (scenario.events || []).map((ev, index) => {
      const scheduledSec = parseTimeToSeconds(ev.time || ev.scheduledTime || 0);
      const delaySec = ev.delaySeconds !== undefined ? Number(ev.delaySeconds) : (ev.deliveryBehavior === 'delayed' ? (ev.delayAmount || 300) : 0);
      const actualDeliverySec = ev.deliveryBehavior === 'delayed' ? scheduledSec + delaySec : scheduledSec;

      return {
        id: ev.id || `ev-${index + 1}`,
        title: ev.title || `Event #${index + 1}`,
        content: ev.content || ev.messageContent || '',
        type: ev.type || 'info', // info | warning | alert | delay
        deliveryBehavior: ev.deliveryBehavior || ev.delivery || 'normal', // normal | delayed | dropped | conflicting | incomplete
        recipientRole: ev.recipientRole || ev.intendedRecipient || 'all',
        scheduledTimeSec: scheduledSec,
        delaySeconds: delaySec,
        actualDeliveryTimeSec: actualDeliverySec,
        status: DELIVERY_STATUS.PENDING,
        processed: false,
        deliveredToParticipant: false,
        instructorNotes: ev.instructorNotes || '',
        conflictsWithId: ev.conflictsWithId || null,
        incompleteFields: ev.incompleteFields || null
      };
    }).sort((a, b) => a.scheduledTimeSec - b.scheduledTimeSec);
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
    this.evaluateEvents();
    this.notify();
  }

  step(seconds = 1) {
    this.elapsedSeconds += seconds;
    this.evaluateEvents();
    this.notify();
  }

  evaluateEvents() {
    this.events.forEach(ev => {
      // 1. Check if scheduled time reached
      if (this.elapsedSeconds >= ev.scheduledTimeSec) {
        if (ev.deliveryBehavior === DELIVERY_BEHAVIORS.DROPPED) {
          // Message is dropped at scheduled time — NEVER delivered to participant
          ev.status = DELIVERY_STATUS.DROPPED;
          ev.processed = true;
          ev.deliveredToParticipant = false;
        } else if (ev.deliveryBehavior === DELIVERY_BEHAVIORS.DELAYED) {
          // Check if actual delayed time reached
          if (this.elapsedSeconds >= ev.actualDeliveryTimeSec) {
            ev.status = DELIVERY_STATUS.DELIVERED;
            ev.processed = true;
            ev.deliveredToParticipant = true;
          } else {
            ev.status = DELIVERY_STATUS.DELAYED;
            ev.processed = true;
            ev.deliveredToParticipant = false;
          }
        } else {
          // Normal, conflicting, incomplete
          ev.status = DELIVERY_STATUS.DELIVERED;
          ev.processed = true;
          ev.deliveredToParticipant = true;
        }
      }
    });
  }

  /**
   * Returns messages visible to a participant based on role and current elapsed time.
   */
  getParticipantMessages(userRole = 'all') {
    return this.events.filter(ev => {
      if (!ev.deliveredToParticipant) return false;
      if (ev.status !== DELIVERY_STATUS.DELIVERED) return false;

      // Role check: 'all' or matches specific role
      const matchesRole = ev.recipientRole === RECIPIENT_ROLES.ALL || 
                          ev.recipientRole === userRole || 
                          userRole === 'instructor';
      return matchesRole;
    });
  }

  /**
   * Returns full event schedule for Instructor view including pending, delayed, dropped.
   */
  getInstructorLog() {
    return this.events.map(ev => ({
      ...ev,
      scheduledTimeFormatted: formatSecondsToMMSS(ev.scheduledTimeSec),
      actualDeliveryTimeFormatted: formatSecondsToMMSS(ev.actualDeliveryTimeSec)
    }));
  }

  getState() {
    return {
      elapsedSeconds: this.elapsedSeconds,
      elapsedFormatted: formatSecondsToMMSS(this.elapsedSeconds),
      isRunning: this.isRunning,
      isPaused: this.isPaused,
      totalEvents: this.events.length,
      deliveredCount: this.events.filter(e => e.status === DELIVERY_STATUS.DELIVERED).length,
      delayedCount: this.events.filter(e => e.status === DELIVERY_STATUS.DELAYED).length,
      droppedCount: this.events.filter(e => e.status === DELIVERY_STATUS.DROPPED).length,
      pendingCount: this.events.filter(e => e.status === DELIVERY_STATUS.PENDING).length
    };
  }
}
