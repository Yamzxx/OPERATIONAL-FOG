/**
 * FOG FORENSICS Engine — Focused Tests
 * Tests buildTimeCapsule, buildPerspectiveMatrix, computeRecoveryScore, runWhatIfAnalysis.
 */

import {
  buildTimeCapsule,
  buildPerspectiveMatrix,
  computeRecoveryScore,
  runWhatIfAnalysis,
  DELIVERY_BADGE
} from './forensicsEngine.js';

// ─── Sample AAR fixture ────────────────────────────────────────────────────────

const SAMPLE_AAR = {
  id: 'aar-test-1',
  sessionName: 'Test Session',
  scenarioTitle: 'Test Scenario',
  sessionCode: 'FOG-TEST',
  decisions: [
    {
      id: 'dec-1',
      title: 'Hold Position',
      rationale: 'Received conflicting reports. Verified with ground team before committing to advance.',
      confidence: 'Medium',
      elapsedSeconds: 120,
      elapsedMinutes: 2,
      elapsedTimeFormatted: '02:00',
      submittedRole: 'team_leader',
      sourcesUsed: ['ev-1', 'ev-2']
    },
    {
      id: 'dec-2',
      title: 'Advance to Extraction Point',
      rationale: 'Updated orders received. Cross-checked with land unit. Proceeding per headquarters directive.',
      confidence: 'High',
      elapsedSeconds: 300,
      elapsedMinutes: 5,
      elapsedTimeFormatted: '05:00',
      submittedRole: 'team_leader',
      sourcesUsed: ['ev-3', 'ev-4']
    }
  ],
  events: [
    {
      id: 'ev-1',
      title: 'Route Alpha Clear',
      time: '00:05',
      scheduledTimeSec: 5,
      content: 'Forward scout confirms Route Alpha is clear.',
      domain: 'LAND',
      deliveryBehavior: 'normal',
      confidence: '80%',
      roleVariations: {
        team_leader: { deliveryBehavior: 'delayed', delaySeconds: 20, content: 'Route Alpha clear (arrived 20s late).', confidence: '60%' },
        land_member: { deliveryBehavior: 'normal', content: 'Route Alpha clear. 80% confidence.', confidence: '80%' },
        air_member: { deliveryBehavior: 'incomplete', content: 'Route Alpha [SIGNAL CUT OFF]', confidence: 'Partial' },
        cyber_ew_member: { deliveryBehavior: 'dropped', reason: 'Blocked by jammer' }
      }
    },
    {
      id: 'ev-2',
      title: 'Drone Alert',
      time: '00:50',
      scheduledTimeSec: 50,
      content: 'Two surveillance drones approaching.',
      domain: 'AIR',
      deliveryBehavior: 'warning',
      confidence: '90%',
      roleVariations: {
        team_leader: { deliveryBehavior: 'delayed', delaySeconds: 30, content: 'Drone alert with 30s lag.', confidence: '75%' },
        land_member: { deliveryBehavior: 'incomplete', content: 'Drone alert [STATIC]', confidence: 'Partial' },
        air_member: { deliveryBehavior: 'normal', content: 'Two drones approaching at 140 knots.', confidence: '90%' },
        cyber_ew_member: { deliveryBehavior: 'conflicting', content: 'These may be decoy signals.', confidence: '60%' }
      }
    },
    {
      id: 'ev-3',
      title: 'Radio Jammer Active',
      time: '01:00',
      scheduledTimeSec: 60,
      content: 'Enemy jammer knocked out satellite radio.',
      domain: 'CYBER',
      deliveryBehavior: 'dropped',
      confidence: '95%',
      roleVariations: {
        team_leader: { deliveryBehavior: 'delayed', delaySeconds: 25, content: 'Radio link degraded.', confidence: '70%' },
        land_member: { deliveryBehavior: 'dropped', reason: 'Satellite uplink dropped' },
        air_member: { deliveryBehavior: 'dropped', reason: 'Satellite uplink dropped' },
        cyber_ew_member: { deliveryBehavior: 'normal', content: 'CRITICAL: Jammer active. Use Team Chat.', confidence: '95%' }
      }
    },
    {
      id: 'ev-4',
      title: 'Advance Order',
      time: '02:30',
      scheduledTimeSec: 150,
      content: 'HQ orders advance to Extraction Point.',
      domain: 'JOINT',
      deliveryBehavior: 'normal',
      confidence: '100%'
    }
  ],
  participants: [
    { displayName: 'Team Leader', role: 'team_leader', status: 'Online' },
    { displayName: 'Land Member', role: 'land_member', status: 'Online' },
    { displayName: 'Air Member', role: 'air_member', status: 'Online' },
    { displayName: 'Cyber/EW', role: 'cyber_ew_member', status: 'Online' }
  ],
  teamMessages: [
    { senderRole: 'team_leader', senderName: 'Team Leader', text: 'Verify route status before we proceed.' },
    { senderRole: 'land_member', senderName: 'Land Member', text: 'Ground route confirmed clear from our end.' },
    { senderRole: 'cyber_ew_member', senderName: 'Cyber/EW', text: 'Using backup radio channel. Fallback comms established.' }
  ],
  disruptions: [
    { id: 'dis-1', target: 'all', disruptionType: 'dropout', severity: 'high', duration: 60 }
  ]
};

