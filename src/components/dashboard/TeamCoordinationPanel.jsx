import React, { useState, useEffect, useRef } from 'react';
import { Users, Send, MessageSquare } from 'lucide-react';
import { ROLE_LABELS } from '../../services/eventEngine';

export const TeamCoordinationPanel = ({ 
  session, 
  currentUser, 
  onSendTeamMessage 
}) => {
  const [messageInput, setMessageInput] = useState('');
  const messagesEndRef = useRef(null);

  const participants = session?.participants || [
    { id: 'p1', displayName: currentUser?.serviceId || 'Trainee', role: currentUser?.role || 'team_leader', status: 'Online' }
  ];

  const teamMessages = session?.teamMessages || [];

  // Auto-scroll to latest message
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [teamMessages.length]);

  const handleSend = (e) => {
    if (e) e.preventDefault();
    if (!messageInput.trim()) return;

    onSendTeamMessage(messageInput.trim());
    setMessageInput('');
  };

  const handleQuickSend = (text) => {
    onSendTeamMessage(text);
  };

  return (
    <div style={{ backgroundColor: '#FFF', border: '1px solid #E2E8F0', borderRadius: '6px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {/* Panel Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #E2E8F0', paddingBottom: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <MessageSquare size={16} style={{ color: '#2563EB' }} />
          <h3 style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--color-primary-navy)', margin: 0 }}>
            Team Chat
          </h3>
        </div>
        <span style={{ fontSize: '11px', background: '#DCFCE7', color: '#15803D', padding: '2px 8px', fontWeight: 'bold', borderRadius: '12px' }}>
          ● Live Chat ({teamMessages.length} msgs)
        </span>
      </div>

      {/* Connected Participants List */}
      <div>
        <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748B', marginBottom: '6px' }}>
          TEAM MEMBERS ONLINE ({participants.length}):
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {participants.map((p) => (
            <div 
              key={p.id || p.serviceId}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor: '#F8FAFC',
                border: '1px solid #E2E8F0',
                padding: '3px 8px',
                fontSize: '11px',
                borderRadius: '4px'
              }}
            >
              <div 
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  backgroundColor: p.status === 'Online' ? '#16A34A' : '#EF4444'
                }}
              />
              <span style={{ fontWeight: 'bold', color: 'var(--color-primary-navy)' }}>{p.displayName}</span>
              <span style={{ fontSize: '9px', background: '#E2E8F0', padding: '1px 5px', fontWeight: 'bold', color: '#475569', borderRadius: '3px' }}>
                {ROLE_LABELS[p.role] || p.role}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Shared Team Chat Stream */}
      <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '4px', padding: '10px', minHeight: '140px', maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {teamMessages.length === 0 ? (
          <div style={{ fontSize: '12px', color: '#64748B', textAlign: 'center', margin: 'auto', padding: '12px' }}>
            <div>No team messages yet.</div>
            <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '4px' }}>
              Use the chat below or quick prompts to coordinate with squad mates.
            </div>
          </div>
        ) : (
          teamMessages.map((msg, index) => (
            <div 
              key={msg.id || index} 
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '4px',
                padding: '6px 10px',
                fontSize: '12px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', color: 'var(--color-primary-navy)', marginBottom: '2px' }}>
                <span>
                  {msg.senderName} <span style={{ fontSize: '9px', color: '#475569', background: '#F1F5F9', padding: '1px 5px', borderRadius: '3px' }}>[{ROLE_LABELS[msg.senderRole] || msg.senderRole}]</span>
                </span>
                <span style={{ fontSize: '10px', color: '#94A3B8', fontWeight: 'normal' }}>
                  {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                </span>
              </div>
              <div style={{ color: '#334155', lineHeight: '1.4' }}>{msg.text}</div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Prompts */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
        <button
          type="button"
          onClick={() => handleQuickSend('Did anyone get radar confirmation on Route Alpha?')}
          style={{ background: '#F1F5F9', border: '1px solid #CBD5E1', borderRadius: '12px', padding: '2px 8px', fontSize: '11px', color: '#334155', cursor: 'pointer' }}
        >
          💬 Ask about Route Alpha
        </button>
        <button
          type="button"
          onClick={() => handleQuickSend('Are you experiencing radio jamming or delays?')}
          style={{ background: '#F1F5F9', border: '1px solid #CBD5E1', borderRadius: '12px', padding: '2px 8px', fontSize: '11px', color: '#334155', cursor: 'pointer' }}
        >
          💬 Check jamming status
        </button>
        <button
          type="button"
          onClick={() => handleQuickSend('Can someone confirm if Convoy Bravo is stopped?')}
          style={{ background: '#F1F5F9', border: '1px solid #CBD5E1', borderRadius: '12px', padding: '2px 8px', fontSize: '11px', color: '#334155', cursor: 'pointer' }}
        >
          💬 Verify Convoy status
        </button>
      </div>

      {/* Message Input Form */}
      <form onSubmit={handleSend} style={{ display: 'flex', gap: '8px' }}>
        <input 
          type="text" 
          className="gov-form-input" 
          placeholder="Message teammates (e.g. 'Did anyone get radar update?')..."
          value={messageInput}
          onChange={(e) => setMessageInput(e.target.value)}
          style={{ flexGrow: 1, fontSize: '12px', padding: '6px 10px' }}
        />
        <button 
          type="submit" 
          style={{
            backgroundColor: '#2563EB',
            color: '#FFF',
            border: 'none',
            padding: '6px 14px',
            fontSize: '12px',
            fontWeight: 'bold',
            borderRadius: '4px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}
        >
          <Send size={12} />
          <span>Send</span>
        </button>
      </form>
    </div>
  );
};
