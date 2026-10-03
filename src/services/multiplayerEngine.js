/**
 * Operational Fog - Real-Time Multiplayer Engine
 * Provides cross-tab/multi-window synchronization via BroadcastChannel & LocalStorage Events.
 * Supports multi-participant sessions, role targeting, team chat, and synchronized exercise clocks.
 */

const MULTIPLAYER_STORAGE_KEY = 'op_fog_mp_sessions_v1';
const CHANNEL_NAME = 'op_fog_multiplayer_channel';

// Node.js fallback in-memory storage for test runners
const inMemoryStore = new Map();

// Helper to generate readable 6-character session codes
export function generateSessionCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'FOG-';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

class MultiplayerEngine {
  constructor() {
    this.channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(CHANNEL_NAME) : null;
    this.listeners = [];

    if (this.channel) {
      this.channel.onmessage = (event) => {
        this.notifyListeners(event.data);
      };
    }

    // Fallback for storage events across tabs
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (e) => {
        if (e.key === MULTIPLAYER_STORAGE_KEY) {
          this.notifyListeners({ type: 'STORAGE_UPDATED' });
        }
      });
    }
  }

  subscribe(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  notifyListeners(data) {
    this.listeners.forEach(cb => cb(data));
  }

  broadcast(actionType, payload = {}) {
    const msg = { type: actionType, payload, timestamp: new Date().toISOString() };
    if (this.channel) {
      this.channel.postMessage(msg);
    }
    this.notifyListeners(msg);
  }

  // Get all multiplayer sessions
  getSessions() {
    try {
      if (typeof localStorage !== 'undefined') {
        const data = localStorage.getItem(MULTIPLAYER_STORAGE_KEY);
        return data ? JSON.parse(data) : [];
      } else {
        const data = inMemoryStore.get(MULTIPLAYER_STORAGE_KEY);
        return data ? JSON.parse(data) : [];
      }
    } catch (e) {
      return [];
    }
  }

  // Save all sessions to storage
  saveSessions(sessions) {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(MULTIPLAYER_STORAGE_KEY, JSON.stringify(sessions));
    } else {
      inMemoryStore.set(MULTIPLAYER_STORAGE_KEY, JSON.stringify(sessions));
    }
  }

  // Find session by code
  getSessionByCode(code) {
    if (!code) return null;
    const sessions = this.getSessions();
    return sessions.find(s => s.sessionCode.toUpperCase() === code.toUpperCase().trim()) || null;
  }

  // Create new multiplayer session
  createSession({ scenario, sessionName, maxParticipants = 6, creatorServiceId, creatorRole = 'instructor' }) {
    const sessions = this.getSessions();
    const sessionCode = generateSessionCode();

    const newSession = {
      id: `mp-sess-${Date.now()}`,
      sessionCode,
      name: sessionName || `${scenario.title.split('—')[1] || scenario.title} Exercise`,
      scenarioId: scenario.id,
      scenarioTitle: scenario.title,
      scenario,
      status: 'Waiting', // Waiting | Ready | In Progress | Completed
      maxParticipants: parseInt(maxParticipants, 10) || 6,
      creator: creatorServiceId,
      createdAt: new Date().toISOString(),
      startedAt: null,
      endedAt: null,
      elapsedSeconds: 0,
      isPaused: false,
      participants: [
        {
          id: `p-${Date.now()}`,
          serviceId: creatorServiceId,
          displayName: `${creatorServiceId} (Host)`,
          role: creatorRole,
          status: 'Online',
          joinedAt: new Date().toISOString()
        }
      ],
      teamMessages: [],
      decisions: []
    };

    const updated = [newSession, ...sessions];
    this.saveSessions(updated);
    this.broadcast('SESSION_CREATED', { session: newSession });
    return newSession;
  }

  // Join session by code
  joinSession(sessionCode, { serviceId, displayName, role }) {
    const session = this.getSessionByCode(sessionCode);
    if (!session) {
      throw new Error(`Session code "${sessionCode}" not found.`);
    }

    if (session.status === 'Completed') {
      throw new Error('This exercise session has already ended.');
    }

    // Check if participant already in session
    const existingIndex = session.participants.findIndex(p => p.serviceId === serviceId);
    if (existingIndex >= 0) {
      session.participants[existingIndex].status = 'Online';
      session.participants[existingIndex].displayName = displayName || serviceId;
      session.participants[existingIndex].role = role || session.participants[existingIndex].role;
    } else {
      if (session.participants.length >= session.maxParticipants) {
        throw new Error('Maximum participant capacity reached for this session.');
      }

      session.participants.push({
        id: `p-${Date.now()}`,
        serviceId,
        displayName: displayName || serviceId,
        role: role || 'commander',
        status: 'Online',
        joinedAt: new Date().toISOString()
      });
    }

    // Update status to Ready if >= 2 participants
    if (session.participants.length >= 2 && session.status === 'Waiting') {
      session.status = 'Ready';
    }

    this.updateSession(session);
    this.broadcast('PARTICIPANT_JOINED', { sessionCode, participant: { serviceId, displayName, role } });
    return session;
  }

  // Update session record in storage and broadcast
  updateSession(updatedSession) {
    const sessions = this.getSessions();
    const updated = sessions.map(s => s.id === updatedSession.id ? updatedSession : s);
    this.saveSessions(updated);
    this.broadcast('SESSION_UPDATED', { session: updatedSession });
    return updatedSession;
  }

  // Add team message
  sendTeamMessage(sessionCode, { senderId, senderName, senderRole, text }) {
    const session = this.getSessionByCode(sessionCode);
    if (!session) return null;

    const newMessage = {
      id: `msg-${Date.now()}`,
      senderId,
      senderName,
      senderRole,
      text: text.trim(),
      timestamp: new Date().toISOString()
    };

    session.teamMessages = [...(session.teamMessages || []), newMessage];
    this.updateSession(session);
    this.broadcast('TEAM_MESSAGE_SENT', { sessionCode, message: newMessage });
    return newMessage;
  }

  // Submit participant decision
  submitDecision(sessionCode, decisionData) {
    const session = this.getSessionByCode(sessionCode);
    if (!session) return null;

    const newDecision = {
      id: `dec-${Date.now()}`,
      timestamp: new Date().toISOString(),
      ...decisionData
    };

    session.decisions = [...(session.decisions || []), newDecision];
    this.updateSession(session);
    this.broadcast('DECISION_SUBMITTED', { sessionCode, decision: newDecision });
    return newDecision;
  }

  // Start exercise
  startExercise(sessionCode) {
    const session = this.getSessionByCode(sessionCode);
    if (!session) return null;

    session.status = 'In Progress';
    session.startedAt = new Date().toISOString();
    session.isPaused = false;
    this.updateSession(session);
    this.broadcast('EXERCISE_STARTED', { sessionCode });
    return session;
  }

  // Pause / Resume exercise
  setPauseState(sessionCode, isPaused) {
    const session = this.getSessionByCode(sessionCode);
    if (!session) return null;

    session.isPaused = isPaused;
    this.updateSession(session);
    this.broadcast('EXERCISE_PAUSE_TOGGLED', { sessionCode, isPaused });
    return session;
  }

  // End exercise
  endExercise(sessionCode) {
    const session = this.getSessionByCode(sessionCode);
    if (!session) return null;

    session.status = 'Completed';
    session.endedAt = new Date().toISOString();
    this.updateSession(session);
    this.broadcast('EXERCISE_ENDED', { sessionCode });
    return session;
  }

  // Leave session
  leaveSession(sessionCode, serviceId) {
    const session = this.getSessionByCode(sessionCode);
    if (!session) return null;

    session.participants = session.participants.map(p => 
      p.serviceId === serviceId ? { ...p, status: 'Disconnected' } : p
    );

    this.updateSession(session);
    this.broadcast('PARTICIPANT_LEFT', { sessionCode, serviceId });
    return session;
  }
}

export const multiplayerEngine = new MultiplayerEngine();
