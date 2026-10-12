/**
 * Operational Fog -- FOG FORENSICS Engine
 * Pure computation layer for forensic investigation of training sessions.
 * Operates entirely on existing AAR data structures. Never mutates stored records.
 */

import { normalizeRole, ROLE_LABELS, parseTimeToSeconds, formatSecondsToMMSS } from "./eventEngine.js";

export const FORENSICS_ROLES = ["team_leader","land_member","air_member","cyber_ew_member","instructor"];

export const ROLE_COLORS = {
  team_leader:"#1D4ED8", land_member:"#15803D", air_member:"#7C3AED",
  cyber_ew_member:"#B45309", instructor:"#BE123C"
};

export const DELIVERY_BADGE = {
  normal:      { label:"Delivered",   bg:"#DCFCE7", color:"#15803D", border:"#86EFAC" },
  delayed:     { label:"Delayed",     bg:"#FEF3C7", color:"#B45309", border:"#FCD34D" },
  dropped:     { label:"Dropped",     bg:"#FEE2E2", color:"#991B1B", border:"#FCA5A5" },
  incomplete:  { label:"Incomplete",  bg:"#F3E8FF", color:"#7E22CE", border:"#D8B4FE" },
  conflicting: { label:"Conflicting", bg:"#FFEDD5", color:"#C2410C", border:"#FDBA74" }
};

// ---- A. DECISION TIME CAPSULE ----
export function buildTimeCapsule(aar, decisionId) {
  if (!aar || !decisionId) return null;
  const decision = (aar.decisions||[]).find(d => d.id === decisionId);
  if (!decision) return null;
  const events = aar.events || [];
  const decisionTimeSec = decision.elapsedSeconds != null ? Number(decision.elapsedSeconds) : (Number(decision.elapsedMinutes)||0)*60;
  const role = normalizeRole(decision.submittedRole || decision.role || "team_leader");
  const eventsBeforeDecision = [], eventsDroppedOrMissing = [], eventsArrivedAfter = [];

  events.forEach(ev => {
    const scheduled = ev.scheduledTimeSec != null ? Number(ev.scheduledTimeSec) : parseTimeToSeconds(ev.time);
    const variation = ev.roleVariations && ev.roleVariations[role];
    if (variation) {
      if (variation.deliveryBehavior === "dropped") {
        eventsDroppedOrMissing.push({...ev, _roleVariation:variation, _reason:variation.reason||"Communication failure", _wasAvailable:false, _deliveryStatus:"dropped"});
        return;
      }
      const delay = variation.deliveryBehavior === "delayed" ? (Number(variation.delaySeconds)||0) : 0;
      const deliveredAt = scheduled + delay;
      const entry = {...ev, _roleVariation:variation, _deliveredAt:deliveredAt, _deliveryStatus:variation.deliveryBehavior||"normal", _wasAvailable:deliveredAt<=decisionTimeSec, _deliveryBadge:DELIVERY_BADGE[variation.deliveryBehavior]||DELIVERY_BADGE.normal, _roleContent:variation.content!=null?variation.content:ev.content, _roleConfidence:variation.confidence!=null?variation.confidence:ev.confidence};
      deliveredAt <= decisionTimeSec ? eventsBeforeDecision.push(entry) : eventsArrivedAfter.push(entry);
    } else {
      const behavior = ev.deliveryBehavior || "normal";
      if (behavior === "dropped") { eventsDroppedOrMissing.push({...ev, _wasAvailable:false, _deliveryStatus:"dropped", _reason:"Not delivered to this role"}); return; }
      const delay = behavior === "delayed" ? (Number(ev.delaySeconds)||0) : 0;
      const deliveredAt = scheduled + delay;
      const entry = {...ev, _deliveredAt:deliveredAt, _deliveryStatus:behavior, _wasAvailable:deliveredAt<=decisionTimeSec, _deliveryBadge:DELIVERY_BADGE[behavior]||DELIVERY_BADGE.normal, _roleContent:ev.content, _roleConfidence:ev.confidence};
      deliveredAt <= decisionTimeSec ? eventsBeforeDecision.push(entry) : eventsArrivedAfter.push(entry);
    }
  });

  eventsBeforeDecision.sort((a,b) => (a._deliveredAt||0)-(b._deliveredAt||0));
  eventsArrivedAfter.sort((a,b) => (a._deliveredAt||0)-(b._deliveredAt||0));
  const sourcesUsed = decision.sourcesUsed || (decision.evidenceSnapshot && decision.evidenceSnapshot.sourcesUsed) || [];
  const availableIds = new Set(eventsBeforeDecision.map(e => e.id));

  return {
    decision, role, roleLabel:ROLE_LABELS[role]||role,
    decisionTimeSec, decisionTimeFormatted:formatSecondsToMMSS(decisionTimeSec),
    eventsBeforeDecision, eventsDroppedOrMissing, eventsArrivedAfter, sourcesUsed,
    citedAndAvailable: sourcesUsed.filter(id => availableIds.has(id)),
    citedButMissing:   sourcesUsed.filter(id => !availableIds.has(id)),
    informationAvailabilityPct: events.length > 0 ? Math.round((eventsBeforeDecision.length/events.length)*100) : 0,
    groundTruthEvents: events, totalEvents: events.length
  };
}

