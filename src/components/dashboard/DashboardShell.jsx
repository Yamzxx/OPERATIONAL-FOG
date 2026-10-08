import React, { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { TopNav } from './TopNav';
import { OverviewDashboard } from './OverviewDashboard';
import { ScenarioLibrary } from './ScenarioLibrary';
import { ScenarioConfig } from './ScenarioConfig';
import { TrainingSessions } from './TrainingSessions';
import { TrainingRoom } from './TrainingRoom';
import { AfterActionReview } from './AfterActionReview';
import { SettingsView } from './SettingsView';
import { CreateMultiplayerModal } from './CreateMultiplayerModal';
import { JoinSessionModal } from './JoinSessionModal';
import { DemoGuide } from './DemoGuide';
import { storageService } from '../../services/storageService';
import { multiplayerEngine } from '../../services/multiplayerEngine';

export const DashboardShell = ({ 
  currentUser, 
  onSignOut,
  fontScale,
  setFontScale,
  highContrast,
  setHighContrast
}) => {
  const [activeView, setActiveView] = useState('overview'); // overview | scenarios | scen-config | sessions | training-room | aar | settings
  const [collapsed, setCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Data States
  const [scenarios, setScenarios] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [aars, setAARS] = useState([]);
  const [activeTrainingSession, setActiveTrainingSession] = useState(null);
  const [activeScenario, setActiveScenario] = useState(null);
  const [scenarioToEdit, setScenarioToEdit] = useState(null);

  const [isCreateMultiplayerOpen, setIsCreateMultiplayerOpen] = useState(false);
  const [isJoinSessionOpen, setIsJoinSessionOpen] = useState(false);

  // Load persistent data & subscribe to real-time multiplayer engine
  useEffect(() => {
    const refreshData = async () => {
      const scenariosList = await storageService.fetchScenarios();
      setScenarios(scenariosList);

      const remoteMP = await multiplayerEngine.fetchBackendSessions();
      const localSess = storageService.getSessions();
      
      const combinedMap = new Map();
      [...remoteMP, ...localSess].forEach(s => {
        const key = s.id || s.sessionCode;
        if (key) combinedMap.set(key, s);
      });
      setSessions(Array.from(combinedMap.values()));

      const aarsList = await storageService.fetchAARs();
      setAARS(aarsList);
    };

    refreshData();

    // Subscribe to multiplayer real-time broadcasts
    const unsubscribeMP = multiplayerEngine.subscribe((event) => {
      refreshData();
    });

    return () => {
      unsubscribeMP();
    };
  }, []);

  const handleStartScenario = (scenario) => {
    // Create new single-user session
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

  const handleMultiplayerSessionCreated = (mpSession) => {
    setSessions(multiplayerEngine.getSessions());
    setActiveTrainingSession(mpSession);
    setActiveScenario(mpSession.scenarioSnapshot || mpSession.scenario || scenarios[0]);
    setActiveView('training-room');
  };

  const handleJoinedSession = (joinedSession) => {
    setSessions(multiplayerEngine.getSessions());
    setActiveTrainingSession(joinedSession);
    const scen = joinedSession.scenarioSnapshot || joinedSession.scenario || scenarios.find(s => s.id === joinedSession.scenarioId) || scenarios[0];
    setActiveScenario(scen);
    setActiveView('training-room');
  };

  const handleSaveScenarioConfig = (newScenario) => {
    const updated = storageService.saveScenario(newScenario);
    setScenarios(updated);
    setActiveView('scenarios');
  };

  const handleSaveDecision = (sessionId, decisionData) => {
    storageService.addDecision(sessionId, decisionData);
  };

  const handleEndExercise = (session, decisions, durationMinutes, events = [], asymmetryMatrix = [], teamMessages = [], disruptionsLog = []) => {
    // Update session status
    if (session.sessionCode) {
      multiplayerEngine.endExercise(session.sessionCode);
    } else {
      storageService.updateSessionStatus(session.id, 'Completed');
    }
    
    setSessions(multiplayerEngine.getSessions());

    // Save AAR record
    const newAAR = storageService.saveAAR({
      sessionId: session.id,
      sessionCode: session.sessionCode || session.id,
      sessionName: session.name,
      scenarioTitle: session.scenarioTitle,
      creator: session.creator || currentUser?.serviceId,
      startTime: session.createdAt,
      endTime: new Date().toISOString(),
      durationMinutes,
      decisionsCount: decisions.length,
      decisions,
      events: events.length > 0 ? events : (activeScenario?.events || []),
      asymmetryMatrix: asymmetryMatrix.length > 0 ? asymmetryMatrix : [],
      teamMessages: teamMessages.length > 0 ? teamMessages : (session.teamMessages || []),
      disruptions: disruptionsLog.length > 0 ? disruptionsLog : (session.disruptionsLog || []),
      participants: session.participants || [{ displayName: currentUser?.serviceId, role: currentUser?.role }]
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
      case 'overview': return 'Training Overview & Multiplayer Hub';
      case 'scenarios': return 'Fictional Scenario Library';
      case 'scen-config': return 'Scenario Configuration Editor';
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
        hasActiveTraining={!!activeTrainingSession}
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
              currentUser={currentUser}
              activeTrainingSession={activeTrainingSession}
              onStartScenario={handleStartScenario}
              onNavigate={(view) => setActiveView(view)}
              onOpenCreateScenario={() => {
                setScenarioToEdit(null);
                setActiveView('scen-config');
              }}
              onOpenCreateMultiplayer={() => setIsCreateMultiplayerOpen(true)}
              onOpenJoinSession={() => setIsJoinSessionOpen(true)}
            />
          )}

          {activeView === 'scenarios' && (
            <ScenarioLibrary 
              scenarios={scenarios}
              searchQuery={searchQuery}
              onStartScenario={handleStartScenario}
              onOpenCreateModal={() => {
                setScenarioToEdit(null);
                setActiveView('scen-config');
              }}
              onEditScenario={(scen) => {
                setScenarioToEdit(scen);
                setActiveView('scen-config');
              }}
              onDuplicateScenario={(scenId) => {
                const updated = storageService.duplicateScenario(scenId);
                setScenarios(updated);
              }}
              onArchiveScenario={(scenId) => {
                const updated = storageService.archiveScenario(scenId);
                setScenarios(updated);
              }}
            />
          )}

          {activeView === 'scen-config' && (
            <ScenarioConfig 
              scenarioToEdit={scenarioToEdit}
              onSaveScenario={handleSaveScenarioConfig}
              onCancel={() => setActiveView('scenarios')}
              onStartExercise={handleStartScenario}
            />
          )}

          {activeView === 'sessions' && (
            <TrainingSessions 
              sessions={sessions}
              scenarios={scenarios}
              onStartNewSession={handleStartScenario}
              onOpenTrainingRoom={(sess) => {
                const scen = scenarios.find(s => s.id === sess.scenarioId) || sess.scenario || scenarios[0];
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
              existingDecisions={activeTrainingSession.decisions || storageService.getDecisionsForSession(activeTrainingSession.id)}
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

      {/* Multiplayer Modals */}
      <CreateMultiplayerModal 
        isOpen={isCreateMultiplayerOpen}
        onClose={() => setIsCreateMultiplayerOpen(false)}
        scenarios={scenarios}
        currentUser={currentUser}
        onSessionCreated={handleMultiplayerSessionCreated}
      />

      <JoinSessionModal 
        isOpen={isJoinSessionOpen}
        onClose={() => setIsJoinSessionOpen(false)}
        currentUser={currentUser}
        onJoinedSession={handleJoinedSession}
      />
    </div>
  );
};
