import React, { useState, useEffect } from 'react';
import { 
  Radio, 
  Clock, 
  ShieldAlert, 
  Send, 
  CheckCircle, 
  Square, 
  AlertTriangle,
  FileText,
  User,
  X
} from 'lucide-react';

export const TrainingRoom = ({ 
  session, 
  scenario, 
  currentUser, 
  onSaveDecision, 
  onEndExercise, 
  existingDecisions = [] 
}) => {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [decisionTitle, setDecisionTitle] = useState('');
  const [rationale, setRationale] = useState('');
  const [confidence, setConfidence] = useState('Medium');
  const [showEndModal, setShowEndModal] = useState(false);
  const [decisions, setDecisions] = useState(existingDecisions);

  // Timer effect
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedSeconds(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTimer = (totalSec) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
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
      elapsedMinutes: Math.floor(elapsedSeconds / 60),
      elapsedTimeFormatted: formatTimer(elapsedSeconds)
    };

    onSaveDecision(session.id, newDecision);
    setDecisions([...decisions, newDecision]);
    setDecisionTitle('');
    setRationale('');
  };

  const eventsList = scenario?.events || [
    { id: 'ev-1', time: '00:00', title: 'Initial Dispatch Received', type: 'info', content: 'Base command orders unit realignment along Sector Bravo. Telemetry link operational.' },
    { id: 'ev-2', time: '05:00', title: 'Signal Attenuation Warning', type: 'warning', content: 'RF interference detected. Telemetry packet delay increased by 300 seconds.' }
  ];

  return (
    <div style={{ minHeight: 'calc(100vh - 64px)', backgroundColor: '#F4F6F8', display: 'flex', flexDirection: 'column' }}>
      {/* Top Banner Bar for Training Room */}
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
          gap: '12px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '32px', height: '32px', background: 'var(--color-terracotta)', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '2px' }}>
            <Radio size={18} />
          </div>
          <div>
            <div style={{ fontSize: '10px', color: 'var(--color-gold-accent)', fontWeight: 'bold' }}>
              TRAINING ROOM ACTIVE • {scenario?.code || 'SCEN-101'}
            </div>
            <div style={{ fontFamily: 'var(--font-family-serif)', fontSize: '18px', fontWeight: 'bold' }}>
              {session.name}
            </div>
          </div>
        </div>

        {/* Live Exercise Stats Strip */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', fontSize: '13px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#1E293B', padding: '6px 12px', border: '1px solid #334155' }}>
            <Clock size={14} style={{ color: '#F59E0B' }} />
            <span>Elapsed: <strong style={{ color: '#F59E0B', fontFamily: 'monospace' }}>{formatTimer(elapsedSeconds)}</strong></span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#1E293B', padding: '6px 12px', border: '1px solid #334155' }}>
            <User size={14} style={{ color: '#38BDF8' }} />
            <span>Operator: <strong>{currentUser?.serviceId || 'OPS-8842-IND'}</strong></span>
          </div>

          <button 
            onClick={() => setShowEndModal(true)}
            style={{
              backgroundColor: '#DC2626',
              color: '#FFF',
              border: 'none',
              padding: '8px 16px',
              fontSize: '13px',
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

      {/* Main Split Interface */}
      <div style={{ padding: '24px', flexGrow: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        {/* Left Side: Scenario Briefing & Event Timeline */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Briefing Card */}
          <div style={{ backgroundColor: '#FFF', border: '1px solid #CBD5E1', padding: '20px', borderTop: '3px solid var(--color-primary-navy)' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--color-primary-navy)', marginBottom: '8px' }}>
              Fictional Scenario Briefing
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--color-text-primary)', lineHeight: '1.6', marginBottom: '12px' }}>
              {scenario?.shortDesc}
            </p>
            <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', padding: '10px', fontSize: '12px' }}>
              <strong>Training Objective:</strong> {scenario?.objective}
            </div>
          </div>

          {/* Event Sequence Stream */}
          <div style={{ backgroundColor: '#FFF', border: '1px solid #CBD5E1', padding: '20px', flexGrow: 1 }}>
            <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--color-primary-navy)', marginBottom: '12px' }}>
              Communication Event Log Stream
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {eventsList.map((ev) => (
                <div 
                  key={ev.id} 
                  style={{
                    backgroundColor: ev.type === 'warning' ? '#FEF3C7' : '#F8FAFC',
                    border: '1px solid #CBD5E1',
                    borderLeft: `4px solid ${ev.type === 'warning' ? '#D97706' : 'var(--color-primary-navy)'}`,
                    padding: '12px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 'bold', color: 'var(--color-primary-navy)' }}>
                    <span>[{ev.time}] {ev.title}</span>
                    <span style={{ fontSize: '10px', textTransform: 'uppercase', color: '#64748B' }}>{ev.type}</span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#334155', marginTop: '4px', lineHeight: '1.4' }}>
                    {ev.content}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Side: Decision Control Console & Log History */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Decision Form */}
          <div style={{ backgroundColor: '#FFF', border: '1px solid #CBD5E1', borderTop: '3px solid var(--color-terracotta)', padding: '20px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--color-primary-navy)', marginBottom: '4px' }}>
              Decision Control & Rationale Console
            </h3>
            <p style={{ fontSize: '12px', color: '#64748B', marginBottom: '14px' }}>
              Record your tactical action and explicit decision rationale. Timestamp will be automatically appended.
            </p>

            <form onSubmit={handleDecisionSubmit}>
              <div className="gov-form-group">
                <label className="gov-form-label">Decision / Command Action Title</label>
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

          {/* Submitted Decisions History */}
          <div style={{ backgroundColor: '#FFF', border: '1px solid #CBD5E1', padding: '20px', flexGrow: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', borderBottom: '1px solid #E2E8F0', paddingBottom: '8px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 'bold', color: 'var(--color-primary-navy)' }}>
                Recorded Decisions Log ({decisions.length})
              </h3>
              <span style={{ fontSize: '11px', color: '#64748B' }}>Audit Trail Active</span>
            </div>

            {decisions.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: '#64748B', fontSize: '13px' }}>
                No decisions recorded yet. Use the control console above to record your command actions.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {decisions.map((d, index) => (
                  <div key={d.id || index} style={{ backgroundColor: '#F8FAFC', border: '1px solid #CBD5E1', padding: '10px 12px' }}>
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
                      <span>Confidence: {d.confidence}</span>
                      <span>Recorded: {new Date(d.timestamp).toLocaleTimeString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

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
                Are you sure you want to end this training exercise session?
              </p>
              <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #CBD5E1', padding: '10px', fontSize: '12px', color: '#475569', marginBottom: '20px' }}>
                Total Decisions Recorded: <strong>{decisions.length}</strong><br />
                Elapsed Duration: <strong>{formatTimer(elapsedSeconds)}</strong><br />
                An After-Action Review (AAR) record will be generated automatically.
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
                    onEndExercise(session, decisions, Math.floor(elapsedSeconds / 60));
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
