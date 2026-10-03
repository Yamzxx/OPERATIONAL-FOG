import React from 'react';
import { NationalEmblem } from './EmblemAndFlag';
import { X, Play, Clock, Users, ShieldAlert, Cpu, CheckCircle } from 'lucide-react';

export const ModuleDetailModal = ({ module, onClose, onLaunch }) => {
  if (!module) return null;

  const IconComponent = module.icon;

  return (
    <div className="gov-modal-overlay" onClick={onClose}>
      <div className="gov-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '680px' }}>
        <div className="gov-modal-header" style={{ backgroundColor: 'var(--color-primary-navy)', color: '#FFF' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '32px', height: '32px', background: '#FFF', color: 'var(--color-primary-navy)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <IconComponent size={18} />
            </div>
            <div>
              <div style={{ fontSize: '10px', color: 'var(--color-gold-accent)', fontWeight: 'bold' }}>
                MODULE SPECIFICATION SHEET • {module.code}
              </div>
              <div style={{ color: '#FFF', fontFamily: 'var(--font-family-serif)', fontSize: '18px', fontWeight: 'bold' }}>
                {module.title}
              </div>
            </div>
          </div>
          <button className="gov-modal-close" onClick={onClose} style={{ color: '#FFF' }}>
            <X size={20} />
          </button>
        </div>

        <div className="gov-modal-body">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '12px', borderBottom: '1px solid #E2E8F0', marginBottom: '16px' }}>
            <span style={{ fontSize: '12px', background: '#E0F2FE', color: '#0369A1', padding: '2px 8px', fontWeight: 'bold', border: '1px solid #BAE6FD' }}>
              CATEGORY: {module.category}
            </span>
            <span style={{ fontSize: '12px', color: '#64748B', fontWeight: '600' }}>
              Status: Simulation Ready (v2.4 Engine)
            </span>
          </div>

          <p style={{ fontSize: '14px', color: 'var(--color-text-primary)', lineHeight: '1.6', marginBottom: '20px' }}>
            {module.detailText}
          </p>

          <h4 style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--color-primary-navy)', marginBottom: '10px' }}>
            Module Specifications & Parameters
          </h4>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', backgroundColor: 'var(--color-bg-light)', padding: '16px', border: '1px solid var(--color-border-light)', marginBottom: '20px' }}>
            <div>
              <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 'bold' }}>EXERCISE DURATION</div>
              <div style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--color-primary-navy)' }}>{module.specs.duration}</div>
            </div>

            <div>
              <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 'bold' }}>FRICTION LEVEL</div>
              <div style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--color-terracotta)' }}>{module.specs.difficulty}</div>
            </div>

            <div>
              <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 'bold' }}>RECOMMENDED CAPACITY</div>
              <div style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--color-primary-navy)' }}>{module.specs.recommendedNodes}</div>
            </div>

            <div>
              <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 'bold' }}>PRIMARY EVALUATION INDEX</div>
              <div style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--color-primary-navy)' }}>{module.specs.focusArea}</div>
            </div>
          </div>

          <h4 style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--color-primary-navy)', marginBottom: '10px' }}>
            Key Learning Outcomes
          </h4>

          <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 24px 0', fontSize: '13px', color: 'var(--color-text-secondary)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle size={15} style={{ color: '#16A34A', flexShrink: 0 }} />
              <span>Developing verification protocols for delayed tactical messages.</span>
            </li>
            <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle size={15} style={{ color: '#16A34A', flexShrink: 0 }} />
              <span>Mitigating information clutter and prioritizing high-grade dispatches.</span>
            </li>
            <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle size={15} style={{ color: '#16A34A', flexShrink: 0 }} />
              <span>Maintaining command rationale logs for rigorous After-Action Reviews.</span>
            </li>
          </ul>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', paddingTop: '12px', borderTop: '1px solid #E2E8F0' }}>
            <button className="gov-btn gov-btn-secondary" onClick={onClose}>
              Close Window
            </button>
            <button className="gov-btn gov-btn-primary" onClick={() => onLaunch(module)}>
              <Play size={16} />
              <span>Launch Simulation Sandbox</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
