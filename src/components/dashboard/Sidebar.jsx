import React from 'react';
import { NationalEmblem } from '../EmblemAndFlag';
import { 
  LayoutDashboard, 
  BookOpen, 
  PlayCircle, 
  FileCheck, 
  Settings, 
  LogOut,
  ChevronLeft,
  ChevronRight,
  User,
  Radio
} from 'lucide-react';
import { ROLE_LABELS, normalizeRole } from '../../services/eventEngine';

export const Sidebar = ({ 
  activeView, 
  setActiveView, 
  userRole, 
  onSignOut, 
  collapsed, 
  setCollapsed,
  hasActiveTraining = false
}) => {
  const normalized = normalizeRole(userRole);
  const friendlyRole = ROLE_LABELS[normalized] || 'Team Leader';

  const menuItems = [
    { id: 'overview', label: 'Dashboard', icon: LayoutDashboard },
    ...(hasActiveTraining ? [{ id: 'training-room', label: 'Live Exercise', icon: Radio, isLive: true }] : []),
    { id: 'scenarios', label: 'Scenarios', icon: BookOpen },
    { id: 'sessions', label: 'Training Sessions', icon: PlayCircle },
    { id: 'aar', label: 'Debriefs & Reports', icon: FileCheck },
    { id: 'settings', label: 'Settings', icon: Settings }
  ];

  return (
    <aside 
      style={{
        width: collapsed ? '72px' : '250px',
        backgroundColor: '#0F172A',
        color: '#E2E8F0',
        display: 'flex',
        flexDirection: 'column',
        borderRight: '1px solid #1E293B',
        transition: 'width 0.2s ease',
        flexShrink: 0,
        minHeight: '100vh',
        zIndex: 100
      }}
    >
      {/* Brand Header */}
      <div 
        style={{
          padding: collapsed ? '16px 12px' : '18px 20px',
          borderBottom: '1px solid #1E293B',
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'space-between',
          backgroundColor: '#0A0F1D'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
          <NationalEmblem height={collapsed ? 32 : 38} />
          {!collapsed && (
            <div>
              <div style={{ fontFamily: 'var(--font-family-serif)', fontWeight: '800', fontSize: '15px', color: '#FFF', letterSpacing: '0.5px' }}>
                OPERATIONAL FOG
              </div>
              <div style={{ fontSize: '10px', color: '#FBBF24', fontWeight: 'bold' }}>
                TRAINING SIMULATOR
              </div>
            </div>
          )}
        </div>

        <button 
          onClick={() => setCollapsed(!collapsed)}
          style={{
            background: '#1E293B',
            border: 'none',
            color: '#94A3B8',
            borderRadius: '4px',
            padding: '4px',
            display: collapsed ? 'none' : 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer'
          }}
          title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          <ChevronLeft size={16} />
        </button>
      </div>

      {/* User Role Badge */}
      {!collapsed && (
        <div 
          style={{
            margin: '12px 14px 4px',
            padding: '8px 12px',
            backgroundColor: '#1E293B',
            border: '1px solid #334155',
            borderRadius: '4px',
            fontSize: '11px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#94A3B8' }}>
            <User size={13} />
            <span>Role:</span>
          </div>
          <span style={{ fontSize: '11px', backgroundColor: '#2563EB', color: '#FFF', padding: '2px 8px', fontWeight: 'bold', borderRadius: '3px' }}>
            {friendlyRole}
          </span>
        </div>
      )}

      {/* Navigation Menu */}
      <nav style={{ flexGrow: 1, padding: '10px 8px' }}>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            return (
              <li key={item.id}>
                <button
                  onClick={() => setActiveView(item.id)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: collapsed ? '12px' : '10px 14px',
                    justifyContent: collapsed ? 'center' : 'flex-start',
                    backgroundColor: isActive ? '#1E3A8A' : 'transparent',
                    color: isActive ? '#FFFFFF' : '#94A3B8',
                    border: 'none',
                    borderLeft: isActive ? '4px solid #FBBF24' : '4px solid transparent',
                    borderRadius: '4px',
                    fontWeight: isActive ? '700' : '500',
                    fontSize: '13px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                  title={item.label}
                >
                  <Icon 
                    size={17} 
                    style={{ 
                      color: item.isLive ? '#EF4444' : (isActive ? '#FBBF24' : '#94A3B8'), 
                      flexShrink: 0 
                    }} 
                  />
                  {!collapsed && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexGrow: 1 }}>
                      <span style={{ color: item.isLive ? '#FCA5A5' : 'inherit' }}>{item.label}</span>
                      {item.isLive && (
                        <span style={{ fontSize: '9px', backgroundColor: '#DC2626', color: '#FFF', padding: '1px 5px', borderRadius: '2px', fontWeight: 'bold' }}>
                          LIVE
                        </span>
                      )}
                    </div>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Collapse Toggle for Small view */}
      {collapsed && (
        <button
          onClick={() => setCollapsed(false)}
          style={{
            margin: '8px auto',
            background: '#1E293B',
            border: 'none',
            color: '#94A3B8',
            padding: '8px',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          <ChevronRight size={18} />
        </button>
      )}

      {/* Sign Out Button at Bottom */}
      <div style={{ padding: '12px', borderTop: '1px solid #1E293B' }}>
        <button
          onClick={onSignOut}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            justifyContent: collapsed ? 'center' : 'flex-start',
            padding: '8px 12px',
            backgroundColor: 'transparent',
            color: '#94A3B8',
            border: '1px solid #334155',
            borderRadius: '4px',
            fontWeight: '600',
            fontSize: '12px',
            cursor: 'pointer'
          }}
          title="Sign Out"
        >
          <LogOut size={14} />
          {!collapsed && <span>Sign Out</span>}
        </button>
      </div>
    </aside>
  );
};
