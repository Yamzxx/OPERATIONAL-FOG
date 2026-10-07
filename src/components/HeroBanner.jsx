import React from 'react';
import { Compass, LogIn, Activity, Radio, Shield, Users } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export const HeroBanner = ({ onExploreClick, onSignInClick }) => {
  const { t } = useLanguage();

  return (
    <section className="gov-hero-banner" id="home">
      <div className="gov-container">
        <div className="gov-hero-content">
          <span className="gov-hero-tag">{t('hero_tag', 'DEFENCE TRAINING SIMULATOR')}</span>
          
          <h2 className="gov-hero-title">Operational Fog</h2>
          
          <div className="gov-hero-subtitle">
            {t('hero_subtitle', 'Train for Decisions When Communication Fails')}
          </div>

          <p className="gov-hero-desc">
            {t('hero_desc', 'Practise coordination and decision-making when information is delayed, incomplete, or conflicting. Designed for multi-agency command nodes, signal officers, and crisis response leaders navigating high-friction tactical environments.')}
          </p>

          <div className="gov-hero-actions">
            <button className="gov-btn gov-btn-primary" onClick={onExploreClick}>
              <Compass size={18} />
              <span>{t('explore_training', 'Explore Training')}</span>
            </button>

            <button className="gov-btn gov-btn-secondary" onClick={onSignInClick}>
              <LogIn size={18} />
              <span>{t('sign_in', 'Sign In')}</span>
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
              <div style={{ fontWeight: 'bold', color: '#FFF' }}>{t('degraded_link_sim', 'Degraded Link Sim')}</div>
              <div style={{ fontSize: '11px', color: '#94A3B8' }}>{t('dynamic_delays', '0 - 180s Dynamic Delays')}</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Activity size={18} style={{ color: '#38BDF8' }} />
            <div>
              <div style={{ fontWeight: 'bold', color: '#FFF' }}>{t('synthetic_discrepancies', 'Synthetic Discrepancies')}</div>
              <div style={{ fontSize: '11px', color: '#94A3B8' }}>{t('conflicting_feeds', 'Conflicting Telemetry Feeds')}</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Users size={18} style={{ color: '#4ADE80' }} />
            <div>
              <div style={{ fontWeight: 'bold', color: '#FFF' }}>{t('multi_node_mesh', 'Multi-Node Mesh')}</div>
              <div style={{ fontSize: '11px', color: '#94A3B8' }}>{t('sync_command_sandbox', 'Synchronized Command Sandbox')}</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Shield size={18} style={{ color: '#F43F5E' }} />
            <div>
              <div style={{ fontWeight: 'bold', color: '#FFF' }}>{t('aar_audit_trace', 'AAR Audit Trace')}</div>
              <div style={{ fontSize: '11px', color: '#94A3B8' }}>{t('automated_decision_logging', 'Automated Decision Logging')}</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

