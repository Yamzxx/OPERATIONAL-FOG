import React, { useState, useMemo, useCallback } from 'react';
import {
  Search, Clock, Users, RefreshCw, Radio, ShieldCheck, GitBranch,
  ChevronRight, ChevronDown, AlertTriangle, CheckCircle, Info,
  BarChart2, Layers, FlaskConical
} from 'lucide-react';
import { ROLE_LABELS } from '../../services/eventEngine';
import {
  buildTimeCapsule,
  buildPerspectiveMatrix,
  computeRecoveryScore,
  runWhatIfAnalysis,
  ROLE_COLORS,
  DELIVERY_BADGE,
  FORENSICS_ROLES
} from '../../services/forensicsEngine';

// ─── Design tokens (match existing app) ──────────────────────────────────────
const C = {
  navy: '#0F2C59',
  sidebar: '#0F172A',
  gold: '#FBBF24',
  bg: '#F4F6F8',
  card: '#FFFFFF',
  border: '#CBD5E1',
  text: '#1A1E24',
  muted: '#64748B',
  subtle: '#94A3B8'
};

const PANEL = {
  backgroundColor: C.card,
  border: '1px solid ' + C.border,
  borderRadius: '2px',
  padding: '16px'
};

// ─── Shared helpers ───────────────────────────────────────────────────────────

function formatTime(sec) {
  if (typeof sec !== 'number') return '--:--';
  const m = String(Math.floor(sec / 60)).padStart(2, '0');
  const s = String(Math.floor(sec % 60)).padStart(2, '0');
  return m + ':' + s;
}

