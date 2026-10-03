import React from 'react';
import { 
  BookOpen, 
  PlusCircle, 
  PlayCircle, 
  FileCheck, 
  Layers, 
  CheckCircle, 
  Clock, 
  AlertTriangle,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';

export const OverviewDashboard = ({ 
  scenarios, 
  sessions, 
  aars, 
  onNavigate,
  onOpenCreateScenario
}) => {
  const activeSessions = sessions.filter(s => s.status === 'In Progress');
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
              Training Overview
            </h1>
            <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', maxWidth: '780px' }}>
              Manage exercises, practise coordination, and review decisions under communication uncertainty.
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
          Quick Actions
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
          <button 
            onClick={() => onNavigate('scenarios')}
            className="gov-btn"
            style={{ backgroundColor: '#FFFFFF', color: 'var(--color-primary-navy)', border: '1px solid #CBD5E1', justifyContent: 'flex-start', padding: '14px 18px' }}
          >
            <BookOpen size={18} style={{ color: 'var(--color-terracotta)' }} />
            <span>Browse Scenarios</span>
          </button>

          <button 
            onClick={onOpenCreateScenario}
            className="gov-btn"
            style={{ backgroundColor: 'var(--color-primary-navy)', color: '#FFFFFF', justifyContent: 'flex-start', padding: '14px 18px' }}
          >
            <PlusCircle size={18} style={{ color: 'var(--color-gold-accent)' }} />
            <span>Create Scenario Draft</span>
          </button>

          <button 
            onClick={() => onNavigate('sessions')}
            className="gov-btn"
            style={{ backgroundColor: '#FFFFFF', color: 'var(--color-primary-navy)', border: '1px solid #CBD5E1', justifyContent: 'flex-start', padding: '14px 18px' }}
          >
            <PlayCircle size={18} style={{ color: '#0284C7' }} />
            <span>View Training Sessions</span>
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
            Local Storage Records & Demo Data
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
          {/* Card 1: Available Scenarios */}
          <div style={{ backgroundColor: '#FFF', border: '1px solid #CBD5E1', borderTop: '3px solid var(--color-primary-navy)', padding: '18px' }}>
            <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#64748B' }}>AVAILABLE SCENARIOS</div>
            <div style={{ fontSize: '28px', fontWeight: '800', color: 'var(--color-primary-navy)', margin: '4px 0' }}>
              {scenarios.length}
            </div>
            <div style={{ fontSize: '11px', color: '#0369A1', fontWeight: '600' }}>3 Fictional Standard Templates</div>
          </div>

          {/* Card 2: Active Sessions */}
          <div style={{ backgroundColor: '#FFF', border: '1px solid #CBD5E1', borderTop: '3px solid #F59E0B', padding: '18px' }}>
            <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#64748B' }}>ACTIVE SESSIONS</div>
            <div style={{ fontSize: '28px', fontWeight: '800', color: '#B45309', margin: '4px 0' }}>
              {activeSessions.length}
            </div>
            <div style={{ fontSize: '11px', color: '#B45309', fontWeight: '600' }}>Single-Participant Workspaces</div>
          </div>

          {/* Card 3: Completed Exercises */}
          <div style={{ backgroundColor: '#FFF', border: '1px solid #CBD5E1', borderTop: '3px solid #16A34A', padding: '18px' }}>
            <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#64748B' }}>COMPLETED EXERCISES</div>
            <div style={{ fontSize: '28px', fontWeight: '800', color: '#15803D', margin: '4px 0' }}>
              {completedSessions.length}
            </div>
            <div style={{ fontSize: '11px', color: '#15803D', fontWeight: '600' }}>Recorded Local Log Entries</div>
          </div>

          {/* Card 4: Pending Reviews */}
          <div style={{ backgroundColor: '#FFF', border: '1px solid #CBD5E1', borderTop: '3px solid var(--color-terracotta)', padding: '18px' }}>
            <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#64748B' }}>PENDING REVIEWS (AAR)</div>
            <div style={{ fontSize: '28px', fontWeight: '800', color: 'var(--color-terracotta)', margin: '4px 0' }}>
              {aars.length}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--color-terracotta)', fontWeight: '600' }}>Ready for Instructor Observations</div>
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
            No exercise activity records found. Select a scenario from the library to launch a training session.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '2px solid #CBD5E1', textAlign: 'left' }}>
                <th style={{ padding: '10px 12px', fontWeight: 'bold', color: 'var(--color-primary-navy)' }}>Exercise Name</th>
                <th style={{ padding: '10px 12px', fontWeight: 'bold', color: 'var(--color-primary-navy)' }}>Scenario</th>
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
                  <td style={{ padding: '12px', color: '#475569' }}>{sess.scenarioTitle}</td>
                  <td style={{ padding: '12px' }}>
                    <span 
                      style={{
                        fontSize: '11px',
                        fontWeight: '700',
                        padding: '2px 8px',
                        borderRadius: '2px',
                        backgroundColor: sess.status === 'Completed' ? '#DCFCE7' : '#FEF3C7',
                        color: sess.status === 'Completed' ? '#15803D' : '#B45309'
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

      {/* Getting Started Step Workflow */}
      <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #CBD5E1', borderTop: '3px solid var(--color-terracotta)', padding: '20px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--color-primary-navy)', marginBottom: '14px' }}>
          Getting Started — Exercise Workflow
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          <div style={{ background: '#FFF', padding: '14px', border: '1px solid #E2E8F0' }}>
            <div style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--color-terracotta)' }}>STEP 1</div>
            <div style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--color-primary-navy)', margin: '4px 0' }}>Select a Scenario</div>
            <div style={{ fontSize: '12px', color: '#64748B' }}>Choose from fictional templates or create a draft.</div>
          </div>

          <div style={{ background: '#FFF', padding: '14px', border: '1px solid #E2E8F0' }}>
            <div style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--color-terracotta)' }}>STEP 2</div>
            <div style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--color-primary-navy)', margin: '4px 0' }}>Configure Events</div>
            <div style={{ fontSize: '12px', color: '#64748B' }}>Review RF latency curves and delay vectors.</div>
          </div>

          <div style={{ background: '#FFF', padding: '14px', border: '1px solid #E2E8F0' }}>
            <div style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--color-terracotta)' }}>STEP 3</div>
            <div style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--color-primary-navy)', margin: '4px 0' }}>Run Training Exercise</div>
            <div style={{ fontSize: '12px', color: '#64748B' }}>Enter the Training Room & record command rationale.</div>
          </div>

          <div style={{ background: '#FFF', padding: '14px', border: '1px solid #E2E8F0' }}>
            <div style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--color-terracotta)' }}>STEP 4</div>
            <div style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--color-primary-navy)', margin: '4px 0' }}>Review Results</div>
            <div style={{ fontSize: '12px', color: '#64748B' }}>Inspect timelines & instructor notes in AAR.</div>
          </div>
        </div>
      </div>
    </div>
  );
};
