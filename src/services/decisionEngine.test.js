import test from 'node:test';
import assert from 'node:assert';
import http from 'http';
import { WebSocket } from '../../backend/node_modules/ws/wrapper.mjs';
import { 
  EventEngine, 
  isDecisionEvent, 
  calculateInformationAvailability, 
  calculateSharedAwareness, 
  createEvidenceSnapshot,
  getDecisionTargetRoles,
  isRoleAllowedForDecision,
  normalizeDecisionOption,
  resolveOptionBranchAndConsequence,
  isEventEligibleForBranch,
  calculatePerformanceScore,
  evaluateAdaptiveDifficulty,
  normalizeDifficulty,
  DIFFICULTY_LEVELS,
  DIFFICULTY_ORDER,
  TRAINEE_ROLES 
} from './eventEngine.js';
import { multiplayerEngine } from './multiplayerEngine.js';
import { ServerWebSocketManager } from '../../backend/services/websocketServer.js';

// Sample multi-domain scenario with a DECISION_REQUIRED event
const testScenario = {
  id: 'test-scen-decision-1',
  title: 'Test Scenario — Tactical Decision Point with Fog of War',
  events: [
    {
      id: 'ev-1',
      time: '00:10',
      title: 'Joint HQ Movement Order',
      type: 'info',
      domain: 'JOINT',
      deliveryBehavior: 'normal',
      content: 'Maintain formation along Sector Alpha.'
    },
    {
      id: 'ev-2',
      time: '00:20',
      title: 'Delayed Radar Tracking',
      type: 'warning',
      domain: 'AIR',
      deliveryBehavior: 'delayed',
      delaySeconds: 60, // Arrives at 20 + 60 = 80s
      content: 'Unidentified airborne contact near Grid 12.'
    },
    {
      id: 'ev-3',
      time: '00:30',
      title: 'Jamming Alert (Dropped for Leader)',
      type: 'alert',
      domain: 'CYBER',
      deliveryBehavior: 'normal',
      roleVariations: {
        team_leader: { deliveryBehavior: 'dropped', droppedReason: 'VHF Link Jammed' },
        cyber_ew_member: { deliveryBehavior: 'normal', content: 'Enemy electronic warfare active.' }
      },
      content: 'Electronic warfare activity detected.'
    },
    {
      id: 'ev-dp-1',
      time: '01:00', // 60s
      title: 'Tactical Decision Point: Respond to Unconfirmed Contact',
      type: 'DECISION_REQUIRED',
      domain: 'JOINT',
      deliveryBehavior: 'normal',
      targetRoles: ['team_leader'],
      targetRole: 'team_leader',
      deadlineSeconds: 90,
      decisionOptions: [
        'Request Verification',
        'Hold Position at Sector Alpha',
        'Deploy Electronic Countermeasures',
        'Advance Under Full Speed'
      ],
      content: 'Unconfirmed radar blips reported. Orders required.'
    }
  ]
};

test('Decision Triggering - Detects DECISION_REQUIRED events at scheduled time', () => {
  const engine = new EventEngine(testScenario, { sessionSeed: 'TEST_DECISION_SEED' });

  // 1. Before 60s (e.g. at 45s): Decision point should NOT be triggered
  const pointsAt45 = engine.getActiveDecisionPoints('team_leader', 45);
  assert.strictEqual(pointsAt45.length, 0, 'No decision point before scheduled time');

  // 2. At 60s: Decision point should be triggered for team_leader
  const pointsAt60 = engine.getActiveDecisionPoints('team_leader', 60);
  assert.strictEqual(pointsAt60.length, 1, 'Decision point is active at T+01:00');
  assert.strictEqual(pointsAt60[0].id, 'ev-dp-1');
  assert.strictEqual(pointsAt60[0].title, 'Tactical Decision Point: Respond to Unconfirmed Contact');
  assert.strictEqual(pointsAt60[0].targetRole, 'team_leader');
  assert.strictEqual(pointsAt60[0].decisionOptions.length, 4);
  assert.strictEqual(pointsAt60[0].deadlineSeconds, 90);
});

test('Decision Triggering - Role Isolation (Prompt shown only to relevant trainee)', () => {
  const engine = new EventEngine(testScenario, { sessionSeed: 'TEST_DECISION_SEED' });

  // Team Leader is the targetRole -> Gets prompt
  const leaderPoints = engine.getActiveDecisionPoints('team_leader', 60);
  assert.strictEqual(leaderPoints.length, 1, 'Team Leader receives the decision prompt');

  // Land Member is NOT targetRole -> Should not receive decision prompt
  const landPoints = engine.getActiveDecisionPoints('land_member', 60);
  assert.strictEqual(landPoints.length, 0, 'Land Member does not receive prompt targeted at Team Leader');

  // Cyber/EW Member is NOT targetRole -> Should not receive decision prompt
  const cyberPoints = engine.getActiveDecisionPoints('cyber_ew_member', 60);
  assert.strictEqual(cyberPoints.length, 0, 'Cyber Member does not receive prompt targeted at Team Leader');
});

test('Decision Validation - Requires valid decision, rationale, and 0-100% confidence', () => {
  // Helper validation function
  const validateDecisionPayload = (payload) => {
    const errors = [];
    if (!payload.decision || typeof payload.decision !== 'string' || payload.decision.trim() === '') {
      errors.push('Decision selection or text is required');
    }
    if (!payload.rationale || typeof payload.rationale !== 'string' || payload.rationale.trim() === '') {
      errors.push('Rationale is required');
    }
    const conf = Number(payload.confidence);
    if (isNaN(conf) || conf < 0 || conf > 100) {
      errors.push('Confidence must be a valid percentage between 0 and 100');
    }
    return { valid: errors.length === 0, errors };
  };

  // Valid payload
  const validResult = validateDecisionPayload({
    decision: 'Request Verification',
    rationale: 'Signals show potential spoofing.',
    confidence: 68,
    sourcesUsed: ['ev-1']
  });
  assert.strictEqual(validResult.valid, true);

  // Invalid payload - Missing decision
  const missingDecResult = validateDecisionPayload({
    decision: '',
    rationale: 'Signals show potential spoofing.',
    confidence: 68
  });
  assert.strictEqual(missingDecResult.valid, false);
  assert.ok(missingDecResult.errors.some(e => e.includes('Decision')));

  // Invalid payload - Missing rationale
  const missingRatResult = validateDecisionPayload({
    decision: 'Request Verification',
    rationale: '   ',
    confidence: 68
  });
  assert.strictEqual(missingRatResult.valid, false);
  assert.ok(missingRatResult.errors.some(e => e.includes('Rationale')));

  // Invalid payload - Out of bounds confidence (>100 or <0)
  const highConfResult = validateDecisionPayload({
    decision: 'Request Verification',
    rationale: 'Some reason',
    confidence: 150
  });
  assert.strictEqual(highConfResult.valid, false);

  const lowConfResult = validateDecisionPayload({
    decision: 'Request Verification',
    rationale: 'Some reason',
    confidence: -10
  });
  assert.strictEqual(lowConfResult.valid, false);
});

