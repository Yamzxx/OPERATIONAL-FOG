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

// Vite exposes env vars via import.meta.env in the browser, not process.env.
// Using a safe guard so this also works in Node.js test environments.
const API_BASE_URL = (
  typeof import.meta !== 'undefined' && import.meta.env?.VITE_BACKEND_URL
    ? import.meta.env.VITE_BACKEND_URL
    : (typeof process !== 'undefined' && process.env?.VITE_BACKEND_URL)
      ? process.env.VITE_BACKEND_URL
      : 'http://localhost:4000'
) + '/api';

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

  // Fetch latest sessions from backend database
  async fetchBackendSessions() {
    if (typeof fetch === 'undefined') return this.getSessions();
    try {
      const res = await fetch(`${API_BASE_URL}/exercises`);
      if (res.ok) {
        const remoteSessions = await res.json();
        const localSessions = this.getSessions();
        const mergedMap = new Map();
        [...localSessions, ...remoteSessions].forEach(s => {
          const key = s.id || s.sessionCode;
          if (key) {
            mergedMap.set(key, s);
          }
        });
        const combined = Array.from(mergedMap.values());
        this.saveSessions(combined);
        return combined;
      }
    } catch (e) {
      // Ignore network errors
    }
    return this.getSessions();
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
    const cleanCode = code.toUpperCase().trim();
    const sessions = this.getSessions();
    return sessions.find(s => s.sessionCode && s.sessionCode.toUpperCase() === cleanCode) || null;
  }

  // Create new multiplayer session (Backend Authoritative with Local Backup)
  // sessionCode may be provided by the caller so the code shown in the UI is the same
  // code written to PostgreSQL — preventing the two-code mismatch that caused join failures.
  async createSession({ scenario, sessionName, maxParticipants = 6, creatorServiceId, creatorRole = 'instructor', sessionCode: callerCode }) {
    const sessions = this.getSessions();
    // Use caller-provided code if given; otherwise generate one here.
    const sessionCode = (callerCode || generateSessionCode()).toUpperCase().trim();

    const newSession = {
      id: `mp-sess-${Date.now()}`,
      sessionCode,
      name: sessionName || `${scenario.title.split('—')[1] || scenario.title} Exercise`,
      scenarioId: scenario.id,
      scenarioTitle: scenario.title,
      scenario,
      scenarioSnapshot: scenario,
      status: 'Waiting', // Waiting | Ready | In Progress | Completed
      maxParticipants: parseInt(maxParticipants, 10) || 6,
      creator: creatorServiceId || 'OPS-8842-IND',
      createdAt: new Date().toISOString(),
      startedAt: null,
      endedAt: null,
      elapsedSeconds: 0,
      isPaused: false,
      participants: [
        {
          id: `p-${Date.now()}`,
          serviceId: creatorServiceId || 'OPS-8842-IND',
          displayName: `${creatorServiceId || 'OPS-8842-IND'} (Host)`,
          role: creatorRole,
          status: 'Online',
          joinedAt: new Date().toISOString()
        }
      ],
      teamMessages: [],
      decisions: []
    };

    // Save locally
    const updated = [newSession, ...sessions];
    this.saveSessions(updated);
    this.broadcast('SESSION_CREATED', { session: newSession });

    // Persist to PostgreSQL backend database via REST API
    if (typeof fetch !== 'undefined') {
      try {
        const res = await fetch(`${API_BASE_URL}/exercises`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'X-Service-Id': creatorServiceId || 'OPS-8842-IND',
            'X-User-Role': creatorRole || 'instructor'
          },
          body: JSON.stringify(newSession)
        });

        if (res.ok) {
          const apiSession = await res.json();
          this.updateSession(apiSession);
          return apiSession;
        }
      } catch (err) {
        console.warn('Backend API offline, created session stored locally:', err.message);
      }
    }

    return newSession;
  }

  // Join session by code (Backend Authoritative with Local Fallback)
  async joinSession(sessionCode, { serviceId, displayName, role }) {
    const cleanCode = (sessionCode || '').toUpperCase().trim();
    if (!cleanCode) {
      throw new Error('Please enter a valid Join Code.');
    }

    // First attempt REST API join against PostgreSQL database
    if (typeof fetch !== 'undefined') {
      try {
        const res = await fetch(`${API_BASE_URL}/exercises/${encodeURIComponent(cleanCode)}/join`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'X-Service-Id': serviceId || 'GUEST-NODE',
            'X-User-Role': role || 'commander'
          },
          body: JSON.stringify({
            sessionCode: cleanCode,
            displayName,
            role,
            serviceId
          })
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || `Invalid Join Code "${cleanCode}". Session not found in database.`);
        }

        // Successfully joined via PostgreSQL backend
        this.updateSession(data);
        this.broadcast('PARTICIPANT_JOINED', { sessionCode: cleanCode, participant: { serviceId, displayName, role } });
        return data;
      } catch (err) {
        // Re-throw any error that came from the backend (4xx/5xx responses).
        // Only fall through to local storage if the network itself was unreachable
        // (i.e., the backend server is completely down).
        const isNetworkError = (
          err.message?.includes('Failed to fetch') ||
          err.message?.includes('NetworkError') ||
          err.message?.includes('fetch') ||
          err.name === 'TypeError'
        );
        if (!isNetworkError) {
          // This is a real server error (404 invalid code, 400 completed, etc.) — surface it.
          throw err;
        }
        console.warn('Backend API server unreachable during join, attempting local cache fallback:', err.message);
      }
    }

    // Local fallback if backend server is unreachable
    const localSession = this.getSessionByCode(cleanCode);
    if (!localSession) {
      throw new Error(`Invalid Join Code "${cleanCode}". Session not found in database.`);
    }

    if (localSession.status === 'Completed') {
      throw new Error('This exercise session has already completed.');
    }

    const existingIndex = localSession.participants.findIndex(p => p.serviceId === serviceId);
    if (existingIndex >= 0) {
      localSession.participants[existingIndex].status = 'Online';
      localSession.participants[existingIndex].displayName = displayName || serviceId;
      localSession.participants[existingIndex].role = role || localSession.participants[existingIndex].role;
    } else {
      if (localSession.participants.length >= localSession.maxParticipants) {
        throw new Error(`Exercise participant capacity limit of ${localSession.maxParticipants} reached for this session.`);
      }

      localSession.participants.push({
        id: `p-${Date.now()}`,
        serviceId,
        displayName: displayName || serviceId,
        role: role || 'commander',
        status: 'Online',
        joinedAt: new Date().toISOString()
      });
    }

    if (localSession.participants.length >= 2 && localSession.status === 'Waiting') {
      localSession.status = 'Ready';
    }

    this.updateSession(localSession);
    this.broadcast('PARTICIPANT_JOINED', { sessionCode: cleanCode, participant: { serviceId, displayName, role } });
    return localSession;
  }

  // Update session record in storage and broadcast
  updateSession(updatedSession) {
    const sessions = this.getSessions();
    const updated = sessions.map(s => (s.id === updatedSession.id || s.sessionCode === updatedSession.sessionCode) ? updatedSession : s);
    if (!sessions.some(s => s.id === updatedSession.id || s.sessionCode === updatedSession.sessionCode)) {
      updated.unshift(updatedSession);
    }
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
