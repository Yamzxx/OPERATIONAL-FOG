import React from 'react';
import { ArrowRight, Monitor, Cpu, History, ShieldCheck } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export const AboutPlatform = ({ onReadMoreClick }) => {
  const { t } = useLanguage();

  return (
    <section className="gov-section gov-section-light" id="about">
      <div className="gov-container">
        <div className="gov-section-header">
          <h2 className="gov-section-title">{t('about_title', 'About the Platform')}</h2>
          <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>{t('about_section', 'SECTION 01 / OVERVIEW')}</span>
        </div>

        <div className="gov-about-grid">
          {/* Left Side: Story & Purpose */}
          <div className="gov-about-left">
            <h3 style={{ fontFamily: 'var(--font-family-serif)', fontSize: '20px', color: 'var(--color-primary-navy)', marginBottom: '14px' }}>
              {t('about_heading', 'Building Resilience Against the Friction of War & Crisis')}
            </h3>

            <p>
              {t('about_p1', 'During high-intensity operations and crisis management exercises, modern command structures heavily rely on clear, continuous radio, satellite, and data transmissions. However, real-world operational environments are rarely pristine. Electro-magnetic interference, physical range constraints, relay failures, and adversarial jamming introduce severe communication degradation.')}
            </p>

            <p>
              <strong>Operational Fog</strong> {t('about_p2', 'is a specialized simulation framework developed to prepare commanders, signal officers, and strategic planners for decision-making under severe communication friction. By injecting artificial message latency, packet loss, garbled intelligence feeds, and contradictory field reports into structured training scenarios, the platform measures human adaptability and organizational resilience.')}
            </p>

            <p>
              {t('about_p3', 'Participants learn to prioritize essential situational reports, verify unconfirmed intelligence, establish redundant communication protocols, and maintain tactical momentum even when high-level command channels are temporarily severed.')}
            </p>

            <button className="gov-read-more-link" onClick={onReadMoreClick} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
              <span>{t('read_whitepaper', 'Read Platform Technical Whitepaper')}</span>
              <ArrowRight size={16} />
            </button>
          </div>

          {/* Right Side: Neatly Bordered Information Panel */}
          <div className="gov-overview-panel">
            <div className="gov-panel-heading">
              <ShieldCheck size={18} style={{ color: 'var(--color-terracotta)' }} />
              <span>{t('platform_overview', 'Platform Overview')}</span>
            </div>

            <div className="gov-overview-list">
              {/* Item 1: Instructor Console */}
              <div className="gov-overview-item">
                <Monitor className="gov-overview-icon" size={20} />
                <div>
                  <div className="gov-overview-title">{t('instructor_console', 'Instructor Console')}</div>
                  <div className="gov-overview-text">
                    {t('instructor_console_desc', 'Centralized scenario orchestration suite allowing exercise directors to inject real-time signal attenuation, delayed dispatches, noise vectors, and unannounced operational friction points.')}
                  </div>
                </div>
              </div>

              {/* Item 2: Training Environment */}
              <div className="gov-overview-item">
                <Cpu className="gov-overview-icon" size={20} />
                <div>
                  <div className="gov-overview-title">{t('training_environment', 'Training Environment')}</div>
                  <div className="gov-overview-text">
                    {t('training_environment_desc', 'Multi-participant tactical sandbox supporting hierarchical command chains. Simulates realistic signal degradation, distorted voice transcriptions, and conflicting reconnaissance reports.')}
                  </div>
                </div>
              </div>

              {/* Item 3: After-Action Review */}
              <div className="gov-overview-item">
                <History className="gov-overview-icon" size={20} />
                <div>
                  <div className="gov-overview-title">{t('after_action_review', 'After-Action Review (AAR)')}</div>
                  <div className="gov-overview-text">
                    {t('aar_desc', 'Automated timeline analyzer tracking decision timestamps, order execution lags, message queue buildup, and participant confidence levels for debriefing and metric evaluation.')}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

