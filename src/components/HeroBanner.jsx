import React from 'react';
import { Compass, LogIn } from 'lucide-react';
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
      </div>
    </section>
  );
};

