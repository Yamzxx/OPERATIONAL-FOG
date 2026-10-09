import React, { useState, useEffect, useRef } from 'react';
import { 
  Radio, 
  Clock, 
  Play, 
  Pause, 
  FastForward, 
  Send, 
  Square, 
  AlertTriangle, 
  CheckCircle,
  X,
  HelpCircle,
  Users,
  ChevronDown,
  ChevronRight,
  Wifi,
  Activity,
  ShieldAlert,
  Info,
  Zap,
  RefreshCw
} from 'lucide-react';
import { 
  EventEngine, 
  DOMAINS,
  TRAINEE_ROLES,
  ROLE_LABELS,
  TARGET_LABELS,
  DISRUPTION_TYPE_LABELS,
  normalizeRole,
<<<<<<< Updated upstream
  formatSecondsToMMSS 
=======
  formatSecondsToMMSS,
  parseTimeToSeconds,
  isDecisionEvent,
  calculateInformationAvailability,
  calculateSharedAwareness,
  createEvidenceSnapshot,
  getDecisionTargetRoles,
  isRoleAllowedForDecision
>>>>>>> Stashed changes
} from '../../services/eventEngine';
import { multiplayerEngine } from '../../services/multiplayerEngine';
import { TeamCoordinationPanel } from './TeamCoordinationPanel';
import { useToast } from '../Toast';

