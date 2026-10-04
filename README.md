# OPERATIONAL FOG — Communication Resilience & Decision-Making Training Platform

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen.svg)](file:///c:/Users/Yamini/OPERATIONAL-FOG)
[![SIH Prototype](https://img.shields.io/badge/SIH%202026-Demonstration%20Ready-blue.svg)](file:///c:/Users/Yamini/OPERATIONAL-FOG)
[![Government Style Design](https://img.shields.io/badge/Aesthetic-Indian%20Government%20Portal-maroon.svg)](file:///c:/Users/Yamini/OPERATIONAL-FOG)

> **Official Prototype Disclaimer:** Independent training prototype for the Smart India Hackathon (SIH) / Defence Training Simulation. Not an official Government of India service. All scenarios, dispatches, and telemetry generated within this application are synthetic and intended strictly for educational and operational simulation training.

---

## 1. Project Purpose & Overview

**Operational Fog** is a specialized simulation framework developed to prepare commanders, signal officers, and strategic planners for decision-making under severe communication friction.

In modern crisis management and joint operations, radio, satellite, and telemetry links are frequently subject to physical obstacle masking, electromagnetic interference, dynamic latency, packet drops, and adversarial jamming. **Operational Fog** injects controlled message delays, unannounced dispatch blackouts, contradictory field reports, and truncated dispatches into structured training scenarios to evaluate human adaptability, verification discipline, and organizational resilience.

---

## 2. Technology Stack

- **Core Framework**: React 19 + Vite 8 (JavaScript ES Modules)
- **Icons & UI Vectors**: Lucide React Icons & Custom Inline SVG (Indian National Emblem Ashoka Capital & Tiranga Flag)
- **Styling & Design System**: Vanilla CSS Design System ([`src/index.css`](file:///c:/Users/Yamini/OPERATIONAL-FOG/src/index.css)) adhering to Indian Government Ministry Portal Guidelines (NIC / India.gov.in aesthetic)
- **Simulation Engine**: Custom Deterministic Scenario Event Engine ([`src/services/eventEngine.js`](file:///c:/Users/Yamini/OPERATIONAL-FOG/src/services/eventEngine.js))
- **Multiplayer Synchronization**: Real-Time Cross-Tab / Multi-Window Sync Engine via BroadcastChannel API & LocalStorage Event Listeners ([`src/services/multiplayerEngine.js`](file:///c:/Users/Yamini/OPERATIONAL-FOG/src/services/multiplayerEngine.js))
- **Data Persistence**: In-Browser & In-Memory Data Storage Layer ([`src/services/storageService.js`](file:///c:/Users/Yamini/OPERATIONAL-FOG/src/services/storageService.js))
- **PDF Export**: Zero-dependency Printable AAR Audit Report Exporter ([`src/services/pdfExporter.js`](file:///c:/Users/Yamini/OPERATIONAL-FOG/src/services/pdfExporter.js))
- **Testing & Quality Assurance**: Node.js Native Test Runner (`node:test` & `node:assert`) + Oxlint

---

## 3. How to Run the Application

### Prerequisites
- Node.js `v20.0.0` or higher (Tested on Node `v22.19.0`)
- npm `v10.0.0` or higher

### Environment Setup
No secret environment variables or API keys are required to run this prototype. All demo credentials and scenario templates operate locally.

### Development Server
```bash
# Install dependencies
npm install

# Start local development server
npm run dev
```
Open your browser and navigate to **`http://localhost:5173/`**.

### Production Build Verification
```bash
# Build production bundle
npm run build

# Preview production build locally
npm run preview
```

---

## 4. How to Run Automated Tests & Code Quality Checks

The repository includes a comprehensive 16-test automated unit test suite covering deterministic event delivery, latency applications, dropped dispatch exclusions, recipient role filtering, pause/resume integrity, multiplayer join codes, decision synchronization, storage CRUD persistence, and AAR record generation.

```bash
# Execute unit test suite
npm test

# Run linter checks
npm run lint

# Run production build check
npm run build
```

**Expected Test Output:**
```text
=== Operational Fog Test Suite Runner ===

--- Running Test Suite: src/services/eventEngine.test.js ---
✔ EventEngine - Initial State at T=0s
✔ EventEngine - Normal Message Delivery at T=5s
✔ EventEngine - Delayed Message Status at T=10s
✔ EventEngine - Dropped Message Handling at T=15s
✔ EventEngine - Recipient Role Targeting at T=20s
✔ EventEngine - Delayed Message Delivery Completion at T=25s
✔ EventEngine - Pause and Resume Integrity

--- Running Test Suite: src/services/multiplayerEngine.test.js ---
✔ MultiplayerEngine - Create Session & Generate Join Code
✔ MultiplayerEngine - Participant Join & Status Update
✔ MultiplayerEngine - Send Team Message
✔ MultiplayerEngine - Decision Submission Sync
✔ MultiplayerEngine - Start & End Exercise Transitions

--- Running Test Suite: src/services/storageService.test.js ---
✔ StorageService - Retrieve Default Scenarios
✔ StorageService - Create & Save Custom Scenario
✔ StorageService - Create Session & Add Decision
✔ StorageService - Save AAR & Update Instructor Note

✅ All test suites passed successfully.
```

---

## 5. SIH Demonstration Workflow

For an effective demonstration (e.g., during a Hackathon jury presentation):

1. **Public Landing Page**:
   - Open `http://localhost:5173/`. Observe the Indian Government Portal aesthetic, Ashoka emblem, utility bar clock, font scale adjusters, and High Contrast accessibility toggles.
2. **Sign In**:
   - Click **Sign In**. Select role (**Instructor** or **Participant**). Use pre-filled credentials and solve security math captcha (`8 + 4 = 12`).
3. **SIH Demo Scenario (`SCEN-SIH-2026`)**:
   - Navigate to **Scenario Library**. Select **SIH Demo Scenario — Joint Tactical Node Resilience**.
   - Click **Start Exercise**.
4. **Real-Time Training Room Execution**:
   - Observe the live timer (`T+ MM:SS`). Step through simulation dispatches.
   - Observe **Signal Attenuation Warning** (300s latency), **RF Blackout (Dropped Dispatch)**, **Conflicting Recon Feeds**, and **Truncated Supply Dispatches**.
   - Notice that dropped messages are excluded from the Participant Feed but recorded in the **Instructor Control Tab**.
   - Enter a decision and rationale in the **Decision Console** (e.g., *"Hold Position pending timestamp verification"*).
5. **Multiplayer Demonstration**:
   - Open a second browser window/tab to `http://localhost:5173/`.
   - Click **Create Multiplayer Session** from Tab 1 to generate a Join Code (e.g., `FOG-7429`).
   - From Tab 2, click **Join Session via Code**, enter `FOG-7429`, select role **Field Unit**, and join.
   - Observe real-time team messages appearing across both tabs!
6. **After-Action Review & PDF Report**:
   - Click **End Exercise**. The workspace automatically navigates to **After-Action Review (AAR)**.
   - Inspect the **Timeline Replay Player**, step through past timestamps, review information state at decision time, enter instructor notes, and click **Export Official PDF Report** to download the printable audit document.

---

## 6. Project Architecture & Directory Structure

```text
OPERATIONAL-FOG/
├── public/
│   ├── assets/
│   │   ├── hero_banner.jpg        # High-tech control room hero background
│   │   ├── exercise_1.jpg         # Training seminar photo
│   │   └── exercise_2.jpg         # Technical console photo
├── scripts/
│   └── run-tests.js               # Cross-platform automated test runner
├── src/
│   ├── components/
│   │   ├── EmblemAndFlag.jsx       # Indian National Emblem & Tiranga SVG vectors
│   │   ├── TopUtilityBar.jsx       # Accessibility bar, font size, contrast, clock
│   │   ├── GovernmentHeader.jsx   # Portal header with Satyameva Jayate motif
│   │   ├── Navbar.jsx             # Restrained terracotta navigation bar
│   │   ├── HeroBanner.jsx         # Hero section
│   │   ├── AboutPlatform.jsx      # Two-column platform story & overview panel
│   │   ├── TrainingModules.jsx    # 6-card rectangular module grid
│   │   ├── HowItWorks.jsx         # 4-step simulation methodology
│   │   ├── UpdatesAndResources.jsx# Portal news, SOP downloads, gallery
│   │   ├── UsefulLinks.jsx        # Quick access cards
│   │   ├── Footer.jsx             # Dark charcoal footer & disclaimers
│   │   ├── SignInModal.jsx        # Demo authentication form
│   │   ├── ModuleDetailModal.jsx  # Module specification sheet
│   │   ├── WhitepaperModal.jsx    # Technical whitepaper modal
│   │   └── dashboard/
│   │       ├── DashboardShell.jsx # Authenticated workspace shell
│   │       ├── Sidebar.jsx        # Dashboard navigation sidebar
│   │       ├── TopNav.jsx         # Search, alerts, user profile menu
│   │       ├── OverviewDashboard.jsx # Quick actions, metrics, activity table
│   │       ├── ScenarioLibrary.jsx# Fictional scenarios & search filters
│   │       ├── ScenarioConfig.jsx # Instructor scenario & event builder
│   │       ├── TrainingSessions.jsx# Session list & status management
│   │       ├── TrainingRoom.jsx   # Real-time simulation workspace
│   │       ├── TeamCoordinationPanel.jsx # Shared team chat & node status
│   │       ├── TimelineReplay.jsx # Chronological step-by-step player
│   │       ├── AfterActionReview.jsx # AAR reports, audit logs, instructor notes
│   │       ├── CreateMultiplayerModal.jsx # Session join code generator
│   │       ├── JoinSessionModal.jsx    # Session code join modal
│   │       └── SettingsView.jsx   # Display preferences & profile specs
│   ├── services/
│   │   ├── eventEngine.js         # Deterministic scenario event loop
│   │   ├── eventEngine.test.js    # Engine unit tests
│   │   ├── multiplayerEngine.js   # Real-time cross-tab sync layer
│   │   ├── multiplayerEngine.test.js # Multiplayer unit tests
│   │   ├── storageService.js      # LocalStorage & demo scenario persistence
│   │   ├── storageService.test.js # Storage & AAR unit tests
│   │   └── pdfExporter.js         # Printable AAR PDF generator
│   ├── App.jsx                    # Root application component
│   └── index.css                  # Government design system CSS
├── index.html                     # HTML5 SEO entrypoint
└── package.json                   # Dependencies & scripts
```

---

## 7. Prototype Status vs Future Enhancements

| Feature Area | Current Prototype Capability | Production Roadmap Enhancement |
| :--- | :--- | :--- |
| **Authentication** | Pre-filled demo roles & captcha validation | OAuth2 / SAML2 / Gov e-Pramaan SSO |
| **Multiplayer Sync** | Real-time cross-tab sync via `BroadcastChannel` & LocalStorage | Centralized WebSocket server (Node.js/FastAPI) |
| **Scenario Engine** | Deterministic scheduling, 5 delivery behaviors, role filtering | Dynamic AI red-teaming & adaptive signal propagation modeling |
| **Audit & Reporting** | Browser-generated printable AAR PDF reports | Encrypted immutable audit trail & analytics dashboard |

---

## 8. License & Attribution

Designed and developed for **Operational Fog** — Decision-Making under Uncertainty Simulator.
