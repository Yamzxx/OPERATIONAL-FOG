import React, { useState } from 'react';
import { 
  BookOpen, 
  ChevronDown, 
  ChevronUp, 
  X, 
  PlayCircle,
  Users,
  FileCheck,
  Radio,
  ArrowRight,
  Lightbulb
} from 'lucide-react';

const DEMO_STEPS = [
  {
    step: '01',
    icon: <BookOpen size={18} />,
    title: 'Scenario Library',
    desc: 'Browse pre-built fictional scenarios or create a custom one using the Scenario Configuration Editor.',
    action: 'scenarios'
  },
  {
    step: '02',
    icon: <Users size={18} />,
    title: 'Create / Join Session',
    desc: 'Launch a single-user exercise or invite multiple participants via Session Code for multiplayer mode.',
    action: 'overview'
  },
  {
    step: '03',
    icon: <Radio size={18} />,
    title: 'Training Room',
    desc: 'Experience live communication disruptions — delayed messages, dropped dispatches, and conflicting intel — and log decisions in real time.',
    action: null
  },
  {
    step: '04',
    icon: <FileCheck size={18} />,
    title: 'After-Action Review',
    desc: 'Inspect the chronological timeline, participant decision rationale, and generate an official PDF audit report.',
    action: 'aar'
  },
];

export const DemoGuide = ({ onNavigate }) => {
  const [expanded, setExpanded] = useState(true);
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div
      style={{
        margin: '16px 24px 0',
        backgroundColor: '#0F172A',
        border: '1px solid #1E3A8A',
        borderLeft: '4px solid #F59E0B',
        color: '#E2E8F0',
        fontFamily: 'var(--font-family-sans)',
        fontSize: '13px',
      }}
    >
      {/* Header row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 16px',
          cursor: 'pointer',
          userSelect: 'none',
        }}
        onClick={() => setExpanded(v => !v)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Lightbulb size={16} style={{ color: '#F59E0B', flexShrink: 0 }} />
          <span style={{ fontWeight: '700', color: '#F59E0B', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
            Demo Guide — SIH Evaluator Walkthrough
          </span>
          <span style={{ fontSize: '11px', color: '#64748B' }}>
            Click a step to navigate
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={(e) => { e.stopPropagation(); setDismissed(true); }}
            title="Dismiss guide"
            style={{
              background: 'none',
              border: 'none',
              color: '#64748B',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              padding: '2px',
            }}
          >
            <X size={14} />
          </button>
          <span style={{ color: '#64748B' }}>
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </span>
        </div>
      </div>

      {/* Steps row — collapsible */}
      {expanded && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 0,
            borderTop: '1px solid #1E293B',
          }}
        >
          {DEMO_STEPS.map((s, idx) => (
            <div
              key={s.step}
              onClick={() => s.action && onNavigate(s.action)}
              style={{
                padding: '14px 16px',
                borderRight: idx < DEMO_STEPS.length - 1 ? '1px solid #1E293B' : 'none',
                cursor: s.action ? 'pointer' : 'default',
                transition: 'background 0.15s ease',
              }}
              onMouseEnter={e => { if (s.action) e.currentTarget.style.backgroundColor = '#1E293B'; }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <span style={{ color: '#F59E0B', fontWeight: '800', fontSize: '11px' }}>STEP {s.step}</span>
                <span style={{ color: '#94A3B8' }}>{s.icon}</span>
                {s.action && <ArrowRight size={12} style={{ color: '#475569', marginLeft: 'auto' }} />}
              </div>
              <div style={{ fontWeight: '700', color: '#E2E8F0', fontSize: '13px', marginBottom: '4px' }}>
                {s.title}
              </div>
              <div style={{ fontSize: '12px', color: '#94A3B8', lineHeight: 1.4 }}>
                {s.desc}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
