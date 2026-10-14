import React, { useState } from 'react';
import { BookOpen, Bell, Image as ImageIcon } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export const UpdatesAndResources = ({ onOpenGalleryModal }) => {
  const [activeGalleryIndex, setActiveGalleryIndex] = useState(0);
  const { t } = useLanguage();

  const galleryImages = [
    {
      src: '/assets/exercise_1.jpg',
      title: t('gallery_img1_title', 'Joint Operational Readiness Seminar'),
      location: t('gallery_img1_location', 'Bengaluru Simulation Center'),
      desc: t('gallery_img1_desc', 'Participants evaluating command node response under dynamic RF signal attenuation.')
    },
    {
      src: '/assets/exercise_2.jpg',
      title: t('gallery_img2_title', 'Tactical Decision Terminal Console'),
      location: t('gallery_img2_location', 'Latency & Log Interface'),
      desc: t('gallery_img2_desc', 'Live telemetry displaying radio packet latency timeline and out-of-order dispatch queue.')
    }
  ];

  return (
    <section className="gov-section gov-section-subtle" id="updates">
      <div className="gov-container">
        <div className="gov-section-header">
          <div>
            <h2 className="gov-section-title">{t('updates_resources_title', 'Updates and Resources')}</h2>
            <p style={{ fontSize: '13px', color: '#64748B', marginTop: '4px' }}>
              {t('updates_resources_sub', 'Platform releases, exercise guidelines, and simulation log archives (Demo Content).')}
            </p>
          </div>
          <span style={{ fontSize: '11px', background: '#FEF3C7', color: '#92400E', padding: '2px 8px', border: '1px solid #FCD34D', fontWeight: 600 }}>
            {t('prototype_notice', 'PROTOTYPE NOTICE')}
          </span>
        </div>

        <div className="gov-resources-grid">
          {/* Panel 1: Training Resources */}
          <div className="gov-panel-box">
            <div className="gov-panel-header-strip">
              <BookOpen size={16} />
              <span>{t('training_curricula_sops', 'Training Curricula & SOPs')}</span>
            </div>
            <div className="gov-panel-body">
              <div className="gov-resource-item">
                <div className="gov-resource-date">{t('res_sop_date', 'DOCUMENTATION • PDF (2.4 MB)')}</div>
                <div className="gov-resource-title">{t('res_sop_title', 'Operational Fog SOP & Exercise Protocol v2.4')}</div>
                <div className="gov-resource-desc">{t('res_sop_desc', 'Standard operating procedures for managing signal latency during simulated command exercises.')}</div>
              </div>

              <div className="gov-resource-item">
                <div className="gov-resource-date">{t('res_manual_date', 'MANUAL • PDF (1.8 MB)')}</div>
                <div className="gov-resource-title">{t('res_manual_title', 'Instructor Scenario Configuration Guide')}</div>
                <div className="gov-resource-desc">{t('res_manual_desc', 'Technical specification for setting up multi-node radio delay vectors and packet drop rules.')}</div>
              </div>

              <div className="gov-resource-item">
                <div className="gov-resource-date">{t('res_spec_date', 'SPECIFICATION • PDF (950 KB)')}</div>
                <div className="gov-resource-title">{t('res_spec_title', 'After-Action Review Metric Index')}</div>
                <div className="gov-resource-desc">{t('res_spec_desc', 'Quantitative evaluation framework for measuring decision timeliness and rationale clarity.')}</div>
              </div>
            </div>
          </div>

          {/* Panel 2: Announcements & Updates */}
          <div className="gov-panel-box">
            <div className="gov-panel-header-strip" style={{ backgroundColor: 'var(--color-terracotta)' }}>
              <Bell size={16} />
              <span>{t('announcements_updates', 'Announcements & Platform Updates')}</span>
            </div>
            <div className="gov-panel-body">
              <div className="gov-resource-item">
                <div className="gov-resource-date">{t('ann_rel_date', 'RELEASE • OCT 2026')}</div>
                <div className="gov-resource-title">{t('ann_rel_title', 'Version 2.4 Synthetic Latency Patch Deployed')}</div>
                <div className="gov-resource-desc">{t('ann_rel_desc', '[Demo Notice] Integrated real-time RF noise curve generator and encrypted order verification logs.')}</div>
              </div>

              <div className="gov-resource-item">
                <div className="gov-resource-date">{t('ann_maint_date', 'MAINTENANCE • SCHEDULED')}</div>
                <div className="gov-resource-title">{t('ann_maint_title', 'Weekly Simulation Sandbox Maintenance')}</div>
                <div className="gov-resource-desc">{t('ann_maint_desc', 'System maintenance scheduled every Sunday 0200 - 0400 hrs IST. Unsaved exercise logs will be archived.')}</div>
              </div>

              <div className="gov-resource-item">
                <div className="gov-resource-date">{t('ann_feat_date', 'FEATURE UPDATE')}</div>
                <div className="gov-resource-title">{t('ann_feat_title', 'Enhanced Multi-Node Tactical Sandbox')}</div>
                <div className="gov-resource-desc">{t('ann_feat_desc', 'Supports up to 32 concurrent command nodes with independent bandwidth constraints.')}</div>
              </div>
            </div>
          </div>

          {/* Panel 3: Exercise Gallery */}
          <div className="gov-panel-box">
            <div className="gov-panel-header-strip" style={{ backgroundColor: '#1E293B' }}>
              <ImageIcon size={16} />
              <span>{t('exercise_gallery', 'Exercise Gallery')}</span>
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