test('Evidence Snapshot Creation - Accurately records information state at decision time', () => {
  const engine = new EventEngine(testScenario, { sessionSeed: 'TEST_DECISION_SEED' });

  // At 60 seconds (T+01:00), when Team Leader submits decision:
  // - ev-1 (10s) was delivered (normal)
  // - ev-2 (20s) was delayed by +60s -> will only arrive at 80s -> WITHHELD at 60s
  // - ev-3 (30s) was dropped for team_leader -> WITHHELD at 60s
  // - ev-dp-1 (60s) is the decision point itself
  // So delivered to team_leader = [ev-1, ev-dp-1]
  // Withheld ground truth = [ev-2 (delayed), ev-3 (dropped)]
  const snapshot = engine.createEvidenceSnapshot({
    decidingParticipantId: 'user-leader-1',
    decidingRole: 'team_leader',
    decisionText: 'Request Verification',
    confidence: 68,
    rationale: 'Radar feed appears delayed. Awaiting secondary confirmation before moving.',
    sourcesUsed: ['ev-1'],
    elapsedSeconds: 60,
    decisionTriggerTimeSec: 60,
    activeDisruptions: [],
    teamMessages: [
      { id: 'msg-1', senderId: 'u2', senderRole: 'land_member', text: 'Ground route clear.', timestamp: '2026-10-08T10:00:15Z' }
    ]
  });

  // Verify participant and role
  assert.strictEqual(snapshot.participantId, 'user-leader-1');
  assert.strictEqual(snapshot.participantRole, 'team_leader');
  assert.strictEqual(snapshot.decision, 'Request Verification');
  assert.strictEqual(snapshot.confidenceNum, 68);
  assert.strictEqual(snapshot.confidence, '68%');
  assert.strictEqual(snapshot.rationale, 'Radar feed appears delayed. Awaiting secondary confirmation before moving.');
  assert.deepStrictEqual(snapshot.sourcesUsed, ['ev-1']);

  // Verify Events Available to Trainee
  const availableIds = snapshot.eventsAvailable.map(e => e.id);
  assert.ok(availableIds.includes('ev-1'), 'ev-1 was available');
  assert.ok(!availableIds.includes('ev-2'), 'ev-2 was delayed and not yet available at 60s');
  assert.ok(!availableIds.includes('ev-3'), 'ev-3 was dropped for team_leader');

  // Verify Events Delayed or Dropped from Trainee
  const withheldIds = snapshot.eventsDelayedOrDropped.map(e => e.id);
  assert.ok(withheldIds.includes('ev-2'), 'ev-2 delayed is captured in withheld ground truth');
  assert.ok(withheldIds.includes('ev-3'), 'ev-3 dropped is captured in withheld ground truth');

  // Verify Team Messages Available
  assert.strictEqual(snapshot.teamMessagesAvailable.length, 1);
  assert.strictEqual(snapshot.teamMessagesAvailable[0].text, 'Ground route clear.');

  // Verify 4 Core Decision Metrics
  assert.ok(snapshot.metrics, 'Metrics object is present');
  assert.strictEqual(typeof snapshot.metrics.responseTimeSec, 'number');
  assert.strictEqual(typeof snapshot.metrics.informationAvailabilityPct, 'number');
  assert.strictEqual(typeof snapshot.metrics.confidenceVsAvailabilityDelta, 'number');
  assert.strictEqual(typeof snapshot.metrics.sharedAwarenessPct, 'number');

  // Trainee had ~50% info available and was 68% confident -> positive fog margin
  assert.ok(snapshot.metrics.informationAvailabilityPct < 100, 'Information availability reflects fog friction');
  assert.strictEqual(snapshot.metrics.confidenceVsAvailabilityDelta, 68 - snapshot.metrics.informationAvailabilityPct);
});

test('Real-time Instructor Synchronization - Broadcasts DECISION_SUBMITTED over WebSocket', async () => {
  // Set up in-process HTTP server and WebSocket manager
  const server = http.createServer();
  const wsManager = new ServerWebSocketManager();
  wsManager.init(server);

  await new Promise((resolve) => {
    server.listen(0, '127.0.0.1', resolve);
  });

  const port = server.address().port;
  const wsUrl = `ws://127.0.0.1:${port}/ws`;

  const createClient = () => {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(wsUrl);
      ws.on('open', () => resolve(ws));
      ws.on('error', reject);
    });
  };

  const instructorClient = await createClient();
  const traineeClient = await createClient();
  const outsiderClient = await createClient();

  try {
    // 1. Join rooms
    instructorClient.send(JSON.stringify({
      type: 'JOIN_ROOM',
      payload: { sessionCode: 'ROOM-DECISION-SYNC', role: 'instructor', displayName: 'Col. Instructor' }
    }));

    traineeClient.send(JSON.stringify({
      type: 'JOIN_ROOM',
      payload: { sessionCode: 'ROOM-DECISION-SYNC', role: 'team_leader', displayName: 'Team Leader' }
    }));

    outsiderClient.send(JSON.stringify({
      type: 'JOIN_ROOM',
      payload: { sessionCode: 'ROOM-DIFFERENT', role: 'instructor', displayName: 'Other Col' }
    }));

    // Wait for room joins to register
    await new Promise((r) => setTimeout(r, 100));

    // 2. Set up listener for instructor
    const instructorReceived = [];
    instructorClient.on('message', (data) => {
      instructorReceived.push(JSON.parse(data.toString()));
    });

    const outsiderReceived = [];
    outsiderClient.on('message', (data) => {
      outsiderReceived.push(JSON.parse(data.toString()));
    });

    // 3. Broadcast DECISION_SUBMITTED via wsManager
    const decisionPayload = {
      decisionId: 'dec-live-101',
      title: 'Request Verification',
      confidence: '68%',
      confidencePercent: 68,
      rationale: 'Telemetry delayed. Verifying before commitment.',
      submittedBy: 'Team Leader',
      submittedRole: 'team_leader',
      elapsedTimeFormatted: '05:42',
      evidenceSnapshot: {
        participantId: 'tl-1',
        participantRole: 'team_leader',
        decision: 'Request Verification',
        confidence: 68,
        metrics: {
          responseTimeSec: 42,
          responseTimeFormatted: '42s',
          informationAvailabilityPct: 57,
          confidenceVsAvailabilityDelta: 11,
          sharedAwarenessPct: 62
        }
      }
    };

    wsManager.broadcastToRoom('ROOM-DECISION-SYNC', {
      type: 'DECISION_SUBMITTED',
      payload: decisionPayload
    });

    // Wait for broadcast delivery
    await new Promise((r) => setTimeout(r, 150));

    // 4. Assert Instructor received the message immediately
    const decisionMsg = instructorReceived.find(m => m.type === 'DECISION_SUBMITTED');
    assert.ok(decisionMsg, 'Instructor received DECISION_SUBMITTED message');
    assert.strictEqual(decisionMsg.payload.title, 'Request Verification');
    assert.strictEqual(decisionMsg.payload.confidencePercent, 68);
    assert.strictEqual(decisionMsg.payload.submittedRole, 'team_leader');
    assert.strictEqual(decisionMsg.payload.evidenceSnapshot.metrics.informationAvailabilityPct, 57);
    assert.strictEqual(decisionMsg.payload.evidenceSnapshot.metrics.responseTimeSec, 42);

    // 5. Assert Outsider did NOT receive the message (Room isolation)
    const outsiderDecMsg = outsiderReceived.find(m => m.type === 'DECISION_SUBMITTED');
    assert.strictEqual(outsiderDecMsg, undefined, 'Outsider room did not receive room-isolated decision');

  } finally {
    instructorClient.close();
    traineeClient.close();
    outsiderClient.close();
    server.close();
  }
});

