import test from 'node:test';
import assert from 'node:assert';
import { EventEngine, DELIVERY_BEHAVIORS, DELIVERY_STATUS, RECIPIENT_ROLES } from './eventEngine.js';

const testScenario = {
  id: 'test-scen-1',
  title: 'Test Scenario — Deterministic Engine Validation',
  events: [
    {
      id: 'ev-1',
      time: '00:05',
      title: 'Normal Dispatch',
      type: 'info',
      deliveryBehavior: 'normal',
      intendedRecipient: 'all',
      content: 'Normal message at 5s.'
    },
    {
      id: 'ev-2',
      time: '00:10',
      title: 'Delayed Telemetry',
      type: 'warning',
      deliveryBehavior: 'delayed',
      delaySeconds: 15, // Delivered at 10 + 15 = 25s
      intendedRecipient: 'all',
      content: 'Delayed message.'
    },
    {
      id: 'ev-3',
      time: '00:15',
      title: 'Jammed Signal (Dropped)',
      type: 'alert',
      deliveryBehavior: 'dropped',
      intendedRecipient: 'all',
      content: 'Dropped message.'
    },
    {
      id: 'ev-4',
      time: '00:20',
      title: 'Role Targeted Dispatch',
      type: 'info',
      deliveryBehavior: 'normal',
      intendedRecipient: 'commander',
      content: 'Commander only message.'
    },
    {
      id: 'ev-5',
      time: '00:25',
      title: 'Conflicting Intelligence Report',
      type: 'warning',
      deliveryBehavior: 'conflicting',
      intendedRecipient: 'all',
      content: 'Conflicting report message.'
    },
    {
      id: 'ev-6',
      time: '00:30',
      title: 'Incomplete Resupply Order',
      type: 'warning',
      deliveryBehavior: 'incomplete',
      intendedRecipient: 'all',
      content: 'Truncated resupply dispatch.'
    }
  ]
};

test('EventEngine - Initial State at T=0s', () => {
  const engine = new EventEngine(testScenario);
  engine.start();
  const msgsAt0 = engine.getParticipantMessages('all');
  assert.strictEqual(msgsAt0.length, 0, 'No messages should be delivered at T=0');
});

test('EventEngine - Normal Message Delivery at T=5s', () => {
  const engine = new EventEngine(testScenario);
  engine.start();
  engine.step(5);
  const msgsAt5 = engine.getParticipantMessages('all');
  assert.strictEqual(msgsAt5.length, 1, '1 normal message should be delivered');
  assert.strictEqual(msgsAt5[0].id, 'ev-1');
});

test('EventEngine - Delayed Message Status at T=10s', () => {
  const engine = new EventEngine(testScenario);
  engine.start();
  engine.step(10);
  const msgsAt10 = engine.getParticipantMessages('all');
  const instructorLog10 = engine.getInstructorLog();
  const ev2Status = instructorLog10.find(e => e.id === 'ev-2')?.status;

  assert.strictEqual(msgsAt10.length, 1, 'Delayed message should not be delivered to participant yet');
  assert.strictEqual(ev2Status, DELIVERY_STATUS.DELAYED, 'Instructor log should mark ev-2 as DELAYED');
});

test('EventEngine - Dropped Message Handling at T=15s', () => {
  const engine = new EventEngine(testScenario);
  engine.start();
  engine.step(15);
  const msgsAt15 = engine.getParticipantMessages('all');
  const instructorLog15 = engine.getInstructorLog();
  const ev3Status = instructorLog15.find(e => e.id === 'ev-3')?.status;

  assert.strictEqual(msgsAt15.some(m => m.id === 'ev-3'), false, 'Dropped message must never be visible to participant');
  assert.strictEqual(ev3Status, DELIVERY_STATUS.DROPPED, 'Instructor log must record ev-3 as DROPPED');
});

test('EventEngine - Recipient Role Targeting at T=20s', () => {
  const engine = new EventEngine(testScenario);
  engine.start();
  engine.step(20);
  const msgsFieldUnit = engine.getParticipantMessages('field_unit');
  const msgsCommander = engine.getParticipantMessages('commander');

  assert.strictEqual(msgsCommander.some(m => m.id === 'ev-4'), true, 'Commander should see role-targeted message ev-4');
  assert.strictEqual(msgsFieldUnit.some(m => m.id === 'ev-4'), false, 'Field unit should NOT see commander-only message ev-4');
});

