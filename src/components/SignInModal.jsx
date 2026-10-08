import React, { useState } from 'react';
import { NationalEmblem } from './EmblemAndFlag';
import { ShieldCheck, Lock, CheckCircle, LogOut, RefreshCw, X } from 'lucide-react';
import { useToast } from './Toast';

export const SignInModal = ({ isOpen, onClose, onSignInSuccess, currentUser, onSignOut }) => {
  const { showToast } = useToast();
  const [role, setRole] = useState('instructor');
  const [serviceId, setServiceId] = useState('Instructor-01');
  const [password, setPassword] = useState('••••••••••••');
  const [captchaInput, setCaptchaInput] = useState('');
  const [num1] = useState(8);
  const [num2] = useState(4);
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  // If already signed in, display the Authenticated Dashboard Preview
  if (currentUser) {
    return (
      <div className="gov-modal-overlay" onClick={onClose}>
        <div className="gov-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '580px' }}>
          <div className="gov-modal-header" style={{ backgroundColor: 'var(--color-primary-navy)', color: '#FFF' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <ShieldCheck size={20} style={{ color: '#FBBF24' }} />
              <span style={{ color: '#FFF', fontFamily: 'var(--font-family-serif)', fontWeight: 'bold' }}>
                Active User Profile
              </span>
            </div>
            <button className="gov-modal-close" onClick={onClose} style={{ color: '#FFF' }}>
              <X size={20} />
            </button>
          </div>

          <div className="gov-modal-body">
            <div style={{ backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0', padding: '14px', borderRadius: '4px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <CheckCircle size={22} style={{ color: '#16A34A' }} />
              <div>
                <div style={{ fontWeight: 'bold', color: '#15803D' }}>Logged In</div>
                <div style={{ fontSize: '13px', color: '#166534' }}>
                  User: <strong>{currentUser.serviceId}</strong> • Role: <strong>{currentUser.role.toUpperCase()}</strong>
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
              <div style={{ border: '1px solid #E2E8F0', borderRadius: '4px', padding: '14px', background: '#F8FAFC' }}>
                <div style={{ fontWeight: 'bold', fontSize: '13px', color: 'var(--color-primary-navy)' }}>
                  Start an Exercise
                </div>
                <div style={{ fontSize: '12px', color: '#64748B', margin: '4px 0 10px' }}>
                  Launch the live simulator to practice decision-making.
                </div>
                <button 
                  className="gov-btn gov-btn-primary" 
                  style={{ width: '100%', fontSize: '12px', padding: '6px' }}
                  onClick={() => { onClose(); showToast('Navigating to Exercise Launcher.', 'info'); }}
                >
                  Go to Simulator
                </button>
              </div>

              <div style={{ border: '1px solid #E2E8F0', borderRadius: '4px', padding: '14px', background: '#F8FAFC' }}>
                <div style={{ fontWeight: 'bold', fontSize: '13px', color: 'var(--color-primary-navy)' }}>
                  Switch Role
                </div>
                <div style={{ fontSize: '12px', color: '#64748B', margin: '4px 0 10px' }}>
                  Sign out to switch between Instructor and Trainee roles.
                </div>
                <button 
                  className="gov-btn gov-btn-secondary" 
                  style={{ width: '100%', fontSize: '12px', padding: '6px' }}
                  onClick={onSignOut}
                >
                  Sign Out / Switch
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '10px', borderTop: '1px solid #E2E8F0' }}>
              <button 
                className="gov-btn" 
                style={{ background: '#DC2626', color: '#FFF', fontSize: '12px', padding: '6px 14px' }}
                onClick={onSignOut}
              >
                <LogOut size={13} />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (parseInt(captchaInput.trim(), 10) !== num1 + num2) {
      setErrorMsg('Security Captcha incorrect. Please enter 12.');
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      onSignInSuccess({
        serviceId,
        role,
        authenticatedAt: new Date().toISOString()
      });
    }, 400);
  };

  return (
    <div className="gov-modal-overlay" onClick={onClose}>
      <div className="gov-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
        <div className="gov-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <NationalEmblem height={32} />
            <div>
              <div style={{ fontSize: '10px', color: '#B45309', fontWeight: 'bold' }}>
                TRAINING PORTAL
              </div>
              <div className="gov-modal-title">Sign In — Operational Fog</div>
            </div>
          </div>
          <button className="gov-modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="gov-modal-body">
          <div style={{ backgroundColor: '#FEF3C7', border: '1px solid #FCD34D', borderRadius: '4px', padding: '10px 12px', fontSize: '12px', color: '#78350F', marginBottom: '14px' }}>
            <strong>Demo Portal:</strong> Select a role to log in. You can switch roles anytime to test different viewpoints.
          </div>

          {errorMsg && (
            <div style={{ backgroundColor: '#FEE2E2', border: '1px solid #FCA5A5', color: '#991B1B', padding: '8px 12px', fontSize: '12px', marginBottom: '12px', borderRadius: '4px' }}>
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="gov-form-group">
              <label className="gov-form-label">Choose Your Role</label>
              <select 
                className="gov-form-select" 
                value={role} 
                onChange={(e) => {
                  const newRole = e.target.value;
                  setRole(newRole);
                  if (newRole === 'instructor') setServiceId('Instructor-01');
                  else if (newRole === 'team_leader') setServiceId('Leader-01');
                  else if (newRole === 'land_member') setServiceId('Land-01');
                  else if (newRole === 'air_member') setServiceId('Air-01');
                  else if (newRole === 'cyber_ew_member') setServiceId('Cyber-01');
                }}
              >
                <option value="instructor">Instructor (Sees true events & all delivery statuses)</option>
                <option value="team_leader">Team Leader (Makes final decisions, messages can be delayed)</option>
                <option value="land_member">Land Member (Receives ground reconnaissance reports)</option>
                <option value="air_member">Air Member (Receives radar & aerial alerts)</option>
                <option value="cyber_ew_member">Cyber/EW Member (Receives signals & jamming alerts)</option>
              </select>
            </div>

            <div className="gov-form-group">
              <label className="gov-form-label">Username / Call-Sign</label>
              <input 
                type="text" 
                className="gov-form-input" 
                value={serviceId} 
                onChange={(e) => setServiceId(e.target.value)}
                required 
              />
            </div>

            <div className="gov-form-group">
              <label className="gov-form-label">Password</label>
              <input 
                type="password" 
                className="gov-form-input" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)}
                required 
              />
            </div>

            {/* Captcha Box */}
            <div className="gov-captcha-box" style={{ borderRadius: '4px' }}>
              <div>
                <div style={{ fontSize: '10px', color: '#64748B', fontWeight: 'bold' }}>SECURITY CHECK</div>
                <div className="gov-captcha-code">{num1} + {num2} = ?</div>
              </div>
              <div style={{ flexGrow: 1 }}>
                <label className="gov-form-label" style={{ fontSize: '11px' }}>Enter Result</label>
                <input 
                  type="number" 
                  className="gov-form-input" 
                  placeholder="e.g. 12" 
                  value={captchaInput} 
                  onChange={(e) => setCaptchaInput(e.target.value)}
                  required 
                />
              </div>
            </div>

            <button 
              type="submit" 
              className="gov-btn gov-btn-primary" 
              style={{ width: '100%', padding: '10px', borderRadius: '4px', fontSize: '14px' }}
              disabled={isLoading}
            >
              {isLoading ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <RefreshCw className="animate-spin" size={16} />
                  <span>Signing In...</span>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <Lock size={15} />
                  <span>Sign In</span>
                </div>
              )}
            </button>
          </form>

          <div style={{ marginTop: '12px', textAlign: 'center', fontSize: '11px', color: '#64748B' }}>
            Demo Mode • Pre-filled password • Captcha answer: <strong>12</strong>
          </div>
        </div>
      </div>
    </div>
  );
};