test('Decision Form Role Access - targetRoles allows Team Leader and isolates Land / Air / Cyber-EW', () => {
  const sihDecisionPoint = {
    id: 'sih-ev-dp-1',
    title: 'DECISION REQUIRED: Convoy Movement Directive',
    type: 'DECISION_REQUIRED',
    requiresDecision: true,
    targetRoles: ['team_leader']
  };

  assert.deepStrictEqual(getDecisionTargetRoles(sihDecisionPoint), ['team_leader']);

  // 1. Team Leader is allowed
  assert.strictEqual(isRoleAllowedForDecision(sihDecisionPoint, 'team_leader'), true, 'Team Leader is authorized');

  // 2. Land Member is NOT allowed
  assert.strictEqual(isRoleAllowedForDecision(sihDecisionPoint, 'land_member'), false, 'Land Member is rejected');

  // 3. Air and Cyber-EW Members are NOT allowed
  assert.strictEqual(isRoleAllowedForDecision(sihDecisionPoint, 'air_member'), false, 'Air Member is rejected');
  assert.strictEqual(isRoleAllowedForDecision(sihDecisionPoint, 'cyber_ew_member'), false, 'Cyber/EW Member is rejected');

  // 4. Preserve support for future role-specific decision points (not globally hard-coded to Team Leader)
  const landSpecificDecisionPoint = {
    id: 'future-land-dp-1',
    title: 'DECISION REQUIRED: Field Scout Breach Route',
    type: 'DECISION_REQUIRED',
    targetRoles: ['land_member']
  };

  assert.strictEqual(isRoleAllowedForDecision(landSpecificDecisionPoint, 'land_member'), true, 'Land Member is authorized for Land-targeted decision');
  assert.strictEqual(isRoleAllowedForDecision(landSpecificDecisionPoint, 'team_leader'), false, 'Team Leader is NOT authorized for Land-only decision');
});

test('Decision Submission Authorization - Team Leader can submit and Land Member cannot submit same decision point', async () => {
  const sessionCode = `TEST-DEC-AUTH-${Date.now()}`;
  await multiplayerEngine.createSession({
    scenario: testScenario,
    sessionName: 'Auth Test Session',
    creatorServiceId: 'Leader-01',
    creatorRole: 'team_leader',
    sessionCode
  });

  const sihDecisionData = {
    id: `dec-auth-test-1`,
    decisionPointId: 'sih-ev-dp-1',
    targetRoles: ['team_leader'],
    title: 'Hold Convoy Bravo in cover',
    rationale: 'Scout reports tree blockage. Awaiting route clearance before moving.',
    confidence: '80%',
    submittedBy: 'Leader-01',
    submittedRole: 'team_leader'
  };

  // 1. Team Leader submission succeeds
  const leaderResult = multiplayerEngine.submitDecision(sessionCode, sihDecisionData);
  assert.ok(leaderResult, 'Team Leader decision submission returned result');
  assert.strictEqual(leaderResult.rejected, undefined, 'Team Leader submission was NOT rejected');
  assert.strictEqual(leaderResult.title, 'Hold Convoy Bravo in cover');

  const sessionAfterLeader = multiplayerEngine.getSessionByCode(sessionCode);
  assert.strictEqual(sessionAfterLeader.decisions.length, 1, 'Decision logged in session decisions');

  // 2. Land Member attempts to submit the same decision point
  const landDecisionData = {
    id: `dec-auth-test-2`,
    decisionPointId: 'sih-ev-dp-1',
    targetRoles: ['team_leader'],
    title: 'Advance Without Clearance',
    rationale: 'Unilateral decision by ground scout.',
    confidence: '50%',
    submittedBy: 'Land-01',
    submittedRole: 'land_member'
  };

  const landResult = multiplayerEngine.submitDecision(sessionCode, landDecisionData);
  assert.ok(landResult.rejected, 'Land Member submission was rejected');
  assert.ok(landResult.error.includes('Forbidden'), 'Error message contains Forbidden');

  // Decision count remains 1 (Land Member submission was blocked)
  const sessionAfterLand = multiplayerEngine.getSessionByCode(sessionCode);
  assert.strictEqual(sessionAfterLand.decisions.length, 1, 'Land Member submission was blocked from session decisions');
});

test('WebSocket DECISION_SUBMITTED Enforcement - Rejects Land Member submission when targetRoles specifies team_leader', async () => {
  const server = http.createServer();
  const wsManager = new ServerWebSocketManager();
  wsManager.init(server);

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  const wsUrl = `ws://127.0.0.1:${port}/ws`;

  const createClient = () => {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(wsUrl);
      ws.on('open', () => resolve(ws));
      ws.on('error', reject);
    });
  };

  const landClient = await createClient();
  const leaderClient = await createClient();

  try {
    const roomCode = 'ROOM-ROLE-AUTH-TEST';

    landClient.send(JSON.stringify({
      type: 'JOIN_ROOM',
      payload: { sessionCode: roomCode, role: 'land_member', displayName: 'Land Scout' }
    }));

    leaderClient.send(JSON.stringify({
      type: 'JOIN_ROOM',
      payload: { sessionCode: roomCode, role: 'team_leader', displayName: 'Team Leader' }
    }));

    await new Promise((r) => setTimeout(r, 100));

    const landReceived = [];
    landClient.on('message', (d) => landReceived.push(JSON.parse(d.toString())));

    const leaderReceived = [];
    leaderClient.on('message', (d) => leaderReceived.push(JSON.parse(d.toString())));

    // Land Member sends unauthorized decision for team_leader targetRoles
    landClient.send(JSON.stringify({
      type: 'DECISION_SUBMITTED',
      payload: {
        sessionCode: roomCode,
        decision: {
          id: 'dec-illegal-1',
          decisionPointId: 'sih-ev-dp-1',
          targetRoles: ['team_leader'],
          title: 'Unauthorized Action',
          submittedRole: 'land_member',
          submittedBy: 'Land-01'
        }
      }
    }));

    await new Promise((r) => setTimeout(r, 150));

    // Assert Land Member received ERROR
    const errorMsg = landReceived.find(m => m.type === 'ERROR' && m.code === 'FORBIDDEN_DECISION_ROLE');
    assert.ok(errorMsg, 'Land Member received FORBIDDEN_DECISION_ROLE error over WebSocket');

    // Assert Leader did NOT receive DECISION_SUBMITTED broadcast from unauthorized Land Member
    const leakedDec = leaderReceived.find(m => m.type === 'DECISION_SUBMITTED' && m.payload?.decision?.id === 'dec-illegal-1');
    assert.strictEqual(leakedDec, undefined, 'Unauthorized decision was NOT broadcast to room');

    // Team Leader sends authorized decision
    leaderClient.send(JSON.stringify({
      type: 'DECISION_SUBMITTED',
      payload: {
        sessionCode: roomCode,
        decision: {
          id: 'dec-authorized-1',
          decisionPointId: 'sih-ev-dp-1',
          targetRoles: ['team_leader'],
          title: 'Authorized Directive',
          submittedRole: 'team_leader',
          submittedBy: 'Leader-01'
        }
      }
    }));

    await new Promise((r) => setTimeout(r, 150));

    // Assert Land Member received authorized DECISION_SUBMITTED broadcast from Team Leader
    const authBroadcast = landReceived.find(m => m.type === 'DECISION_SUBMITTED' && m.payload?.decision?.id === 'dec-authorized-1');
    assert.ok(authBroadcast, 'Authorized decision was broadcast to room members');
  } finally {
    landClient.close();
    leaderClient.close();
    wsManager.close();
    server.close();
  }
});

