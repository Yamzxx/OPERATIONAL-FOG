import React from 'react';
import { 
  ArrowRight, 
  Users, 
  LogIn, 
  FileCheck, 
  BookOpen,
  Radio,
  CheckCircle
} from 'lucide-react';
import { ROLE_LABELS, normalizeRole } from '../../services/eventEngine';

export const OverviewDashboard = ({ 
  scenarios = [], 
  sessions = [], 
  currentUser,
  activeTrainingSession,
  onNavigate,
  onStartScenario,
  onOpenCreateScenario,
  onOpenCreateMultiplayer,
  onOpenJoinSession
}) => {
  const userRole = normalizeRole(currentUser?.role || 'team_leader');
  const roleLabel = ROLE_LABELS[userRole] || 'Team Leader';

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* ACTIVE EXERCISE BANNER (if running) */}
      {activeTrainingSession && (
        <div 
          style={{
            backgroundColor: '#EFF6FF',
            border: '1px solid #BFDBFE',
            borderLeft: '4px solid #2563EB',
            borderRadius: '4px',
            padding: '14px 20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#2563EB', animation: 'pulse 1.5s infinite' }} />
            <div>
              <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#1D4ED8', textTransform: 'uppercase' }}>
                Exercise In Progress
              </div>
              <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#1E3A8A' }}>
                {activeTrainingSession.name || 'Live Training Exercise'}
              </div>
            </div>
          </div>

          <button
            onClick={() => onNavigate('training-room')}
            style={{
              backgroundColor: '#2563EB',
              color: '#FFFFFF',
              border: 'none',
              padding: '8px 16px',
              fontSize: '13px',
              fontWeight: 'bold',
              borderRadius: '4px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span>Resume Exercise</span>
            <ArrowRight size={15} />
          </button>
        </div>
      )}

      {/* WELCOME HEADER */}
      <div 
        style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: '6px',
          padding: '24px 28px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <span style={{ fontSize: '12px', background: '#F1F5F9', color: '#334155', padding: '3px 8px', fontWeight: 'bold', borderRadius: '4px' }}>
              Role: <strong>{roleLabel}</strong>
            </span>
            <span style={{ fontSize: '12px', color: '#64748B' }}>
              ID: {currentUser?.serviceId || 'Trainee-01'}
            </span>
          </div>
          <h1 style={{ fontSize: '22px', fontWeight: 'bold', color: 'var(--color-primary-navy)', margin: '4px 0 6px' }}>
            Operational Fog — Training Simulator
          </h1>
          <p style={{ fontSize: '14px', color: '#475569', maxWidth: '640px', margin: 0, lineHeight: '1.5' }}>
            Practice command decisions when radio reports are <strong>delayed</strong>, <strong>missing</strong>, <strong>incomplete</strong>, or <strong>conflicting</strong> — the conditions that define real operational stress.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '12px', background: '#DCFCE7', color: '#15803D', padding: '6px 12px', fontWeight: 'bold', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#16A34A' }} />
            Simulator Ready
          </span>
        </div>
      </div>

      {/* QUICK ACTIONS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
        
        {/* Card 1: Multiplayer Room */}
        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '6px', padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <Users size={18} style={{ color: '#2563EB' }} />
              <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--color-primary-navy)', margin: 0 }}>
                Multiplayer Team Room
              </h3>
            </div>
            <p style={{ fontSize: '13px', color: '#64748B', lineHeight: '1.5', margin: '0 0 16px' }}>
              Run a live exercise with multiple participants across separate browser tabs. Each person takes a different role — Team Leader, Land, Air, or Cyber/EW.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={onOpenCreateMultiplayer}
              style={{
                flex: 1,
                backgroundColor: 'var(--color-primary-navy)',
                color: '#FFF',
                border: 'none',
                padding: '10px 14px',
                fontSize: '13px',
                fontWeight: 'bold',
                borderRadius: '4px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              <Users size={14} />
              <span>Host Room</span>
            </button>

            <button
              onClick={onOpenJoinSession}
              style={{
                flex: 1,
                backgroundColor: '#FFFFFF',
                color: 'var(--color-primary-navy)',
                border: '1px solid #CBD5E1',
                padding: '10px 14px',
                fontSize: '13px',
                fontWeight: 'bold',
                borderRadius: '4px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              <LogIn size={14} />
              <span>Join with Code</span>
            </button>
          </div>
        </div>

        {/* Card 2: Scenario Library */}
        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '6px', padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <BookOpen size={18} style={{ color: '#D97706' }} />
              <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--color-primary-navy)', margin: 0 }}>
                Scenario Library
              </h3>
            </div>
            <p style={{ fontSize: '13px', color: '#64748B', lineHeight: '1.5', margin: '0 0 16px' }}>
              Choose a pre-built tactical scenario or create your own with custom delay curves and friction parameters.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => onNavigate('scenarios')}
              style={{
                flex: 1,
                backgroundColor: '#FFFFFF',
                color: 'var(--color-primary-navy)',
                border: '1px solid #CBD5E1',
                padding: '10px 14px',
                fontSize: '13px',
                fontWeight: 'bold',
                borderRadius: '4px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              <BookOpen size={14} />
              <span>Browse All ({scenarios.length})</span>
            </button>

            <button
              onClick={onOpenCreateScenario}
              style={{
                flex: 1,
                backgroundColor: '#FFFFFF',
                color: '#2563EB',
                border: '1px solid #BFDBFE',
                padding: '10px 14px',
                fontSize: '13px',
                fontWeight: 'bold',
                borderRadius: '4px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              <span>+ Create Scenario</span>
            </button>
          </div>
        </div>

        {/* Card 3: After-Action Reports */}
        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '6px', padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <FileCheck size={18} style={{ color: '#16A34A' }} />
              <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--color-primary-navy)', margin: 0 }}>
                After-Action Debrief (AAR)
              </h3>
            </div>
            <p style={{ fontSize: '13px', color: '#64748B', lineHeight: '1.5', margin: '0 0 16px' }}>
              Review completed exercises. Compare trainee decisions against what was actually true, and export PDF reports.
            </p>
          </div>

          <button
            onClick={() => onNavigate('aar')}
            style={{
              width: '100%',
              backgroundColor: '#FFFFFF',
              color: 'var(--color-primary-navy)',
              border: '1px solid #CBD5E1',
              padding: '10px 14px',
              fontSize: '13px',
              fontWeight: 'bold',
              borderRadius: '4px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            <FileCheck size={14} />
            <span>Open Debriefs</span>
          </button>
        </div>

      </div>

      {/* HOW EXERCISES WORK — compact reference panel */}
      <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '6px', padding: '16px 24px' }}>
        <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>
          What trainees experience during an exercise
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
          {[
            { label: '⏳ Delayed', desc: 'Reports arrive 20–180 s late', color: '#92400E', bg: '#FEF3C7' },
            { label: '❌ Dropped', desc: 'Message lost to interference', color: '#991B1B', bg: '#FEE2E2' },
            { label: '✂️ Incomplete', desc: 'Report cut off mid-transmission', color: '#6B21A8', bg: '#F3E8FF' },
            { label: '⚠️ Conflicting', desc: 'Two nodes report opposite facts', color: '#9A3412', bg: '#FFEDD5' },
          ].map(({ label, desc, color, bg }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: bg, border: `1px solid ${bg}`, borderRadius: '4px', padding: '8px 12px', flex: '1 0 200px' }}>
              <span style={{ fontWeight: 'bold', fontSize: '13px', color, whiteSpace: 'nowrap' }}>{label}</span>
              <span style={{ fontSize: '12px', color }}>{desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* RECENT EXERCISE ACTIVITY TABLE */}
      <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '6px', padding: '20px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid #E2E8F0', paddingBottom: '10px' }}>
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: 'bold', color: 'var(--color-primary-navy)', margin: 0 }}>
              Recent Exercises
            </h3>
            <span style={{ fontSize: '12px', color: '#64748B' }}>
              Past sessions and generated records
            </span>
          </div>
          
          <button 
            onClick={() => onNavigate('sessions')}
            style={{ background: 'none', border: 'none', color: '#2563EB', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            <span>View All ({sessions.length})</span>
            <ArrowRight size={14} />
          </button>
        </div>

        {sessions.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center', color: '#64748B', fontSize: '13px' }}>
            No exercises recorded yet. Launch an exercise from the Scenario Library or host a Multiplayer room to begin.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '2px solid #E2E8F0', textAlign: 'left' }}>
                  <th style={{ padding: '10px 12px', fontWeight: 'bold', color: 'var(--color-primary-navy)' }}>Exercise Name</th>
                  <th style={{ padding: '10px 12px', fontWeight: 'bold', color: 'var(--color-primary-navy)' }}>Room Code</th>
                  <th style={{ padding: '10px 12px', fontWeight: 'bold', color: 'var(--color-primary-navy)' }}>Status</th>
                  <th style={{ padding: '10px 12px', fontWeight: 'bold', color: 'var(--color-primary-navy)' }}>Date</th>
                  <th style={{ padding: '10px 12px', fontWeight: 'bold', color: 'var(--color-primary-navy)', textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {sessions.slice(0, 4).map((sess) => (
                  <tr key={sess.id} style={{ borderBottom: '1px solid #E2E8F0' }}>
                    <td style={{ padding: '12px', fontWeight: 'bold', color: 'var(--color-primary-navy)' }}>
                      {sess.name}
                    </td>
                    <td style={{ padding: '12px', fontFamily: 'monospace', fontWeight: 'bold', color: '#2563EB' }}>
                      {sess.sessionCode || 'SOLO'}
                    </td>
                    <td style={{ padding: '12px' }}>
                      <span 
                        style={{
                          fontSize: '11px',
                          fontWeight: 'bold',
                          padding: '3px 8px',
                          borderRadius: '12px',
                          backgroundColor: sess.status === 'Completed' ? '#DCFCE7' : '#FEF3C7',
                          color: sess.status === 'Completed' ? '#15803D' : '#B45309'
                        }}
                      >
                        {sess.status === 'Completed' ? 'Finished' : sess.status}
                      </span>
                    </td>
                    <td style={{ padding: '12px', color: '#64748B' }}>
                      {new Date(sess.createdAt).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right' }}>
                      <button 
                        onClick={() => onNavigate(sess.status === 'Completed' ? 'aar' : 'sessions')}
                        style={{
                          background: 'none',
                          border: '1px solid #CBD5E1',
                          borderRadius: '4px',
                          padding: '5px 12px',
                          fontSize: '12px',
                          fontWeight: 'bold',
                          color: 'var(--color-primary-navy)',
                          cursor: 'pointer'
                        }}
                      >
                        {sess.status === 'Completed' ? 'View Debrief' : 'Open Session'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
};
