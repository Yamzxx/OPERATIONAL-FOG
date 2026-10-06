import React from 'react';
import { 
  Clock, 
  GitFork, 
  HelpCircle, 
  Users, 
  FileSpreadsheet, 
  BarChart3, 
  ChevronRight,
  ShieldAlert
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export const modulesData = [
  {
    id: 'comm-delay',
    titleKey: 'mod_101_title',
    title: 'Communication Delay Training',
    code: 'MOD-101',
    categoryKey: 'mod_101_cat',
    category: 'LATENCY & SIGNAL',
    icon: Clock,
    descKey: 'mod_101_desc',
    description: 'Simulates variable radio/satellite transmission lag, packet queuing, and intermittent signal blackouts across command chains.',
    specs: {
      duration: '45 mins',
      difficulty: 'Intermediate',
      recommendedNodes: '3-8 Operational Nodes',
      focusArea: 'Queue Management & Message Prioritization'
    },
    detailText: 'Participants experience synthetic latency ranging from 30 seconds to 15 minutes. Teaches commanders how to manage out-of-order dispatches and maintain operational discipline without flooding degraded communication links.'
  },
  {
    id: 'conflicting-reports',
    titleKey: 'mod_102_title',
    title: 'Conflicting Reports',
    code: 'MOD-102',
    categoryKey: 'mod_102_cat',
    category: 'INTEL SYNTHESIS',
    icon: GitFork,
    descKey: 'mod_102_desc',
    description: 'Presents contradictory intelligence telemetry feeds requiring cross-verification, source evaluation, and critical synthesis.',
    specs: {
      duration: '60 mins',
      difficulty: 'Advanced',
      recommendedNodes: '4-12 Operational Nodes',
      focusArea: 'Discrepancy Triangulation & Source Trust'
    },
    detailText: 'Injects divergent reconnaissance reports regarding unit locations, threat assessments, and logistics levels. Participants must cross-examine feeds, calculate probability scores, and resolve contradictions before issuing orders.'
  },
  {
    id: 'incomplete-info',
    titleKey: 'mod_103_title',
    title: 'Incomplete Information',
    code: 'MOD-103',
    categoryKey: 'mod_103_cat',
    category: 'SITUATIONAL AWARENESS',
    icon: HelpCircle,
    descKey: 'mod_103_desc',
    description: 'Forces operational decisions under partial situational awareness, missing grid coordinates, and truncated dispatches.',
    specs: {
      duration: '50 mins',
      difficulty: 'High Friction',
      recommendedNodes: '2-6 Operational Nodes',
      focusArea: 'Decision Thresholds & Risk Calculation'
    },
    detailText: 'Restricts sensor coverage and masks critical battlefield variables. Forces decision-makers to formulate contingent action plans despite significant gaps in the common operating picture (COP).'
  },
  {
    id: 'team-coordination',
    titleKey: 'mod_104_title',
    title: 'Team Coordination',
    code: 'MOD-104',
    categoryKey: 'mod_104_cat',
    category: 'JOINT OPERATIONS',
    icon: Users,
    descKey: 'mod_104_desc',
    description: 'Evaluates multi-agency and cross-functional node synchronization during high-pace crisis response scenarios.',
    specs: {
      duration: '90 mins',
      difficulty: 'Comprehensive',
      recommendedNodes: '6-16 Operational Nodes',
      focusArea: 'Cross-Agency SOPs & Radio Protocol'
    },
    detailText: 'Simulates inter-departmental operations involving ground elements, medical response teams, logistics hubs, and air control nodes under fragmented signal coverage.'
  },
  {
    id: 'decision-logging',
    titleKey: 'mod_105_title',
    title: 'Decision Logging',
    code: 'MOD-105',
    categoryKey: 'mod_105_cat',
    category: 'AUDIT & RATIONALE',
    icon: FileSpreadsheet,
    descKey: 'mod_105_desc',
    description: 'Tracks command rationale, timestamp, confidence scores, and authorization audit trails in a immutable log structure.',
    specs: {
      duration: '30 mins',
      difficulty: 'Fundamental',
      recommendedNodes: 'All Participants',
      focusArea: 'Command Traceability & Accountability'
    },
    detailText: 'Imposes mandatory structured logging for all issued orders. Captures the exact information state and assumptions available to the commander at the time of decision.'
  },
  {
    id: 'aar-analytics',
    titleKey: 'mod_106_title',
    title: 'After-Action Review',
    code: 'MOD-106',
    categoryKey: 'mod_106_cat',
    category: 'DEBRIEF & METRICS',
    icon: BarChart3,
    descKey: 'mod_106_desc',
    description: 'Replays complete exercise timelines with message latency graphs, order response curves, and decision accuracy matrices.',
    specs: {
      duration: '60 mins',
      difficulty: 'Analysis Phase',
      recommendedNodes: 'Instructors & Leads',
      focusArea: 'Timeline Reconstruct & Bottleneck Identification'
    },
    detailText: 'Provides step-by-step playback showing how delays propagated through the command network. Highlights critical inflection points where communication failures altered exercise outcomes.'
  }
];

export const TrainingModules = ({ onSelectModule }) => {
  const { t } = useLanguage();

  return (
    <section className="gov-section gov-section-subtle" id="modules">
      <div className="gov-container">
        <div className="gov-section-header">
          <div>
            <h2 className="gov-section-title">{t('training_modules_title', 'Training Modules')}</h2>
            <p style={{ fontSize: '13px', color: '#64748B', marginTop: '4px' }}>
              {t('training_modules_subtitle', 'Standardized simulation curricula for command node resilience and decision verification.')}
            </p>
          </div>
          <span className="gov-module-badge">{t('modules_active_count', '6 STANDARD MODULES ACTIVE')}</span>
        </div>

        <div className="gov-modules-grid">
          {modulesData.map((module) => {
            const IconComponent = module.icon;
            return (
              <div 
                key={module.id} 
                className="gov-module-card"
                onClick={() => onSelectModule(module)}
              >
                <div className="gov-module-header">
                  <div className="gov-module-icon-box">
                    <IconComponent size={22} />
                  </div>
                  <span className="gov-module-badge">{module.code}</span>
                </div>

                <h3 className="gov-module-title">{t(module.titleKey, module.title)}</h3>
                
                <p className="gov-module-desc">
                  {t(module.descKey, module.description)}
                </p>

                <div className="gov-module-footer">
                  <span>{module.specs.focusArea}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                    <span>{t('inspect_specs', 'Inspect Specs')}</span>
                    <ChevronRight size={14} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