// ---- B. PERSPECTIVE SWITCH ----
export function buildPerspectiveMatrix(aar) {
  if (!aar) return null;
  const events = aar.events || [];
  const participants = aar.participants || [];
  const activeRoles = Array.from(new Set(FORENSICS_ROLES.filter(r => r==="instructor" || participants.some(p => normalizeRole(p.role)===r))));

  const matrix = events.map(ev => {
    const scheduled = ev.scheduledTimeSec != null ? Number(ev.scheduledTimeSec) : parseTimeToSeconds(ev.time);
    const roleDeliveries = {};
    activeRoles.forEach(role => {
      const variation = ev.roleVariations && ev.roleVariations[role];
      if (variation) {
        const behavior = variation.deliveryBehavior || "normal";
        const delay = behavior === "delayed" ? (Number(variation.delaySeconds)||0) : 0;
        roleDeliveries[role] = { behavior, content:variation.content!=null?variation.content:ev.content, confidence:variation.confidence!=null?variation.confidence:ev.confidence, delaySeconds:delay, deliveredAt:scheduled+delay, deliveredAtFormatted:formatSecondsToMMSS(scheduled+delay), reason:variation.reason||null, scheduledAt:scheduled, scheduledAtFormatted:formatSecondsToMMSS(scheduled), badge:DELIVERY_BADGE[behavior]||DELIVERY_BADGE.normal };
      } else if (role === "instructor") {
        roleDeliveries[role] = { behavior:"normal", content:ev.content, confidence:ev.confidence, delaySeconds:0, deliveredAt:scheduled, deliveredAtFormatted:formatSecondsToMMSS(scheduled), reason:null, scheduledAt:scheduled, scheduledAtFormatted:formatSecondsToMMSS(scheduled), badge:DELIVERY_BADGE.normal, isGroundTruth:true };
      } else {
        const behavior = ev.deliveryBehavior || "normal";
        const target = (ev.recipientRole || ev.intendedRecipient || "all").toLowerCase();
        const isTargeted = target === "all" || target === role;
        const eff = isTargeted ? behavior : "dropped";
        const delay = eff === "delayed" ? (Number(ev.delaySeconds)||0) : 0;
        roleDeliveries[role] = { behavior:eff, content:isTargeted?ev.content:null, confidence:isTargeted?ev.confidence:"N/A", delaySeconds:delay, deliveredAt:scheduled+delay, deliveredAtFormatted:formatSecondsToMMSS(scheduled+delay), reason:isTargeted?null:"Not addressed to this role", scheduledAt:scheduled, scheduledAtFormatted:formatSecondsToMMSS(scheduled), badge:DELIVERY_BADGE[eff]||DELIVERY_BADGE.normal };
      }
    });
    const deliveredRoles = activeRoles.filter(r => roleDeliveries[r] && roleDeliveries[r].behavior !== "dropped");
    const contents = deliveredRoles.map(r => roleDeliveries[r].content).filter(Boolean);
    const hasContradiction = new Set(contents).size > 1;
    const times = deliveredRoles.map(r => roleDeliveries[r].deliveredAt).filter(t => typeof t === "number");
    const timingGapSec = times.length > 1 ? Math.max(...times) - Math.min(...times) : 0;
    return { event:ev, scheduledAt:scheduled, scheduledAtFormatted:formatSecondsToMMSS(scheduled), roleDeliveries, hasContradiction, timingGapSec, timingGapFormatted:formatSecondsToMMSS(timingGapSec), activeRoles };
  });

  return { matrix, activeRoles, events };
}

