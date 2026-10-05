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

// Session storage key used to survive page refresh for both instructor and participant.
const ACTIVE_SESSION_KEY = 'op_fog_active_session_code';

// Helper: fetch a single exercise by join code directly from the backend.
async function fetchExerciseByCode(code) {
  try {
    const apiBase = (
      typeof import.meta !== 'undefined' && import.meta.env?.VITE_BACKEND_URL
        ? import.meta.env.VITE_BACKEND_URL
        : 'http://localhost:4000'
    ) + '/api';
    const res = await fetch(`${apiBase}/exercises/lookup/${encodeURIComponent(code.toUpperCase())}`);
    if (res.ok) return await res.json();
  } catch (e) {
    // Backend unreachable — silently fail, no recovery possible
  }
  return null;
}

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

      // AARs — always prefer backend; fall back to localStorage only if backend is unreachable
      const apiBase = (
        typeof import.meta !== 'undefined' && import.meta.env?.VITE_BACKEND_URL
          ? import.meta.env.VITE_BACKEND_URL
          : 'http://localhost:4000'
      ) + '/api';
      try {
        const aarRes = await fetch(`${apiBase}/aars`);
        if (aarRes.ok) {
          const backendAARs = await aarRes.json();
          setAARS(backendAARs);
        } else {
          setAARS(storageService.getAARs());
        }
      } catch (_) {
        setAARS(storageService.getAARs());
      }

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

  // Attempt to restore an active training session after a page refresh.
  // Both instructor and participant persist their active session code to sessionStorage.
  useEffect(() => {
    const persistedCode = sessionStorage.getItem(ACTIVE_SESSION_KEY);
    if (!persistedCode || activeTrainingSession) return;

    fetchExerciseByCode(persistedCode).then((restoredSession) => {
      if (!restoredSession) return;
      // Only restore sessions that are still active/joinable
      const activeStatuses = ['Waiting', 'Ready', 'In Progress', 'Active'];
      if (!activeStatuses.includes(restoredSession.status)) {
        sessionStorage.removeItem(ACTIVE_SESSION_KEY);
        return;
      }
      // Restore the scenario from the snapshot embedded in the exercise
      const restoredScenario = restoredSession.scenarioSnapshot || restoredSession.scenario || null;
      setActiveTrainingSession(restoredSession);
      setActiveScenario(restoredScenario);
      setActiveView('training-room');
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // runs once on mount

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
    // Persist so the instructor can restore their session after a page refresh
    if (mpSession?.sessionCode) {
      sessionStorage.setItem(ACTIVE_SESSION_KEY, mpSession.sessionCode);
    }
    setSessions(multiplayerEngine.getSessions());
    setActiveTrainingSession(mpSession);
    setActiveScenario(mpSession.scenarioSnapshot || mpSession.scenario || scenarios[0]);
    setActiveView('training-room');
  };

  const handleJoinedSession = (joinedSession) => {
    // Persist the join code so a page refresh can restore this participant's session
    // by re-fetching from the backend (not from localStorage).
    if (joinedSession?.sessionCode) {
      sessionStorage.setItem(ACTIVE_SESSION_KEY, joinedSession.sessionCode);
    }
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

  const handleEndExercise = async (session, decisions, durationMinutes, events = []) => {
    // Clear the persisted active session on exercise completion
    sessionStorage.removeItem(ACTIVE_SESSION_KEY);

    // Update session status in multiplayer mesh
    if (session.sessionCode) {
      multiplayerEngine.endExercise(session.sessionCode);
    } else {
      storageService.updateSessionStatus(session.id, 'Completed');
    }
    setSessions(multiplayerEngine.getSessions());

    const apiBase = (
      typeof import.meta !== 'undefined' && import.meta.env?.VITE_BACKEND_URL
        ? import.meta.env.VITE_BACKEND_URL
        : 'http://localhost:4000'
    ) + '/api';

    // Primary path: call the authoritative AAR generation endpoint.
    // GET /api/aars/exercise/:exerciseId reads participant_decisions +
    // communication_events from PostgreSQL and upserts a complete AAR record.
    let liveAAR = null;
    if (session.id) {
      try {
        const aarRes = await fetch(`${apiBase}/aars/exercise/${session.id}`);
        if (aarRes.ok) {
          liveAAR = await aarRes.json();
        }
      } catch (e) { /* backend unreachable */ }
    }

    if (liveAAR) {
      // Backend returned an authoritative AAR — cache it locally so the AAR panel
      // loads instantly even if the backend is slow on the next visit.
      const existing = storageService.getAARs();
      const withoutStale = existing.filter(a => a.id !== liveAAR.id && a.exerciseId !== session.id);
      const cached = [liveAAR, ...withoutStale];
      try { localStorage.setItem('op_fog_aars_v1', JSON.stringify(cached)); } catch (_) {}
      setAARS(cached);
    } else {
      // Fallback: build AAR from in-memory data when backend is unreachable
      storageService.saveAAR({
        sessionId: session.id,
        exerciseId: session.id,
        sessionCode: session.sessionCode || session.id,
        sessionName: session.name,
        scenarioTitle: session.scenarioTitle,
        creator: session.creator || currentUser?.serviceId,
        startTime: session.createdAt,
        endTime: new Date().toISOString(),
        durationMinutes,
        decisionsCount: decisions.length,
        decisions,
        events,
        participants: session.participants || [{ displayName: currentUser?.serviceId, role: currentUser?.role }]
      });
      setAARS(storageService.getAARs());
    }

    setActiveTrainingSession(null);
    setActiveScenario(null);
    setActiveView('aar');
  };



  const handleSaveInstructorNote = async (aarId, noteText) => {
    // Persist to PostgreSQL first — backend is authoritative for instructor notes
    const apiBase = (
      typeof import.meta !== 'undefined' && import.meta.env?.VITE_BACKEND_URL
        ? import.meta.env.VITE_BACKEND_URL
        : 'http://localhost:4000'
    ) + '/api';
    try {
      await fetch(`${apiBase}/aars/${aarId}/note`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ noteText })
      });
    } catch (_) {}
    // Update localStorage cache so the note appears immediately without a round-trip
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
              existingDecisions={activeTrainingSession.decisions || []}
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
