import React from 'react';
import { IndianFlag } from '../EmblemAndFlag';
import { User, ShieldCheck, Eye, Type, LogOut, Sliders } from 'lucide-react';

export const SettingsView = ({ 
  currentUser, 
  onSignOut, 
  fontScale, 
  setFontScale, 
  highContrast, 
  setHighContrast 
}) => {
  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '800px' }}>
      {/* Header */}
      <div>
        <h1 style={{ fontFamily: 'var(--font-family-serif)', fontSize: '24px', fontWeight: '800', color: 'var(--color-primary-navy)' }}>
          Settings & Environment Configuration
        </h1>
        <p style={{ fontSize: '13px', color: '#64748B', marginTop: '4px' }}>
          Manage user profile preferences and operational platform settings.
        </p>
      </div>

      {/* Environment Information Box */}
      <div style={{ backgroundColor: '#F0F9FF', border: '1px solid #BAE6FD', borderLeft: '4px solid #0284C7', padding: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', color: '#0369A1', fontSize: '14px', marginBottom: '4px' }}>
          <ShieldCheck size={18} />
          <span>SYSTEM & ENVIRONMENT INFORMATION</span>
        </div>
        <div style={{ fontSize: '13px', color: '#0C4A6E', lineHeight: '1.5' }}>
          Operational Fog training instance running with PostgreSQL persistent data storage. Session records and decision logs are saved securely.
        </div>
      </div>

      {/* User Profile Card */}
      <div style={{ backgroundColor: '#FFF', border: '1px solid #CBD5E1', padding: '20px', borderTop: '3px solid var(--color-primary-navy)' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--color-primary-navy)', marginBottom: '14px' }}>
          Active User Profile
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', fontSize: '13px' }}>
          <div>
            <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 'bold' }}>SERVICE ID / USERNAME</div>
            <div style={{ fontSize: '15px', fontWeight: 'bold', color: 'var(--color-primary-navy)' }}>
              {currentUser?.serviceId || 'OPS-8842-IND'}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 'bold' }}>ASSIGNED ROLE</div>
            <div style={{ fontSize: '15px', fontWeight: 'bold', color: 'var(--color-terracotta)' }}>
              {(currentUser?.role || 'INSTRUCTOR').toUpperCase()}
            </div>
          </div>
        </div>
      </div>

      {/* Display & Accessibility Preferences */}
      <div style={{ backgroundColor: '#FFF', border: '1px solid #CBD5E1', padding: '20px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--color-primary-navy)', marginBottom: '14px' }}>
          Display & Accessibility Preferences
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 'bold', fontSize: '14px', color: 'var(--color-primary-navy)' }}>High Contrast Mode</div>
              <div style={{ fontSize: '12px', color: '#64748B' }}>Enhance border definition and color contrast.</div>
            </div>
            <button 
              onClick={() => setHighContrast(!highContrast)}
              className={`gov-utility-btn ${highContrast ? 'active' : ''}`}
              style={{ padding: '6px 14px', fontSize: '12px' }}
            >
              <Eye size={14} />
              <span>{highContrast ? 'Standard Theme' : 'High Contrast Theme'}</span>
            </button>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #E2E8F0', paddingTop: '14px' }}>
            <div>
              <div style={{ fontWeight: 'bold', fontSize: '14px', color: 'var(--color-primary-navy)' }}>Font Scale</div>
              <div style={{ fontSize: '12px', color: '#64748B' }}>Adjust text size across the workspace.</div>
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button className={`gov-utility-btn ${fontScale === 'sm' ? 'active' : ''}`} onClick={() => setFontScale('sm')}>A-</button>
              <button className={`gov-utility-btn ${fontScale === 'md' ? 'active' : ''}`} onClick={() => setFontScale('md')}>A</button>
              <button className={`gov-utility-btn ${fontScale === 'lg' ? 'active' : ''}`} onClick={() => setFontScale('lg')}>A+</button>
            </div>
          </div>
        </div>
      </div>

      {/* Sign Out Trigger */}
      <div style={{ backgroundColor: '#FFF', border: '1px solid #CBD5E1', padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontWeight: 'bold', fontSize: '14px', color: 'var(--color-primary-navy)' }}>Session Termination</div>
          <div style={{ fontSize: '12px', color: '#64748B' }}>Sign out and return to the landing page.</div>
        </div>
        <button 
          onClick={onSignOut}
          className="gov-btn"
          style={{ backgroundColor: '#DC2626', color: '#FFF' }}
        >
          <LogOut size={16} />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );
};
