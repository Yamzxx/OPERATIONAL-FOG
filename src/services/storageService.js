/**
 * Operational Fog - Storage Service & Data Persistence
 * Manages local persistence for Scenarios, Sessions, Decision Logs, and AAR Records.
 */

const STORAGE_KEYS = {
  SCENARIOS: 'op_fog_scenarios_v1',
  SESSIONS: 'op_fog_sessions_v1',
  DECISIONS: 'op_fog_decisions_v1',
  AARS: 'op_fog_aars_v1'
};

// Default Scenarios including SIH Demonstration Scenario
const DEFAULT_SCENARIOS = [
  {
    id: 'scen-sih-2026',
    title: 'SIH Demo Scenario — Joint Tactical Node Resilience',
    category: 'Joint Operations',
    code: 'SCEN-SIH-2026',
    shortDesc: 'Official Smart India Hackathon demonstration scenario featuring normal dispatches, 300s signal latency, dropped dispatches, and conflicting intel feeds.',
    objective: 'Evaluate tactical decision discipline when primary telemetry links experience RF attenuation and contradictory reconnaissance dispatches.',
    duration: '45 mins (SIH Demo Template)',
    difficulty: 'High Friction',
    status: 'Ready (SIH Demo)',
    events: [
      {
        id: 'sih-ev-1',
        time: '00:00',
        title: 'Initial Tactical Dispatch',
        type: 'info',
        deliveryBehavior: 'normal',
        delaySeconds: 0,
        intendedRecipient: 'all',
        content: 'Joint Command orders forward unit alignment along Sector Bravo. Telemetry channels operational.',
        instructorNotes: 'Baseline event delivered at exercise start.'
      },
      {
        id: 'sih-ev-2',
        time: '05:00',
        title: 'Signal Attenuation Warning',
        type: 'warning',
        deliveryBehavior: 'delayed',
        delaySeconds: 300, // Delivered at 05:00 + 05:00 = 10:00
        intendedRecipient: 'all',
        content: 'RF jamming detected. Secondary satellite link experiencing 300-second latency.',
        instructorNotes: 'Tests participant caution when dealing with delayed dispatches.'
      },
      {
        id: 'sih-ev-3',
        time: '12:00',
        title: 'RF Blackout (Dropped Dispatch)',
        type: 'alert',
        deliveryBehavior: 'dropped',
        delaySeconds: 0,
        intendedRecipient: 'all',
        content: 'Patrol Bravo emergency beacon update. Link dropped due to terrain masking.',
        instructorNotes: 'Message is dropped from participant view but recorded in instructor audit log.'
      },
      {
        id: 'sih-ev-4',
        time: '18:00',
        title: 'Forward Recon Update A',
        type: 'info',
        deliveryBehavior: 'normal',
        delaySeconds: 0,
        intendedRecipient: 'commander',
        content: 'Reconnaissance Patrol Alpha reports Sector Bravo route clear of obstructions.',
        instructorNotes: 'First intel report (delivered to Commander).'
      },
      {
        id: 'sih-ev-5',
        time: '25:00',
        title: 'Satellite Imagery Feed B (Conflicting)',
        type: 'warning',
        deliveryBehavior: 'conflicting',
        delaySeconds: 0,
        intendedRecipient: 'all',
        content: 'Thermal imagery feed Bravo indicates heavy route obstruction at Sector Bravo grid 44-B.',
        instructorNotes: 'Contradicts Patrol Alpha report. Forces participant to record verification rationale.'
      },
      {
        id: 'sih-ev-6',
        time: '30:00',
        title: 'Intercepted Signals Intel C (Conflicting Report 2)',
        type: 'warning',
        deliveryBehavior: 'conflicting',
        delaySeconds: 0,
        intendedRecipient: 'all',
        content: 'Electronic warfare intercept indicates enemy decoy emitter active at Sector Bravo grid 44-B.',
        instructorNotes: 'Second conflicting report providing alternate explanation for thermal imagery.'
      },
      {
        id: 'sih-ev-7',
        time: '35:00',
        title: 'Truncated Supply Order D (Incomplete Report)',
        type: 'warning',
        deliveryBehavior: 'incomplete',
        delaySeconds: 0,
        intendedRecipient: 'all',
        content: 'Resupply dispatch received: "Hold position at grid [DATA CORRUPTED] until secondary convoy arrives at..."',
        instructorNotes: 'Incomplete information dispatch requiring contingent decision rationale.'
      }
    ]
  },
  {
    id: 'scen-01',
    title: 'Scenario A — Communication Delay',
    category: 'Latency & Signal',
    code: 'SCEN-101',
    shortDesc: 'Messages arrive later than expected, requiring participants to manage out-of-order dispatches and incomplete information.',
    objective: 'Practice command discipline, prioritize essential dispatches, and maintain situational awareness during 5 to 15-minute signal blackouts.',
    duration: '45 mins',
    difficulty: 'Intermediate',
    status: 'Ready',
    events: [
      { id: 'ev-1', time: '00:00', title: 'Initial Dispatch Received', type: 'info', deliveryBehavior: 'normal', intendedRecipient: 'all', content: 'Base command orders unit realignment along Sector Bravo. Telemetry link operational.' },
      { id: 'ev-2', time: '05:00', title: 'Signal Attenuation Warning', type: 'warning', deliveryBehavior: 'delayed', delaySeconds: 300, intendedRecipient: 'all', content: 'RF interference detected. Telemetry packet delay increased by 300 seconds.' },
      { id: 'ev-3', time: '12:00', title: 'Delayed Field Update', type: 'delay', deliveryBehavior: 'delayed', delaySeconds: 600, intendedRecipient: 'all', content: 'Reconnaissance dispatch received with 10-minute timestamp lag. Position unconfirmed.' },
      { id: 'ev-4', time: '25:00', title: 'Secondary Link Restoration', type: 'info', deliveryBehavior: 'normal', intendedRecipient: 'all', content: 'Satellite relay restored. Verify pending orders before execution.' }
    ]
  },
  {
    id: 'scen-02',
    title: 'Scenario B — Conflicting Reports',
    category: 'Intel Synthesis',
    code: 'SCEN-102',
    shortDesc: 'Participants receive fictional intelligence reports that contradict each other and must record their reasoning before acting.',
    objective: 'Evaluate contradictory field reports, cross-verify source reliability, and document rationale under time pressure.',
    duration: '60 mins',
    difficulty: 'Advanced',
    status: 'Ready',
    events: [
      { id: 'ev-1', time: '00:00', title: 'Joint Recon Briefing', type: 'info', deliveryBehavior: 'normal', intendedRecipient: 'all', content: 'Forward patrol Alpha reports sector clear of obstructions.' },
      { id: 'ev-2', time: '08:00', title: 'Contradictory Intel Feed', type: 'warning', deliveryBehavior: 'conflicting', intendedRecipient: 'all', content: 'Satellite imagery feed Bravo indicates route obstruction at Grid 44-B.' },
      { id: 'ev-3', time: '18:00', title: 'Liaison Query', type: 'info', deliveryBehavior: 'normal', intendedRecipient: 'all', content: 'Regional control requests immediate confirmation of movement direction.' }
    ]
  },
  {
    id: 'scen-03',
    title: 'Scenario C — Incomplete Information',
    category: 'Situational Awareness',
    code: 'SCEN-103',
    shortDesc: 'Participants must make and document decisions with limited information and missing grid coordinates.',
    objective: 'Formulate contingent action plans despite significant gaps in the common operating picture (COP).',
    duration: '30 mins',
    difficulty: 'High Friction',
    status: 'Ready',
    events: [
      { id: 'ev-1', time: '00:00', title: 'Partial Situation Report', type: 'info', deliveryBehavior: 'normal', intendedRecipient: 'all', content: 'Supply convoy dispatch initiated. Sensor feed 3 offline.' },
      { id: 'ev-2', time: '06:00', title: 'Truncated Order Received', type: 'warning', deliveryBehavior: 'incomplete', intendedRecipient: 'all', content: 'Dispatch received: "Hold position at sector [DATA CORRUPTED] until..."' },
      { id: 'ev-3', time: '15:00', title: 'Urgent Decision Request', type: 'info', deliveryBehavior: 'normal', intendedRecipient: 'all', content: 'Field unit requests authorization to proceed without complete grid coordinates.' }
    ]
  }
];

