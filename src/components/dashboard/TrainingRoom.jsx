import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Radio, 
  Clock, 
  Play, 
  Pause, 
  FastForward, 
  ShieldAlert, 
  Send, 
  Square, 
  AlertTriangle, 
  Eye, 
  UserCheck, 
  CheckCircle,
  X,
  Layers,
  HelpCircle,
  MessageSquare,
  Users,
  RefreshCw
} from 'lucide-react';
import { EventEngine, DELIVERY_STATUS, formatSecondsToMMSS } from '../../services/eventEngine';
import { multiplayerEngine } from '../../services/multiplayerEngine';
import { TeamCoordinationPanel } from './TeamCoordinationPanel';
import { useToast } from '../Toast';

// ------------------------------------------------------------------
// API helper — centralises the base URL resolution (same as Feature 1)
// ------------------------------------------------------------------
function getApiBase() {
  return (
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_BACKEND_URL
      ? import.meta.env.VITE_BACKEND_URL
      : 'http://localhost:4000')
  ) + '/api';
}

async function apiFetch(path, opts = {}) {
  const res = await fetch(`${getApiBase()}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
    ...opts
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `API error ${res.status}`);
  return data;
}

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------
function buildAuthHeaders(currentUser) {
  return {
    'X-Service-Id': currentUser?.serviceId || 'OPERATOR',
    'X-User-Role': currentUser?.role || 'instructor'
  };
}

// Clock-sync: persist elapsed_seconds to backend every N seconds while running.
// Fires-and-forgets; does NOT block the UI or throw on failure.
// Auth headers required — PATCH /elapsed now requireRole(['instructor']).
function syncElapsedToBackend(exerciseId, elapsedSeconds, currentUser) {
  if (!exerciseId) return;
  fetch(`${getApiBase()}/exercises/${exerciseId}/elapsed`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'X-Service-Id': currentUser?.serviceId || '',
      'X-User-Role': currentUser?.role || 'instructor'
    },
    body: JSON.stringify({ elapsedSeconds })
  }).catch(() => {});
}

// ------------------------------------------------------------------
// Component
// ------------------------------------------------------------------
export const TrainingRoom = ({
  session,
  scenario: scenarioProp,
  currentUser,
  onSaveDecision,
  onEndExercise,
  existingDecisions = []
}) => {
  const { showToast } = useToast();

  // --- resolve scenario: prefer the session's embedded snapshot ---
  // This handles the case where a participant joined from Incognito and
  // `scenarioProp` is null but the exercise has a scenarioSnapshot.
  const scenario = scenarioProp
    || session?.scenarioSnapshot
    || session?.scenario
    || null;

  // --- core UI state (unchanged from original) ---
  const [engineState, setEngineState] = useState({
    elapsedSeconds: session?.elapsedSeconds || 0,
    elapsedFormatted: formatSecondsToMMSS(session?.elapsedSeconds || 0),
    isRunning: false,
    isPaused: false,
    deliveredCount: 0,
    delayedCount: 0,
    droppedCount: 0,
    pendingCount: 0,
    totalEvents: 0
  });
  const [speedMultiplier, setSpeedMultiplier] = useState(1);
  const [activeTab, setActiveTab] = useState('participant');
  const [decisionTitle, setDecisionTitle] = useState('');
  const [rationale, setRationale] = useState('');
  const [confidence, setConfidence] = useState('Medium');
  const [showEndModal, setShowEndModal] = useState(false);
  const [decisions, setDecisions] = useState(existingDecisions);
  const [liveSession, setLiveSession] = useState(session);

  // --- NEW: backend-authoritative exercise state ---
  const [exerciseStatus, setExerciseStatus] = useState(session?.status || 'Waiting');
  const [isTransitioning, setIsTransitioning] = useState(false); // prevents double-clicks during API call
  const [isSubmittingDecision, setIsSubmittingDecision] = useState(false);
  const [backendError, setBackendError] = useState('');

  const engineRef = useRef(null);
  const elapsedSyncRef = useRef(null); // interval for periodic clock sync
  const pollRef = useRef(null);         // interval for backend event polling
  const isInstructor = currentUser?.role === 'instructor';
  const isExerciseEnded = exerciseStatus === 'Completed' || exerciseStatus === 'Reviewed';

  // Backend-authoritative event list (participant-visible messages from server)
  const [backendMessages, setBackendMessages] = useState([]);
  // Full instructor log from backend (includes PENDING, DELAYED, DROPPED)
  const [backendInstructorLog, setBackendInstructorLog] = useState([]);

  // ------------------------------------------------------------------
  // On mount: load existing decisions from backend + restore engine clock
  // ------------------------------------------------------------------
  useEffect(() => {
    const exerciseId = session?.id;
    if (!exerciseId) return;

    // Load persisted decisions so they survive page refresh.
    // ALWAYS override the prop-initialised state with backend data:
    // if backend returns empty array that means no decisions exist (not a silent failure).
    apiFetch(`/exercises/${exerciseId}/decisions`)
      .then(data => {
        if (Array.isArray(data)) {
          // Always replace prop-initialised state with authoritative backend data
          setDecisions(data);
        }
      })
      .catch(() => {}); // Silently fail — UI shows empty state if backend unreachable

    // ------------------------------------------------------------------
    // Seed scenario events into communication_events (idempotent).
    // This is safe to call on every mount — ON CONFLICT (id) DO NOTHING
    // means the DB is only written on first visit; subsequent calls are no-ops.
    // ------------------------------------------------------------------
    apiFetch(`/exercises/${exerciseId}/events/seed`, {
      method: 'POST',
      headers: buildAuthHeaders(currentUser)
    }).catch(() => {}); // Failure is non-blocking
  }, [session?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ------------------------------------------------------------------
  // Poll the backend for authoritative event state.
  // Called immediately on mount and every POLL_INTERVAL_MS thereafter.
  // Merges results into backendMessages / backendInstructorLog state.
  // This is what makes the engine cross-browser authoritative:
  //   Browser A instructor ticks the clock → DB elapsed_seconds updates →
  //   Browser B participant polls → receives same events without any WS.
  // ------------------------------------------------------------------
  const POLL_INTERVAL_MS = 8000;

  const pollBackendEvents = useCallback(async () => {
    if (!session?.id || isExerciseEnded) return;
    const userRole = currentUser?.role || 'commander';
    try {
      // Participant messages (server enforces visibility — dropped events excluded)
      // Role is sent via X-User-Role header; ?role= query param is no longer accepted.
      const msgData = await apiFetch(
        `/exercises/${session.id}/messages`,
        { headers: buildAuthHeaders(currentUser) }
      );
      if (Array.isArray(msgData.messages)) {
        setBackendMessages(msgData.messages);
      }
      // Sync backend status changes (e.g. instructor paused from another browser)
      if (msgData.isPaused && !engineState.isPaused && engineRef.current?.isRunning) {
        engineRef.current.pause();
      }
      if (!msgData.isPaused && engineState.isPaused && engineRef.current?.isRunning) {
        engineRef.current.resume();
      }
      if (msgData.isCompleted) {
        setExerciseStatus('Completed');
      }
    } catch (_) {}

    // Instructor also polls the full audit log
    if (isInstructor) {
      try {
        const logData = await apiFetch(
          `/exercises/${session.id}/instructor-log`,
          { headers: buildAuthHeaders(currentUser) }
        );
        if (Array.isArray(logData.events)) {
          setBackendInstructorLog(logData.events);
        }
      } catch (_) {}
    }

    // Refresh decisions from backend on every poll cycle.
    // This ensures cross-browser decision visibility:
    //   participant B refreshes → their decisions come from DB, not from stale React state.
    // Participants fetch their own decisions; instructors fetch all.
    try {
      // Participants automatically receive only their own decisions (backend-enforced by serviceId).
      // Instructors receive all decisions. No client-side filtering needed.
      const decisionsUrl = `/exercises/${session.id}/decisions`;
      const freshDecisions = await apiFetch(decisionsUrl, { headers: buildAuthHeaders(currentUser) });

      if (Array.isArray(freshDecisions)) {
        setDecisions(prev => {
          // Merge: keep local decisions not yet confirmed by backend, add any new backend ones
          const backendIds = new Set(freshDecisions.map(d => d.id));
          const localOnly = prev.filter(d => !backendIds.has(d.id));
          return [...freshDecisions, ...localOnly];
        });
      }
    } catch (_) {} // Non-blocking; decisions panel shows last-known state
  }, [session?.id, isExerciseEnded, isInstructor, currentUser]); // eslint-disable-line react-hooks/exhaustive-deps


  // Mount: immediate first poll (don't wait 8 s for first load)
  useEffect(() => {
    if (!session?.id) return;
    const timer = setTimeout(pollBackendEvents, 800); // slight delay to let seed complete
    return () => clearTimeout(timer);
  }, [session?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Recurring poll — only while exercise is active
  useEffect(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (!isExerciseEnded && session?.id) {
      pollRef.current = setInterval(pollBackendEvents, POLL_INTERVAL_MS);
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [isExerciseEnded, session?.id, pollBackendEvents]);


  // ------------------------------------------------------------------
  // Subscribe to real-time multiplayer updates (unchanged from original)
  // ------------------------------------------------------------------
  useEffect(() => {
    setLiveSession(session);

    const unsubscribeMP = multiplayerEngine.subscribe(() => {
      if (session?.sessionCode) {
        const updated = multiplayerEngine.getSessionByCode(session.sessionCode);
        if (updated) {
          setLiveSession({ ...updated });
          // Only update decisions from localStorage if backend hasn't already loaded them
          if (updated.decisions && updated.decisions.length > 0) {
            setDecisions(prev => prev.length === 0 ? [...updated.decisions] : prev);
          }
        }
      }
    });

    return () => unsubscribeMP();
  }, [session]);

  // ------------------------------------------------------------------
  // Instantiate EventEngine on mount, restore elapsed_seconds from backend
  // ------------------------------------------------------------------
  useEffect(() => {
    if (!scenario) return;

    // Use the elapsed_seconds persisted by the backend (survives refresh).
    const restoredElapsed = session?.elapsedSeconds || 0;

    const engine = new EventEngine(scenario, { initialElapsed: restoredElapsed });
    engineRef.current = engine;

    // Start in paused state — the backend status determines if it should run.
    // If the exercise was 'In Progress' when the participant joined, start running.
    const shouldAutoRun = (
      exerciseStatus === 'In Progress' ||
      exerciseStatus === 'Active' ||
      exerciseStatus === 'Ready'
    );
    if (shouldAutoRun && !isExerciseEnded) {
      engine.start();
    } else {
      // Evaluate events at the restored elapsed time but don't tick
      engine.evaluateEvents();
      engine.notify();
    }

    const unsubscribe = engine.subscribe((state) => {
      setEngineState({ ...state });
    });

    return () => {
      unsubscribe();
      // Persist the final clock position when unmounting
      if (session?.id) {
        syncElapsedToBackend(session.id, engineRef.current?.elapsedSeconds || 0, currentUser);
      }
    };
    // scenario and session.elapsedSeconds are stable after mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ------------------------------------------------------------------
  // Simulation timer tick loop (unchanged from original)
  // ------------------------------------------------------------------
  useEffect(() => {
    const interval = setInterval(() => {
      if (engineRef.current && !engineState.isPaused && engineRef.current.isRunning) {
        engineRef.current.tick(speedMultiplier);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [engineState.isPaused, speedMultiplier]);

  // ------------------------------------------------------------------
  // Periodic backend clock sync — every 15 seconds while running
  // ------------------------------------------------------------------
  useEffect(() => {
    if (elapsedSyncRef.current) clearInterval(elapsedSyncRef.current);

    if (!isExerciseEnded && engineRef.current?.isRunning && !engineState.isPaused) {
      elapsedSyncRef.current = setInterval(() => {
        if (session?.id && engineRef.current) {
          syncElapsedToBackend(session.id, engineRef.current.elapsedSeconds, currentUser);
        }
      }, 15000);
    }

    return () => {
      if (elapsedSyncRef.current) clearInterval(elapsedSyncRef.current);
    };
  }, [isExerciseEnded, engineState.isPaused, session?.id]);

  // ------------------------------------------------------------------
  // PAUSE / RESUME — backend authoritative
  // ------------------------------------------------------------------
  const handlePauseToggle = useCallback(async () => {
    if (!engineRef.current || isTransitioning) return;

    const isRunning = engineRef.current.isRunning;
    const isPaused = engineState.isPaused;

    // If engine has never been started (e.g. Waiting status), start it now
    if (!isRunning) {
      engineRef.current.start();
      // Broadcast to other multiplayer nodes
      if (session?.sessionCode) {
        multiplayerEngine.startExercise(session.sessionCode);
      }
      // Persist 'In Progress' to backend
      if (isInstructor && session?.id) {
        setIsTransitioning(true);
        setBackendError('');
        try {
          const updated = await apiFetch(`/exercises/${session.id}/transition`, {
            method: 'POST',
            headers: buildAuthHeaders(currentUser),
            body: JSON.stringify({
              targetStatus: 'In Progress',
              elapsedSeconds: 0
            })
          });
          setExerciseStatus(updated.status);
          setLiveSession(prev => ({ ...prev, ...updated }));
        } catch (err) {
          setBackendError(err.message);
          showToast(err.message, 'error');
        } finally {
          setIsTransitioning(false);
        }
      }
      return;
    }

    const targetStatus = isPaused ? 'In Progress' : 'Paused';

    // Update the local engine immediately for responsive UI
    if (isPaused) {
      engineRef.current.resume();
    } else {
      engineRef.current.pause();
    }

    // Broadcast to other multiplayer nodes (localStorage sync — non-authoritative)
    if (session?.sessionCode) {
      multiplayerEngine.setPauseState(session.sessionCode, !isPaused);
    }

    // Persist to backend (instructor only — backend enforces this via requireRole)
    if (isInstructor && session?.id) {
      setIsTransitioning(true);
      setBackendError('');
      try {
        const updated = await apiFetch(`/exercises/${session.id}/transition`, {
          method: 'POST',
          headers: buildAuthHeaders(currentUser),
          body: JSON.stringify({
            targetStatus,
            elapsedSeconds: engineRef.current?.elapsedSeconds || 0
          })
        });
        setExerciseStatus(updated.status);
        setLiveSession(prev => ({ ...prev, ...updated }));
      } catch (err) {
        // Revert local engine state if backend rejected the transition
        if (isPaused) {
          engineRef.current.pause();
        } else {
          engineRef.current.resume();
        }
        setBackendError(err.message);
        showToast(err.message, 'error');
      } finally {
        setIsTransitioning(false);
      }
    }
  }, [engineState.isPaused, isTransitioning, isInstructor, session, currentUser, showToast]);

  // ------------------------------------------------------------------
  // STEP FORWARD (unchanged from original)
  // ------------------------------------------------------------------
  const handleStepForward = () => {
    if (engineRef.current) {
      engineRef.current.step(5);
    }
  };

  // ------------------------------------------------------------------
  // DECISION SUBMIT — backend authoritative
  // ------------------------------------------------------------------
  const handleDecisionSubmit = async (e) => {
    e.preventDefault();
    if (!decisionTitle.trim() || !rationale.trim()) return;
    if (isSubmittingDecision) return; // prevent double-click
    if (isExerciseEnded) {
      showToast('Cannot submit decisions for a completed exercise.', 'error');
      return;
    }

    setIsSubmittingDecision(true);
    setBackendError('');

    // Capture the simulation elapsed time at the moment of submission
    const rawElapsedSeconds = engineRef.current?.elapsedSeconds || 0;

    const newDecision = {
      id: `dec-${Date.now()}`,
      title: decisionTitle.trim(),
      rationale: rationale.trim(),
      confidence,
      timestamp: new Date().toISOString(),
      elapsedSeconds: rawElapsedSeconds,
      elapsedMinutes: Math.floor(rawElapsedSeconds / 60),
      elapsedTimeFormatted: formatSecondsToMMSS(rawElapsedSeconds),
      submittedBy: currentUser?.serviceId || 'Operator',
      submittedRole: currentUser?.role || 'commander'
    };

    const exerciseId = session?.id;

    try {
      // Persist to PostgreSQL backend — do NOT show success until backend confirms
      if (exerciseId) {
        const persisted = await apiFetch(`/exercises/${exerciseId}/decisions`, {
          method: 'POST',
          headers: buildAuthHeaders(currentUser),
          body: JSON.stringify({ ...newDecision, exerciseId })
        });
        // Use the backend-returned record (camelCase, server timestamp)
        // Deduplicate: replace if this ID already exists (idempotent re-submission)
        setDecisions(prev => {
          const exists = prev.some(d => d.id === persisted.id);
          return exists ? prev.map(d => d.id === persisted.id ? persisted : d) : [...prev, persisted];
        });
      } else {
        // No backend ID — fall through to local-only path (single-user sessions without backend)
        onSaveDecision(session.id, newDecision);
        setDecisions(prev => [...prev, newDecision]);
      }

      // Also broadcast via multiplayer mesh (non-authoritative; for real-time UI update only)
      if (session?.sessionCode) {
        multiplayerEngine.submitDecision(session.sessionCode, newDecision);
      }

      showToast(`Decision "${newDecision.title}" logged at T+${newDecision.elapsedTimeFormatted}.`, 'success');
      // Clear form ONLY after confirmed backend success
      setDecisionTitle('');
      setRationale('');
    } catch (err) {
      // DO NOT clear form on failure — preserve the user's text so they can retry
      const errorMsg = err.message || 'Backend error. Please retry.';
      setBackendError(errorMsg);
      showToast(`Decision submission failed: ${errorMsg}`, 'error');
    } finally {
      setIsSubmittingDecision(false);
    }
  };



  // ------------------------------------------------------------------
  // END EXERCISE — backend authoritative
  // ------------------------------------------------------------------
  const handleEndExercise = useCallback(async () => {
    setShowEndModal(false);
    setIsTransitioning(true);
    setBackendError('');

    // Stop the polling interval immediately — exercise is ending
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }

    const elapsed = engineRef.current?.elapsedSeconds || 0;

    // Persist final elapsed_seconds and transition to Completed
    if (isInstructor && session?.id) {
      try {
        await apiFetch(`/exercises/${session.id}/transition`, {
          method: 'POST',
          headers: buildAuthHeaders(currentUser),
          body: JSON.stringify({
            targetStatus: 'Completed',
            elapsedSeconds: elapsed
          })
        });
        setExerciseStatus('Completed');
      } catch (err) {
        // Log but don't block — still call onEndExercise to navigate to AAR
        console.warn('Backend end-exercise transition failed:', err.message);
      }
    }

    // Use the backend instructor log for the AAR (authoritative persisted record).
    // Fall back to local engine log only if backend hasn't loaded yet.
    const localLog = engineRef.current ? engineRef.current.getInstructorLog() : [];
    const finalEventLog = backendInstructorLog.length > 0 ? backendInstructorLog : localLog;

    // Also update multiplayer mesh
    if (session?.sessionCode) {
      multiplayerEngine.endExercise(session.sessionCode);
    }

    setIsTransitioning(false);
    onEndExercise(session, decisions, Math.floor(elapsed / 60), finalEventLog);
  }, [isInstructor, session, currentUser, decisions, backendInstructorLog, onEndExercise]);


  // ------------------------------------------------------------------
  // TEAM MESSAGE (unchanged from original)
  // ------------------------------------------------------------------
  const handleSendTeamMessage = (text) => {
    if (session?.sessionCode) {
      multiplayerEngine.sendTeamMessage(session.sessionCode, {
        senderId: currentUser?.serviceId || 'Operator',
        senderName: currentUser?.serviceId || 'Operator',
        senderRole: currentUser?.role || 'commander',
        text
      });
    }
  };

  // ------------------------------------------------------------------
  // Derived UI data: merge backend-authoritative events with local EventEngine
  // ------------------------------------------------------------------
  const userRole = currentUser?.role || 'participant';

  // Local engine events (optimistic, low-latency local evaluation)
  const localParticipantMessages = engineRef.current
    ? engineRef.current.getParticipantMessages(userRole)
    : [];

  // Merge: backend messages are authoritative; supplement with any local events
  // not yet confirmed by the backend (e.g. events that just became due this second).
  // Dedup by title since scenario events have stable, unique titles.
  const backendTitles = new Set(backendMessages.map(e => e.title));
  const localOnlyMessages = localParticipantMessages.filter(e => !backendTitles.has(e.title));
  // Show backend events first (they have authoritative delivery times), then
  // any local-only events that haven't been confirmed by the backend yet.
  const participantMessages = [...backendMessages, ...localOnlyMessages]
    .sort((a, b) => (a.actualDeliveryTimeSec || 0) - (b.actualDeliveryTimeSec || 0));

  // Instructor log: prefer backend (uses DB elapsed_seconds, includes DROPPED/PENDING)
  // Fall back to local engine log if backend hasn't loaded yet.
  const localInstructorLog = engineRef.current ? engineRef.current.getInstructorLog() : [];
  const instructorLog = backendInstructorLog.length > 0 ? backendInstructorLog : localInstructorLog;


  // ------------------------------------------------------------------
  // Guard: no scenario available
  // ------------------------------------------------------------------
  if (!scenario) {
    return (
      <div style={{ padding: '48px', textAlign: 'center', color: '#64748B' }}>
        <AlertTriangle size={40} style={{ marginBottom: '16px', color: '#D97706' }} />
        <div style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--color-primary-navy)' }}>
          Scenario Data Not Available
        </div>
        <div style={{ fontSize: '13px', marginTop: '8px' }}>
          The exercise scenario configuration could not be loaded. The backend may be temporarily unavailable.
        </div>
      </div>
    );
  }

  // ------------------------------------------------------------------
  // JSX — keeping all existing headings, sections, and structure intact
  // ------------------------------------------------------------------
  return (
    <div style={{ minHeight: 'calc(100vh - 64px)', backgroundColor: '#F4F6F8', display: 'flex', flexDirection: 'column' }}>
      {/* Top Banner Control Strip */}
      <div 
        style={{
          backgroundColor: '#0F172A',
          color: '#FFFFFF',
          padding: '12px 24px',
          borderBottom: '4px solid var(--color-terracotta)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '36px', height: '36px', background: 'var(--color-terracotta)', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '2px' }}>
            <Radio size={20} />
          </div>
          <div>
            <div style={{ fontSize: '10px', color: 'var(--color-gold-accent)', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>DETERMINISTIC SIMULATION ENGINE ACTIVE</span>
              {liveSession?.sessionCode && (
                <span style={{ background: 'var(--color-primary-navy)', color: '#FFF', padding: '1px 6px', borderRadius: '2px', fontFamily: 'monospace' }}>
                  JOIN CODE: {liveSession.sessionCode}
                </span>
              )}
              {/* Backend-authoritative status badge */}
              <span style={{
                background: exerciseStatus === 'In Progress' || exerciseStatus === 'Active' ? '#15803D'
                  : exerciseStatus === 'Paused' ? '#D97706'
                  : exerciseStatus === 'Completed' ? '#DC2626'
                  : '#475569',
                color: '#FFF',
                padding: '1px 6px',
                borderRadius: '2px',
                fontSize: '10px',
                fontWeight: 'bold'
              }}>
                {exerciseStatus.toUpperCase()}
              </span>
            </div>
            <div style={{ fontFamily: 'var(--font-family-serif)', fontSize: '18px', fontWeight: 'bold' }}>
              {liveSession?.name || session.name}
            </div>
          </div>
        </div>

        {/* Engine Clock & Control Panel */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          {/* Engine Play/Pause & Speed */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#1E293B', padding: '4px 8px', border: '1px solid #334155' }}>
            <button 
              onClick={handlePauseToggle} 
              disabled={isTransitioning || isExerciseEnded}
              style={{ background: 'none', border: 'none', color: !engineState.isRunning ? '#4ADE80' : engineState.isPaused ? '#F59E0B' : '#F59E0B', cursor: isTransitioning || isExerciseEnded ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '4px', opacity: isTransitioning ? 0.5 : 1 }}
              title={isTransitioning ? 'Updating...' : !engineState.isRunning ? 'Start Exercise' : engineState.isPaused ? 'Resume Engine' : 'Pause Engine'}
            >
              {isTransitioning ? <RefreshCw size={16} className="animate-spin" /> : (!engineState.isRunning || engineState.isPaused) ? <Play size={16} /> : <Pause size={16} />}
              {!engineState.isRunning && <span style={{ fontSize: '10px', fontWeight: 'bold', color: '#4ADE80' }}>START</span>}
            </button>

            <button 
              onClick={handleStepForward} 
              disabled={isExerciseEnded}
              style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: isExerciseEnded ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center' }}
              title="Step Forward 5 Seconds"
            >
              <FastForward size={14} />
            </button>

            <span style={{ fontSize: '11px', color: '#CBD5E1', marginLeft: '4px' }}>Speed:</span>
            {[1, 2, 5].map(s => (
              <button
                key={s}
                onClick={() => setSpeedMultiplier(s)}
                style={{
                  background: speedMultiplier === s ? 'var(--color-gold-accent)' : '#334155',
                  color: speedMultiplier === s ? '#000' : '#FFF',
                  border: 'none',
                  fontSize: '10px',
                  fontWeight: 'bold',
                  padding: '2px 6px',
                  borderRadius: '2px',
                  cursor: 'pointer'
                }}
              >
                {s}x
              </button>
            ))}
          </div>

          {/* Clock Display */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#1E293B', padding: '6px 12px', border: '1px solid #334155', fontFamily: 'monospace', fontWeight: 'bold', fontSize: '14px', color: '#F59E0B' }}>
            <Clock size={14} />
            <span>T+ {engineState.elapsedFormatted}</span>
          </div>

          {/* View Tab Switcher */}
          <div style={{ display: 'flex', background: '#1E293B', border: '1px solid #334155', padding: '2px' }}>
            <button
              onClick={() => setActiveTab('participant')}
              style={{
                background: activeTab === 'participant' ? 'var(--color-primary-navy)' : 'transparent',
                color: '#FFF',
                border: 'none',
                padding: '4px 10px',
                fontSize: '11px',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              Participant View
            </button>

            <button
              onClick={() => setActiveTab('instructor')}
              style={{
                background: activeTab === 'instructor' ? 'var(--color-terracotta)' : 'transparent',
                color: '#FFF',
                border: 'none',
                padding: '4px 10px',
                fontSize: '11px',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              Instructor Control ({engineState.droppedCount} Dropped)
            </button>
          </div>

          {/* End Exercise Button */}
          <button 
            onClick={() => setShowEndModal(true)}
            disabled={isTransitioning || isExerciseEnded}
            style={{
              backgroundColor: isExerciseEnded ? '#64748B' : '#DC2626',
              color: '#FFF',
              border: 'none',
              padding: '8px 14px',
              fontSize: '12px',
              fontWeight: 'bold',
              borderRadius: '2px',
              cursor: isTransitioning || isExerciseEnded ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Square size={14} />
            <span>{isExerciseEnded ? 'Exercise Ended' : 'End Exercise'}</span>
          </button>
        </div>
      </div>

      {/* Backend error banner */}
      {backendError && (
        <div style={{ backgroundColor: '#FEE2E2', borderBottom: '1px solid #FCA5A5', padding: '8px 24px', fontSize: '12px', color: '#991B1B', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertTriangle size={14} />
          <span><strong>Backend Error:</strong> {backendError}</span>
          <button onClick={() => setBackendError('')} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#991B1B', cursor: 'pointer' }}><X size={14} /></button>
        </div>
      )}

      {/* Completed exercise overlay */}
      {isExerciseEnded && (
        <div style={{ backgroundColor: '#F0FDF4', borderBottom: '2px solid #BBF7D0', padding: '10px 24px', fontSize: '13px', color: '#166534', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CheckCircle size={16} />
          <span><strong>Exercise Completed.</strong> All events and decisions have been persisted. Proceed to the After-Action Review for analysis.</span>
        </div>
      )}

      {/* Main Content Area */}
      {activeTab === 'participant' ? (
        /* PARTICIPANT VIEW */
        <div style={{ padding: '24px', flexGrow: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          {/* Left Panel: Delivered Dispatches Stream */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Scenario Briefing */}
            <div style={{ backgroundColor: '#FFF', border: '1px solid #CBD5E1', padding: '18px', borderTop: '3px solid var(--color-primary-navy)' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 'bold', color: 'var(--color-primary-navy)', marginBottom: '6px' }}>
                Fictional Scenario Briefing
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--color-text-primary)', lineHeight: '1.5', marginBottom: '10px' }}>
                {scenario?.shortDesc}
              </p>
              <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', padding: '8px 10px', fontSize: '12px' }}>
                <strong>Objective:</strong> {scenario?.objective}
              </div>
            </div>

            {/* Delivered Messages Stream */}
            <div style={{ backgroundColor: '#FFF', border: '1px solid #CBD5E1', padding: '18px', flexGrow: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', borderBottom: '1px solid #E2E8F0', paddingBottom: '8px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 'bold', color: 'var(--color-primary-navy)' }}>
                  Delivered Intelligence Dispatches ({participantMessages.length})
                </h3>
                <span style={{ fontSize: '11px', color: '#15803D', fontWeight: 'bold', background: '#DCFCE7', padding: '2px 6px' }}>
                  ROLE FEED: {userRole.toUpperCase()}
                </span>
              </div>

              {participantMessages.length === 0 ? (
                <div style={{ padding: '32px', textAlign: 'center', color: '#64748B', fontSize: '13px', backgroundColor: '#F8FAFC', border: '1px dashed #CBD5E1' }}>
                  No messages delivered yet. Waiting for scheduled telemetry transmissions... (Elapsed: T+ {engineState.elapsedFormatted})
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {participantMessages.map((ev) => (
                    <div 
                      key={ev.id} 
                      style={{
                        backgroundColor: ev.deliveryBehavior === 'conflicting' ? '#FEF3C7' : ev.deliveryBehavior === 'incomplete' ? '#FFFBEB' : '#F8FAFC',
                        border: '1px solid #CBD5E1',
                        borderLeft: `4px solid ${ev.deliveryBehavior === 'conflicting' ? '#D97706' : 'var(--color-primary-navy)'}`,
                        padding: '14px'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 'bold', color: 'var(--color-primary-navy)' }}>
                        <span>[{formatSecondsToMMSS(ev.actualDeliveryTimeSec)}] {ev.title}</span>
                        <span style={{ fontSize: '10px', textTransform: 'uppercase', color: '#64748B', background: '#E2E8F0', padding: '1px 5px' }}>
                          Target: {ev.recipientRole}
                        </span>
                      </div>

                      <div style={{ fontSize: '13px', color: '#334155', marginTop: '6px', lineHeight: '1.5' }}>
                        {ev.content}
                      </div>

                      {ev.deliveryBehavior === 'conflicting' && (
                        <div style={{ marginTop: '8px', fontSize: '11px', color: '#B45309', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <AlertTriangle size={13} />
                          <span>Note: This report presents conflicting data with earlier reconnaissance dispatches.</span>
                        </div>
                      )}

                      {ev.deliveryBehavior === 'incomplete' && (
                        <div style={{ marginTop: '8px', fontSize: '11px', color: '#9333EA', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <HelpCircle size={13} />
                          <span>Note: This report is incomplete. Some field data was not received.</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Panel: Team Coordination & Decision Console */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Real-time Team Coordination Panel */}
            <TeamCoordinationPanel 
              session={liveSession}
              currentUser={currentUser}
              onSendTeamMessage={handleSendTeamMessage}
            />

            {/* Decision Form */}
            <div style={{ backgroundColor: '#FFF', border: '1px solid #CBD5E1', borderTop: '3px solid var(--color-terracotta)', padding: '20px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--color-primary-navy)', marginBottom: '4px' }}>
                Decision & Command Rationale Console
              </h3>
              <p style={{ fontSize: '12px', color: '#64748B', marginBottom: '14px' }}>
                Record your tactical decision and explicit rationale based on delivered dispatches.
              </p>

              {isExerciseEnded ? (
                <div style={{ padding: '16px', backgroundColor: '#F8FAFC', border: '1px dashed #CBD5E1', textAlign: 'center', fontSize: '12px', color: '#64748B' }}>
                  Exercise completed. Decision submission is now closed.
                </div>
              ) : (
                <form onSubmit={handleDecisionSubmit}>
                  <div className="gov-form-group">
                    <label className="gov-form-label">Command Decision Title</label>
                    <input 
                      type="text"
                      className="gov-form-input"
                      placeholder="e.g. Issue Hold Order pending timestamp verification"
                      value={decisionTitle}
                      onChange={(e) => setDecisionTitle(e.target.value)}
                      disabled={isSubmittingDecision}
                      required
                    />
                  </div>

                  <div className="gov-form-group">
                    <label className="gov-form-label">Tactical Rationale & Assumptions</label>
                    <textarea 
                      className="gov-form-input"
                      rows={3}
                      placeholder="Explain why this decision was chosen under current signal conditions..."
                      value={rationale}
                      onChange={(e) => setRationale(e.target.value)}
                      disabled={isSubmittingDecision}
                      required
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <div>
                      <label className="gov-form-label" style={{ marginBottom: 0 }}>Confidence Level</label>
                      <select 
                        className="gov-form-select"
                        value={confidence}
                        onChange={(e) => setConfidence(e.target.value)}
                        style={{ padding: '4px 8px', fontSize: '12px', marginTop: '2px' }}
                        disabled={isSubmittingDecision}
                      >
                        <option value="High">High Confidence</option>
                        <option value="Medium">Medium Confidence</option>
                        <option value="Low">Low Confidence (High Friction)</option>
                      </select>
                    </div>

                    <button type="submit" className="gov-btn gov-btn-primary" style={{ padding: '10px 20px' }} disabled={isSubmittingDecision}>
                      {isSubmittingDecision ? (
                        <>
                          <RefreshCw size={15} className="animate-spin" />
                          <span>Saving...</span>
                        </>
                      ) : (
                        <>
                          <Send size={15} />
                          <span>Log Decision</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Submitted Decisions Audit Log */}
            <div style={{ backgroundColor: '#FFF', border: '1px solid #CBD5E1', padding: '20px', flexGrow: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', borderBottom: '1px solid #E2E8F0', paddingBottom: '8px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 'bold', color: 'var(--color-primary-navy)' }}>
                  Logged Decisions History ({decisions.length})
                </h3>
                <span style={{ fontSize: '11px', color: '#64748B' }}>Audit Log Active</span>
              </div>

              {decisions.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', color: '#64748B', fontSize: '13px' }}>
                  No decisions recorded yet.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {decisions.map((d, index) => (
                    <div key={d.id || index} style={{ backgroundColor: '#F8FAFC', border: '1px solid #CBD5E1', padding: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 'bold', color: 'var(--color-primary-navy)' }}>
                        <span>#{index + 1}: {d.title}</span>
                        <span style={{ fontSize: '11px', color: 'var(--color-terracotta)', fontWeight: 'bold' }}>
                          T+ {d.elapsedTimeFormatted || `${d.elapsedMinutes || 0}m`}
                        </span>
                      </div>
                      <div style={{ fontSize: '12px', color: '#334155', marginTop: '4px', lineHeight: '1.4' }}>
                        {d.rationale}
                      </div>
                      <div style={{ fontSize: '10px', color: '#64748B', marginTop: '4px', display: 'flex', justifyContent: 'space-between' }}>
                        <span>By: {d.submittedBy || 'Operator'} ({d.submittedRole || 'Commander'})</span>
                        <span>Confidence: {d.confidence}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* INSTRUCTOR CONTROL TAB */
        <div style={{ padding: '24px', flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ backgroundColor: '#FFF', border: '1px solid #CBD5E1', padding: '20px', borderTop: '3px solid var(--color-terracotta)' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--color-primary-navy)', marginBottom: '6px' }}>
              Instructor Ground-Truth Audit Log & Delivery Status
            </h3>
            <p style={{ fontSize: '13px', color: '#64748B', marginBottom: '16px' }}>
              Displays full scenario schedule including delayed countdowns and dropped messages (hidden from participants).
            </p>

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '2px solid #CBD5E1', textAlign: 'left' }}>
                  <th style={{ padding: '10px 12px', fontWeight: 'bold', color: 'var(--color-primary-navy)' }}>Sched. Time</th>
                  <th style={{ padding: '10px 12px', fontWeight: 'bold', color: 'var(--color-primary-navy)' }}>Event Title</th>
                  <th style={{ padding: '10px 12px', fontWeight: 'bold', color: 'var(--color-primary-navy)' }}>Behavior</th>
                  <th style={{ padding: '10px 12px', fontWeight: 'bold', color: 'var(--color-primary-navy)' }}>Target</th>
                  <th style={{ padding: '10px 12px', fontWeight: 'bold', color: 'var(--color-primary-navy)' }}>Actual Delivery</th>
                  <th style={{ padding: '10px 12px', fontWeight: 'bold', color: 'var(--color-primary-navy)' }}>Engine Status</th>
                </tr>
              </thead>
              <tbody>
                {instructorLog.map((ev) => (
                  <tr key={ev.id} style={{ borderBottom: '1px solid #E2E8F0' }}>
                    <td style={{ padding: '10px 12px', fontWeight: 'bold', color: 'var(--color-primary-navy)' }}>
                      T+ {ev.scheduledTimeFormatted}
                    </td>
                    <td style={{ padding: '10px 12px', fontWeight: 'bold', color: 'var(--color-text-primary)' }}>
                      {ev.title}
                    </td>
                    <td style={{ padding: '10px 12px', textTransform: 'uppercase', fontSize: '11px', fontWeight: 'bold' }}>
                      {ev.deliveryBehavior}
                    </td>
                    <td style={{ padding: '10px 12px', color: '#475569' }}>
                      {ev.recipientRole}
                    </td>
                    <td style={{ padding: '10px 12px', color: '#64748B' }}>
                      T+ {ev.actualDeliveryTimeFormatted}
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <span 
                        style={{
                          fontSize: '11px',
                          fontWeight: 'bold',
                          padding: '2px 8px',
                          borderRadius: '2px',
                          backgroundColor: ev.status === DELIVERY_STATUS.DELIVERED ? '#DCFCE7' : ev.status === DELIVERY_STATUS.DROPPED ? '#FEE2E2' : '#FEF3C7',
                          color: ev.status === DELIVERY_STATUS.DELIVERED ? '#15803D' : ev.status === DELIVERY_STATUS.DROPPED ? '#991B1B' : '#B45309'
                        }}
                      >
                        {ev.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Confirmation Modal to End Exercise */}
      {showEndModal && (
        <div className="gov-modal-overlay" onClick={() => setShowEndModal(false)}>
          <div className="gov-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <div className="gov-modal-header" style={{ backgroundColor: '#DC2626', color: '#FFF' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold' }}>
                <AlertTriangle size={18} />
                <span>Confirm End Exercise</span>
              </div>
              <button className="gov-modal-close" onClick={() => setShowEndModal(false)} style={{ color: '#FFF' }}>
                <X size={18} />
              </button>
            </div>

            <div className="gov-modal-body">
              <p style={{ fontSize: '14px', color: 'var(--color-text-primary)', marginBottom: '16px' }}>
                Are you sure you want to end this exercise session? This action will persist the final state to the database and cannot be undone.
              </p>
              <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #CBD5E1', padding: '10px', fontSize: '12px', color: '#475569', marginBottom: '20px' }}>
                Total Decisions Recorded: <strong>{decisions.length}</strong><br />
                Elapsed Duration: <strong>{engineState.elapsedFormatted}</strong><br />
                Delivered Dispatches: <strong>{engineState.deliveredCount}</strong> | Dropped: <strong>{engineState.droppedCount}</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button className="gov-btn gov-btn-secondary" onClick={() => setShowEndModal(false)}>
                  Continue Exercise
                </button>
                <button 
                  className="gov-btn" 
                  style={{ backgroundColor: '#DC2626', color: '#FFF' }}
                  onClick={handleEndExercise}
                  disabled={isTransitioning}
                >
                  {isTransitioning ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      <span>Ending...</span>
                    </>
                  ) : (
                    <span>Confirm & End Session</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
