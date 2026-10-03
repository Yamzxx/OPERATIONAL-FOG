import { runEventEngineTests } from '../src/services/eventEngine.test.js';
import { runMultiplayerEngineTests } from '../src/services/multiplayerEngine.test.js';

console.log('=== OPERATIONAL FOG AUTOMATED TEST SUITE ===\n');

console.log('--- 1. DETERMINISTIC EVENT ENGINE TESTS ---');
const eventResults = runEventEngineTests();
let eventPassCount = 0;
eventResults.forEach((res, i) => {
  if (res.passed) {
    eventPassCount++;
    console.log(`[PASS] Test ${i + 1}: ${res.test} — ${res.details}`);
  } else {
    console.error(`[FAIL] Test ${i + 1}: ${res.test} — ${res.details}`);
  }
});

console.log('\n--- 2. MULTIPLAYER REAL-TIME ENGINE TESTS ---');
const mpResults = runMultiplayerEngineTests();
let mpPassCount = 0;
mpResults.forEach((res, i) => {
  if (res.passed) {
    mpPassCount++;
    console.log(`[PASS] Test ${i + 1}: ${res.test} — ${res.details}`);
  } else {
    console.error(`[FAIL] Test ${i + 1}: ${res.test} — ${res.details}`);
  }
});

const totalCount = eventResults.length + mpResults.length;
const totalPassed = eventPassCount + mpPassCount;

console.log(`\n===========================================`);
console.log(`TOTAL TEST SUMMARY: ${totalPassed} / ${totalCount} PASSED`);
console.log(`===========================================`);

if (totalPassed === totalCount) {
  console.log('SUCCESS: All unit and engine tests passed cleanly!');
  process.exit(0);
} else {
  process.exit(1);
}