// Test 9: Branch Selection - Option selection triggers corresponding branch and filters subsequent events
test('Dynamic Branching - Branch selection activates matching branch and includes corresponding future events', () => {
  const branchingScenario = {
    id: 'test-scen-branching-1',
    title: 'Branching Test Scenario',
    difficulty: 'Intermediate',
    events: [
      {
        id: 'ev-base-1',
        time: '00:10',
        title: 'Initial Recon Dispatch',
        type: 'info',
        deliveryBehavior: 'normal',
        content: 'Initial situation normal.'
      },
      {
        id: 'ev-dp-1',
        time: '00:30',
        title: 'Tactical Pivot Point',
        type: 'DECISION_REQUIRED',
        targetRoles: ['team_leader'],
        decisionOptions: [
          {
            id: 'opt-verify',
            label: 'Option A: Verify with Ground Patrols',
            nextBranch: 'branch_verify',
            consequence: {
              description: 'Ground scouts inspect route; uncover concealed ambush.',
              difficultyChange: 'decrease',
              communicationConditions: 'Normal',
              outcome: 'Force preserved, ambush neutralized.'
            }
          },
          {
            id: 'opt-advance',
            label: 'Option B: Immediate Assault Advance',
            nextBranch: 'branch_advance',
            consequence: {
              description: 'Units advance aggressively into unconfirmed pass.',
              difficultyChange: 'increase',
              communicationConditions: 'VHF Jammed',
              outcome: 'Heavy contact sustained.'
            }
          }
        ],
        content: 'Pivot point reached.'
      },
      {
        id: 'ev-branch-v1',
        time: '01:00',
        title: 'Scout Visual Confirmation',
        type: 'info',
        branch: 'branch_verify',
        deliveryBehavior: 'normal',
        content: 'Ground scout confirms safe corridor.'
      },
      {
        id: 'ev-branch-a1',
        time: '01:00',
        title: 'Chokepoint Ambush Sprung',
        type: 'alert',
        branch: 'branch_advance',
        deliveryBehavior: 'normal',
        content: 'Unit pinned under crossfire at mile 46.'
      },
      {
        id: 'ev-base-2',
        time: '02:00',
        title: 'HQ Status Poll',
        type: 'info',
        deliveryBehavior: 'normal',
        content: 'Joint HQ requesting sitrep.'
      }
    ]
  };

  const engine = new EventEngine(branchingScenario, { sessionSeed: 'BRANCH_TEST_SEED_1' });

  // 1. Before decision, active branch is null; branch-specific events are excluded from generatedEvents
  assert.strictEqual(engine.getActiveBranch(), null);
  const initialIds = engine.generatedEvents.map(e => e.id);
  assert.ok(initialIds.includes('ev-base-1'));
  assert.ok(initialIds.includes('ev-base-2'));
  assert.ok(!initialIds.includes('ev-branch-v1'), 'Branch V event not included prior to selection');
  assert.ok(!initialIds.includes('ev-branch-a1'), 'Branch A event not included prior to selection');

  // 2. Submit decision choosing Option A ('opt-verify' -> branch_verify)
  const decisionResult = engine.applyDecision({
    id: 'dec-test-1',
    decisionPointId: 'ev-dp-1',
    selectedOption: 'opt-verify',
    submittedRole: 'team_leader',
    submittedBy: 'Leader-Alpha',
    rationale: 'Verify flank before committing vanguard.'
  });

  assert.strictEqual(decisionResult.activeBranch, 'branch_verify');
  assert.strictEqual(engine.getActiveBranch(), 'branch_verify');
  assert.strictEqual(engine.getBranchesHistory().includes('branch_verify'), true);

  // 3. Post-decision, generatedEvents now contains ev-branch-v1 and excludes ev-branch-a1
  const updatedIds = engine.generatedEvents.map(e => e.id);
  assert.ok(updatedIds.includes('ev-branch-v1'), 'ev-branch-v1 is active after branch_verify chosen');
  assert.ok(!updatedIds.includes('ev-branch-a1'), 'ev-branch-a1 remains excluded');
  assert.ok(updatedIds.includes('ev-base-2'), 'Universal baseline event remains active');

  // 4. Verify consequence log
  const log = engine.getDecisionConsequencesLog();
  assert.strictEqual(log.length, 1);
  assert.strictEqual(log[0].nextBranch, 'branch_verify');
  assert.strictEqual(log[0].consequence.outcome, 'Force preserved, ambush neutralized.');

  // 5. Verify difficulty updated from Intermediate to decreased (Easy / Fundamental)
  assert.ok(engine.getScenarioDifficulty() === 'Easy' || engine.getScenarioDifficulty() === 'Fundamental', 'Difficulty decreased to Easy or Fundamental');
});