test('EventEngine - Delayed Message Delivery Completion at T=25s', () => {
  const engine = new EventEngine(testScenario);
  engine.start();
  engine.step(25);
  const msgsAt25 = engine.getParticipantMessages('all');
  const ev2Status = engine.getInstructorLog().find(e => e.id === 'ev-2')?.status;

  assert.strictEqual(ev2Status, DELIVERY_STATUS.DELIVERED, 'ev-2 should be DELIVERED at T=25s');
  assert.strictEqual(msgsAt25.some(m => m.id === 'ev-2'), true, 'ev-2 should now be visible in participant feed');
});

test('EventEngine - Pause and Resume Integrity', () => {
  const engine = new EventEngine(testScenario);
  engine.start();
  engine.step(25);
  engine.pause();
  engine.tick(10); // Should be ignored while paused
  assert.strictEqual(engine.elapsedSeconds, 25, 'Elapsed time must not advance during pause');
  engine.resume();
  assert.strictEqual(engine.isPaused, false, 'Engine should be resumed');
});

test('Information Asymmetry - Single GeneratedEvent creates different DeliveredEvents per Trainee Role', () => {
  const asymmetryScenario = {
    id: 'scen-asymmetry-test',
    title: 'Asymmetry Verification Scenario',
    events: [
      {
        id: 'asym-1',
        time: '00:05',
        title: 'Report X',
        domain: 'LAND',
        type: 'info',
        confidence: '80%',
        content: 'Ground Truth: Report X, Confidence 80%',
        roleVariations: {
          team_leader: { deliveryBehavior: 'delayed', delaySeconds: 20, content: 'Report X, Confidence 60%, delayed 20 sec', confidence: '60%' },
          land_member: { deliveryBehavior: 'normal', delaySeconds: 0, content: 'Report X, Confidence 80%, immediate', confidence: '80%' },
          air_member: { deliveryBehavior: 'incomplete', delaySeconds: 0, content: 'Partial report for Report X', confidence: 'Partial' },
          cyber_ew_member: { deliveryBehavior: 'dropped', reason: 'Message dropped' }
        }
      }
    ]
  };

  const engine = new EventEngine(asymmetryScenario);
  engine.start();

  // At T=5s (Initial scheduled time)
  engine.step(5);

  const leaderMsgsAt5 = engine.getParticipantMessages('team_leader');
  const landMsgsAt5 = engine.getParticipantMessages('land_member');
  const airMsgsAt5 = engine.getParticipantMessages('air_member');
  const cyberMsgsAt5 = engine.getParticipantMessages('cyber_ew_member');

  // Land Member receives immediate report
  assert.strictEqual(landMsgsAt5.length, 1, 'Land Member receives immediate report at T=5s');
  assert.strictEqual(landMsgsAt5[0].confidence, '80%');
  assert.strictEqual(landMsgsAt5[0].content, 'Report X, Confidence 80%, immediate');

  // Team Leader has 20s delay, so NOT delivered at T=5s
  assert.strictEqual(leaderMsgsAt5.length, 0, 'Team Leader does NOT receive delayed report at T=5s');

  // Air Member receives partial report
  assert.strictEqual(airMsgsAt5.length, 1, 'Air Member receives partial report at T=5s');
  assert.strictEqual(airMsgsAt5[0].isTruncated, true);
  assert.strictEqual(airMsgsAt5[0].content, 'Partial report for Report X');

  // Cyber/EW Member has message dropped
  assert.strictEqual(cyberMsgsAt5.length, 0, 'Cyber/EW Member message is dropped');

  // Advance time to T=25s (5s + 20s delay)
  engine.step(20);

  const leaderMsgsAt25 = engine.getParticipantMessages('team_leader');
  assert.strictEqual(leaderMsgsAt25.length, 1, 'Team Leader receives delayed report at T=25s');
  assert.strictEqual(leaderMsgsAt25[0].confidence, '60%');
  assert.strictEqual(leaderMsgsAt25[0].content, 'Report X, Confidence 60%, delayed 20 sec');

  // Cyber/EW is STILL dropped at T=25s
  const cyberMsgsAt25 = engine.getParticipantMessages('cyber_ew_member');
  assert.strictEqual(cyberMsgsAt25.length, 0, 'Cyber/EW Member NEVER receives dropped message');
});