// ---- C. RECOVERY SCORE ----
export function computeRecoveryScore(aar) {
  if (!aar) return null;
  const events = aar.events||[], decisions = aar.decisions||[], disruptions = aar.disruptions||[], teamMessages = aar.teamMessages||[];

  // Evidence Discipline (0-25)
  let edScore = 0; const edEvidence = [];
  const conflicting = events.filter(e => e.deliveryBehavior==="conflicting"||e.deliveryBehavior==="incomplete"||Object.values(e.roleVariations||{}).some(v=>v.deliveryBehavior==="conflicting"||v.deliveryBehavior==="incomplete"));
  if (conflicting.length === 0) { edScore = 25; edEvidence.push("No conflicting or incomplete intelligence present -- full marks awarded."); }
  else {
    const verKw = ["verify","verif","cross-check","confirm","contradict","discrepan","corrobor","uncertain","incomplete","corrupt"];
    const rat = decisions.map(d=>(d.rationale||"").toLowerCase()).join(" ");
    const chatV = teamMessages.filter(m=>verKw.some(kw=>(m.text||"").toLowerCase().includes(kw)));
    const ratV = verKw.filter(kw=>rat.includes(kw));
    if (ratV.length>0&&chatV.length>0) { edScore=25; edEvidence.push("Verification language found in decision rationale and team chat."); }
    else if (ratV.length>0||chatV.length>0) { edScore=15; edEvidence.push("Verification referenced in "+(ratV.length>0?"decision rationale":"team chat")+"."); }
    else { edScore=5; edEvidence.push(conflicting.length+" conflicting or incomplete event(s) present; no verification recorded."); }
  }

  // Decision Adaptation (0-25)
  let daScore = 0; const daEvidence = [];
  const adaptKw = ["reconsider","revise","update","changed","new information","revised","adjust","pivot","however"];
  const ratL = decisions.map(d=>(d.rationale||"").toLowerCase()).join(" ");
  const adaptM = adaptKw.filter(kw=>ratL.includes(kw));
  if (decisions.length===0) { daScore=0; daEvidence.push("No decisions recorded -- adaptation cannot be assessed."); }
  else if (decisions.length===1) { daScore=12; daEvidence.push("Only one decision recorded; multi-decision adaptation cannot be fully evaluated."); }
  else {
    daScore = Math.min(25, Math.min(10,(decisions.length-1)*5)+Math.min(15,adaptM.length*5));
    if (adaptM.length>0) daEvidence.push('Adaptation language found: "'+adaptM.slice(0,2).join('", "')+'".');
    daEvidence.push(decisions.length+" decisions recorded across the exercise.");
  }

  // Communication Recovery (0-20)
  let crScore = 0; const crEvidence = [];
  const droppedEvs = events.filter(e=>e.deliveryBehavior==="dropped"||Object.values(e.roleVariations||{}).some(v=>v.deliveryBehavior==="dropped"));
  if (droppedEvs.length===0&&disruptions.length===0) { crScore=20; crEvidence.push("No communication disruptions recorded in this session."); }
  else {
    const recKw = ["backup","alternate","relay","restore","alternative","workaround","secondary","fallback"];
    const recM = teamMessages.filter(m=>recKw.some(kw=>(m.text||"").toLowerCase().includes(kw)));
    const decAfter = decisions.filter(d=>{const dS=d.elapsedSeconds!=null?Number(d.elapsedSeconds):(Number(d.elapsedMinutes)||0)*60;return droppedEvs.some(ev=>{const eS=ev.scheduledTimeSec!=null?Number(ev.scheduledTimeSec):parseTimeToSeconds(ev.time);return eS<dS;});});
    if (recM.length>0) { crScore+=10; crEvidence.push(recM.length+" message(s) reference alternative communication methods."); }
    if (decAfter.length>0) { crScore+=10; crEvidence.push(decAfter.length+" decision(s) recorded after disruptions -- operation continued."); }
    if (crScore===0) crEvidence.push(droppedEvs.length+" dropped event(s) detected; no recovery actions recorded.");
  }

  // Team Coordination (0-15)
  let tcScore = 0; const tcEvidence = [];
  const coordKw = ["coordinate","align","notify","inform","all units","confirmed","acknowledged","status"];
  const coordM = teamMessages.filter(m=>coordKw.some(kw=>(m.text||"").toLowerCase().includes(kw)));
  const senders = new Set(teamMessages.map(m=>m.senderRole||m.senderName));
  if (teamMessages.length===0) { tcScore=0; tcEvidence.push("No team chat messages recorded -- coordination cannot be assessed from available data."); }
  else { tcScore=Math.min(15,Math.min(8,senders.size*3)+Math.min(7,coordM.length*2)); tcEvidence.push(senders.size+" role(s) sent messages; "+teamMessages.length+" total team messages."); if(coordM.length>0)tcEvidence.push(coordM.length+" message(s) contain coordination language."); }

  // Contingency Planning (0-15)
  let cpScore = 0; const cpEvidence = [];
  const contKw = ["contingency","alternative","plan b","fallback","backup","secondary","workaround","alternate"];
  const contR = decisions.map(d=>(d.rationale||"").toLowerCase()).join(" ");
  const contC = teamMessages.map(m=>(m.text||"").toLowerCase()).join(" ");
  const contM = contKw.filter(kw=>contR.includes(kw)||contC.includes(kw));
  if (contM.length>0) { cpScore=Math.min(15,contM.length*5); cpEvidence.push('Contingency language found: "'+contM.slice(0,2).join('", "')+'".'); }
  else if (disruptions.length>0||droppedEvs.length>0) { cpScore=3; cpEvidence.push("Disruptions occurred but no contingency planning language found."); }
  else { cpScore=10; cpEvidence.push("No disruptions in this session; contingency planning was not tested."); }

  const total = edScore+daScore+crScore+tcScore+cpScore;
  const grade = total>=90?"A":total>=75?"B":total>=60?"C":total>=45?"D":"F";
  const gradeColor = total>=90?"#15803D":total>=75?"#0369A1":total>=60?"#D97706":total>=45?"#EA580C":"#DC2626";
  const gradeLabel = total>=90?"Excellent":total>=75?"Proficient":total>=60?"Adequate":total>=45?"Developing":"Insufficient";
  const categories = [
    {id:"evidence_discipline",label:"Evidence Discipline",description:"Did the team verify important reports before acting?",score:edScore,max:25,evidence:edEvidence,icon:"shield-check"},
    {id:"decision_adaptation",label:"Decision Adaptation",description:"Did it reconsider decisions when credible new information arrived?",score:daScore,max:25,evidence:daEvidence,icon:"refresh-cw"},
    {id:"comm_recovery",label:"Communication Recovery",description:"Did it restore useful information flow after disruption?",score:crScore,max:20,evidence:crEvidence,icon:"radio"},
    {id:"team_coordination",label:"Team Coordination",description:"Did participants communicate important changes?",score:tcScore,max:15,evidence:tcEvidence,icon:"users"},
    {id:"contingency_planning",label:"Contingency Planning",description:"Did the team use alternatives when normal communication failed?",score:cpScore,max:15,evidence:cpEvidence,icon:"git-branch"}
  ];
  return { total, maxTotal:100, percentPct:Math.round((total/100)*100), grade, gradeColor, gradeLabel, categories,
    dataNote:"This score is derived from recorded session events, decisions, and team messages. It reflects observable behavior patterns, not a validated scientific assessment.",
    insufficientDataCategories: categories.filter(c=>c.evidence.some(e=>e.includes("cannot be assessed")||e.includes("cannot be fully"))) };
}

