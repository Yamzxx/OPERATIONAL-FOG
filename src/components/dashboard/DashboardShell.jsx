import React, { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { TopNav } from './TopNav';
import { OverviewDashboard } from './OverviewDashboard';
import { ScenarioLibrary } from './ScenarioLibrary';
import { TrainingSessions } from './TrainingSessions';
import { TrainingRoom } from './TrainingRoom';
import { AfterActionReview } from './AfterActionReview';
import { SettingsView } from './SettingsView';
import { CreateScenarioModal } from './CreateScenarioModal';
import { storageService } from '../../services/storageService';

export const DashboardShell = ({ 
  currentUser, 
  onSignOut,
  fontScale,
  setFontScale,
  highContrast,
  setHighContrast
}) => {
  const [activeView, setActiveView] = useState('overview');
  const [collapsed, setCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Data States
  const [scenarios, setScenarios] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [aars, setAARS] = useState([]);
  const [activeTrainingSession, setActiveTrainingSession] = useState(null);
  const [activeScenario, setActiveScenario] = useState(null);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Load persistent data on mount
  useEffect(() => {
    setScenarios(storageService.getScenarios());
    setSessions(storageService.getSessions());
    setAARS(storageService.getAARs());
  }, []);

  const handleStartScenario = (scenario) => {
    // Create new session
    const newSess = storageService.createSession({
      name: `${scenario.title.split('—')[1] || scenario.title} Exercise`,
      scenarioId: scenario.id,
      scenarioTitle: scenario.title,
      creator: currentUser?.serviceId || 'OPS-8842-IND'
    });

    setSessions(storageService.getSessions());
    setActiveTrainingSession(newSess);
    setActiveScenario(scenario);
    setActiveView('training-room');
  };

  const handleSaveScenarioDraft = (newScenario) => {
    const updated = storageService.saveScenario(newScenario);
    setScenarios(updated);
  };

  const handleSaveDecision = (sessionId, decisionData) => {
    storageService.addDecision(sessionId, decisionData);
  };

  const handleEndExercise = (session, decisions, durationMinutes) => {
    // Update session status
    storageService.updateSessionStatus(session.id, 'Completed');
    setSessions(storageService.getSessions());

    // Save AAR record
    const newAAR = storageService.saveAAR({
      sessionId: session.id,
      sessionName: session.name,
      scenarioTitle: session.scenarioTitle,
      creator: session.creator,
      startTime: session.createdAt,
      endTime: new Date().toISOString(),
      durationMinutes,
      decisionsCount: decisions.length,
      decisions
    });

    setAARS(storageService.getAARs());
    setActiveTrainingSession(null);
    setActiveScenario(null);
    setActiveView('aar');
  };

  const handleSaveInstructorNote = (aarId, noteText) => {
    const updated = storageService.saveAARNote(aarId, noteText);
    setAARS(updated);
  };

  const getPageTitle = () => {
    switch (activeView) {
      case 'overview': return 'Training Overview Dashboard';
      case 'scenarios': return 'Fictional Scenario Library';
      case 'sessions': return 'Training Exercise Sessions';
      case 'training-room': return 'Active Exercise Training Room';
      case 'aar': return 'After-Action Reviews (AAR)';
      case 'settings': return 'Platform Settings';
      default: return 'Operational Fog Dashboard';
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--color-bg-light)' }}>
      {/* Left Sidebar */}
      <Sidebar 
        activeView={activeView}
        setActiveView={setActiveView}
        userRole={currentUser?.role || 'instructor'}
        onSignOut={onSignOut}
        collapsed={collapsed}
        setCollapsed={setCollapsed}
      />

      {/* Main Content Area */}
      <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Top Bar */}
        <TopNav 
          currentTitle={getPageTitle()}
          currentUser={currentUser}
          onSignOut={onSignOut}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
        />

        {/* View Container */}
        <main style={{ flexGrow: 1 }}>
          {activeView === 'overview' && (
            <OverviewDashboard 
              scenarios={scenarios}
              sessions={sessions}
              aars={aars}
              onNavigate={(view) => setActiveView(view)}
              onOpenCreateScenario={() => setIsCreateModalOpen(true)}
            />
          )}

          {activeView === 'scenarios' && (
            <ScenarioLibrary 
              scenarios={scenarios}
              searchQuery={searchQuery}
              onStartScenario={handleStartScenario}
              onOpenCreateModal={() => setIsCreateModalOpen(true)}
            />
          )}

          {activeView === 'sessions' && (
            <TrainingSessions 
              sessions={sessions}
              scenarios={scenarios}
              onStartNewSession={handleStartScenario}
              onOpenTrainingRoom={(sess) => {
                const scen = scenarios.find(s => s.id === sess.scenarioId) || scenarios[0];
                setActiveTrainingSession(sess);
                setActiveScenario(scen);
                setActiveView('training-room');
              }}
              onViewAAR={() => setActiveView('aar')}
            />
          )}

          {activeView === 'training-room' && activeTrainingSession && (
            <TrainingRoom 
              session={activeTrainingSession}
              scenario={activeScenario}
              currentUser={currentUser}
              onSaveDecision={handleSaveDecision}
              onEndExercise={handleEndExercise}
              existingDecisions={storageService.getDecisionsForSession(activeTrainingSession.id)}
            />
          )}

          {activeView === 'aar' && (
            <AfterActionReview 
              aars={aars}
              onSaveInstructorNote={handleSaveInstructorNote}
              userRole={currentUser?.role || 'instructor'}
            />
          )}

          {activeView === 'settings' && (
            <SettingsView 
              currentUser={currentUser}
              onSignOut={onSignOut}
              fontScale={fontScale}
              setFontScale={setFontScale}
              highContrast={highContrast}
              setHighContrast={setHighContrast}
            />
          )}
        </main>
      </div>

      {/* Create Scenario Modal */}
      <CreateScenarioModal 
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSaveScenario={handleSaveScenarioDraft}
      />
    </div>
  );
};
