/**
 * Operational Fog - PDF Report Exporter
 * Generates an official, printable PDF document report for After-Action Reviews.
 */
import { ROLE_LABELS } from './eventEngine';

export function generateAARPDFReport(aar) {
  if (!aar) return;

  const title = aar.sessionName || 'Exercise Review';
  const sessionCode = aar.sessionCode || aar.id || 'SESS-2026';
  const scenarioTitle = aar.scenarioTitle || 'Scenario Review';
  const genDate = new Date().toLocaleString('en-IN');

  const decisions = aar.decisions || [];
  const events = aar.events || [];
  const teamMessages = aar.teamMessages || [];
  const instructorNotes = aar.instructorNotes || 'No qualitative instructor observations recorded.';

  // Construct styled printable HTML content
  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>OPERATIONAL FOG — AAR REPORT ${sessionCode}</title>
      <style>
        @page { size: A4; margin: 15mm; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1E293B; line-height: 1.5; margin: 0; padding: 20px; font-size: 12px; }
        .header-bar { border-bottom: 3px solid #2563EB; padding-bottom: 12px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: flex-end; }
        .org-title { font-size: 10px; font-weight: bold; text-transform: uppercase; color: #2563EB; letter-spacing: 1px; }
        .main-title { font-size: 22px; font-weight: bold; color: #0F172A; margin: 4px 0; }
        .sub-title { font-size: 13px; color: #475569; }
        .meta-box { background-color: #F8FAFC; border: 1px solid #CBD5E1; border-radius: 4px; padding: 12px; margin-bottom: 16px; display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
        .meta-item { font-size: 11px; }
        .meta-label { font-size: 9px; font-weight: bold; color: #64748B; text-transform: uppercase; }
        .meta-val { font-size: 13px; font-weight: bold; color: #0F172A; margin-top: 2px; }
        .section-title { font-size: 14px; font-weight: bold; color: #0F172A; border-bottom: 2px solid #CBD5E1; padding-bottom: 4px; margin-top: 20px; margin-bottom: 10px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 14px; font-size: 11px; }
        th, td { border: 1px solid #CBD5E1; padding: 6px 8px; text-align: left; }
        th { background-color: #F1F5F9; color: #0F172A; font-weight: bold; }
        .badge { display: inline-block; padding: 2px 5px; font-size: 9px; font-weight: bold; border-radius: 2px; }
        .badge-delivered { background-color: #DCFCE7; color: #15803D; }
        .badge-delayed { background-color: #FEF3C7; color: #B45309; }
        .badge-dropped { background-color: #FEE2E2; color: #991B1B; }
        .badge-incomplete { background-color: #F3E8FF; color: #7E22CE; }
        .badge-conflicting { background-color: #FFEDD5; color: #C2410C; }
        .notes-box { background-color: #F8FAFC; border: 1px solid #CBD5E1; border-left: 4px solid #2563EB; border-radius: 4px; padding: 12px; margin-top: 10px; font-size: 12px; }
        .footer { margin-top: 30px; border-top: 1px solid #CBD5E1; padding-top: 8px; font-size: 9px; color: #64748B; text-align: center; }
      </style>
    </head>
    <body>
      <div class="header-bar">
        <div>
          <div class="org-title">Operational Fog Simulator • After-Action Evaluation Report</div>
          <div class="main-title">${title}</div>
          <div class="sub-title">Scenario: ${scenarioTitle} • Room Code: <strong>${sessionCode}</strong></div>
        </div>
        <div style="text-align: right; font-size: 10px; color: #64748B;">
          Report Generated:<br><strong>${genDate}</strong>
        </div>
      </div>

      <div class="meta-box">
        <div class="meta-item">
          <div class="meta-label">Scenario</div>
          <div class="meta-val">${scenarioTitle}</div>
        </div>
        <div class="meta-item">
          <div class="meta-label">Duration</div>
          <div class="meta-val">${aar.durationMinutes || 5} Mins</div>
        </div>
        <div class="meta-item">
          <div class="meta-label">Decisions Logged</div>
          <div class="meta-val">${decisions.length} Actions</div>
        </div>
        <div class="meta-item">
          <div class="meta-label">Team Chat Msgs</div>
          <div class="meta-val">${teamMessages.length} Messages</div>
        </div>
      </div>

      <!-- SECTION 1: INFORMATION ASYMMETRY DELIVERY MATRIX -->
      <div class="section-title">1. Information Asymmetry Delivery Matrix</div>
      <p style="font-size: 10px; color: #64748B; margin: 0 0 8px;">
        Demonstrates what the system created (Ground Truth) vs what each trainee role actually received.
      </p>
      <table>
        <thead>
          <tr>
            <th>Event Title</th>
            <th>Time</th>
            <th>Ground Truth Reality</th>
            <th>Team Leader</th>
            <th>Land Member</th>
            <th>Air Member</th>
            <th>Cyber/EW</th>
          </tr>
        </thead>
        <tbody>
          ${events.map(ev => {
            const v = ev.roleVariations || {};
            const ldr = v.team_leader?.deliveryBehavior || ev.deliveryBehavior || 'normal';
            const land = v.land_member?.deliveryBehavior || ev.deliveryBehavior || 'normal';
            const air = v.air_member?.deliveryBehavior || ev.deliveryBehavior || 'normal';
            const cyber = v.cyber_ew_member?.deliveryBehavior || ev.deliveryBehavior || 'normal';

            return `
              <tr>
                <td><strong>${ev.title}</strong></td>
                <td>${ev.time || '00:00'}</td>
                <td style="max-width: 180px;">${ev.content}</td>
                <td><span class="badge badge-${ldr}">${ldr === 'delayed' ? 'Delayed (+20s)' : ldr}</span></td>
                <td><span class="badge badge-${land}">${land === 'normal' ? 'Delivered' : land}</span></td>
                <td><span class="badge badge-${air}">${air === 'incomplete' ? 'Incomplete' : air}</span></td>
                <td><span class="badge badge-${cyber}">${cyber === 'dropped' ? 'Dropped (Lost)' : cyber}</span></td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>

      <!-- SECTION 2: COMMAND DECISIONS AUDIT -->
      <div class="section-title">2. Command Decisions & Tactical Rationales</div>
      ${decisions.length === 0 ? '<p style="color: #64748B;">No decisions recorded during this exercise.</p>' : `
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Time</th>
              <th>Action Decided</th>
              <th>Why (Stated Rationale)</th>
              <th>Operator / Role</th>
              <th>Confidence</th>
            </tr>
          </thead>
          <tbody>
            ${decisions.map((d, i) => `
              <tr>
                <td>${i + 1}</td>
                <td>T+ ${d.elapsedTimeFormatted || `${d.elapsedMinutes || 0}m`}</td>
                <td><strong>${d.title}</strong></td>
                <td>${d.rationale}</td>
                <td>${d.submittedBy || 'Operator'} (${ROLE_LABELS[d.submittedRole] || d.submittedRole})</td>
                <td>${d.confidence || 'Medium'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `}

      <!-- SECTION 3: TEAM CHAT TRANSCRIPT -->
      ${teamMessages.length > 0 ? `
        <div class="section-title">3. Team Coordination Chat Transcript</div>
        <table>
          <thead>
            <tr>
              <th>Time</th>
              <th>Sender</th>
              <th>Role</th>
              <th>Message Content</th>
            </tr>
          </thead>
          <tbody>
            ${teamMessages.map(m => `
              <tr>
                <td style="white-space: nowrap;">${m.timestamp ? new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</td>
                <td><strong>${m.senderName}</strong></td>
                <td>${ROLE_LABELS[m.senderRole] || m.senderRole}</td>
                <td>${m.text}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      ` : ''}

      <!-- SECTION 4: INSTRUCTOR NOTES -->
      <div class="section-title">4. Instructor Observations & Assessment</div>
      <div class="notes-box">
        ${instructorNotes}
      </div>

      <div class="footer">
        Operational Fog Decision-Making Training Platform • SIH Multi-Domain Prototype • Session Ref: ${sessionCode}
      </div>
    </body>
    </html>
  `;

  // Open printable window formatted for PDF download/print
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 500);
  } else {
    // Fallback Blob download
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Operational_Fog_AAR_Report_${sessionCode}.html`;
    a.click();
    URL.revokeObjectURL(url);
  }
}
