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
  const [displayName, setDisplayName] = useState(currentUser?.serviceId || 'Trainee');
  const [role, setRole] = useState(currentUser?.role || 'team_leader');
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    const cleanCode = sessionCode.trim().toUpperCase();

    if (!cleanCode) {
      setErrorMsg('Please enter a valid Join Code (e.g. ALPHA-942 or FOG-7429).');
      return;
    }

    // Basic format validation — codes are at least 4 characters
    if (cleanCode.length < 4) {
      setErrorMsg('Join Code is too short. Please check and try again.');
      return;
    }

    setIsLoading(true);

    try {
      const session = await multiplayerEngine.joinSession(cleanCode, {
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
      <div className="gov-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px' }}>
        <div className="gov-modal-header" style={{ backgroundColor: 'var(--color-primary-navy)', color: '#FFF' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Users size={18} style={{ color: '#FBBF24' }} />
            <span style={{ color: '#FFF', fontFamily: 'var(--font-family-serif)', fontWeight: 'bold' }}>
              Join Team Exercise Room
            </span>
          </div>
          <button className="gov-modal-close" onClick={onClose} style={{ color: '#FFF' }} disabled={isLoading}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="gov-modal-body">
          {errorMsg && (
            <div style={{ backgroundColor: '#FEE2E2', border: '1px solid #FCA5A5', color: '#991B1B', padding: '10px 12px', fontSize: '12px', marginBottom: '14px', borderRadius: '4px', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
              <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: '1px' }} />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="gov-form-group">
            <label className="gov-form-label">Room / Join Code</label>
            <input 
              id="join-session-code-input"
              type="text" 
              className="gov-form-input" 
              style={{ textTransform: 'uppercase', fontFamily: 'monospace', letterSpacing: '2px', fontWeight: 'bold', fontSize: '15px' }}
              placeholder="e.g. ALPHA-942 or FOG-7429" 
              value={sessionCode} 
              onChange={(e) => setSessionCode(e.target.value)}
              disabled={isLoading}
              autoFocus
              required 
            />
            <div style={{ fontSize: '11px', color: '#64748B', marginTop: '4px' }}>
              Enter the room code provided by your Exercise Instructor.
            </div>
          </div>

          <div className="gov-form-group">
            <label className="gov-form-label">Your Name</label>
            <input 
              id="join-session-display-name-input"
              type="text" 
              className="gov-form-input" 
              placeholder="e.g. Rahul / Officer 1" 
              value={displayName} 
              onChange={(e) => setDisplayName(e.target.value)}
              disabled={isLoading}
              required 
            />
          </div>

          <div className="gov-form-group">
            <label className="gov-form-label">Select Your Role</label>
            <select
              id="join-session-role-select"
              className="gov-form-select"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              disabled={isLoading}
            >
              <option value="team_leader">Team Leader (Makes final decisions, messages can be delayed)</option>
              <option value="land_member">Land Member (Receives ground patrol reports)</option>
              <option value="air_member">Air Member (Receives radar & aerial alerts)</option>
              <option value="cyber_ew_member">Cyber/EW Member (Receives jamming & signals alerts)</option>
              <option value="instructor">Instructor (Observer / Controller)</option>
            </select>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', borderTop: '1px solid #E2E8F0', paddingTop: '12px', marginTop: '14px' }}>
            <button type="button" className="gov-btn gov-btn-secondary" onClick={onClose} disabled={isLoading}>
              Cancel
            </button>
            <button type="submit" className="gov-btn gov-btn-primary" disabled={isLoading}>
              {isLoading ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  <span>Joining Room...</span>
                </>
              ) : (
                <>
                  <LogIn size={14} />
                  <span>Join Room</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