test('Information Asymmetry - Instructor Matrix Verification', () => {
  const asymmetryScenario = {
    id: 'scen-matrix-test',
    title: 'Matrix Test Scenario',
    events: [
      {
        id: 'report-a',
        time: '00:05',
        title: 'Report A',
        domain: 'LAND',
        roleVariations: {
          team_leader: { deliveryBehavior: 'normal' },
          land_member: { deliveryBehavior: 'normal' },
          air_member: { deliveryBehavior: 'delayed', delaySeconds: 20 },
          cyber_ew_member: { deliveryBehavior: 'dropped' }
        }
      },
      {
        id: 'report-b',
        time: '00:10',
        title: 'Report B',
        domain: 'AIR',
        roleVariations: {
          team_leader: { deliveryBehavior: 'delayed', delaySeconds: 15 },
          land_member: { deliveryBehavior: 'normal' },
          air_member: { deliveryBehavior: 'incomplete' },
          cyber_ew_member: { deliveryBehavior: 'normal' }
        }
      }
    ]
  };

  const engine = new EventEngine(asymmetryScenario);
  engine.start();
  engine.step(10);

  const matrix = engine.getAsymmetryMatrix();
  assert.strictEqual(matrix.length, 2);

  // Check Report A statuses
  const reportA = matrix.find(m => m.eventId === 'report-a');
  assert.strictEqual(reportA.roleStatuses.team_leader.statusKey, 'delivered');
  assert.strictEqual(reportA.roleStatuses.land_member.statusKey, 'delivered');
  assert.strictEqual(reportA.roleStatuses.air_member.statusKey, 'delayed');
  assert.strictEqual(reportA.roleStatuses.cyber_ew_member.statusKey, 'dropped');

  // Check Report B statuses
  const reportB = matrix.find(m => m.eventId === 'report-b');
  assert.strictEqual(reportB.roleStatuses.team_leader.statusKey, 'delayed');
  assert.strictEqual(reportB.roleStatuses.land_member.statusKey, 'delivered');
  assert.strictEqual(reportB.roleStatuses.air_member.statusKey, 'partial');
  assert.strictEqual(reportB.roleStatuses.cyber_ew_member.statusKey, 'delivered');
});

test('Live Disruption Control - Target Participant Degradation State & Isolation', () => {
  const scenario = {
    id: 'scen-disrupt-test',
    title: 'Disruption Injection Test Scenario',
    events: [
      {
        id: 'ev-alpha',
        time: '00:10',
        title: 'Alpha Recon Intel',
        domain: 'LAND',
        deliveryBehavior: 'normal',
        content: 'Unambiguous battlefield coordinates 44.1, 78.2.'
      },
      {
        id: 'ev-bravo',
        time: '00:20',
        title: 'Bravo Contact',
        domain: 'AIR',
        deliveryBehavior: 'normal',
        content: 'Air contact identified at grid 12.'
      }
    ]
  };

  const engine = new EventEngine(scenario);
  engine.start();

  // 1. Inject Disruption targeting only Team Leader: Delay 30s
  engine.injectDisruption({
    target: 'team_leader',
    disruptionType: 'delay',
    severity: 'high',
    duration: 60
  });

  const state = engine.getState();
  assert.strictEqual(state.activeDisruptions.length, 1);
  assert.strictEqual(state.activeDisruptions[0].target, 'team_leader');
  assert.strictEqual(state.activeDisruptions[0].disruptionType, 'delay');

  // Step to T=10s
  engine.step(10);

  // Land Member should receive ev-alpha normally at T=10s
  const landMsgs = engine.getParticipantMessages('land_member');
  assert.strictEqual(landMsgs.length, 1, 'Land Member receives message on time');
  assert.strictEqual(landMsgs[0].id, 'ev-alpha');

  // Team Leader should NOT have received ev-alpha yet due to injected delay (+30s)
  const leaderMsgs = engine.getParticipantMessages('team_leader');
  assert.strictEqual(leaderMsgs.length, 0, 'Team Leader delivery is delayed by injected disruption');

  // Check Asymmetry Matrix reflects the injected disruption
  const matrix = engine.getAsymmetryMatrix();
  const rowAlpha = matrix.find(r => r.eventId === 'ev-alpha');
  assert.strictEqual(rowAlpha.roleStatuses.land_member.statusKey, 'delivered');
  assert.strictEqual(rowAlpha.roleStatuses.team_leader.statusKey, 'delayed');
  assert.strictEqual(rowAlpha.roleStatuses.team_leader.isInjected, true, 'Matrix marks Team Leader cell as injected');
});

