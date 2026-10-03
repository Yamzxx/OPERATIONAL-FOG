import React from 'react';
import { 
  BookOpen, 
  PlusCircle, 
  PlayCircle, 
  FileCheck, 
  Users, 
  LogIn, 
  ArrowRight,
  ShieldCheck
} from 'lucide-react';

export const OverviewDashboard = ({ 
  scenarios, 
  sessions, 
  aars, 
  onNavigate,
  onOpenCreateScenario,
  onOpenCreateMultiplayer,
  onOpenJoinSession
}) => {
  const activeSessions = sessions.filter(s => s.status === 'In Progress' || s.status === 'Waiting');
  const completedSessions = sessions.filter(s => s.status === 'Completed');

  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* Header Banner */}
      <div 
        style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #CBD5E1',
          borderLeft: '4px solid var(--color-primary-navy)',
          padding: '24px',
          boxShadow: 'var(--shadow-sm)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <span style={{ fontSize: '11px', color: 'var(--color-terracotta)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
              AUTHENTICATED WORKSPACE CONSOLE
            </span>
            <h1 style={{ fontFamily: 'var(--font-family-serif)', fontSize: '26px', fontWeight: '800', color: 'var(--color-primary-navy)', margin: '4px 0 6px' }}>
              Training Overview & Multiplayer Hub
            </h1>
            <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', maxWidth: '780px' }}>
              Manage multi-participant exercises, coordinate team dispatches, and review decisions under communication uncertainty.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <span style={{ fontSize: '11px', background: '#FEF3C7', color: '#92400E', padding: '4px 10px', border: '1px solid #FCD34D', fontWeight: '700' }}>
              PROTOTYPE DEMO MODE
            </span>
          </div>
        </div>
      </div>

      {/* Quick Actions Bar */}
      <div>
        <h3 style={{ fontSize: '15px', fontWeight: 'bold', color: 'var(--color-primary-navy)', marginBottom: '12px' }}>
          Quick Actions & Multiplayer Controls
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
          <button 
            onClick={onOpenCreateMultiplayer}
            className="gov-btn"
            style={{ backgroundColor: 'var(--color-primary-navy)', color: '#FFFFFF', justifyContent: 'flex-start', padding: '14px 18px' }}
          >
            <Users size={18} style={{ color: 'var(--color-gold-accent)' }} />
            <span>Create Multiplayer Session</span>
          </button>

          <button 
            onClick={onOpenJoinSession}
            className="gov-btn"
            style={{ backgroundColor: '#FFFFFF', color: 'var(--color-primary-navy)', border: '1px solid #CBD5E1', justifyContent: 'flex-start', padding: '14px 18px' }}
          >
            <LogIn size={18} style={{ color: 'var(--color-terracotta)' }} />
            <span>Join Session via Code</span>
          </button>

          <button 
            onClick={onOpenCreateScenario}
            className="gov-btn"
            style={{ backgroundColor: '#FFFFFF', color: 'var(--color-primary-navy)', border: '1px solid #CBD5E1', justifyContent: 'flex-start', padding: '14px 18px' }}
          >
            <PlusCircle size={18} style={{ color: '#0284C7' }} />
            <span>Create Scenario Draft</span>
          </button>

          <button 
            onClick={() => onNavigate('aar')}
            className="gov-btn"
            style={{ backgroundColor: '#FFFFFF', color: 'var(--color-primary-navy)', border: '1px solid #CBD5E1', justifyContent: 'flex-start', padding: '14px 18px' }}
          >
            <FileCheck size={18} style={{ color: '#16A34A' }} />
            <span>Review Completed AARs</span>
          </button>
        </div>
      </div>

      {/* Training Summary Cards */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 'bold', color: 'var(--color-primary-navy)' }}>
            Training Metrics & Summary
          </h3>
          <span style={{ fontSize: '11px', color: '#64748B' }}>
            Real-Time Synchronization Layer Active
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
          {/* Card 1: Available Scenarios */}
          <div style={{ backgroundColor: '#FFF', border: '1px solid #CBD5E1', borderTop: '3px solid var(--color-primary-navy)', padding: '18px' }}>
            <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#64748B' }}>AVAILABLE SCENARIOS</div>
            <div style={{ fontSize: '28px', fontWeight: '800', color: 'var(--color-primary-navy)', margin: '4px 0' }}>
              {scenarios.length}
            </div>
            <div style={{ fontSize: '11px', color: '#0369A1', fontWeight: '600' }}>Fictional Standard Templates</div>
          </div>

          {/* Card 2: Active Sessions */}
          <div style={{ backgroundColor: '#FFF', border: '1px solid #CBD5E1', borderTop: '3px solid #F59E0B', padding: '18px' }}>
            <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#64748B' }}>ACTIVE MULTIPLAYER SESSIONS</div>
            <div style={{ fontSize: '28px', fontWeight: '800', color: '#B45309', margin: '4px 0' }}>
              {activeSessions.length}
            </div>
            <div style={{ fontSize: '11px', color: '#B45309', fontWeight: '600' }}>Multi-Participant Workspaces</div>
          </div>

          {/* Card 3: Completed Exercises */}
          <div style={{ backgroundColor: '#FFF', border: '1px solid #CBD5E1', borderTop: '3px solid #16A34A', padding: '18px' }}>
            <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#64748B' }}>COMPLETED EXERCISES</div>
            <div style={{ fontSize: '28px', fontWeight: '800', color: '#15803D', margin: '4px 0' }}>
              {completedSessions.length}
            </div>
            <div style={{ fontSize: '11px', color: '#15803D', fontWeight: '600' }}>Recorded Audit Logs</div>
          </div>

          {/* Card 4: Pending Reviews */}
          <div style={{ backgroundColor: '#FFF', border: '1px solid #CBD5E1', borderTop: '3px solid var(--color-terracotta)', padding: '18px' }}>
            <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#64748B' }}>PENDING REVIEWS (AAR)</div>
            <div style={{ fontSize: '28px', fontWeight: '800', color: 'var(--color-terracotta)', margin: '4px 0' }}>
              {aars.length}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--color-terracotta)', fontWeight: '600' }}>Ready for Debrief</div>
          </div>
        </div>
      </div>

      {/* Recent Activity Table */}
      <div style={{ backgroundColor: '#FFF', border: '1px solid #CBD5E1', padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #E2E8F0', paddingBottom: '10px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--color-primary-navy)' }}>
            Recent Exercise Activity
          </h3>
          <button 
            onClick={() => onNavigate('sessions')}
            style={{ background: 'none', border: 'none', color: 'var(--color-terracotta)', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            <span>View All Sessions</span>
            <ArrowRight size={14} />
          </button>
        </div>

        {sessions.length === 0 ? (
          <div style={{ padding: '32px', textAlign: 'center', color: '#64748B', fontSize: '13px' }}>
            No exercise activity records found. Create or join a multiplayer session to start.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '2px solid #CBD5E1', textAlign: 'left' }}>
                <th style={{ padding: '10px 12px', fontWeight: 'bold', color: 'var(--color-primary-navy)' }}>Exercise Name</th>
                <th style={{ padding: '10px 12px', fontWeight: 'bold', color: 'var(--color-primary-navy)' }}>Join Code</th>
                <th style={{ padding: '10px 12px', fontWeight: 'bold', color: 'var(--color-primary-navy)' }}>Status</th>
                <th style={{ padding: '10px 12px', fontWeight: 'bold', color: 'var(--color-primary-navy)' }}>Date</th>
                <th style={{ padding: '10px 12px', fontWeight: 'bold', color: 'var(--color-primary-navy)', textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {sessions.slice(0, 5).map((sess) => (
                <tr key={sess.id} style={{ borderBottom: '1px solid #E2E8F0' }}>
                  <td style={{ padding: '12px', fontWeight: 'bold', color: 'var(--color-primary-navy)' }}>
                    {sess.name}
                    {sess.isSample && <span style={{ marginLeft: '6px', fontSize: '10px', background: '#E2E8F0', color: '#475569', padding: '1px 4px' }}>SAMPLE</span>}
                  </td>
                  <td style={{ padding: '12px', fontFamily: 'monospace', fontWeight: 'bold', color: 'var(--color-primary-navy)' }}>
                    {sess.sessionCode || 'SINGLE-NODE'}
                  </td>
                  <td style={{ padding: '12px' }}>
                    <span 
                      style={{
                        fontSize: '11px',
                        fontWeight: '700',
                        padding: '2px 8px',
                        borderRadius: '2px',
                        backgroundColor: sess.status === 'Completed' ? '#DCFCE7' : sess.status === 'In Progress' ? '#FEF3C7' : '#E0F2FE',
                        color: sess.status === 'Completed' ? '#15803D' : sess.status === 'In Progress' ? '#B45309' : '#0369A1'
                      }}
                    >
                      {sess.status}
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
                        padding: '4px 10px',
                        fontSize: '11px',
                        fontWeight: 'bold',
                        color: 'var(--color-primary-navy)',
                        cursor: 'pointer'
                      }}
                    >
                      {sess.status === 'Completed' ? 'View AAR' : 'Open Workspace'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
