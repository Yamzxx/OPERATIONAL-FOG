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
  Play
} from 'lucide-react';
import { formatSecondsToMMSS } from '../../services/eventEngine';
import { TimelineReplay } from './TimelineReplay';
import { generateAARPDFReport } from '../../services/pdfExporter';

export const AfterActionReview = ({ 
  aars, 
  onSaveInstructorNote, 
  userRole 
}) => {
  const [selectedAARId, setSelectedAARId] = useState(aars[0]?.id || null);
  const [noteInput, setNoteInput] = useState('');
  const [scenarioFilter, setScenarioFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedParticipantRole, setSelectedParticipantRole] = useState('ALL');
  const [activeReportTab, setActiveReportTab] = useState('summary'); // summary | replay | participant_history | comms_analysis

  const selectedAAR = aars.find(a => a.id === selectedAARId) || aars[0];

  const filteredAARs = aars.filter(aar => {
    const matchesSearch = searchQuery === '' || 
      aar.sessionName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      aar.scenarioTitle?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      aar.id?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesScenario = scenarioFilter === 'ALL' || aar.scenarioTitle?.toUpperCase().includes(scenarioFilter);
    return matchesSearch && matchesScenario;
  });

  const handleSaveNote = () => {
    if (!selectedAAR) return;
    onSaveInstructorNote(selectedAAR.id, noteInput);
    alert('Instructor qualitative debrief notes saved to AAR record.');
  };

  const handleDownloadPDF = () => {
    if (!selectedAAR) return;
    generateAARPDFReport(selectedAAR);
  };

  const decisions = selectedAAR?.decisions || [];
  const events = selectedAAR?.events || [];
  const participants = selectedAAR?.participants || [
    { displayName: selectedAAR?.creator || 'Operator', role: 'commander' }
  ];

  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-family-serif)', fontSize: '24px', fontWeight: '800', color: 'var(--color-primary-navy)' }}>
            After-Action Review (AAR) & Telemetry Audit Workspace
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
                    <span>Decisions: {aar.decisionsCount || aar.decisions?.length || 0}</span>
                    <span>{new Date(aar.startTime).toLocaleDateString()}</span>
                  </div>
                  {aar.isSample && (
                    <span style={{ marginTop: '4px', display: 'inline-block', fontSize: '9px', background: '#E2E8F0', color: '#475569', padding: '1px 4px', fontWeight: 'bold' }}>
                      SAMPLE DEMO RECORD
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #E2E8F0', paddingBottom: '14px' }}>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--color-terracotta)', fontWeight: 'bold' }}>
                  AAR REF: {selectedAAR.id} {selectedAAR.isSample ? '(SAMPLE DEMO RECORD)' : '(ACTUAL EXERCISE RECORD)'}
                </div>
                <h2 style={{ fontFamily: 'var(--font-family-serif)', fontSize: '20px', fontWeight: '800', color: 'var(--color-primary-navy)', margin: '2px 0 4px' }}>
                  {selectedAAR.sessionName}
                </h2>
                <div style={{ fontSize: '13px', color: '#475569' }}>
                  Scenario: <strong>{selectedAAR.scenarioTitle}</strong>
                </div>
              </div>

              <div style={{ textAlign: 'right', fontSize: '12px', color: '#64748B' }}>
                <div>Start: {new Date(selectedAAR.startTime).toLocaleString()}</div>
                <div>End: {new Date(selectedAAR.endTime || selectedAAR.startTime).toLocaleString()}</div>
              </div>
            </div>

            {/* Sub-View Navigation Tabs */}
            <div style={{ display: 'flex', gap: '4px', borderBottom: '2px solid #CBD5E1' }}>
              {[
                { id: 'summary', label: 'Exercise Summary' },
                { id: 'replay', label: 'Timeline Replay Player' },
                { id: 'participant_history', label: 'Participant History & Info State' },
                { id: 'comms_analysis', label: 'Communication Analysis' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveReportTab(tab.id)}
                  style={{
                    padding: '8px 16px',
                    fontSize: '13px',
                    fontWeight: 'bold',
                    border: 'none',
                    borderBottom: activeReportTab === tab.id ? '3px solid var(--color-terracotta)' : '3px solid transparent',
                    backgroundColor: activeReportTab === tab.id ? '#F8FAFC' : 'transparent',
                    color: activeReportTab === tab.id ? 'var(--color-primary-navy)' : '#64748B',
                    cursor: 'pointer'
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
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', backgroundColor: '#F8FAFC', padding: '16px', border: '1px solid #CBD5E1' }}>
                  <div>
                    <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#64748B' }}>EXERCISE DURATION</div>
                    <div style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--color-primary-navy)' }}>{selectedAAR.durationMinutes || 45} mins</div>
                  </div>

                  <div>
                    <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#64748B' }}>DECISIONS LOGGED</div>
                    <div style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--color-primary-navy)' }}>{decisions.length} Actions</div>
                  </div>

                  <div>
                    <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#64748B' }}>PARTICIPANTS</div>
                    <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#0369A1' }}>{participants.length} Connected</div>
                  </div>

                  <div>
                    <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#64748B' }}>SIMULATION EVENTS</div>
                    <div style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--color-terracotta)' }}>{events.length || 4} Dispatches</div>
                  </div>
                </div>

                {/* Submitted Decisions Table */}
                <div>
                  <h3 style={{ fontSize: '15px', fontWeight: 'bold', color: 'var(--color-primary-navy)', marginBottom: '10px' }}>
                    Command Decisions & Rationales
                  </h3>

                  {decisions.length === 0 ? (
                    <div style={{ backgroundColor: '#F8FAFC', padding: '16px', fontSize: '13px', color: '#64748B' }}>
                      No decisions logged during this exercise session.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
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
                            <strong>Rationale & Assumptions:</strong> {d.rationale}
                          </div>

                          <div style={{ fontSize: '11px', color: '#64748B', marginTop: '8px', display: 'flex', gap: '16px' }}>
                            <span>Operator: <strong>{d.submittedBy || 'Operator'}</strong> ({d.submittedRole || 'Commander'})</span>
                            <span>Confidence: <strong>{d.confidence || 'Medium'}</strong></span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Instructor Notes */}
                <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #CBD5E1', padding: '18px', borderTop: '3px solid var(--color-terracotta)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <h3 style={{ fontSize: '15px', fontWeight: 'bold', color: 'var(--color-primary-navy)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <MessageSquare size={16} style={{ color: 'var(--color-terracotta)' }} />
                      <span>Instructor Debrief Observations & Notes</span>
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

            {/* TAB 2: TIMELINE REPLAY PLAYER */}
            {activeReportTab === 'replay' && (
              <TimelineReplay aar={selectedAAR} />
            )}

            {/* TAB 3: PARTICIPANT HISTORY */}
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
                          <span>[{ev.time || '00:00'}] {ev.title}</span>
                          <span style={{ textTransform: 'uppercase', color: ev.deliveryBehavior === 'dropped' ? '#DC2626' : '#15803D' }}>
                            {ev.deliveryBehavior || 'delivered'}
                          </span>
                        </div>
                        <div style={{ color: '#334155', marginTop: '4px' }}>{ev.content}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: COMMS ANALYSIS */}
            {activeReportTab === 'comms_analysis' && (
              <div style={{ backgroundColor: '#FFF', border: '1px solid #CBD5E1', padding: '16px' }}>
                <h4 style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--color-primary-navy)', marginBottom: '12px' }}>
                  Scheduled vs Actual Telemetry Delivery Audit
                </h4>

                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '2px solid #CBD5E1', textAlign: 'left' }}>
                      <th style={{ padding: '8px 10px', fontWeight: 'bold' }}>Event Title</th>
                      <th style={{ padding: '8px 10px', fontWeight: 'bold' }}>Delivery Behavior</th>
                      <th style={{ padding: '8px 10px', fontWeight: 'bold' }}>Target Role</th>
                      <th style={{ padding: '8px 10px', fontWeight: 'bold' }}>Scheduled</th>
                      <th style={{ padding: '8px 10px', fontWeight: 'bold' }}>Actual Delivery</th>
                    </tr>
                  </thead>
                  <tbody>
                    {events.map((ev, i) => (
                      <tr key={ev.id || i} style={{ borderBottom: '1px solid #E2E8F0' }}>
                        <td style={{ padding: '8px 10px', fontWeight: 'bold' }}>{ev.title}</td>
                        <td style={{ padding: '8px 10px', textTransform: 'uppercase' }}>{ev.deliveryBehavior || 'normal'}</td>
                        <td style={{ padding: '8px 10px' }}>{ev.recipientRole || 'all'}</td>
                        <td style={{ padding: '8px 10px' }}>{ev.time || '00:00'}</td>
                        <td style={{ padding: '8px 10px' }}>{ev.deliveryBehavior === 'dropped' ? 'UNDELIVERED (DROPPED)' : (ev.time || '00:00')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
