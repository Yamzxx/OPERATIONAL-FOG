import React, { useState } from 'react';
import { NationalEmblem } from './EmblemAndFlag';
import { ShieldCheck, Lock, User, Key, CheckCircle, LogOut, RefreshCw, X } from 'lucide-react';

export const SignInModal = ({ isOpen, onClose, onSignInSuccess, currentUser, onSignOut }) => {
  const [role, setRole] = useState('instructor');
  const [serviceId, setServiceId] = useState('OPS-8842-IND');
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
        <div className="gov-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '720px' }}>
          <div className="gov-modal-header" style={{ backgroundColor: 'var(--color-primary-navy)', color: '#FFF' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <ShieldCheck size={20} style={{ color: 'var(--color-gold-accent)' }} />
              <span style={{ color: '#FFF', fontFamily: 'var(--font-family-serif)', fontWeight: 'bold' }}>
                Operational Fog — Authenticated Session Active
              </span>
            </div>
            <button className="gov-modal-close" onClick={onClose} style={{ color: '#FFF' }}>
              <X size={20} />
            </button>
          </div>

          <div className="gov-modal-body">
            <div style={{ backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0', padding: '16px', borderRadius: '2px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <CheckCircle size={24} style={{ color: '#16A34A' }} />
              <div>
                <div style={{ fontWeight: 'bold', color: '#15803D' }}>Authentication Verified</div>
                <div style={{ fontSize: '13px', color: '#166534' }}>
                  Logged in as <strong>{currentUser.serviceId}</strong> ({currentUser.role.toUpperCase()} ROLE)
                </div>
              </div>
            </div>

            <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--color-primary-navy)', marginBottom: '12px' }}>
              Active Control Console Quick Links
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
              <div style={{ border: '1px solid #CBD5E1', padding: '14px', background: '#F8FAFC' }}>
                <div style={{ fontWeight: 'bold', fontSize: '14px', color: 'var(--color-primary-navy)' }}>
                  Instructor Console
                </div>
                <div style={{ fontSize: '12px', color: '#64748B', margin: '4px 0 10px' }}>
                  Inject live signal attenuation & packet delay vectors.
                </div>
                <button 
                  className="gov-btn gov-btn-primary" 
                  style={{ width: '100%', fontSize: '12px', padding: '6px' }}
                  onClick={() => alert('Launching Instructor Console Sandbox... (Simulation Engine v2.4 Active)')}
                >
                  Launch Instructor Console
                </button>
              </div>

              <div style={{ border: '1px solid #CBD5E1', padding: '14px', background: '#F8FAFC' }}>
                <div style={{ fontWeight: 'bold', fontSize: '14px', color: 'var(--color-primary-navy)' }}>
                  Participant Terminal
                </div>
                <div style={{ fontSize: '12px', color: '#64748B', margin: '4px 0 10px' }}>
                  Access terminal message queue & dispatch orders.
                </div>
                <button 
                  className="gov-btn gov-btn-secondary" 
                  style={{ width: '100%', fontSize: '12px', padding: '6px' }}
                  onClick={() => alert('Opening Participant Terminal... (Receiving Node Active)')}
                >
                  Launch Terminal Sandbox
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '12px', borderTop: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: '12px', color: '#64748B' }}>
                Session Key: SEC-2026-FOG-8842X
              </div>

              <button 
                className="gov-btn" 
                style={{ background: '#EF4444', color: '#FFF', fontSize: '13px', padding: '8px 16px' }}
                onClick={onSignOut}
              >
                <LogOut size={14} />
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
    }, 600);
  };

  return (
    <div className="gov-modal-overlay" onClick={onClose}>
      <div className="gov-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px' }}>
        <div className="gov-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <NationalEmblem height={36} />
            <div>
              <div style={{ fontSize: '10px', color: 'var(--color-terracotta)', fontWeight: 'bold' }}>
                GOVERNMENT STYLE PORTAL
              </div>
              <div className="gov-modal-title">Sign In — Operational Fog</div>
            </div>
          </div>
          <button className="gov-modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="gov-modal-body">
          <div style={{ backgroundColor: 'var(--color-gold-light)', border: '1px solid #FCD34D', padding: '10px 12px', fontSize: '12px', color: '#78350F', marginBottom: '16px' }}>
            <strong>Authorized Training Portal:</strong> Sign in using your assigned Service ID and Security Credentials.
          </div>

          {errorMsg && (
            <div style={{ backgroundColor: '#FEE2E2', border: '1px solid #FCA5A5', color: '#991B1B', padding: '8px 12px', fontSize: '13px', marginBottom: '14px', borderRadius: '2px' }}>
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="gov-form-group">
              <label className="gov-form-label">Select Role / Access Level</label>
              <select className="gov-form-select" value={role} onChange={(e) => setRole(e.target.value)}>
                <option value="instructor">Exercise Instructor / Control Director</option>
                <option value="participant">Participant Commander / Signal Officer</option>
                <option value="evaluator">AAR Evaluator & Analyst</option>
              </select>
            </div>

            <div className="gov-form-group">
              <label className="gov-form-label">Service ID / Username</label>
              <div style={{ position: 'relative' }}>
                <input 
                  type="text" 
                  className="gov-form-input" 
                  value={serviceId} 
                  onChange={(e) => setServiceId(e.target.value)}
                  required 
                />
              </div>
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
            <div className="gov-captcha-box">
              <div>
                <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 'bold' }}>SECURITY CAPTCHA</div>
                <div className="gov-captcha-code">{num1} + {num2} = ?</div>
              </div>
              <div style={{ flexGrow: 1 }}>
                <label className="gov-form-label" style={{ fontSize: '11px' }}>Enter Math Result</label>
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
              style={{ width: '100%', padding: '12px' }}
              disabled={isLoading}
            >
              {isLoading ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <RefreshCw className="animate-spin" size={16} />
                  <span>Verifying Credentials...</span>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Lock size={16} />
                  <span>Authenticate & Open Console</span>
                </div>
              )}
            </button>
          </form>

          <div style={{ marginTop: '16px', textAlign: 'center', fontSize: '12px', color: '#64748B' }}>
            Demo Login Credentials Pre-Filled • Default Captcha: <strong>12</strong>
          </div>
        </div>
      </div>
    </div>
  );
};
