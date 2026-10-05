import React, { useState } from 'react';
import { X, LogIn, Users, RefreshCw, AlertTriangle } from 'lucide-react';
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
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    const cleanCode = sessionCode.trim().toUpperCase();

    if (!cleanCode) {
      setErrorMsg('Please enter a valid Join Code (e.g. FOG-7429).');
      return;
    }

    // Basic format validation — codes start with FOG- or are alphanumeric
    if (cleanCode.length < 4) {
      setErrorMsg('Join Code is too short. Please check and try again.');
      return;
    }

    setIsLoading(true);

    try {
      const session = await multiplayerEngine.joinSession(cleanCode, {
        // Use the serviceId from the signed-in user (works in both instructor/participant roles).
        // A random fallback is generated if the user somehow has no serviceId.
        serviceId: currentUser?.serviceId || `USER-${Math.floor(1000 + Math.random() * 9000)}`,
        displayName: displayName.trim() || currentUser?.serviceId || 'Participant',
        role
      });

      onJoinedSession(session);
      onClose();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to join session. Please verify the Join Code and try again.');
    } finally {
      setIsLoading(false);
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
          <button className="gov-modal-close" onClick={onClose} style={{ color: '#FFF' }} disabled={isLoading}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="gov-modal-body">
          {errorMsg && (
            <div style={{ backgroundColor: '#FEE2E2', border: '1px solid #FCA5A5', color: '#991B1B', padding: '10px 12px', fontSize: '12px', marginBottom: '14px', borderRadius: '2px', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
              <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: '1px' }} />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="gov-form-group">
            <label className="gov-form-label">Session Join Code</label>
            <input 
              id="join-session-code-input"
              type="text" 
              className="gov-form-input" 
              style={{ textTransform: 'uppercase', fontFamily: 'monospace', letterSpacing: '2px', fontWeight: 'bold', fontSize: '16px' }}
              placeholder="e.g. FOG-7429" 
              value={sessionCode} 
              onChange={(e) => setSessionCode(e.target.value)}
              disabled={isLoading}
              autoFocus
              required 
            />
            <div style={{ fontSize: '11px', color: '#64748B', marginTop: '4px' }}>
              Enter the code provided by your Exercise Instructor.
            </div>
          </div>

          <div className="gov-form-group">
            <label className="gov-form-label">Participant Display Name</label>
            <input 
              id="join-session-display-name-input"
              type="text" 
              className="gov-form-input" 
              placeholder="e.g. Commander Alpha" 
              value={displayName} 
              onChange={(e) => setDisplayName(e.target.value)}
              disabled={isLoading}
              required 
            />
          </div>

          <div className="gov-form-group">
            <label className="gov-form-label">Assigned Tactical Role</label>
            <select
              id="join-session-role-select"
              className="gov-form-select"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              disabled={isLoading}
            >
              <option value="commander">Commander (Strategic Command)</option>
              <option value="field_unit">Field Unit / Forward Observer</option>
              <option value="logistics">Logistics Hub Coordinator</option>
              <option value="signals">Signals &amp; Relay Officer</option>
            </select>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid #E2E8F0', paddingTop: '14px', marginTop: '16px' }}>
            <button type="button" className="gov-btn gov-btn-secondary" onClick={onClose} disabled={isLoading}>
              Cancel
            </button>
            <button type="submit" className="gov-btn gov-btn-primary" disabled={isLoading}>
              {isLoading ? (
                <>
                  <RefreshCw size={15} className="animate-spin" />
                  <span>Connecting to Session...</span>
                </>
              ) : (
                <>
                  <LogIn size={15} />
                  <span>Connect to Session</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
