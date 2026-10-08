import test from 'node:test';
import assert from 'node:assert';
import http from 'http';
import { WebSocket } from 'ws';
import { ServerWebSocketManager } from '../services/websocketServer.js';

test('WebSocket Synchronization - Live Disruption Injection & Room Multiplexing', async (t) => {
  // 1. Create an isolated in-process HTTP server and WebSocket manager
  const server = http.createServer();
  const wsManager = new ServerWebSocketManager();
  wsManager.init(server);

  await new Promise((resolve) => {
    server.listen(0, '127.0.0.1', resolve);
  });

  const port = server.address().port;
  const wsUrl = `ws://127.0.0.1:${port}/ws`;

  // Helper to open socket and await connection
  const createClient = () => {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(wsUrl);
      ws.on('open', () => resolve(ws));
      ws.on('error', reject);
    });
  };

  const clientA = await createClient(); // Instructor
  const clientB = await createClient(); // Trainee in TEST-ROOM
  const clientC = await createClient(); // Trainee in OTHER-ROOM

  try {
    // 2. Clients join respective rooms
    clientA.send(JSON.stringify({
      type: 'JOIN_ROOM',
      payload: { sessionCode: 'ROOM-ALPHA', role: 'instructor', displayName: 'Col. Instructor' }
    }));

    clientB.send(JSON.stringify({
      type: 'JOIN_ROOM',
      payload: { sessionCode: 'ROOM-ALPHA', role: 'team_leader', displayName: 'Leader 1' }
    }));

    clientC.send(JSON.stringify({
      type: 'JOIN_ROOM',
      payload: { sessionCode: 'ROOM-BETA', role: 'team_leader', displayName: 'Leader 2' }
    }));

    // Collect messages for Client B and Client C
    const messagesB = [];
    clientB.on('message', (data) => {
      messagesB.push(JSON.parse(data.toString()));
    });

    const messagesC = [];
    clientC.on('message', (data) => {
      messagesC.push(JSON.parse(data.toString()));
    });

    // Small delay for room subscriptions to settle
    await new Promise((r) => setTimeout(r, 100));

    // 3. Instructor injects disruption in ROOM-ALPHA
    clientA.send(JSON.stringify({
      type: 'INJECT_DISRUPTION',
      payload: {
        sessionCode: 'ROOM-ALPHA',
        target: 'team_leader',
        disruptionType: 'delay',
        severity: 'high',
        duration: 45
      }
    }));

    // Wait for message dissemination
    await new Promise((r) => setTimeout(r, 200));

    // Verify Client B received real-time DISRUPTION_UPDATED
    const updateMsg = messagesB.find(m => m.type === 'DISRUPTION_UPDATED');
    assert.ok(updateMsg, 'Client B in same room received DISRUPTION_UPDATED');
    assert.strictEqual(updateMsg.payload.sessionCode, 'ROOM-ALPHA');
    assert.strictEqual(updateMsg.payload.activeDisruptions.length, 1);
    assert.strictEqual(updateMsg.payload.activeDisruptions[0].target, 'team_leader');
    assert.strictEqual(updateMsg.payload.activeDisruptions[0].duration, 45);

    // Verify Client C in ROOM-BETA did NOT receive the disruption (room isolation)
    const betaUpdates = messagesC.filter(m => m.type === 'DISRUPTION_UPDATED');
    assert.strictEqual(betaUpdates.length, 0, 'Client C in different room was isolated from disruption');

    // 4. Instructor restores communication
    clientA.send(JSON.stringify({
      type: 'CLEAR_DISRUPTION',
      payload: {
        sessionCode: 'ROOM-ALPHA',
        target: 'team_leader'
      }
    }));

    await new Promise((r) => setTimeout(r, 200));

    // Verify Client B received restoration
    const restoredMsg = messagesB.filter(m => m.type === 'DISRUPTION_UPDATED' && m.payload.restoredTarget === 'team_leader');
    assert.ok(restoredMsg.length > 0, 'Client B received restoration update');
    assert.strictEqual(restoredMsg[0].payload.activeDisruptions.length, 0);

  } finally {
    clientA.close();
    clientB.close();
    clientC.close();
    wsManager.close();
    server.close();
  }
});

test('WebSocket Server - Automatic Duration Expiry Restoration Ticker', async () => {
  const server = http.createServer();
  const wsManager = new ServerWebSocketManager();
  wsManager.init(server);

  await new Promise((resolve) => {
    server.listen(0, '127.0.0.1', resolve);
  });

  const port = server.address().port;
  const ws = new WebSocket(`ws://127.0.0.1:${port}/ws`);

  await new Promise((resolve) => ws.on('open', resolve));

  try {
    ws.send(JSON.stringify({
      type: 'JOIN_ROOM',
      payload: { sessionCode: 'AUTO-EXPIRE-ROOM', role: 'instructor' }
    }));

    const messages = [];
    ws.on('message', (d) => messages.push(JSON.parse(d.toString())));

    await new Promise((r) => setTimeout(r, 100));

    // Inject a 1-second disruption
    ws.send(JSON.stringify({
      type: 'INJECT_DISRUPTION',
      payload: {
        sessionCode: 'AUTO-EXPIRE-ROOM',
        target: 'all',
        disruptionType: 'dropout',
        severity: 'high',
        duration: 1
      }
    }));

    // Wait 2.2 seconds for server-side 1s ticker to expire the disruption
    await new Promise((r) => setTimeout(r, 2200));

    const expiredEvent = messages.find(m => m.type === 'DISRUPTION_EXPIRED');
    assert.ok(expiredEvent, 'Server automatically fired DISRUPTION_EXPIRED upon timer completion');
    assert.strictEqual(expiredEvent.payload.activeDisruptions.length, 0, 'Active disruptions restored to 0');
  } finally {
    ws.close();
    wsManager.close();
    server.close();
  }
});