// ---- D. WHAT-IF LAB ----
export function runWhatIfAnalysis(aar, originalDecisionId, alternativeDecisionText) {
  if (!aar || !originalDecisionId || !alternativeDecisionText) return null;
  const originalDecision = (aar.decisions||[]).find(d=>d.id===originalDecisionId);
  if (!originalDecision) return null;
  const decisionTimeSec = originalDecision.elapsedSeconds!=null ? Number(originalDecision.elapsedSeconds) : (Number(originalDecision.elapsedMinutes)||0)*60;
  const events = aar.events || [];
  const evBefore = events.filter(ev=>{ const s=ev.scheduledTimeSec!=null?Number(ev.scheduledTimeSec):parseTimeToSeconds(ev.time); return s<=decisionTimeSec; });
  const evAfter  = events.filter(ev=>{ const s=ev.scheduledTimeSec!=null?Number(ev.scheduledTimeSec):parseTimeToSeconds(ev.time); return s>decisionTimeSec; });
  const capsule = buildTimeCapsule(aar, originalDecisionId);
  const projected = _buildProjectedImpacts(alternativeDecisionText, originalDecision.title, evBefore, evAfter);
  const role = normalizeRole(originalDecision.submittedRole || "team_leader");
  return {
    branchId: "whatif-"+Date.now(), isHypothetical: true,
    warningLabel: "HYPOTHETICAL -- This is a projected analysis, not a historical record. The original session data has not been modified.",
    original: { decisionId:originalDecision.id, decisionText:originalDecision.title, rationale:originalDecision.rationale, confidence:originalDecision.confidence, elapsedSeconds:decisionTimeSec, elapsedFormatted:formatSecondsToMMSS(decisionTimeSec), role, roleLabel:ROLE_LABELS[role]||"Participant" },
    alternative: { decisionText:alternativeDecisionText, isHypothetical:true, basedOn:"Based on the same information available to "+(ROLE_LABELS[role]||"Participant")+" at "+formatSecondsToMMSS(decisionTimeSec) },
    sharedContext: { decisionTimeSec, decisionTimeFormatted:formatSecondsToMMSS(decisionTimeSec), eventsBeforeDecision:evBefore, eventsAfterDecision:evAfter, informationAvailabilityPct:capsule?capsule.informationAvailabilityPct:0, capsule },
    projected,
    assumptions: [
      "All events after the decision point are treated as observable facts from the recorded session.",
      "The alternative decision is analyzed against the same information state that existed at the decision moment.",
      "Projected consequences are inferred from the scenario structure and available evidence -- not simulated in real time.",
      "This analysis cannot account for participant responses, communications, or actions not captured in the session record."
    ]
  };
}

