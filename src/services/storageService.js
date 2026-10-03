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

// Initial Fictional Scenarios
const DEFAULT_SCENARIOS = [
  {
    id: 'scen-01',
    title: 'Scenario A — Communication Delay',
    category: 'Latency & Signal',
    code: 'SCEN-101',
    shortDesc: 'Messages arrive later than expected, requiring participants to manage out-of-order dispatches and incomplete information.',
    objective: 'Practice command discipline, prioritize essential dispatches, and maintain situational awareness during 5 to 15-minute signal blackouts.',
    duration: '45 mins (Configurable Demo Value)',
    difficulty: 'Intermediate',
    status: 'Ready',
    events: [
      { id: 'ev-1', time: '00:00', title: 'Initial Dispatch Received', type: 'info', content: 'Base command orders unit realignment along Sector Bravo. Telemetry link operational.' },
      { id: 'ev-2', time: '05:00', title: 'Signal Attenuation Warning', type: 'warning', content: 'RF interference detected. Telemetry packet delay increased by 300 seconds.' },
      { id: 'ev-3', time: '12:00', title: 'Delayed Field Update', type: 'delay', content: 'Reconnaissance dispatch received with 10-minute timestamp lag. Position unconfirmed.' },
      { id: 'ev-4', time: '25:00', title: 'Secondary Link Restoration', type: 'success', content: 'Satellite relay restored. Verify pending orders before execution.' }
    ]
  },
  {
    id: 'scen-02',
    title: 'Scenario B — Conflicting Reports',
    category: 'Intel Synthesis',
    code: 'SCEN-102',
    shortDesc: 'Participants receive fictional intelligence reports that contradict each other and must record their reasoning before acting.',
    objective: 'Evaluate contradictory field reports, cross-verify source reliability, and document rationale under time pressure.',
    duration: '60 mins (Configurable Demo Value)',
    difficulty: 'Advanced',
    status: 'Ready',
    events: [
      { id: 'ev-1', time: '00:00', title: 'Joint Recon Briefing', type: 'info', content: 'Forward patrol Alpha reports sector clear of obstructions.' },
      { id: 'ev-2', time: '08:00', title: 'Contradictory Intel Feed', type: 'warning', content: 'Satellite imagery feed Bravo indicates route obstruction at Grid 44-B.' },
      { id: 'ev-3', time: '18:00', title: 'Liaison Query', type: 'delay', content: 'Regional control requests immediate confirmation of movement direction.' }
    ]
  },
  {
    id: 'scen-03',
    title: 'Scenario C — Incomplete Information',
    category: 'Situational Awareness',
    code: 'SCEN-103',
    shortDesc: 'Participants must make and document decisions with limited information and missing grid coordinates.',
    objective: 'Formulate contingent action plans despite significant gaps in the common operating picture (COP).',
    duration: '30 mins (Configurable Demo Value)',
    difficulty: 'High Friction',
    status: 'Ready',
    events: [
      { id: 'ev-1', time: '00:00', title: 'Partial Situation Report', type: 'info', content: 'Supply convoy dispatch initiated. Sensor feed 3 offline.' },
      { id: 'ev-2', time: '06:00', title: 'Truncated Order Received', type: 'warning', content: 'Dispatch received: "Hold position at sector [DATA CORRUPTED] until..."' },
      { id: 'ev-3', time: '15:00', title: 'Urgent Decision Request', type: 'delay', content: 'Field unit requests authorization to proceed without complete grid coordinates.' }
    ]
  }
];

// Initial Sample Sessions
const DEFAULT_SESSIONS = [
  {
    id: 'sess-101',
    name: 'Sector Bravo Latency Test',
    scenarioId: 'scen-01',
    scenarioTitle: 'Scenario A — Communication Delay',
    status: 'Completed',
    participantCount: 1,
    creator: 'OPS-8842-IND',
    createdAt: '2026-10-02T14:30:00Z',
    completedAt: '2026-10-02T15:15:00Z',
    isSample: true
  },
  {
    id: 'sess-102',
    name: 'Conflicting Recon Synthesis Exercise',
    scenarioId: 'scen-02',
    scenarioTitle: 'Scenario B — Conflicting Reports',
    status: 'Completed',
    participantCount: 1,
    creator: 'OPS-8842-IND',
    createdAt: '2026-10-01T10:00:00Z',
    completedAt: '2026-10-01T11:00:00Z',
    isSample: true
  }
];

// Initial Sample AAR Records
const DEFAULT_AARS = [
  {
    id: 'aar-101',
    sessionId: 'sess-101',
    sessionName: 'Sector Bravo Latency Test',
    scenarioTitle: 'Scenario A — Communication Delay',
    creator: 'OPS-8842-IND',
    startTime: '2026-10-02T14:30:00Z',
    endTime: '2026-10-02T15:15:00Z',
    durationMinutes: 45,
    decisionsCount: 2,
    instructorNotes: 'Participant demonstrated good caution when handling 10-minute delayed dispatch. Recommended faster logging of contingent orders.',
    decisions: [
      {
        id: 'dec-1',
        title: 'Verify Recon Dispatch Timestamp',
        rationale: 'Received field update with 10-minute lag. Sent verification query over secondary VHF link before altering unit movement.',
        timestamp: '2026-10-02T14:42:00Z',
        elapsedMinutes: 12,
        confidence: 'Medium'
      },
      {
        id: 'dec-2',
        title: 'Hold Position at Sector Bravo',
        rationale: 'Primary satellite link re-established. Confirmed base command directive before executing forward deployment.',
        timestamp: '2026-10-02T14:58:00Z',
        elapsedMinutes: 28,
        confidence: 'High'
      }
    ],
    isSample: true
  }
];

export const storageService = {
  // Scenarios
  getScenarios: () => {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SCENARIOS);
      return data ? JSON.parse(data) : DEFAULT_SCENARIOS;
    } catch (e) {
      return DEFAULT_SCENARIOS;
    }
  },

  saveScenario: (newScenario) => {
    const list = storageService.getScenarios();
    const updated = [newScenario, ...list];
    localStorage.setItem(STORAGE_KEYS.SCENARIOS, JSON.stringify(updated));
    return updated;
  },

  // Sessions
  getSessions: () => {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SESSIONS);
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
    localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(updated));
    return newSession;
  },

  updateSessionStatus: (sessionId, status) => {
    const list = storageService.getSessions();
    const updated = list.map(s => s.id === sessionId ? { ...s, status, completedAt: status === 'Completed' ? new Date().toISOString() : s.completedAt } : s);
    localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(updated));
    return updated;
  },

  // Decisions
  getDecisions: () => {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.DECISIONS);
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
    localStorage.setItem(STORAGE_KEYS.DECISIONS, JSON.stringify(updated));
    return newDecision;
  },

  getDecisionsForSession: (sessionId) => {
    const list = storageService.getDecisions();
    return list.filter(d => d.sessionId === sessionId);
  },

  // AARs
  getAARs: () => {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.AARS);
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
    localStorage.setItem(STORAGE_KEYS.AARS, JSON.stringify(updated));
    return newAAR;
  },

  saveAARNote: (aarId, noteText) => {
    const list = storageService.getAARs();
    const updated = list.map(aar => aar.id === aarId ? { ...aar, instructorNotes: noteText } : aar);
    localStorage.setItem(STORAGE_KEYS.AARS, JSON.stringify(updated));
    return updated;
  }
};
