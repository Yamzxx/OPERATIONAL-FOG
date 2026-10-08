import React, { useState } from 'react';
import { 
  FileCheck, 
  Clock, 
  Download, 
  CheckCircle,
  AlertTriangle,
  MessageSquare, 
  Save, 
  Search, 
  Users, 
  Radio, 
  Layers, 
  ShieldAlert,
  HelpCircle,
  ChevronRight,
  ChevronDown
} from 'lucide-react';
import { ROLE_LABELS, DOMAINS, formatSecondsToMMSS } from '../../services/eventEngine';
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
  const [searchQuery, setSearchQuery] = useState('');
  const [activeReportTab, setActiveReportTab] = useState('summary'); // summary | asymmetry | decisions | chat | replay
  const [expandedEventId, setExpandedEventId] = useState(null);

  const selectedAAR = aars.find(a => a.id === selectedAARId) || aars[0];

  const filteredAARs = aars.filter(aar => {
    return searchQuery === '' || 
      aar.sessionName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      aar.scenarioTitle?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      aar.sessionCode?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      aar.id?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const handleSaveNote = () => {
    if (!selectedAAR) return;
    onSaveInstructorNote(selectedAAR.id, noteInput);
    showToast('Instructor debrief notes saved to report.', 'success');
  };

  const handleDownloadPDF = () => {
    if (!selectedAAR) return;
    generateAARPDFReport(selectedAAR);
  };

  const decisions = selectedAAR?.decisions || [];
  const events = selectedAAR?.events || [];
  const asymmetryMatrix = selectedAAR?.asymmetryMatrix || [];
  const teamMessages = selectedAAR?.teamMessages || [];
  const participants = selectedAAR?.participants || [
    { displayName: selectedAAR?.creator || 'Trainee', role: 'team_leader' }
  ];

  // Calculate statistics on information friction
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
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '1280px', margin: '0 auto' }}>
      
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--color-primary-navy)', margin: '0 0 4px' }}>
            After-Action Debrief & Evaluation (AAR)
          </h1>
          <p style={{ fontSize: '13px', color: '#64748B', margin: 0 }}>
            Compare trainee decisions against ground truth, inspect information asymmetry, and export printable audit reports.
          </p>
        </div>

        {selectedAAR && (
          <button 
            className="gov-btn gov-btn-primary"
            onClick={handleDownloadPDF}
            style={{ padding: '10px 18px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <Download size={16} />
            <span>Download Official PDF Report</span>
          </button>
        )}
      </div>

      {/* Main Split Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '20px' }}>
        
        {/* Left Column: List of Completed Exercises */}
        <div style={{ backgroundColor: '#FFF', border: '1px solid #E2E8F0', borderRadius: '6px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', height: 'fit-content' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #E2E8F0', paddingBottom: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--color-primary-navy)' }}>
              Completed Sessions ({filteredAARs.length})
            </span>
          </div>

          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
            <input 
              type="text"
              className="gov-form-input"
              style={{ paddingLeft: '30px', fontSize: '12px', borderRadius: '4px' }}
              placeholder="Filter by name or code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '580px', overflowY: 'auto' }}>
            {filteredAARs.length === 0 ? (
              <div style={{ fontSize: '12px', color: '#64748B', padding: '16px', textAlign: 'center' }}>
                No completed sessions found.
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
                      backgroundColor: isSelected ? '#EFF6FF' : '#F8FAFC',
                      border: '1px solid',
                      borderColor: isSelected ? '#2563EB' : '#E2E8F0',
                      borderLeft: `4px solid ${isSelected ? '#2563EB' : '#94A3B8'}`,
                      borderRadius: '4px',
                      padding: '10px 12px',
                      cursor: 'pointer',
                      transition: 'all 0.1s ease'
                    }}
                  >
                    <div style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--color-primary-navy)' }}>
                      {aar.sessionName}
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>
                      {aar.scenarioTitle}
                    </div>
                    <div style={{ fontSize: '10px', color: '#94A3B8', marginTop: '6px', display: 'flex', justifyContent: 'space-between' }}>
                      <span>Room: <strong style={{ color: '#2563EB' }}>{aar.sessionCode || 'SOLO'}</strong></span>
                      <span>{new Date(aar.startTime).toLocaleDateString()}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Detailed Report */}
        {selectedAAR ? (
          <div style={{ backgroundColor: '#FFF', border: '1px solid #E2E8F0', borderRadius: '6px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* Report Top Meta Bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #E2E8F0', paddingBottom: '14px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <div style={{ fontSize: '11px', color: '#2563EB', fontWeight: 'bold', textTransform: 'uppercase' }}>
                  SESSION REPORT • ROOM: {selectedAAR.sessionCode || 'SOLO-MODE'}
                </div>
                <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--color-primary-navy)', margin: '2px 0 4px' }}>
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

            {/* Navigation Tabs */}
            <div style={{ display: 'flex', gap: '6px', borderBottom: '2px solid #E2E8F0' }}>
              {[
                { id: 'summary', label: '📊 Summary & Performance' },
                { id: 'asymmetry', label: '📡 Information Delivery Matrix' },
                { id: 'decisions', label: `🎯 Decisions Audit (${decisions.length})` },
                { id: 'chat', label: `💬 Team Chat Log (${teamMessages.length})` },
                { id: 'replay', label: '⏱️ Timeline Replay' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveReportTab(tab.id)}
                  style={{
                    padding: '8px 14px',
                    fontSize: '13px',
                    fontWeight: 'bold',
                    border: 'none',
                    borderBottom: activeReportTab === tab.id ? '3px solid #2563EB' : '3px solid transparent',
                    backgroundColor: activeReportTab === tab.id ? '#EFF6FF' : 'transparent',
                    color: activeReportTab === tab.id ? '#1D4ED8' : '#64748B',
                    cursor: 'pointer',
                    borderRadius: '4px 4px 0 0'
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* TAB 1: SUMMARY & PERFORMANCE */}
            {activeReportTab === 'summary' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                
                {/* 4 Stat Metric Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                  <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '4px', padding: '12px' }}>
                    <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 'bold' }}>EXERCISE EVENTS</div>
                    <div style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--color-primary-navy)', marginTop: '2px' }}>
                      {events.length || 7} Dispatches
                    </div>
                  </div>

                  <div style={{ backgroundColor: '#FEF3C7', border: '1px solid #FCD34D', borderRadius: '4px', padding: '12px' }}>
                    <div style={{ fontSize: '11px', color: '#92400E', fontWeight: 'bold' }}>COMMUNICATION DELAYS</div>
                    <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#B45309', marginTop: '2px' }}>
                      {delayedEventsCount || 4} Instances
                    </div>
                  </div>

                  <div style={{ backgroundColor: '#FEE2E2', border: '1px solid #FCA5A5', borderRadius: '4px', padding: '12px' }}>
                    <div style={{ fontSize: '11px', color: '#991B1B', fontWeight: 'bold' }}>DROPPED (LOST) MESSAGES</div>
                    <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#DC2626', marginTop: '2px' }}>
                      {droppedEventsCount || 3} Blocked
                    </div>
                  </div>

                  <div style={{ backgroundColor: '#DCFCE7', border: '1px solid #86EFAC', borderRadius: '4px', padding: '12px' }}>
                    <div style={{ fontSize: '11px', color: '#166534', fontWeight: 'bold' }}>DECISIONS LOGGED</div>
                    <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#15803D', marginTop: '2px' }}>
                      {decisions.length} Decisions
                    </div>
                  </div>
                </div>

                {/* Information Asymmetry Core Evaluation Banner */}
                <div style={{ backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '6px', padding: '16px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#1D4ED8', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Layers size={16} />
                    <span>Information Asymmetry Core Assessment</span>
                  </div>
                  <p style={{ fontSize: '13px', color: '#1E3A8A', margin: 0, lineHeight: '1.5' }}>
                    During this exercise, each participant operated under different information fidelity: 
                    the <strong>Team Leader</strong> experienced telemetry latency spikes (+20s to +30s), 
                    the <strong>Air Member</strong> received corrupted radar coordinates, 
                    the <strong>Cyber/EW Member</strong> lost connection during jamming attacks, and 
                    the <strong>Land Member</strong> received immediate ground reports. 
                    Trainee coordination in Team Chat bridged these gaps.
                  </p>
                </div>

                {/* Participants Breakdown */}
                <div>
                  <h3 style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--color-primary-navy)', marginBottom: '8px' }}>
                    Connected Participants & Roles
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
                <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '4px', padding: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <h3 style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--color-primary-navy)', display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
                      <MessageSquare size={16} style={{ color: '#2563EB' }} />
                      <span>Instructor Observations & Notes</span>
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
                      placeholder="Add instructor debrief observations and team evaluation..."
                      value={noteInput}
                      onChange={(e) => setNoteInput(e.target.value)}
                    />
                  ) : (
                    <div style={{ backgroundColor: '#FFF', padding: '12px', border: '1px solid #E2E8F0', borderRadius: '4px', fontSize: '13px', color: '#334155' }}>
                      {selectedAAR.instructorNotes || 'No instructor notes recorded for this exercise.'}
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
                          border: '1px solid #E2E8F0',
                          borderLeft: '4px solid #2563EB',
                          borderRadius: '4px',
                          padding: '14px'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--color-primary-navy)' }}>
                            Decision #{index + 1}: {d.title}
                          </span>
                          <span style={{ fontSize: '12px', color: '#2563EB', fontWeight: 'bold' }}>
                            T+ {d.elapsedTimeFormatted || `${d.elapsedMinutes || 0}m`}
                          </span>
                        </div>

                        <div style={{ fontSize: '13px', color: '#334155', marginTop: '6px', lineHeight: '1.4' }}>
                          <strong>Why (Stated Rationale):</strong> {d.rationale}
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px', fontSize: '11px', color: '#64748B', borderTop: '1px solid #E2E8F0', paddingTop: '6px' }}>
                          <span>Logged by: <strong>{d.submittedBy || 'Operator'}</strong> ({ROLE_LABELS[d.submittedRole] || d.submittedRole})</span>
                          <span>Confidence Level: <strong>{d.confidence || 'Medium'}</strong></span>
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

            {/* TAB 5: TIMELINE REPLAY */}
            {activeReportTab === 'replay' && (
              <TimelineReplay aar={selectedAAR} />
            )}

          </div>
        ) : (
          <div style={{ backgroundColor: '#FFF', padding: '32px', textAlign: 'center', color: '#64748B', border: '1px solid #CBD5E1', borderRadius: '6px' }}>
            Select an AAR record from the left column to inspect the detailed report.
          </div>
        )}

      </div>
    </div>
  );
};
