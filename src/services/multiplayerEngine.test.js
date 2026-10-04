import test from 'node:test';
import assert from 'node:assert';
import { multiplayerEngine } from './multiplayerEngine.js';

const mockScenario = {
  id: 'scen-mp-test',
  title: 'Scenario MP — Multi-Node Test',
  category: 'Joint Operations',
  events: [
    { id: 'ev-1', time: '00:05', title: 'Command Dispatch', type: 'info', deliveryBehavior: 'normal', intendedRecipient: 'all', content: 'Joint dispatch.' }
  ]
};

test('MultiplayerEngine - Create Session & Generate Join Code', () => {
  const session = multiplayerEngine.createSession({
    scenario: mockScenario,
    sessionName: 'Alpha Squad Joint Operation',
    maxParticipants: 4,
    creatorServiceId: 'OPS-LEAD-01',
    creatorRole: 'instructor'
  });

  assert.ok(session, 'Session object created');
  assert.ok(session.sessionCode.startsWith('FOG-'), 'Session code starts with FOG-');
  assert.strictEqual(session.participants.length, 1, 'Initial host participant included');
});

test('MultiplayerEngine - Participant Join & Status Update', () => {
  const session = multiplayerEngine.createSession({
    scenario: mockScenario,
    sessionName: 'Beta Squad Operation',
    maxParticipants: 4,
    creatorServiceId: 'OPS-LEAD-02',
    creatorRole: 'instructor'
  });

  const joinedSession = multiplayerEngine.joinSession(session.sessionCode, {
    serviceId: 'OPS-PARTICIPANT-02',
    displayName: 'Commander Bravo',
    role: 'commander'
  });

  assert.strictEqual(joinedSession.participants.length, 2, 'Participant added to session');
  assert.strictEqual(joinedSession.status, 'Ready', 'Session status set to Ready when participant count >= 2');
});

test('MultiplayerEngine - Send Team Message', () => {
  const session = multiplayerEngine.createSession({
    scenario: mockScenario,
    sessionName: 'Gamma Exercise',
    maxParticipants: 4,
    creatorServiceId: 'OPS-LEAD-03',
    creatorRole: 'instructor'
  });

  const msg = multiplayerEngine.sendTeamMessage(session.sessionCode, {
    senderId: 'OPS-PARTICIPANT-02',
    senderName: 'Commander Bravo',
    senderRole: 'commander',
    text: 'Acknowledged command dispatch. Moving to sector.'
  });

  const reloaded = multiplayerEngine.getSessionByCode(session.sessionCode);
  assert.ok(msg, 'Message returned');
  assert.strictEqual(reloaded.teamMessages.length, 1, '1 team message stored');
  assert.strictEqual(reloaded.teamMessages[0].text, 'Acknowledged command dispatch. Moving to sector.');
});

test('MultiplayerEngine - Decision Submission Sync', () => {
  const session = multiplayerEngine.createSession({
    scenario: mockScenario,
    sessionName: 'Delta Exercise',
    maxParticipants: 4,
    creatorServiceId: 'OPS-LEAD-04',
    creatorRole: 'instructor'
  });

  const dec = multiplayerEngine.submitDecision(session.sessionCode, {
    title: 'Hold Position at Sector Alpha',
    rationale: 'Awaiting timestamp verification from secondary VHF link.',
    confidence: 'High',
    submittedBy: 'Commander Bravo',
    submittedRole: 'commander'
  });

  const reloaded = multiplayerEngine.getSessionByCode(session.sessionCode);
  assert.ok(dec, 'Decision returned');
  assert.strictEqual(reloaded.decisions.length, 1, 'Decision recorded');
  assert.strictEqual(reloaded.decisions[0].title, 'Hold Position at Sector Alpha');
});

test('MultiplayerEngine - Start & End Exercise Transitions', () => {
  const session = multiplayerEngine.createSession({
    scenario: mockScenario,
    sessionName: 'Epsilon Exercise',
    maxParticipants: 4,
    creatorServiceId: 'OPS-LEAD-05',
    creatorRole: 'instructor'
  });

  multiplayerEngine.startExercise(session.sessionCode);
  let sessionStarted = multiplayerEngine.getSessionByCode(session.sessionCode);
  assert.strictEqual(sessionStarted.status, 'In Progress');

  multiplayerEngine.endExercise(session.sessionCode);
  let sessionEnded = multiplayerEngine.getSessionByCode(session.sessionCode);
  assert.strictEqual(sessionEnded.status, 'Completed');
});
