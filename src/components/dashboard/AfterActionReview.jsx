import React, { useState } from 'react';
import { 
  FileCheck, 
  Clock, 
  UserCheck, 
  Filter, 
  MessageSquare, 
  Save, 
  Download, 
  CheckCircle,
  AlertTriangle,
  FileText,
  AlertCircle,
  Info,
  Search,
  Users,
  Play,
  BarChart2,
  TrendingUp,
  ShieldCheck,
  Radio,
  Layers,
  ShieldAlert,
  HelpCircle,
  ChevronRight,
  ChevronDown,
  Zap
} from 'lucide-react';
import { 
  ROLE_LABELS, 
  DOMAINS, 
  TARGET_LABELS,
  DISRUPTION_TYPE_LABELS,
  formatSecondsToMMSS 
} from '../../services/eventEngine';
import { TimelineReplay } from './TimelineReplay';
import { generateAARPDFReport } from '../../services/pdfExporter';
import { useToast } from '../Toast';

export const AfterActionReview = ({ 
  aars, 
  onSaveInstructorNote, 
  userRole 
}) => {
  const { showToast } = useToast();
  const [selectedAARId, setSelectedAARId] = useState(aars[0]?.id || null);
  const [noteInput, setNoteInput] = useState('');
  const [scenarioFilter, setScenarioFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  // summary | asymmetry | decisions | chat | disruptions | participant_history | comms_analysis | replay | score
  const [activeReportTab, setActiveReportTab] = useState('summary');
  const [expandedEventId, setExpandedEventId] = useState(null);
  const [selectedParticipantRole, setSelectedParticipantRole] = useState('ALL');

  const selectedAAR = aars.find(a => a.id === selectedAARId) || aars[0];

  const filteredAARs = aars.filter(aar => {
    const matchesSearch = searchQuery === '' || 
      aar.sessionName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      aar.scenarioTitle?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      aar.sessionCode?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      aar.id?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesScenario = scenarioFilter === 'ALL' || aar.scenarioTitle?.toUpperCase().includes(scenarioFilter);
    return matchesSearch && matchesScenario;
  });

  const handleSaveNote = () => {
    if (!selectedAAR) return;
    onSaveInstructorNote(selectedAAR.id, noteInput);
    showToast('Instructor debrief notes saved to AAR record.', 'success');
  };

  const handleDownloadPDF = () => {
    if (!selectedAAR) return;
    generateAARPDFReport(selectedAAR);
  };

  const decisions = selectedAAR?.decisions || [];
  const events = selectedAAR?.events || [];
  const asymmetryMatrix = selectedAAR?.asymmetryMatrix || [];
  const teamMessages = selectedAAR?.teamMessages || [];
  const disruptions = selectedAAR?.disruptions || [];
  const participants = selectedAAR?.participants || [
    { displayName: selectedAAR?.creator || 'Operator', role: 'commander' }
  ];
  // commStats is populated by the backend /api/aars/exercise/:id endpoint from real records.
  // Fall back to counting from the events array if not present (e.g. sample AARs).
  const commStats = selectedAAR?.commStats || {
    total: events.length,
    delivered: events.filter(e => e.status === 'DELIVERED' || e.deliveryBehavior === 'normal').length,
    delayed: events.filter(e => e.deliveryBehavior === 'delayed').length,
    dropped: events.filter(e => e.status === 'DROPPED' || e.deliveryBehavior === 'dropped').length,
    incomplete: events.filter(e => e.deliveryBehavior === 'incomplete').length,
    conflicting: events.filter(e => e.deliveryBehavior === 'conflicting').length,
    pending: events.filter(e => e.status === 'PENDING').length
  };

  // Calculate statistics on information friction (from role variations when available)
  let delayedEventsCount = 0;
  let droppedEventsCount = 0;
  let incompleteOrConflictingCount = 0;

  events.forEach(ev => {
    if (ev.roleVariations) {
      Object.values(ev.roleVariations).forEach(v => {
        if (v.deliveryBehavior === 'delayed') delayedEventsCount++;
        if (v.deliveryBehavior === 'dropped') droppedEventsCount++;
        if (v.deliveryBehavior === 'incomplete' || v.deliveryBehavior === 'conflicting') incompleteOrConflictingCount++;
      });
    } else {
      if (ev.deliveryBehavior === 'delayed') delayedEventsCount++;
      if (ev.deliveryBehavior === 'dropped') droppedEventsCount++;
      if (ev.deliveryBehavior === 'incomplete' || ev.deliveryBehavior === 'conflicting') incompleteOrConflictingCount++;
    }
  });

  // -----------------------------------------------------------------------
  // PERFORMANCE SCORE COMPUTATION (Feature 9)
  // Weighted scoring across 4 pillars:
  //   1. Decision Compliance  (35 pts) — were decisions recorded under friction?
  //   2. Rationale Quality    (25 pts) — depth of written justification
  //   3. Comm Handling        (25 pts) — navigating degraded-comms events
  //   4. Intel Verification   (15 pts) — acknowledging conflicting / incomplete intel
  // -----------------------------------------------------------------------
  const computePerformanceScore = () => {
    const frictionEvents = (commStats.delayed || 0) + (commStats.dropped || 0) + (commStats.incomplete || 0) + (commStats.conflicting || 0);
    const decisionsLogged = decisions.length;

    // 1. Decision Compliance (35 pts)
    // Full marks if at least 1 decision per 2 friction events (min 1 decision required).
    let decisionScore = 0;
    if (decisionsLogged > 0) {
      const targetDecisions = Math.max(1, Math.ceil(frictionEvents / 2));
      decisionScore = Math.min(35, Math.round((decisionsLogged / targetDecisions) * 35));
    }

    // 2. Rationale Quality (25 pts)
    // Average word count of rationales — 20+ words = full marks.
    let rationaleScore = 0;
    if (decisionsLogged > 0) {
      const avgWords = decisions.reduce((sum, d) => sum + ((d.rationale || '').trim().split(/\s+/).filter(Boolean).length), 0) / decisionsLogged;
      rationaleScore = Math.min(25, Math.round((avgWords / 20) * 25));
    }

    // 3. Communication Handling (25 pts)
    // Score drops for every dropped or delayed event that had no corresponding decision.
    let commScore = 25;
    if (frictionEvents > 0 && decisionsLogged === 0) {
      commScore = 0;
    } else if (frictionEvents > 0) {
      // Deduct 5 pts per unaddressed friction event beyond the first two
      const unaddressed = Math.max(0, frictionEvents - decisionsLogged * 2);
      commScore = Math.max(0, 25 - unaddressed * 5);
    }

    // 4. Intel Verification (15 pts)
    // Full marks if commander explicitly noted conflicting/incomplete intel in rationale.
    let verificationScore = 0;
    const conflictingKeywords = ['conflict', 'contradict', 'discrepan', 'verify', 'verif', 'cross-check', 'corrobor', 'incomplete', 'corrupt', 'unverif'];
    const rationaleCombined = decisions.map(d => (d.rationale || '').toLowerCase()).join(' ');
    const conflictingEventsExist = (commStats.conflicting || 0) + (commStats.incomplete || 0) > 0;
    if (!conflictingEventsExist) {
      verificationScore = 15; // No conflicting intel to verify — full marks
    } else {
      const mentionsVerification = conflictingKeywords.some(kw => rationaleCombined.includes(kw));
      verificationScore = mentionsVerification ? 15 : 5;
    }

    const total = decisionScore + rationaleScore + commScore + verificationScore;
    const grade = total >= 90 ? 'A' : total >= 75 ? 'B' : total >= 60 ? 'C' : total >= 45 ? 'D' : 'F';
    const gradeColor = total >= 90 ? '#15803D' : total >= 75 ? '#0369A1' : total >= 60 ? '#D97706' : total >= 45 ? '#EA580C' : '#DC2626';

    return {
      total,
      grade,
      gradeColor,
      breakdown: [
        { label: 'Decision Compliance', score: decisionScore, max: 35, desc: `${decisionsLogged} decision${decisionsLogged !== 1 ? 's' : ''} logged under ${frictionEvents} friction event${frictionEvents !== 1 ? 's' : ''}` },
        { label: 'Rationale Quality', score: rationaleScore, max: 25, desc: decisionsLogged > 0 ? `Avg ${Math.round(decisions.reduce((s, d) => s + ((d.rationale || '').trim().split(/\s+/).filter(Boolean).length), 0) / decisionsLogged)} words per rationale` : 'No decisions recorded' },
        { label: 'Comm Handling', score: commScore, max: 25, desc: `${frictionEvents} degraded-comms events navigated` },
        { label: 'Intel Verification', score: verificationScore, max: 15, desc: conflictingEventsExist ? (verificationScore === 15 ? 'Verification acknowledged in rationale' : 'Conflicting intel not referenced in rationale') : 'No conflicting intel present' }
      ]
    };
  };

  const perfScore = selectedAAR ? computePerformanceScore() : null;

  const getStatusBadgeStyle = (statusKey) => {
    switch (statusKey) {
      case 'delivered':
        return { background: '#DCFCE7', color: '#15803D', border: '1px solid #86EFAC' };
      case 'delayed':
        return { background: '#FEF3C7', color: '#B45309', border: '1px solid #FCD34D' };
      case 'dropped':
        return { background: '#FEE2E2', color: '#991B1B', border: '1px solid #FCA5A5' };
      case 'partial':
        return { background: '#F3E8FF', color: '#7E22CE', border: '1px solid #D8B4FE' };
      case 'conflicting':
        return { background: '#FFEDD5', color: '#C2410C', border: '1px solid #FDBA74' };
      default:
        return { background: '#F1F5F9', color: '#64748B', border: '1px solid #E2E8F0' };
    }
  };

  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-family-serif)', fontSize: '24px', fontWeight: '800', color: 'var(--color-primary-navy)' }}>
            After-Action Review (AAR) &amp; Telemetry Audit Workspace
          </h1>
          <p style={{ fontSize: '13px', color: '#64748B', marginTop: '4px' }}>
            Inspect chronological timelines, participant decision rationales, information availability, and generate PDF audit reports.
          </p>
        </div>

        {selectedAAR && (
          <button 
            className="gov-btn gov-btn-primary"
            onClick={handleDownloadPDF}
            style={{ padding: '10px 18px', fontSize: '13px' }}
          >
            <Download size={16} />
            <span>Export Official PDF Report</span>
          </button>
        )}
      </div>

      {/* Filter & Search Bar */}
      <div style={{ display: 'flex', gap: '16px', alignItems: 'center', backgroundColor: '#FFF', padding: '14px 18px', border: '1px solid #CBD5E1', flexWrap: 'wrap' }}>
        {/* Search */}
        <div style={{ position: 'relative', width: '260px' }}>
          <Search size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
          <input 
            type="text"
            className="gov-form-input"
            style={{ paddingLeft: '32px', fontSize: '12px' }}
            placeholder="Search exercises or scenarios..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <span style={{ color: '#CBD5E1' }}>|</span>

        {/* Filter Buttons */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <Filter size={15} style={{ color: '#64748B' }} />
          <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--color-primary-navy)' }}>Scenario:</span>
          {['ALL', 'SCENARIO A', 'SCENARIO B', 'SCENARIO C'].map(filter => (
            <button
              key={filter}
              onClick={() => setScenarioFilter(filter)}
              style={{
                background: scenarioFilter === filter ? 'var(--color-primary-navy)' : '#F1F5F9',
                color: scenarioFilter === filter ? '#FFF' : '#334155',
                border: '1px solid #CBD5E1',
                padding: '3px 8px',
                fontSize: '11px',
                fontWeight: '700',
                borderRadius: '2px',
                cursor: 'pointer'
              }}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {/* Main Split Workspace Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '24px' }}>
        {/* Left Column: Completed AAR List */}
        <div style={{ backgroundColor: '#FFF', border: '1px solid #CBD5E1', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--color-primary-navy)', borderBottom: '1px solid #E2E8F0', paddingBottom: '8px' }}>
            Completed AAR Archives ({filteredAARs.length})
          </div>

          {filteredAARs.length === 0 ? (
            <div style={{ fontSize: '12px', color: '#64748B', padding: '16px', textAlign: 'center' }}>
              No completed AAR records match search criteria.
            </div>
          ) : (
            filteredAARs.map((aar) => {
              const isSelected = selectedAAR?.id === aar.id;
              return (
                <div
                  key={aar.id}
                  onClick={() => {
                    setSelectedAARId(aar.id);
                    setNoteInput(aar.instructorNotes || '');
                  }}
                  style={{
                    backgroundColor: isSelected ? '#F0F9FF' : '#F8FAFC',
                    border: '1px solid',
                    borderColor: isSelected ? 'var(--color-primary-navy)' : '#CBD5E1',
                    borderLeft: `4px solid ${isSelected ? 'var(--color-terracotta)' : '#94A3B8'}`,
                    padding: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--color-primary-navy)' }}>
                    {aar.sessionName}
                  </div>
                  <div style={{ fontSize: '11px', color: '#475569', marginTop: '2px' }}>
                    {aar.scenarioTitle}
                  </div>
                  <div style={{ fontSize: '10px', color: '#64748B', marginTop: '6px', display: 'flex', justifyContent: 'space-between' }}>
                    <span>Room: <strong style={{ color: '#2563EB' }}>{aar.sessionCode || 'SOLO'}</strong></span>
                    <span>{new Date(aar.startTime).toLocaleDateString()}</span>
                  </div>
                  {aar.isSample && (
                    <span style={{ marginTop: '4px', display: 'inline-block', fontSize: '9px', background: '#E2E8F0', color: '#475569', padding: '1px 4px', fontWeight: 'bold' }}>
                      PRE-CONFIGURED TEMPLATE
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Right Column: Detailed Exercise Report */}
        {selectedAAR ? (
          <div style={{ backgroundColor: '#FFF', border: '1px solid #CBD5E1', borderTop: '3px solid var(--color-primary-navy)', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Report Top Meta Bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #E2E8F0', paddingBottom: '14px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--color-terracotta)', fontWeight: 'bold' }}>
                  AAR REF: {selectedAAR.id} • ROOM: {selectedAAR.sessionCode || 'SOLO-MODE'} {selectedAAR.isSample ? '(PRE-CONFIGURED TEMPLATE)' : '(PERSISTED EXERCISE RECORD)'}
                </div>
                <h2 style={{ fontFamily: 'var(--font-family-serif)', fontSize: '20px', fontWeight: '800', color: 'var(--color-primary-navy)', margin: '2px 0 4px' }}>
                  {selectedAAR.sessionName}
                </h2>
                <div style={{ fontSize: '13px', color: '#475569' }}>
                  Scenario: <strong>{selectedAAR.scenarioTitle}</strong>
                </div>
              </div>

              <div style={{ textAlign: 'right', fontSize: '12px', color: '#64748B' }}>
                <div>Completed: <strong>{new Date(selectedAAR.endTime || selectedAAR.startTime).toLocaleString()}</strong></div>
                <div>Duration: <strong>{selectedAAR.durationMinutes || 5} Minutes</strong></div>
              </div>
            </div>

            {/* Sub-View Navigation Tabs */}
            <div style={{ display: 'flex', gap: '4px', borderBottom: '2px solid #CBD5E1', overflowX: 'auto' }}>
              {[
                { id: 'summary', label: '📋 Exercise Summary' },
                { id: 'asymmetry', label: '📍 Information Delivery Matrix' },
                { id: 'decisions', label: `🏛 Decisions Audit (${decisions.length})` },
                { id: 'chat', label: `💼 Team Chat Log (${teamMessages.length})` },
                { id: 'disruptions', label: `⚡ Disruptions (${disruptions.length})` },
                { id: 'participant_history', label: '👤 Participant History' },
                { id: 'comms_analysis', label: '📊 Comms Analysis' },
                { id: 'replay', label: '▶️ Timeline Replay' },
                { id: 'score', label: '🏅 Performance Score' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveReportTab(tab.id)}
                  style={{
                    padding: '8px 14px',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    border: 'none',
                    borderBottom: activeReportTab === tab.id ? '3px solid var(--color-terracotta)' : '3px solid transparent',
                    backgroundColor: activeReportTab === tab.id ? '#F8FAFC' : 'transparent',
                    color: activeReportTab === tab.id ? 'var(--color-primary-navy)' : '#64748B',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* TAB 1: SUMMARY & DECISION REVIEW */}
            {activeReportTab === 'summary' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* Summary Metrics Box */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '12px' }}>
                  <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '4px', padding: '12px' }}>
                    <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#64748B' }}>EXERCISE EVENTS</div>
                    <div style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--color-primary-navy)', marginTop: '2px' }}>
                      {events.length || 7} Dispatches
                    </div>
                  </div>

                  <div style={{ backgroundColor: '#FEF3C7', border: '1px solid #FCD34D', borderRadius: '4px', padding: '12px' }}>
                    <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#92400E' }}>COMMUNICATION DELAYS</div>
                    <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#B45309', marginTop: '2px' }}>
                      {delayedEventsCount || commStats.delayed} Instances
                    </div>
                  </div>

                  <div style={{ backgroundColor: '#FEE2E2', border: '1px solid #FCA5A5', borderRadius: '4px', padding: '12px' }}>
                    <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#991B1B' }}>DROPPED MESSAGES</div>
                    <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#DC2626', marginTop: '2px' }}>
                      {droppedEventsCount || commStats.dropped} Blocked
                    </div>
                  </div>

                  <div style={{ backgroundColor: '#DCFCE7', border: '1px solid #86EFAC', borderRadius: '4px', padding: '12px' }}>
                    <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#166534' }}>DECISIONS LOGGED</div>
                    <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#15803D', marginTop: '2px' }}>
                      {decisions.length} Decisions
                    </div>
                  </div>

                  <div style={{ backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '4px', padding: '12px' }}>
                    <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#1D4ED8' }}>INJECTED DISRUPTIONS</div>
                    <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#2563EB', marginTop: '2px' }}>
                      {disruptions.length} Injections
                    </div>
                  </div>

                  {/* Degradation breakdown row — all values from commStats derived from real DB records */}
                  {commStats.total > 0 && (
                    <div style={{ gridColumn: '1 / -1', borderTop: '1px solid #E2E8F0', paddingTop: '10px', display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '11px', color: '#64748B' }}>
                        <strong style={{ color: '#15803D' }}>{commStats.delivered}</strong> Delivered
                      </span>
                      <span style={{ fontSize: '11px', color: '#64748B' }}>
                        <strong style={{ color: '#D97706' }}>{commStats.delayed}</strong> Delayed
                      </span>
                      <span style={{ fontSize: '11px', color: '#64748B' }}>
                        <strong style={{ color: '#DC2626' }}>{commStats.dropped}</strong> Dropped
                      </span>
                      <span style={{ fontSize: '11px', color: '#64748B' }}>
                        <strong style={{ color: '#7C3AED' }}>{commStats.incomplete}</strong> Incomplete
                      </span>
                      <span style={{ fontSize: '11px', color: '#64748B' }}>
                        <strong style={{ color: '#0369A1' }}>{commStats.conflicting}</strong> Conflicting
                      </span>
                      {commStats.pending > 0 && (
                        <span style={{ fontSize: '11px', color: '#64748B' }}>
                          <strong style={{ color: '#94A3B8' }}>{commStats.pending}</strong> Pending
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Participants Breakdown */}
                <div>
                  <h3 style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--color-primary-navy)', marginBottom: '8px' }}>
                    Connected Participants &amp; Roles
                  </h3>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {participants.map((p, idx) => (
                      <div key={idx} style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '4px', padding: '6px 12px', fontSize: '12px' }}>
                        <span style={{ fontWeight: 'bold', color: 'var(--color-primary-navy)' }}>{p.displayName || p.serviceId}</span>
                        <span style={{ marginLeft: '6px', fontSize: '10px', background: '#E2E8F0', color: '#475569', padding: '1px 6px', borderRadius: '2px', fontWeight: 'bold' }}>
                          {ROLE_LABELS[p.role] || p.role}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Instructor Notes */}
                <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #CBD5E1', padding: '18px', borderTop: '3px solid var(--color-terracotta)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <h3 style={{ fontSize: '15px', fontWeight: 'bold', color: 'var(--color-primary-navy)', display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
                      <MessageSquare size={16} style={{ color: 'var(--color-terracotta)' }} />
                      <span>Instructor Debrief Observations &amp; Notes</span>
                    </h3>

                    {userRole === 'instructor' && (
                      <button 
                        onClick={handleSaveNote}
                        className="gov-btn gov-btn-primary"
                        style={{ fontSize: '11px', padding: '4px 10px' }}
                      >
                        <Save size={13} />
                        <span>Save Note</span>
                      </button>
                    )}
                  </div>

                  {userRole === 'instructor' ? (
                    <textarea 
                      className="gov-form-input"
                      rows={3}
                      placeholder="Enter qualitative instructor debrief notes..."
                      value={noteInput}
                      onChange={(e) => setNoteInput(e.target.value)}
                    />
                  ) : (
                    <div style={{ backgroundColor: '#FFF', padding: '12px', border: '1px solid #CBD5E1', fontSize: '13px', color: '#334155' }}>
                      {selectedAAR.instructorNotes || 'No instructor notes recorded for this exercise yet.'}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 2: INFORMATION ASYMMETRY DELIVERY MATRIX */}
            {activeReportTab === 'asymmetry' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ fontSize: '13px', color: '#475569' }}>
                  This table shows the ground truth known to the system, compared against the delivery status for each role. Click any row to expand the exact variations.
                </div>

                <div style={{ overflowX: 'auto', border: '1px solid #E2E8F0', borderRadius: '4px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '2px solid #E2E8F0', textAlign: 'left' }}>
                        <th style={{ padding: '10px 12px', fontWeight: 'bold', color: 'var(--color-primary-navy)' }}>Event Title</th>
                        <th style={{ padding: '10px 12px', fontWeight: 'bold', color: 'var(--color-primary-navy)' }}>Time</th>
                        <th style={{ padding: '10px 12px', fontWeight: 'bold', color: 'var(--color-primary-navy)' }}>Team Leader</th>
                        <th style={{ padding: '10px 12px', fontWeight: 'bold', color: 'var(--color-primary-navy)' }}>Land Member</th>
                        <th style={{ padding: '10px 12px', fontWeight: 'bold', color: 'var(--color-primary-navy)' }}>Air Member</th>
                        <th style={{ padding: '10px 12px', fontWeight: 'bold', color: 'var(--color-primary-navy)' }}>Cyber/EW</th>
                      </tr>
                    </thead>
                    <tbody>
                      {events.map((ev, idx) => {
                        const isExpanded = expandedEventId === (ev.id || idx);
                        const variations = ev.roleVariations || {};

                        const leaderStatus = variations.team_leader?.deliveryBehavior || ev.deliveryBehavior || 'normal';
                        const landStatus = variations.land_member?.deliveryBehavior || ev.deliveryBehavior || 'normal';
                        const airStatus = variations.air_member?.deliveryBehavior || ev.deliveryBehavior || 'normal';
                        const cyberStatus = variations.cyber_ew_member?.deliveryBehavior || ev.deliveryBehavior || 'normal';

                        return (
                          <React.Fragment key={ev.id || idx}>
                            <tr 
                              onClick={() => setExpandedEventId(isExpanded ? null : (ev.id || idx))}
                              style={{ borderBottom: '1px solid #E2E8F0', backgroundColor: isExpanded ? '#EFF6FF' : '#FFF', cursor: 'pointer' }}
                            >
                              <td style={{ padding: '10px 12px', fontWeight: 'bold', color: 'var(--color-primary-navy)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  {isExpanded ? <ChevronDown size={14} color="#2563EB" /> : <ChevronRight size={14} color="#64748B" />}
                                  <span>{ev.title}</span>
                                </div>
                              </td>
                              <td style={{ padding: '10px 12px', fontFamily: 'monospace' }}>
                                {ev.time || '00:00'}
                              </td>
                              <td style={{ padding: '10px 12px' }}>
                                <span style={{ padding: '2px 6px', borderRadius: '3px', fontWeight: 'bold', ...getStatusBadgeStyle(leaderStatus) }}>
                                  {leaderStatus === 'delayed' ? 'Delayed (+20s)' : leaderStatus}
                                </span>
                              </td>
                              <td style={{ padding: '10px 12px' }}>
                                <span style={{ padding: '2px 6px', borderRadius: '3px', fontWeight: 'bold', ...getStatusBadgeStyle(landStatus) }}>
                                  {landStatus === 'normal' ? 'Delivered' : landStatus}
                                </span>
                              </td>
                              <td style={{ padding: '10px 12px' }}>
                                <span style={{ padding: '2px 6px', borderRadius: '3px', fontWeight: 'bold', ...getStatusBadgeStyle(airStatus) }}>
                                  {airStatus === 'incomplete' ? 'Incomplete' : airStatus}
                                </span>
                              </td>
                              <td style={{ padding: '10px 12px' }}>
                                <span style={{ padding: '2px 6px', borderRadius: '3px', fontWeight: 'bold', ...getStatusBadgeStyle(cyberStatus) }}>
                                  {cyberStatus === 'dropped' ? 'Dropped (Lost)' : cyberStatus}
                                </span>
                              </td>
                            </tr>

                            {/* Expanded Row */}
                            {isExpanded && (
                              <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '2px solid #CBD5E1' }}>
                                <td colSpan={6} style={{ padding: '14px' }}>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    <div style={{ backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '4px', padding: '10px 12px' }}>
                                      <strong style={{ color: '#1E40AF', fontSize: '11px', textTransform: 'uppercase' }}>Ground Truth (Real Situation):</strong>
                                      <div style={{ fontSize: '12px', color: '#1E3A8A', marginTop: '2px' }}>{ev.content}</div>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                                      <div style={{ backgroundColor: '#FFF', border: '1px solid #E2E8F0', padding: '8px', borderRadius: '4px', fontSize: '11px' }}>
                                        <strong>Team Leader saw:</strong>
                                        <div style={{ color: '#475569', marginTop: '2px' }}>
                                          {variations.team_leader?.content || ev.content}
                                        </div>
                                      </div>
                                      <div style={{ backgroundColor: '#FFF', border: '1px solid #E2E8F0', padding: '8px', borderRadius: '4px', fontSize: '11px' }}>
                                        <strong>Land Member saw:</strong>
                                        <div style={{ color: '#475569', marginTop: '2px' }}>
                                          {variations.land_member?.content || ev.content}
                                        </div>
                                      </div>
                                      <div style={{ backgroundColor: '#FFF', border: '1px solid #E2E8F0', padding: '8px', borderRadius: '4px', fontSize: '11px' }}>
                                        <strong>Air Member saw:</strong>
                                        <div style={{ color: '#475569', marginTop: '2px' }}>
                                          {variations.air_member?.content || ev.content}
                                        </div>
                                      </div>
                                      <div style={{ backgroundColor: '#FFF', border: '1px solid #E2E8F0', padding: '8px', borderRadius: '4px', fontSize: '11px' }}>
                                        <strong>Cyber/EW Member saw:</strong>
                                        <div style={{ color: variations.cyber_ew_member?.deliveryBehavior === 'dropped' ? '#DC2626' : '#475569', marginTop: '2px' }}>
                                          {variations.cyber_ew_member?.deliveryBehavior === 'dropped' ? '[Message Dropped — Lost in Jamming]' : (variations.cyber_ew_member?.content || ev.content)}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB 3: COMMAND DECISIONS AUDIT */}
            {activeReportTab === 'decisions' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ fontSize: '13px', color: '#475569' }}>
                  Audited log of tactical decisions made by the squad, comparing stated rationales against the ground-truth situation.
                </div>

                {decisions.length === 0 ? (
                  <div style={{ padding: '24px', textAlign: 'center', color: '#64748B', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '4px' }}>
                    No decisions were recorded during this exercise session.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {decisions.map((d, index) => (
                      <div 
                        key={d.id || index}
                        style={{
                          backgroundColor: '#F8FAFC',
                          border: '1px solid #CBD5E1',
                          borderLeft: '4px solid var(--color-primary-navy)',
                          padding: '14px'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 'bold', color: 'var(--color-primary-navy)' }}>
                          <span>Decision #{index + 1}: {d.title}</span>
                          <span style={{ fontSize: '11px', color: 'var(--color-terracotta)', fontWeight: 'bold' }}>
                            T+ {d.elapsedTimeFormatted || `${d.elapsedMinutes || 0} mins`}
                          </span>
                        </div>

                        <div style={{ fontSize: '13px', color: 'var(--color-text-primary)', marginTop: '6px', lineHeight: '1.5' }}>
                          <strong>Rationale &amp; Assumptions:</strong> {d.rationale}
                        </div>

                        <div style={{ fontSize: '11px', color: '#64748B', marginTop: '8px', display: 'flex', gap: '16px', borderTop: '1px solid #E2E8F0', paddingTop: '6px' }}>
                          <span>Operator: <strong>{d.submittedBy || 'Operator'}</strong> ({ROLE_LABELS[d.submittedRole] || d.submittedRole || 'Commander'})</span>
                          <span>Confidence: <strong>{d.confidence || 'Medium'}</strong></span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 4: TEAM CHAT TRANSCRIPT */}
            {activeReportTab === 'chat' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ fontSize: '13px', color: '#475569' }}>
                  Complete transcript of team communication exchanged in the squad channel during the exercise.
                </div>

                {teamMessages.length === 0 ? (
                  <div style={{ padding: '24px', textAlign: 'center', color: '#64748B', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '4px' }}>
                    No team chat messages were sent during this exercise.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '420px', overflowY: 'auto' }}>
                    {teamMessages.map((msg, index) => (
                      <div key={msg.id || index} style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '4px', padding: '10px 12px', fontSize: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', color: 'var(--color-primary-navy)', marginBottom: '3px' }}>
                          <span>
                            {msg.senderName} <span style={{ fontSize: '10px', color: '#475569', background: '#E2E8F0', padding: '1px 5px', borderRadius: '2px' }}>[{ROLE_LABELS[msg.senderRole] || msg.senderRole}]</span>
                          </span>
                          <span style={{ fontSize: '10px', color: '#94A3B8' }}>
                            {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                          </span>
                        </div>
                        <div style={{ color: '#334155', lineHeight: '1.4' }}>{msg.text}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 5: INJECTED DISRUPTIONS */}
            {activeReportTab === 'disruptions' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ fontSize: '13px', color: '#475569' }}>
                  Audited log of live disruptions injected by the Instructor during this exercise session.
                </div>

                {disruptions.length === 0 ? (
                  <div style={{ padding: '24px', textAlign: 'center', color: '#64748B', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '4px' }}>
                    No instructor disruptions were injected during this exercise session.
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto', border: '1px solid #E2E8F0', borderRadius: '4px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '2px solid #CBD5E1', textAlign: 'left' }}>
                          <th style={{ padding: '10px 12px', fontWeight: 'bold', color: 'var(--color-primary-navy)' }}>Injected Time</th>
                          <th style={{ padding: '10px 12px', fontWeight: 'bold', color: 'var(--color-primary-navy)' }}>Target Role</th>
                          <th style={{ padding: '10px 12px', fontWeight: 'bold', color: 'var(--color-primary-navy)' }}>Disruption Type</th>
                          <th style={{ padding: '10px 12px', fontWeight: 'bold', color: 'var(--color-primary-navy)' }}>Severity</th>
                          <th style={{ padding: '10px 12px', fontWeight: 'bold', color: 'var(--color-primary-navy)' }}>Duration</th>
                          <th style={{ padding: '10px 12px', fontWeight: 'bold', color: 'var(--color-primary-navy)' }}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {disruptions.map((dis, idx) => (
                          <tr key={dis.id || idx} style={{ borderBottom: '1px solid #E2E8F0' }}>
                            <td style={{ padding: '10px 12px', fontFamily: 'monospace', fontWeight: 'bold', color: '#2563EB' }}>
                              T+ {formatSecondsToMMSS(dis.injectedAtSec || 0)}
                            </td>
                            <td style={{ padding: '10px 12px', fontWeight: 'bold', color: 'var(--color-primary-navy)' }}>
                              {dis.targetLabel || TARGET_LABELS[dis.target] || dis.target}
                            </td>
                            <td style={{ padding: '10px 12px' }}>
                              <span style={{ fontWeight: 'bold', color: dis.disruptionType === 'restore' ? '#15803D' : '#991B1B' }}>
                                {dis.typeLabel || DISRUPTION_TYPE_LABELS[dis.disruptionType] || dis.disruptionType}
                              </span>
                            </td>
                            <td style={{ padding: '10px 12px', textTransform: 'capitalize' }}>
                              {dis.severity || 'Normal'}
                            </td>
                            <td style={{ padding: '10px 12px' }}>
                              {dis.duration ? `${dis.duration}s` : 'Immediate'}
                            </td>
                            <td style={{ padding: '10px 12px' }}>
                              <span style={{
                                fontSize: '11px',
                                fontWeight: 'bold',
                                padding: '2px 6px',
                                borderRadius: '3px',
                                backgroundColor: dis.status === 'Active' ? '#FEE2E2' : dis.status === 'Restored' ? '#DCFCE7' : '#F1F5F9',
                                color: dis.status === 'Active' ? '#991B1B' : dis.status === 'Restored' ? '#15803D' : '#475569'
                              }}>
                                {dis.status || 'Executed'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* TAB 6: TIMELINE REPLAY PLAYER */}
            {activeReportTab === 'replay' && (
              <TimelineReplay aar={selectedAAR} />
            )}

            {/* TAB 7: PARTICIPANT HISTORY */}
            {activeReportTab === 'participant_history' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', backgroundColor: '#F8FAFC', padding: '10px 14px', border: '1px solid #CBD5E1' }}>
                  <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--color-primary-navy)' }}>Select Participant Role:</span>
                  {['ALL', 'COMMANDER', 'FIELD_UNIT', 'LOGISTICS', 'SIGNALS'].map(role => (
                    <button
                      key={role}
                      onClick={() => setSelectedParticipantRole(role)}
                      style={{
                        background: selectedParticipantRole === role ? 'var(--color-primary-navy)' : '#FFF',
                        color: selectedParticipantRole === role ? '#FFF' : '#334155',
                        border: '1px solid #CBD5E1',
                        padding: '3px 8px',
                        fontSize: '11px',
                        fontWeight: 'bold',
                        cursor: 'pointer'
                      }}
                    >
                      {role}
                    </button>
                  ))}
                </div>

                <div style={{ backgroundColor: '#FFF', border: '1px solid #CBD5E1', padding: '16px' }}>
                  <h4 style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--color-primary-navy)', marginBottom: '8px' }}>
                    Information Available at Time of Decision
                  </h4>
                  <p style={{ fontSize: '12px', color: '#64748B', marginBottom: '14px' }}>
                    Contrast the information delivered to the participant against the ground-truth exercise state.
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {events.map((ev, i) => (
                      <div key={ev.id || i} style={{ backgroundColor: '#F8FAFC', border: '1px solid #CBD5E1', padding: '12px', fontSize: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', color: 'var(--color-primary-navy)' }}>
                          <span>[{ev.scheduledTimeFormatted || ev.time || '00:00'}] {ev.title}</span>
                          <span style={{ textTransform: 'uppercase', color: ev.status === 'DROPPED' || ev.deliveryBehavior === 'dropped' ? '#DC2626' : '#15803D' }}>
                            {ev.deliveryBehavior || ev.status || 'delivered'}
                          </span>
                        </div>
                        <div style={{ color: '#334155', marginTop: '4px' }}>{ev.content}</div>
                      </div>
                    ))}
                    {events.length === 0 && (
                      <div style={{ padding: '16px', fontSize: '13px', color: '#64748B' }}>No communication events recorded for this exercise.</div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 8: COMMS ANALYSIS */}
            {activeReportTab === 'comms_analysis' && (
              <div style={{ backgroundColor: '#FFF', border: '1px solid #CBD5E1', padding: '16px' }}>
                <h4 style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--color-primary-navy)', marginBottom: '12px' }}>
                  Scheduled vs Actual Telemetry Delivery Audit
                </h4>

                {events.length === 0 ? (
                  <div style={{ padding: '16px', fontSize: '13px', color: '#64748B' }}>No communication events recorded for this exercise.</div>
                ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '2px solid #CBD5E1', textAlign: 'left' }}>
                      <th style={{ padding: '8px 10px', fontWeight: 'bold' }}>Event Title</th>
                      <th style={{ padding: '8px 10px', fontWeight: 'bold' }}>Delivery Behavior</th>
                      <th style={{ padding: '8px 10px', fontWeight: 'bold' }}>Target Role</th>
                      <th style={{ padding: '8px 10px', fontWeight: 'bold' }}>Scheduled</th>
                      <th style={{ padding: '8px 10px', fontWeight: 'bold' }}>Actual Delivery</th>
                      <th style={{ padding: '8px 10px', fontWeight: 'bold' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {events.map((ev, i) => {
                      const statusColor = ev.status === 'DROPPED' ? '#DC2626'
                        : ev.status === 'DELAYED' ? '#D97706'
                        : ev.status === 'DELIVERED' ? '#15803D'
                        : '#94A3B8';
                      return (
                        <tr key={ev.id || i} style={{ borderBottom: '1px solid #E2E8F0' }}>
                          <td style={{ padding: '8px 10px', fontWeight: 'bold' }}>{ev.title}</td>
                          <td style={{ padding: '8px 10px', textTransform: 'uppercase' }}>{ev.deliveryBehavior || 'normal'}</td>
                          <td style={{ padding: '8px 10px' }}>{ev.intendedRecipient || ev.recipientRole || 'all'}</td>
                          <td style={{ padding: '8px 10px' }}>{ev.scheduledTimeFormatted || ev.time || '00:00'}</td>
                          <td style={{ padding: '8px 10px' }}>
                            {ev.status === 'DROPPED' ? 'UNDELIVERED (DROPPED)'
                              : (ev.actualDeliveryTimeFormatted || ev.scheduledTimeFormatted || ev.time || '00:00')}
                          </td>
                          <td style={{ padding: '8px 10px', fontWeight: 'bold', color: statusColor }}>
                            {ev.status || (ev.deliveryBehavior === 'dropped' ? 'DROPPED' : 'DELIVERED')}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                )}
              </div>
            )}

            {/* TAB 9: PERFORMANCE SCORE */}
            {activeReportTab === 'score' && perfScore && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* Score Hero Card */}
                <div style={{ backgroundColor: '#0F172A', border: '1px solid #334155', padding: '28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '24px', flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 'bold', letterSpacing: '1px', marginBottom: '6px' }}>COMPOSITE PERFORMANCE SCORE</div>
                    <div style={{ fontFamily: 'monospace', fontSize: '64px', fontWeight: '900', color: perfScore.gradeColor, lineHeight: 1 }}>
                      {perfScore.total}
                      <span style={{ fontSize: '24px', color: '#64748B' }}>/100</span>
                    </div>
                    <div style={{ marginTop: '8px', fontSize: '13px', color: '#CBD5E1' }}>
                      Exercise: <strong style={{ color: '#F1F5F9' }}>{selectedAAR.sessionName}</strong>
                    </div>
                  </div>
                  <div style={{ textAlign: 'center', border: `3px solid ${perfScore.gradeColor}`, padding: '16px 28px', borderRadius: '4px' }}>
                    <div style={{ fontSize: '10px', color: '#94A3B8', fontWeight: 'bold', marginBottom: '4px' }}>GRADE</div>
                    <div style={{ fontFamily: 'var(--font-family-serif)', fontSize: '72px', fontWeight: '900', color: perfScore.gradeColor, lineHeight: 1 }}>
                      {perfScore.grade}
                    </div>
                    <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '4px' }}>
                      {perfScore.total >= 90 ? 'Outstanding' : perfScore.total >= 75 ? 'Proficient' : perfScore.total >= 60 ? 'Adequate' : perfScore.total >= 45 ? 'Marginal' : 'Unsatisfactory'}
                    </div>
                  </div>
                </div>

                {/* Score Breakdown Bars */}
                <div style={{ backgroundColor: '#FFF', border: '1px solid #CBD5E1', borderTop: '3px solid var(--color-primary-navy)', padding: '20px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--color-primary-navy)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <BarChart2 size={16} />
                    Score Pillar Breakdown
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {perfScore.breakdown.map((pillar, i) => {
                      const pct = Math.round((pillar.score / pillar.max) * 100);
                      const barColor = pct >= 80 ? '#15803D' : pct >= 60 ? '#D97706' : '#DC2626';
                      return (
                        <div key={i}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                            <div>
                              <span style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--color-primary-navy)' }}>{pillar.label}</span>
                              <span style={{ fontSize: '11px', color: '#64748B', marginLeft: '8px' }}>{pillar.desc}</span>
                            </div>
                            <span style={{ fontFamily: 'monospace', fontWeight: 'bold', fontSize: '14px', color: barColor }}>
                              {pillar.score} / {pillar.max}
                            </span>
                          </div>
                          <div style={{ height: '10px', backgroundColor: '#E2E8F0', borderRadius: '2px', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${pct}%`, backgroundColor: barColor, transition: 'width 0.4s ease' }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Scoring Methodology */}
                <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #CBD5E1', padding: '16px', fontSize: '12px', color: '#475569' }}>
                  <div style={{ fontWeight: 'bold', color: 'var(--color-primary-navy)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <TrendingUp size={14} />
                    Scoring Methodology
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <div><strong>Decision Compliance (35 pts):</strong> At least 1 decision per 2 friction events required for full marks.</div>
                    <div><strong>Rationale Quality (25 pts):</strong> Average word count across all submitted rationales. 20+ words earns full marks.</div>
                    <div><strong>Comm Handling (25 pts):</strong> Deductions for unaddressed delayed, dropped, or incomplete communication events.</div>
                    <div><strong>Intel Verification (15 pts):</strong> Full marks if conflicting or incomplete intel is explicitly acknowledged in decision rationale.</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div style={{ backgroundColor: '#FFF', padding: '32px', textAlign: 'center', color: '#64748B', border: '1px solid #CBD5E1' }}>
            Select an AAR record from the left column to inspect the detailed report.
          </div>
        )}
      </div>
    </div>
  );
};
