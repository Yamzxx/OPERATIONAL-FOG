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
    title: 'Operation Border Shield — Ambush or False Alarm?',
    category: 'Joint Tactical Operation',
    code: 'SCEN-SIH-2026',
    shortDesc: 'Your squad must escort a medical convoy through mountain Sector Alpha. Enemy jammers are active, causing radio delays, scrambled radar, and lost messages.',
    objective: 'Make sound decisions despite communication friction: cross-check facts with your team in chat before ordering troops to move forward.',
    duration: '5 Mins (Fast-Forward Available)',
    difficulty: 'Multi-Domain Friction',
    status: 'Ready (SIH Flagship)',
    events: [
      {
        id: 'sih-ev-1',
        time: '00:05',
        title: 'Forward Scout: Route Alpha Check',
        domain: 'LAND',
        type: 'info',
        confidence: '80%',
        content: 'Forward scout confirms Route Alpha is clear of enemy roadblocks. 80% confidence.',
        instructorNotes: 'Ground Truth: Route is clear. Land gets it immediately; Leader delayed 20s; Air gets blind spot warning; Cyber/EW dropped.',
        roleVariations: {
          team_leader: { deliveryBehavior: 'delayed', delaySeconds: 20, content: 'Forward scout reports Route Alpha is clear. Confidence 60% (Arrived with 20s delay).', confidence: '60%' },
          land_member: { deliveryBehavior: 'normal', delaySeconds: 0, content: 'Forward scout confirms Route Alpha is clear of enemy roadblocks. 80% confidence.', confidence: '80%' },
          air_member: { deliveryBehavior: 'incomplete', delaySeconds: 0, content: 'Forward scout reports Route Alpha clear [AIR RADAR BLIND SPOT - ROAD CROSSING UNVERIFIED]...', confidence: 'Partial' },
          cyber_ew_member: { deliveryBehavior: 'dropped', reason: 'Blocked by directional enemy radio jammer' }
        }
      },
      {
        id: 'sih-ev-2',
        time: '00:25',
        title: 'Drone Alert: Approaching Aircraft',
        domain: 'AIR',
        type: 'warning',
        confidence: '90%',
        content: 'Air radar detects 2 low-flying surveillance drones heading toward your squad at 140 knots.',
        instructorNotes: 'Ground Truth: Real physical drones. Air gets normal alert; Cyber/EW intercepts deceptive radio decoy; Land static.',
        roleVariations: {
          team_leader: { deliveryBehavior: 'delayed', delaySeconds: 30, content: 'Air alert received with 30s lag: 2 unidentified aircraft heading toward team position.', confidence: '75%' },
          land_member: { deliveryBehavior: 'incomplete', delaySeconds: 0, content: 'Air alert: low-flying objects [RADIO STATIC - FREQUENCY CUT OFF]...', confidence: 'Partial' },
          air_member: { deliveryBehavior: 'normal', delaySeconds: 0, content: 'Air radar detects 2 low-flying surveillance drones heading toward your squad at 140 knots. 90% confidence.', confidence: '90%' },
          cyber_ew_member: { deliveryBehavior: 'conflicting', delaySeconds: 0, content: 'Signals intercept: Enemy using electronic decoys! These may be fake radar blips, not real drones. 60% confidence.', confidence: '60%' }
        }
      },
      {
        id: 'sih-ev-3',
        time: '00:50',
        title: 'Enemy Jammer Hits Main Radio',
        domain: 'CYBER',
        type: 'alert',
        confidence: '95%',
        content: 'Enemy radio jammer active! Main satellite radio link is knocked out. Squad must use backup Team Chat.',
        instructorNotes: 'Ground Truth: Radio jammed. Cyber/EW knows immediately; Land & Air dropped; Leader delayed 25s.',
        roleVariations: {
          team_leader: { deliveryBehavior: 'delayed', delaySeconds: 25, content: 'Satellite radio link degraded. High communication lag expected across team channels.', confidence: '70%' },
          land_member: { deliveryBehavior: 'dropped', reason: 'Satellite uplink dropped before message delivery' },
          air_member: { deliveryBehavior: 'dropped', reason: 'Satellite uplink dropped before message delivery' },
          cyber_ew_member: { deliveryBehavior: 'normal', delaySeconds: 0, content: 'CRITICAL ALERT: Enemy jammer has knocked out main satellite radio! Use Team Chat to coordinate.', confidence: '95%' }
        }
      },
      {
        id: 'sih-ev-dp-1',
        time: '01:00',
        title: 'DECISION REQUIRED: Convoy Movement Directive',
        domain: 'JOINT',
        type: 'DECISION_REQUIRED',
        requiresDecision: true,
        targetRoles: ['team_leader'],
        targetRole: 'team_leader',
        deadlineSeconds: 90,
        confidence: '80%',
        decisionPrompt: 'Air radar reports unidentified drones while signals intercept warns of radar decoys. Satellite radio is jammed and Convoy Bravo is halted at Mile 44. As Team Leader, synthesize your squad reports and issue movement directive:',
        decisionOptions: [
          {
            id: 'opt-verify',
            label: 'Request Verification & hold Convoy Bravo in cover',
            nextBranch: 'branch_verify',
            consequence: {
              description: 'Squad holds in defilade while Cyber/EW filters false telemetry. Scout confirms enemy decoy beacons at Mile 44 and uncovers hidden ambush site on northern slope.',
              difficultyChange: 'Decreased (Tactical Advantage)',
              communicationConditions: {
                type: 'restore',
                target: 'all',
                note: 'Satellite link backup channel restored'
              },
              outcome: 'Favorable: Squad avoids ambush and identifies hostile decoys with zero friendly casualties.'
            }
          },
          {
            id: 'opt-advance',
            label: 'Advance Convoy Bravo immediately along Route Alpha',
            nextBranch: 'branch_advance',
            consequence: {
              description: 'Convoy moves forward blind without air coverage. At Mile 46, hostile RPG fire pins down lead vehicles. Intense electronic jamming blinds Land unit.',
              difficultyChange: 'Increased (High Friction)',
              communicationConditions: {
                type: 'dropout',
                target: 'land_member',
                severity: 'high',
                duration: 60,
                note: 'Hostile directional jamming cuts off Land unit'
              },
              outcome: 'Severe Friction: Lead vehicle disabled; squad pinned down under heavy radio jamming.'
            }
          },
          {
            id: 'opt-scout',
            label: 'Dispatch Land scout team for immediate visual check',
            nextBranch: 'branch_scout',
            consequence: {
              description: 'Scout team moves ahead on foot. Visual reconnaissance confirms enemy drone decoys on ridge at T+01:25. Mountain terrain causes RF shadow delay for Land team.',
              difficultyChange: 'Moderate',
              communicationConditions: {
                type: 'delay',
                target: 'land_member',
                severity: 'medium',
                duration: 45,
                note: 'Mountain ridge RF shielding causes 45s tactical telemetry delay'
              },
              outcome: 'Cautious Advance: Enemy decoys identified, but scout unit experiences 45s comm lag.'
            }
          },
          {
            id: 'opt-reroute',
            label: 'Reroute entire squad through alternate mountain corridor',
            nextBranch: 'branch_reroute',
            consequence: {
              description: 'Squad diverts through western mountain defile. Mountain passes cause heavy satellite link packet loss, but completely bypasses enemy ambush sector.',
              difficultyChange: 'Increased (Telemetry Loss)',
              communicationConditions: {
                type: 'incomplete',
                target: 'air_member',
                severity: 'high',
                duration: 60,
                note: 'Narrow canyon walls degrade aerial radar telemetry'
              },
              outcome: 'Safe Bypass with High Latency: Ambush bypassed, but squad loses air coordination for 60s.'
            }
          }
        ],
        content: 'TACTICAL DECISION REQUIRED: Review received field reports from Land, Air, and Cyber/EW and issue the convoy movement directive.',
        instructorNotes: 'Ground Truth: Real surveillance drones approaching, but enemy jammer active on Hill 52. Team Leader has only received delayed scout report and missing air telemetry.',
        roleVariations: {
          team_leader: { deliveryBehavior: 'normal', delaySeconds: 0, content: 'TACTICAL DECISION POINT: Evaluate your received intelligence and issue the Convoy Bravo movement directive.' },
          instructor: { deliveryBehavior: 'normal', delaySeconds: 0, content: 'Trainees prompted for Tactical Decision Point #1 (Convoy Movement Order).' }
        }
      },
      {
        id: 'sih-ev-4',
        time: '01:15',
        title: 'Supply Convoy Bravo Status',
        domain: 'EW',
        type: 'warning',
        confidence: '85%',
        content: 'Medical Convoy Bravo has temporarily stopped at Mile 44 due to a fallen tree blocking the road.',
        instructorNotes: 'Ground Truth: Convoy stopped by fallen tree. Land normal; Air camera sees conflicting movement; Leader missing location.',
        roleVariations: {
          team_leader: { deliveryBehavior: 'incomplete', delaySeconds: 0, content: 'Convoy Bravo [LOCATION CUT OFF] requesting escort assistance...', confidence: 'Partial' },
          land_member: { deliveryBehavior: 'normal', delaySeconds: 0, content: 'Convoy Bravo halted at Mile 44 due to a fallen tree. Clearing road now. 85% confidence.', confidence: '85%' },
          air_member: { deliveryBehavior: 'conflicting', delaySeconds: 0, content: 'Drone camera scan shows Convoy Bravo moving forward normally without stopping. 70% confidence.', confidence: '70%' },
          cyber_ew_member: { deliveryBehavior: 'normal', delaySeconds: 0, content: 'Emergency transponder beacon confirmed at Mile 44. Beacon validated.', confidence: '90%' }
        }
      },
      {
        id: 'sih-ev-bv-1',
        time: '01:25',
        title: 'UAV Telemetry: Ambush Coordinates Confirmed',
        domain: 'AIR',
        type: 'alert',
        branch: 'branch_verify',
        confidence: '95%',
        content: 'Additional UAV report arrives: thermal scans detect enemy anti-tank fire team lying in ambush at Mile 48. Convoy Bravo holding safely in defilade.',
        instructorNotes: 'Branch B (Verify): UAV confirms enemy ambush coordinates while squad holds safely in cover.',
        roleVariations: {
          team_leader: { deliveryBehavior: 'normal', delaySeconds: 0, content: 'High-altitude UAV confirms enemy ambush team at Mile 48. Convoy cover order verified effective.', confidence: '95%' },
          land_member: { deliveryBehavior: 'normal', delaySeconds: 0, content: 'UAV feed confirms enemy positions ahead at Mile 48. Hold defilade position.', confidence: '95%' },
          air_member: { deliveryBehavior: 'normal', delaySeconds: 0, content: 'Direct video downlink: thermal bloom of 4 hostile combatants detected at Mile 48 tree line.', confidence: '98%' },
          cyber_ew_member: { deliveryBehavior: 'normal', delaySeconds: 0, content: 'Enemy tactical radio intercept confirms squad halted out of their effective firing range.', confidence: '90%' }
        }
      },
      {
        id: 'sih-ev-ba-1',
        time: '01:25',
        title: 'CRITICAL ALERT: Convoy Under Heavy Fire',
        domain: 'LAND',
        type: 'alert',
        branch: 'branch_advance',
        confidence: '95%',
        content: 'Lead vehicle ambushed at Mile 46! Hostile RPG fire pins down squad in open valley corridor. Directional jammers deafen tactical mesh.',
        instructorNotes: 'Branch Advance: Blind rush into Sector Alpha leads directly into hostile kill zone.',
        roleVariations: {
          team_leader: { deliveryBehavior: 'delayed', delaySeconds: 20, content: 'Urgent distress: Convoy elements engaged under direct enemy rocket fire at Mile 46!', confidence: '90%' },
          land_member: { deliveryBehavior: 'normal', delaySeconds: 0, content: 'UNDER FIRE! Lead vehicle immobilized by RPG at Mile 46. Taking heavy machine gun fire!', confidence: '95%' },
          air_member: { deliveryBehavior: 'conflicting', delaySeconds: 0, content: 'Smoke obscuring Mile 46. Multiple muzzle flashes visible in valley floor.', confidence: '75%' },
          cyber_ew_member: { deliveryBehavior: 'incomplete', delaySeconds: 0, content: 'Emergency distress beacon [SIGNAL JAMMED] - Land unit beacon degraded...', confidence: 'Partial' }
        }
      },
      {
        id: 'sih-ev-bs-1',
        time: '01:25',
        title: 'Scout Recon: Hostile Decoy Transmitters Found',
        domain: 'LAND',
        type: 'info',
        branch: 'branch_scout',
        confidence: '90%',
        content: 'Scout team spots stationary radio decoy transmitters along Ridge 3. Enemy air radar blips confirmed as simulated decoys.',
        instructorNotes: 'Branch Scout: Foot patrol visually verifies electronic decoys.',
        roleVariations: {
          team_leader: { deliveryBehavior: 'delayed', delaySeconds: 25, content: 'Scout dispatch arrives late: Enemy using ground decoys to spoof aerial radar.', confidence: '80%' },
          land_member: { deliveryBehavior: 'normal', delaySeconds: 0, content: 'Visual contact confirmed: stationary radio decoys found on Ridge 3.', confidence: '90%' },
          air_member: { deliveryBehavior: 'normal', delaySeconds: 0, content: 'Land scout confirms radar anomalies are decoys. Air corridor cleared.', confidence: '85%' },
          cyber_ew_member: { deliveryBehavior: 'normal', delaySeconds: 0, content: 'Decoy broadcast frequencies logged and filtered from main receiver.', confidence: '95%' }
        }
      },
      {
        id: 'sih-ev-br-1',
        time: '01:25',
        title: 'Western Pass Defile Transit Initiated',
        domain: 'JOINT',
        type: 'info',
        branch: 'branch_reroute',
        confidence: '85%',
        content: 'Convoy successfully enters Western Mountain Pass. Terrain blocks enemy radar, though satellite link experiences heavy multipath reflection.',
        instructorNotes: 'Branch Reroute: Safe transit initiated through western corridor.',
        roleVariations: {
          team_leader: { deliveryBehavior: 'normal', delaySeconds: 0, content: 'Western Pass defile entered. Ambush zone successfully bypassed.', confidence: '85%' },
          land_member: { deliveryBehavior: 'normal', delaySeconds: 0, content: 'Western pass road is rough but passable. Convoy moving at 20 km/h.', confidence: '85%' },
          air_member: { deliveryBehavior: 'incomplete', delaySeconds: 0, content: 'High canyon walls [TELEMETRY PARTIAL] - aerial visual line-of-sight obstructed.', confidence: 'Partial' },
          cyber_ew_member: { deliveryBehavior: 'delayed', delaySeconds: 20, content: 'Western pass signal reflection causing 20s packet delay.', confidence: '75%' }
        }
      },
      {
        id: 'sih-ev-5',
        time: '01:45',
        title: 'Command Directive: Move to Extraction',
        domain: 'JOINT',
        type: 'info',
        confidence: '100%',
        content: 'Headquarters orders the entire team to advance to Extraction Point at 02:00. Verify all unit positions.',
        instructorNotes: 'Ground Truth: Advance order. Leader & Air on time; Land & Cyber/EW delayed by 30s.',
        roleVariations: {
          team_leader: { deliveryBehavior: 'normal', delaySeconds: 0, content: 'Headquarters orders advance to Extraction Point at 02:00. Verify all unit positions. 100% confidence.', confidence: '100%' },
          land_member: { deliveryBehavior: 'delayed', delaySeconds: 30, content: 'Advance order received with delay: timed for 02:00. Verify positions.', confidence: '80%' },
          air_member: { deliveryBehavior: 'normal', delaySeconds: 0, content: 'Headquarters orders advance to Extraction Point at 02:00. Air support aligned.', confidence: '90%' },
          cyber_ew_member: { deliveryBehavior: 'delayed', delaySeconds: 20, content: 'Advance order received with delay. Electronic clearance requested.', confidence: '85%' }
        }
      },
      {
        id: 'sih-ev-bv-2',
        time: '02:00',
        title: 'Counter-Jamming Strike Neutralizes Hill 52',
        domain: 'CYBER',
        type: 'info',
        branch: 'branch_verify',
        confidence: '95%',
        content: 'Precision electronic counter-strike knocks out enemy directional jammer on Hill 52. Full squad communications restored!',
        instructorNotes: 'Branch Verify: Signals team eliminates hostile jammer with zero casualties.',
        roleVariations: {
          team_leader: { deliveryBehavior: 'normal', delaySeconds: 0, content: 'Hostile jammer on Hill 52 disabled. Full squad communications and data links online.', confidence: '95%' },
          land_member: { deliveryBehavior: 'normal', delaySeconds: 0, content: 'Radio clarity restored. All squad tactical links loud and clear.', confidence: '95%' },
          air_member: { deliveryBehavior: 'normal', delaySeconds: 0, content: 'Air telemetry link back to 100% operational bandwidth.', confidence: '95%' },
          cyber_ew_member: { deliveryBehavior: 'normal', delaySeconds: 0, content: 'Electronic warfare sector clear. Hill 52 signal source eliminated.', confidence: '99%' }
        }
      },
      {
        id: 'sih-ev-ba-2',
        time: '02:00',
        title: 'Emergency Evacuation & Smoke Screen Ordered',
        domain: 'JOINT',
        type: 'alert',
        branch: 'branch_advance',
        confidence: '90%',
        content: 'Heavy casualties narrowly averted by deploying emergency thermal smoke screen. Convoy Bravo forced into tactical withdrawal.',
        instructorNotes: 'Branch Advance: Forced retreat under smoke cover.',
        roleVariations: {
          team_leader: { deliveryBehavior: 'normal', delaySeconds: 0, content: 'Tactical withdrawal ordered under smoke screen. Convoy Bravo vehicle 1 towed.', confidence: '85%' },
          land_member: { deliveryBehavior: 'normal', delaySeconds: 0, content: 'Smoke deployed. Covering fire enabled withdrawal from Mile 46 kill zone.', confidence: '90%' },
          air_member: { deliveryBehavior: 'normal', delaySeconds: 0, content: 'Air cover overhead tracking retreating hostile mortar unit.', confidence: '85%' },
          cyber_ew_member: { deliveryBehavior: 'delayed', delaySeconds: 25, content: 'Withdrawal coordinates confirmed with delay.', confidence: '80%' }
        }
      },
      {
        id: 'sih-ev-6',
        time: '02:15',
        title: 'Hostile Jammer Location Triangulated',
        domain: 'EW',
        type: 'warning',
        confidence: '85%',
        content: 'Signals Intelligence triangulates enemy radio jammer active on Hill 52.',
        instructorNotes: 'Ground Truth: Active jammer on Hill 52. Cyber/EW normal; Leader delayed; Land incomplete; Air dropped.',
        roleVariations: {
          team_leader: { deliveryBehavior: 'delayed', delaySeconds: 20, content: 'Enemy jammer localized on Hill 52. Caution advised along northern ridge.', confidence: '85%' },
          land_member: { deliveryBehavior: 'incomplete', delaySeconds: 0, content: 'Jammer active on [LOCATION CUT OFF] - maintain radio silence...', confidence: 'Partial' },
          air_member: { deliveryBehavior: 'dropped', reason: 'High-altitude signal blocked by jamming' },
          cyber_ew_member: { deliveryBehavior: 'normal', delaySeconds: 0, content: 'Signals Intelligence triangulates enemy radio jammer active on Hill 52. 95% confidence.', confidence: '95%' }
        }
      },
      {
        id: 'sih-ev-7',
        title: 'Extraction Zone Perimeter Check',
        time: '02:45',
        domain: 'LAND',
        type: 'info',
        confidence: '90%',
        content: 'Forward patrol confirms Extraction Zone perimeter is secure.',
        instructorNotes: 'Ground Truth: Extraction perimeter secure. Air reports conflicting movement.',
        roleVariations: {
          team_leader: { deliveryBehavior: 'normal', delaySeconds: 0, content: 'Forward patrol confirms Extraction Zone perimeter is secure. 90% confidence.', confidence: '90%' },
          land_member: { deliveryBehavior: 'normal', delaySeconds: 0, content: 'Forward patrol confirms Extraction Zone perimeter is secure. 90% confidence.', confidence: '90%' },
          air_member: { deliveryBehavior: 'conflicting', delaySeconds: 0, content: 'Aerial camera detects suspicious movement near northern edge of Extraction Zone. 65% confidence.', confidence: '65%' },
          cyber_ew_member: { deliveryBehavior: 'delayed', delaySeconds: 25, content: 'Perimeter check acknowledgement received with delay.', confidence: '80%' }
        }
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
        title: 'Request Verification',
        rationale: 'Telemetry experienced latency. Verified with Signals officer before changing unit formation.',
        timestamp: '2026-10-03T18:05:42Z',
        elapsedMinutes: 5,
        elapsedSeconds: 342,
        elapsedTimeFormatted: '05:42',
        confidence: '68%',
        confidencePercent: 68,
        submittedBy: 'Team Leader',
        submittedRole: 'team_leader',
        sourcesUsed: ['sih-ev-1', 'sih-ev-2'],
        evidenceSnapshot: {
          participant: { id: 'p-1', name: 'Team Leader', role: 'team_leader' },
          submittedAt: '2026-10-03T18:05:42Z',
          elapsedSeconds: 342,
          elapsedFormatted: '05:42',
          decision: 'Request Verification',
          confidence: 68,
          rationale: 'Telemetry experienced latency. Verified with Signals officer before changing unit formation.',
          sourcesUsed: ['sih-ev-1', 'sih-ev-2'],
          eventsAvailable: [
            { id: 'sih-ev-1', title: 'Initial Tactical Dispatch', deliveredTimeFormatted: '00:00', domain: 'JOINT', content: 'Joint Command orders forward unit alignment along Sector Bravo.' },
            { id: 'sih-ev-2', title: 'Signal Attenuation Warning', deliveredTimeFormatted: '05:00', domain: 'CYBER', content: 'RF jamming detected. Secondary satellite link experiencing 300-second latency.' }
          ],
          eventsDelayedOrDropped: [
            { id: 'sih-ev-3', title: 'RF Blackout (Dropped Dispatch)', status: 'DROPPED', domain: 'AIR', reason: 'RF Blackout - lost in jamming disruption' }
          ],
          channelState: { delaySec: 20, dropRate: 0.25, corrupted: false },
          availableMessages: [
            { senderName: 'Land Member', senderRole: 'land_member', text: 'Ground route looks clear on visual check.' }
          ],
          activeDisruptions: [
            { id: 'dis-1', target: 'team_leader', disruptionType: 'delay', severity: 'medium', duration: 60 }
          ],
          metrics: {
            responseTimeSec: 42,
            responseTimeFormatted: '42s',
            informationAvailabilityPct: 57,
            confidenceVsAvailabilityDelta: 11,
            sharedAwarenessPct: 62,
            sharedAwarenessScore: 62
          }
        }
      },
      {
        id: 'dec-sih-2',
        title: 'Hold Position at Sector Bravo Grid 44-B',
        rationale: 'Received conflicting Thermal Imagery Feed Bravo indicating route obstruction. Ordered hold until ground recon cross-verifies.',
        timestamp: '2026-10-03T18:28:00Z',
        elapsedMinutes: 28,
        elapsedSeconds: 1680,
        elapsedTimeFormatted: '28:00',
        confidence: '75%',
        confidencePercent: 75,
        submittedBy: 'Team Leader',
        submittedRole: 'team_leader',
        sourcesUsed: ['sih-ev-4', 'sih-ev-5'],
        evidenceSnapshot: {
          participant: { id: 'p-1', name: 'Team Leader', role: 'team_leader' },
          submittedAt: '2026-10-03T18:28:00Z',
          elapsedSeconds: 1680,
          elapsedFormatted: '28:00',
          decision: 'Hold Position at Sector Bravo Grid 44-B',
          confidence: 75,
          rationale: 'Received conflicting Thermal Imagery Feed Bravo indicating route obstruction. Ordered hold until ground recon cross-verifies.',
          sourcesUsed: ['sih-ev-4', 'sih-ev-5'],
          eventsAvailable: [
            { id: 'sih-ev-1', title: 'Initial Tactical Dispatch', deliveredTimeFormatted: '00:00', domain: 'JOINT', content: 'Joint Command orders forward unit alignment along Sector Bravo.' },
            { id: 'sih-ev-4', title: 'Forward Recon Update A', deliveredTimeFormatted: '18:00', domain: 'LAND', content: 'Reconnaissance Patrol Alpha reports Sector Bravo route clear.' },
            { id: 'sih-ev-5', title: 'Satellite Imagery Feed B (Conflicting)', deliveredTimeFormatted: '25:00', domain: 'AIR', content: 'Thermal imagery feed Bravo indicates heavy route obstruction at Sector Bravo grid 44-B.' }
          ],
          eventsDelayedOrDropped: [
            { id: 'sih-ev-3', title: 'RF Blackout (Dropped Dispatch)', status: 'DROPPED', domain: 'AIR', reason: 'RF Blackout - lost in jamming disruption' }
          ],
          channelState: { delaySec: 0, dropRate: 0, corrupted: false },
          availableMessages: [
            { senderName: 'Land Member', senderRole: 'land_member', text: 'Recon team reports route clear.' },
            { senderName: 'Air Member', senderRole: 'air_member', text: 'Thermal feed shows heavy obstruction!' }
          ],
          activeDisruptions: [],
          metrics: {
            responseTimeSec: 35,
            responseTimeFormatted: '35s',
            informationAvailabilityPct: 71,
            confidenceVsAvailabilityDelta: 4,
            sharedAwarenessPct: 78,
            sharedAwarenessScore: 78
          }
        }
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

// Vite exposes env vars via import.meta.env in the browser, not process.env.
const API_BASE_URL = (
  typeof import.meta !== 'undefined' && import.meta.env?.VITE_BACKEND_URL
    ? import.meta.env.VITE_BACKEND_URL
    : (typeof process !== 'undefined' && process.env?.VITE_BACKEND_URL)
      ? process.env.VITE_BACKEND_URL
      : 'http://localhost:4000'
) + '/api';


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

  fetchScenarios: async () => {
    if (typeof fetch !== 'undefined') {
      try {
        const res = await fetch(`${API_BASE_URL}/scenarios`);
        if (res.ok) {
          const list = await res.json();
          if (Array.isArray(list) && list.length > 0) {
            setItem(STORAGE_KEYS.SCENARIOS, JSON.stringify(list));
            return list;
          }
        }
      } catch (e) {}
    }
    return storageService.getScenarios();
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

  duplicateScenario: (scenarioId) => {
    const list = storageService.getScenarios();
    const source = list.find(s => s.id === scenarioId);
    if (!source) return list;
    const copy = {
      ...source,
      id: `scen-copy-${Date.now()}`,
      code: `SCEN-COPY-${Math.floor(100 + Math.random() * 900)}`,
      title: `Copy of ${source.title}`,
      createdAt: new Date().toISOString()
    };
    const updated = [copy, ...list];
    setItem(STORAGE_KEYS.SCENARIOS, JSON.stringify(updated));

    if (typeof fetch !== 'undefined') {
      fetch(`${API_BASE_URL}/scenarios`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(copy)
      }).catch(() => {});
    }

    return updated;
  },

  archiveScenario: (scenarioId) => {
    const list = storageService.getScenarios();
    const updated = list.filter(s => s.id !== scenarioId);
    setItem(STORAGE_KEYS.SCENARIOS, JSON.stringify(updated));

    if (typeof fetch !== 'undefined') {
      fetch(`${API_BASE_URL}/scenarios/${scenarioId}/archive`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' }
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
    const sessionCode = (sessionData.sessionCode || `FOG-${Math.floor(1000 + Math.random() * 9000)}`).toUpperCase();
    const creator = sessionData.creator || 'Trainee';
    const newSession = {
      id: sessionData.id || `sess-${Date.now()}`,
      sessionCode,
      createdAt: new Date().toISOString(),
      status: 'In Progress',
      participantCount: 1,
      isSample: false,
      participants: sessionData.participants || [
        { id: `p-${Date.now()}`, serviceId: creator, displayName: creator, role: 'team_leader', status: 'Online' }
      ],
      teamMessages: sessionData.teamMessages || [],
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

  fetchAARs: async () => {
    if (typeof fetch !== 'undefined') {
      try {
        const res = await fetch(`${API_BASE_URL}/aars`);
        if (res.ok) {
          const list = await res.json();
          if (Array.isArray(list) && list.length > 0) {
            setItem(STORAGE_KEYS.AARS, JSON.stringify(list));
            return list;
          }
        }
      } catch (e) {}
    }
    return storageService.getAARs();
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