function SectionHeader({ icon: Icon, title, subtitle }) {
  return (
    <div style={{ marginBottom: '14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
        {Icon && <Icon size={15} style={{ color: C.navy }} />}
        <h2 style={{ fontFamily: 'var(--font-family-serif)', fontSize: '16px', fontWeight: '800', color: C.navy, margin: 0 }}>{title}</h2>
      </div>
      {subtitle && <p style={{ fontSize: '12px', color: C.muted, margin: 0, marginLeft: '23px' }}>{subtitle}</p>}
    </div>
  );
}

function DeliveryBadge({ behavior }) {
  const b = DELIVERY_BADGE[behavior] || DELIVERY_BADGE.normal;
  return (
    <span style={{ fontSize: '9px', fontWeight: '700', padding: '2px 6px', borderRadius: '2px', border: '1px solid ' + b.border, background: b.bg, color: b.color, letterSpacing: '0.3px' }}>
      {b.label.toUpperCase()}
    </span>
  );
}

function RolePill({ role }) {
  const color = ROLE_COLORS[role] || '#64748B';
  return (
    <span style={{ fontSize: '9px', fontWeight: '700', padding: '2px 7px', borderRadius: '2px', background: color + '18', color, border: '1px solid ' + color + '44', letterSpacing: '0.3px' }}>
      {(ROLE_LABELS[role] || role).toUpperCase()}
    </span>
  );
}

function EmptyState({ icon: Icon, title, body }) {
  return (
    <div style={{ textAlign: 'center', padding: '56px 24px', color: C.muted }}>
      {Icon && <Icon size={40} style={{ color: '#E2E8F0', marginBottom: '12px' }} />}
      <div style={{ fontSize: '14px', fontWeight: '700', color: C.muted, marginBottom: '6px' }}>{title}</div>
      <div style={{ fontSize: '12px', color: C.subtle, maxWidth: '340px', margin: '0 auto', lineHeight: '1.6' }}>{body}</div>
    </div>
  );
}

function InfoNote({ text }) {
  return (
    <div style={{ display: 'flex', gap: '8px', padding: '9px 12px', background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '2px', fontSize: '11px', color: '#1D4ED8', lineHeight: '1.5' }}>
      <Info size={13} style={{ flexShrink: 0, marginTop: '1px' }} />
      <span>{text}</span>
    </div>
  );
}

// ─── Session Selector ─────────────────────────────────────────────────────────

function SessionSelector({ aars, selectedAARId, onSelect }) {
  const [search, setSearch] = useState('');
  const filtered = aars.filter(a => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (a.sessionName + ' ' + a.scenarioTitle + ' ' + (a.sessionCode || '')).toLowerCase().includes(q);
  });

  return (
    <div style={{ ...PANEL, padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <div style={{ fontSize: '11px', fontWeight: '800', color: C.navy, borderBottom: '1px solid #E2E8F0', paddingBottom: '8px' }}>
        COMPLETED SESSIONS ({aars.length})
      </div>
      <div style={{ position: 'relative' }}>
        <Search size={12} style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: C.subtle }} />
        <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." style={{ width: '100%', fontSize: '12px', padding: '6px 8px 6px 26px', border: '1px solid ' + C.border, borderRadius: '2px', fontFamily: 'var(--font-family-sans)', outline: 'none' }} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: 'calc(100vh - 300px)', overflowY: 'auto' }}>
        {filtered.length === 0
          ? <div style={{ fontSize: '12px', color: C.muted, padding: '16px', textAlign: 'center' }}>No sessions found.</div>
          : filtered.map(aar => {
            const isSelected = aar.id === selectedAARId;
            return (
              <div key={aar.id} onClick={() => onSelect(aar.id)} style={{ padding: '10px 12px', cursor: 'pointer', borderRadius: '2px', border: '1px solid ' + (isSelected ? C.navy : '#E2E8F0'), background: isSelected ? '#EFF6FF' : '#F8FAFC', borderLeft: '4px solid ' + (isSelected ? C.navy : 'transparent') }}>
                <div style={{ fontSize: '12px', fontWeight: '700', color: C.navy, marginBottom: '2px' }}>{aar.sessionName}</div>
                <div style={{ fontSize: '11px', color: C.muted }}>{aar.scenarioTitle}</div>
                <div style={{ fontSize: '10px', color: C.subtle, marginTop: '4px', display: 'flex', gap: '8px' }}>
                  <span>{(aar.decisions || []).length} decisions</span>
                  <span>{(aar.events || []).length} events</span>
                  {aar.sessionCode && <span style={{ fontFamily: 'var(--font-family-mono)' }}>{aar.sessionCode}</span>}
                </div>
              </div>
            );
          })
        }
      </div>
    </div>
  );
}

// ─── A. DECISION TIME CAPSULE ─────────────────────────────────────────────────

function TimeCapsuleView({ aar }) {
  const decisions = aar ? (aar.decisions || []) : [];
  const [selectedDecisionId, setSelectedDecisionId] = useState(decisions[0]?.id || null);
  const [viewMode, setViewMode] = useState('then');

  const capsule = useMemo(() => {
    if (!aar || !selectedDecisionId) return null;
    return buildTimeCapsule(aar, selectedDecisionId);
  }, [aar, selectedDecisionId]);

  if (!aar) return <EmptyState icon={Clock} title="No Session Selected" body="Select a completed training session from the left panel to begin forensic investigation." />;
  if (decisions.length === 0) return <EmptyState icon={Clock} title="No Decisions Recorded" body="This session has no recorded decisions. Submit decisions during a training exercise to enable Time Capsule analysis." />;

  const eventsShown = viewMode === 'then'
    ? (capsule?.eventsBeforeDecision || [])
    : [...(capsule?.eventsBeforeDecision || []), ...(capsule?.eventsArrivedAfter || [])];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <SectionHeader icon={Clock} title="Decision Time Capsule" subtitle="Select a decision to reconstruct exactly what information was available at that moment." />

      {/* Decision selector */}
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
        {decisions.map(d => {
          const isSelected = d.id === selectedDecisionId;
          return (
            <button key={d.id} onClick={() => setSelectedDecisionId(d.id)} style={{ padding: '6px 12px', fontSize: '11px', fontWeight: '700', borderRadius: '2px', cursor: 'pointer', border: '1px solid ' + (isSelected ? C.navy : C.border), background: isSelected ? C.navy : '#F8FAFC', color: isSelected ? '#FFF' : C.text }}>
              {d.elapsedTimeFormatted || d.elapsedMinutes + ':00'} — {d.title}
            </button>
          );
        })}
      </div>

      {capsule && (
        <>
          {/* Stats row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
            {[
              { label: 'Decision At', value: capsule.decisionTimeFormatted, sub: 'Elapsed exercise time' },
              { label: 'Role', value: capsule.roleLabel, sub: 'Decision-maker' },
              { label: 'Information Available', value: capsule.informationAvailabilityPct + '%', sub: capsule.eventsBeforeDecision.length + ' of ' + capsule.totalEvents + ' events' },
              { label: 'Events Missing', value: capsule.eventsDroppedOrMissing.length, sub: 'Dropped or not delivered' }
            ].map(stat => (
              <div key={stat.label} style={{ ...PANEL, padding: '12px 14px' }}>
                <div style={{ fontSize: '10px', color: C.muted, marginBottom: '2px' }}>{stat.label}</div>
                <div style={{ fontSize: '20px', fontWeight: '800', color: C.navy, fontFamily: 'var(--font-family-serif)' }}>{stat.value}</div>
                <div style={{ fontSize: '10px', color: C.subtle, marginTop: '2px' }}>{stat.sub}</div>
              </div>
            ))}
          </div>

          {/* View mode toggle */}
          <div style={{ display: 'flex', border: '1px solid ' + C.border, borderRadius: '2px', overflow: 'hidden', alignSelf: 'flex-start' }}>
            {[
              { id: 'then', label: 'WHAT THEY KNEW THEN', bg: C.navy },
              { id: 'later', label: 'WHAT WE DISCOVERED LATER', bg: '#92400E' }
            ].map(opt => (
              <button key={opt.id} onClick={() => setViewMode(opt.id)} style={{ padding: '7px 14px', fontSize: '11px', fontWeight: '700', cursor: 'pointer', border: 'none', background: viewMode === opt.id ? opt.bg : '#F8FAFC', color: viewMode === opt.id ? '#FFF' : C.muted }}>
                {opt.label}
              </button>
            ))}
          </div>

          {viewMode === 'later' && (
            <div style={{ display: 'flex', gap: '8px', padding: '9px 12px', background: '#FEF3C7', border: '1px solid #FCD34D', borderRadius: '2px', fontSize: '11px', color: '#92400E' }}>
              <AlertTriangle size={13} style={{ flexShrink: 0, marginTop: '1px' }} />
              <span><strong>Hindsight view:</strong> Events marked below arrived <em>after</em> the decision. This information was not available to the decision-maker at the time.</span>
            </div>
          )}

          {/* Decision card */}
          <div style={{ ...PANEL, border: '2px solid ' + C.navy, background: '#EFF6FF' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '9px', color: C.muted, fontWeight: '700', letterSpacing: '0.5px', marginBottom: '4px' }}>DECISION RECORDED AT {capsule.decisionTimeFormatted}</div>
                <div style={{ fontSize: '15px', fontWeight: '800', color: C.navy, marginBottom: '6px' }}>{capsule.decision.title}</div>
                <div style={{ fontSize: '12px', color: C.text, lineHeight: '1.6' }}><strong>Rationale:</strong> {capsule.decision.rationale || 'No rationale recorded.'}</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'flex-end' }}>
                <RolePill role={capsule.role} />
                <span style={{ fontSize: '11px', color: C.muted }}>Confidence: <strong>{capsule.decision.confidence || '—'}</strong></span>
              </div>
            </div>
            {capsule.sourcesUsed.length > 0 && (
              <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #BFDBFE' }}>
                <div style={{ fontSize: '9px', fontWeight: '700', color: C.muted, letterSpacing: '0.5px', marginBottom: '4px' }}>EVIDENCE CITED:</div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {capsule.sourcesUsed.map(id => {
                    const ev = (aar.events || []).find(e => e.id === id);
                    const isAvail = capsule.citedAndAvailable.includes(id);
                    return (
                      <span key={id} style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '2px', background: isAvail ? '#DCFCE7' : '#FEE2E2', color: isAvail ? '#15803D' : '#991B1B', border: '1px solid ' + (isAvail ? '#86EFAC' : '#FCA5A5') }}>
                        {ev ? ev.title : id}{!isAvail ? ' ⚠ not yet received' : ''}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Timeline */}
          <div style={{ fontSize: '10px', fontWeight: '700', color: C.muted, letterSpacing: '0.5px' }}>
            {viewMode === 'then' ? 'INFORMATION AVAILABLE AT ' + capsule.decisionTimeFormatted : 'FULL EXERCISE TIMELINE (HINDSIGHT)'}
          </div>

          {eventsShown.length === 0 ? (
            <InfoNote text="No events were delivered to this role before the decision was made." />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {eventsShown.map((ev, idx) => {
                const isAfter = viewMode === 'later' && !ev._wasAvailable;
                const badge = DELIVERY_BADGE[ev._deliveryStatus] || DELIVERY_BADGE.normal;
                return (
                  <div key={ev.id + idx} style={{ ...PANEL, padding: '12px 14px', borderLeft: '4px solid ' + (isAfter ? '#D97706' : badge.color) }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px', gap: '8px', flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontFamily: 'var(--font-family-mono)', fontSize: '10px', color: C.muted, fontWeight: '700' }}>{formatTime(ev._deliveredAt)}</span>
                        <span style={{ fontSize: '12px', fontWeight: '700', color: C.navy }}>{ev.title}</span>
                        {isAfter && <span style={{ fontSize: '9px', fontWeight: '700', background: '#FEF3C7', color: '#92400E', padding: '1px 5px', border: '1px solid #FCD34D', borderRadius: '2px' }}>ARRIVED AFTER DECISION</span>}
                      </div>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <DeliveryBadge behavior={ev._deliveryStatus} />
                        {ev.domain && <span style={{ fontSize: '9px', fontWeight: '700', color: C.subtle, padding: '1px 5px', border: '1px solid #E2E8F0', borderRadius: '2px' }}>{ev.domain}</span>}
                      </div>
                    </div>
                    <div style={{ fontSize: '12px', color: C.text, lineHeight: '1.5' }}>{ev._roleContent || ev.content}</div>
                    {ev._roleConfidence && <div style={{ marginTop: '4px', fontSize: '10px', color: C.muted }}>Confidence: {ev._roleConfidence}</div>}
                  </div>
                );
              })}
            </div>
          )}

          {/* Dropped events */}
          {capsule.eventsDroppedOrMissing.length > 0 && (
            <div>
              <div style={{ fontSize: '10px', fontWeight: '700', color: '#991B1B', letterSpacing: '0.5px', marginBottom: '6px' }}>
                NOT RECEIVED BY {capsule.roleLabel.toUpperCase()} — {capsule.eventsDroppedOrMissing.length} EVENT(S)
              </div>
              {capsule.eventsDroppedOrMissing.map((ev, idx) => (
                <div key={ev.id + idx} style={{ ...PANEL, padding: '10px 14px', borderLeft: '4px solid #DC2626', background: '#FEF2F2', marginBottom: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                    <span style={{ fontSize: '12px', fontWeight: '700', color: '#991B1B' }}>{ev.title}</span>
                    <DeliveryBadge behavior="dropped" />
                  </div>
                  <div style={{ fontSize: '11px', color: '#B91C1C', marginTop: '4px' }}>Reason: {ev._reason || 'Communication failure'}</div>
                  <div style={{ fontSize: '11px', color: '#DC2626', marginTop: '4px', fontStyle: 'italic' }}>Ground truth content: {ev.content}</div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── B. PERSPECTIVE SWITCH ────────────────────────────────────────────────────

function PerspectiveSwitchView({ aar }) {
  const [selectedEventIdx, setSelectedEventIdx] = useState(0);
  const [expandedRole, setExpandedRole] = useState(null);
  const data = useMemo(() => buildPerspectiveMatrix(aar), [aar]);

  if (!aar) return <EmptyState icon={Users} title="No Session Selected" body="Select a completed training session to compare perspectives across roles." />;
  if (!data || data.events.length === 0) return <EmptyState icon={Users} title="No Event Data" body="This session has no recorded events to compare across perspectives." />;

  const { matrix, activeRoles } = data;
  const row = matrix[selectedEventIdx];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <SectionHeader icon={Users} title="Perspective Switch" subtitle="Select an event to see what each participant received — and what they did not." />

      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '16px', alignItems: 'start' }}>
        {/* Event List */}
        <div style={{ ...PANEL, padding: '0', overflow: 'hidden' }}>
          <div style={{ padding: '10px 12px', background: C.navy, color: '#FFF', fontSize: '10px', fontWeight: '700', letterSpacing: '0.5px' }}>
            SCENARIO EVENTS ({matrix.length})
          </div>
          <div style={{ overflowY: 'auto', maxHeight: '500px' }}>
            {matrix.map((r, idx) => (
              <div key={idx} onClick={() => setSelectedEventIdx(idx)}
                style={{ padding: '9px 12px', cursor: 'pointer', borderBottom: '1px solid #F1F5F9', background: selectedEventIdx === idx ? '#EFF6FF' : '#FFF', borderLeft: '4px solid ' + (selectedEventIdx === idx ? C.navy : (r.hasContradiction ? '#C2410C' : (r.timingGapSec > 30 ? '#B45309' : 'transparent'))) }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '4px' }}>
                  <div>
                    <span style={{ fontFamily: 'var(--font-family-mono)', fontSize: '9px', color: C.subtle }}>{r.scheduledAtFormatted}</span>
                    <div style={{ fontSize: '11px', fontWeight: '700', color: C.navy, marginTop: '2px' }}>{r.event.title}</div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'flex-end', flexShrink: 0 }}>
                    {r.hasContradiction && <span style={{ fontSize: '8px', fontWeight: '700', background: '#FFEDD5', color: '#C2410C', padding: '1px 4px', border: '1px solid #FDBA74', borderRadius: '2px' }}>CONFLICT</span>}
                    {r.timingGapSec > 30 && <span style={{ fontSize: '8px', fontWeight: '700', background: '#FEF3C7', color: '#B45309', padding: '1px 4px', border: '1px solid #FCD34D', borderRadius: '2px' }}>GAP</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Role comparison */}
        {row && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Ground truth bar */}
            <div style={{ ...PANEL, border: '1px solid ' + C.navy, background: '#EFF6FF' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', flexWrap: 'wrap' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '9px', color: C.muted, fontWeight: '700', letterSpacing: '0.5px' }}>INSTRUCTOR GROUND TRUTH — SCHEDULED AT {row.scheduledAtFormatted}</div>
                  <div style={{ fontSize: '14px', fontWeight: '800', color: C.navy, margin: '4px 0' }}>{row.event.title}</div>
                  <div style={{ fontSize: '12px', color: C.text }}>{row.event.content}</div>
                </div>
                <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                  {row.hasContradiction && <div style={{ padding: '5px 8px', background: '#FFEDD5', border: '1px solid #FDBA74', borderRadius: '2px', fontSize: '9px', color: '#C2410C', fontWeight: '700' }}>⚡ INFORMATION CONFLICT</div>}
                  {row.timingGapSec > 0 && <div style={{ padding: '5px 8px', background: '#FEF3C7', border: '1px solid #FCD34D', borderRadius: '2px', fontSize: '9px', color: '#B45309', fontWeight: '700' }}>⏱ {formatTime(row.timingGapSec)} GAP</div>}
                </div>
              </div>
            </div>

            {/* Role cards grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '8px' }}>
              {activeRoles.map(role => {
                const d = row.roleDeliveries[role];
                if (!d) return null;
                const color = ROLE_COLORS[role] || '#64748B';
                const badge = DELIVERY_BADGE[d.behavior] || DELIVERY_BADGE.normal;
                const isExp = expandedRole === role;
                const content = d.content || '';
                return (
                  <div key={role} style={{ ...PANEL, padding: '0', overflow: 'hidden', border: '1px solid ' + color + '44' }}>
                    <div style={{ padding: '8px 10px', background: color + '12', borderBottom: '1px solid ' + color + '22', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }} onClick={() => setExpandedRole(isExp ? null : role)}>
                      <div>
                        <div style={{ fontSize: '10px', fontWeight: '800', color }}>{ROLE_LABELS[role] || role}</div>
                        <div style={{ fontSize: '9px', color: C.muted, marginTop: '1px' }}>
                          {d.behavior === 'dropped' ? 'Not delivered' : 'At ' + d.deliveredAtFormatted}
                          {d.delaySeconds > 0 ? ' (+' + d.delaySeconds + 's)' : ''}
                        </div>
                      </div>
                      <span style={{ fontSize: '8px', fontWeight: '700', padding: '2px 5px', borderRadius: '2px', border: '1px solid ' + badge.border, background: badge.bg, color: badge.color, flexShrink: 0 }}>{badge.label.toUpperCase()}</span>
                    </div>
                    <div style={{ padding: '9px 10px' }}>
                      {d.behavior === 'dropped'
                        ? <div style={{ fontSize: '11px', color: '#991B1B', fontStyle: 'italic' }}>{d.reason || 'Not delivered to this role.'}</div>
                        : <div style={{ fontSize: '11px', color: C.text, lineHeight: '1.5' }}>{isExp ? content : (content.slice(0, 80) + (content.length > 80 ? '…' : ''))}</div>
                      }
                      {d.confidence && d.behavior !== 'dropped' && <div style={{ marginTop: '4px', fontSize: '10px', color: C.subtle }}>Confidence: {d.confidence}</div>}
                      {content.length > 80 && d.behavior !== 'dropped' && (
                        <button onClick={() => setExpandedRole(isExp ? null : role)} style={{ marginTop: '4px', fontSize: '10px', color: C.navy, background: 'none', border: 'none', cursor: 'pointer', padding: '0', fontWeight: '700' }}>
                          {isExp ? 'Show less' : 'Show full'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {row.timingGapSec > 0 && (
              <InfoNote text={'Timing gap of ' + formatTime(row.timingGapSec) + ' between earliest and latest delivery. Participants making decisions during this window had different information states.'} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── C. RECOVERY SCORE ────────────────────────────────────────────────────────

function RecoveryScoreView({ aar }) {
  const [expandedCat, setExpandedCat] = useState(null);
  const score = useMemo(() => computeRecoveryScore(aar), [aar]);

  if (!aar) return <EmptyState icon={BarChart2} title="No Session Selected" body="Select a completed training session to compute the Recovery Score." />;
  if (!score) return <EmptyState icon={BarChart2} title="Score Could Not Be Computed" body="Insufficient session data." />;

  const ICON_MAP = { 'shield-check': ShieldCheck, 'refresh-cw': RefreshCw, 'radio': Radio, 'users': Users, 'git-branch': GitBranch };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <SectionHeader icon={BarChart2} title="Recovery Score" subtitle="Transparent evaluation of how the team responded after communication disruptions." />

      {/* Score hero */}
      <div style={{ ...PANEL, background: '#0F172A', border: 'none', display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap', padding: '20px 24px' }}>
        <div style={{ textAlign: 'center', minWidth: '80px' }}>
          <div style={{ fontSize: '56px', fontWeight: '900', color: score.gradeColor, fontFamily: 'var(--font-family-serif)', lineHeight: '1' }}>{score.grade}</div>
          <div style={{ fontSize: '10px', color: '#94A3B8', fontWeight: '700', marginTop: '4px' }}>{score.gradeLabel.toUpperCase()}</div>
        </div>
        <div style={{ flex: 1, minWidth: '200px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginBottom: '8px' }}>
            <span style={{ fontSize: '36px', fontWeight: '900', color: '#FFF', fontFamily: 'var(--font-family-serif)' }}>{score.total}</span>
            <span style={{ fontSize: '16px', color: '#64748B' }}>/ {score.maxTotal}</span>
          </div>
          <div style={{ height: '8px', background: '#1E293B', borderRadius: '2px', marginBottom: '10px', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: score.percentPct + '%', background: score.gradeColor, borderRadius: '2px', transition: 'width 0.5s ease' }} />
          </div>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            {score.categories.map(c => (
              <div key={c.id} style={{ fontSize: '10px', color: '#94A3B8' }}>
                <span style={{ fontWeight: '700', color: '#FFF' }}>{c.score}</span>/{c.max} {c.label}
              </div>
            ))}
          </div>
        </div>
      </div>

      <InfoNote text={score.dataNote} />

      {/* Category breakdown */}
      {score.categories.map(cat => {
        const Icon = ICON_MAP[cat.icon] || BarChart2;
        const pct = Math.round((cat.score / cat.max) * 100);
        const barColor = pct >= 80 ? '#15803D' : pct >= 60 ? '#0369A1' : pct >= 40 ? '#D97706' : '#DC2626';
        const isExp = expandedCat === cat.id;
        const hasInsuff = cat.evidence.some(e => e.includes('cannot be assessed') || e.includes('cannot be fully'));
        return (
          <div key={cat.id} style={{ ...PANEL, padding: '0', overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px' }} onClick={() => setExpandedCat(isExp ? null : cat.id)}>
              <Icon size={15} style={{ color: barColor, flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '13px', fontWeight: '700', color: C.navy }}>{cat.label}</span>
                    {hasInsuff && <span style={{ fontSize: '8px', fontWeight: '700', color: '#B45309', background: '#FEF3C7', padding: '1px 5px', border: '1px solid #FCD34D', borderRadius: '2px' }}>INSUFFICIENT DATA</span>}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '14px', fontWeight: '800', color: barColor }}>{cat.score}<span style={{ fontSize: '10px', color: C.subtle, fontWeight: '400' }}>/{cat.max}</span></span>
                    {isExp ? <ChevronDown size={13} style={{ color: C.muted }} /> : <ChevronRight size={13} style={{ color: C.muted }} />}
                  </div>
                </div>
                <div style={{ height: '6px', background: '#F1F5F9', borderRadius: '2px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: pct + '%', background: barColor, borderRadius: '2px' }} />
                </div>
              </div>
            </div>
            {isExp && (
              <div style={{ padding: '0 16px 12px', borderTop: '1px solid #F1F5F9' }}>
                <div style={{ padding: '8px 0 6px', fontSize: '12px', color: C.muted }}>{cat.description}</div>
                {cat.evidence.map((e, i) => (
                  <div key={i} style={{ display: 'flex', gap: '6px', alignItems: 'flex-start', padding: '3px 0', fontSize: '12px', color: C.text }}>
                    <span style={{ color: barColor, flexShrink: 0 }}>▸</span>
                    <span>{e}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── D. WHAT-IF LAB ───────────────────────────────────────────────────────────

function WhatIfLabView({ aar }) {
  const decisions = aar ? (aar.decisions || []) : [];
  const [selectedDecisionId, setSelectedDecisionId] = useState(decisions[0]?.id || null);
  const [altText, setAltText] = useState('');
  const [result, setResult] = useState(null);
  const [running, setRunning] = useState(false);

  const handleRun = useCallback(() => {
    if (!aar || !selectedDecisionId || !altText.trim()) return;
    setRunning(true);
    setTimeout(() => {
      setResult(runWhatIfAnalysis(aar, selectedDecisionId, altText.trim()));
      setRunning(false);
    }, 500);
  }, [aar, selectedDecisionId, altText]);

  if (!aar) return <EmptyState icon={FlaskConical} title="No Session Selected" body="Select a completed training session to explore alternative decisions." />;
  if (decisions.length === 0) return <EmptyState icon={FlaskConical} title="No Decisions to Analyze" body="This session has no recorded decisions. Decisions submitted during a training exercise are required to use the What-If Lab." />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <SectionHeader icon={FlaskConical} title="What-If Lab" subtitle="Explore alternative decisions safely. The original session record is never modified." />

      <div style={{ display: 'flex', gap: '8px', padding: '9px 12px', background: '#F0FDF4', border: '1px solid #86EFAC', borderRadius: '2px', fontSize: '11px', color: '#15803D' }}>
        <CheckCircle size={13} style={{ flexShrink: 0, marginTop: '1px' }} />
        <span><strong>Safe sandbox:</strong> What-If analyses are isolated hypothetical projections. Original session data is read-only and is never overwritten.</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', alignItems: 'start' }}>
        {/* Input panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ ...PANEL }}>
            <div style={{ fontSize: '10px', fontWeight: '700', color: C.muted, letterSpacing: '0.5px', marginBottom: '10px' }}>1. SELECT DECISION POINT</div>
            {decisions.map(d => {
              const isSel = d.id === selectedDecisionId;
              return (
                <div key={d.id} onClick={() => { setSelectedDecisionId(d.id); setResult(null); }}
                  style={{ padding: '9px 12px', marginBottom: '6px', cursor: 'pointer', border: '1px solid ' + (isSel ? C.navy : C.border), borderLeft: '4px solid ' + (isSel ? C.navy : 'transparent'), borderRadius: '2px', background: isSel ? '#EFF6FF' : '#FAFAFA' }}>
                  <div style={{ fontSize: '12px', fontWeight: '700', color: C.navy }}>{d.title}</div>
                  <div style={{ fontSize: '10px', color: C.muted, marginTop: '2px' }}>At {d.elapsedTimeFormatted || (d.elapsedMinutes + ':00')} · {ROLE_LABELS[d.submittedRole] || d.submittedRole || 'Participant'}</div>
                </div>
              );
            })}
          </div>

          <div style={{ ...PANEL }}>
            <div style={{ fontSize: '10px', fontWeight: '700', color: C.muted, letterSpacing: '0.5px', marginBottom: '8px' }}>2. DESCRIBE THE ALTERNATIVE RESPONSE</div>
            <textarea value={altText} onChange={e => { setAltText(e.target.value); setResult(null); }}
              placeholder={'e.g. "Advance Convoy Bravo immediately along Route Alpha"'}
              style={{ width: '100%', minHeight: '90px', padding: '9px', fontSize: '12px', border: '1px solid ' + C.border, borderRadius: '2px', fontFamily: 'var(--font-family-sans)', resize: 'vertical', lineHeight: '1.5', outline: 'none', boxSizing: 'border-box' }} />
            <button onClick={handleRun} disabled={running || !altText.trim()}
              style={{ marginTop: '10px', width: '100%', padding: '10px', background: altText.trim() ? C.navy : '#94A3B8', color: '#FFF', border: 'none', borderRadius: '2px', fontSize: '12px', fontWeight: '700', cursor: altText.trim() ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <FlaskConical size={14} />
              {running ? 'Running Analysis…' : 'Run What-If Analysis'}
            </button>
          </div>
        </div>

        {/* Results */}
        <div>
          {!result
            ? (
              <div style={{ ...PANEL, textAlign: 'center', padding: '48px 24px' }}>
                <FlaskConical size={36} style={{ color: '#E2E8F0', marginBottom: '12px' }} />
                <div style={{ fontSize: '13px', fontWeight: '700', color: C.muted, marginBottom: '6px' }}>Analysis Not Yet Run</div>
                <div style={{ fontSize: '12px', color: C.subtle }}>Select a decision point, describe an alternative, then run.</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', gap: '8px', padding: '9px 12px', background: '#FEF3C7', border: '1px solid #FCD34D', borderRadius: '2px', fontSize: '11px', color: '#92400E' }}>
                  <AlertTriangle size={13} style={{ flexShrink: 0, marginTop: '1px' }} />
                  <span><strong>HYPOTHETICAL</strong> — {result.warningLabel}</span>
                </div>

                {/* Side-by-side */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div style={{ ...PANEL, border: '2px solid #0369A1', background: '#EFF6FF', padding: '12px' }}>
                    <div style={{ fontSize: '9px', fontWeight: '700', color: '#0369A1', marginBottom: '4px' }}>ORIGINAL DECISION</div>
                    <div style={{ fontSize: '12px', fontWeight: '700', color: C.navy, marginBottom: '4px' }}>{result.original.decisionText}</div>
                    <div style={{ fontSize: '10px', color: C.muted }}>At {result.original.elapsedFormatted} · {result.original.roleLabel}</div>
                  </div>
                  <div style={{ ...PANEL, border: '2px solid #D97706', background: '#FFFBEB', padding: '12px' }}>
                    <div style={{ fontSize: '9px', fontWeight: '700', color: '#D97706', marginBottom: '4px' }}>ALTERNATIVE (HYPOTHETICAL)</div>
                    <div style={{ fontSize: '12px', fontWeight: '700', color: '#92400E', marginBottom: '4px' }}>{result.alternative.decisionText}</div>
                    <div style={{ fontSize: '10px', color: C.muted }}>{result.alternative.basedOn}</div>
                  </div>
                </div>

                {result.projected.timingComparison.length > 0 && (
                  <div style={{ ...PANEL, padding: '12px 14px' }}>
                    <div style={{ fontSize: '10px', fontWeight: '700', color: C.muted, letterSpacing: '0.5px', marginBottom: '6px' }}>TIMING ANALYSIS</div>
                    {result.projected.timingComparison.map((t, i) => <div key={i} style={{ fontSize: '12px', color: C.text, marginBottom: '4px' }}>▸ {t}</div>)}
                  </div>
                )}

                {result.projected.informationFlowComparison.length > 0 && (
                  <div style={{ ...PANEL, padding: '12px 14px' }}>
                    <div style={{ fontSize: '10px', fontWeight: '700', color: C.muted, letterSpacing: '0.5px', marginBottom: '6px' }}>INFORMATION FLOW IMPACT</div>
                    {result.projected.informationFlowComparison.map((t, i) => <div key={i} style={{ fontSize: '12px', color: C.text, marginBottom: '4px' }}>▸ {t}</div>)}
                  </div>
                )}

                {result.projected.tradeoffs.length > 0 && (
                  <div style={{ ...PANEL, padding: '12px 14px' }}>
                    <div style={{ fontSize: '10px', fontWeight: '700', color: C.muted, letterSpacing: '0.5px', marginBottom: '6px' }}>TRADE-OFFS</div>
                    {result.projected.tradeoffs.map((t, i) => (
                      <div key={i} style={{ marginBottom: '6px' }}>
                        <div style={{ fontSize: '12px', color: '#15803D' }}>+ {t.advantage}</div>
                        <div style={{ fontSize: '12px', color: '#DC2626' }}>- {t.disadvantage}</div>
                      </div>
                    ))}
                  </div>
                )}

                {result.projected.subsequentObservations.length > 0 && (
                  <div style={{ ...PANEL, padding: '12px 14px' }}>
                    <div style={{ fontSize: '10px', fontWeight: '700', color: C.muted, letterSpacing: '0.5px', marginBottom: '6px' }}>EVENTS THAT FOLLOWED (RECORDED)</div>
                    {result.projected.subsequentObservations.map((obs, i) => (
                      <div key={i} style={{ display: 'flex', gap: '10px', padding: '5px 0', borderBottom: '1px solid #F1F5F9', alignItems: 'flex-start' }}>
                        <span style={{ fontFamily: 'var(--font-family-mono)', fontSize: '10px', color: C.subtle, flexShrink: 0 }}>{obs.scheduledAtFormatted}</span>
                        <div>
                          <div style={{ fontSize: '11px', fontWeight: '700', color: C.navy }}>{obs.event.title}</div>
                          <div style={{ fontSize: '10px', color: C.muted }}>{obs.relevanceNote}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {result.projected.simulationLimitation && (
                  <div style={{ padding: '9px 12px', background: '#F1F5F9', border: '1px solid #CBD5E1', borderRadius: '2px', fontSize: '11px', color: C.muted }}>ℹ {result.projected.simulationLimitation}</div>
                )}

                <InfoNote text={result.projected.projectionNote} />

                <details style={{ fontSize: '11px', color: C.muted }}>
                  <summary style={{ cursor: 'pointer', fontWeight: '700' }}>View analysis assumptions ({result.assumptions.length})</summary>
                  <ul style={{ marginTop: '6px', paddingLeft: '16px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    {result.assumptions.map((a, i) => <li key={i}>{a}</li>)}
                  </ul>
                </details>
              </div>
            )
          }
        </div>
      </div>
    </div>
  );
}

// ─── MAIN EXPORT ──────────────────────────────────────────────────────────────

const TABS = [
  { id: 'capsule',     label: 'Time Capsule',      icon: Clock,        desc: 'What they knew then' },
  { id: 'perspective', label: 'Perspective Switch', icon: Users,        desc: 'Different eyes, same moment' },
  { id: 'recovery',   label: 'Recovery Score',     icon: BarChart2,    desc: 'How well the team adapted' },
  { id: 'whatif',     label: 'What-If Lab',        icon: FlaskConical, desc: 'Alternative decisions' }
];

export const FogForensics = ({ aars, userRole }) => {
  const [selectedAARId, setSelectedAARId] = useState(aars && aars[0] ? aars[0].id : null);
  const [activeTab, setActiveTab] = useState('capsule');
  const selectedAAR = useMemo(() => (aars || []).find(a => a.id === selectedAARId) || null, [aars, selectedAARId]);

  if (!aars || aars.length === 0) {
    return (
      <div style={{ padding: '32px' }}>
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <Layers size={20} style={{ color: C.navy }} />
            <h1 style={{ fontFamily: 'var(--font-family-serif)', fontSize: '22px', fontWeight: '800', color: C.navy, margin: 0 }}>FOG FORENSICS</h1>
          </div>
          <p style={{ fontSize: '13px', color: C.muted, margin: 0, marginLeft: '30px' }}>Investigate the thinking behind every decision.</p>
        </div>
        <EmptyState icon={Layers} title="No Completed Sessions" body="FOG FORENSICS requires at least one completed training exercise with recorded decisions and events. Run a training session, submit decisions, and end the exercise to generate forensic data." />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', minHeight: '100%', backgroundColor: '#F4F6F8' }}>
      {/* Left panel: session selector */}
      <div style={{ width: '260px', flexShrink: 0, padding: '18px 14px', borderRight: '1px solid ' + C.border, backgroundColor: '#F8FAFC', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
            <Layers size={15} style={{ color: C.navy }} />
            <span style={{ fontFamily: 'var(--font-family-serif)', fontSize: '14px', fontWeight: '800', color: C.navy }}>FOG FORENSICS</span>
          </div>
          <div style={{ fontSize: '9px', color: C.subtle, fontWeight: '700', letterSpacing: '0.5px', marginLeft: '23px' }}>INVESTIGATE THE THINKING BEHIND EVERY DECISION</div>
        </div>
        <SessionSelector aars={aars} selectedAARId={selectedAARId} onSelect={id => setSelectedAARId(id)} />
      </div>

      {/* Main content area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Tab bar */}
        <div style={{ backgroundColor: '#0F172A', display: 'flex', borderBottom: '1px solid #1E293B', flexShrink: 0 }}>
          {TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                style={{ padding: '12px 18px', display: 'flex', alignItems: 'center', gap: '7px', background: 'none', border: 'none', borderBottom: isActive ? '3px solid ' + C.gold : '3px solid transparent', cursor: 'pointer', color: isActive ? '#FFF' : '#64748B', fontWeight: isActive ? '700' : '500', fontSize: '12px' }}>
                <Icon size={13} style={{ color: isActive ? C.gold : '#64748B' }} />
                <div>
                  <div style={{ lineHeight: '1.2' }}>{tab.label}</div>
                  <div style={{ fontSize: '9px', color: isActive ? '#94A3B8' : '#475569', fontWeight: '400' }}>{tab.desc}</div>
                </div>
              </button>
            );
          })}
        </div>

        {/* View content */}
        <div style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
          {activeTab === 'capsule'     && <TimeCapsuleView     aar={selectedAAR} />}
          {activeTab === 'perspective' && <PerspectiveSwitchView aar={selectedAAR} />}
          {activeTab === 'recovery'   && <RecoveryScoreView   aar={selectedAAR} />}
          {activeTab === 'whatif'     && <WhatIfLabView       aar={selectedAAR} />}
        </div>
      </div>
    </div>
  );
};
