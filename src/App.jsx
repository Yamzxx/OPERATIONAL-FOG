import React, { useState, useEffect } from 'react';
import { TopUtilityBar } from './components/TopUtilityBar';
import { GovernmentHeader } from './components/GovernmentHeader';
import { Navbar } from './components/Navbar';
import { HeroBanner } from './components/HeroBanner';
import { AboutPlatform } from './components/AboutPlatform';
import { TrainingModules } from './components/TrainingModules';
import { HowItWorks } from './components/HowItWorks';
import { UpdatesAndResources } from './components/UpdatesAndResources';
import { UsefulLinks } from './components/UsefulLinks';
import { Footer } from './components/Footer';
import { SignInModal } from './components/SignInModal';
import { ModuleDetailModal } from './components/ModuleDetailModal';
import { WhitepaperModal } from './components/WhitepaperModal';

export function App() {
  const [fontScale, setFontScale] = useState('md');
  const [highContrast, setHighContrast] = useState(false);
  const [activeTab, setActiveTab] = useState('home');
  const [isSignInOpen, setIsSignInOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedModule, setSelectedModule] = useState(null);
  const [isWhitepaperOpen, setIsWhitepaperOpen] = useState(false);

  // Apply high contrast theme attribute to body
  useEffect(() => {
    if (highContrast) {
      document.body.setAttribute('data-theme', 'high-contrast');
    } else {
      document.body.removeAttribute('data-theme');
    }
  }, [highContrast]);

  const handleExploreTraining = () => {
    setActiveTab('modules');
    const el = document.getElementById('modules');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleSignInSuccess = (user) => {
    setCurrentUser(user);
    // Modal remains open to display the Authenticated Dashboard Preview
  };

  const handleSignOut = () => {
    setCurrentUser(null);
    setIsSignInOpen(false);
  };

  const handleLaunchModule = (module) => {
    setSelectedModule(null);
    if (!currentUser) {
      setIsSignInOpen(true);
    } else {
      alert(`Launching ${module.title} Sandbox Environment for ${currentUser.serviceId}...`);
    }
  };

  const handleUsefulLinkClick = (link) => {
    if (link.id === 'instructor' || link.id === 'participant') {
      setIsSignInOpen(true);
    } else if (link.id === 'docs') {
      setIsWhitepaperOpen(true);
    } else if (link.id === 'reports') {
      handleExploreTraining();
    }
  };

  return (
    <div className={`app-wrapper font-scale-${fontScale}`}>
      {/* Top Government Utility Bar */}
      <TopUtilityBar 
        fontScale={fontScale}
        setFontScale={setFontScale}
        highContrast={highContrast}
        setHighContrast={setHighContrast}
        onOpenSignIn={() => setIsSignInOpen(true)}
      />

      {/* Main Government Header */}
      <GovernmentHeader />

      {/* Restrained Terracotta Navigation Bar */}
      <Navbar 
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenSignIn={() => setIsSignInOpen(true)}
      />

      {/* Main Page Layout */}
      <main id="main-content">
        <HeroBanner 
          onExploreClick={handleExploreTraining}
          onSignInClick={() => setIsSignInOpen(true)}
        />

        <AboutPlatform 
          onReadMoreClick={() => setIsWhitepaperOpen(true)}
        />

        <TrainingModules 
          onSelectModule={(mod) => setSelectedModule(mod)}
        />

        <HowItWorks />

        <UpdatesAndResources 
          onOpenGalleryModal={() => {}}
        />

        <UsefulLinks 
          onLinkClick={handleUsefulLinkClick}
        />
      </main>

      {/* Footer */}
      <Footer 
        onOpenDisclaimerModal={() => {}}
      />

      {/* Modals */}
      <SignInModal 
        isOpen={isSignInOpen}
        onClose={() => setIsSignInOpen(false)}
        onSignInSuccess={handleSignInSuccess}
        currentUser={currentUser}
        onSignOut={handleSignOut}
      />

      <ModuleDetailModal 
        module={selectedModule}
        onClose={() => setSelectedModule(null)}
        onLaunch={handleLaunchModule}
      />

      <WhitepaperModal 
        isOpen={isWhitepaperOpen}
        onClose={() => setIsWhitepaperOpen(false)}
      />
    </div>
  );
}

export default App;