// Initial Sample Sessions
const DEFAULT_SESSIONS = [
  {
    id: 'sess-sih-101',
    sessionCode: 'FOG-SIH1',
    name: 'SIH Joint Tactical Node Exercise',
    scenarioId: 'scen-sih-2026',
    scenarioTitle: 'SIH Demo Scenario — Joint Tactical Node Resilience',
    status: 'Completed',
    participantCount: 2,
    creator: 'OPS-8842-IND',
    createdAt: '2026-10-03T18:00:00Z',
    completedAt: '2026-10-03T18:45:00Z',
    isSample: true
  },
  {
    id: 'sess-101',
    sessionCode: 'FOG-7429',
    name: 'Sector Bravo Latency Test',
    scenarioId: 'scen-01',
    scenarioTitle: 'Scenario A — Communication Delay',
    status: 'Completed',
    participantCount: 1,
    creator: 'OPS-8842-IND',
    createdAt: '2026-10-02T14:30:00Z',
    completedAt: '2026-10-02T15:15:00Z',
    isSample: true
  }
];

// Initial Sample AAR Records
const DEFAULT_AARS = [
  {
    id: 'aar-sih-101',
    sessionId: 'sess-sih-101',
    sessionCode: 'FOG-SIH1',
    sessionName: 'SIH Joint Tactical Node Exercise',
    scenarioTitle: 'SIH Demo Scenario — Joint Tactical Node Resilience',
    creator: 'OPS-8842-IND',
    startTime: '2026-10-03T18:00:00Z',
    endTime: '2026-10-03T18:45:00Z',
    durationMinutes: 45,
    decisionsCount: 2,
    instructorNotes: 'Participants handled the 300s delayed warning with proper caution. Successfully identified contradiction between Recon Patrol Alpha and Thermal Imagery Feed Bravo.',
    decisions: [
      {
        id: 'dec-sih-1',
        title: 'Verify Signal Attenuation & Request Secondary VHF Link',
        rationale: 'Telemetry experienced 300-second latency. Verified timestamp with Signals officer before changing unit formation.',
        timestamp: '2026-10-03T18:12:00Z',
        elapsedMinutes: 12,
        elapsedTimeFormatted: '12:00',
        confidence: 'High',
        submittedBy: 'Commander Alpha',
        submittedRole: 'commander'
      },
      {
        id: 'dec-sih-2',
        title: 'Hold Position at Sector Bravo Grid 44-B',
        rationale: 'Received conflicting Thermal Imagery Feed Bravo indicating route obstruction. Ordered hold until ground recon cross-verifies.',
        timestamp: '2026-10-03T18:28:00Z',
        elapsedMinutes: 28,
        elapsedTimeFormatted: '28:00',
        confidence: 'Medium',
        submittedBy: 'Commander Alpha',
        submittedRole: 'commander'
      }
    ],
    events: [
      { id: 'sih-ev-1', time: '00:00', scheduledTimeSec: 0, actualDeliveryTimeSec: 0, title: 'Initial Tactical Dispatch', type: 'info', deliveryBehavior: 'normal', recipientRole: 'all', content: 'Joint Command orders forward unit alignment along Sector Bravo.' },
      { id: 'sih-ev-2', time: '05:00', scheduledTimeSec: 300, actualDeliveryTimeSec: 600, title: 'Signal Attenuation Warning', type: 'warning', deliveryBehavior: 'delayed', recipientRole: 'all', content: 'RF jamming detected. Secondary satellite link experiencing 300-second latency.' },
      { id: 'sih-ev-3', time: '12:00', scheduledTimeSec: 720, actualDeliveryTimeSec: 720, title: 'RF Blackout (Dropped Dispatch)', type: 'alert', deliveryBehavior: 'dropped', recipientRole: 'all', content: 'Patrol Bravo emergency beacon update. Link dropped.' },
      { id: 'sih-ev-4', time: '18:00', scheduledTimeSec: 1080, actualDeliveryTimeSec: 1080, title: 'Forward Recon Update A', type: 'info', deliveryBehavior: 'normal', recipientRole: 'commander', content: 'Reconnaissance Patrol Alpha reports Sector Bravo route clear.' },
      { id: 'sih-ev-5', time: '25:00', scheduledTimeSec: 1500, actualDeliveryTimeSec: 1500, title: 'Satellite Imagery Feed B (Conflicting)', type: 'warning', deliveryBehavior: 'conflicting', recipientRole: 'all', content: 'Thermal imagery feed Bravo indicates heavy route obstruction at Sector Bravo grid 44-B.' },
      { id: 'sih-ev-6', time: '30:00', scheduledTimeSec: 1800, actualDeliveryTimeSec: 1800, title: 'Intercepted Signals Intel C (Conflicting 2)', type: 'warning', deliveryBehavior: 'conflicting', recipientRole: 'all', content: 'Electronic warfare intercept indicates enemy decoy emitter active at Sector Bravo grid 44-B.' },
      { id: 'sih-ev-7', time: '35:00', scheduledTimeSec: 2100, actualDeliveryTimeSec: 2100, title: 'Truncated Supply Order D (Incomplete)', type: 'warning', deliveryBehavior: 'incomplete', recipientRole: 'all', content: 'Resupply dispatch received: "Hold position at grid [DATA CORRUPTED] until secondary convoy arrives at..."' }
    ],
    participants: [
      { displayName: 'Commander Alpha', role: 'commander', status: 'Online' },
      { displayName: 'Forward Observer Bravo', role: 'field_unit', status: 'Online' }
    ],
    isSample: true
  }
];

