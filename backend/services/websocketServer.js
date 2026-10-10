import { WebSocketServer, WebSocket } from 'ws';
import { 
  TARGET_LABELS, 
  DISRUPTION_TYPE_LABELS, 
  normalizeRole 
} from './simulationEngine.js';

/**
 * Operational Fog - Real-Time Server-Side Session Room & Disruption Engine
 * Handles WebSocket connections, participant room multiplexing, live disruption
 * injection, automated duration countdowns, and automatic restoration upon expiry.
 */

export class ServerWebSocketManager {
  constructor() {
    this.wss = null;
    // Map: sessionCode -> Set<WebSocket>
    this.rooms = new Map();
    // Map: sessionCode -> { activeDisruptions: [], disruptionsLog: [], lastSync: timestamp }
    this.sessionState = new Map();
    this.timerInterval = null;
  }

  init(httpServer) {
    if (this.wss) return this.wss;

    this.wss = new WebSocketServer({ server: httpServer, path: '/ws' });

    this.wss.on('connection', (ws, req) => {
      ws.isAlive = true;
      ws.sessionCode = null;
      ws.role = null;
      ws.userId = null;

      ws.on('pong', () => {
        ws.isAlive = true;
      });

      ws.on('message', (messageBuffer) => {
        try {
          const raw = messageBuffer.toString();
          const message = JSON.parse(raw);
          this.handleIncomingMessage(ws, message);
        } catch (err) {
          console.error('[WS] Failed to parse message:', err.message);
        }
      });

      ws.on('close', () => {
        if (ws.sessionCode && this.rooms.has(ws.sessionCode)) {
          const roomSet = this.rooms.get(ws.sessionCode);
          roomSet.delete(ws);
          if (roomSet.size === 0) {
            this.rooms.delete(ws.sessionCode);
          }
        }
      });

      ws.on('error', (err) => {
        console.error('[WS] Client socket error:', err.message);
      });
    });

    // 1-second ticker for automatic countdown and duration expiry restoration
    this.timerInterval = setInterval(() => {
      this.tickDisruptions();
    }, 1000);
    if (this.timerInterval && typeof this.timerInterval.unref === 'function') {
      this.timerInterval.unref();
    }

    // Heartbeat to keep connections healthy
    this.pingInterval = setInterval(() => {
      if (!this.wss) return;
      this.wss.clients.forEach((ws) => {
        if (!ws.isAlive) return ws.terminate();
        ws.isAlive = false;
        ws.ping();
      });
    }, 30000);
    if (this.pingInterval && typeof this.pingInterval.unref === 'function') {
      this.pingInterval.unref();
    }

    this.wss.on('close', () => {
      if (this.timerInterval) clearInterval(this.timerInterval);
      if (this.pingInterval) clearInterval(this.pingInterval);
    });

    console.log('[WS] Operational Fog WebSocket Server initialized on /ws');
    return this.wss;
  }

  close() {
    if (this.timerInterval) clearInterval(this.timerInterval);
    if (this.pingInterval) clearInterval(this.pingInterval);
    if (this.wss) {
      this.wss.close();
    }
  }

  ensureSessionState(sessionCode) {
    const code = (sessionCode || 'DEFAULT').toUpperCase();
    if (!this.sessionState.has(code)) {
      this.sessionState.set(code, {
        activeDisruptions: [],
        disruptionsLog: [],
        lastSync: new Date().toISOString()
      });
    }
    return this.sessionState.get(code);
  }

