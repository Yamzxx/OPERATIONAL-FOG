import React from 'react';
import { NationalEmblem } from './EmblemAndFlag';
import { X, FileText, Download, ShieldCheck } from 'lucide-react';

export const WhitepaperModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="gov-modal-overlay" onClick={onClose}>
      <div className="gov-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '760px' }}>
        <div className="gov-modal-header" style={{ backgroundColor: 'var(--color-primary-navy)', color: '#FFF' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <NationalEmblem height={40} />
            <div>
              <div style={{ fontSize: '10px', color: 'var(--color-gold-accent)', fontWeight: 'bold' }}>
                TECHNICAL WHITEPAPER • REF: IND-FOG-2026-WP
              </div>
              <div style={{ color: '#FFF', fontFamily: 'var(--font-family-serif)', fontSize: '18px', fontWeight: 'bold' }}>
                Communication Resilience Architecture in High-Friction Environments
              </div>
            </div>
          </div>
          <button className="gov-modal-close" onClick={onClose} style={{ color: '#FFF' }}>
            <X size={20} />
          </button>
        </div>

        <div className="gov-modal-body">
          <div style={{ fontSize: '12px', color: '#64748B', marginBottom: '16px', borderBottom: '1px solid #E2E8F0', paddingBottom: '8px' }}>
            Published by National Defence Simulation Laboratory • Author: Strategic Operational Engineering Team
          </div>

          <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--color-primary-navy)', marginBottom: '8px' }}>
            1. Executive Summary
          </h3>
          <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: '1.6', marginBottom: '14px' }}>
            Modern joint operations rely heavily on continuous digital telemetry and high-bandwidth radio channels. When adversarial jammer nodes or physical obstacles Sever primary links, command paralysis often occurs. Operational Fog models these exact friction vectors using dynamic synthetic latency equations and out-of-order queueing algorithms.
          </p>

          <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--color-primary-navy)', marginBottom: '8px' }}>
            2. The Latency Injection Engine
          </h3>
          <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: '1.6', marginBottom: '14px' }}>
            Unlike static simulators, Operational Fog applies variable normal distribution curves to signal propagation. Messages dispatched between Node Alpha (Strategic Hub) and Node Bravo (Field Command) may experience non-linear delays ranging from seconds to tens of minutes. This forces participants to evaluate information freshness before issuing counter-orders.
          </p>

          <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--color-primary-navy)', marginBottom: '8px' }}>
            3. Decision Traceability & Audit Logging
          </h3>
          <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: '1.6', marginBottom: '16px' }}>
            Every action submitted by a participant is cryptographically timestamped along with the exact telemetry state visible to them at that moment. During After-Action Review (AAR), evaluators contrast the participant’s decision against the ground-truth state, identifying cognitive biases, over-reliance on stale reports, and effective procedural adaptations.
          </p>

          <div style={{ backgroundColor: 'var(--color-gold-light)', border: '1px solid #FCD34D', padding: '12px', fontSize: '12px', color: '#78350F', marginBottom: '20px' }}>
            <strong>Note:</strong> Full 48-page technical specification PDF available for authorized exercise personnel upon request.
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '12px', borderTop: '1px solid #E2E8F0' }}>
            <button 
              className="gov-btn gov-btn-outline" 
              style={{ color: 'var(--color-primary-navy)', borderColor: '#CBD5E1' }}
              onClick={() => alert('Downloading Whitepaper PDF... (REF: IND-FOG-2026-WP.pdf)')}
            >
              <Download size={14} />
              <span>Download PDF Specification</span>
            </button>

            <button className="gov-btn gov-btn-primary" onClick={onClose}>
              Close Whitepaper View
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
