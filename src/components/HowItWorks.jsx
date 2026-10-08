import React from 'react';
import { Sliders, Network, AlertTriangle, FileBarChart } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export const HowItWorks = () => {
  const { t } = useLanguage();

  const steps = [
    {
      num: '01',
      titleKey: 'step_1_title',
      title: 'Scenario Definition',
      icon: Sliders,
      descKey: 'step_1_desc',
      desc: 'The exercise instructor configures network parameters, defining RF latency curves, packet drop rates, and synthetic intelligence discrepancies.'
    },
    {
      num: '02',
      titleKey: 'step_2_title',
      title: 'Node Deployment',
      icon: Network,
      descKey: 'step_2_desc',
      desc: 'Participants connect via isolated terminal interfaces, assigned to hierarchical roles (Strategic Command, Field Units, Logistics, Liaison).'
    },
    {
      num: '03',
      titleKey: 'step_3_title',
      title: 'Friction Injection',
      icon: AlertTriangle,
      descKey: 'step_3_desc',
      desc: 'During live exercise, communication links fluctuate. Messages arrive delayed or garbled, testing procedural adaptability under stress.'
    },
    {
      num: '04',
      titleKey: 'step_4_title',
      title: 'Debrief & Analysis',
      icon: FileBarChart,
      descKey: 'step_4_desc',
      desc: 'The After-Action Review visualizes decision timelines, identifying communication bottlenecks, order lag, and rationale clarity.'
    }
  ];

  return (
    <section className="gov-section gov-section-light" id="how-it-works">
      <div className="gov-container">
        <div className="gov-section-header">
          <h2 className="gov-section-title">{t('how_it_works_title', 'How It Works')}</h2>
          <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>{t('how_it_works_sub', 'SIMULATION METHODOLOGY')}</span>
        </div>

        <div 
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '20px'
          }}
        >
          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <div 
                key={step.num}
                style={{
                  backgroundColor: 'var(--color-bg-light)',
                  border: '1px solid var(--color-border-light)',
                  borderTop: '3px solid var(--color-terracotta)',
                  padding: '20px',
                  position: 'relative'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <div 
                    style={{
                      width: '36px',
                      height: '36px',
                      backgroundColor: 'var(--color-primary-navy)',
                      color: '#FFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 'bold',
                      fontSize: '14px'
                    }}
                  >
                    {step.num}
                  </div>
                  <Icon size={22} style={{ color: 'var(--color-terracotta)' }} />
                </div>

                <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--color-primary-navy)', marginBottom: '8px' }}>
                  {t(step.titleKey, step.title)}
                </h3>

                <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: '1.5' }}>
                  {t(step.descKey, step.desc)}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

