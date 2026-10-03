import React, { useState } from 'react';
import { BookOpen, Bell, Image as ImageIcon, Download, ExternalLink, ShieldAlert } from 'lucide-react';

export const UpdatesAndResources = ({ onOpenGalleryModal }) => {
  const [activeGalleryIndex, setActiveGalleryIndex] = useState(0);

  const galleryImages = [
    {
      src: '/assets/exercise_1.jpg',
      title: 'Joint Operational Readiness Seminar',
      location: 'Bengaluru Simulation Center',
      desc: 'Participants evaluating command node response under dynamic RF signal attenuation.'
    },
    {
      src: '/assets/exercise_2.jpg',
      title: 'Tactical Decision Terminal Console',
      location: 'Latency & Log Interface',
      desc: 'Live telemetry displaying radio packet latency timeline and out-of-order dispatch queue.'
    }
  ];

  return (
    <section className="gov-section gov-section-subtle" id="updates">
      <div className="gov-container">
        <div className="gov-section-header">
          <div>
            <h2 className="gov-section-title">Updates and Resources</h2>
            <p style={{ fontSize: '13px', color: '#64748B', marginTop: '4px' }}>
              Platform releases, exercise guidelines, and simulation log archives (Demo Content).
            </p>
          </div>
          <span style={{ fontSize: '11px', background: '#FEF3C7', color: '#92400E', padding: '2px 8px', border: '1px solid #FCD34D', fontWeight: 600 }}>
            PROTOTYPE NOTICE
          </span>
        </div>

        <div className="gov-resources-grid">
          {/* Panel 1: Training Resources */}
          <div className="gov-panel-box">
            <div className="gov-panel-header-strip">
              <BookOpen size={16} />
              <span>Training Curricula & SOPs</span>
            </div>
            <div className="gov-panel-body">
              <div className="gov-resource-item">
                <div className="gov-resource-date">DOCUMENTATION • PDF (2.4 MB)</div>
                <div className="gov-resource-title">Operational Fog SOP & Exercise Protocol v2.4</div>
                <div className="gov-resource-desc">Standard operating procedures for managing signal latency during simulated command exercises.</div>
              </div>

              <div className="gov-resource-item">
                <div className="gov-resource-date">MANUAL • PDF (1.8 MB)</div>
                <div className="gov-resource-title">Instructor Scenario Configuration Guide</div>
                <div className="gov-resource-desc">Technical specification for setting up multi-node radio delay vectors and packet drop rules.</div>
              </div>

              <div className="gov-resource-item">
                <div className="gov-resource-date">SPECIFICATION • PDF (950 KB)</div>
                <div className="gov-resource-title">After-Action Review Metric Index</div>
                <div className="gov-resource-desc">Quantitative evaluation framework for measuring decision timeliness and rationale clarity.</div>
              </div>
            </div>
          </div>

          {/* Panel 2: Announcements & Updates */}
          <div className="gov-panel-box">
            <div className="gov-panel-header-strip" style={{ backgroundColor: 'var(--color-terracotta)' }}>
              <Bell size={16} />
              <span>Announcements & Platform Updates</span>
            </div>
            <div className="gov-panel-body">
              <div className="gov-resource-item">
                <div className="gov-resource-date">RELEASE • OCT 2026</div>
                <div className="gov-resource-title">Version 2.4 Synthetic Latency Patch Deployed</div>
                <div className="gov-resource-desc">[Demo Notice] Integrated real-time RF noise curve generator and encrypted order verification logs.</div>
              </div>

              <div className="gov-resource-item">
                <div className="gov-resource-date">MAINTENANCE • SCHEDULED</div>
                <div className="gov-resource-title">Weekly Simulation Sandbox Maintenance</div>
                <div className="gov-resource-desc">System maintenance scheduled every Sunday 0200 - 0400 hrs IST. Unsaved exercise logs will be archived.</div>
              </div>

              <div className="gov-resource-item">
                <div className="gov-resource-date">FEATURE UPDATE</div>
                <div className="gov-resource-title">Enhanced Multi-Node Tactical Sandbox</div>
                <div className="gov-resource-desc">Supports up to 32 concurrent command nodes with independent bandwidth constraints.</div>
              </div>
            </div>
          </div>

          {/* Panel 3: Exercise Gallery */}
          <div className="gov-panel-box">
            <div className="gov-panel-header-strip" style={{ backgroundColor: '#1E293B' }}>
              <ImageIcon size={16} />
              <span>Exercise Gallery</span>
            </div>
            <div className="gov-panel-body">
              <img 
                src={galleryImages[activeGalleryIndex].src} 
                alt={galleryImages[activeGalleryIndex].title}
                className="gov-gallery-thumb"
              />

              <div style={{ fontWeight: 'bold', fontSize: '13px', color: 'var(--color-primary-navy)', marginBottom: '2px' }}>
                {galleryImages[activeGalleryIndex].title}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--color-terracotta)', fontWeight: '600', marginBottom: '6px' }}>
                {galleryImages[activeGalleryIndex].location}
              </div>
              <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '12px' }}>
                {galleryImages[activeGalleryIndex].desc}
              </p>

              {/* Thumbnail Selector */}
              <div style={{ display: 'flex', gap: '8px' }}>
                {galleryImages.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveGalleryIndex(i)}
                    style={{
                      border: activeGalleryIndex === i ? '2px solid var(--color-terracotta)' : '1px solid #CBD5E1',
                      padding: '2px',
                      background: '#FFF',
                      cursor: 'pointer'
                    }}
                  >
                    <img src={img.src} alt="thumb" style={{ width: '48px', height: '32px', objectFit: 'cover' }} />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
