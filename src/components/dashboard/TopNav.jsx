import React, { useState } from 'react';
import { IndianFlag } from '../EmblemAndFlag';
import { Search, Bell, User, Shield, ChevronDown, CheckCircle, X } from 'lucide-react';

export const TopNav = ({ 
  currentTitle, 
  currentUser, 
  onSignOut,
  searchQuery,
  setSearchQuery
}) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const sampleNotifications = [
    { id: 1, title: 'v2.4 Synthetic Engine Active', time: '10 mins ago', desc: 'RF delay curves and transmission noise simulation ready.' },
    { id: 2, title: 'Session Completed', time: '1 hr ago', desc: 'AAR report generated for Sector Bravo Latency Test.' },
    { id: 3, title: 'Scenario Template Ready', time: '2 hrs ago', desc: 'Scenario B — Conflicting Reports available in library.' }
  ];

  return (
    <header 
      style={{
        backgroundColor: '#FFFFFF',
        borderBottom: '1px solid #E2E8F0',
        padding: '12px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        position: 'sticky',
        top: 0,
        zIndex: 90
      }}
    >
      {/* Title & Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <h2 style={{ fontFamily: 'var(--font-family-serif)', fontSize: '20px', fontWeight: '800', color: 'var(--color-primary-navy)' }}>
          {currentTitle}
        </h2>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', background: '#F1F5F9', border: '1px solid #CBD5E1', padding: '3px 8px', borderRadius: '2px', color: '#475569', fontWeight: '600' }}>
          <IndianFlag width={18} height={12} />
          <span>GoI Training Simulator</span>
        </div>
      </div>

      {/* Right Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {/* Search Field */}
        <div style={{ position: 'relative', width: '220px' }}>
          <Search size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
          <input 
            type="text"
            placeholder="Search scenarios..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '6px 10px 6px 32px',
              fontSize: '13px',
              border: '1px solid #CBD5E1',
              borderRadius: '2px',
              backgroundColor: '#F8FAFC'
            }}
          />
        </div>

        {/* Notifications Popover */}
        <div style={{ position: 'relative' }}>
          <button 
            onClick={() => setShowNotifications(!showNotifications)}
            style={{
              background: '#F1F5F9',
              border: '1px solid #CBD5E1',
              padding: '7px 9px',
              borderRadius: '2px',
              color: '#334155',
              display: 'flex',
              alignItems: 'center',
              cursor: 'pointer'
            }}
            title="Notifications"
          >
            <Bell size={16} />
            <span style={{ position: 'absolute', top: '-4px', right: '-4px', width: '14px', height: '14px', background: 'var(--color-terracotta)', color: '#FFF', fontSize: '9px', fontWeight: 'bold', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              3
            </span>
          </button>

          {showNotifications && (
            <div 
              style={{
                position: 'absolute',
                right: 0,
                top: '40px',
                width: '320px',
                backgroundColor: '#FFF',
                border: '1px solid #CBD5E1',
                boxShadow: 'var(--shadow-lg)',
                borderTop: '3px solid var(--color-primary-navy)',
                zIndex: 200,
                padding: '12px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #E2E8F0', paddingBottom: '8px', marginBottom: '10px' }}>
                <span style={{ fontWeight: 'bold', fontSize: '13px', color: 'var(--color-primary-navy)' }}>Notifications & System Alerts</span>
                <button onClick={() => setShowNotifications(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                  <X size={14} />
                </button>
              </div>

              {sampleNotifications.map((n) => (
                <div key={n.id} style={{ padding: '8px 0', borderBottom: '1px solid #F1F5F9' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 'bold', color: 'var(--color-primary-navy)' }}>
                    <span>{n.title}</span>
                    <span style={{ fontSize: '10px', color: '#94A3B8' }}>{n.time}</span>
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>{n.desc}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* User Profile Badge */}
        <div style={{ position: 'relative' }}>
          <button 
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              background: '#F8FAFC',
              border: '1px solid #CBD5E1',
              padding: '4px 10px',
              borderRadius: '2px',
              cursor: 'pointer'
            }}
          >
            <div style={{ width: '28px', height: '28px', background: 'var(--color-primary-navy)', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '12px' }}>
              <User size={16} />
            </div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--color-primary-navy)' }}>
                {currentUser?.serviceId || 'OPS-8842-IND'}
              </div>
              <div style={{ fontSize: '10px', color: 'var(--color-terracotta)', fontWeight: '700' }}>
                {(currentUser?.role || 'INSTRUCTOR').toUpperCase()}
              </div>
            </div>
            <ChevronDown size={14} style={{ color: '#64748B' }} />
          </button>

          {showProfileMenu && (
            <div 
              style={{
                position: 'absolute',
                right: 0,
                top: '44px',
                width: '220px',
                backgroundColor: '#FFF',
                border: '1px solid #CBD5E1',
                boxShadow: 'var(--shadow-md)',
                zIndex: 200,
                padding: '8px'
              }}
            >
              <div style={{ fontSize: '11px', color: '#64748B', padding: '6px 8px', borderBottom: '1px solid #E2E8F0', fontWeight: 'bold' }}>
                DEMO USER SESSION
              </div>
              <button 
                onClick={() => { setShowProfileMenu(false); onSignOut(); }}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  background: '#FEE2E2',
                  color: '#991B1B',
                  border: '1px solid #FCA5A5',
                  padding: '6px 10px',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  marginTop: '6px',
                  cursor: 'pointer'
                }}
              >
                Sign Out of Platform
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
