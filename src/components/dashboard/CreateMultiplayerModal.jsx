import React, { useState } from 'react';
import { X, Users, Copy, CheckCircle, ShieldAlert, Sparkles, Radio } from 'lucide-react';
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
  const [previewCode] = useState(generateSessionCode());

  if (!isOpen) return null;

  const selectedScenario = scenarios.find(s => s.id === selectedScenarioId) || scenarios[0];

  const handleSubmit = (e) => {
    e.preventDefault();

    const session = multiplayerEngine.createSession({
      scenario: selectedScenario,
      sessionName: sessionName.trim() || `${selectedScenario.title.split('—')[1] || selectedScenario.title} Joint Session`,
      maxParticipants,
      creatorServiceId: currentUser?.serviceId || 'OPS-8842-IND',
      creatorRole: currentUser?.role || 'instructor'
    });

    onSessionCreated(session);
    onClose();
  };

  const copyCode = () => {
    navigator.clipboard.writeText(previewCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

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
            <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748B' }}>GENERATED JOIN CODE</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px' }}>
              <div style={{ fontFamily: 'monospace', fontSize: '24px', fontWeight: 'bold', letterSpacing: '2px', color: 'var(--color-primary-navy)' }}>
                {previewCode}
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
            <button type="button" className="gov-btn gov-btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="gov-btn gov-btn-primary">
              <Sparkles size={15} />
              <span>Initialize Multiplayer Session</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