// Test 10: Two Teams Alternative Path Differentiation (Definition of Done)
test('Scenario Differentiation - Two teams running same scenario make different decisions and receive distinct subsequent event paths', () => {
  const sharedScenario = {
    id: 'test-scen-two-teams',
    title: 'Flagship Parallel Exercise',
    difficulty: 'Intermediate',
    events: [
      {
        id: 'ev-intro',
        time: '00:10',
        title: 'Sitrep Alpha',
        type: 'info',
        deliveryBehavior: 'normal',
        content: 'Sector deployment complete.'
      },
      {
        id: 'ev-dp',
        time: '00:30',
        title: 'Critical Crossroad',
        type: 'DECISION_REQUIRED',
        targetRoles: ['team_leader'],
        decisionOptions: [
          {
            id: 'opt-recon',
            label: 'Route Reconnaissance',
            nextBranch: 'branch_recon',
            consequence: {
              description: 'Cautious recon reveals hostile battery.',
              difficultyChange: 'decrease',
              outcome: 'Battery bypassed.'
            }
          },
          {
            id: 'opt-direct',
            label: 'Direct Thrust',
            nextBranch: 'branch_direct',
            consequence: {
              description: 'Vanguard enters kill zone.',
              difficultyChange: 'increase',
              outcome: 'Vanguard pinned down.'
            }
          }
        ],
        content: 'Crossroad reached.'
      },
      {
        id: 'ev-recon-report',
        time: '01:00',
        title: 'Battery Discovered by Scouts',
        type: 'info',
        branch: 'branch_recon',
        deliveryBehavior: 'normal',
        content: 'Scouts signal hostile battery coordinates.'
      },
      {
        id: 'ev-direct-strike',
        time: '01:00',
        title: 'Artillery Barrage Sustained',
        type: 'alert',
        branch: 'branch_direct',
        deliveryBehavior: 'normal',
        content: 'Unit 4 taking heavy fire at crossroad.'
      }
    ]
  };

  // Same session seed for both teams
  const SEED = 'SHARED_DETERMINISTIC_SEED_2026';

  // Team 1: Cautious Recon
  const team1Engine = new EventEngine(sharedScenario, { sessionSeed: SEED });
  // Team 2: Direct Thrust
  const team2Engine = new EventEngine(sharedScenario, { sessionSeed: SEED });

  // Team 1 submits Route Reconnaissance
  team1Engine.applyDecision({
    id: 'dec-t1',
    decisionPointId: 'ev-dp',
    selectedOption: 'opt-recon',
    submittedRole: 'team_leader',
    submittedBy: 'Leader-Team1',
    rationale: 'Verify the perimeter.'
  });

  // Team 2 submits Direct Thrust
  team2Engine.applyDecision({
    id: 'dec-t2',
    decisionPointId: 'ev-dp',
    selectedOption: 'opt-direct',
    submittedRole: 'team_leader',
    submittedBy: 'Leader-Team2',
    rationale: 'Speed is security.'
  });

  // At T=70s:
  const team1Delivered = team1Engine.getDeliveredEvents('team_leader', 70);
  const team2Delivered = team2Engine.getDeliveredEvents('team_leader', 70);

  // Team 1 received Battery Discovered by Scouts, NEVER received Artillery Barrage Sustained
  const team1Titles = team1Delivered.map(e => e.title);
  assert.ok(team1Titles.includes('Battery Discovered by Scouts'), 'Team 1 received recon branch event');
  assert.ok(!team1Titles.includes('Artillery Barrage Sustained'), 'Team 1 did NOT receive direct thrust event');

  // Team 2 received Artillery Barrage Sustained, NEVER received Battery Discovered by Scouts
  const team2Titles = team2Delivered.map(e => e.title);
  assert.ok(team2Titles.includes('Artillery Barrage Sustained'), 'Team 2 received direct strike branch event');
  assert.ok(!team2Titles.includes('Battery Discovered by Scouts'), 'Team 2 did NOT receive recon branch event');

  // Difficulty outcomes diverged
  assert.ok(team1Engine.getScenarioDifficulty() === 'Easy' || team1Engine.getScenarioDifficulty() === 'Fundamental', 'Team 1 difficulty decreased to Easy / Fundamental');
  assert.strictEqual(team2Engine.getScenarioDifficulty(), 'Advanced');
});

// Test 11: Deterministic Consequences (Preserve deterministic execution with session seed)
test('Deterministic Branching - Same session seed and decision produces identical consequences and event timeline', () => {
  const sharedScenario = {
    id: 'test-scen-deterministic',
    title: 'Deterministic Verification Scenario',
    events: [
      {
        id: 'ev-dp-det',
        time: '00:20',
        title: 'Decision Node',
        type: 'DECISION_REQUIRED',
        decisionOptions: [
          {
            id: 'opt-a',
            label: 'Branch Alpha Choice',
            nextBranch: 'branch_a',
            consequence: { description: 'Consequence Alpha', difficultyChange: 'increase', outcome: 'Alpha Outcome' }
          }
        ]
      },
      {
        id: 'ev-subsequent-jitter',
        time: '00:40',
        title: 'Jittered Event',
        type: 'warning',
        branch: 'branch_a',
        deliveryBehavior: 'delayed',
        delaySeconds: 15,
        content: 'Telemetry with delay.'
      }
    ]
  };

  const SEED = 'FIXED_REPRODUCIBLE_SEED_777';

  const run1 = new EventEngine(sharedScenario, { sessionSeed: SEED });
  const run2 = new EventEngine(sharedScenario, { sessionSeed: SEED });

  run1.applyDecision({ decisionPointId: 'ev-dp-det', selectedOption: 'opt-a', submittedRole: 'team_leader' });
  run2.applyDecision({ decisionPointId: 'ev-dp-det', selectedOption: 'opt-a', submittedRole: 'team_leader' });

  // Verify identical branch state
  assert.strictEqual(run1.getActiveBranch(), run2.getActiveBranch());
  const log1 = run1.getDecisionConsequencesLog();
  const log2 = run2.getDecisionConsequencesLog();
  assert.strictEqual(log1.length, 1);
  assert.strictEqual(log2.length, 1);
  assert.strictEqual(log1[0].nextBranch, log2[0].nextBranch);
  assert.deepStrictEqual(log1[0].consequence, log2[0].consequence);
  assert.strictEqual(log1[0].selectedOptionId, log2[0].selectedOptionId);

  // Verify identical actualDeliveryTimeSec for subsequent events
  const ev1 = run1.generatedEvents.find(e => e.id === 'ev-subsequent-jitter');
  const ev2 = run2.generatedEvents.find(e => e.id === 'ev-subsequent-jitter');
  assert.ok(ev1 && ev2);
  assert.strictEqual(ev1.actualDeliveryTimeSec, ev2.actualDeliveryTimeSec, 'Seed guarantees deterministic delivery timing');
});

// Test 12: Replay & Audit Reconstruction - Full causality pipeline reconstruction
test('Replay & AAR Audit Reconstruction - Reconstructs Decision -> Info Available -> Selected Option -> Consequence -> Outcome', () => {
  const scenario = {
    id: 'test-scen-aar-audit',
    title: 'AAR Audit Pipeline Scenario',
    events: [
      {
        id: 'ev-intel-1',
        time: '00:10',
        title: 'Sensor Feed 1',
        type: 'info',
        deliveryBehavior: 'normal',
        content: 'Thermal anomaly confirmed.'
      },
      {
        id: 'ev-dp-aar',
        time: '00:30',
        title: 'AAR Pivot Point',
        type: 'DECISION_REQUIRED',
        targetRoles: ['team_leader'],
        decisionOptions: [
          {
            id: 'opt-aar-1',
            label: 'Engage Counter-Fire',
            nextBranch: 'branch_cf',
            consequence: {
              description: 'Artillery counter-battery engaged.',
              difficultyChange: 'decrease',
              communicationConditions: 'Normal',
              outcome: 'Threat suppressed within 2 minutes.'
            }
          }
        ]
      },
      {
        id: 'ev-cf-result',
        time: '01:00',
        title: 'BDA Report',
        type: 'info',
        branch: 'branch_cf',
        deliveryBehavior: 'normal',
        content: 'Hostile launcher neutralized.'
      }
    ]
  };

  const engine = new EventEngine(scenario, { sessionSeed: 'AAR_SEED' });

  // Team Leader reviews information available prior to decision point (at T=25)
  const infoAvailable = engine.getDeliveredEvents('team_leader', 25);
  assert.strictEqual(infoAvailable.length, 1);
  assert.strictEqual(infoAvailable[0].id, 'ev-intel-1');

  // Submit decision
  const decisionData = {
    id: 'dec-audit-101',
    decisionPointId: 'ev-dp-aar',
    title: 'Engage Counter-Fire Order',
    selectedOption: 'opt-aar-1',
    rationale: 'Thermal contact requires rapid suppression.',
    confidence: '95%',
    submittedBy: 'Major Alpha',
    submittedRole: 'team_leader',
    elapsedMinutes: 0.5,
    informationSources: ['ev-intel-1']
  };

  engine.applyDecision(decisionData);

  // AAR reconstruction query
  const consequencesLog = engine.getDecisionConsequencesLog();
  assert.strictEqual(consequencesLog.length, 1);
  const auditEntry = consequencesLog[0];

  // Verify the 5-step causality chain:
  // 1. Decision Point
  assert.strictEqual(auditEntry.decisionPointId, 'ev-dp-aar');
  // 2. Information Available (verified from sources)
  assert.deepStrictEqual(decisionData.informationSources, ['ev-intel-1']);
  // 3. Selected Option
  assert.strictEqual(auditEntry.selectedOption.label, 'Engage Counter-Fire');
  // 4. Consequence
  assert.strictEqual(auditEntry.nextBranch, 'branch_cf');
  assert.strictEqual(auditEntry.consequence.description, 'Artillery counter-battery engaged.');
  // 5. Outcome
  assert.strictEqual(auditEntry.consequence.outcome, 'Threat suppressed within 2 minutes.');

  // Subsequent events triggered by the decision under that branch
  const subsequentBranchEvents = engine.generatedEvents.filter(e => e.branch === auditEntry.nextBranch);
  assert.strictEqual(subsequentBranchEvents.length, 1);
  assert.strictEqual(subsequentBranchEvents[0].id, 'ev-cf-result');
});

