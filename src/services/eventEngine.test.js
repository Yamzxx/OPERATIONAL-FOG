import { EventEngine, DELIVERY_BEHAVIORS, DELIVERY_STATUS, RECIPIENT_ROLES } from './eventEngine.js';

export function runEventEngineTests() {
  const results = [];

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
      }
    ]
  };

  // Test 1: Initial state at T=0
  const engine = new EventEngine(testScenario);
  engine.start();
  let msgsAt0 = engine.getParticipantMessages('all');
  results.push({
    test: 'Initial State (T=0s)',
    passed: msgsAt0.length === 0,
    details: `Expected 0 messages delivered, got ${msgsAt0.length}`
  });

  // Test 2: T=5s - Normal message delivered
  engine.step(5);
  let msgsAt5 = engine.getParticipantMessages('all');
  results.push({
    test: 'Normal Message Delivery (T=5s)',
    passed: msgsAt5.length === 1 && msgsAt5[0].id === 'ev-1',
    details: `Expected 1 normal message, got ${msgsAt5.length}`
  });

  // Test 3: T=10s - Delayed message in DELAYED status (not yet visible to participant)
  engine.step(5); // T=10s
  let msgsAt10 = engine.getParticipantMessages('all');
  let instructorLog10 = engine.getInstructorLog();
  let ev2StatusAt10 = instructorLog10.find(e => e.id === 'ev-2')?.status;
  results.push({
    test: 'Delayed Message Status (T=10s)',
    passed: msgsAt10.length === 1 && ev2StatusAt10 === DELIVERY_STATUS.DELAYED,
    details: `Expected ev-2 status DELAYED, got ${ev2StatusAt10}`
  });

  // Test 4: T=15s - Dropped message recorded as DROPPED and invisible to participant
  engine.step(5); // T=15s
  let msgsAt15 = engine.getParticipantMessages('all');
  let instructorLog15 = engine.getInstructorLog();
  let ev3StatusAt15 = instructorLog15.find(e => e.id === 'ev-3')?.status;
  results.push({
    test: 'Dropped Message Handling (T=15s)',
    passed: !msgsAt15.some(m => m.id === 'ev-3') && ev3StatusAt15 === DELIVERY_STATUS.DROPPED,
    details: `Dropped message excluded from participant view: ${!msgsAt15.some(m => m.id === 'ev-3')}`
  });

  // Test 5: T=20s - Role targeting filtering
  engine.step(5); // T=20s
  let msgsFieldUnit = engine.getParticipantMessages('field_unit');
  let msgsCommander = engine.getParticipantMessages('commander');
  results.push({
    test: 'Recipient Role Targeting (T=20s)',
    passed: !msgsFieldUnit.some(m => m.id === 'ev-4') && msgsCommander.some(m => m.id === 'ev-4'),
    details: `Commander saw ev-4: ${msgsCommander.some(m => m.id === 'ev-4')}, Field Unit excluded: ${!msgsFieldUnit.some(m => m.id === 'ev-4')}`
  });

  // Test 6: T=25s - Delayed message now delivered after 15s delay
  engine.step(5); // T=25s
  let msgsAt25 = engine.getParticipantMessages('all');
  let ev2StatusAt25 = engine.getInstructorLog().find(e => e.id === 'ev-2')?.status;
  results.push({
    test: 'Delayed Message Delivery Completion (T=25s)',
    passed: ev2StatusAt25 === DELIVERY_STATUS.DELIVERED && msgsAt25.some(m => m.id === 'ev-2'),
    details: `Delayed ev-2 delivered at T=25s: ${ev2StatusAt25 === DELIVERY_STATUS.DELIVERED}`
  });

  // Test 7: Pause and Resume behaviour (no double delivery or time skip)
  engine.pause();
  engine.tick(10); // Should be ignored while paused
  let timeAfterPauseTick = engine.elapsedSeconds;
  engine.resume();
  results.push({
    test: 'Pause / Resume Integrity',
    passed: timeAfterPauseTick === 25,
    details: `Elapsed time remained 25s during pause: ${timeAfterPauseTick === 25}`
  });

  return results;
}
