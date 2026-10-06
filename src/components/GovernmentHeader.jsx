import React from 'react';
import { NationalEmblem, IndianFlag } from './EmblemAndFlag';
import { Bell, ShieldAlert, Cpu } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export const GovernmentHeader = () => {
  const { t } = useLanguage();

  return (
    <header className="gov-header">
      <div className="gov-container">
        <div className="gov-header-inner">
          <div className="gov-identity">
            <NationalEmblem height={68} />
            <div style={{ height: '52px', width: '1px', backgroundColor: '#CBD5E1', margin: '0 4px' }}></div>
            <IndianFlag width={30} height={20} />
            
            <div className="gov-title-group">
              <span className="gov-title-org">{t('defence_crisis_training_system', 'Defences & Crisis Training Simulation System')}</span>
              <h1 className="gov-main-title">OPERATIONAL FOG</h1>
              <span className="gov-subtitle">{t('comm_resilience_decision_platform', 'Communication Resilience & Decision-Making Training Platform')}</span>
            </div>
          </div>

          <div className="gov-header-right">
            <div className="gov-ticker-box">
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 'bold', marginBottom: '2px' }}>
                <ShieldAlert size={14} style={{ color: '#B45309' }} />
                <span>{t('simulated_latency_active', 'Simulated Network Latency Engine Active')}</span>
              </div>
              <div style={{ fontSize: '11px', color: '#92400E' }}>
                {t('rf_delay_engine_ready', 'v2.4 Synthetic RF Delay & Packet Degradation Engine Ready for Operational Exercises.')}
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