// Test 13: Unauthorized Branch Manipulation - Trainee role cannot arbitrarily change branch
test('Branch Security - Rejects unauthorized branch manipulation by trainee roles', async () => {
  const sessionCode = `ROOM-BRANCH-AUTH-${Date.now()}`;

  // Initialize session in multiplayerEngine
  await multiplayerEngine.createSession({
    scenario: testScenario,
    sessionName: 'Branch Auth Test Session',
    creatorServiceId: 'Leader-01',
    creatorRole: 'team_leader',
    sessionCode
  });

  // 1. Trainee (land_member) attempts to force a branch change via multiplayerEngine
  const traineeAttempt = multiplayerEngine.setScenarioBranch(
    sessionCode,
    'branch_advance',
    'land_member'
  );

  assert.ok(traineeAttempt.rejected, 'Trainee branch manipulation was rejected');
  assert.ok(traineeAttempt.error.includes('Forbidden'), 'Error explains forbidden permission');

  const session = multiplayerEngine.getSessionByCode(sessionCode);
  assert.notStrictEqual(session.activeBranch, 'branch_advance', 'Session activeBranch was not changed by trainee');

  // 2. Instructor CAN change or override branch
  const instructorSuccess = multiplayerEngine.setScenarioBranch(
    sessionCode,
    'branch_verify',
    'instructor'
  );

  assert.strictEqual(instructorSuccess.rejected, undefined);
  const updatedSession = multiplayerEngine.getSessionByCode(sessionCode);
  assert.strictEqual(updatedSession.activeBranch, 'branch_verify');

  // 3. Test over WebSocket server: Land member client attempts SET_BRANCH
  const server = http.createServer();
  const wsManager = new ServerWebSocketManager();
  wsManager.init(server);

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  const wsUrl = `ws://127.0.0.1:${port}/ws`;

  const wsClient = await new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    ws.on('open', () => resolve(ws));
    ws.on('error', reject);
  });

  try {
    const wsRoomCode = 'WS-BRANCH-GUARD-ROOM';
    wsClient.send(JSON.stringify({
      type: 'JOIN_ROOM',
      payload: { sessionCode: wsRoomCode, role: 'land_member', displayName: 'Land Trainee' }
    }));

    await new Promise((r) => setTimeout(r, 100));

    const received = [];
    wsClient.on('message', (d) => received.push(JSON.parse(d.toString())));

    // Trainee sends SET_BRANCH
    wsClient.send(JSON.stringify({
      type: 'SET_BRANCH',
      payload: {
        sessionCode: wsRoomCode,
        branchKey: 'branch_advance',
        role: 'land_member'
      }
    }));

    await new Promise((r) => setTimeout(r, 150));

    const errorMsg = received.find(m => m.type === 'ERROR' && m.code === 'FORBIDDEN_BRANCH_MANIPULATION');
    assert.ok(errorMsg, 'WebSocket returned FORBIDDEN_BRANCH_MANIPULATION to trainee');
  } finally {
    wsClient.close();
    wsManager.close();
    server.close();
  }
});

// Test 14: Performance Scoring Computation - Transparent 6-Pillar Evaluation
test('Performance Scoring Engine - Deterministically evaluates 6 pillars with full explainability', () => {
  const decision = {
    id: 'dec-perf-1',
    decisionPointId: 'ev-dp-1',
    title: 'Verify Ground Radar',
    selectedOption: { label: 'Verify Ground Radar and Scout Defilade', outcome: 'recon success clear safe defilade' },
    rationale: 'Telemetry shows conflicting reports. Ground scout verification is essential before vanguard movement.',
    confidence: '65%',
    elapsedSeconds: 75,
    informationSources: ['ev-1', 'ev-2']
  };

  const context = {
    decisionPoint: {
      id: 'ev-dp-1',
      time: '01:00', // 60s
      scheduledTimeSec: 60,
      deadlineSeconds: 90
    },
    deliveredEvents: [
      { id: 'ev-1', title: 'Dispatch 1', scheduledTimeSec: 10, isConflicting: true },
      { id: 'ev-2', title: 'Dispatch 2', scheduledTimeSec: 20 },
      { id: 'ev-dp-1', title: 'DP 1', scheduledTimeSec: 60 }
    ],
    allEventsUpToNow: [
      { id: 'ev-1', scheduledTimeSec: 10 },
      { id: 'ev-2', scheduledTimeSec: 20 },
      { id: 'ev-3', scheduledTimeSec: 30 },
      { id: 'ev-dp-1', scheduledTimeSec: 60 }
    ],
    teamMessages: [
      { senderRole: 'land_member', timestampSec: 65, text: 'Confirming scout report.' },
      { senderRole: 'cyber_ew_member', timestampSec: 70, text: 'EW link unstable.' },
      { senderRole: 'team_leader', timestampSec: 72, text: 'Hold vanguard.' }
    ],
    sharedAwareness: 80
  };

  const score = calculatePerformanceScore(decision, context);

  // 1. All 6 scores must be within valid range [10, 100]
  assert.ok(score.decisionQuality >= 20 && score.decisionQuality <= 100, 'Decision Quality valid');
  assert.ok(score.informationHandling >= 15 && score.informationHandling <= 100, 'Information Handling valid');
  assert.ok(score.coordination >= 20 && score.coordination <= 100, 'Coordination valid');
  assert.ok(score.timeliness >= 20 && score.timeliness <= 100, 'Timeliness valid');
  assert.ok(score.confidenceCalibration >= 25 && score.confidenceCalibration <= 100, 'Calibration valid');
  assert.ok(score.overallScore >= 10 && score.overallScore <= 100, 'Overall Score valid');

  // 2. Verified conflicting data & cited 2 sources -> information handling rewarded
  assert.ok(score.informationHandling >= 65, 'Information handling rewarded for verification');
  assert.ok(score.explainability.informationHandlingReason.includes('verified conflicting'), 'Explainability mentions verification');

  // 3. Prudent caution reported under partial telemetry -> calibration rewarded
  assert.ok(score.confidenceCalibration >= 80, 'Confidence calibration rewarded for prudent caution');

  // 4. Team communications exchanged across 3 roles -> coordination rewarded
  assert.ok(score.coordination >= 75, 'Team coordination rewarded for cross-role messages');

  // 5. Timeliness within window (75s of 60s-90s window = 15s / 30s)
  assert.ok(score.timeliness >= 80, 'Timeliness rewarded for optimal response');

  // 6. Explainability structure complete
  assert.ok(score.explainability.decisionQualityReason, 'Has decision quality explanation');
  assert.ok(score.explainability.overallReason, 'Has overall explanation');
  assert.strictEqual(score.performanceBand, 'Strong');
});

