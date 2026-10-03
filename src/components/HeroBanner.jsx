import React from 'react';
import { Compass, LogIn, Activity, Radio, Shield, Users } from 'lucide-react';

export const HeroBanner = ({ onExploreClick, onSignInClick }) => {
  return (
    <section className="gov-hero-banner" id="home">
      <div className="gov-container">
        <div className="gov-hero-content">
          <span className="gov-hero-tag">DEFENCE TRAINING SIMULATOR</span>
          
          <h2 className="gov-hero-title">Operational Fog</h2>
          
          <div className="gov-hero-subtitle">
            Train for Decisions When Communication Fails
          </div>

          <p className="gov-hero-desc">
            Practise coordination and decision-making when information is delayed, incomplete, or conflicting.
            Designed for multi-agency command nodes, signal officers, and crisis response leaders navigating high-friction tactical environments.
          </p>

          <div className="gov-hero-actions">
            <button className="gov-btn gov-btn-primary" onClick={onExploreClick}>
              <Compass size={18} />
              <span>Explore Training</span>
            </button>

            <button className="gov-btn gov-btn-secondary" onClick={onSignInClick}>
              <LogIn size={18} />
              <span>Sign In</span>
            </button>
          </div>
        </div>

        {/* Live Simulation Stats Strip at bottom of Hero */}
        <div 
          style={{
            marginTop: '40px',
            paddingTop: '20px',
            borderTop: '1px solid rgba(255, 255, 255, 0.15)',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '16px',
            fontSize: '13px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Radio size={18} style={{ color: '#F59E0B' }} />
            <div>
              <div style={{ fontWeight: 'bold', color: '#FFF' }}>Degraded Link Sim</div>
              <div style={{ fontSize: '11px', color: '#94A3B8' }}>0 - 180s Dynamic Delays</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Activity size={18} style={{ color: '#38BDF8' }} />
            <div>
              <div style={{ fontWeight: 'bold', color: '#FFF' }}>Synthetic Discrepancies</div>
              <div style={{ fontSize: '11px', color: '#94A3B8' }}>Conflicting Telemetry Feeds</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Users size={18} style={{ color: '#4ADE80' }} />
            <div>
              <div style={{ fontWeight: 'bold', color: '#FFF' }}>Multi-Node Mesh</div>
              <div style={{ fontSize: '11px', color: '#94A3B8' }}>Synchronized Command Sandbox</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Shield size={18} style={{ color: '#F43F5E' }} />
            <div>
              <div style={{ fontWeight: 'bold', color: '#FFF' }}>AAR Audit Trace</div>
              <div style={{ fontSize: '11px', color: '#94A3B8' }}>Automated Decision Logging</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
