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
