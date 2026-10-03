import React, { useState } from 'react';
import { Users, Send, MessageSquare, Shield, CheckCircle, Wifi, UserCheck } from 'lucide-react';

export const TeamCoordinationPanel = ({ 
  session, 
  currentUser, 
  onSendTeamMessage 
}) => {
  const [messageInput, setMessageInput] = useState('');

  const participants = session?.participants || [
    { id: 'p1', displayName: currentUser?.serviceId || 'Operator', role: 'commander', status: 'Online' }
  ];

  const teamMessages = session?.teamMessages || [];

  const handleSend = (e) => {
    e.preventDefault();
    if (!messageInput.trim()) return;

    onSendTeamMessage(messageInput.trim());
    setMessageInput('');
  };

  return (
    <div style={{ backgroundColor: '#FFF', border: '1px solid #CBD5E1', padding: '18px', borderTop: '3px solid var(--color-primary-navy)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Panel Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #E2E8F0', paddingBottom: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Users size={16} style={{ color: 'var(--color-terracotta)' }} />
          <h3 style={{ fontSize: '15px', fontWeight: 'bold', color: 'var(--color-primary-navy)' }}>
            Real-Time Team Coordination Channel
          </h3>
        </div>
        <span style={{ fontSize: '10px', background: '#DCFCE7', color: '#15803D', padding: '2px 6px', fontWeight: 'bold', border: '1px solid #BBF7D0' }}>
          MULTI-NODE MESH SYNC
        </span>
      </div>

      {/* Connected Participants List */}
      <div>
        <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748B', marginBottom: '6px' }}>
          CONNECTED PARTICIPANTS ({participants.length} / {session?.maxParticipants || 6})
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {participants.map((p) => (
            <div 
              key={p.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor: '#F8FAFC',
                border: '1px solid #CBD5E1',
                padding: '4px 8px',
                fontSize: '11px',
                borderRadius: '2px'
              }}
            >
              <div 
                style={{
                  width: '7px',
                  height: '7px',
                  borderRadius: '50%',
                  backgroundColor: p.status === 'Online' ? '#16A34A' : '#EF4444'
                }}
              />
              <span style={{ fontWeight: 'bold', color: 'var(--color-primary-navy)' }}>{p.displayName}</span>
              <span style={{ fontSize: '9px', background: '#E2E8F0', padding: '1px 4px', textTransform: 'uppercase' }}>
                {p.role}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Shared Team Chat Stream */}
      <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #CBD5E1', padding: '12px', minHeight: '140px', maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {teamMessages.length === 0 ? (
          <div style={{ fontSize: '12px', color: '#94A3B8', textAlign: 'center', margin: 'auto' }}>
            No team messages sent yet. Use the input below to coordinate with connected nodes.
          </div>
        ) : (
          teamMessages.map((msg) => (
            <div 
              key={msg.id}
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #E2E8F0',
                padding: '8px 10px',
                fontSize: '12px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', color: 'var(--color-primary-navy)', marginBottom: '2px' }}>
                <span>
                  {msg.senderName} <span style={{ fontSize: '9px', color: '#64748B', textTransform: 'uppercase', background: '#E2E8F0', padding: '1px 4px' }}>[{msg.senderRole}]</span>
                </span>
                <span style={{ fontSize: '10px', color: '#94A3B8', fontWeight: 'normal' }}>
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div style={{ color: '#334155', lineHeight: '1.4' }}>{msg.text}</div>
            </div>
          ))
        )}
      </div>

      {/* Message Input Form */}
      <form onSubmit={handleSend} style={{ display: 'flex', gap: '8px' }}>
        <input 
          type="text"
          className="gov-form-input"
          placeholder="Send message to connected team nodes..."
          value={messageInput}
          onChange={(e) => setMessageInput(e.target.value)}
          style={{ flexGrow: 1, fontSize: '12px' }}
        />
        <button 
          type="submit" 
          className="gov-btn gov-btn-primary"
          style={{ padding: '6px 14px', fontSize: '12px' }}
        >
          <Send size={13} />
          <span>Send</span>
        </button>
      </form>
    </div>
  );
};