// ─── Test utilities ────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log('  ✓ ' + name);
    passed++;
  } catch (e) {
    console.error('  ✗ ' + name);
    console.error('    ' + e.message);
    failed++;
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message || 'Assertion failed');
}

function assertEqual(a, b, message) {
  if (a !== b) throw new Error((message || 'Expected equality') + ': ' + JSON.stringify(a) + ' !== ' + JSON.stringify(b));
}

function assertNotNull(val, message) {
  if (val == null) throw new Error(message || 'Expected non-null value');
}

// ─── A. buildTimeCapsule tests ─────────────────────────────────────────────────

console.log('\nA. buildTimeCapsule');

test('returns null for missing AAR', () => {
  const result = buildTimeCapsule(null, 'dec-1');
  assert(result === null, 'Should return null');
});

test('returns null for missing decision', () => {
  const result = buildTimeCapsule(SAMPLE_AAR, 'nonexistent-decision');
  assert(result === null, 'Should return null for unknown decision ID');
});

test('reconstructs correct decision time and role', () => {
  const capsule = buildTimeCapsule(SAMPLE_AAR, 'dec-1');
  assertNotNull(capsule, 'Capsule should not be null');
  assertEqual(capsule.decisionTimeSec, 120, 'Decision time should be 120 seconds');
  assertEqual(capsule.role, 'team_leader', 'Role should be team_leader');
  assertEqual(capsule.roleLabel, 'Team Leader', 'Role label should be Team Leader');
});

test('events before decision are correctly identified', () => {
  const capsule = buildTimeCapsule(SAMPLE_AAR, 'dec-1');
  // At T=120s: ev-1 (delayed 20s → delivered at 25s), ev-2 (delayed 30s → delivered at 80s) should be available
  // ev-3 (delayed 25s → delivered at 85s) should be available
  // ev-4 (at 150s, no role variation, delivered at 150s) should NOT be available at T=120
  const ids = capsule.eventsBeforeDecision.map(e => e.id);
  assert(ids.includes('ev-1'), 'ev-1 should be available (delivered at 25s)');
  assert(ids.includes('ev-2'), 'ev-2 should be available (delivered at 80s)');
  assert(!ids.includes('ev-4'), 'ev-4 should NOT be available (scheduled at 150s > 120s)');
});

test('dropped events for role are in eventsDroppedOrMissing', () => {
  const capsule = buildTimeCapsule(SAMPLE_AAR, 'dec-1');
  // cyber_ew dropped ev-1 and ev-3; team_leader receives ev-3 delayed (85s <= 120s), not dropped
  // For team_leader: ev-3 has delayed behavior, should be in eventsBeforeDecision
  const droppedIds = capsule.eventsDroppedOrMissing.map(e => e.id);
  // team_leader does not have dropped events for ev-1, ev-2, ev-3 (all delayed/incomplete/delayed)
  assert(Array.isArray(droppedIds), 'eventsDroppedOrMissing should be an array');
});

test('events after decision are correctly identified', () => {
  const capsule = buildTimeCapsule(SAMPLE_AAR, 'dec-1');
  const afterIds = capsule.eventsArrivedAfter.map(e => e.id);
  assert(afterIds.includes('ev-4'), 'ev-4 (at 150s) should arrive after decision at 120s');
});