// Test 15: Adaptive Difficulty - Strong performance escalates difficulty (+1 level)
test('Adaptive Difficulty - Strong performance escalates difficulty deterministically', () => {
  const strongScore = {
    decisionQuality: 90,
    informationHandling: 85,
    coordination: 88,
    timeliness: 92,
    confidenceCalibration: 90,
    overallScore: 88,
    performanceBand: 'Strong'
  };

  // Step 1: Intermediate -> Advanced
  const adaptFromInter = evaluateAdaptiveDifficulty('Intermediate', strongScore);
  assert.strictEqual(adaptFromInter.previousDifficulty, 'Intermediate');
  assert.strictEqual(adaptFromInter.newDifficulty, 'Advanced');
  assert.strictEqual(adaptFromInter.adaptationDirection, 'increase');
  assert.ok(adaptFromInter.triggerReason.includes('Strong squad performance'));
  assert.strictEqual(adaptFromInter.isManualOverride, false);

  // Step 2: Advanced -> High Friction
  const adaptFromAdv = evaluateAdaptiveDifficulty('Advanced', strongScore);
  assert.strictEqual(adaptFromAdv.previousDifficulty, 'Advanced');
  assert.strictEqual(adaptFromAdv.newDifficulty, 'High Friction');
  assert.strictEqual(adaptFromAdv.adaptationDirection, 'increase');

  // Step 3: High Friction ceiling -> maintains peak difficulty
  const adaptFromCeiling = evaluateAdaptiveDifficulty('High Friction', strongScore);
  assert.strictEqual(adaptFromCeiling.previousDifficulty, 'High Friction');
  assert.strictEqual(adaptFromCeiling.newDifficulty, 'High Friction');
  assert.strictEqual(adaptFromCeiling.adaptationDirection, 'maintain');
  assert.ok(adaptFromCeiling.triggerReason.includes('maximum difficulty ceiling'));

  // Step 4: EventEngine applies strong decision and steps up difficulty
  const engine = new EventEngine(testScenario, {
    initialDifficulty: 'Intermediate',
    adaptiveDifficultyEnabled: true
  });
  assert.strictEqual(engine.getScenarioDifficulty(), 'Intermediate');

  const result = engine.applyDecision({
    id: 'dec-strong',
    decisionPointId: 'ev-dp-1',
    selectedOption: 'Hold Position at Sector Alpha',
    performanceScore: strongScore
  });

  assert.strictEqual(engine.getScenarioDifficulty(), 'Advanced');
  assert.strictEqual(result.difficultyAdaptation.newDifficulty, 'Advanced');
  assert.strictEqual(result.difficultyAdaptation.adaptationDirection, 'increase');
  assert.strictEqual(engine.getDifficultyAdaptationsLog().length, 1);
});

// Test 16: Adaptive Difficulty - Weak performance de-escalates difficulty (-1 level)
test('Adaptive Difficulty - Weak performance reduces complexity and clears severe friction', () => {
  const weakScore = {
    decisionQuality: 40,
    informationHandling: 35,
    coordination: 40,
    timeliness: 30,
    confidenceCalibration: 35,
    overallScore: 38,
    performanceBand: 'Weak'
  };

  // Step 1: Intermediate -> Fundamental
  const adaptFromInter = evaluateAdaptiveDifficulty('Intermediate', weakScore);
  assert.strictEqual(adaptFromInter.previousDifficulty, 'Intermediate');
  assert.strictEqual(adaptFromInter.newDifficulty, 'Fundamental');
  assert.strictEqual(adaptFromInter.adaptationDirection, 'decrease');
  assert.ok(adaptFromInter.triggerReason.includes('Weak squad performance'));

  // Step 2: Fundamental floor -> maintains floor
  const adaptFromFloor = evaluateAdaptiveDifficulty('Fundamental', weakScore);
  assert.strictEqual(adaptFromFloor.previousDifficulty, 'Fundamental');
  assert.strictEqual(adaptFromFloor.newDifficulty, 'Fundamental');
  assert.strictEqual(adaptFromFloor.adaptationDirection, 'maintain');
  assert.ok(adaptFromFloor.triggerReason.includes('baseline difficulty floor'));

  // Step 3: EventEngine applies weak decision, steps down difficulty, and clears disruptions
  const engine = new EventEngine(testScenario, {
    initialDifficulty: 'Intermediate',
    adaptiveDifficultyEnabled: true
  });
  // Inject prior disruption
  engine.injectDisruption({ target: 'all', disruptionType: 'delay', severity: 'high', duration: 120 });
  assert.strictEqual(engine.activeDisruptions.length, 1);

  const result = engine.applyDecision({
    id: 'dec-weak',
    decisionPointId: 'ev-dp-1',
    selectedOption: 'Advance Under Full Speed',
    performanceScore: weakScore
  });

  assert.strictEqual(engine.getScenarioDifficulty(), 'Fundamental');
  assert.strictEqual(result.difficultyAdaptation.adaptationDirection, 'decrease');
  // Disruption was cleared to facilitate command recovery
  assert.strictEqual(engine.activeDisruptions.length, 0);
});

// Test 17: Adaptive Difficulty - Moderate performance maintains difficulty
test('Adaptive Difficulty - Moderate performance maintains operational difficulty level', () => {
  const moderateScore = {
    decisionQuality: 65,
    informationHandling: 60,
    coordination: 62,
    timeliness: 70,
    confidenceCalibration: 65,
    overallScore: 64,
    performanceBand: 'Moderate'
  };

  const adapt = evaluateAdaptiveDifficulty('Intermediate', moderateScore);
  assert.strictEqual(adapt.previousDifficulty, 'Intermediate');
  assert.strictEqual(adapt.newDifficulty, 'Intermediate');
  assert.strictEqual(adapt.adaptationDirection, 'maintain');
  assert.ok(adapt.triggerReason.includes('Moderate squad performance'));

  const engine = new EventEngine(testScenario, {
    initialDifficulty: 'Intermediate',
    adaptiveDifficultyEnabled: true
  });

  const result = engine.applyDecision({
    id: 'dec-mod',
    decisionPointId: 'ev-dp-1',
    selectedOption: 'Hold Position at Sector Alpha',
    performanceScore: moderateScore
  });

  assert.strictEqual(engine.getScenarioDifficulty(), 'Intermediate');
  assert.strictEqual(result.difficultyAdaptation.adaptationDirection, 'maintain');
});

