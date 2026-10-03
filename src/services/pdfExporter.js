/**
 * Operational Fog - PDF Report Exporter
 * Generates an official, printable PDF document report for After-Action Reviews.
 */

export function generateAARPDFReport(aar) {
  if (!aar) return;

  const title = aar.sessionName || 'Exercise Review';
  const sessionCode = aar.sessionCode || aar.id || 'SESS-2026';
  const scenarioTitle = aar.scenarioTitle || 'Scenario Review';
  const genDate = new Date().toLocaleString('en-IN');

  const decisions = aar.decisions || [];
  const events = aar.events || [];
  const instructorNotes = aar.instructorNotes || 'No qualitative instructor observations recorded.';

  // Construct styled printable HTML content
  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>OPERATIONAL FOG — AAR REPORT ${sessionCode}</title>
      <style>
        @page { size: A4; margin: 20mm; }
        body { font-family: 'Georgia', 'Merriweather', serif; color: #1A1D20; line-height: 1.5; margin: 0; padding: 20px; font-size: 13px; }
        .header-bar { border-bottom: 3px solid #8B261D; padding-bottom: 12px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-end; }
        .org-title { font-size: 10px; font-weight: bold; text-transform: uppercase; color: #8B261D; letter-spacing: 1px; }
        .main-title { font-size: 24px; font-weight: bold; color: #0F2C59; margin: 4px 0; }
        .sub-title { font-size: 12px; color: #4A5568; }
        .meta-box { background-color: #F4F6F8; border: 1px solid #CBD5E1; padding: 14px; margin-bottom: 20px; display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .meta-item { font-size: 12px; }
        .meta-label { font-size: 10px; font-weight: bold; color: #64748B; text-transform: uppercase; }
        .meta-val { font-size: 14px; font-weight: bold; color: #0F2C59; }
        .section-title { font-size: 16px; font-weight: bold; color: #0F2C59; border-bottom: 2px solid #0F2C59; padding-bottom: 4px; margin-top: 24px; margin-bottom: 12px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 12px; }
        th, td { border: 1px solid #CBD5E1; padding: 8px 10px; text-align: left; }
        th { background-color: #F8FAFC; color: #0F2C59; font-weight: bold; }
        .badge { display: inline-block; padding: 2px 6px; font-size: 9px; font-weight: bold; border-radius: 2px; }
        .badge-delivered { background-color: #DCFCE7; color: #15803D; }
        .badge-delayed { background-color: #FEF3C7; color: #B45309; }
        .badge-dropped { background-color: #FEE2E2; color: #991B1B; }
        .notes-box { background-color: #FFFBEB; border: 1px solid #FCD34D; border-left: 4px solid #D97706; padding: 14px; margin-top: 16px; font-size: 12px; }
        .footer { margin-top: 40px; border-top: 1px solid #CBD5E1; padding-top: 10px; font-size: 10px; color: #64748B; text-align: center; }
      </style>
    </head>
    <body>
      <div class="header-bar">
        <div>
          <div class="org-title">Government Style Training Prototype • Official Audit Report</div>
          <div class="main-title">OPERATIONAL FOG — AFTER-ACTION REVIEW</div>
          <div class="sub-title">${title} (${sessionCode})</div>
        </div>
        <div style="text-align: right; font-size: 10px; color: #64748B;">
          Report Generated:<br><strong>${genDate}</strong>
        </div>
      </div>

      <div class="meta-box">
        <div class="meta-item">
          <div class="meta-label">Scenario Name & Code</div>
          <div class="meta-val">${scenarioTitle}</div>
        </div>
        <div class="meta-item">
          <div class="meta-label">Exercise Duration</div>
          <div class="meta-val">${aar.durationMinutes || 45} Minutes</div>
        </div>
        <div class="meta-item">
          <div class="meta-label">Start Time</div>
          <div class="meta-val">${new Date(aar.startTime).toLocaleString()}</div>
        </div>
        <div class="meta-item">
          <div class="meta-label">Total Decisions Logged</div>
          <div class="meta-val">${decisions.length} Command Actions</div>
        </div>
      </div>

      <div class="section-title">1. Chronological Command Decisions & Rationales</div>
      ${decisions.length === 0 ? '<p>No decisions logged during this exercise.</p>' : `
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Time</th>
              <th>Decision Action</th>
              <th>Tactical Rationale & Assumptions</th>
              <th>Operator / Role</th>
            </tr>
          </thead>
          <tbody>
            ${decisions.map((d, i) => `
              <tr>
                <td>${i + 1}</td>
                <td>T+ ${d.elapsedTimeFormatted || `${d.elapsedMinutes || 0}m`}</td>
                <td><strong>${d.title}</strong></td>
                <td>${d.rationale}</td>
                <td>${d.submittedBy || 'Operator'} (${d.submittedRole || 'Commander'})</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `}

      <div class="section-title">2. Instructor Qualitative Observations</div>
      <div class="notes-box">
        <strong>Debrief Observations:</strong><br>
        ${instructorNotes}
      </div>

      <div class="footer">
        Operational Fog Decision-Making Training Platform • Independent Prototype • Report Ref: ${sessionCode}
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
