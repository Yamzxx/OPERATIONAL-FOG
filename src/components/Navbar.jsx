import React, { useState } from 'react';
import { Home, Info, Layers, Workflow, LogIn, Menu, X, BellRing } from 'lucide-react';

export const Navbar = ({ activeTab, setActiveTab, onOpenSignIn }) => {
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'about', label: 'About the Platform', icon: Info },
    { id: 'modules', label: 'Training Modules', icon: Layers },
    { id: 'how-it-works', label: 'How It Works', icon: Workflow },
    { id: 'updates', label: 'Updates & Resources', icon: BellRing },
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
                    <span>{item.label}</span>
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
              <span>Sign In</span>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};
