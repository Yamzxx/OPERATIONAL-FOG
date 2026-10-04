import { spawnSync } from 'child_process';

const testFiles = [
  'src/services/eventEngine.test.js',
  'src/services/multiplayerEngine.test.js',
  'src/services/storageService.test.js'
];

console.log('=== Operational Fog Test Suite Runner ===\n');

let failedCount = 0;

for (const file of testFiles) {
  console.log(`\n--- Running Test Suite: ${file} ---`);
  const result = spawnSync(process.execPath, ['--test', file], {
    stdio: 'inherit',
    env: process.env
  });

  if (result.status !== 0) {
    failedCount++;
  }
}

if (failedCount > 0) {
  console.error(`\n❌ ${failedCount} test suite(s) failed.`);
  process.exit(1);
} else {
  console.log('\n✅ All test suites passed successfully.');
  process.exit(0);
}
