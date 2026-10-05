import React, { useState } from 'react';
import { X, Users, Copy, CheckCircle, Sparkles, RefreshCw } from 'lucide-react';
import { multiplayerEngine, generateSessionCode } from '../../services/multiplayerEngine';

export const CreateMultiplayerModal = ({ 
  isOpen, 
  onClose, 
  scenarios, 
  currentUser, 
  onSessionCreated 
}) => {
  const [selectedScenarioId, setSelectedScenarioId] = useState(scenarios[0]?.id || '');
  const [sessionName, setSessionName] = useState('');
  const [maxParticipants, setMaxParticipants] = useState(6);
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  // The previewCode is now THE authoritative code — it is passed directly to createSession
  // so the displayed code and the database-persisted code are always identical.
  const [sessionCode] = useState(generateSessionCode());
  const [confirmedSession, setConfirmedSession] = useState(null);

  if (!isOpen) return null;

  const selectedScenario = scenarios.find(s => s.id === selectedScenarioId) || scenarios[0];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setIsLoading(true);

    try {
      const session = await multiplayerEngine.createSession({
        scenario: selectedScenario,
        sessionName: sessionName.trim() || `${selectedScenario?.title?.split('—')[1] || selectedScenario?.title || 'Joint'} Joint Session`,
        maxParticipants,
        creatorServiceId: currentUser?.serviceId || 'OPS-8842-IND',
        creatorRole: currentUser?.role || 'instructor',
        // Pass the instructor-visible code so DB and UI are always in sync
        sessionCode
      });

      setConfirmedSession(session);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to create multiplayer session. Please try again.');
      console.error('Failed to create multiplayer session:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEnterRoom = () => {
    if (confirmedSession) {
      onSessionCreated(confirmedSession);
      onClose();
    }
  };

  const copyCode = () => {
    const codeToCopy = confirmedSession?.sessionCode || sessionCode;
    navigator.clipboard.writeText(codeToCopy).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // After successful backend confirmation, show the code-share panel
  if (confirmedSession) {
    const displayCode = confirmedSession.sessionCode || sessionCode;
    return (
      <div className="gov-modal-overlay" onClick={onClose}>
        <div className="gov-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px' }}>
          <div className="gov-modal-header" style={{ backgroundColor: 'var(--color-primary-navy)', color: '#FFF' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <CheckCircle size={20} style={{ color: '#4ADE80' }} />
              <div style={{ color: '#FFF', fontFamily: 'var(--font-family-serif)', fontSize: '18px', fontWeight: 'bold' }}>
                Session Created — Share Join Code
              </div>
            </div>
            <button className="gov-modal-close" onClick={onClose} style={{ color: '#FFF' }}>
              <X size={20} />
            </button>
          </div>

          <div className="gov-modal-body">
            <div style={{ backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0', padding: '12px 14px', borderRadius: '2px', marginBottom: '20px', fontSize: '13px', color: '#166534' }}>
              <strong>Exercise registered in PostgreSQL.</strong> The session is live and joinable. Share the code below with participants.
            </div>

            <div style={{ backgroundColor: '#0F172A', border: '1px solid #334155', padding: '20px', marginBottom: '20px', textAlign: 'center' }}>
              <div style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 'bold', marginBottom: '8px' }}>SESSION JOIN CODE</div>
              <div style={{ fontFamily: 'monospace', fontSize: '36px', fontWeight: 'bold', letterSpacing: '6px', color: '#F59E0B' }}>
                {displayCode}
              </div>
              <div style={{ fontSize: '11px', color: '#64748B', marginTop: '8px' }}>
                Exercise: {confirmedSession.name}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={copyCode}
                className="gov-btn gov-btn-secondary"
                style={{ fontSize: '13px' }}
              >
                <Copy size={14} />
                <span>{copied ? 'Copied!' : 'Copy Join Code'}</span>
              </button>
              <button
                type="button"
                onClick={handleEnterRoom}
                className="gov-btn gov-btn-primary"
                style={{ fontSize: '13px' }}
              >
                <Users size={14} />
                <span>Enter Training Room</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="gov-modal-overlay" onClick={onClose}>
      <div className="gov-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
        <div className="gov-modal-header" style={{ backgroundColor: 'var(--color-primary-navy)', color: '#FFF' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Users size={20} style={{ color: 'var(--color-gold-accent)' }} />
            <div>
              <div style={{ fontSize: '10px', color: 'var(--color-gold-accent)', fontWeight: 'bold' }}>
                INSTRUCTOR CONSOLE • MULTIPLAYER SESSION BUILDER
              </div>
              <div style={{ color: '#FFF', fontFamily: 'var(--font-family-serif)', fontSize: '18px', fontWeight: 'bold' }}>
                Create Multiplayer Exercise Session
              </div>
            </div>
          </div>
          <button className="gov-modal-close" onClick={onClose} style={{ color: '#FFF' }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="gov-modal-body">
          <div style={{ backgroundColor: 'var(--color-gold-light)', border: '1px solid #FCD34D', padding: '10px 12px', fontSize: '12px', color: '#78350F', marginBottom: '16px' }}>
            <strong>Multiplayer Session Setup:</strong> Multiple participants can join using the generated Join Code to receive role-targeted scenario dispatches and coordinate over team chat.
          </div>

          {errorMsg && (
            <div style={{ backgroundColor: '#FEE2E2', border: '1px solid #FCA5A5', color: '#991B1B', padding: '8px 12px', fontSize: '12px', marginBottom: '14px', borderRadius: '2px' }}>
              {errorMsg}
            </div>
          )}

          <div className="gov-form-group">
            <label className="gov-form-label">Select Scenario Template</label>
            <select 
              className="gov-form-select" 
              value={selectedScenarioId} 
              onChange={(e) => setSelectedScenarioId(e.target.value)}
            >
              {scenarios.map(s => (
                <option key={s.id} value={s.id}>
                  {s.title} ({s.category})
                </option>
              ))}
            </select>
          </div>

          <div className="gov-form-group">
            <label className="gov-form-label">Exercise Session Name</label>
            <input 
              type="text" 
              className="gov-form-input" 
              placeholder={`e.g. ${selectedScenario?.title?.split('—')[1] || 'Joint'} Operational Exercise`} 
              value={sessionName} 
              onChange={(e) => setSessionName(e.target.value)}
            />
          </div>

          <div className="gov-form-group">
            <label className="gov-form-label">Max Participants Capacity</label>
            <select 
              className="gov-form-select" 
              value={maxParticipants} 
              onChange={(e) => setMaxParticipants(parseInt(e.target.value, 10))}
            >
              <option value={2}>2 Participants (Pair Coordination)</option>
              <option value={4}>4 Participants (Squad Command)</option>
              <option value={6}>6 Participants (Joint Task Group)</option>
              <option value={12}>12 Participants (Multi-Agency Mesh)</option>
            </select>
          </div>

          <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #CBD5E1', padding: '14px', marginBottom: '20px' }}>
            <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748B' }}>GENERATED JOIN CODE (will be persisted exactly as shown)</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px' }}>
              <div style={{ fontFamily: 'monospace', fontSize: '24px', fontWeight: 'bold', letterSpacing: '2px', color: 'var(--color-primary-navy)' }}>
                {sessionCode}
              </div>
              <button 
                type="button" 
                onClick={copyCode}
                className="gov-btn gov-btn-secondary"
                style={{ fontSize: '12px', padding: '4px 10px' }}
              >
                <Copy size={13} />
                <span>{copied ? 'Copied!' : 'Copy Code'}</span>
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid #E2E8F0', paddingTop: '14px' }}>
            <button type="button" className="gov-btn gov-btn-secondary" onClick={onClose} disabled={isLoading}>
              Cancel
            </button>
            <button type="submit" className="gov-btn gov-btn-primary" disabled={isLoading}>
              {isLoading ? (
                <>
                  <RefreshCw size={15} className="animate-spin" />
                  <span>Creating Session...</span>
                </>
              ) : (
                <>
                  <Sparkles size={15} />
                  <span>Initialize Multiplayer Session</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
