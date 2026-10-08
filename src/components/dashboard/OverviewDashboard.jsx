import React from 'react';
import { 
  ArrowRight, 
  Users, 
  LogIn, 
  FileCheck, 
  HelpCircle, 
  BookOpen,
  Radio,
  CheckCircle,
  AlertCircle
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
      
      {/* 1. ACTIVE EXERCISE BANNER (if running) */}
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

      {/* 2. WELCOME HEADER (CALM & INFORMATIVE) */}
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
              Your Role: <strong>{roleLabel}</strong>
            </span>
            <span style={{ fontSize: '12px', color: '#64748B' }}>
              User ID: {currentUser?.serviceId || 'Trainee-01'}
            </span>
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--color-primary-navy)', margin: '4px 0 6px' }}>
            Operational Fog Simulator
          </h1>
          <p style={{ fontSize: '14px', color: '#475569', maxWidth: '680px', margin: 0, lineHeight: '1.5' }}>
            In high-stress operations, communication lines fail. Practice making team decisions when radio reports are <strong>delayed</strong>, <strong>missing</strong>, <strong>incomplete</strong>, or <strong>conflicting</strong>.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '12px', background: '#DCFCE7', color: '#15803D', padding: '6px 12px', fontWeight: 'bold', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#16A34A' }} />
            Simulator Ready
          </span>
        </div>
      </div>



      {/* 4. EXPLANATION: THE 4 TYPES OF COMMUNICATION BREAKDOWNS (CLEAR & SIMPLE) */}
      <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '6px', padding: '20px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
          <HelpCircle size={18} style={{ color: '#2563EB' }} />
          <h3 style={{ fontSize: '15px', fontWeight: 'bold', color: 'var(--color-primary-navy)', margin: 0 }}>
            What Happens During an Exercise? (The 4 Message Problems)
          </h3>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
          {/* Delayed */}
          <div style={{ backgroundColor: '#FEF3C7', border: '1px solid #FCD34D', borderRadius: '4px', padding: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#92400E', fontWeight: 'bold', fontSize: '13px', marginBottom: '4px' }}>
              <span>⏳</span>
              <span>1. Delayed Message</span>
            </div>
            <p style={{ fontSize: '12px', color: '#78350F', lineHeight: '1.4', margin: 0 }}>
              The report arrives 20 to 30 seconds late. Trainees have to decide whether to wait or act on old information.
            </p>
          </div>

          {/* Dropped / Lost */}
          <div style={{ backgroundColor: '#FEE2E2', border: '1px solid #FCA5A5', borderRadius: '4px', padding: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#991B1B', fontWeight: 'bold', fontSize: '13px', marginBottom: '4px' }}>
              <span>❌</span>
              <span>2. Dropped (Lost)</span>
            </div>
            <p style={{ fontSize: '12px', color: '#7F1D1D', lineHeight: '1.4', margin: 0 }}>
              The message is blocked by signal interference. The trainee never sees it and does not know it was sent.
            </p>
          </div>

          {/* Incomplete */}
          <div style={{ backgroundColor: '#F3E8FF', border: '1px solid #D8B4FE', borderRadius: '4px', padding: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#6B21A8', fontWeight: 'bold', fontSize: '13px', marginBottom: '4px' }}>
              <span>✂️</span>
              <span>3. Incomplete Report</span>
            </div>
            <p style={{ fontSize: '12px', color: '#581C87', lineHeight: '1.4', margin: 0 }}>
              Part of the report is cut off (like grid coordinates or enemy strength), requiring squad cross-checks.
            </p>
          </div>

          {/* Conflicting */}
          <div style={{ backgroundColor: '#FFEDD5', border: '1px solid #FDBA74', borderRadius: '4px', padding: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#9A3412', fontWeight: 'bold', fontSize: '13px', marginBottom: '4px' }}>
              <span>⚠️</span>
              <span>4. Conflicting Intel</span>
            </div>
            <p style={{ fontSize: '12px', color: '#7C2D12', lineHeight: '1.4', margin: 0 }}>
              Two team members receive opposite facts (e.g. "path is clear" vs "patrol halted"). They must verify before moving.
            </p>
          </div>
        </div>
      </div>

      {/* 5. QUICK ACTIONS: TEAM ROOMS & SCENARIOS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
        
        {/* Card 1: Multiplayer Room */}
        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '6px', padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <Users size={18} style={{ color: '#2563EB' }} />
              <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--color-primary-navy)', margin: 0 }}>
                Multiplayer Team Mode
              </h3>
            </div>
            <p style={{ fontSize: '13px', color: '#64748B', lineHeight: '1.5', margin: '0 0 16px' }}>
              Open separate browser tabs or invite teammates to join the same exercise as Team Leader, Land, Air, or Cyber/EW.
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
              Choose from pre-built tactical scenarios or create your own custom exercise with custom delay curves.
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
              Review past training exercises. Compare what decisions trainees made against what was actually true, and export PDF reports.
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

      {/* 6. RECENT EXERCISE ACTIVITY TABLE */}
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
            No exercises recorded yet. Launch an exercise from the Scenario Library or host a Multiplayer room to begin!
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
