import React from 'react';
import { Monitor, UserCheck, FileText, BarChart2, ExternalLink } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export const UsefulLinks = ({ onLinkClick }) => {
  const { t } = useLanguage();

  const links = [
    {
      id: 'instructor',
      titleKey: 'instructor_workspace',
      title: 'Instructor Workspace',
      subtitleKey: 'instructor_ws_sub',
      subtitle: 'Scenario design, RF delay injection & live monitoring',
      icon: Monitor
    },
    {
      id: 'participant',
      titleKey: 'participant_workspace',
      title: 'Participant Workspace',
      subtitleKey: 'participant_ws_sub',
      subtitle: 'Terminal dispatch interface & message queue',
      icon: UserCheck
    },
    {
      id: 'docs',
      titleKey: 'training_docs',
      title: 'Training Documentation',
      subtitleKey: 'training_docs_sub',
      subtitle: 'Standard Operating Procedures & platform manuals',
      icon: FileText
    },
    {
      id: 'reports',
      titleKey: 'exercise_reports',
      title: 'Exercise Reports',
      subtitleKey: 'exercise_reports_sub',
      subtitle: 'Historical performance metrics & AAR analytics',
      icon: BarChart2
    }
  ];

  return (
    <section className="gov-section gov-section-light">
      <div className="gov-container">
        <div className="gov-section-header">
          <h2 className="gov-section-title">{t('useful_links_title', 'Useful Links')}</h2>
          <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>{t('quick_access_portal', 'QUICK ACCESS PORTAL')}</span>
        </div>

        <div className="gov-useful-links-grid">
          {links.map((link) => {
            const Icon = link.icon;
            return (
              <a 
                key={link.id} 
                href={`#${link.id}`}
                className="gov-link-card"
                onClick={(e) => {
                  e.preventDefault();
                  onLinkClick(link);
                }}
              >
                <div className="gov-link-icon">
                  <Icon size={24} />
                </div>
                <div>
                  <div className="gov-link-text">{t(link.titleKey, link.title)}</div>
                  <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                    {t(link.subtitleKey, link.subtitle)}
                  </div>
                </div>
              </a>
            );
          })}
        </div>
      </div>
    </section>
  );
};