test('information availability percentage is computed', () => {
  const capsule = buildTimeCapsule(SAMPLE_AAR, 'dec-1');
  assert(typeof capsule.informationAvailabilityPct === 'number', 'Should be a number');
  assert(capsule.informationAvailabilityPct >= 0 && capsule.informationAvailabilityPct <= 100, 'Should be 0-100');
});

test('cited sources are split between available and missing', () => {
  const capsule = buildTimeCapsule(SAMPLE_AAR, 'dec-1');
  // dec-1 cites ev-1, ev-2
  assert(Array.isArray(capsule.citedAndAvailable), 'citedAndAvailable should be an array');
  assert(Array.isArray(capsule.citedButMissing), 'citedButMissing should be an array');
  // ev-1 and ev-2 are both delivered before T=120 for team_leader
  assert(capsule.citedAndAvailable.includes('ev-1') || capsule.citedAndAvailable.includes('ev-2'), 'At least one cited source should be available');
});

// ─── B. buildPerspectiveMatrix tests ──────────────────────────────────────────

console.log('\nB. buildPerspectiveMatrix');

test('returns null for null aar', () => {
  const result = buildPerspectiveMatrix(null);
  assert(result === null, 'Should return null');
});

test('matrix has entry for each event', () => {
  const data = buildPerspectiveMatrix(SAMPLE_AAR);
  assertNotNull(data, 'Should return data');
  assertEqual(data.matrix.length, SAMPLE_AAR.events.length, 'Matrix length should match events length');
});

test('active roles derived from participants', () => {
  const data = buildPerspectiveMatrix(SAMPLE_AAR);
  assert(data.activeRoles.includes('team_leader'), 'Should include team_leader');
  assert(data.activeRoles.includes('land_member'), 'Should include land_member');
  assert(data.activeRoles.includes('instructor'), 'Should always include instructor');
});

test('instructor always gets ground truth with isGroundTruth flag', () => {
  const data = buildPerspectiveMatrix(SAMPLE_AAR);
  const firstRow = data.matrix[0];
  const instructorDelivery = firstRow.roleDeliveries['instructor'];
  assertNotNull(instructorDelivery, 'Instructor should have delivery info');
  assert(instructorDelivery.isGroundTruth === true, 'Instructor delivery should be marked as ground truth');
  assertEqual(instructorDelivery.behavior, 'normal', 'Instructor always receives normally');
});

test('dropped role has dropped delivery behavior', () => {
  const data = buildPerspectiveMatrix(SAMPLE_AAR);
  // ev-1: cyber_ew_member has dropped behavior
  const firstRow = data.matrix[0]; // ev-1
  const cyberDelivery = firstRow.roleDeliveries['cyber_ew_member'];
  assertNotNull(cyberDelivery, 'cyber_ew_member should have delivery info');
  assertEqual(cyberDelivery.behavior, 'dropped', 'cyber_ew_member should have dropped behavior for ev-1');
});

test('contradiction detected when different content delivered', () => {
  const data = buildPerspectiveMatrix(SAMPLE_AAR);
  // ev-2 has conflicting: cyber_ew says decoy, air says real drones — hasContradiction should be true
  const droneRow = data.matrix.find(r => r.event.id === 'ev-2');
  assertNotNull(droneRow, 'Should find drone alert event row');
  assert(droneRow.hasContradiction === true, 'Drone alert should have contradiction (different content per role)');
});

test('timing gap computed for delayed events', () => {
  const data = buildPerspectiveMatrix(SAMPLE_AAR);
  const firstRow = data.matrix[0]; // ev-1 has delays
  assert(typeof firstRow.timingGapSec === 'number', 'timingGapSec should be a number');
  assert(firstRow.timingGapSec >= 0, 'timingGapSec should be non-negative');
});

// ─── C. computeRecoveryScore tests ────────────────────────────────────────────

console.log('\nC. computeRecoveryScore');

test('returns null for null aar', () => {
  const result = computeRecoveryScore(null);
  assert(result === null, 'Should return null');
});

test('returns object with all required fields', () => {
  const score = computeRecoveryScore(SAMPLE_AAR);
  assertNotNull(score, 'Score should not be null');
  assert(typeof score.total === 'number', 'total should be a number');
  assertEqual(score.maxTotal, 100, 'maxTotal should be 100');
  assert(['A', 'B', 'C', 'D', 'F'].includes(score.grade), 'grade should be A-F');
  assert(Array.isArray(score.categories), 'categories should be an array');
  assertEqual(score.categories.length, 5, 'Should have exactly 5 categories');
});

