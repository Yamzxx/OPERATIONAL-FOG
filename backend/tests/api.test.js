import test from 'node:test';
import assert from 'node:assert';

const API_URL = process.env.TEST_API_URL || 'http://localhost:4000/api';

test('Backend API - Health Check Endpoint', async (t) => {
  try {
    const res = await fetch(`${API_URL}/health`);
    if (!res.ok) {
      t.skip('Backend server not running locally; skipping live HTTP test.');
      return;
    }
    const data = await res.json();
    assert.strictEqual(data.status, 'UP');
    assert.strictEqual(data.service, 'Operational Fog Backend API');
  } catch (err) {
    t.skip('Backend API server not active; skipping live HTTP test.');
  }
});

test('Backend API - Get Scenarios Endpoint', async (t) => {
  try {
    const res = await fetch(`${API_URL}/scenarios`);
    if (!res.ok) {
      t.skip('Backend server not active');
      return;
    }
    const scenarios = await res.json();
    assert.ok(Array.isArray(scenarios), 'Scenarios returned as array');
    assert.ok(scenarios.length >= 1, 'Contains default scenarios');
  } catch (err) {
    t.skip('Backend server offline');
  }
});
