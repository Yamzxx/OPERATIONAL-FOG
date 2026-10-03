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

export const modulesData = [
  {
    id: 'comm-delay',
    title: 'Communication Delay Training',
    code: 'MOD-101',
    category: 'LATENCY & SIGNAL',
    icon: Clock,
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
    title: 'Conflicting Reports',
    code: 'MOD-102',
    category: 'INTEL SYNTHESIS',
    icon: GitFork,
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
    title: 'Incomplete Information',
    code: 'MOD-103',
    category: 'SITUATIONAL AWARENESS',
    icon: HelpCircle,
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
    title: 'Team Coordination',
    code: 'MOD-104',
    category: 'JOINT OPERATIONS',
    icon: Users,
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
    title: 'Decision Logging',
    code: 'MOD-105',
    category: 'AUDIT & RATIONALE',
    icon: FileSpreadsheet,
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
    title: 'After-Action Review',
    code: 'MOD-106',
    category: 'DEBRIEF & METRICS',
    icon: BarChart3,
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
  return (
    <section className="gov-section gov-section-subtle" id="modules">
      <div className="gov-container">
        <div className="gov-section-header">
          <div>
            <h2 className="gov-section-title">Training Modules</h2>
            <p style={{ fontSize: '13px', color: '#64748B', marginTop: '4px' }}>
              Standardized simulation curricula for command node resilience and decision verification.
            </p>
          </div>
          <span className="gov-module-badge">6 STANDARD MODULES ACTIVE</span>
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

                <h3 className="gov-module-title">{module.title}</h3>
                
                <p className="gov-module-desc">
                  {module.description}
                </p>

                <div className="gov-module-footer">
                  <span>{module.specs.focusArea}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                    <span>Inspect Specs</span>
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