function _buildProjectedImpacts(altText, origText, evBefore, evAfter) {
  const alt = (altText||"").toLowerCase(), orig = (origText||"").toLowerCase();
  const friction = evAfter.filter(ev=>["delayed","dropped","conflicting","incomplete"].includes(ev.deliveryBehavior));
  const cautKw = ["verify","hold","wait","check","confirm","pause","request"];
  const aggKw  = ["advance","proceed","move","push","forward","dispatch","execute","reroute"];
  const isAltCautious   = cautKw.some(kw=>alt.includes(kw));
  const isOrigCautious  = cautKw.some(kw=>orig.includes(kw));
  const isAltAggressive = aggKw.some(kw=>alt.includes(kw));
  const timing=[], infoFlow=[], tradeoffs=[];
  if (isAltCautious && !isOrigCautious) {
    timing.push("The alternative response prioritizes verification before action, which would likely add time before the next observable event.");
    if (friction.length>0) infoFlow.push("With "+friction.length+" subsequent friction event(s) recorded, additional verification time could have allowed delayed information to arrive before acting.");
    tradeoffs.push({ advantage:"Lower risk of acting on incomplete information.", disadvantage:"Additional time before execution." });
  } else if (isAltAggressive && isOrigCautious) {
    timing.push("The alternative is more decisive, which would reduce the time between decision and the next action.");
    if (friction.length>0) infoFlow.push("The exercise recorded "+friction.length+" subsequent disrupted communication(s). An earlier commitment could mean proceeding with less information.");
    tradeoffs.push({ advantage:"Faster execution -- less waiting.", disadvantage:"Higher risk of acting on information that may be incomplete or delayed." });
  } else {
    timing.push("Both decisions operate on a similar time horizon. The main difference is direction, not timing.");
    tradeoffs.push({ advantage:"Alternative provides a different response to the same situation.", disadvantage:"Without live simulation, the downstream impact cannot be precisely determined." });
  }
  const obs = evAfter.slice(0,5).map(ev=>({ event:ev, scheduledAtFormatted:formatSecondsToMMSS(ev.scheduledTimeSec!=null?Number(ev.scheduledTimeSec):parseTimeToSeconds(ev.time)), relevanceNote:"This event was recorded after the original decision and would have applied to either response branch." }));
  const simLim = evAfter.length===0 ? "No recorded events follow this decision point -- consequence projection is not possible from available data." : null;
  return { timingComparison:timing, informationFlowComparison:infoFlow, tradeoffs, subsequentObservations:obs, simulationLimitation:simLim, followingFrictionCount:friction.length, followingNormalCount:evAfter.length-friction.length, isProjection:true, projectionNote:"These projections are inferred from the recorded scenario structure, not calculated by a live simulation engine. Treat them as discussion points, not predictions." };
}

export { formatSecondsToMMSS, normalizeRole, ROLE_LABELS };
