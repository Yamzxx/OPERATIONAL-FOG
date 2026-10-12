import React from 'react';
import { NationalEmblem, IndianFlag } from './EmblemAndFlag';
import { useLanguage } from '../context/LanguageContext';

export const GovernmentHeader = () => {
  const { t } = useLanguage();

  return (
    <header className="gov-header">
      <div className="gov-container">
        <div className="gov-header-inner">
          <div className="gov-identity">
            <div className="gov-emblem-flag-group">
              <NationalEmblem height={60} />
              <IndianFlag width={36} height={24} />
            </div>
            
            <div className="gov-header-separator" />
            
            <div className="gov-title-group">
              <span className="gov-title-org">{t('defence_crisis_training_system', 'Defences & Crisis Training Simulation System')}</span>
              <h1 className="gov-main-title">OPERATIONAL FOG</h1>
              <span className="gov-subtitle">{t('comm_resilience_decision_platform', 'Communication Resilience & Decision-Making Training Platform')}</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

