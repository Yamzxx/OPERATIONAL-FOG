import React, { useState, useEffect } from 'react';
import { IndianFlag } from './EmblemAndFlag';
import { Globe, Eye, Type, Clock, Search, ShieldCheck } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export const TopUtilityBar = ({ 
  fontScale, 
  setFontScale, 
  highContrast, 
  setHighContrast,
  onOpenSignIn,
  onOpenAccessibilityInfo
}) => {
  const [timeString, setTimeString] = useState('');
  const { lang, setLang, t } = useLanguage();

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      const options = { 
        weekday: 'short', 
        year: 'numeric', 
        month: 'short', 
        day: '2-digit', 
        hour: '2-digit', 
        minute: '2-digit',
        second: '2-digit',
        hour12: false 
      };
      setTimeString(now.toLocaleDateString('en-IN', options) + ' IST');
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="gov-utility-bar">
      <div className="gov-container">
        <div className="gov-utility-left">
          <div className="gov-flag-badge">
            <IndianFlag width={22} height={14} />
            <span>{t('gov_india', 'भारत सरकार | Government of India (Training Prototype)')}</span>
          </div>
          <span style={{ opacity: 0.3 }}>|</span>
          <div className="gov-utility-item">
            <ShieldCheck size={13} style={{ color: '#C59B27' }} />
            <span>{t('comm_resilience_platform', 'Communication Resilience Platform')}</span>
          </div>
        </div>

        <div className="gov-utility-right">
          {/* Font Resizers */}
          <div className="gov-utility-item" title="Adjust Text Size">
            <Type size={13} />
            <button 
              className={`gov-utility-btn ${fontScale === 'sm' ? 'active' : ''}`}
              onClick={() => setFontScale('sm')}
              aria-label="Decrease Font Size"
            >
              A-
            </button>
            <button 
              className={`gov-utility-btn ${fontScale === 'md' ? 'active' : ''}`}
              onClick={() => setFontScale('md')}
              aria-label="Reset Font Size"
            >
              A
            </button>
            <button 
              className={`gov-utility-btn ${fontScale === 'lg' ? 'active' : ''}`}
              onClick={() => setFontScale('lg')}
              aria-label="Increase Font Size"
            >
              A+
            </button>
          </div>

          <span style={{ opacity: 0.3 }}>|</span>

          {/* High Contrast Toggle */}
          <button 
            className={`gov-utility-btn ${highContrast ? 'active' : ''}`}
            onClick={() => setHighContrast(!highContrast)}
            title="Toggle High Contrast Mode"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
          >
            <Eye size={12} />
            {highContrast ? t('standard_mode', 'Standard Mode') : t('high_contrast', 'High Contrast')}
          </button>

          <span style={{ opacity: 0.3 }}>|</span>

          {/* Language Toggle */}
          <div className="gov-utility-item">
            <Globe size={13} />
            <select 
              value={lang} 
              onChange={(e) => setLang(e.target.value)}
              style={{
                background: '#1E293B',
                color: '#E2E8F0',
                border: '1px solid #334155',
                fontSize: '11px',
                borderRadius: '2px',
                padding: '1px 4px'
              }}
            >
              <option value="EN">English</option>
              <option value="HI">हिन्दी (Hindi)</option>
            </select>
          </div>

          <span style={{ opacity: 0.3 }}>|</span>

          {/* Clock Display */}
          <div className="gov-utility-item" style={{ fontSize: '11px', color: '#94A3B8' }}>
            <Clock size={12} />
            <span>{timeString}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

