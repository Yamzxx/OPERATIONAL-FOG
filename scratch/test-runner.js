import { runEventEngineTests } from '../src/services/eventEngine.test.js';

console.log('--- RUNNING OPERATIONAL FOG EVENT ENGINE TESTS ---');
const results = runEventEngineTests();
let passedCount = 0;

results.forEach((res, i) => {
  if (res.passed) {
    passedCount++;
    console.log(`[PASS] Test ${i + 1}: ${res.test} — ${res.details}`);
  } else {
    console.error(`[FAIL] Test ${i + 1}: ${res.test} — ${res.details}`);
  }
});

console.log(`\nSUMMARY: ${passedCount} / ${results.length} tests passed cleanly.`);
if (passedCount === results.length) {
  console.log('SUCCESS: All Event Engine deterministic tests passed!');
  process.exit(0);
} else {
  process.exit(1);
}
