import React, { useState, useEffect } from 'react';
import { 
  Play, 
  Pause, 
  ChevronLeft, 
  ChevronRight, 
  RotateCcw, 
  Clock, 
  Filter, 
  ShieldAlert,
  UserCheck,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import { formatSecondsToMMSS } from '../../services/eventEngine';

export const TimelineReplay = ({ aar }) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [roleFilter, setRoleFilter] = useState('ALL');

  const decisions = aar?.decisions || [];
  const events = aar?.events || [];

  // Build combined timeline items sorted by elapsed seconds
  const timelineItems = [
    ...events.map(ev => ({
      id: ev.id,
      kind: 'event',
      title: ev.title,
      content: ev.content,
      type: ev.type,
      deliveryBehavior: ev.deliveryBehavior,
      recipientRole: ev.recipientRole || 'all',
      timeSec: ev.actualDeliveryTimeSec || ev.scheduledTimeSec || 0,
      status: ev.status
    })),
    ...decisions.map(d => ({
      id: d.id,
      kind: 'decision',
      title: d.title,
      content: d.rationale,
      type: 'decision',
      recipientRole: d.submittedRole || 'all',
      submittedBy: d.submittedBy || 'Operator',
      timeSec: (d.elapsedMinutes || 0) * 60,
      confidence: d.confidence
    }))
  ].sort((a, b) => a.timeSec - b.timeSec);

  // Playback timer interval
  useEffect(() => {
    let timer = null;
    if (isPlaying) {
      timer = setInterval(() => {
        setCurrentStepIndex(prev => {
          if (prev >= timelineItems.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 2000 / playbackSpeed);
    }
    return () => clearInterval(timer);
  }, [isPlaying, playbackSpeed, timelineItems.length]);

  if (timelineItems.length === 0) {
    return (
      <div style={{ backgroundColor: '#FFF', border: '1px solid #CBD5E1', padding: '24px', textAlign: 'center', color: '#64748B', fontSize: '13px' }}>
        No timeline replay records available for this exercise.
      </div>
    );
  }

  const currentItem = timelineItems[currentStepIndex] || timelineItems[0];
  const itemsUpToCurrent = timelineItems.slice(0, currentStepIndex + 1);

  // Filter items based on selected participant role
  const filteredDeliveredMessages = itemsUpToCurrent.filter(item => {
    if (item.kind !== 'event') return false;
    if (item.deliveryBehavior === 'dropped') return false;
    if (roleFilter === 'ALL') return true;
    return item.recipientRole === 'all' || item.recipientRole === roleFilter.toLowerCase();
  });

  const filteredDecisions = itemsUpToCurrent.filter(item => {
    if (item.kind !== 'decision') return false;
    if (roleFilter === 'ALL') return true;
    return item.recipientRole === roleFilter.toLowerCase();
  });

  return (
    <div style={{ backgroundColor: '#FFF', border: '1px solid #CBD5E1', borderTop: '3px solid var(--color-primary-navy)', padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Replay Header & Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', borderBottom: '1px solid #E2E8F0', paddingBottom: '12px' }}>
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--color-primary-navy)' }}>
            Chronological Timeline Replay Player
          </h3>
          <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
            Reconstruct information availability and decision sequence step-by-step.
          </div>
        </div>

        {/* Player Controls Bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button 
            onClick={() => { setCurrentStepIndex(0); setIsPlaying(false); }}
            style={{ background: '#F1F5F9', border: '1px solid #CBD5E1', padding: '6px 10px', borderRadius: '2px', cursor: 'pointer' }}
            title="Reset Replay"
          >
            <RotateCcw size={14} />
          </button>

          <button 
            onClick={() => setCurrentStepIndex(Math.max(0, currentStepIndex - 1))}
            disabled={currentStepIndex === 0}
            style={{ background: '#F1F5F9', border: '1px solid #CBD5E1', padding: '6px 10px', borderRadius: '2px', cursor: 'pointer', opacity: currentStepIndex === 0 ? 0.4 : 1 }}
            title="Previous Step"
          >
            <ChevronLeft size={16} />
          </button>

          <button 
            onClick={() => setIsPlaying(!isPlaying)}
            style={{ background: 'var(--color-primary-navy)', color: '#FFF', border: 'none', padding: '6px 14px', borderRadius: '2px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 'bold' }}
          >
            {isPlaying ? <Pause size={14} /> : <Play size={14} />}
            <span>{isPlaying ? 'Pause' : 'Play Replay'}</span>
          </button>

          <button 
            onClick={() => setCurrentStepIndex(Math.min(timelineItems.length - 1, currentStepIndex + 1))}
            disabled={currentStepIndex === timelineItems.length - 1}
            style={{ background: '#F1F5F9', border: '1px solid #CBD5E1', padding: '6px 10px', borderRadius: '2px', cursor: 'pointer', opacity: currentStepIndex === timelineItems.length - 1 ? 0.4 : 1 }}
            title="Next Step"
          >
            <ChevronRight size={16} />
          </button>

          {/* Speed Selector */}
          <div style={{ display: 'flex', gap: '4px', marginLeft: '6px' }}>
            {[1, 2, 5].map(s => (
              <button
                key={s}
                onClick={() => setPlaybackSpeed(s)}
                style={{
                  background: playbackSpeed === s ? 'var(--color-gold-accent)' : '#F1F5F9',
                  color: playbackSpeed === s ? '#000' : '#334155',
                  border: '1px solid #CBD5E1',
                  padding: '3px 6px',
                  fontSize: '10px',
                  fontWeight: 'bold',
                  borderRadius: '2px',
                  cursor: 'pointer'
                }}
              >
                {s}x
              </button>
            ))}
          </div>

          {/* Clock Indicator */}
          <div style={{ backgroundColor: '#0F172A', color: '#F59E0B', padding: '6px 12px', borderRadius: '2px', fontFamily: 'monospace', fontWeight: 'bold', fontSize: '13px' }}>
            T+ {formatSecondsToMMSS(currentItem.timeSec)} ({currentStepIndex + 1}/{timelineItems.length})
          </div>
        </div>
      </div>

      {/* Role Filter Selector */}
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', backgroundColor: '#F8FAFC', padding: '8px 12px', border: '1px solid #CBD5E1' }}>
        <Filter size={14} style={{ color: '#64748B' }} />
        <span style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--color-primary-navy)' }}>Filter Participant Role View:</span>

        {['ALL', 'COMMANDER', 'FIELD_UNIT', 'LOGISTICS', 'SIGNALS'].map(role => (
          <button
            key={role}
            onClick={() => setRoleFilter(role)}
            style={{
              background: roleFilter === role ? 'var(--color-primary-navy)' : '#FFF',
              color: roleFilter === role ? '#FFF' : '#334155',
              border: '1px solid #CBD5E1',
              padding: '2px 8px',
              fontSize: '10px',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            {role}
          </button>
        ))}
      </div>

      {/* Replay State Display */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {/* Left Column: Messages Delivered up to Current Step */}
        <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #CBD5E1', padding: '16px' }}>
          <div style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--color-primary-navy)', marginBottom: '10px', borderBottom: '1px solid #E2E8F0', paddingBottom: '6px' }}>
            Information Delivered to Participant by T+ {formatSecondsToMMSS(currentItem.timeSec)} ({filteredDeliveredMessages.length})
          </div>

          {filteredDeliveredMessages.length === 0 ? (
            <div style={{ fontSize: '12px', color: '#64748B', padding: '16px', textAlign: 'center' }}>
              No intelligence dispatches delivered by this point in time.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '300px', overflowY: 'auto' }}>
              {filteredDeliveredMessages.map(m => (
                <div key={m.id} style={{ backgroundColor: '#FFF', border: '1px solid #CBD5E1', padding: '10px', fontSize: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', color: 'var(--color-primary-navy)' }}>
                    <span>[T+ {formatSecondsToMMSS(m.timeSec)}] {m.title}</span>
                    <span style={{ fontSize: '9px', background: '#E2E8F0', padding: '1px 4px', textTransform: 'uppercase' }}>{m.recipientRole}</span>
                  </div>
                  <div style={{ color: '#334155', marginTop: '4px' }}>{m.content}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Decisions Recorded up to Current Step */}
        <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #CBD5E1', padding: '16px' }}>
          <div style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--color-terracotta)', marginBottom: '10px', borderBottom: '1px solid #E2E8F0', paddingBottom: '6px' }}>
            Command Decisions Submitted by T+ {formatSecondsToMMSS(currentItem.timeSec)} ({filteredDecisions.length})
          </div>

          {filteredDecisions.length === 0 ? (
            <div style={{ fontSize: '12px', color: '#64748B', padding: '16px', textAlign: 'center' }}>
              No command decisions recorded by this point in time.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '300px', overflowY: 'auto' }}>
              {filteredDecisions.map(d => (
                <div key={d.id} style={{ backgroundColor: '#FFF', border: '1px solid #CBD5E1', borderLeft: '3px solid var(--color-terracotta)', padding: '10px', fontSize: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', color: 'var(--color-primary-navy)' }}>
                    <span>[T+ {formatSecondsToMMSS(d.timeSec)}] {d.title}</span>
                    <span style={{ fontSize: '10px', color: 'var(--color-terracotta)', fontWeight: 'bold' }}>{d.submittedBy}</span>
                  </div>
                  <div style={{ color: '#334155', marginTop: '4px' }}><strong>Rationale:</strong> {d.content}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
