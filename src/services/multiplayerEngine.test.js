import { multiplayerEngine } from './multiplayerEngine.js';

export function runMultiplayerEngineTests() {
  const results = [];

  const mockScenario = {
    id: 'scen-mp-test',
    title: 'Scenario MP — Multi-Node Test',
    category: 'Joint Operations',
    events: [
      { id: 'ev-1', time: '00:05', title: 'Command Dispatch', type: 'info', deliveryBehavior: 'normal', intendedRecipient: 'all', content: 'Joint dispatch.' }
    ]
  };

  // Test 1: Create Multiplayer Session
  const session = multiplayerEngine.createSession({
    scenario: mockScenario,
    sessionName: 'Alpha Squad Joint Operation',
    maxParticipants: 4,
    creatorServiceId: 'OPS-LEAD-01',
    creatorRole: 'instructor'
  });

  results.push({
    test: 'Create Multiplayer Session & Join Code',
    passed: session && session.sessionCode && session.sessionCode.startsWith('FOG-') && session.participants.length === 1,
    details: `Created session ${session.sessionCode} with 1 participant`
  });

  // Test 2: Participant Join
  const joinedSession = multiplayerEngine.joinSession(session.sessionCode, {
    serviceId: 'OPS-PARTICIPANT-02',
    displayName: 'Commander Bravo',
    role: 'commander'
  });

  results.push({
    test: 'Participant Join & Status Ready',
    passed: joinedSession.participants.length === 2 && joinedSession.status === 'Ready',
    details: `Participant count: ${joinedSession.participants.length}, Status: ${joinedSession.status}`
  });

  // Test 3: Send Team Message
  const msg = multiplayerEngine.sendTeamMessage(session.sessionCode, {
    senderId: 'OPS-PARTICIPANT-02',
    senderName: 'Commander Bravo',
    senderRole: 'commander',
    text: 'Acknowledged command dispatch. Moving to sector.'
  });

  const reloaded = multiplayerEngine.getSessionByCode(session.sessionCode);
  results.push({
    test: 'Team Message Broadcast & Persistence',
    passed: msg && reloaded.teamMessages.length === 1 && reloaded.teamMessages[0].text === 'Acknowledged command dispatch. Moving to sector.',
    details: `Message stored: "${reloaded.teamMessages[0]?.text}"`
  });

  // Test 4: Submit Decision
  const dec = multiplayerEngine.submitDecision(session.sessionCode, {
    title: 'Hold Position at Sector Alpha',
    rationale: 'Awaiting timestamp verification from secondary VHF link.',
    confidence: 'High',
    submittedBy: 'Commander Bravo',
    submittedRole: 'commander'
  });

  const reloadedAfterDec = multiplayerEngine.getSessionByCode(session.sessionCode);
  results.push({
    test: 'Decision Submission Sync',
    passed: dec && reloadedAfterDec.decisions.length === 1 && reloadedAfterDec.decisions[0].title === 'Hold Position at Sector Alpha',
    details: `Decision title logged: "${reloadedAfterDec.decisions[0]?.title}"`
  });

  // Test 5: Start & End Exercise State Transitions
  multiplayerEngine.startExercise(session.sessionCode);
  let sessionStarted = multiplayerEngine.getSessionByCode(session.sessionCode);
  let isStarted = sessionStarted.status === 'In Progress';

  multiplayerEngine.endExercise(session.sessionCode);
  let sessionEnded = multiplayerEngine.getSessionByCode(session.sessionCode);
  let isEnded = sessionEnded.status === 'Completed';

  results.push({
    test: 'Start & End Session State Transitions',
    passed: isStarted && isEnded,
    details: `Started status: ${sessionStarted.status}, Ended status: ${sessionEnded.status}`
  });

  return results;
}