test('Live Disruption Control - Dropout & Incomplete Degradation Profiles', () => {
  const scenario = {
    id: 'scen-dropout-test',
    title: 'Dropout and Truncation Scenario',
    events: [
      {
        id: 'ev-intel',
        time: '00:05',
        title: 'Tactical Intel Stream',
        domain: 'CYBER',
        deliveryBehavior: 'normal',
        content: 'High-value target coordinates: Sector Delta.'
      }
    ]
  };

  const engine = new EventEngine(scenario);
  engine.start();

  // Inject dropout targeting air_member
  engine.injectDisruption({
    target: 'air_member',
    disruptionType: 'dropout',
    severity: 'high',
    duration: 60
  });

  engine.step(5);

  // Air Member must NEVER receive the dropped message
  const airMsgs = engine.getParticipantMessages('air_member');
  assert.strictEqual(airMsgs.length, 0, 'Air Member never receives dropped message');

  // Land Member receives message normally
  const landMsgs = engine.getParticipantMessages('land_member');
  assert.strictEqual(landMsgs.length, 1, 'Land Member receives message normally');

  // Matrix check
  const matrix = engine.getAsymmetryMatrix();
  assert.strictEqual(matrix[0].roleStatuses.air_member.statusKey, 'dropped');
  assert.strictEqual(matrix[0].roleStatuses.air_member.isInjected, true);
});

test('Live Disruption Control - Automatic Restoration Upon Duration Expiry', () => {
  const scenario = {
    id: 'scen-auto-restore',
    title: 'Auto Restore Test Scenario',
    events: [
      {
        id: 'ev-early',
        time: '00:10',
        title: 'Early Intel',
        domain: 'JOINT',
        deliveryBehavior: 'normal',
        content: 'Early dispatch.'
      },
      {
        id: 'ev-late',
        time: '00:45',
        title: 'Late Intel (After Expiry)',
        domain: 'JOINT',
        deliveryBehavior: 'normal',
        content: 'Late dispatch after disruption expiration.'
      }
    ]
  };

  const engine = new EventEngine(scenario);
  engine.start();

  // Inject 30-second disruption on all channels
  engine.injectDisruption({
    target: 'all',
    disruptionType: 'delay',
    severity: 'high',
    duration: 30
  });

  assert.strictEqual(engine.getState().activeDisruptions.length, 1);
  assert.strictEqual(engine.getState().activeDisruptions[0].remainingSec, 30);

  // Tick forward 15 seconds: Disruption still active with 15s remaining
  for (let i = 0; i < 15; i++) {
    engine.tick(1);
  }
  assert.strictEqual(engine.getState().activeDisruptions.length, 1);
  assert.strictEqual(engine.getState().activeDisruptions[0].remainingSec, 15);

  // Tick forward 15 more seconds (total 30s elapsed = duration expired!)
  for (let i = 0; i < 15; i++) {
    engine.tick(1);
  }

  // Active disruptions must be automatically cleared
  assert.strictEqual(engine.getState().activeDisruptions.length, 0, 'Disruption automatically removed on expiry');

  // Disruption log should have record marked as Expired (Restored)
  const log = engine.getState().disruptionsLog;
  const expiredEntry = log.find(l => l.target === 'all');
  assert.ok(expiredEntry);
  assert.strictEqual(expiredEntry.status, 'Expired (Restored)');

  // Advance to T=45s, ev-late should be delivered normally without disruption
  for (let i = 0; i < 15; i++) {
    engine.tick(1);
  }
  const leaderMsgs = engine.getParticipantMessages('team_leader');
  const lateMsg = leaderMsgs.find(m => m.id === 'ev-late');
  assert.ok(lateMsg, 'Late message delivered normally after disruption expiration');
});

test('Live Disruption Control - Manual Restore Communication', () => {
  const scenario = {
    id: 'scen-manual-restore',
    title: 'Manual Restore Test',
    events: [
      {
        id: 'ev-1',
        time: '00:05',
        title: 'Dispatch 1',
        domain: 'LAND',
        deliveryBehavior: 'normal',
        content: 'Normal content.'
      }
    ]
  };

  const engine = new EventEngine(scenario);
  engine.start();

  // Inject disruption on team_leader
  engine.injectDisruption({
    target: 'team_leader',
    disruptionType: 'delay',
    severity: 'high',
    duration: 60
  });

  assert.strictEqual(engine.getState().activeDisruptions.length, 1);

  // Call manual clear / restore
  engine.clearDisruption('team_leader');

  assert.strictEqual(engine.getState().activeDisruptions.length, 0, 'Active disruptions cleared immediately');
  const log = engine.getState().disruptionsLog;
  const restoreEntry = log.find(l => l.disruptionType === 'restore');
  assert.ok(restoreEntry, 'Restoration logged in audit trail');
});