const inMemoryStore = new Map();

function getItem(key) {
  try {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem(key);
    }
    return inMemoryStore.get(key) || null;
  } catch (e) {
    return null;
  }
}

function setItem(key, value) {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, value);
    } else {
      inMemoryStore.set(key, value);
    }
  } catch (e) {
    // Ignore storage quota or environment errors
  }
}

const API_BASE_URL = typeof process !== 'undefined' && process.env?.VITE_BACKEND_URL 
  ? process.env.VITE_BACKEND_URL + '/api'
  : 'http://localhost:4000/api';

export const storageService = {
  // Scenarios
  getScenarios: () => {
    try {
      const data = getItem(STORAGE_KEYS.SCENARIOS);
      return data ? JSON.parse(data) : DEFAULT_SCENARIOS;
    } catch (e) {
      return DEFAULT_SCENARIOS;
    }
  },

  saveScenario: (newScenario) => {
    const list = storageService.getScenarios();
    const updated = [newScenario, ...list];
    setItem(STORAGE_KEYS.SCENARIOS, JSON.stringify(updated));

    // Async sync to Backend API if reachable
    if (typeof fetch !== 'undefined') {
      fetch(`${API_BASE_URL}/scenarios`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newScenario)
      }).catch(() => {});
    }

    return updated;
  },

  // Sessions
  getSessions: () => {
    try {
      const data = getItem(STORAGE_KEYS.SESSIONS);
      return data ? JSON.parse(data) : DEFAULT_SESSIONS;
    } catch (e) {
      return DEFAULT_SESSIONS;
    }
  },

  createSession: (sessionData) => {
    const list = storageService.getSessions();
    const newSession = {
      id: `sess-${Date.now()}`,
      createdAt: new Date().toISOString(),
      status: 'In Progress',
      participantCount: 1,
      isSample: false,
      ...sessionData
    };
    const updated = [newSession, ...list];
    setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(updated));

    // Async sync to Backend API if reachable
    if (typeof fetch !== 'undefined') {
      fetch(`${API_BASE_URL}/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSession)
      }).catch(() => {});
    }

    return newSession;
  },

  updateSessionStatus: (sessionId, status) => {
    const list = storageService.getSessions();
    const updated = list.map(s => s.id === sessionId ? { ...s, status, completedAt: status === 'Completed' ? new Date().toISOString() : s.completedAt } : s);
    setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(updated));

    if (typeof fetch !== 'undefined') {
      fetch(`${API_BASE_URL}/sessions/${sessionId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      }).catch(() => {});
    }

    return updated;
  },

  // Decisions
  getDecisions: () => {
    try {
      const data = getItem(STORAGE_KEYS.DECISIONS);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  },

  addDecision: (sessionId, decisionData) => {
    const list = storageService.getDecisions();
    const newDecision = {
      id: `dec-${Date.now()}`,
      sessionId,
      timestamp: new Date().toISOString(),
      ...decisionData
    };
    const updated = [...list, newDecision];
    setItem(STORAGE_KEYS.DECISIONS, JSON.stringify(updated));

    if (typeof fetch !== 'undefined') {
      fetch(`${API_BASE_URL}/decisions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newDecision)
      }).catch(() => {});
    }

    return newDecision;
  },

  getDecisionsForSession: (sessionId) => {
    const list = storageService.getDecisions();
    return list.filter(d => d.sessionId === sessionId);
  },

  // AARs
  getAARs: () => {
    try {
      const data = getItem(STORAGE_KEYS.AARS);
      return data ? JSON.parse(data) : DEFAULT_AARS;
    } catch (e) {
      return DEFAULT_AARS;
    }
  },

  saveAAR: (aarData) => {
    const list = storageService.getAARs();
    const newAAR = {
      id: `aar-${Date.now()}`,
      createdAt: new Date().toISOString(),
      instructorNotes: '',
      isSample: false,
      ...aarData
    };
    const updated = [newAAR, ...list];
    setItem(STORAGE_KEYS.AARS, JSON.stringify(updated));

    if (typeof fetch !== 'undefined') {
      fetch(`${API_BASE_URL}/aars`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAAR)
      }).catch(() => {});
    }

    return newAAR;
  },

  saveAARNote: (aarId, noteText) => {
    const list = storageService.getAARs();
    const updated = list.map(aar => aar.id === aarId ? { ...aar, instructorNotes: noteText } : aar);
    setItem(STORAGE_KEYS.AARS, JSON.stringify(updated));

    if (typeof fetch !== 'undefined') {
      fetch(`${API_BASE_URL}/aars/${aarId}/note`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ noteText })
      }).catch(() => {});
    }

    return updated;
  }
};
