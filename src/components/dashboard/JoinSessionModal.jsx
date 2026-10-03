import React, { useState } from 'react';
import { X, LogIn, Users, CheckCircle, ShieldAlert } from 'lucide-react';
import { multiplayerEngine } from '../../services/multiplayerEngine';

export const JoinSessionModal = ({ 
  isOpen, 
  onClose, 
  currentUser, 
  onJoinedSession 
}) => {
  const [sessionCode, setSessionCode] = useState('');
  const [displayName, setDisplayName] = useState(currentUser?.serviceId || 'Participant Node Alpha');
  const [role, setRole] = useState('commander');
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!sessionCode.trim()) {
      setErrorMsg('Please enter a valid 6-character Join Code.');
      return;
    }

    try {
      const session = multiplayerEngine.joinSession(sessionCode.trim(), {
        serviceId: currentUser?.serviceId || `USER-${Math.floor(1000 + Math.random() * 9000)}`,
        displayName: displayName.trim(),
        role
      });

      onJoinedSession(session);
      onClose();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to join session. Verify Join Code.');
    }
  };

  return (
    <div className="gov-modal-overlay" onClick={onClose}>
      <div className="gov-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
        <div className="gov-modal-header" style={{ backgroundColor: 'var(--color-primary-navy)', color: '#FFF' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Users size={18} style={{ color: 'var(--color-gold-accent)' }} />
            <span style={{ color: '#FFF', fontFamily: 'var(--font-family-serif)', fontWeight: 'bold' }}>
              Join Multiplayer Exercise Session
            </span>
          </div>
          <button className="gov-modal-close" onClick={onClose} style={{ color: '#FFF' }}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="gov-modal-body">
          {errorMsg && (
            <div style={{ backgroundColor: '#FEE2E2', border: '1px solid #FCA5A5', color: '#991B1B', padding: '8px 12px', fontSize: '12px', marginBottom: '14px', borderRadius: '2px' }}>
              {errorMsg}
            </div>
          )}

          <div className="gov-form-group">
            <label className="gov-form-label">Session Join Code</label>
            <input 
              type="text" 
              className="gov-form-input" 
              style={{ textTransform: 'uppercase', fontFamily: 'monospace', letterSpacing: '2px', fontWeight: 'bold', fontSize: '16px' }}
              placeholder="e.g. FOG-7429" 
              value={sessionCode} 
              onChange={(e) => setSessionCode(e.target.value)}
              required 
            />
          </div>

          <div className="gov-form-group">
            <label className="gov-form-label">Participant Display Name</label>
            <input 
              type="text" 
              className="gov-form-input" 
              placeholder="e.g. Commander Alpha" 
              value={displayName} 
              onChange={(e) => setDisplayName(e.target.value)}
              required 
            />
          </div>

          <div className="gov-form-group">
            <label className="gov-form-label">Assigned Tactical Role</label>
            <select className="gov-form-select" value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="commander">Commander (Strategic Command)</option>
              <option value="field_unit">Field Unit / Forward Observer</option>
              <option value="logistics">Logistics Hub Coordinator</option>
              <option value="signals">Signals & Relay Officer</option>
            </select>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid #E2E8F0', paddingTop: '14px', marginTop: '16px' }}>
            <button type="button" className="gov-btn gov-btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="gov-btn gov-btn-primary">
              <LogIn size={15} />
              <span>Connect to Session</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
