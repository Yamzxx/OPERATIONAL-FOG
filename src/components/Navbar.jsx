import React, { useState } from 'react';
import { Home, Info, Layers, Workflow, LogIn, Menu, X, BellRing } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export const Navbar = ({ activeTab, setActiveTab, onOpenSignIn }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { t } = useLanguage();

  const navItems = [
    { id: 'home', labelKey: 'nav_home', defaultLabel: 'Home', icon: Home },
    { id: 'about', labelKey: 'nav_about', defaultLabel: 'About the Platform', icon: Info },
    { id: 'modules', labelKey: 'nav_modules', defaultLabel: 'Training Modules', icon: Layers },
    { id: 'how-it-works', labelKey: 'nav_how_it_works', defaultLabel: 'How It Works', icon: Workflow },
    { id: 'updates', labelKey: 'nav_updates', defaultLabel: 'Updates & Resources', icon: BellRing },
  ];

  const handleNavClick = (id) => {
    setActiveTab(id);
    setMobileOpen(false);
    
    // Smooth scroll to section if on landing view
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <nav className="gov-navbar">
      <div className="gov-container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {/* Desktop Nav */}
          <ul className="gov-nav-list" style={{ display: mobileOpen ? 'none' : 'flex' }}>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <li key={item.id} className="gov-nav-item">
                  <button
                    className={`gov-nav-link ${isActive ? 'active' : ''}`}
                    onClick={() => handleNavClick(item.id)}
                  >
                    <Icon size={16} />
                    <span>{t(item.labelKey, item.defaultLabel)}</span>
                  </button>
                </li>
              );
            })}
          </ul>

          {/* Sign In Button on Nav Bar Right */}
          <div style={{ marginLeft: 'auto' }}>
            <button
              className="gov-nav-link gov-nav-signin-btn"
              onClick={onOpenSignIn}
              style={{ borderRight: 'none', borderLeft: '1px solid rgba(255,255,255,0.2)' }}
            >
              <LogIn size={16} />
              <span>{t('nav_sign_in', 'Sign In')}</span>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

