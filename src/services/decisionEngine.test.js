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
  TRAINEE_ROLES 
} from './eventEngine.js';
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