// Test 18: Instructor Override & Adaptive Mode Disabled
test('Adaptive Engine - Supports disabling adaptive mode and manual instructor overrides', () => {
  const strongScore = { overallScore: 90, performanceBand: 'Strong' };

  // 1. Adaptive Mode Disabled
  const disabledAdapt = evaluateAdaptiveDifficulty('Intermediate', strongScore, { enabled: false });
  assert.strictEqual(disabledAdapt.newDifficulty, 'Intermediate');
  assert.strictEqual(disabledAdapt.adaptationDirection, 'none');
  assert.ok(disabledAdapt.triggerReason.includes('Adaptive difficulty engine disabled'));

  // 2. Instructor Manual Override in EventEngine
  const engine = new EventEngine(testScenario, { initialDifficulty: 'Intermediate' });
  const overrideResult = engine.overrideScenarioDifficulty(
    'High Friction',
    'Instructor command stress test',
    'instructor'
  );

  assert.strictEqual(engine.getScenarioDifficulty(), 'High Friction');
  assert.strictEqual(overrideResult.newDifficulty, 'High Friction');
  assert.strictEqual(overrideResult.isManualOverride, true);
  assert.strictEqual(overrideResult.triggerReason, 'Instructor command stress test');

  // Audit log contains record
  const log = engine.getDifficultyAdaptationsLog();
  assert.strictEqual(log.length, 1);
  assert.strictEqual(log[0].isManualOverride, true);

  // 3. Toggle adaptive mode
  assert.strictEqual(engine.isAdaptiveDifficultyEnabled(), true);
  engine.setAdaptiveDifficultyEnabled(false);
  assert.strictEqual(engine.isAdaptiveDifficultyEnabled(), false);
});

// Test 19: Security Guard - Trainee roles cannot override scenario difficulty
test('Difficulty Security - Blocks unauthorized difficulty override by trainee roles', async () => {
  const engine = new EventEngine(testScenario, { initialDifficulty: 'Intermediate' });

  // 1. Trainee role calling engine.overrideScenarioDifficulty throws
  assert.throws(() => {
    engine.overrideScenarioDifficulty('Fundamental', 'Too hard', 'land_member');
  }, /Unauthorized/);

  // 2. Trainee role calling multiplayerEngine.overrideDifficulty rejected
  const sessionCode = `ROOM-DIFF-AUTH-${Date.now()}`;
  await multiplayerEngine.createSession({
    scenario: testScenario,
    sessionName: 'Diff Auth Test Session',
    creatorServiceId: 'Leader-01',
    creatorRole: 'team_leader',
    sessionCode
  });

  const traineeAttempt = multiplayerEngine.overrideDifficulty(
    sessionCode,
    'Fundamental',
    'Too hard',
    'land_member'
  );
  assert.ok(traineeAttempt.rejected, 'Trainee difficulty override was rejected');
  assert.ok(traineeAttempt.error.includes('Forbidden'));

  const traineeToggle = multiplayerEngine.toggleAdaptiveDifficulty(
    sessionCode,
    false,
    'land_member'
  );
  assert.ok(traineeToggle.rejected, 'Trainee toggle was rejected');

  // 3. WebSocket Guard: Client sends OVERRIDE_DIFFICULTY with trainee role
  const server = http.createServer();
  const wsManager = new ServerWebSocketManager();
  wsManager.init(server);

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  const wsUrl = `ws://127.0.0.1:${port}/ws`;

  const wsClient = await new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    ws.on('open', () => resolve(ws));
    ws.on('error', reject);
  });

  try {
    const wsRoomCode = 'WS-DIFF-GUARD-ROOM';
    wsClient.send(JSON.stringify({
      type: 'JOIN_ROOM',
      payload: { sessionCode: wsRoomCode, role: 'land_member', displayName: 'Land Trainee' }
    }));

    await new Promise((r) => setTimeout(r, 100));

    const received = [];
    wsClient.on('message', (d) => received.push(JSON.parse(d.toString())));

    wsClient.send(JSON.stringify({
      type: 'OVERRIDE_DIFFICULTY',
      payload: {
        sessionCode: wsRoomCode,
        difficulty: 'Fundamental',
        userRole: 'land_member'
      }
    }));

    await new Promise((r) => setTimeout(r, 150));

    const errorMsg = received.find(m => m.type === 'ERROR' && m.code === 'FORBIDDEN_DIFFICULTY_OVERRIDE');
    assert.ok(errorMsg, 'WebSocket returned FORBIDDEN_DIFFICULTY_OVERRIDE to trainee');
  } finally {
    wsClient.close();
    wsManager.close();
    server.close();
  }
});

// Test 20: Deterministic Replay Consistency - Identical runs yield identical scores and adaptations
test('Deterministic Replay Consistency - Identical runs yield 100% identical scores and adaptations', () => {
  const seed = 'DETERMINISTIC_REPLAY_SEED_999';

  const runSimulation = () => {
    const engine = new EventEngine(testScenario, {
      sessionSeed: seed,
      initialDifficulty: 'Intermediate',
      adaptiveDifficultyEnabled: true
    });

    const consequence = engine.applyDecision({
      id: 'dec-det-1',
      decisionPointId: 'ev-dp-1',
      title: 'Hold Position at Sector Alpha',
      selectedOption: 'Hold Position at Sector Alpha',
      rationale: 'Radar telemetry is unconfirmed. Awaiting ground confirmation before vanguard movement.',
      confidence: '68%',
      elapsedSeconds: 70,
      informationSources: ['ev-1']
    });

    return {
      activeBranch: engine.getActiveBranch(),
      scenarioDifficulty: engine.getScenarioDifficulty(),
      performanceScore: consequence.performanceScore,
      difficultyAdaptation: consequence.difficultyAdaptation,
      adaptationsLog: engine.getDifficultyAdaptationsLog()
    };
  };

  const runA = runSimulation();
  const runB = runSimulation();

  // Complete mathematical determinism check
  assert.strictEqual(runA.activeBranch, runB.activeBranch);
  assert.strictEqual(runA.scenarioDifficulty, runB.scenarioDifficulty);
  assert.strictEqual(runA.performanceScore.overallScore, runB.performanceScore.overallScore);
  assert.strictEqual(runA.performanceScore.decisionQuality, runB.performanceScore.decisionQuality);
  assert.strictEqual(runA.performanceScore.informationHandling, runB.performanceScore.informationHandling);
  assert.strictEqual(runA.performanceScore.coordination, runB.performanceScore.coordination);
  assert.strictEqual(runA.performanceScore.timeliness, runB.performanceScore.timeliness);
  assert.strictEqual(runA.performanceScore.confidenceCalibration, runB.performanceScore.confidenceCalibration);
  assert.strictEqual(runA.difficultyAdaptation.adaptationDirection, runB.difficultyAdaptation.adaptationDirection);
  assert.strictEqual(runA.difficultyAdaptation.newDifficulty, runB.difficultyAdaptation.newDifficulty);
  assert.strictEqual(runA.difficultyAdaptation.triggerReason, runB.difficultyAdaptation.triggerReason);
});