export const TrainingRoom = ({ 
  session, 
  scenario, 
  currentUser, 
  onSaveDecision, 
  onEndExercise, 
  existingDecisions = [] 
}) => {
  const { showToast } = useToast();

  const userRole = normalizeRole(currentUser?.role || 'team_leader');
  const isInstructor = userRole === TRAINEE_ROLES.INSTRUCTOR;

  const [engineState, setEngineState] = useState({
    elapsedSeconds: 0,
    elapsedFormatted: '00:00',
    isRunning: true,
    isPaused: false,
    deliveredCount: 0,
    delayedCount: 0,
    droppedCount: 0,
    activeDisruptions: [],
    disruptionsLog: []
  });

  const [speedMultiplier, setSpeedMultiplier] = useState(1);
  // Default to instructor view if instructor, otherwise lock to participant view
  const [activeTab, setActiveTab] = useState(isInstructor ? 'instructor' : 'participant');
  // For instructor to preview what a specific trainee role sees
  const [previewRole, setPreviewRole] = useState(TRAINEE_ROLES.TEAM_LEADER);
  const [expandedEventId, setExpandedEventId] = useState(null);

  const [decisionTitle, setDecisionTitle] = useState('');
  const [rationale, setRationale] = useState('');
  const [confidence, setConfidence] = useState('Medium');
  const [showEndModal, setShowEndModal] = useState(false);
  const [decisions, setDecisions] = useState(existingDecisions);
  const [liveSession, setLiveSession] = useState(session);

  // Instructor Live Disruption Control form state
  const [disruptionTarget, setDisruptionTarget] = useState('all');
  const [disruptionType, setDisruptionType] = useState('delay');
  const [disruptionSeverity, setDisruptionSeverity] = useState('high');
  const [disruptionDuration, setDisruptionDuration] = useState('60');

  const engineRef = useRef(null);

  // Initialize WebSocket connection for server-side room communication
  useEffect(() => {
    const code = session?.sessionCode || session?.id || 'ALPHA-ROOM';
    multiplayerEngine.initWebSocket(code, userRole, currentUser);
  }, [session, userRole, currentUser]);

  // Subscribe to real-time multiplayer updates
  useEffect(() => {
    const code = session?.sessionCode || session?.id;
    if (code) {
      const existing = multiplayerEngine.getSessionByCode(code);
      if (existing) {
        setLiveSession({ ...existing });
        if (existing.decisions) setDecisions([...existing.decisions]);
      } else {
        setLiveSession(session);
      }
    } else {
      setLiveSession(session);
    }

    const unsubscribeMP = multiplayerEngine.subscribe((event) => {
      const targetCode = session?.sessionCode || session?.id;
      if (targetCode) {
        const updated = multiplayerEngine.getSessionByCode(targetCode);
        if (updated) {
          setLiveSession({ ...updated });
          if (updated.decisions) {
            setDecisions([...updated.decisions]);
          }
        }
      }
      if (event?.type === 'TEAM_MESSAGE_SENT' && event?.payload?.message) {
        setLiveSession(prev => {
          const exists = (prev?.teamMessages || []).some(m => m.id === event.payload.message.id);
          if (exists) return prev;
          return {
            ...prev,
            teamMessages: [...(prev?.teamMessages || []), event.payload.message]
          };
        });
      }
      // Real-time Disruption Synchronization across clients & WebSocket rooms
      if (event?.type === 'DISRUPTION_UPDATED' || event?.type === 'DISRUPTION_EXPIRED' || event?.type === 'DISRUPTION_TICK' || event?.type === 'ROOM_SYNC') {
        if (event?.payload?.activeDisruptions !== undefined && engineRef.current) {
          engineRef.current.setActiveDisruptions(event.payload.activeDisruptions);
        }
        if (event?.payload?.disruptionsLog !== undefined && engineRef.current) {
          engineRef.current.setDisruptionsLog(event.payload.disruptionsLog);
        }
      }
    });

    return () => {
      unsubscribeMP();
    };
  }, [session]);

  const activeScenario = scenario || session?.scenarioSnapshot || session?.scenario || null;

  // Instantiate EventEngine on mount
  useEffect(() => {
    const engine = new EventEngine(activeScenario, {
      sessionSeed: session?.sessionCode || session?.id || activeScenario?.id || 'OP_FOG_DEFAULT_SEED'
    });
    engineRef.current = engine;
    engine.start();

    const unsubscribe = engine.subscribe((state) => {
      setEngineState({ ...state });
    });

    return () => {
      unsubscribe();
    };
  }, [activeScenario, session]);

  // Simulation timer interval loop
  useEffect(() => {
    const interval = setInterval(() => {
      if (engineRef.current && !engineState.isPaused) {
        engineRef.current.tick(speedMultiplier);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [engineState.isPaused, speedMultiplier]);

  const handlePauseToggle = () => {
    if (!engineRef.current) return;
    if (engineState.isPaused) {
      engineRef.current.resume();
      if (session?.sessionCode) {
        multiplayerEngine.setPauseState(session.sessionCode, false);
      }
    } else {
      engineRef.current.pause();
      if (session?.sessionCode) {
        multiplayerEngine.setPauseState(session.sessionCode, true);
      }
    }
  };

  const handleStepForward = () => {
    if (engineRef.current) {
      engineRef.current.step(5);
    }
  };

<<<<<<< Updated upstream
  const handleDecisionSubmit = (e) => {
    e.preventDefault();
    if (!decisionTitle.trim() || !rationale.trim()) return;

    const newDecision = {
      id: `dec-${Date.now()}`,
      title: decisionTitle.trim(),
      rationale: rationale.trim(),
      confidence,
=======
  // Scenario-triggered decision point detection
  const scenarioEvents = activeScenario?.events || [];
  const triggeredDecisionPoints = scenarioEvents.filter(ev => {
    if (!isDecisionEvent(ev)) return false;
    const triggerSec = parseTimeToSeconds(ev.time || ev.scheduledTime || 0);
    return triggerSec <= engineState.elapsedSeconds;
  });

  // Find the first triggered decision point not yet submitted
  const activeDecisionPoint = triggeredDecisionPoints.find(dp => {
    return !decisions.some(d => (d.decisionPointId === dp.id) || (d.title === dp.title));
  });

  const currentViewRole = isInstructor && activeTab === 'participant' ? previewRole : userRole;

  // Next or active decision point to determine role access
  const relevantDecisionPoint = activeDecisionPoint || scenarioEvents.find(isDecisionEvent);

  const isTargetForDecision = relevantDecisionPoint
    ? isRoleAllowedForDecision(relevantDecisionPoint, currentViewRole)
    : (currentViewRole === TRAINEE_ROLES.TEAM_LEADER);

  const decisionTargetRoles = relevantDecisionPoint 
    ? getDecisionTargetRoles(relevantDecisionPoint) 
    : ['team_leader'];

  const targetRoleLabels = decisionTargetRoles.map(r => ROLE_LABELS[normalizeRole(r)] || r).join(' / ');
  const awaitingMessage = decisionTargetRoles.includes('team_leader')
    ? "Awaiting Team Leader Decision — share your domain updates through Team Chat."
    : `Awaiting ${targetRoleLabels} Decision — share your domain updates through Team Chat.`;

  const participantMessages = engineRef.current 
    ? engineRef.current.getParticipantMessages(currentViewRole) 
    : [];

  const handleDecisionSubmit = (e) => {
    e.preventDefault();
    if (!isTargetForDecision) {
      showToast('You are not authorized to submit this decision.', 'error');
      return;
    }
    const finalTitle = (selectedOption && selectedOption !== '__custom__')
      ? selectedOption
      : decisionTitle.trim();

    if (!finalTitle || !rationale.trim()) return;

    const triggerSec = activeDecisionPoint 
      ? parseTimeToSeconds(activeDecisionPoint.time || activeDecisionPoint.scheduledTime || 0)
      : engineState.elapsedSeconds;

    const evidenceSnapshot = engineRef.current ? engineRef.current.createEvidenceSnapshot({
      decidingRole: userRole,
      decidingParticipantId: currentUser?.serviceId || 'Leader-01',
      decisionText: finalTitle,
      confidence: `${confidencePercent}%`,
      rationale: rationale.trim(),
      sourcesUsed: selectedSources,
      teamMessages: liveSession?.teamMessages || session?.teamMessages || [],
      decisionTriggerTimeSec: triggerSec
    }) : {
      participantId: currentUser?.serviceId || 'Leader-01',
      participantRole: userRole,
      decisionTimestamp: new Date().toISOString(),
      elapsedSeconds: engineState.elapsedSeconds,
      elapsedTimeFormatted: engineState.elapsedFormatted,
      decision: finalTitle,
      confidence: `${confidencePercent}%`,
      confidenceNum: confidencePercent,
      rationale: rationale.trim(),
      sourcesUsed: selectedSources,
      eventsAvailable: participantMessages,
      eventsDelayedOrDropped: [],
      communicationState: { isDegraded: false, activeDisruptionsCount: 0, disruptions: [] },
      teamMessagesAvailable: liveSession?.teamMessages || session?.teamMessages || [],
      activeDisruptions: engineState.activeDisruptions || [],
      metrics: {
        responseTimeSec: Math.max(0, engineState.elapsedSeconds - triggerSec),
        responseTimeFormatted: `${Math.max(0, engineState.elapsedSeconds - triggerSec)}s`,
        informationAvailabilityPct: 57,
        confidenceNum: confidencePercent,
        confidenceVsAvailabilityDelta: confidencePercent - 57,
        sharedAwarenessPct: 62
      }
    };

    const newDecision = {
      id: `dec-${Date.now()}`,
      decisionPointId: activeDecisionPoint?.id || relevantDecisionPoint?.id || null,
      targetRoles: decisionTargetRoles,
      title: finalTitle,
      rationale: rationale.trim(),
      confidence: `${confidencePercent}%`,
      confidencePercent,
>>>>>>> Stashed changes
      timestamp: new Date().toISOString(),
      elapsedMinutes: Math.floor(engineState.elapsedSeconds / 60),
      elapsedTimeFormatted: engineState.elapsedFormatted,
      submittedBy: currentUser?.serviceId || 'Operator',
      submittedRole: userRole
    };

    if (session?.sessionCode) {
      multiplayerEngine.submitDecision(session.sessionCode, newDecision);
    } else {
      onSaveDecision(session.id, newDecision);
      setDecisions([...decisions, newDecision]);
    }

    showToast(`Decision "${newDecision.title}" recorded at ${newDecision.elapsedTimeFormatted}.`, 'success');

    setDecisionTitle('');
    setRationale('');
  };

  const handleSendTeamMessage = (text) => {
    if (!text || !text.trim()) return;
    const sessionCode = liveSession?.sessionCode || session?.sessionCode || liveSession?.id || session?.id || 'ALPHA-ROOM';

    const newMsg = {
      id: `msg-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      senderId: currentUser?.serviceId || 'Trainee',
      senderName: currentUser?.serviceId || 'Trainee',
      senderRole: userRole,
      text: text.trim(),
      timestamp: new Date().toISOString()
    };

    // 1. Immediately update local state in current tab so user sees message instantly
    setLiveSession(prev => ({
      ...prev,
      sessionCode: prev?.sessionCode || sessionCode,
      teamMessages: [...(prev?.teamMessages || []), newMsg]
    }));

    // 2. Broadcast and persist via multiplayerEngine
    multiplayerEngine.sendTeamMessage(sessionCode, {
      senderId: currentUser?.serviceId || 'Trainee',
      senderName: currentUser?.serviceId || 'Trainee',
      senderRole: userRole,
      text: text.trim()
    });
  };

  const handleInjectDisruption = (e) => {
    if (e) e.preventDefault();
    const sessionCode = liveSession?.sessionCode || session?.sessionCode || liveSession?.id || session?.id || 'ALPHA-ROOM';
    const durNum = parseInt(disruptionDuration, 10) || 60;

    // 1. Immediate local engine injection (0ms latency)
    engineRef.current?.injectDisruption({
      target: disruptionTarget,
      disruptionType,
      severity: disruptionSeverity,
      duration: durNum
    });

    // 2. Broadcast across WebSocket room & REST fallback
    multiplayerEngine.injectDisruption(sessionCode, {
      target: disruptionTarget,
      disruptionType,
      severity: disruptionSeverity,
      duration: durNum
    });

    showToast(
      disruptionType === 'restore'
        ? `Communication restored for ${TARGET_LABELS[disruptionTarget] || disruptionTarget}.`
        : `Disruption injected: ${DISRUPTION_TYPE_LABELS[disruptionType] || disruptionType} on ${TARGET_LABELS[disruptionTarget] || disruptionTarget} (${durNum}s).`,
      disruptionType === 'restore' ? 'success' : 'warning'
    );
  };

  const handleRestoreCommunication = (target = 'all') => {
    const sessionCode = liveSession?.sessionCode || session?.sessionCode || liveSession?.id || session?.id || 'ALPHA-ROOM';
    engineRef.current?.clearDisruption(target);
    multiplayerEngine.clearDisruption(sessionCode, target);
    showToast(`Restored communications (${TARGET_LABELS[target] || target}).`, 'success');
  };

  // Trainee messages for active view
  const currentViewRole = isInstructor && activeTab === 'participant' ? previewRole : userRole;
  const participantMessages = engineRef.current ? engineRef.current.getParticipantMessages(currentViewRole) : [];
  const asymmetryMatrix = engineRef.current ? engineRef.current.getAsymmetryMatrix() : [];
  const groundTruthEvents = engineRef.current ? engineRef.current.getGroundTruthEvents() : [];

  // Helper for domain color styling
  const getDomainBadgeStyle = (domain) => {
    switch (domain) {
      case DOMAINS.LAND:
        return { background: '#DCFCE7', color: '#15803D', border: '1px solid #86EFAC' };
      case DOMAINS.AIR:
        return { background: '#E0F2FE', color: '#0369A1', border: '1px solid #BAE6FD' };
      case DOMAINS.CYBER:
        return { background: '#F3E8FF', color: '#7E22CE', border: '1px solid #D8B4FE' };
      case DOMAINS.EW:
        return { background: '#FEF3C7', color: '#B45309', border: '1px solid #FCD34D' };
      default:
        return { background: '#F1F5F9', color: '#334155', border: '1px solid #CBD5E1' };
    }
  };

  // Helper for asymmetry matrix status cell styling
  const getStatusBadgeStyle = (statusKey) => {
    switch (statusKey) {
      case 'delivered':
        return { background: '#DCFCE7', color: '#15803D', border: '1px solid #86EFAC' };
      case 'delayed':
        return { background: '#FEF3C7', color: '#B45309', border: '1px solid #FCD34D' };
      case 'dropped':
        return { background: '#FEE2E2', color: '#991B1B', border: '1px solid #FCA5A5' };
      case 'partial':
        return { background: '#F3E8FF', color: '#7E22CE', border: '1px solid #D8B4FE' };
      case 'conflicting':
        return { background: '#FFEDD5', color: '#C2410C', border: '1px solid #FDBA74' };
      default:
        return { background: '#F1F5F9', color: '#64748B', border: '1px solid #E2E8F0' };
    }
  };

  // Helper to check if a specific participant role is currently under active disruption
  const isRoleDegraded = (role) => {
    return (engineState.activeDisruptions || []).some(
      d => d.target === 'all' || d.target === role
    );
  };

  return (
    <div style={{ minHeight: 'calc(100vh - 64px)', backgroundColor: '#F8FAFC', display: 'flex', flexDirection: 'column' }}>
      
      {/* 1. TOP HEADER BAR (CLEAN & SLEEK) */}
      <div 
        style={{
          backgroundColor: '#0F172A',
          color: '#FFFFFF',
          padding: '12px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '14px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}
      >
        {/* Left: Exercise Name & Room Code */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '32px', height: '32px', background: '#2563EB', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '4px' }}>
            <Radio size={18} />
          </div>
          <div>
            <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#FFFFFF' }}>
              {liveSession?.name || session.name || scenario?.title}
            </div>
            {liveSession?.sessionCode && (
              <div style={{ fontSize: '11px', color: '#94A3B8' }}>
                Room Code: <strong style={{ color: '#FBBF24', fontFamily: 'monospace', letterSpacing: '1px' }}>{liveSession.sessionCode}</strong>
              </div>
            )}
          </div>
        </div>

        {/* Center / Right: Controls & Timer */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          
          {/* Timer Clock */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#1E293B', padding: '6px 12px', borderRadius: '4px', border: '1px solid #334155', fontFamily: 'monospace', fontWeight: 'bold', fontSize: '14px', color: '#FBBF24' }}>
            <Clock size={15} />
            <span>⏱️ {engineState.elapsedFormatted}</span>
          </div>

          {/* Play/Pause & Speed Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#1E293B', padding: '4px 8px', borderRadius: '4px', border: '1px solid #334155' }}>
            <button 
              onClick={handlePauseToggle} 
              style={{ background: 'none', border: 'none', color: engineState.isPaused ? '#FBBF24' : '#4ADE80', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px' }}
              title={engineState.isPaused ? 'Resume Simulation' : 'Pause Simulation'}
            >
              {engineState.isPaused ? <Play size={16} fill="#FBBF24" /> : <Pause size={16} fill="#4ADE80" />}
            </button>

            <button 
              onClick={handleStepForward} 
              style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px' }}
              title="Fast forward 5 seconds"
            >
              <FastForward size={14} />
            </button>

            <span style={{ fontSize: '11px', color: '#94A3B8', marginLeft: '4px' }}>Speed:</span>
            {[1, 2, 5].map(s => (
              <button
                key={s}
                onClick={() => setSpeedMultiplier(s)}
                style={{
                  background: speedMultiplier === s ? '#2563EB' : '#334155',
                  color: '#FFF',
                  border: 'none',
                  fontSize: '11px',
                  fontWeight: 'bold',
                  padding: '2px 6px',
                  borderRadius: '3px',
                  cursor: 'pointer'
                }}
              >
                {s}x
              </button>
            ))}
          </div>

          {/* Instructor View Switch (Visible only to instructors) */}
          {isInstructor && (
            <div style={{ display: 'flex', background: '#1E293B', borderRadius: '4px', border: '1px solid #334155', overflow: 'hidden' }}>
              <button
                onClick={() => setActiveTab('instructor')}
                style={{
                  background: activeTab === 'instructor' ? '#2563EB' : 'transparent',
                  color: '#FFF',
                  border: 'none',
                  padding: '6px 12px',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                📊 Delivery Matrix
              </button>

              <button
                onClick={() => setActiveTab('participant')}
                style={{
                  background: activeTab === 'participant' ? '#059669' : 'transparent',
                  color: '#FFF',
                  border: 'none',
                  padding: '6px 12px',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                👤 Trainee View
              </button>
            </div>
          )}

          {/* Finish Exercise Button */}
          <button 
            onClick={() => setShowEndModal(true)}
            style={{
              backgroundColor: '#DC2626',
              color: '#FFF',
              border: 'none',
              padding: '6px 14px',
              fontSize: '12px',
              fontWeight: 'bold',
              borderRadius: '4px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Square size={13} />
            <span>Finish Exercise</span>
          </button>
        </div>
      </div>

      {/* 2. SUB-HEADER / STATUS STRIP */}
      <div 
        style={{ 
          backgroundColor: '#FFFFFF', 
          borderBottom: '1px solid #E2E8F0', 
          padding: '10px 24px', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* Active Role Badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '12px', color: '#64748B' }}>Your Role:</span>
            <span 
              style={{ 
                fontSize: '12px', 
                fontWeight: 'bold', 
                backgroundColor: '#1E293B', 
                color: '#FFF', 
                padding: '3px 10px', 
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <span>{ROLE_LABELS[currentViewRole] || currentViewRole}</span>
              {isInstructor && activeTab === 'participant' && (
                <span style={{ fontSize: '10px', backgroundColor: '#D97706', padding: '1px 5px', borderRadius: '3px' }}>
                  PREVIEW
                </span>
              )}
            </span>
          </div>

          {/* Instructor Trainee Preview Dropdown */}
          {isInstructor && activeTab === 'participant' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '12px', color: '#64748B' }}>Preview Role:</span>
              <select 
                value={previewRole} 
                onChange={(e) => setPreviewRole(e.target.value)}
                style={{ padding: '3px 8px', fontSize: '12px', border: '1px solid #CBD5E1', borderRadius: '4px', fontWeight: 'bold' }}
              >
                <option value={TRAINEE_ROLES.TEAM_LEADER}>Team Leader</option>
                <option value={TRAINEE_ROLES.LAND_MEMBER}>Land Member</option>
                <option value={TRAINEE_ROLES.AIR_MEMBER}>Air Member</option>
                <option value={TRAINEE_ROLES.CYBER_EW_MEMBER}>Cyber/EW Member</option>
              </select>
            </div>
          )}
        </div>

        {/* Dynamic Communication Link Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#B45309', fontWeight: 'bold', background: '#FEF3C7', padding: '4px 10px', borderRadius: '12px', border: '1px solid #FCD34D' }}>
            <Wifi size={14} style={{ color: '#D97706' }} />
            <span>Connection: Unstable (Delays & Dropped Messages Possible)</span>
          </div>

          <div style={{ fontSize: '12px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Activity size={14} style={{ color: '#2563EB' }} />
            <span>Messages Received: <strong>{participantMessages.length}</strong></span>
          </div>
        </div>
      </div>

      {/* 3. MAIN WORKSPACE VIEW */}
      {activeTab === 'participant' ? (
        /* ========================================================================= */
        /* TRAINEE EXERCISE SCREEN (Clean & Simple: Feed, Chat, Decision)             */
        /* ========================================================================= */
        <div style={{ padding: '20px 24px', flexGrow: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          
          {/* Left Panel: Received Messages Feed */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            {/* Mission Goal Box */}
            <div style={{ backgroundColor: '#FFF', border: '1px solid #E2E8F0', borderRadius: '6px', padding: '14px 18px', borderLeft: '4px solid #2563EB' }}>
              <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#2563EB', textTransform: 'uppercase', marginBottom: '2px' }}>
                Mission Goal
              </div>
              <div style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--color-primary-navy)', marginBottom: '4px' }}>
                {scenario?.title}
              </div>
              <p style={{ fontSize: '12px', color: '#475569', lineHeight: '1.5', margin: 0 }}>
                {scenario?.objective || scenario?.shortDesc}
              </p>
            </div>

            {/* My Received Messages Feed */}
            <div style={{ backgroundColor: '#FFF', border: '1px solid #E2E8F0', borderRadius: '6px', padding: '18px', flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid #E2E8F0', paddingBottom: '10px' }}>
                <div>
                  <h3 style={{ fontSize: '15px', fontWeight: 'bold', color: 'var(--color-primary-navy)', margin: 0 }}>
                    Incoming Messages ({participantMessages.length})
                  </h3>
                  <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
                    Messages delivered to your role. Other roles may receive different reports.
                  </div>
                </div>

                <span style={{ fontSize: '11px', background: '#F1F5F9', color: '#334155', padding: '3px 8px', fontWeight: 'bold', borderRadius: '4px' }}>
                  {ROLE_LABELS[currentViewRole] || 'Trainee'} Inbox
                </span>
              </div>

              {participantMessages.length === 0 ? (
                <div style={{ padding: '36px 20px', textAlign: 'center', color: '#64748B', fontSize: '13px', backgroundColor: '#F8FAFC', border: '1px dashed #CBD5E1', borderRadius: '6px', margin: 'auto 0' }}>
                  <Radio size={28} style={{ color: '#94A3B8', marginBottom: '8px' }} />
                  <div style={{ fontWeight: 'bold', color: 'var(--color-primary-navy)', marginBottom: '4px' }}>
                    Waiting for incoming messages...
                  </div>
                  <div>
                    No reports received yet at current time (T+ {engineState.elapsedFormatted}).
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto' }}>
                  {participantMessages.map((ev, index) => {
                    const domainStyle = getDomainBadgeStyle(ev.domain);
                    return (
                      <div 
                        key={ev.deliveredId || ev.id || index}
                        style={{
                          backgroundColor: ev.isConflicting ? '#FFFBEB' : (ev.isTruncated ? '#FEF2F2' : '#FFFFFF'),
                          border: '1px solid #E2E8F0',
                          borderLeft: `4px solid ${ev.isConflicting ? '#D97706' : (ev.isTruncated ? '#DC2626' : '#2563EB')}`,
                          borderRadius: '4px',
                          padding: '12px 14px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '6px'
                        }}
                      >
                        {/* Header: Timestamp, Title & Domain */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontFamily: 'monospace', fontWeight: 'bold', fontSize: '12px', color: '#2563EB' }}>
                              [{formatSecondsToMMSS(ev.actualDeliveryTimeSec || ev.scheduledTimeSec)}]
                            </span>
                            <span style={{ fontWeight: 'bold', fontSize: '14px', color: 'var(--color-primary-navy)' }}>
                              {ev.title}
                            </span>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '10px', fontWeight: 'bold', padding: '2px 6px', borderRadius: '3px', ...domainStyle }}>
                              {ev.domain || 'JOINT'}
                            </span>
                            <span style={{ fontSize: '10px', background: '#F1F5F9', color: '#475569', padding: '2px 6px', fontWeight: 'bold', borderRadius: '3px' }}>
                              Confidence: {ev.confidence || '80%'}
                            </span>
                          </div>
                        </div>

                        {/* Content text */}
                        <div style={{ fontSize: '13px', color: '#334155', lineHeight: '1.5' }}>
                          {ev.content}
                        </div>

                        {/* Simple plain-English warnings */}
                        {ev.isConflicting && (
                          <div style={{ marginTop: '2px', fontSize: '11px', color: '#B45309', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <AlertTriangle size={13} />
                            <span>⚠️ Warning: This report contradicts another incoming update.</span>
                          </div>
                        )}

                        {ev.isTruncated && (
                          <div style={{ marginTop: '2px', fontSize: '11px', color: '#991B1B', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <ShieldAlert size={13} />
                            <span>⚠️ Warning: Part of this message was cut off during transmission.</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>

          {/* Right Panel: Team Chat & Decision Console */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            {/* Team Chat Panel */}
            <TeamCoordinationPanel 
              session={liveSession}
              currentUser={currentUser}
              onSendTeamMessage={handleSendTeamMessage}
            />

<<<<<<< Updated upstream
            {/* Decision Submission Box */}
            <div style={{ backgroundColor: '#FFF', border: '1px solid #E2E8F0', borderRadius: '6px', padding: '18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <div>
                  <h3 style={{ fontSize: '15px', fontWeight: 'bold', color: 'var(--color-primary-navy)', margin: 0 }}>
                    Record Your Decision
                  </h3>
                  <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
                    Document what action you decide to take based on the information you have.
                  </div>
                </div>
              </div>

              <form onSubmit={handleDecisionSubmit}>
                <div className="gov-form-group" style={{ marginBottom: '10px' }}>
                  <label className="gov-form-label" style={{ fontSize: '12px' }}>What action are you taking?</label>
                  <input 
                    type="text"
                    className="gov-form-input"
                    placeholder="e.g. Hold patrol at Sector Alpha until radar confirms route"
                    value={decisionTitle}
                    onChange={(e) => setDecisionTitle(e.target.value)}
                    required
                    style={{ fontSize: '13px' }}
                  />
                </div>
=======
            {/* Decision Submission Box & Structured Decision Point */}
            <div 
              id="decision-console-panel"
              style={{ 
                backgroundColor: '#FFF', 
                border: activeDecisionPoint && isTargetForDecision ? '2px solid #2563EB' : '1px solid #E2E8F0', 
                borderRadius: '6px', 
                padding: '18px', 
                boxShadow: activeDecisionPoint && isTargetForDecision ? '0 0 0 3px rgba(37,99,235,0.1)' : 'none' 
              }}
            >
              {!isTargetForDecision ? (
                /* Non-targeted role: Form hidden, awaiting directive notice shown */
                <div 
                  id="awaiting-decision-notice"
                  style={{ 
                    backgroundColor: '#FEF3C7', 
                    border: '1px solid #FCD34D', 
                    borderRadius: '6px', 
                    padding: '16px 18px', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: '8px' 
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#92400E', fontWeight: 'bold', fontSize: '13px' }}>
                    <Clock size={16} />
                    <span>{activeDecisionPoint ? `Decision Required: ${activeDecisionPoint.title}` : 'Tactical Command Status'}</span>
                  </div>
                  <p style={{ margin: 0, fontSize: '13px', color: '#78350F', lineHeight: '1.4', fontWeight: '500' }}>
                    {awaitingMessage}
                  </p>
                  {activeDecisionPoint && (
                    <div style={{ fontSize: '12px', color: '#92400E', background: '#FFFBEB', padding: '8px 10px', borderRadius: '4px', border: '1px solid #FDE68A', marginTop: '4px' }}>
                      <strong>Directive Prompt:</strong> {activeDecisionPoint.decisionPrompt || activeDecisionPoint.content}
                    </div>
                  )}
                </div>
              ) : (
                /* Targeted role (e.g. Team Leader): Show Decision Required / Command form */
                <>
                  {activeDecisionPoint ? (
                    <div style={{ marginBottom: '14px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ backgroundColor: '#DC2626', color: '#FFF', fontSize: '11px', fontWeight: 'bold', padding: '2px 8px', borderRadius: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            ⚡ DECISION REQUIRED
                          </span>
                          <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 'bold' }}>
                            Triggered T+{activeDecisionPoint.time}
                          </span>
                        </div>
                        {activeDecisionPoint.deadlineSeconds && (
                          <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#DC2626', background: '#FEF2F2', border: '1px solid #FECACA', padding: '2px 8px', borderRadius: '4px' }}>
                            ⏱️ Deadline: {Math.max(0, (parseTimeToSeconds(activeDecisionPoint.time) + activeDecisionPoint.deadlineSeconds) - engineState.elapsedSeconds)}s remaining
                          </div>
                        )}
                      </div>

                      <h3 style={{ fontSize: '15px', fontWeight: 'bold', color: 'var(--color-primary-navy)', margin: '0 0 6px' }}>
                        {activeDecisionPoint.title}
                      </h3>
                      <p style={{ fontSize: '13px', color: '#334155', margin: 0, lineHeight: '1.4', background: '#F8FAFC', padding: '10px 12px', borderRadius: '4px', borderLeft: '3px solid #2563EB' }}>
                        {activeDecisionPoint.decisionPrompt || activeDecisionPoint.content}
                      </p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <div>
                        <h3 style={{ fontSize: '15px', fontWeight: 'bold', color: 'var(--color-primary-navy)', margin: 0 }}>
                          Record Command Decision
                        </h3>
                        <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
                          Document what action you decide to take based on the information you have.
                        </div>
                      </div>
                    </div>
                  )}

                  <form onSubmit={handleDecisionSubmit}>
                  {/* Step 1: Information Sources Used (checkboxes of received messages) */}
                  <div style={{ marginBottom: '12px', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '6px', padding: '10px 12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#1E293B', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <FileText size={13} color="#2563EB" />
                        <span>Information Sources Used (Evidence Check):</span>
                      </label>
                      <span style={{ fontSize: '11px', color: '#64748B' }}>
                        {selectedSources.length} selected of {participantMessages.length} received
                      </span>
                    </div>
>>>>>>> Stashed changes

                <div className="gov-form-group" style={{ marginBottom: '10px' }}>
                  <label className="gov-form-label" style={{ fontSize: '12px' }}>Why? (Reason / Explanation)</label>
                  <textarea 
                    className="gov-form-input"
                    rows={2}
                    placeholder="e.g. Air member reported radar gap, so we cannot advance without verification..."
                    value={rationale}
                    onChange={(e) => setRationale(e.target.value)}
                    required
                    style={{ fontSize: '13px' }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <label className="gov-form-label" style={{ marginBottom: 0, fontSize: '12px' }}>Confidence:</label>
                    <select 
                      className="gov-form-select"
                      value={confidence}
                      onChange={(e) => setConfidence(e.target.value)}
                      style={{ padding: '4px 8px', fontSize: '12px' }}
                    >
                      <option value="High">High Confidence</option>
                      <option value="Medium">Medium Confidence</option>
                      <option value="Low">Low Confidence (High Uncertainty)</option>
                    </select>
                  </div>
<<<<<<< Updated upstream

                  <button 
                    type="submit" 
                    style={{
                      backgroundColor: 'var(--color-primary-navy)',
                      color: '#FFF',
                      border: 'none',
                      padding: '8px 16px',
                      fontSize: '13px',
                      fontWeight: 'bold',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <Send size={13} />
                    <span>Submit Decision</span>
                  </button>
                </div>
              </form>
            </div>
=======
                </form>
              </>
            )}
          </div>
>>>>>>> Stashed changes

            {/* Past Decisions Recorded List */}
            <div style={{ backgroundColor: '#FFF', border: '1px solid #E2E8F0', borderRadius: '6px', padding: '16px', flexGrow: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', borderBottom: '1px solid #E2E8F0', paddingBottom: '6px' }}>
                <h4 style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--color-primary-navy)', margin: 0 }}>
                  Decisions Logged ({decisions.length})
                </h4>
                <span style={{ fontSize: '11px', color: '#64748B' }}>Real-time Audit Log</span>
              </div>

              {decisions.length === 0 ? (
                <div style={{ padding: '14px', textAlign: 'center', color: '#94A3B8', fontSize: '12px' }}>
                  No decisions logged yet. Use the form above when ready.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '180px', overflowY: 'auto' }}>
                  {decisions.map((d, index) => (
                    <div key={d.id || index} style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '4px', padding: '8px 10px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 'bold', color: 'var(--color-primary-navy)' }}>
                        <span>#{index + 1}: {d.title}</span>
                        <span style={{ fontSize: '11px', color: '#2563EB', fontWeight: 'bold' }}>
                          T+ {d.elapsedTimeFormatted || `${d.elapsedMinutes || 0}m`}
                        </span>
                      </div>
                      <div style={{ fontSize: '12px', color: '#475569', marginTop: '2px', lineHeight: '1.4' }}>
                        {d.rationale}
                      </div>
                      <div style={{ fontSize: '10px', color: '#64748B', marginTop: '4px', display: 'flex', justifyContent: 'space-between' }}>
                        <span>By: {d.submittedBy} ({ROLE_LABELS[d.submittedRole] || d.submittedRole})</span>
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
        /* ========================================================================= */
        /* INSTRUCTOR LIVE VIEW — INFORMATION ASYMMETRY DELIVERY MATRIX              */
        /* ========================================================================= */
        <div style={{ padding: '24px', flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Plain English Instructor Orientation Card */}
          <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '6px', borderLeft: '4px solid #2563EB', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#2563EB', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                INSTRUCTOR LIVE OMNISCIENT VIEW
              </div>
              <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--color-primary-navy)', margin: '2px 0 4px' }}>
                Live Message Delivery Matrix
              </h2>
              <p style={{ fontSize: '13px', color: '#64748B', margin: 0, maxWidth: '750px' }}>
                This table shows what actually happened (Truth) on the left, and what each trainee received on the right. Click any row to expand and inspect the exact message seen by each role.
              </p>
            </div>

            {/* Clean Legend */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', fontSize: '11px' }}>
              <span style={{ ...getStatusBadgeStyle('delivered'), padding: '3px 8px', borderRadius: '4px', fontWeight: 'bold' }}>Delivered</span>
              <span style={{ ...getStatusBadgeStyle('delayed'), padding: '3px 8px', borderRadius: '4px', fontWeight: 'bold' }}>Delayed</span>
              <span style={{ ...getStatusBadgeStyle('partial'), padding: '3px 8px', borderRadius: '4px', fontWeight: 'bold' }}>Incomplete</span>
              <span style={{ ...getStatusBadgeStyle('conflicting'), padding: '3px 8px', borderRadius: '4px', fontWeight: 'bold' }}>Conflicting</span>
              <span style={{ ...getStatusBadgeStyle('dropped'), padding: '3px 8px', borderRadius: '4px', fontWeight: 'bold' }}>Dropped (Lost)</span>
            </div>
          </div>

          {/* LIVE INSTRUCTOR DISRUPTION CONTROL PANEL */}
          <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: '6px', padding: '16px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid #E2E8F0', paddingBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Zap size={18} color="#D97706" />
                <h3 style={{ fontSize: '15px', fontWeight: 'bold', color: 'var(--color-primary-navy)', margin: 0, letterSpacing: '0.5px' }}>
                  LIVE DISRUPTION CONTROL
                </h3>
              </div>
              {engineState.activeDisruptions && engineState.activeDisruptions.length > 0 && (
                <button
                  type="button"
                  onClick={() => handleRestoreCommunication('all')}
                  className="gov-btn"
                  style={{ fontSize: '11px', padding: '4px 10px', backgroundColor: '#F1F5F9', color: '#166534', border: '1px solid #86EFAC', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}
                >
                  <RefreshCw size={12} />
                  <span>Restore All</span>
                </button>
              )}
            </div>

            {/* Simple Form Layout */}
            <form onSubmit={handleInjectDisruption} style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'flex-end' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '160px' }}>
                <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#475569' }}>
                  Target:
                </label>
                <select
                  className="gov-form-input"
                  value={disruptionTarget}
                  onChange={(e) => setDisruptionTarget(e.target.value)}
                  style={{ fontSize: '13px', padding: '7px 10px', borderRadius: '4px' }}
                >
                  <option value="all">Entire Team</option>
                  <option value="team_leader">Team Leader</option>
                  <option value="land_member">Land</option>
                  <option value="air_member">Air</option>
                  <option value="cyber_ew_member">Cyber-EW</option>
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '170px' }}>
                <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#475569' }}>
                  Type:
                </label>
                <select
                  className="gov-form-input"
                  value={disruptionType}
                  onChange={(e) => setDisruptionType(e.target.value)}
                  style={{ fontSize: '13px', padding: '7px 10px', borderRadius: '4px' }}
                >
                  <option value="delay">Delay</option>
                  <option value="dropout">Dropout</option>
                  <option value="incomplete">Incomplete Information</option>
                  <option value="conflicting">Conflicting Information</option>
                  <option value="restore">Restore Communication</option>
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '120px' }}>
                <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#475569' }}>
                  Severity:
                </label>
                <select
                  className="gov-form-input"
                  value={disruptionSeverity}
                  onChange={(e) => setDisruptionSeverity(e.target.value)}
                  disabled={disruptionType === 'restore'}
                  style={{ fontSize: '13px', padding: '7px 10px', borderRadius: '4px', opacity: disruptionType === 'restore' ? 0.5 : 1 }}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '120px' }}>
                <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#475569' }}>
                  Duration:
                </label>
                <select
                  className="gov-form-input"
                  value={disruptionDuration}
                  onChange={(e) => setDisruptionDuration(e.target.value)}
                  disabled={disruptionType === 'restore'}
                  style={{ fontSize: '13px', padding: '7px 10px', borderRadius: '4px', opacity: disruptionType === 'restore' ? 0.5 : 1 }}
                >
                  <option value="30">30 sec</option>
                  <option value="60">60 sec</option>
                  <option value="120">120 sec</option>
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'center' }}>
                <button
                  type="submit"
                  className="gov-btn gov-btn-primary"
                  style={{ 
                    padding: '8px 22px', 
                    fontSize: '13px', 
                    fontWeight: 'bold', 
                    backgroundColor: disruptionType === 'restore' ? '#15803D' : '#DC2626', 
                    color: '#FFFFFF', 
                    border: 'none', 
                    borderRadius: '4px', 
                    cursor: 'pointer', 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '6px' 
                  }}
                >
                  <Zap size={14} />
                  <span>{disruptionType === 'restore' ? 'Restore Communication' : 'Inject Disruption'}</span>
                </button>
              </div>
            </form>

            {/* Active countdown display */}
            <div style={{ marginTop: '14px', paddingTop: '10px', borderTop: '1px dashed #CBD5E1' }}>
              <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#334155', marginBottom: '6px' }}>
                Active:
              </div>
              {engineState.activeDisruptions && engineState.activeDisruptions.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {engineState.activeDisruptions.map((dis) => {
                    const typeLabel = dis.typeLabel || DISRUPTION_TYPE_LABELS[dis.disruptionType] || dis.disruptionType;
                    const targetLabel = dis.targetLabel || TARGET_LABELS[dis.target] || dis.target;
                    return (
                      <div
                        key={dis.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '6px 12px',
                          backgroundColor: '#FEF2F2',
                          border: '1px solid #FECACA',
                          borderRadius: '4px',
                          fontSize: '13px',
                          color: '#991B1B'
                        }}
                      >
                        <span style={{ fontWeight: '600' }}>
                          {typeLabel} → {targetLabel} → {dis.remainingSec} sec remaining
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRestoreCommunication(dis.target)}
                          style={{
                            fontSize: '11px',
                            background: '#FFFFFF',
                            border: '1px solid #FCA5A5',
                            color: '#B91C1C',
                            padding: '2px 8px',
                            borderRadius: '3px',
                            cursor: 'pointer',
                            fontWeight: 'bold'
                          }}
                        >
                          Restore
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{ fontSize: '12px', color: '#64748B', fontStyle: 'italic' }}>
                  None (Normal Communications)
                </div>
              )}
            </div>
          </div>

          {/* THE INFORMATION ASYMMETRY TABLE */}
          <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '6px', overflow: 'hidden' }}>
            <div style={{ padding: '12px 20px', borderBottom: '1px solid #E2E8F0', backgroundColor: '#F8FAFC', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--color-primary-navy)', margin: 0 }}>
                Event Delivery Status Table
              </h3>
              <span style={{ fontSize: '12px', color: '#64748B' }}>
                Timer: <strong>T+ {engineState.elapsedFormatted}</strong> • {asymmetryMatrix.length} Events Total
              </span>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#F1F5F9', borderBottom: '2px solid #CBD5E1', textAlign: 'left' }}>
                    <th style={{ padding: '12px 16px', fontWeight: 'bold', color: 'var(--color-primary-navy)' }}>Event Name</th>
                    <th style={{ padding: '12px', fontWeight: 'bold', color: 'var(--color-primary-navy)' }}>Domain</th>
                    <th style={{ padding: '12px', fontWeight: 'bold', color: 'var(--color-primary-navy)' }}>Time</th>
                    <th style={{ padding: '12px', fontWeight: 'bold', color: 'var(--color-primary-navy)' }}>
                      Team Leader
                      {isRoleDegraded('team_leader') && (
                        <span style={{ fontSize: '10px', background: '#FEE2E2', color: '#991B1B', padding: '1px 5px', borderRadius: '3px', marginLeft: '5px' }}>⚡ Degraded</span>
                      )}
                    </th>
                    <th style={{ padding: '12px', fontWeight: 'bold', color: 'var(--color-primary-navy)' }}>
                      Land Member
                      {isRoleDegraded('land_member') && (
                        <span style={{ fontSize: '10px', background: '#FEE2E2', color: '#991B1B', padding: '1px 5px', borderRadius: '3px', marginLeft: '5px' }}>⚡ Degraded</span>
                      )}
                    </th>
                    <th style={{ padding: '12px', fontWeight: 'bold', color: 'var(--color-primary-navy)' }}>
                      Air Member
                      {isRoleDegraded('air_member') && (
                        <span style={{ fontSize: '10px', background: '#FEE2E2', color: '#991B1B', padding: '1px 5px', borderRadius: '3px', marginLeft: '5px' }}>⚡ Degraded</span>
                      )}
                    </th>
                    <th style={{ padding: '12px', fontWeight: 'bold', color: 'var(--color-primary-navy)' }}>
                      Cyber/EW
                      {isRoleDegraded('cyber_ew_member') && (
                        <span style={{ fontSize: '10px', background: '#FEE2E2', color: '#991B1B', padding: '1px 5px', borderRadius: '3px', marginLeft: '5px' }}>⚡ Degraded</span>
                      )}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {asymmetryMatrix.map((row) => {
                    const domainStyle = getDomainBadgeStyle(row.domain);
                    const isExpanded = expandedEventId === row.eventId;

                    const leaderStatus = row.roleStatuses.team_leader;
                    const landStatus = row.roleStatuses.land_member;
                    const airStatus = row.roleStatuses.air_member;
                    const cyberStatus = row.roleStatuses.cyber_ew_member;

                    return (
                      <React.Fragment key={row.eventId}>
                        <tr 
                          onClick={() => setExpandedEventId(isExpanded ? null : row.eventId)}
                          style={{ 
                            borderBottom: '1px solid #E2E8F0',
                            backgroundColor: isExpanded ? '#EFF6FF' : '#FFFFFF',
                            cursor: 'pointer',
                            transition: 'background-color 0.1s ease'
                          }}
                        >
                          <td style={{ padding: '12px 16px', fontWeight: 'bold', color: 'var(--color-primary-navy)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              {isExpanded ? <ChevronDown size={14} color="#2563EB" /> : <ChevronRight size={14} color="#64748B" />}
                              <span>{row.title}</span>
                            </div>
                          </td>

                          <td style={{ padding: '12px' }}>
                            <span style={{ fontSize: '10px', fontWeight: 'bold', padding: '2px 6px', borderRadius: '3px', ...domainStyle }}>
                              {row.domain}
                            </span>
                          </td>

                          <td style={{ padding: '12px', fontFamily: 'monospace', color: '#64748B' }}>
                            {row.scheduledTimeFormatted}
                          </td>

                          {/* Leader */}
                          <td style={{ padding: '12px' }}>
                            <span style={{ fontSize: '11px', fontWeight: 'bold', padding: '3px 8px', borderRadius: '4px', ...getStatusBadgeStyle(leaderStatus?.statusKey) }}>
                              {leaderStatus?.statusText || 'Pending'}
                            </span>
                            {leaderStatus?.isInjected && (
                              <span style={{ fontSize: '9px', background: '#DC2626', color: '#FFF', padding: '1px 4px', borderRadius: '2px', marginLeft: '4px', verticalAlign: 'middle', fontWeight: 'bold' }}>⚡ Injected</span>
                            )}
                          </td>

                          {/* Land */}
                          <td style={{ padding: '12px' }}>
                            <span style={{ fontSize: '11px', fontWeight: 'bold', padding: '3px 8px', borderRadius: '4px', ...getStatusBadgeStyle(landStatus?.statusKey) }}>
                              {landStatus?.statusText || 'Pending'}
                            </span>
                            {landStatus?.isInjected && (
                              <span style={{ fontSize: '9px', background: '#DC2626', color: '#FFF', padding: '1px 4px', borderRadius: '2px', marginLeft: '4px', verticalAlign: 'middle', fontWeight: 'bold' }}>⚡ Injected</span>
                            )}
                          </td>

                          {/* Air */}
                          <td style={{ padding: '12px' }}>
                            <span style={{ fontSize: '11px', fontWeight: 'bold', padding: '3px 8px', borderRadius: '4px', ...getStatusBadgeStyle(airStatus?.statusKey) }}>
                              {airStatus?.statusText || 'Pending'}
                            </span>
                            {airStatus?.isInjected && (
                              <span style={{ fontSize: '9px', background: '#DC2626', color: '#FFF', padding: '1px 4px', borderRadius: '2px', marginLeft: '4px', verticalAlign: 'middle', fontWeight: 'bold' }}>⚡ Injected</span>
                            )}
                          </td>

                          {/* Cyber/EW */}
                          <td style={{ padding: '12px' }}>
                            <span style={{ fontSize: '11px', fontWeight: 'bold', padding: '3px 8px', borderRadius: '4px', ...getStatusBadgeStyle(cyberStatus?.statusKey) }}>
                              {cyberStatus?.statusText || 'Pending'}
                            </span>
                            {cyberStatus?.isInjected && (
                              <span style={{ fontSize: '9px', background: '#DC2626', color: '#FFF', padding: '1px 4px', borderRadius: '2px', marginLeft: '4px', verticalAlign: 'middle', fontWeight: 'bold' }}>⚡ Injected</span>
                            )}
                          </td>
                        </tr>

                        {/* Expandable Comparison Row */}
                        {isExpanded && (
                          <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '2px solid #CBD5E1' }}>
                            <td colSpan={7} style={{ padding: '16px 20px' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                
                                {/* Actual Truth Card */}
                                <div style={{ backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '4px', padding: '12px 14px' }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                    <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#1E40AF', textTransform: 'uppercase' }}>
                                      Ground Truth (What Actually Happened)
                                    </span>
                                    <span style={{ fontSize: '11px', color: '#1E40AF', fontWeight: 'bold' }}>
                                      True Confidence: {row.groundTruthConfidence}
                                    </span>
                                  </div>
                                  <div style={{ fontSize: '13px', color: '#1E3A8A' }}>
                                    {row.groundTruthContent}
                                  </div>
                                </div>

                                {/* Participant Variations Comparison Grid */}
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                                  
                                  {/* Team Leader */}
                                  <div style={{ backgroundColor: '#FFF', border: '1px solid #E2E8F0', borderRadius: '4px', padding: '10px 12px' }}>
                                    <div style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--color-primary-navy)', marginBottom: '4px' }}>
                                      Team Leader saw:
                                    </div>
                                    <div style={{ fontSize: '12px', color: '#334155', minHeight: '40px', lineHeight: '1.4' }}>
                                      {leaderStatus?.isDelivered ? leaderStatus.deliveredContent : <em style={{ color: '#94A3B8' }}>Pending / delayed delivery</em>}
                                    </div>
                                    <div style={{ fontSize: '10px', color: '#64748B', marginTop: '6px' }}>
                                      Status: <strong>{leaderStatus?.statusText}</strong>
                                    </div>
                                  </div>

                                  {/* Land Member */}
                                  <div style={{ backgroundColor: '#FFF', border: '1px solid #E2E8F0', borderRadius: '4px', padding: '10px 12px' }}>
                                    <div style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--color-primary-navy)', marginBottom: '4px' }}>
                                      Land Member saw:
                                    </div>
                                    <div style={{ fontSize: '12px', color: '#334155', minHeight: '40px', lineHeight: '1.4' }}>
                                      {landStatus?.isDelivered ? landStatus.deliveredContent : <em style={{ color: '#94A3B8' }}>Pending / delayed delivery</em>}
                                    </div>
                                    <div style={{ fontSize: '10px', color: '#64748B', marginTop: '6px' }}>
                                      Status: <strong>{landStatus?.statusText}</strong>
                                    </div>
                                  </div>

                                  {/* Air Member */}
                                  <div style={{ backgroundColor: '#FFF', border: '1px solid #E2E8F0', borderRadius: '4px', padding: '10px 12px' }}>
                                    <div style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--color-primary-navy)', marginBottom: '4px' }}>
                                      Air Member saw:
                                    </div>
                                    <div style={{ fontSize: '12px', color: '#334155', minHeight: '40px', lineHeight: '1.4' }}>
                                      {airStatus?.isDelivered ? airStatus.deliveredContent : <em style={{ color: '#94A3B8' }}>Pending / delayed delivery</em>}
                                    </div>
                                    <div style={{ fontSize: '10px', color: '#64748B', marginTop: '6px' }}>
                                      Status: <strong>{airStatus?.statusText}</strong>
                                    </div>
                                  </div>

                                  {/* Cyber/EW */}
                                  <div style={{ backgroundColor: '#FFF', border: '1px solid #E2E8F0', borderRadius: '4px', padding: '10px 12px' }}>
                                    <div style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--color-primary-navy)', marginBottom: '4px' }}>
                                      Cyber/EW saw:
                                    </div>
                                    <div style={{ fontSize: '12px', color: '#334155', minHeight: '40px', lineHeight: '1.4' }}>
                                      {cyberStatus?.behavior === 'dropped' ? (
                                        <span style={{ color: '#DC2626', fontWeight: 'bold' }}>[Message Dropped / Lost]</span>
                                      ) : cyberStatus?.isDelivered ? (
                                        cyberStatus.deliveredContent
                                      ) : (
                                        <em style={{ color: '#94A3B8' }}>Pending / delayed delivery</em>
                                      )}
                                    </div>
                                    <div style={{ fontSize: '10px', color: '#64748B', marginTop: '6px' }}>
                                      Status: <strong>{cyberStatus?.statusText}</strong>
                                    </div>
                                  </div>

                                </div>

                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* INJECTED DISRUPTIONS TIMELINE & AUDIT LOG */}
          <div style={{ backgroundColor: '#FFF', border: '1px solid #E2E8F0', borderRadius: '6px', padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Zap size={16} color="#2563EB" />
                <h3 style={{ fontSize: '15px', fontWeight: 'bold', color: 'var(--color-primary-navy)', margin: 0 }}>
                  Instructor Injected Disruptions Timeline ({engineState.disruptionsLog?.length || 0})
                </h3>
              </div>
              <span style={{ fontSize: '12px', color: '#64748B' }}>
                Recorded for After-Action Debrief & AAR Replay
              </span>
            </div>

            {(!engineState.disruptionsLog || engineState.disruptionsLog.length === 0) ? (
              <div style={{ padding: '16px', textAlign: 'center', color: '#64748B', fontSize: '13px', backgroundColor: '#F8FAFC', borderRadius: '4px' }}>
                No instructor disruptions injected yet in this session.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '2px solid #CBD5E1', textAlign: 'left' }}>
                      <th style={{ padding: '8px 10px' }}>Injected Time</th>
                      <th style={{ padding: '8px 10px' }}>Target</th>
                      <th style={{ padding: '8px 10px' }}>Disruption Type</th>
                      <th style={{ padding: '8px 10px' }}>Severity</th>
                      <th style={{ padding: '8px 10px' }}>Duration</th>
                      <th style={{ padding: '8px 10px' }}>Current Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {engineState.disruptionsLog.map((log, idx) => (
                      <tr key={log.id || idx} style={{ borderBottom: '1px solid #E2E8F0' }}>
                        <td style={{ padding: '8px 10px', fontFamily: 'monospace', fontWeight: 'bold', color: '#2563EB' }}>
                          T+ {formatSecondsToMMSS(log.injectedAtSec || 0)}
                        </td>
                        <td style={{ padding: '8px 10px', fontWeight: 'bold', color: 'var(--color-primary-navy)' }}>
                          {log.targetLabel || TARGET_LABELS[log.target] || log.target}
                        </td>
                        <td style={{ padding: '8px 10px' }}>
                          <span style={{ fontWeight: 'bold', color: log.disruptionType === 'restore' ? '#15803D' : '#991B1B' }}>
                            {log.typeLabel || DISRUPTION_TYPE_LABELS[log.disruptionType] || log.disruptionType}
                          </span>
                        </td>
                        <td style={{ padding: '8px 10px', textTransform: 'capitalize' }}>
                          {log.severity || 'Normal'}
                        </td>
                        <td style={{ padding: '8px 10px' }}>
                          {log.duration ? `${log.duration}s` : 'Immediate'}
                        </td>
                        <td style={{ padding: '8px 10px' }}>
                          <span style={{
                            fontSize: '11px',
                            fontWeight: 'bold',
                            padding: '2px 6px',
                            borderRadius: '3px',
                            backgroundColor: log.status === 'Active' ? '#FEE2E2' : log.status === 'Restored' ? '#DCFCE7' : '#F1F5F9',
                            color: log.status === 'Active' ? '#991B1B' : log.status === 'Restored' ? '#15803D' : '#475569'
                          }}>
                            {log.status || 'Active'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Participant Submitted Decisions Audit List */}
          <div style={{ backgroundColor: '#FFF', border: '1px solid #E2E8F0', borderRadius: '6px', padding: '20px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 'bold', color: 'var(--color-primary-navy)', marginBottom: '12px' }}>
              Live Trainee Decisions Submitted ({decisions.length})
            </h3>

            {decisions.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: '#64748B', fontSize: '13px' }}>
                No participant decisions recorded yet in this exercise.
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '2px solid #E2E8F0', textAlign: 'left' }}>
                    <th style={{ padding: '10px 12px' }}>Time</th>
                    <th style={{ padding: '10px 12px' }}>Decision Action</th>
                    <th style={{ padding: '10px 12px' }}>Reason / Explanation</th>
                    <th style={{ padding: '10px 12px' }}>Trainee Role</th>
                    <th style={{ padding: '10px 12px' }}>Confidence</th>
                  </tr>
                </thead>
                <tbody>
                  {decisions.map((d, i) => (
                    <tr key={d.id || i} style={{ borderBottom: '1px solid #E2E8F0' }}>
                      <td style={{ padding: '10px 12px', fontFamily: 'monospace', fontWeight: 'bold', color: '#2563EB' }}>
                        T+ {d.elapsedTimeFormatted || `${d.elapsedMinutes || 0}m`}
                      </td>
                      <td style={{ padding: '10px 12px', fontWeight: 'bold', color: 'var(--color-primary-navy)' }}>
                        {d.title}
                      </td>
                      <td style={{ padding: '10px 12px', color: '#334155' }}>
                        {d.rationale}
                      </td>
                      <td style={{ padding: '10px 12px', color: '#64748B' }}>
                        {d.submittedBy} ({ROLE_LABELS[d.submittedRole] || d.submittedRole})
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 'bold', padding: '2px 6px', borderRadius: '3px', backgroundColor: d.confidence === 'High' ? '#DCFCE7' : d.confidence === 'Low' ? '#FEE2E2' : '#FEF3C7', color: d.confidence === 'High' ? '#15803D' : d.confidence === 'Low' ? '#991B1B' : '#B45309' }}>
                          {d.confidence}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

        </div>
      )}

      {/* 4. FINISH EXERCISE MODAL */}
      {showEndModal && (
        <div className="gov-modal-overlay" onClick={() => setShowEndModal(false)}>
          <div className="gov-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '460px' }}>
            <div className="gov-modal-header" style={{ backgroundColor: '#DC2626', color: '#FFF' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Square size={16} />
                <span style={{ fontWeight: 'bold' }}>Finish Exercise Session</span>
              </div>
              <button className="gov-modal-close" onClick={() => setShowEndModal(false)} style={{ color: '#FFF' }}>
                <X size={18} />
              </button>
            </div>

            <div className="gov-modal-body">
              <p style={{ fontSize: '13px', color: '#334155', lineHeight: '1.5' }}>
                Are you ready to conclude this exercise? Clock will stop at <strong>T+ {engineState.elapsedFormatted}</strong> and generate an After-Action Debrief (AAR).
              </p>

              <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '4px', padding: '12px', fontSize: '12px', margin: '14px 0' }}>
                <div>• Decisions Recorded: <strong>{decisions.length}</strong></div>
                <div>• Time Elapsed: <strong>{engineState.elapsedFormatted}</strong></div>
                <div>• Connected Participants: <strong>{liveSession?.participants?.length || 1}</strong></div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button className="gov-btn gov-btn-secondary" onClick={() => setShowEndModal(false)}>
                  Continue Exercise
                </button>
                <button 
                  className="gov-btn" 
                  style={{ backgroundColor: '#DC2626', color: '#FFF' }}
                  onClick={() => {
                    setShowEndModal(false);
                    onEndExercise(
                      liveSession || session, 
                      decisions, 
                      Math.ceil(engineState.elapsedSeconds / 60), 
                      groundTruthEvents,
                      asymmetryMatrix,
                      liveSession?.teamMessages || session?.teamMessages || [],
                      engineRef.current?.getDisruptionsLog() || liveSession?.disruptionsLog || []
                    );
                  }}
                >
                  Finish & View Debrief
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
