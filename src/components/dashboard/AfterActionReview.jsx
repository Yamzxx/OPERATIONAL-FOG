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
  FileText,
  AlertCircle
} from 'lucide-react';

export const AfterActionReview = ({ 
  aars, 
  onSaveInstructorNote, 
  userRole 
}) => {
  const [selectedAARId, setSelectedAARId] = useState(aars[0]?.id || null);
  const [noteInput, setNoteInput] = useState('');
  const [scenarioFilter, setScenarioFilter] = useState('ALL');

  const selectedAAR = aars.find(a => a.id === selectedAARId) || aars[0];

  const filteredAARs = aars.filter(aar => {
    if (scenarioFilter === 'ALL') return true;
    return aar.scenarioTitle.toUpperCase().includes(scenarioFilter);
  });

  const handleSaveNote = () => {
    if (!selectedAAR) return;
    onSaveInstructorNote(selectedAAR.id, noteInput);
    alert('Instructor qualitative notes saved to AAR record.');
  };

  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-family-serif)', fontSize: '24px', fontWeight: '800', color: 'var(--color-primary-navy)' }}>
            After-Action Review (AAR)
          </h1>
          <p style={{ fontSize: '13px', color: '#64748B', marginTop: '4px' }}>
            Timeline reconstruction, recorded command rationales, and instructor qualitative observations.
          </p>
        </div>

        <button 
          className="gov-btn gov-btn-outline"
          style={{ color: '#475569', borderColor: '#CBD5E1', cursor: 'not-allowed' }}
          onClick={() => alert('PDF Export functionality is scheduled for Platform Release v2.5. Currently displaying digital AAR record.')}
        >
          <Download size={15} />
          <span>PDF Export (v2.5 Placeholder)</span>
        </button>
      </div>

      {/* Filter Strip */}
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', backgroundColor: '#FFF', padding: '12px 16px', border: '1px solid #CBD5E1' }}>
        <Filter size={16} style={{ color: '#64748B' }} />
        <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--color-primary-navy)' }}>Scenario Filter:</span>

        {['ALL', 'SCENARIO A', 'SCENARIO B', 'SCENARIO C'].map(filter => (
          <button
            key={filter}
            onClick={() => setScenarioFilter(filter)}
            style={{
              background: scenarioFilter === filter ? 'var(--color-primary-navy)' : '#F1F5F9',
              color: scenarioFilter === filter ? '#FFF' : '#334155',
              border: '1px solid #CBD5E1',
              padding: '4px 10px',
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

      {/* Main Split Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '24px' }}>
        {/* Left Side: AAR Records List */}
        <div style={{ backgroundColor: '#FFF', border: '1px solid #CBD5E1', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--color-primary-navy)', borderBottom: '1px solid #E2E8F0', paddingBottom: '8px' }}>
            Completed AAR Archives ({filteredAARs.length})
          </div>

          {filteredAARs.length === 0 ? (
            <div style={{ fontSize: '12px', color: '#64748B', padding: '12px 0' }}>No AAR records available.</div>
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

        {/* Right Side: Selected AAR Details */}
        {selectedAAR ? (
          <div style={{ backgroundColor: '#FFF', border: '1px solid #CBD5E1', borderTop: '3px solid var(--color-primary-navy)', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* AAR Top Meta Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #E2E8F0', paddingBottom: '14px' }}>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--color-terracotta)', fontWeight: 'bold' }}>
                  AAR RECORD REF: {selectedAAR.id} {selectedAAR.isSample ? '(SAMPLE DEMO RECORD)' : '(ACTUAL EXERCISE LOG)'}
                </div>
                <h2 style={{ fontFamily: 'var(--font-family-serif)', fontSize: '20px', fontWeight: '800', color: 'var(--color-primary-navy)', margin: '2px 0 4px' }}>
                  {selectedAAR.sessionName}
                </h2>
                <div style={{ fontSize: '13px', color: '#475569' }}>
                  Scenario: <strong>{selectedAAR.scenarioTitle}</strong>
                </div>
              </div>

              <div style={{ textAlignment: 'right', fontSize: '12px', color: '#64748B' }}>
                <div>Start: {new Date(selectedAAR.startTime).toLocaleString()}</div>
                <div>End: {new Date(selectedAAR.endTime || selectedAAR.startTime).toLocaleString()}</div>
              </div>
            </div>

            {/* Recorded Decisions Timeline */}
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 'bold', color: 'var(--color-primary-navy)', marginBottom: '10px' }}>
                Submitted Command Decisions & Rationales ({selectedAAR.decisions?.length || 0})
              </h3>

              {!selectedAAR.decisions || selectedAAR.decisions.length === 0 ? (
                <div style={{ backgroundColor: '#F8FAFC', padding: '16px', fontSize: '13px', color: '#64748B' }}>
                  No decisions logged during this exercise session.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {selectedAAR.decisions.map((d, index) => (
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
                        <strong>Rationale:</strong> {d.rationale}
                      </div>

                      <div style={{ fontSize: '11px', color: '#64748B', marginTop: '8px', display: 'flex', gap: '16px' }}>
                        <span>Confidence: <strong>{d.confidence || 'Medium'}</strong></span>
                        <span>Timestamp: {new Date(d.timestamp).toLocaleTimeString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Instructor Notes Section (Qualitative Observations) */}
            <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #CBD5E1', padding: '18px', borderTop: '3px solid var(--color-terracotta)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 'bold', color: 'var(--color-primary-navy)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <MessageSquare size={16} style={{ color: 'var(--color-terracotta)' }} />
                  <span>Instructor Qualitative Observations & Notes</span>
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

              <p style={{ fontSize: '12px', color: '#64748B', marginBottom: '10px' }}>
                Instructors can record qualitative debrief notes regarding command clarity, verification discipline, and delay handling.
              </p>

              {userRole === 'instructor' ? (
                <textarea 
                  className="gov-form-input"
                  rows={3}
                  placeholder="Enter instructor observations for this exercise session..."
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
        ) : (
          <div style={{ backgroundColor: '#FFF', padding: '32px', textAlign: 'center', color: '#64748B', border: '1px solid #CBD5E1' }}>
            Select an AAR record from the list on the left to inspect timeline details.
          </div>
        )}
      </div>
    </div>
  );
};