  handleIncomingMessage(ws, message) {
    const { type, payload } = message || {};

    switch (type) {
      case 'JOIN_ROOM': {
        const { sessionCode, role, userId, displayName } = payload || {};
        const code = (sessionCode || 'DEFAULT').toUpperCase();
        ws.sessionCode = code;
        ws.role = normalizeRole(role || 'team_leader');
        ws.userId = userId || `user-${Date.now()}`;
        ws.displayName = displayName || 'Operator';

        if (!this.rooms.has(code)) {
          this.rooms.set(code, new Set());
        }
        this.rooms.get(code).add(ws);

        const state = this.ensureSessionState(code);

        // Send state synchronization packet to joined client
        this.sendToSocket(ws, {
          type: 'ROOM_SYNC',
          payload: {
            sessionCode: code,
            activeDisruptions: state.activeDisruptions,
            disruptionsLog: state.disruptionsLog,
            clientRole: ws.role,
            timestamp: new Date().toISOString()
          }
        });
        break;
      }

      case 'INJECT_DISRUPTION': {
        const { sessionCode, target, disruptionType, severity, duration } = payload || {};
        const code = (sessionCode || ws.sessionCode || 'DEFAULT').toUpperCase();
        const result = this.injectDisruption(code, {
          target,
          disruptionType,
          severity,
          duration,
          injectedBy: ws.userId || 'instructor'
        });

        this.sendToSocket(ws, {
          type: 'DISRUPTION_INJECTED_ACK',
          payload: result
        });
        break;
      }

      case 'CLEAR_DISRUPTION': {
        const { sessionCode, target } = payload || {};
        const code = (sessionCode || ws.sessionCode || 'DEFAULT').toUpperCase();
        this.clearDisruption(code, target);
        break;
      }

      case 'TEAM_MESSAGE': {
        const { sessionCode, message: chatMsg } = payload || {};
        const code = (sessionCode || ws.sessionCode || 'DEFAULT').toUpperCase();
        this.broadcastToRoom(code, {
          type: 'TEAM_MESSAGE_SENT',
          payload: { sessionCode: code, message: chatMsg }
        });
        break;
      }

      case 'DECISION_SUBMITTED': {
        const { sessionCode, decision } = payload || {};
        const code = (sessionCode || ws.sessionCode || 'DEFAULT').toUpperCase();
        this.broadcastToRoom(code, {
          type: 'DECISION_SUBMITTED',
          payload: { sessionCode: code, decision }
        });
        break;
      }

      case 'PING': {
        this.sendToSocket(ws, { type: 'PONG', timestamp: new Date().toISOString() });
        break;
      }

      default:
        break;
    }
  }

