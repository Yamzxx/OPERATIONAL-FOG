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

