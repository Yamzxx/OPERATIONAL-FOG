import React, { useState } from 'react';
import { 
  PlayCircle, 
  PlusCircle, 
  CheckCircle, 
  Clock, 
  FileCheck, 
  UserCheck, 
  ArrowRight,
  Filter
} from 'lucide-react';

export const TrainingSessions = ({ 
  sessions, 
  scenarios, 
  onStartNewSession, 
  onOpenTrainingRoom, 
  onViewAAR 
}) => {
  const [statusFilter, setStatusFilter] = useState('ALL');

  const filteredSessions = sessions.filter(s => {
    if (statusFilter === 'ALL') return true;
    return s.status.toUpperCase() === statusFilter;
  });

  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-family-serif)', fontSize: '24px', fontWeight: '800', color: 'var(--color-primary-navy)' }}>
            Training Sessions
          </h1>
          <p style={{ fontSize: '13px', color: '#64748B', marginTop: '4px' }}>
            Single-participant training workspaces and active simulation exercise sessions.
          </p>
        </div>

        <button 
          className="gov-btn gov-btn-primary"
          onClick={() => {
            if (scenarios.length > 0) {
              onStartNewSession(scenarios[0]);
            }
          }}
        >
          <PlusCircle size={16} />
          <span>Launch New Exercise Session</span>
        </button>
      </div>

      {/* Filter Strip */}
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', backgroundColor: '#FFF', padding: '12px 16px', border: '1px solid #CBD5E1' }}>
        <Filter size={16} style={{ color: '#64748B' }} />
        <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--color-primary-navy)' }}>Status Filter:</span>

        {['ALL', 'IN PROGRESS', 'COMPLETED', 'DRAFT'].map(status => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            style={{
              background: statusFilter === status ? 'var(--color-primary-navy)' : '#F1F5F9',
              color: statusFilter === status ? '#FFF' : '#334155',
              border: '1px solid #CBD5E1',
              padding: '4px 10px',
              fontSize: '11px',
              fontWeight: '700',
              borderRadius: '2px',
              cursor: 'pointer'
            }}
          >
            {status}
          </button>
        ))}
      </div>

      {/* Session Table / List */}
      <div style={{ backgroundColor: '#FFF', border: '1px solid #CBD5E1', padding: '20px' }}>
        {filteredSessions.length === 0 ? (
          <div style={{ padding: '32px', textAlign: 'center', color: '#64748B', fontSize: '13px' }}>
            No sessions match the selected filter.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '2px solid #CBD5E1', textAlign: 'left' }}>
                <th style={{ padding: '10px 12px', fontWeight: 'bold', color: 'var(--color-primary-navy)' }}>Session Name</th>
                <th style={{ padding: '10px 12px', fontWeight: 'bold', color: 'var(--color-primary-navy)' }}>Scenario</th>
                <th style={{ padding: '10px 12px', fontWeight: 'bold', color: 'var(--color-primary-navy)' }}>Status</th>
                <th style={{ padding: '10px 12px', fontWeight: 'bold', color: 'var(--color-primary-navy)' }}>Participants</th>
                <th style={{ padding: '10px 12px', fontWeight: 'bold', color: 'var(--color-primary-navy)' }}>Created Date</th>
                <th style={{ padding: '10px 12px', fontWeight: 'bold', color: 'var(--color-primary-navy)', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredSessions.map((sess) => (
                <tr key={sess.id} style={{ borderBottom: '1px solid #E2E8F0' }}>
                  <td style={{ padding: '12px', fontWeight: 'bold', color: 'var(--color-primary-navy)' }}>
                    {sess.name}
                    {sess.isSample && <span style={{ marginLeft: '8px', fontSize: '10px', background: '#E2E8F0', color: '#475569', padding: '1px 5px', borderRadius: '2px' }}>SAMPLE</span>}
                  </td>
                  <td style={{ padding: '12px', color: '#475569' }}>{sess.scenarioTitle}</td>
                  <td style={{ padding: '12px' }}>
                    <span 
                      style={{
                        fontSize: '11px',
                        fontWeight: '700',
                        padding: '2px 8px',
                        borderRadius: '2px',
                        backgroundColor: sess.status === 'Completed' ? '#DCFCE7' : sess.status === 'In Progress' ? '#FEF3C7' : '#E2E8F0',
                        color: sess.status === 'Completed' ? '#15803D' : sess.status === 'In Progress' ? '#B45309' : '#475569'
                      }}
                    >
                      {sess.status}
                    </span>
                  </td>
                  <td style={{ padding: '12px', color: '#64748B' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <UserCheck size={14} />
                      <span>{sess.participantCount || 1} Node</span>
                    </div>
                  </td>
                  <td style={{ padding: '12px', color: '#64748B' }}>
                    {new Date(sess.createdAt).toLocaleDateString()}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'right' }}>
                    {sess.status === 'Completed' ? (
                      <button 
                        onClick={() => onViewAAR(sess.id)}
                        className="gov-btn gov-btn-secondary"
                        style={{ fontSize: '11px', padding: '4px 10px' }}
                      >
                        <FileCheck size={13} />
                        <span>View Results (AAR)</span>
                      </button>
                    ) : (
                      <button 
                        onClick={() => onOpenTrainingRoom(sess)}
                        className="gov-btn gov-btn-primary"
                        style={{ fontSize: '11px', padding: '4px 10px' }}
                      >
                        <PlayCircle size={13} />
                        <span>{sess.status === 'In Progress' ? 'Continue Exercise' : 'Start Session'}</span>
                      </button>
                    )}
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
