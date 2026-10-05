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
function syncElapsedToBackend(exerciseId, elapsedSeconds) {
  if (!exerciseId) return;
  fetch(`${getApiBase()}/exercises/${exerciseId}/elapsed`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
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
  const isInstructor = currentUser?.role === 'instructor';
  const isExerciseEnded = exerciseStatus === 'Completed' || exerciseStatus === 'Reviewed';

  // ------------------------------------------------------------------
  // On mount: load existing decisions from backend + restore engine clock
  // ------------------------------------------------------------------
  useEffect(() => {
    const exerciseId = session?.id;
    if (!exerciseId) return;

    // Load persisted decisions so they survive page refresh
    apiFetch(`/exercises/${exerciseId}/decisions`)
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setDecisions(data);
        }
      })
      .catch(() => {}); // Silently fail — UI shows empty state if unavailable
  }, [session?.id]);

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
        syncElapsedToBackend(session.id, engineRef.current?.elapsedSeconds || 0);
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
          syncElapsedToBackend(session.id, engineRef.current.elapsedSeconds);
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

    const isPaused = engineState.isPaused;
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

    const newDecision = {
      id: `dec-${Date.now()}`,
      title: decisionTitle.trim(),
      rationale: rationale.trim(),
      confidence,
      timestamp: new Date().toISOString(),
      elapsedMinutes: Math.floor((engineRef.current?.elapsedSeconds || 0) / 60),
      elapsedTimeFormatted: formatSecondsToMMSS(engineRef.current?.elapsedSeconds || 0),
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
        // Use the backend-returned record (has server-side timestamp)
        setDecisions(prev => [...prev, persisted]);
      } else {
        // No backend ID — fall through to local-only path (single-user sessions)
        onSaveDecision(session.id, newDecision);
        setDecisions(prev => [...prev, newDecision]);
      }

      // Also broadcast via multiplayer mesh for real-time visibility
      if (session?.sessionCode) {
        multiplayerEngine.submitDecision(session.sessionCode, newDecision);
      }

      showToast(`Decision "${newDecision.title}" logged at T+${newDecision.elapsedTimeFormatted}.`, 'success');
      setDecisionTitle('');
      setRationale('');
    } catch (err) {
      // CRITICAL: do NOT show success. Surface the actual error to the user.
      setBackendError(err.message);
      showToast(`Failed to save decision: ${err.message}`, 'error');
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

    const currentLog = engineRef.current ? engineRef.current.getInstructorLog() : [];
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

    // Also update multiplayer mesh
    if (session?.sessionCode) {
      multiplayerEngine.endExercise(session.sessionCode);
    }

    setIsTransitioning(false);
    onEndExercise(session, decisions, Math.floor(elapsed / 60), currentLog);
  }, [isInstructor, session, currentUser, decisions, onEndExercise]);

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
  // Derived UI data from EventEngine
  // ------------------------------------------------------------------
  const userRole = currentUser?.role || 'participant';
  const participantMessages = engineRef.current ? engineRef.current.getParticipantMessages(userRole) : [];
  const instructorLog = engineRef.current ? engineRef.current.getInstructorLog() : [];

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
              style={{ background: 'none', border: 'none', color: engineState.isPaused ? '#F59E0B' : '#4ADE80', cursor: isTransitioning || isExerciseEnded ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', opacity: isTransitioning ? 0.5 : 1 }}
              title={isTransitioning ? 'Updating...' : engineState.isPaused ? 'Resume Engine' : 'Pause Engine'}
            >
              {isTransitioning ? <RefreshCw size={16} className="animate-spin" /> : engineState.isPaused ? <Play size={16} /> : <Pause size={16} />}
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
