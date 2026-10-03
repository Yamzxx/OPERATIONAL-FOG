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
  ShieldCheck
} from 'lucide-react';

export const Sidebar = ({ 
  activeView, 
  setActiveView, 
  userRole, 
  onSignOut, 
  collapsed, 
  setCollapsed 
}) => {
  const menuItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'scenarios', label: 'Scenario Library', icon: BookOpen },
    { id: 'sessions', label: 'Training Sessions', icon: PlayCircle },
    { id: 'aar', label: 'After-Action Reviews', icon: FileCheck },
    { id: 'settings', label: 'Settings', icon: Settings }
  ];

  return (
    <aside 
      style={{
        width: collapsed ? '72px' : '260px',
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', overflow: 'hidden' }}>
          <NationalEmblem height={collapsed ? 36 : 42} />
          {!collapsed && (
            <div>
              <div style={{ fontFamily: 'var(--font-family-serif)', fontWeight: '800', fontSize: '16px', color: '#FFF', letterSpacing: '0.5px' }}>
                OPERATIONAL FOG
              </div>
              <div style={{ fontSize: '10px', color: 'var(--color-gold-accent)', fontWeight: 'bold' }}>
                TRAINING CONSOLE
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
            borderRadius: '2px',
            padding: '4px',
            display: collapsed ? 'none' : 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          <ChevronLeft size={16} />
        </button>
      </div>

      {/* Demo Environment Badge */}
      {!collapsed && (
        <div 
          style={{
            margin: '12px 16px 4px',
            padding: '6px 10px',
            backgroundColor: '#1E293B',
            border: '1px solid #334155',
            borderRadius: '2px',
            fontSize: '11px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#F59E0B', fontWeight: 'bold' }}>
            <ShieldCheck size={14} />
            <span>DEMO ENVIRONMENT</span>
          </div>
          <span style={{ fontSize: '10px', background: 'var(--color-terracotta)', color: '#FFF', padding: '1px 6px', fontWeight: 'bold' }}>
            {userRole.toUpperCase()}
          </span>
        </div>
      )}

      {/* Navigation Menu */}
      <nav style={{ flexGrow: 1, padding: '12px 8px' }}>
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
                    borderLeft: isActive ? '4px solid var(--color-gold-accent)' : '4px solid transparent',
                    borderRadius: '2px',
                    fontWeight: isActive ? '700' : '500',
                    fontSize: '14px',
                    textAlign: 'left',
                    transition: 'all 0.15s ease'
                  }}
                  title={item.label}
                >
                  <Icon size={18} style={{ color: isActive ? 'var(--color-gold-accent)' : '#94A3B8', flexShrink: 0 }} />
                  {!collapsed && <span>{item.label}</span>}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Collapse Toggle for Mobile/Small */}
      {collapsed && (
        <button
          onClick={() => setCollapsed(false)}
          style={{
            margin: '8px auto',
            background: '#1E293B',
            border: 'none',
            color: '#94A3B8',
            padding: '8px',
            borderRadius: '2px'
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
            gap: '10px',
            justifyContent: collapsed ? 'center' : 'flex-start',
            padding: '10px 14px',
            backgroundColor: '#7F1D1D',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: '2px',
            fontWeight: '600',
            fontSize: '13px'
          }}
          title="Sign Out of Session"
        >
          <LogOut size={16} />
          {!collapsed && <span>Sign Out</span>}
        </button>
      </div>
    </aside>
  );
};