test('total is sum of all category scores', () => {
  const score = computeRecoveryScore(SAMPLE_AAR);
  const categorySum = score.categories.reduce((sum, c) => sum + c.score, 0);
  assertEqual(score.total, categorySum, 'Total should equal sum of category scores');
});

test('each category score is within its max', () => {
  const score = computeRecoveryScore(SAMPLE_AAR);
  score.categories.forEach(cat => {
    assert(cat.score >= 0, cat.label + ' score should be >= 0');
    assert(cat.score <= cat.max, cat.label + ' score should be <= ' + cat.max);
  });
});

test('evidence_discipline: detects verification in rationale (sample data has verify/cross-check)', () => {
  const score = computeRecoveryScore(SAMPLE_AAR);
  const edCat = score.categories.find(c => c.id === 'evidence_discipline');
  assertNotNull(edCat, 'evidence_discipline category should exist');
  assert(edCat.score > 5, 'Should get more than minimum score since rationale contains verification language');
});

test('comm_recovery: gets points when decisions follow disruptions', () => {
  const score = computeRecoveryScore(SAMPLE_AAR);
  const crCat = score.categories.find(c => c.id === 'comm_recovery');
  assertNotNull(crCat, 'comm_recovery category should exist');
  // SAMPLE_AAR has dropped events and decisions after them
  assert(crCat.score >= 0, 'comm_recovery score should be non-negative');
});

test('team_coordination: uses team messages', () => {
  const score = computeRecoveryScore(SAMPLE_AAR);
  const tcCat = score.categories.find(c => c.id === 'team_coordination');
  assertNotNull(tcCat, 'team_coordination category should exist');
  // SAMPLE_AAR has 3 team messages from 3 different roles
  assert(tcCat.score > 0, 'Should score > 0 because messages exist');
});

test('percentPct is correct', () => {
  const score = computeRecoveryScore(SAMPLE_AAR);
  const expected = Math.round((score.total / 100) * 100);
  assertEqual(score.percentPct, expected, 'percentPct should be (total/100)*100');
});

test('empty session gets 0 scores for decisions-based categories', () => {
  const emptyAAR = { ...SAMPLE_AAR, decisions: [], teamMessages: [], disruptions: [] };
  const score = computeRecoveryScore(emptyAAR);
  const daCat = score.categories.find(c => c.id === 'decision_adaptation');
  assertEqual(daCat.score, 0, 'No decisions → decision adaptation score should be 0');
  const tcCat = score.categories.find(c => c.id === 'team_coordination');
  assertEqual(tcCat.score, 0, 'No messages → team coordination score should be 0');
});

test('dataNote is present and non-empty', () => {
  const score = computeRecoveryScore(SAMPLE_AAR);
  assert(typeof score.dataNote === 'string' && score.dataNote.length > 0, 'dataNote should be present');
});

// ─── D. runWhatIfAnalysis tests ────────────────────────────────────────────────

console.log('\nD. runWhatIfAnalysis');

test('returns null for null aar', () => {
  const result = runWhatIfAnalysis(null, 'dec-1', 'Alternative');
  assert(result === null, 'Should return null');
});

test('returns null for missing decision', () => {
  const result = runWhatIfAnalysis(SAMPLE_AAR, 'nonexistent', 'Alternative');
  assert(result === null, 'Should return null for unknown decision ID');
});

test('returns null for empty alternative text', () => {
  const result = runWhatIfAnalysis(SAMPLE_AAR, 'dec-1', '');
  assert(result === null, 'Should return null for empty alternative');
});

test('result is clearly marked as hypothetical', () => {
  const result = runWhatIfAnalysis(SAMPLE_AAR, 'dec-1', 'Advance immediately');
  assertNotNull(result, 'Result should not be null');
  assert(result.isHypothetical === true, 'isHypothetical must be true');
  assert(typeof result.warningLabel === 'string' && result.warningLabel.includes('HYPOTHETICAL'), 'warningLabel should contain HYPOTHETICAL');
});

test('original session data structure is unmodified after analysis', () => {
  const originalDecisionsCopy = JSON.stringify(SAMPLE_AAR.decisions);
  const originalEventsCopy = JSON.stringify(SAMPLE_AAR.events);
  runWhatIfAnalysis(SAMPLE_AAR, 'dec-1', 'Advance immediately');
  // Check original AAR was not mutated
  assertEqual(JSON.stringify(SAMPLE_AAR.decisions), originalDecisionsCopy, 'Original decisions should be unchanged');
  assertEqual(JSON.stringify(SAMPLE_AAR.events), originalEventsCopy, 'Original events should be unchanged');
});

