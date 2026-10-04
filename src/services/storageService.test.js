import test from 'node:test';
import assert from 'node:assert';
import { storageService } from './storageService.js';

test('StorageService - Retrieve Default Scenarios', () => {
  const scenarios = storageService.getScenarios();
  assert.ok(scenarios.length >= 4, 'Should load at least 4 scenarios');
  const sihDemo = scenarios.find(s => s.id === 'scen-sih-2026');
  assert.ok(sihDemo, 'SIH Demo scenario should be present');
  assert.ok(sihDemo.events.length >= 7, 'SIH Demo scenario should contain normal, delayed, dropped, conflicting, and incomplete events');
});

test('StorageService - Create & Save Custom Scenario', () => {
  const newScen = {
    id: 'scen-test-custom-1',
    title: 'Custom Signal Jamming Scenario',
    code: 'SCEN-TEST-001',
    category: 'Latency & Signal',
    shortDesc: 'Test custom scenario description.',
    objective: 'Test objective.',
    duration: '20 mins',
    difficulty: 'Intermediate',
    status: 'Ready',
    events: [
      { id: 'ev-1', time: '00:00', title: 'Start Dispatch', type: 'info', deliveryBehavior: 'normal', intendedRecipient: 'all', content: 'Test message.' }
    ]
  };

  const updatedList = storageService.saveScenario(newScen);
  assert.ok(updatedList.some(s => s.id === 'scen-test-custom-1'), 'Custom scenario saved to storage');
});

test('StorageService - Create Session & Add Decision', () => {
  const newSession = storageService.createSession({
    name: 'Test Operational Exercise',
    scenarioId: 'scen-sih-2026',
    scenarioTitle: 'SIH Demo Scenario — Joint Tactical Node Resilience',
    creator: 'OPS-TESTER'
  });

  assert.ok(newSession.id.startsWith('sess-'), 'Session ID generated');
  assert.strictEqual(newSession.status, 'In Progress', 'New session status is In Progress');

  const newDecision = storageService.addDecision(newSession.id, {
    title: 'Maintain Radio Silence',
    rationale: 'Avoid signal localization during jamming event.',
    confidence: 'High',
    submittedBy: 'Commander Test',
    submittedRole: 'commander'
  });

  assert.ok(newDecision.id.startsWith('dec-'), 'Decision ID generated');

  const sessionDecisions = storageService.getDecisionsForSession(newSession.id);
  assert.strictEqual(sessionDecisions.length, 1, 'Decision associated with session');
  assert.strictEqual(sessionDecisions[0].title, 'Maintain Radio Silence');
});

test('StorageService - Save AAR & Update Instructor Note', () => {
  const newAAR = storageService.saveAAR({
    sessionId: 'sess-test-999',
    sessionName: 'Test Exercise Session',
    scenarioTitle: 'SIH Demo Scenario',
    creator: 'OPS-TESTER',
    startTime: new Date().toISOString(),
    endTime: new Date().toISOString(),
    durationMinutes: 30,
    decisionsCount: 1,
    decisions: [
      { id: 'dec-1', title: 'Hold Position', rationale: 'Test rationale' }
    ],
    events: [
      { id: 'ev-1', time: '00:00', title: 'Initial Dispatch', deliveryBehavior: 'normal' }
    ]
  });

  assert.ok(newAAR.id.startsWith('aar-'), 'AAR ID generated');

  const updatedAARs = storageService.saveAARNote(newAAR.id, 'Excellent command discipline demonstrated.');
  const savedAAR = updatedAARs.find(a => a.id === newAAR.id);
  assert.strictEqual(savedAAR.instructorNotes, 'Excellent command discipline demonstrated.');
});