  injectDisruption(sessionCode, params = {}) {
    const code = (sessionCode || 'DEFAULT').toUpperCase();
    const state = this.ensureSessionState(code);

    const target = params.target || 'all';
    const disruptionType = (params.disruptionType || 'delay').toLowerCase();
    const severity = (params.severity || 'high').toLowerCase();
    const duration = parseInt(params.duration, 10) || 60;

    // Handle "restore" / "Restore Communication"
    if (disruptionType === 'restore' || disruptionType === 'restore communication') {
      return this.clearDisruption(code, target);
    }

    const disruptionId = `disrupt-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const nowIso = new Date().toISOString();

    const disruption = {
      id: disruptionId,
      sessionCode: code,
      target,
      targetLabel: TARGET_LABELS[target] || target,
      disruptionType,
      typeLabel: DISRUPTION_TYPE_LABELS[disruptionType] || disruptionType,
      severity,
      duration,
      remainingSec: duration,
      injectedAt: nowIso,
      expiresAt: new Date(Date.now() + duration * 1000).toISOString(),
      status: 'Active',
      injectedBy: params.injectedBy || 'Instructor'
    };

    // Remove any previous active disruption for the exact same target
    state.activeDisruptions = state.activeDisruptions.filter(d => d.target !== target);
    state.activeDisruptions.push(disruption);

    // Append to audit log
    state.disruptionsLog.push({ ...disruption });

    // Broadcast immediately to all connected clients in the room
    this.broadcastToRoom(code, {
      type: 'DISRUPTION_UPDATED',
      payload: {
        sessionCode: code,
        activeDisruptions: state.activeDisruptions,
        disruptionsLog: state.disruptionsLog,
        latestInjection: disruption,
        timestamp: nowIso
      }
    });

    return {
      success: true,
      disruption,
      activeDisruptions: state.activeDisruptions,
      disruptionsLog: state.disruptionsLog
    };
  }

  clearDisruption(sessionCode, target = 'all') {
    const code = (sessionCode || 'DEFAULT').toUpperCase();
    const state = this.ensureSessionState(code);
    const nowIso = new Date().toISOString();

    const initialCount = state.activeDisruptions.length;
    if (target === 'all') {
      state.activeDisruptions = [];
    } else {
      state.activeDisruptions = state.activeDisruptions.filter(d => d.target !== target);
    }

    // Log the restoration event
    state.disruptionsLog.push({
      id: `restored-${Date.now()}`,
      sessionCode: code,
      target,
      targetLabel: TARGET_LABELS[target] || target,
      disruptionType: 'restore',
      typeLabel: 'Restore Communication',
      severity: 'normal',
      duration: 0,
      remainingSec: 0,
      injectedAt: nowIso,
      status: 'Restored',
      note: 'Communication lines restored by Instructor'
    });

    this.broadcastToRoom(code, {
      type: 'DISRUPTION_UPDATED',
      payload: {
        sessionCode: code,
        activeDisruptions: state.activeDisruptions,
        disruptionsLog: state.disruptionsLog,
        restoredTarget: target,
        timestamp: nowIso
      }
    });

    return {
      success: true,
      restoredCount: initialCount - state.activeDisruptions.length,
      activeDisruptions: state.activeDisruptions,
      disruptionsLog: state.disruptionsLog
    };
  }

  tickDisruptions() {
    for (const [code, state] of this.sessionState.entries()) {
      if (!state.activeDisruptions || state.activeDisruptions.length === 0) continue;

      let expiredDisruptions = [];
      const stillActive = [];

      for (const disruption of state.activeDisruptions) {
        disruption.remainingSec = Math.max(0, disruption.remainingSec - 1);
        if (disruption.remainingSec <= 0) {
          expiredDisruptions.push(disruption);
          // Update status in log
          const logEntry = state.disruptionsLog.find(l => l.id === disruption.id);
          if (logEntry) {
            logEntry.status = 'Expired (Restored)';
            logEntry.expiredAt = new Date().toISOString();
          }
        } else {
          stillActive.push(disruption);
        }
      }

      if (expiredDisruptions.length > 0) {
        state.activeDisruptions = stillActive;
        // Automatic restoration broadcast!
        this.broadcastToRoom(code, {
          type: 'DISRUPTION_EXPIRED',
          payload: {
            sessionCode: code,
            expiredDisruptions,
            activeDisruptions: state.activeDisruptions,
            disruptionsLog: state.disruptionsLog,
            timestamp: new Date().toISOString()
          }
        });
      } else {
        // Periodic sync of countdown clock to all clients
        this.broadcastToRoom(code, {
          type: 'DISRUPTION_TICK',
          payload: {
            sessionCode: code,
            activeDisruptions: state.activeDisruptions
          }
        });
      }
    }
  }

  getActiveDisruptions(sessionCode) {
    const code = (sessionCode || 'DEFAULT').toUpperCase();
    const state = this.sessionState.get(code);
    return state ? [...state.activeDisruptions] : [];
  }

  getDisruptionsLog(sessionCode) {
    const code = (sessionCode || 'DEFAULT').toUpperCase();
    const state = this.sessionState.get(code);
    return state ? [...state.disruptionsLog] : [];
  }

  broadcastToRoom(sessionCode, data, excludeWs = null) {
    const code = (sessionCode || 'DEFAULT').toUpperCase();
    const roomSet = this.rooms.get(code);
    if (!roomSet || roomSet.size === 0) return;

    const payload = JSON.stringify(data);
    roomSet.forEach((client) => {
      if (client !== excludeWs && client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    });
  }

  sendToSocket(ws, data) {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data));
    }
  }
}

export const wsManager = new ServerWebSocketManager();
export function initWebSocketServer(httpServer) {
  return wsManager.init(httpServer);
}
