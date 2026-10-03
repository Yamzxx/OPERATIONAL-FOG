import React from 'react';
import { NationalEmblem, IndianFlag } from './EmblemAndFlag';
import { ShieldAlert, Mail, Phone, MapPin, ExternalLink } from 'lucide-react';

export const Footer = ({ onOpenDisclaimerModal }) => {
  return (
    <footer className="gov-footer">
      <div className="gov-container">
        {/* Prominent Government Style Disclaimer Box */}
        <div className="gov-disclaimer-box">
          <ShieldAlert size={20} style={{ color: '#EAB308', flexShrink: 0 }} />
          <div>
            <strong>DISCLAIMER & PROTOTYPE NOTICE:</strong> Independent training prototype. Not an official Government of India service. 
            All scenarios, messages, and telemetry generated within this application are synthetic and intended strictly for educational and operational simulation training.
          </div>
        </div>

        <div className="gov-footer-grid">
          {/* Brand Column */}
          <div className="gov-footer-brand">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <NationalEmblem height={48} />
              <div>
                <div className="gov-footer-title">OPERATIONAL FOG</div>
                <div style={{ fontSize: '11px', color: '#94A3B8' }}>Communication Resilience Platform</div>
              </div>
            </div>
            <p className="gov-footer-subtitle">
              Simulating degraded communication, message latency, and out-of-order dispatches for decision-making training in high-friction tactical environments.
            </p>
          </div>

          {/* Nav Links Column */}
          <div>
            <div className="gov-footer-col-title">Navigation</div>
            <ul className="gov-footer-links">
              <li><a href="#home">Home</a></li>
              <li><a href="#about">About the Platform</a></li>
              <li><a href="#modules">Training Modules</a></li>
              <li><a href="#how-it-works">How It Works</a></li>
              <li><a href="#updates">Updates & Resources</a></li>
            </ul>
          </div>

          {/* Platform Workspaces */}
          <div>
            <div className="gov-footer-col-title">Workspaces</div>
            <ul className="gov-footer-links">
              <li><a href="#instructor">Instructor Console</a></li>
              <li><a href="#participant">Participant Workspace</a></li>
              <li><a href="#aar">After-Action Review</a></li>
              <li><a href="#docs">Platform Manual & SOPs</a></li>
              <li><a href="#api">API & Scenario Specs</a></li>
            </ul>
          </div>

          {/* Contact / Helpdesk Placeholder */}
          <div>
            <div className="gov-footer-col-title">Helpdesk & Contact</div>
            <div style={{ fontSize: '13px', color: '#CBD5E1', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Phone size={14} style={{ color: 'var(--color-gold-accent)' }} />
                <span>Helpline: +91 (011) 2301-FOGS</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Mail size={14} style={{ color: 'var(--color-gold-accent)' }} />
                <span>Email: support@operationalfog.internal</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <MapPin size={14} style={{ color: 'var(--color-gold-accent)', marginTop: '3px' }} />
                <span>National Defence Simulation Laboratory, New Delhi 110001</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="gov-footer-bottom">
          <div>
            © {new Date().getFullYear()} Operational Fog Training Platform. Designed for Decision Resilience.
          </div>
          
          <div style={{ display: 'flex', gap: '16px' }}>
            <a href="#privacy" onClick={(e) => e.preventDefault()}>Privacy Policy</a>
            <span>|</span>
            <a href="#terms" onClick={(e) => e.preventDefault()}>Terms of Service</a>
            <span>|</span>
            <a href="#accessibility" onClick={(e) => e.preventDefault()}>Accessibility Statement</a>
            <span>|</span>
            <a href="#sitemap" onClick={(e) => e.preventDefault()}>Sitemap</a>
          </div>
        </div>
      </div>
    </footer>
  );
};