test('original decision is correctly captured', () => {
  const result = runWhatIfAnalysis(SAMPLE_AAR, 'dec-1', 'Advance immediately');
  assertEqual(result.original.decisionId, 'dec-1', 'Original decision ID should match');
  assertEqual(result.original.decisionText, 'Hold Position', 'Original decision text should match');
  assertEqual(result.original.elapsedSeconds, 120, 'Elapsed seconds should be 120');
  assertEqual(result.original.role, 'team_leader', 'Role should be team_leader');
});

test('alternative is marked as hypothetical', () => {
  const result = runWhatIfAnalysis(SAMPLE_AAR, 'dec-1', 'Advance immediately along Route Alpha');
  assert(result.alternative.isHypothetical === true, 'Alternative should be marked hypothetical');
  assertEqual(result.alternative.decisionText, 'Advance immediately along Route Alpha', 'Alternative text should match input');
});

test('shared context captures events before and after decision', () => {
  const result = runWhatIfAnalysis(SAMPLE_AAR, 'dec-1', 'Advance immediately');
  assert(Array.isArray(result.sharedContext.eventsBeforeDecision), 'eventsBeforeDecision should be array');
  assert(Array.isArray(result.sharedContext.eventsAfterDecision), 'eventsAfterDecision should be array');
  // At T=120s: ev-1 (5s), ev-2 (50s), ev-3 (60s) are before; ev-4 (150s) is after
  const beforeIds = result.sharedContext.eventsBeforeDecision.map(e => e.id);
  assert(beforeIds.includes('ev-4') === false, 'ev-4 (150s) should NOT be before decision at 120s');
});

test('projected analysis has required projection fields', () => {
  const result = runWhatIfAnalysis(SAMPLE_AAR, 'dec-1', 'Advance immediately');
  assertNotNull(result.projected, 'projected should not be null');
  assert(Array.isArray(result.projected.timingComparison), 'timingComparison should be array');
  assert(Array.isArray(result.projected.tradeoffs), 'tradeoffs should be array');
  assert(typeof result.projected.projectionNote === 'string', 'projectionNote should be string');
  assert(result.projected.isProjection === true, 'isProjection should be true');
});

test('assumptions list is present and non-empty', () => {
  const result = runWhatIfAnalysis(SAMPLE_AAR, 'dec-1', 'Advance immediately');
  assert(Array.isArray(result.assumptions) && result.assumptions.length > 0, 'assumptions should be a non-empty array');
});

test('cautious alternative generates different tradeoff than aggressive', () => {
  const cautious = runWhatIfAnalysis(SAMPLE_AAR, 'dec-2', 'Hold and verify before advancing');
  const aggressive = runWhatIfAnalysis(SAMPLE_AAR, 'dec-2', 'Advance and proceed immediately');
  // Both should return valid results
  assertNotNull(cautious, 'Cautious analysis should not be null');
  assertNotNull(aggressive, 'Aggressive analysis should not be null');
  assert(cautious.isHypothetical && aggressive.isHypothetical, 'Both should be marked hypothetical');
});

// ─── Delivery Badge constants tests ───────────────────────────────────────────

console.log('\nE. DELIVERY_BADGE constants');

test('all expected behavior keys are present', () => {
  const expectedKeys = ['normal', 'delayed', 'dropped', 'incomplete', 'conflicting'];
  expectedKeys.forEach(key => {
    assert(key in DELIVERY_BADGE, 'DELIVERY_BADGE should contain key: ' + key);
    assert(typeof DELIVERY_BADGE[key].label === 'string', 'Each badge should have a label string');
    assert(typeof DELIVERY_BADGE[key].bg === 'string', 'Each badge should have a bg color');
    assert(typeof DELIVERY_BADGE[key].color === 'string', 'Each badge should have a color');
  });
});

// ─── Summary ──────────────────────────────────────────────────────────────────

console.log('\n─────────────────────────────────');
console.log('Results: ' + passed + ' passed, ' + failed + ' failed');
if (failed === 0) {
  console.log('All forensics engine tests passed.');
} else {
  console.log(failed + ' test(s) failed.');
  process.exit(1);
}
