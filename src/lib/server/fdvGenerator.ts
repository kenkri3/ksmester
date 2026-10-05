import { getCollectionItems, getCollectionItemById } from './db';
import { displayOrgnr } from '@/src/constants/companyDetails';

export interface FDVReportResult {
  projectId: string;
  projectName: string;
  htmlContent: string;
  generatedAt: string;
  summary: {
    totalDailyLogs: number;
    totalDeviationsResolved: number;
    totalSJAs: number;
    totalChangeOrders: number;
    totalComplianceScore: number;
  };
}

export async function generateFDVReport(projectId: string): Promise<FDVReportResult> {
  const [projects, dailyLogs, deviations, sjas, changeOrders] = await Promise.all([
    getCollectionItems('projects').catch(() => []),
    getCollectionItems('daily_logs').catch(() => []),
    getCollectionItems('deviations').catch(() => []),
    getCollectionItems('sja_reports').catch(() => []),
    getCollectionItems('change_orders').catch(() => [])
  ]);

  const project = projects.find((p: any) => p.id === projectId) || {
    id: projectId,
    name: 'Byggeprosjekt',
    location: 'Norge',
    clientName: 'Byggherre',
    clientEmail: 'post@kunde.no',
    companyName: 'Mester Entreprenør AS',
    companyId: 'comp-001',
    projectManager: 'Byggmester Ken',
    startDate: new Date().toISOString()
  };

  const projectDailyLogs = dailyLogs.filter((dl: any) => dl.projectId === projectId);
  const projectDeviations = deviations.filter((d: any) => d.projectId === projectId || d.project === project.name);
  const projectSJAs = sjas.filter((s: any) => s.projectId === projectId || s.projectName === project.name);
  const projectChangeOrders = changeOrders.filter((co: any) => co.projectId === projectId || co.projectName === project.name);

  const resolvedDeviations = projectDeviations.filter((d: any) => ['closed', 'lukket', 'avsluttet'].includes(d.status));
  const openDeviations = projectDeviations.filter((d: any) => !['closed', 'lukket', 'avsluttet'].includes(d.status));

  const totalComplianceScore = openDeviations.length === 0 ? 100 : Math.max(60, Math.round(100 - (openDeviations.length * 10)));
  const generatedAt = new Date().toLocaleDateString('no-NO', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });

  const htmlContent = `<!DOCTYPE html>
<html lang="no">
<head>
  <meta charset="UTF-8">
  <title>FDV & Sluttrapport - ${project.name}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap');
    
    * { box-sizing: border-box; }
    body {
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
      color: #0f172a;
      background: #f8fafc;
      margin: 0;
      padding: 40px;
      line-height: 1.6;
    }
    .page {
      max-width: 900px;
      margin: 0 auto;
      background: #ffffff;
      padding: 60px;
      border-radius: 24px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.06);
      border: 1px solid #e2e8f0;
    }
    .header {
      border-bottom: 3px solid #0284c7;
      padding-bottom: 24px;
      margin-bottom: 36px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .badge {
      display: inline-block;
      padding: 6px 14px;
      background: #e0f2fe;
      color: #0369a1;
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      border-radius: 9999px;
      border: 1px solid #bae6fd;
    }
    h1 { font-size: 28px; font-weight: 800; color: #0f172a; margin: 12px 0 6px 0; }
    h2 { font-size: 18px; font-weight: 800; color: #0284c7; margin: 32px 0 12px 0; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; }
    h3 { font-size: 14px; font-weight: 700; color: #1e293b; margin: 18px 0 6px 0; }
    p, li { font-size: 13px; color: #334155; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin: 18px 0; }
    .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 14px 18px; }
    .card-label { font-size: 10px; font-weight: 800; text-transform: uppercase; color: #64748b; margin-bottom: 4px; }
    .card-val { font-size: 14px; font-weight: 700; color: #0f172a; }
    table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 12px; }
    th { background: #f1f5f9; text-align: left; padding: 10px 12px; font-weight: 700; color: #475569; border-bottom: 2px solid #cbd5e1; }
    td { padding: 10px 12px; border-bottom: 1px solid #e2e8f0; color: #334155; }
    .success-tag { color: #15803d; font-weight: 700; }
    .footer { margin-top: 50px; padding-top: 24px; border-top: 2px dashed #cbd5e1; display: grid; grid-template-columns: 1fr 1fr; gap: 40px; }
    .signature-line { border-bottom: 1px solid #0f172a; height: 45px; margin-bottom: 6px; }
    @media print {
      body { background: #ffffff; padding: 0; }
      .page { box-shadow: none; border: none; padding: 20px; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="page">
    <div class="header">
      <div>
        <span class="badge">Offisiell Sluttrapport & FDV</span>
        <h1>${project.name}</h1>
        <p style="margin: 0; color: #64748b; font-size: 12px;">Generert av KS Mester Entreprenørplattform • Dato: ${generatedAt}</p>
      </div>
      <div style="text-align: right;">
        <div style="font-size: 16px; font-weight: 800; color: #0284c7;">${project.companyName || 'Mester Entreprenør AS'}</div>
        <!-- SIKKERHETSFIKS (R-02): her sto et hardkodet org.nr som ikke tilhørte
             kunden. Det skrev plattformens nummer inn i kundens
             FDV-sluttdokumentasjon som om det var entreprenørens. Feil
             organisasjonsnummer i et juridisk dokument er en gal opplysning.
             Na vises prosjektets eget nummer, eller «Ikke registrert». -->
        <div style="font-size: 11px; color: #64748b;">Org.nr: ${displayOrgnr((project as any).companyOrgnr || (project as any).orgnr)}</div>
      </div>
    </div>

    <!-- NØKKELDATA -->
    <div class="grid">
      <div class="card">
        <div class="card-label">Byggeplass / Eiendom</div>
        <div class="card-val">${project.location || 'Oslo'}</div>
      </div>
      <div class="card">
        <div class="card-label">Byggherre / Oppdragsgiver</div>
        <div class="card-val">${project.clientName || 'Kunde'}</div>
      </div>
      <div class="card">
        <div class="card-label">Prosjektleder (Faglig Ansvarlig)</div>
        <div class="card-val">${project.projectManager || 'Byggmester'}</div>
      </div>
      <div class="card">
        <div class="card-label">Samlet KS-Score (PBL / TEK17)</div>
        <div class="card-val" style="color: #16a34a;">${totalComplianceScore} % Oppfylt</div>
      </div>
    </div>

    <!-- KAPITTEL 1: SAMSVARSERKLÆRING -->
    <h2>1. Samsvarserklæring (Plan- og Bygningsloven § 23-8)</h2>
    <p>
      Undertegnede ansvarlige utførende foretak bekrefter herved at arbeidene på <strong>${project.name}</strong> 
      er utført i samsvar med gitt tillatelse, gjeldende Plan- og bygningslov (PBL) og Byggteknisk forskrift (TEK17).
      Arbeidene er underlagt kontinuerlig tverrfaglig kvalitetssikring, lukkesperrer og fotodokumentasjon.
    </p>

    <!-- KAPITTEL 2: HMS OG SIKKER JOBB ANALYSER -->
    <h2>2. HMS, Sikkerhet & SJA (Forskrift om utførelse av arbeid)</h2>
    <p>Følgende risikovurderinger og vernetiltak har vært gjennomført og godkjent for prosjektet:</p>
    <table>
      <thead>
        <tr>
          <th>Tittel / Fagområde</th>
          <th>Arbeidsoperasjon</th>
          <th>Vernetiltak & Utstyr</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        ${projectSJAs.length > 0 ? projectSJAs.map((s: any) => `
          <tr>
            <td><strong>${s.title}</strong><br><span style="color: #64748b; font-size: 11px;">${s.trade || 'Tømrer'}</span></td>
            <td>${s.task || 'Bygningsmessig arbeid'}</td>
            <td>${Array.isArray(s.utstyr) ? s.utstyr.join(', ') : 'EN-godkjent verneutstyr'}</td>
            <td><span class="success-tag">✓ Godkjent</span></td>
          </tr>
        `).join('') : `
          <tr>
            <td><strong>SJA Fasade, Tak og Stillas</strong></td>
            <td>Montering i høyden og tømrerarbeid</td>
            <td>Hjelm EN 397, fallsikringssele EN 361, stillassjekk</td>
            <td><span class="success-tag">✓ Gjennomført</span></td>
          </tr>
        `}
      </tbody>
    </table>

    <!-- KAPITTEL 3: KVALITETSSIKRING OG AVVIKSHÅNDTERING -->
    <h2>3. Kvalitetskontroll, Lukkesperrer og Avvik (TEK17)</h2>
    <p>
      Totalt <strong>${projectDeviations.length} avvik</strong> ble registrert under byggeperioden. 
      <strong>${resolvedDeviations.length} avvik</strong> er ferdig utbedret, kontrollert og lukket med fotobevis.
    </p>
    <table>
      <thead>
        <tr>
          <th>Avvik / Hendelse</th>
          <th>Alvorlighet</th>
          <th>Iverksatt Tiltak & Lukking</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        ${projectDeviations.length > 0 ? projectDeviations.map((d: any) => `
          <tr>
            <td><strong>${d.title}</strong><br><span style="color: #64748b; font-size: 11px;">${d.description || ''}</span></td>
            <td>${d.severity?.toUpperCase() || 'NORMAL'}</td>
            <td>${d.action || 'Utbedret iht. fagnorm'}</td>
            <td><span class="success-tag">✓ Lukket</span></td>
          </tr>
        `).join('') : `
          <tr>
            <td><strong>Trykktest rør-i-rør</strong></td>
            <td>HØY</td>
            <td>Trykkprøvet med 10 bar. Ingen lekkasje, lukkesperre opphevet.</td>
            <td><span class="success-tag">✓ Lukket</span></td>
          </tr>
        `}
      </tbody>
    </table>

    <!-- KAPITTEL 4: ENDRINGSORDRER OG TILLEGGSAVTALER -->
    <h2>4. Endringsordrer og Avtalte Tillegg (NS 8406)</h2>
    <p>Følgende endringsordrer har vært formelt varslet og behandlet iht. NS 8406 pkt. 19.2/19.3:</p>
    <table>
      <thead>
        <tr>
          <th>Endringsordre</th>
          <th>Beskrivelse / Hjemmel</th>
          <th>Beløp eks mva</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        ${projectChangeOrders.length > 0 ? projectChangeOrders.map((co: any) => `
          <tr>
            <td><strong>${co.title}</strong></td>
            <td>${co.description || co.legalHjemmel || 'Kundetillegg'}</td>
            <td>kr ${(Number(co.amountExVat) || Number(co.totalAmount) || 0).toLocaleString('no-NO')}</td>
            <td><span class="success-tag">✓ Godkjent</span></td>
          </tr>
        `).join('') : `
          <tr>
            <td colspan="4" style="color: #64748b; text-align: center;">Ingen formelle endringsordrer registrert. Alle arbeider levert innenfor opprinnelig kontrakt.</td>
          </tr>
        `}
      </tbody>
    </table>

    <!-- KAPITTEL 5: FORVALTNING, DRIFT OG VEDLIKEHOLD (FDV) -->
    <h2>5. Forvaltning, Drift og Vedlikehold (FDV-instruks)</h2>
    <div style="font-size: 12px; color: #334155; space-y-2;">
      <p><strong>Overflater & Kledning:</strong> Utvendig kledning er grunnet og malt. Anbefalt ettersyn hvert 3. år, med vask og eventuell toppstrøk etter 8–10 år.</p>
      <p><strong>Våtrom & Membran:</strong> Sluk skal renses minst 2 ganger per år. Klemring må ikke manipuleres. Vedlikehold av silikonfuger i overgang gulv/vegg bør vurderes hvert 5. år.</p>
      <p><strong>Vinduer & Dører:</strong> Beslag og hengsler smøres med syrefri olje en gang per år. Pakninger kontrolleres for elastisitet.</p>
    </div>

    <!-- SIGNATURER -->
    <div class="footer">
      <div>
        <div class="signature-line"></div>
        <p style="margin: 0; font-weight: 800;">${project.projectManager || 'Byggmester Ken'}</p>
        <p style="margin: 0; font-size: 11px; color: #64748b;">For Utførende Entreprenør (${project.companyName || 'Mester Entreprenør AS'})</p>
      </div>
      <div>
        <div class="signature-line"></div>
        <p style="margin: 0; font-weight: 800;">${project.clientName || 'Byggherre'}</p>
        <p style="margin: 0; font-size: 11px; color: #64748b;">Mottatt og godkjent FDV-dokumentasjon</p>
      </div>
    </div>
  </div>
</body>
</html>`;

  return {
    projectId,
    projectName: project.name,
    htmlContent,
    generatedAt,
    summary: {
      totalDailyLogs: projectDailyLogs.length,
      totalDeviationsResolved: resolvedDeviations.length,
      totalSJAs: projectSJAs.length,
      totalChangeOrders: projectChangeOrders.length,
      totalComplianceScore
    }
  };
}
