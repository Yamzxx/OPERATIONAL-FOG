import React, { useState, useEffect, useRef } from 'react';
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
  Users
} from 'lucide-react';
import { EventEngine, DELIVERY_STATUS, formatSecondsToMMSS } from '../../services/eventEngine';
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
  const [engineState, setEngineState] = useState({
    elapsedSeconds: 0,
    elapsedFormatted: '00:00',
    isRunning: true,
    isPaused: false,
    deliveredCount: 0,
    delayedCount: 0,
    droppedCount: 0
  });

  const [speedMultiplier, setSpeedMultiplier] = useState(1);
  const [activeTab, setActiveTab] = useState('participant'); // 'participant' | 'instructor'
  const [decisionTitle, setDecisionTitle] = useState('');
  const [rationale, setRationale] = useState('');
  const [confidence, setConfidence] = useState('Medium');
  const [showEndModal, setShowEndModal] = useState(false);
  const [decisions, setDecisions] = useState(existingDecisions);
  const [liveSession, setLiveSession] = useState(session);

  const engineRef = useRef(null);

  // Subscribe to real-time multiplayer updates
  useEffect(() => {
    setLiveSession(session);

    const unsubscribeMP = multiplayerEngine.subscribe((event) => {
      if (session?.sessionCode) {
        const updated = multiplayerEngine.getSessionByCode(session.sessionCode);
        if (updated) {
          setLiveSession({ ...updated });
          if (updated.decisions) {
            setDecisions([...updated.decisions]);
          }
        }
      }
    });

    return () => {
      unsubscribeMP();
    };
  }, [session]);

  // Instantiate EventEngine on mount
  useEffect(() => {
    const engine = new EventEngine(scenario);
    engineRef.current = engine;
    engine.start();

    const unsubscribe = engine.subscribe((state) => {
      setEngineState({ ...state });
    });

    return () => {
      unsubscribe();
    };
  }, [scenario]);

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

  const handleDecisionSubmit = (e) => {
    e.preventDefault();
    if (!decisionTitle.trim() || !rationale.trim()) return;

    const newDecision = {
      id: `dec-${Date.now()}`,
      title: decisionTitle.trim(),
      rationale: rationale.trim(),
      confidence,
      timestamp: new Date().toISOString(),
      elapsedMinutes: Math.floor(engineState.elapsedSeconds / 60),
      elapsedTimeFormatted: engineState.elapsedFormatted,
      submittedBy: currentUser?.serviceId || 'Operator',
      submittedRole: currentUser?.role || 'commander'
    };

    if (session?.sessionCode) {
      multiplayerEngine.submitDecision(session.sessionCode, newDecision);
    } else {
      onSaveDecision(session.id, newDecision);
      setDecisions([...decisions, newDecision]);
    }

    showToast(`Decision "${newDecision.title}" logged at T+${newDecision.elapsedTimeFormatted}.`, 'success');

    setDecisionTitle('');
    setRationale('');
  };

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

  // Get participant visible messages
  const userRole = currentUser?.role || 'participant';
  const participantMessages = engineRef.current ? engineRef.current.getParticipantMessages(userRole) : [];
  const instructorLog = engineRef.current ? engineRef.current.getInstructorLog() : [];

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
              style={{ background: 'none', border: 'none', color: engineState.isPaused ? '#F59E0B' : '#4ADE80', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
              title={engineState.isPaused ? 'Resume Engine' : 'Pause Engine'}
            >
              {engineState.isPaused ? <Play size={16} /> : <Pause size={16} />}
            </button>

            <button 
              onClick={handleStepForward} 
              style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
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
            style={{
              backgroundColor: '#DC2626',
              color: '#FFF',
              border: 'none',
              padding: '8px 14px',
              fontSize: '12px',
              fontWeight: 'bold',
              borderRadius: '2px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Square size={14} />
            <span>End Exercise</span>
          </button>
        </div>
      </div>

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

              <form onSubmit={handleDecisionSubmit}>
                <div className="gov-form-group">
                  <label className="gov-form-label">Command Decision Title</label>
                  <input 
                    type="text"
                    className="gov-form-input"
                    placeholder="e.g. Issue Hold Order pending timestamp verification"
                    value={decisionTitle}
                    onChange={(e) => setDecisionTitle(e.target.value)}
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
                    >
                      <option value="High">High Confidence</option>
                      <option value="Medium">Medium Confidence</option>
                      <option value="Low">Low Confidence (High Friction)</option>
                    </select>
                  </div>

                  <button type="submit" className="gov-btn gov-btn-primary" style={{ padding: '10px 20px' }}>
                    <Send size={15} />
                    <span>Log Decision</span>
                  </button>
                </div>
              </form>
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
                Are you sure you want to end this exercise session?
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
                  onClick={() => {
                    setShowEndModal(false);
                    if (session?.sessionCode) {
                      multiplayerEngine.endExercise(session.sessionCode);
                    }
                    onEndExercise(session, decisions, Math.floor(engineState.elapsedSeconds / 60));
                  }}
                >
                  Confirm & End Session
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
