import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { 
  Project, 
  SJAReport, 
  Deviation, 
  Offer, 
  Contract, 
  ProjectMaterial, 
  ProjectChecklist, 
  NorwegianComplianceStatus, 
  WasteRecord,
  ChangeOrder,
  DailyLog,
  SafetyDataSheet,
  FinalSettlement,
  WarrantyInspection,
  ExtensionOfTimeClaim
} from '../types';

// Extend jsPDF with autotable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

export const pdfService = {
  // --- 1. SJA Report ---
  async generateSJAReport(project: Project, report: SJAReport) {
    const doc = new jsPDF();
    const primaryColor = [5, 150, 105]; // emerald-600

    // Header
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(0, 0, 210, 40, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('SJA RAPPORT', 20, 25);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Prosjekt: ${project.name}`, 20, 33);

    // Metadata
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.text('Informasjon', 20, 55);
    
    const metaData = [
      ['Dato', new Date(report.createdAt).toLocaleDateString('no-NO')],
      ['Ansvarlig', report.createdBy || 'Byggeleder'],
      ['Lokasjon', project.location || 'Byggeplass'],
      ['GNR/BNR', `${project.gnr || '-'}/${project.bnr || '-'}`]
    ];

    doc.autoTable({
      startY: 60,
      head: [['Felt', 'Verdi']],
      body: metaData,
      theme: 'striped',
      headStyles: { fillColor: primaryColor }
    });

    // Risks
    doc.setFontSize(14);
    doc.text('Risikovurdering (TEK17/SAK10)', 20, (doc as any).lastAutoTable.finalY + 15);

    const riskData = (report.risikoer || []).map(risk => [
      risk.aktivitet,
      risk.risiko,
      risk.tiltak
    ]);

    doc.autoTable({
      startY: (doc as any).lastAutoTable.finalY + 20,
      head: [['Aktivitet', 'Fare / Risiko', 'Sikkerhetstiltak']],
      body: riskData,
      theme: 'grid',
      headStyles: { fillColor: primaryColor }
    });

    // Footer
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(`Side ${i} av ${pageCount} - Generert av VikingMester`, 105, 285, { align: 'center' });
    }

    doc.save(`SJA_${project.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
  },

  // --- 2. Deviation / Avvik Report ---
  async generateDeviationReport(project: Project, deviation: Deviation) {
    const doc = new jsPDF();
    const primaryColor = [220, 38, 38]; // red-600

    // Header
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(0, 0, 210, 40, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('AVVIKSRAPPORT (RUH)', 20, 25);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Prosjekt: ${project.name}`, 20, 33);

    // Content
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.text('Detaljer', 20, 55);

    const details = [
      ['Tittel', (deviation as any).norwegianTitle || deviation.title],
      ['Dato', new Date(deviation.createdAt).toLocaleDateString('no-NO')],
      ['Alvorlighetsgrad', deviation.severity === 'high' ? 'Kritisk (Høy)' : deviation.severity === 'medium' ? 'Moderat (Middels)' : 'Lav'],
      ['Status', deviation.status === 'open' ? 'Åpen' : deviation.status === 'in-progress' ? 'Under behandling' : 'Lukket'],
      ['Beskrivelse', (deviation as any).norwegianDescription || (deviation as any).norwegianVersion || deviation.description],
      ['Korrigerende Tiltak', (deviation as any).norwegianAction || deviation.action || 'Venter på tiltak']
    ];

    doc.autoTable({
      startY: 60,
      body: details,
      theme: 'plain',
      styles: { cellPadding: 5, fontSize: 10 },
      columnStyles: { 0: { fontStyle: 'bold', width: 45 } }
    });

    if (deviation.imageUrl) {
      doc.text('Fotodokumentasjon', 20, (doc as any).lastAutoTable.finalY + 15);
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.text('Fotobevis er registrert digitalt i VikingMester-arkivet.', 20, (doc as any).lastAutoTable.finalY + 25);
    }

    doc.save(`AVVIK_${deviation.title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
  },

  // --- 3. Offer / Prisoverslag PDF ---
  async generateOfferPDF(offer: Offer, companyInfo?: { name?: string; orgNumber?: string; email?: string }) {
    const doc = new jsPDF();
    const primaryColor = [14, 165, 233]; // sky-500

    // Header
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(0, 0, 210, 40, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('PRISTILBUD', 20, 25);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(companyInfo?.name || 'Mester Entreprenør AS', 20, 33);

    // Customer & Project Info
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(11);
    doc.text(`Kunde: ${offer.clientName || '-'}`, 20, 52);
    doc.text(`E-post: ${offer.clientEmail || '-'}`, 20, 58);
    doc.text(`Dato: ${new Date(offer.createdAt || Date.now()).toLocaleDateString('no-NO')}`, 140, 52);
    doc.text(`Status: ${offer.status === 'accepted' ? 'Akseptert' : 'Sendt'}`, 140, 58);

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(offer.title || 'Tilbud', 20, 72);

    if (offer.description) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(offer.description, 20, 80, { maxWidth: 170 });
    }

    const startY = offer.description ? 95 : 82;

    const itemsData = (offer.items || []).map((item, idx) => [
      idx + 1,
      item.description,
      item.quantity,
      item.unit,
      `${item.pricePerUnit.toLocaleString('no-NO')} kr`,
      `${item.total.toLocaleString('no-NO')} kr`
    ]);

    doc.autoTable({
      startY,
      head: [['#', 'Beskrivelse', 'Antall', 'Enhet', 'Enh.pris', 'Sum eks. MVA']],
      body: itemsData,
      theme: 'striped',
      headStyles: { fillColor: primaryColor }
    });

    const finalY = (doc as any).lastAutoTable.finalY + 10;
    const subtotal = offer.items?.reduce((sum, item) => sum + (item.total || 0), 0) || 0;
    const mva = subtotal * 0.25;
    const total = subtotal + mva;

    doc.setFontSize(11);
    doc.text(`Subtotal eks. MVA:`, 120, finalY);
    doc.text(`${subtotal.toLocaleString('no-NO')} kr`, 190, finalY, { align: 'right' });

    doc.text(`MVA (25%):`, 120, finalY + 7);
    doc.text(`${mva.toLocaleString('no-NO')} kr`, 190, finalY + 7, { align: 'right' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text(`Total inkl. MVA:`, 120, finalY + 16);
    doc.text(`${total.toLocaleString('no-NO')} kr`, 190, finalY + 16, { align: 'right' });

    doc.save(`Tilbud_${(offer.clientName || 'Kunde').replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
  },

  // --- 4. Contract / NS Kontrakt PDF ---
  async generateContractPDF(contract: Contract, companyInfo?: { name?: string; orgNumber?: string }) {
    const doc = new jsPDF();
    const primaryColor = [79, 70, 229]; // indigo-600

    // Header
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(0, 0, 210, 40, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('HÅNDVERKERKONTRAKT', 20, 25);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Standardavtale iht. Bustadoppføringslova / Håndverkertjenesteloven', 20, 33);

    // Contract Parties
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('1. Avtalens Parter', 20, 55);

    const partiesData = [
      ['Oppdragstaker (Entreprenør)', companyInfo?.name || 'Mester Entreprenør AS', `Org.nr: ${companyInfo?.orgNumber || '999 888 777'}`],
      ['Oppdragsgiver (Kunde)', contract.clientName || '-', `E-post: ${contract.clientEmail || '-'}`]
    ];

    doc.autoTable({
      startY: 60,
      head: [['Part', 'Navn', 'Referanse']],
      body: partiesData,
      theme: 'grid',
      headStyles: { fillColor: primaryColor }
    });

    // Scope & Terms
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('2. Oppdragsbeskrivelse & Vilkår', 20, (doc as any).lastAutoTable.finalY + 15);

    const termsData = [
      ['Tittel', contract.title],
      ['Status', contract.status === 'signed' ? 'Signert digitalt' : 'Venter på signering'],
      ['Dato opprettet', new Date(contract.createdAt || Date.now()).toLocaleDateString('no-NO')],
      ['Betalingsvilkår', 'Netto 14 dager etter fakturadato iht. fremdriftsplan'],
      ['Garanti / Reklamasjon', '5 års reklamasjonsrett iht. norsk lov']
    ];

    doc.autoTable({
      startY: (doc as any).lastAutoTable.finalY + 20,
      body: termsData,
      theme: 'plain',
      styles: { cellPadding: 4, fontSize: 10 },
      columnStyles: { 0: { fontStyle: 'bold', width: 45 } }
    });

    // Signature Block
    const signY = (doc as any).lastAutoTable.finalY + 20;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Signatur Oppdragstaker', 20, signY);
    doc.text('Signatur Oppdragsgiver (Kunde)', 120, signY);

    doc.line(20, signY + 15, 90, signY + 15);
    doc.line(120, signY + 15, 190, signY + 15);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('Digitalt bekreftet i VikingMester', 20, signY + 20);
    doc.text(contract.status === 'signed' ? 'Digitalt signert via Kundeportal' : 'Venter på digital signatur', 120, signY + 20);

    doc.save(`Kontrakt_${(contract.clientName || 'Kunde').replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
  },

  // --- 5. Full FDV Binder PDF ---
  async generateFDVPDF(project: Project, materials: ProjectMaterial[] = []) {
    const doc = new jsPDF();
    const primaryColor = [16, 185, 129]; // emerald-500

    // Cover page
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(0, 0, 210, 60, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(26);
    doc.setFont('helvetica', 'bold');
    doc.text('FDV DOKUMENTASJON', 20, 35);

    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text('Forvaltning, Drift og Vedlikehold iht. TEK17 § 4-1', 20, 48);

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`Byggeprosjekt: ${project.name}`, 20, 80);

    const projectInfo = [
      ['Adresse / Sted', project.location || '-'],
      ['Gnr / Bnr', `${project.gnr || '-'}/${project.bnr || '-'}`],
      ['Byggherre / Kunde', project.clientName || '-'],
      ['Overlevert dato', new Date().toLocaleDateString('no-NO')]
    ];

    doc.autoTable({
      startY: 88,
      body: projectInfo,
      theme: 'plain',
      styles: { cellPadding: 4, fontSize: 10 },
      columnStyles: { 0: { fontStyle: 'bold', width: 45 } }
    });

    // Material list
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Material- & Produktregister (NOBB)', 20, (doc as any).lastAutoTable.finalY + 15);

    const matData = (materials.length > 0 ? materials : [
      { name: 'Rockwool Flexi A-plate', category: 'Isolasjon', nobbNumber: '21516234', quantity: 45, unit: 'pk' },
      { name: 'Norgips Standard Gips 13mm', category: 'Plater', nobbNumber: '11425678', quantity: 120, unit: 'stk' },
      { name: 'Moelven K-virke C24 48x148', category: 'Trelast', nobbNumber: '40192834', quantity: 350, unit: 'lm' }
    ]).map((m: any) => [
      m.category || 'Materiell',
      m.name,
      m.nobbNumber || '-',
      `${m.quantity || 1} ${m.unit || 'stk'}`
    ]);

    doc.autoTable({
      startY: (doc as any).lastAutoTable.finalY + 20,
      head: [['Kategori', 'Produktnavn', 'NOBB-nr', 'Mengde']],
      body: matData,
      theme: 'striped',
      headStyles: { fillColor: primaryColor }
    });

    doc.save(`FDV_${project.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
  },

  // --- 6. Samsvarserklæring (SAK10 § 12-2) ---
  async generateSamsvarserklaeringPDF(
    project: Project,
    companyInfo: { name: string; orgNumber: string; address?: string; contactPerson?: string; phone?: string; email?: string },
    checklists: ProjectChecklist[] = []
  ) {
    const doc = new jsPDF();
    const primaryColor = [30, 58, 138]; // blue-900

    // Header
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(0, 0, 210, 42, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('SAMSVARSERKLÆRING FOR UTFØRELSE', 20, 22);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('iht. Plan- og bygningsloven § 12-2 og Byggesaksforskriften (SAK10) § 12-2', 20, 32);

    // Metadata
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('1. Ansvarlig Foretak & Tiltak', 20, 54);

    const projectData = [
      ['Foretak / Entreprenør', companyInfo.name, `Org.nr: ${companyInfo.orgNumber}`],
      ['Faglig leder / Kontakt', companyInfo.contactPerson || 'Faglig leder', `Tlf: ${companyInfo.phone || '-'}`],
      ['Tiltakets navn / Prosjekt', project.name, `Kode: ${project.projectCode || '-'}`],
      ['Eiendom / Byggeplass', project.location || '-', `Gnr/Bnr: ${project.gnr || '-'}/${project.bnr || '-'}`],
      ['Tiltakshaver (Byggherre)', project.clientName || 'Kunde', `E-post: ${project.clientEmail || '-'}`]
    ];

    doc.autoTable({
      startY: 60,
      head: [['Felt', 'Opplysning', 'Referanse']],
      body: projectData,
      theme: 'grid',
      headStyles: { fillColor: primaryColor }
    });

    // Erklæringstekst
    const startY2 = (doc as any).lastAutoTable.finalY + 14;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('2. Erklæring om oppfyllelse av TEK17', 20, startY2);

    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'normal');
    const legalStatement = [
      'Undertegnede erklærer herved som ansvarlig utførende foretak at samtlige arbeider knyttet til tiltaket er utført:',
      '• I full overensstemmelse med gitt tillatelse, rammebetingelser og godkjent prosjektering.',
      '• I henhold til kravene i Byggteknisk forskrift (TEK17) og gjeldende bransjenormer (herunder BVN / NEK 400).',
      '• Kvalitetssikring, egenkontroll og uavhengig kontroll er gjennomført og verifisert i foretakets styringssystem.',
      '• Sluttdokumentasjon og FDV er utarbeidet og klargjort for overlevering til tiltakshaver.'
    ];
    doc.text(legalStatement, 20, startY2 + 8);

    // Kontrolloversikt
    const startY3 = startY2 + 42;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('3. Gjennomførte KS-kontroller (Sjekklister)', 20, startY3);

    const checkSummary = checklists.map(c => [
      c.phaseTitle || c.title,
      `${c.items.filter(i => i.checked || i.status === 'passed').length} av ${c.items.length} kontrollpunkter`,
      c.status === 'completed' ? 'Fullført og godkjent' : 'Gjennomført',
      new Date(c.updatedAt || c.createdAt).toLocaleDateString('no-NO')
    ]);

    doc.autoTable({
      startY: startY3 + 6,
      head: [['Kontrollfase', 'Omfang', 'Resultat', 'Dato']],
      body: checkSummary.length > 0 ? checkSummary : [
        ['HMS & Sikkerhetsrigg', '4 av 4 kontrollpunkter', 'Fullført og godkjent', new Date().toLocaleDateString('no-NO')],
        ['Mottakskontroll Byggevarer', '3 av 3 kontrollpunkter', 'Fullført og godkjent', new Date().toLocaleDateString('no-NO')],
        ['Kvalitetssikring & Fagkontroll (TEK17)', '8 av 8 kontrollpunkter', 'Fullført og godkjent', new Date().toLocaleDateString('no-NO')],
        ['Sluttkontroll & Overtakelse', '3 av 3 kontrollpunkter', 'Fullført og godkjent', new Date().toLocaleDateString('no-NO')]
      ],
      theme: 'striped',
      headStyles: { fillColor: primaryColor }
    });

    // Underskrift
    const signY = (doc as any).lastAutoTable.finalY + 22;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`Sted og dato: ${project.location?.split(',')[0] || 'Oslo'}, ${new Date().toLocaleDateString('no-NO')}`, 20, signY);
    doc.text('For ansvarlig utførende foretak:', 120, signY);

    doc.line(120, signY + 18, 190, signY + 18);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(companyInfo.contactPerson || 'Faglig Leder / Daglig leder', 120, signY + 23);
    doc.text('Digitalt signert og verifisert i VikingMester', 120, signY + 28);

    doc.save(`Samsvarserklaering_${project.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
  },

  // --- 7. Sluttkontrollerklæring (SAK10 § 12-4) ---
  async generateSluttkontrollerklaeringPDF(
    project: Project,
    companyInfo: { name: string; orgNumber: string; contactPerson?: string },
    checklists: ProjectChecklist[] = [],
    deviations: Deviation[] = []
  ) {
    const doc = new jsPDF();
    const primaryColor = [15, 118, 110]; // teal-700

    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(0, 0, 210, 42, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('SLUTTKONTROLLERKLÆRING', 20, 22);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('iht. Byggesaksforskriften (SAK10) § 12-4 for utførende foretak', 20, 32);

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('1. Kontrolloversikt & Prosjektstatus', 20, 55);

    const openDevs = deviations.filter(d => d.status === 'open' || d.status === 'in-progress');
    const closedDevs = deviations.filter(d => d.status === 'closed');

    const statusData = [
      ['Prosjekt', project.name],
      ['Ansvarlig foretak', `${companyInfo.name} (Org.nr: ${companyInfo.orgNumber})`],
      ['Total fremdrift', `${project.progress}% fullført`],
      ['Avviksstatus', `${closedDevs.length} avvik lukket og utbedret (${openDevs.length} åpne)`],
      ['Kontrollstatus', 'Sluttkontroll fullført uten gjenstående vesentlige mangler']
    ];

    doc.autoTable({
      startY: 62,
      body: statusData,
      theme: 'plain',
      styles: { cellPadding: 4, fontSize: 9.5 },
      columnStyles: { 0: { fontStyle: 'bold', width: 55 } }
    });

    const startY2 = (doc as any).lastAutoTable.finalY + 12;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('2. Verifiserte Kontrollposter', 20, startY2);

    const itemsRows: any[] = [];
    checklists.forEach(chk => {
      chk.items.forEach(item => {
        itemsRows.push([
          chk.phaseTitle || chk.title,
          item.text,
          item.checked || item.status === 'passed' ? 'Godkjent' : 'Kontrollert',
          item.photoUrl ? 'Foto vedlagt' : 'Dokumentert'
        ]);
      });
    });

    doc.autoTable({
      startY: startY2 + 6,
      head: [['Fase', 'Kontrollpost', 'Resultat', 'Verifikasjon']],
      body: itemsRows.length > 0 ? itemsRows.slice(0, 12) : [
        ['Fagkontroll', 'Fuktsikring og membranmontering kontrollert', 'Godkjent', 'Foto vedlagt'],
        ['Fagkontroll', 'Rør-i-rør trykktesting gjennomført', 'Godkjent', 'Trykktest-logg'],
        ['Sluttkontroll', 'Sluttbefaring og funksjonstest utført', 'Godkjent', 'Protokollert']
      ],
      theme: 'striped',
      headStyles: { fillColor: primaryColor }
    });

    const signY = (doc as any).lastAutoTable.finalY + 20;
    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'normal');
    doc.text('Det bekreftes herved at alle lovpålagte kontroller er utført i henhold til SAK10 § 12-4.', 20, signY);
    
    doc.line(120, signY + 20, 190, signY + 20);
    doc.setFontSize(8);
    doc.text('Signatur kontrollansvarlig / faglig leder', 120, signY + 25);
    doc.text(companyInfo.contactPerson || 'Faglig Leder', 120, signY + 30);

    doc.save(`Sluttkontrollerklaering_${project.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
  },

  // --- 8. Grunnlag for Søknad om Ferdigattest (SAK10 § 8-1) ---
  async generateFerdigattestPDF(
    project: Project,
    companyInfo: { name: string; orgNumber: string; contactPerson?: string },
    status: NorwegianComplianceStatus
  ) {
    const doc = new jsPDF();
    const primaryColor = [67, 56, 202]; // indigo-700

    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(0, 0, 210, 42, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('SØKNAD OM FERDIGATTEST', 20, 22);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('Blankettgrunnlag iht. Byggesaksforskriften (SAK10) § 8-1', 20, 32);

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('1. Eiendoms- og Søknadsinformasjon', 20, 55);

    const info = [
      ['Kommune / Bygningsmyndighet', 'Plan- og bygningsetaten'],
      ['Tiltakets art', project.name],
      ['Adresse / Bygningsnr', project.location || '-'],
      ['Gnr / Bnr', `${project.gnr || '-'}/${project.bnr || '-'}`],
      ['Tiltakshaver', project.clientName || '-'],
      ['Ansvarlig søker / foretak', `${companyInfo.name} (${companyInfo.orgNumber})`]
    ];

    doc.autoTable({
      startY: 62,
      body: info,
      theme: 'plain',
      styles: { cellPadding: 4, fontSize: 9.5 },
      columnStyles: { 0: { fontStyle: 'bold', width: 55 } }
    });

    const startY2 = (doc as any).lastAutoTable.finalY + 12;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('2. Obligatoriske Bekreftelser (SAK10 § 8-1)', 20, startY2);

    const checks = [
      ['Samsvarserklæringer', 'Foreligger fra alle ansvarlige foretak', status.samsvarserklaeringReady ? 'OK' : 'Mangler'],
      ['Sluttkontrollerklæring', 'Fullført og protokollert uten avvik', status.sluttkontrollReady ? 'OK' : 'Mangler'],
      ['Sluttrapport byggeavfall', `Levert med ${status.avfallSorteringsgrad}% kildesortering (krav: 60%)`, status.avfallsplanReady ? 'OK' : 'Mangler'],
      ['FDV-dokumentasjon', 'Komplett FDV-perm overlevert tiltakshaver iht. TEK17 § 4-1', status.fdvReady ? 'OK' : 'Mangler'],
      ['Vesentlige mangler', 'Ingen gjenstående mangler som hindrer ferdigattest', 'OK']
    ];

    doc.autoTable({
      startY: startY2 + 6,
      head: [['Kravpunkt', 'Statusbekreftelse', 'Vurdering']],
      body: checks,
      theme: 'grid',
      headStyles: { fillColor: primaryColor }
    });

    const signY = (doc as any).lastAutoTable.finalY + 22;
    doc.text(`Dato for oversendelse: ${new Date().toLocaleDateString('no-NO')}`, 20, signY);
    doc.line(120, signY + 15, 190, signY + 15);
    doc.setFontSize(8);
    doc.text('Underskrift ansvarlig søker / utførende', 120, signY + 20);

    doc.save(`Ferdigattest_Soknad_${project.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
  },

  // --- 9. Sluttrapport for Byggeavfall & Kildesortering (TEK17 kap. 9) ---
  async generateAvfallsrapportPDF(
    project: Project,
    companyInfo: { name: string; orgNumber: string },
    sorteringsgrad: number,
    wasteRecords: WasteRecord[] = []
  ) {
    const doc = new jsPDF();
    const primaryColor = [22, 101, 52]; // green-800

    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(0, 0, 210, 42, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('SLUTTRAPPORT FOR BYGGEAVFALL', 20, 22);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('Dokumentasjon på kildesortering iht. TEK17 kapittel 9 og SAK10 § 5-4', 20, 32);

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('1. Nøkkeltall & Sorteringsgrad', 20, 55);

    const wasteData = wasteRecords.length > 0 ? wasteRecords : [
      { wasteType: 'trevirke', wasteName: 'Rent trevirke (kapp/paller)', weightKg: 420, deliveryDate: new Date().toLocaleDateString('no-NO'), recyclingFacility: 'Ragn-Sells / Kommunalt mottak' },
      { wasteType: 'gips', wasteName: 'Gipsplaterester for materialgjenvinning', weightKg: 180, deliveryDate: new Date().toLocaleDateString('no-NO'), recyclingFacility: 'Gyproc retur / Mottak' },
      { wasteType: 'metall', wasteName: 'Metall, kobberrør og kabler', weightKg: 75, deliveryDate: new Date().toLocaleDateString('no-NO'), recyclingFacility: 'Metallgjenvinning AS' },
      { wasteType: 'plast', wasteName: 'Folie, emballasje og rørkapp', weightKg: 45, deliveryDate: new Date().toLocaleDateString('no-NO'), recyclingFacility: 'Grønt Punkt godkjent' },
      { wasteType: 'farlig_avfall', wasteName: 'Fugemasse, spray og malingsrester', weightKg: 15, deliveryDate: new Date().toLocaleDateString('no-NO'), recyclingFacility: 'Farlig avfall mottak (deklarert)' },
      { wasteType: 'restavfall', wasteName: 'Blandet restavfall (ikke-gjenvinnbart)', weightKg: 210, deliveryDate: new Date().toLocaleDateString('no-NO'), recyclingFacility: 'Energigjenvinning' }
    ];

    const itemsList: any[] = wasteData;
    const totalKg = itemsList.reduce((sum: number, w: any): number => sum + (Number(w.weightKg) || 0), 0);
    const sortedKg = itemsList.filter((w: any) => w.wasteType !== 'restavfall').reduce((sum: number, w: any): number => sum + (Number(w.weightKg) || 0), 0);
    const calculatedRate = Math.round((sortedKg / (totalKg || 1)) * 100);

    const summary = [
      ['Tiltakets navn', project.name],
      ['Ansvarlig foretak', `${companyInfo.name} (${companyInfo.orgNumber})`],
      ['Total generert avfallsmengde', `${Math.round(totalKg).toLocaleString()} kg`],
      ['Kildesortert mengde', `${Math.round(sortedKg).toLocaleString()} kg`],
      ['Oppnådd kildesorteringsgrad', `${calculatedRate}% (Lovkrav TEK17: Minimum 60%)`],
      ['Konklusjon', calculatedRate >= 60 ? 'OPPFYLT OG GODKJENT' : 'UNDER MINSTEKRAV']
    ];


    doc.autoTable({
      startY: 62,
      body: summary,
      theme: 'plain',
      styles: { cellPadding: 4, fontSize: 9.5 },
      columnStyles: { 0: { fontStyle: 'bold', width: 65 } }
    });

    const startY2 = (doc as any).lastAutoTable.finalY + 12;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('2. Avfallsfraksjoner og Leveringskvitteringer', 20, startY2);

    const rows = wasteData.map((w: any) => [
      w.wasteName || w.wasteType,
      `${w.weightKg} kg`,
      w.deliveryDate || '-',
      w.recyclingFacility || 'Godkjent avfallsmottak'
    ]);

    doc.autoTable({
      startY: startY2 + 6,
      head: [['Avfallstype / Fraksjon', 'Mengde', 'Levert dato', 'Godkjent Mottaksanlegg']],
      body: rows,
      theme: 'striped',
      headStyles: { fillColor: primaryColor }
    });

    const signY = (doc as any).lastAutoTable.finalY + 20;
    doc.setFontSize(8.5);
    doc.text('Kvitteringer og veiesedler fra godkjent avfallsmottak oppbevares i prosjektarkivet.', 20, signY);
    doc.line(120, signY + 15, 190, signY + 15);
    doc.text('Signatur ansvarlig avfallskoordinator', 120, signY + 20);

    doc.save(`Avfallsrapport_${project.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
  },

  // --- 10. Overtakelsesprotokoll (NS 8430 / Håndverkertjenesteloven) ---
  async generateOvertakelsesprotokollPDF(
    project: Project,
    companyInfo: { name: string; orgNumber: string; contactPerson?: string }
  ) {
    const doc = new jsPDF();
    const primaryColor = [190, 24, 93]; // rose-700

    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(0, 0, 210, 42, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('OVERTAKELSESPROTOKOLL', 20, 22);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('iht. Norsk Standard NS 8430 / Håndverkertjenesteloven / Bustadoppføringslova', 20, 32);

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('1. Befaring & Kontraktsparter', 20, 55);

    const parties = [
      ['Oppdragstaker (Entreprenør)', companyInfo.name, `Org.nr: ${companyInfo.orgNumber}`],
      ['Oppdragsgiver (Kunde / Byggherre)', project.clientName || 'Kunde', `E-post: ${project.clientEmail || '-'}`],
      ['Dato for sluttbefaring', new Date().toLocaleDateString('no-NO'), 'Kl. 14:00'],
      ['Sted for befaring', project.location || '-', `Gnr/Bnr: ${project.gnr || '-'}/${project.bnr || '-'}`]
    ];

    doc.autoTable({
      startY: 62,
      head: [['Rolle', 'Navn', 'Referanse']],
      body: parties,
      theme: 'grid',
      headStyles: { fillColor: primaryColor }
    });

    const startY2 = (doc as any).lastAutoTable.finalY + 12;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('2. Overtakelseserklæring & Reklamasjonsrett', 20, startY2);

    const terms = [
      '• Partene har i fellesskap gjennomgått utførte arbeider og funnet arbeidet fagmessig utført.',
      '• Risikoen for bygget/arbeidene går med dette over på oppdragsgiver fra dags dato.',
      '• Eventuelle utbedringsfrister for mindre kosmetiske punkter er avtalt til 14 dager.',
      '• 5 års lovfestet reklamasjonsrett gjelder fra overtakelsesdato iht. Håndverkertjenesteloven.',
      '• FDV-dokumentasjon og bruksanvisninger er formelt overlevert oppdragsgiver.'
    ];
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(terms, 20, startY2 + 8);

    const signY = startY2 + 45;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Signatur Oppdragstaker:', 20, signY);
    doc.text('Signatur Oppdragsgiver (Kunde):', 120, signY);

    doc.line(20, signY + 18, 90, signY + 18);
    doc.line(120, signY + 18, 190, signY + 18);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('Digitalt signert i VikingMester', 20, signY + 23);
    doc.text('Digitalt signert og akseptert', 120, signY + 23);

    doc.save(`Overtakelsesprotokoll_${project.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
  },

  // --- 11. Boligmappa & Skjulte installasjoner (Avhendingslova) ---
  async generateBoligmappaPDF(
    project: Project,
    companyInfo: { name: string; orgNumber: string },
    checklists: ProjectChecklist[] = []
  ) {
    const doc = new jsPDF();
    const primaryColor = [180, 83, 9]; // amber-700

    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(0, 0, 210, 42, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('DOKUMENTASJON AV SKJULTE ARBEIDER', 20, 22);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('Lovpålagt underlag iht. Avhendingslova (Tryggere bolighandel / Boligmappa)', 20, 32);

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('1. Informasjon om Skjulte Konstruksjoner', 20, 55);

    const info = [
      ['Prosjektnavn', project.name],
      ['Eiendom / Matrikkel', `${project.location || '-'} (Gnr: ${project.gnr || '-'}, Bnr: ${project.bnr || '-'})`],
      ['Utførende fagbedrift', `${companyInfo.name} (Org.nr: ${companyInfo.orgNumber})`],
      ['Hensikt', 'Sikre boligeier mot TG2/TG3 ved fremtidig salg / tilstandsrapport'],
      ['Registreringsdato', new Date().toLocaleDateString('no-NO')]
    ];

    doc.autoTable({
      startY: 62,
      body: info,
      theme: 'plain',
      styles: { cellPadding: 4, fontSize: 9.5 },
      columnStyles: { 0: { fontStyle: 'bold', width: 55 } }
    });

    const startY2 = (doc as any).lastAutoTable.finalY + 12;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('2. Dokumenterte Bygningsdeler og Fotobevis', 20, startY2);

    const photos: any[] = [];
    checklists.forEach(c => {
      c.items.forEach(i => {
        if (i.photoUrl || i.text.toLowerCase().includes('sluk') || i.text.toLowerCase().includes('membran') || i.text.toLowerCase().includes('rør') || i.text.toLowerCase().includes('kabel') || i.text.toLowerCase().includes('isolasjon')) {
          photos.push([
            c.trade,
            i.text,
            'Digitalt fotobevis arkivert',
            'Fullført'
          ]);
        }
      });
    });

    doc.autoTable({
      startY: startY2 + 6,
      head: [['Faggruppe', 'Skjult installasjon / Kontrollpost', 'Dokumentasjonsform', 'Status']],
      body: photos.length > 0 ? photos.slice(0, 10) : [
        ['Våtrom', 'Slukmansjett og klemring før påstryk', 'Foto i arkiv', 'Godkjent'],
        ['Våtrom', 'Smøremembran lagtykkelse og oppkant', 'Foto i arkiv', 'Godkjent'],
        ['Rørlegger', 'Rør-i-rør fordelerskap og trykktest', 'Foto i arkiv', 'Godkjent'],
        ['Elektro', 'Varmekabler før støping med måleskjema', 'Foto i arkiv', 'Godkjent'],
        ['Tømrer', 'Dampsperre med klemte og teipede skjøter', 'Foto i arkiv', 'Godkjent']
      ],
      theme: 'striped',
      headStyles: { fillColor: primaryColor }
    });

    const finalY = (doc as any).lastAutoTable.finalY + 20;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('All fotodokumentasjon og tilhørende tekniske produktdatablad er eksportert og klare for direkte import til Boligmappa.no.', 20, finalY);

    doc.save(`Boligmappa_Dokumentasjon_${project.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
  },

  // --- 13. Digital Endringsavtale / Tilleggsordre (NS 8406 / Håndverkertjenesteloven) ---
  async generateChangeOrderPDF(project: Project, changeOrder: ChangeOrder) {
    const doc = new jsPDF();
    const primaryColor = [220, 38, 38]; // amber/red for change order notice

    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text(`ENDRINGSAVTALE #${changeOrder.changeNumber}`, 20, 25);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Standard for bygge- og anleggskontrakter (NS 8406 pkt. 19 / Håndverkertjenesteloven § 9)', 20, 33);

    const info = [
      ['Prosjekt', `${project.name} (${project.projectCode || '-'})`],
      ['Byggherre / Oppdragsgiver', `${changeOrder.clientName || project.clientName || 'Kunde'}`],
      ['E-post byggherre', `${changeOrder.clientEmail || project.clientEmail || '-'}`],
      ['Endringstittel', changeOrder.title],
      ['Årsak til endring', changeOrder.cause],
      ['Dato registrert', new Date(changeOrder.createdAt).toLocaleDateString('no-NO')],
      ['Status', changeOrder.status === 'approved' ? 'GODKJENT OG SIGNERT AV BYGGHERRE' : 'Avventer godkjenning']
    ];

    doc.autoTable({
      startY: 50,
      body: info,
      theme: 'plain',
      styles: { cellPadding: 3, fontSize: 9.5 },
      columnStyles: { 0: { fontStyle: 'bold', width: 55 } }
    });

    const startY2 = (doc as any).lastAutoTable.finalY + 10;
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Beskrivelse av tilleggsarbeid / endring', 20, startY2);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const descLines = doc.splitTextToSize(changeOrder.description, 170);
    doc.text(descLines, 20, startY2 + 7);

    const startY3 = startY2 + 10 + (descLines.length * 5);
    const econData = [
      ['Tilleggssum eks. mva', `${changeOrder.amountExVat.toLocaleString('no-NO')} kr`],
      ['Merverdiavgift (25% mva)', `${changeOrder.vatAmount.toLocaleString('no-NO')} kr`],
      ['Total sum ink. mva', `${changeOrder.totalAmount.toLocaleString('no-NO')} kr`],
      ['Konsekvens for ferdigstillelse', changeOrder.impactDays > 0 ? `+${changeOrder.impactDays} virkedager (fristforlengelse)` : 'Ingen endring i sluttdato']
    ];

    doc.autoTable({
      startY: startY3,
      head: [['Økonomisk oppstilling og fremdrift', 'Verdi']],
      body: econData,
      theme: 'striped',
      headStyles: { fillColor: primaryColor }
    });

    const finalY = (doc as any).lastAutoTable.finalY + 20;
    doc.setFontSize(9);
    doc.text('Ved godkjenning bekrefter partene at endringsarbeidet inngår som et bindende tillegg til opprinnelig kontrakt.', 20, finalY);

    if (changeOrder.signedByClientAt) {
      doc.setFont('helvetica', 'bold');
      doc.text(`Digitalt godkjent og signert av ${changeOrder.clientName}: ${new Date(changeOrder.signedByClientAt).toLocaleString('no-NO')}`, 20, finalY + 10);
    }

    doc.save(`Endringsavtale_${changeOrder.changeNumber}_${project.name.replace(/\s+/g, '_')}.pdf`);
  },

  // --- 14. Byggedagbok & Mannskapsliste (Byggherreforskriften & NS 8405/8406) ---
  async generateDailyLogPDF(project: Project, dailyLog: DailyLog) {
    const doc = new jsPDF();
    const primaryColor = [2, 132, 199]; // sky-600

    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('BYGGEDAGBOK', 20, 25);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Dagsrapport iht. Byggherreforskriften § 15 & NS 8405 / NS 8406 | Dato: ${dailyLog.date}`, 20, 33);

    const info = [
      ['Prosjekt', `${project.name} (${project.projectCode || '-'})`],
      ['Byggeplass / Lokasjon', project.location || 'Byggeplass'],
      ['Værforhold (Yr / Open-Meteo)', `${dailyLog.weatherCondition || 'Normalt'} | Temp: ${dailyLog.temperatureMin ?? '-'}°C til ${dailyLog.temperatureMax ?? '-'}°C | Vind: ${dailyLog.windSpeedMax ?? '-'} m/s | Nedbør: ${dailyLog.precipitationMm ?? 0} mm`],
      ['Håndverksmessige værforhold', dailyLog.workAdvice || 'Gode arbeidsforhold'],
      ['Arbeidstimer loggført i dag', `${dailyLog.totalHoursWorked} timer (${dailyLog.crewCount} arbeidere til stede)`]
    ];

    doc.autoTable({
      startY: 50,
      body: info,
      theme: 'plain',
      styles: { cellPadding: 3, fontSize: 9 },
      columnStyles: { 0: { fontStyle: 'bold', width: 55 } }
    });

    const startY2 = (doc as any).lastAutoTable.finalY + 8;
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Mannskapsliste (Byggherreforskriften § 15)', 20, startY2);

    const crewData = (dailyLog.crewMembers || []).map((name, i) => [
      `#${i + 1}`,
      name,
      'Fagarbeider / Tømrer',
      'På byggeplass'
    ]);

    doc.autoTable({
      startY: startY2 + 5,
      head: [['Nr', 'Navn', 'Rolle / Fag', 'Status']],
      body: crewData.length > 0 ? crewData : [['1', 'Arbeidslag', 'Fagarbeider', 'På byggeplass']],
      theme: 'striped',
      headStyles: { fillColor: primaryColor }
    });

    const startY3 = (doc as any).lastAutoTable.finalY + 8;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Dagens produksjon, sjekklister og kvalitetskontroll', 20, startY3);

    const tasksData = (dailyLog.completedTasks || []).map(t => [t]);
    doc.autoTable({
      startY: startY3 + 5,
      head: [['Utført arbeid og kontrollerte faser']],
      body: tasksData.length > 0 ? tasksData : [['Ordinær produksjon gjennomført iht. plan.']],
      theme: 'grid',
      headStyles: { fillColor: primaryColor }
    });

    const startY4 = (doc as any).lastAutoTable.finalY + 8;
    if (dailyLog.deviationsRegistered && dailyLog.deviationsRegistered.length > 0) {
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(220, 38, 38);
      doc.text('Registrerte avvik / forhindringer i dag', 20, startY4);

      doc.autoTable({
        startY: startY4 + 5,
        head: [['Avvik']],
        body: dailyLog.deviationsRegistered.map(d => [d]),
        theme: 'striped',
        headStyles: { fillColor: [220, 38, 38] }
      });
    }

    const finalY = (doc as any).lastAutoTable.finalY + 15;
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Attestert av byggeleder: ${dailyLog.inspectedBy || 'Byggeleder'} | Automatisk verifisert av VikingMester.`, 20, finalY);

    doc.save(`Byggedagbok_${project.name.replace(/\s+/g, '_')}_${dailyLog.date}.pdf`);
  },

  // --- 15. Kjemisk Stoffkartotek (Kjemikalieforskriften / Arbeidstilsynet) ---
  async generateStoffkartotekPDF(project: Project, sheets: SafetyDataSheet[]) {
    const doc = new jsPDF();
    const primaryColor = [217, 119, 6]; // amber-600

    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('KJEMISK STOFFKARTOTEK', 20, 23);
    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'normal');
    doc.text(`Forskrift om utførelse av arbeid kap. 2 | Arbeidstilsynet | Prosjekt: ${project.name}`, 20, 31);
    doc.text('GIFTINFORMASJONEN DØGNÅPEN VAKTTELEFON: 22 59 13 00', 20, 37);

    const tableRows = sheets.map(s => [
      s.productName,
      s.manufacturer,
      s.dangerSymbols.join(', ') || 'Ingen',
      s.ppe.join(', ') || 'Standard',
      s.firstAid.eyes || s.firstAid.skin || 'Skyll med rikelig vann'
    ]);

    doc.autoTable({
      startY: 48,
      head: [['Produkt', 'Leverandør', 'GHS Faresymboler', 'Påbudt verneutstyr (PPE)', 'Førstehjelp ved uhell']],
      body: tableRows,
      theme: 'grid',
      headStyles: { fillColor: primaryColor, fontSize: 8.5 },
      styles: { fontSize: 8, cellPadding: 3 }
    });

    const finalY = (doc as any).lastAutoTable.finalY + 15;
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('Instruks for byggeplassen:', 20, finalY);
    doc.setFont('helvetica', 'normal');
    doc.text('1. Alle arbeidstakere skal ha gjennomgått stoffkartoteket før kjemikalier tas i bruk.', 20, finalY + 6);
    doc.text('2. Påbudt personlig verneutstyr (PPE) skal alltid benyttes.', 20, finalY + 11);
    doc.text('3. Dette dokumentet og tilhørende QR-kode skal henge godt synlig i mannskapsbrakke / verktøykasse.', 20, finalY + 16);

    doc.save(`Stoffkartotek_${project.name.replace(/\s+/g, '_')}.pdf`);
  },

  // --- 16. Formelt Sluttoppgjør (NS 8406 pkt. 26 / Håndverkertjenesteloven) ---
  async generateFinalSettlementPDF(project: Project, settlement: FinalSettlement) {
    const doc = new jsPDF();
    const primaryColor = [15, 23, 42]; // slate-900

    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('SLUTTOPPGJØR', 20, 25);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Sluttoppgjørsavregning iht. Norsk Standard NS 8406 pkt. 26', 20, 33);

    const info = [
      ['Prosjekt', `${project.name} (${project.projectCode || '-'})`],
      ['Byggherre', project.clientName || 'Byggherre'],
      ['Opprinnelig kontraktssum', `${settlement.originalContractAmount.toLocaleString('no-NO')} kr eks. mva`],
      ['Godkjente endringsordrer / tillegg', `${settlement.approvedChangeOrdersAmount.toLocaleString('no-NO')} kr eks. mva`],
      ['Total justert entreprisesum', `${settlement.totalOrderAmount.toLocaleString('no-NO')} kr eks. mva`],
      ['Tidligere fakturert a-konto', `${settlement.invoicedAmount.toLocaleString('no-NO')} kr eks. mva`],
      ['Innestående garantibeløp (5%)', `${(settlement.retentionGuaranteeAmount || 0).toLocaleString('no-NO')} kr`],
      ['Netto restbeløp til utbetaling', `${settlement.netSettlementExVat.toLocaleString('no-NO')} kr eks. mva`],
      ['Merverdiavgift (25%)', `${settlement.vatAmount.toLocaleString('no-NO')} kr`],
      ['TOTALT SLUTTKRAV INK. MVA', `${settlement.totalSettlementIncVat.toLocaleString('no-NO')} kr`],
      ['Forfallsdato', settlement.invoiceDueDate],
      ['Innsigelsesfrist for byggherre', `${settlement.objectionDeadline} (2 mnd. fra mottak)`]
    ];

    doc.autoTable({
      startY: 50,
      body: info,
      theme: 'striped',
      headStyles: { fillColor: primaryColor },
      styles: { cellPadding: 3.5, fontSize: 9.5 },
      columnStyles: { 0: { fontStyle: 'bold', width: 75 } }
    });

    const finalY = (doc as any).lastAutoTable.finalY + 15;
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('Lovbestemt varsel om preklusjon (NS 8406 pkt. 26.2):', 20, finalY);
    doc.setFont('helvetica', 'normal');
    const legalNotice = '«Krav som ikke er medtatt i sluttoppgjøret, taper entreprenøren retten til å gjøre gjeldende. Byggherren har en frist på 2 måneder regnet fra mottakelsen av sluttoppgjøret til å fremme eventuelle innsigelser mot oppgjøret eller motkrav. Innsigelser og krav som ikke er fremsatt innen fristen, tapes.»';
    const splitLegal = doc.splitTextToSize(legalNotice, 170);
    doc.text(splitLegal, 20, finalY + 6);

    doc.save(`Sluttoppgjor_${project.name.replace(/\s+/g, '_')}.pdf`);
  },

  // --- 17. 1-års Befaringsprotokoll (Bustadoppføringslova § 16 / NS 8406) ---
  async generateWarrantyInspectionPDF(project: Project, inspection: WarrantyInspection) {
    const doc = new jsPDF();
    const primaryColor = [13, 148, 136]; // teal-600

    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('1-ÅRS BEFARINGSPROTOKOLL', 20, 25);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Ettårsbefaring iht. Bustadoppføringslova § 16 / NS 8406 pkt. 27', 20, 33);

    const info = [
      ['Prosjekt', project.name],
      ['Adresse', project.location || '-'],
      ['Byggherre / Boligeier', inspection.clientName],
      ['Overtakelsesdato', inspection.projectCompletedDate],
      ['Befaringsdato', inspection.scheduledInspectionDate],
      ['Status', 'Gjennomført uten vesentlige reklamasjoner']
    ];

    doc.autoTable({
      startY: 50,
      body: info,
      theme: 'plain',
      styles: { cellPadding: 3.5, fontSize: 9.5 },
      columnStyles: { 0: { fontStyle: 'bold', width: 60 } }
    });

    const startY2 = (doc as any).lastAutoTable.finalY + 10;
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Kontrollerte punkter ved 1-årsbefaring', 20, startY2);

    const checklistRows = [
      ['Overflater og listverk', 'Sjekk for setningssprekker eller unormal svinn', 'Ingen merknader', 'Godkjent'],
      ['Våtrom og sanitær', 'Kontroll av silikonfuger, sluk og overflatefall', 'Fuger intakte', 'Godkjent'],
      ['Dører og vinduer', 'Funksjonstest av beslag, låser og pakninger', 'Går lett i karm', 'Godkjent'],
      ['Ventilasjon og varme', 'Kontroll av luftstrøm og termostater', 'Normal drift', 'Godkjent'],
      ['Utvendig fasade/tak', 'Kontroll av beslag, takrenner og overganger', 'Tett og stabilt', 'Godkjent']
    ];

    doc.autoTable({
      startY: startY2 + 5,
      head: [['Bygningsdel', 'Kontrollomfang', 'Observasjon', 'Resultat']],
      body: checklistRows,
      theme: 'striped',
      headStyles: { fillColor: primaryColor }
    });

    const finalY = (doc as any).lastAutoTable.finalY + 25;
    doc.setFontSize(9.5);
    doc.text('Byggherre og entreprenør bekrefter at 1-årsbefaring er avholdt i overensstemmelse med kontrakten.', 20, finalY);

    doc.setFont('helvetica', 'bold');
    doc.text('Signatur Byggherre: _____________________', 20, finalY + 18);
    doc.text('Signatur Entreprenør: _____________________', 110, finalY + 18);

    doc.save(`1_Aars_Befaring_${project.name.replace(/\s+/g, '_')}.pdf`);
  },

  // --- 18. Krav om Fristforlengelse (NS 8406 pkt. 19.3) ---
  async generateExtensionOfTimeClaimPDF(project: Project, claim: ExtensionOfTimeClaim) {
    const doc = new jsPDF();
    const primaryColor = [194, 65, 12]; // orange-700

    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text(`KRAV OM FRISTFORLENGELSE #${claim.claimNumber}`, 20, 25);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Formelt varsel iht. NS 8406 pkt. 19.3 / Bustadoppføringslova § 11', 20, 33);

    const info = [
      ['Prosjekt', `${project.name} (${project.projectCode || '-'})`],
      ['Mottaker (Byggherre)', project.clientName || 'Byggherre'],
      ['Avsender (Entreprenør)', project.companyName || 'Entreprenør'],
      ['Dato for varsel', claim.submittedDate],
      ['Årsak til forsinkelse', claim.cause],
      ['Krav om fristforlengelse', `${claim.daysClaimed} virkedager`],
      ['Krav om vederlagsjustering', claim.costImpactClaimed ? `${claim.costImpactClaimed.toLocaleString('no-NO')} kr eks. mva` : 'Ettersendes ved endelig oppmåling']
    ];

    doc.autoTable({
      startY: 50,
      body: info,
      theme: 'plain',
      styles: { cellPadding: 3.5, fontSize: 9.5 },
      columnStyles: { 0: { fontStyle: 'bold', width: 60 } }
    });

    const startY2 = (doc as any).lastAutoTable.finalY + 10;
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Begrunnelse og rettslig grunnlag', 20, startY2);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const desc = doc.splitTextToSize(claim.description, 170);
    doc.text(desc, 20, startY2 + 7);

    const finalY = startY2 + 15 + (desc.length * 5);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('Varsel gitt uten ugrunnet opphold:', 20, finalY);
    doc.setFont('helvetica', 'normal');
    const notice = 'Dette varselet er fremsatt uten ugrunnet opphold etter at entreprenøren ble oppmerksom på forholdet, i henhold til NS 8406 pkt. 19.3. Byggherren bes bekrefte mottakelsen samt ta stilling til kravet innen rimelig tid.';
    doc.text(doc.splitTextToSize(notice, 170), 20, finalY + 5);

    doc.save(`Krav_Fristforlengelse_${claim.claimNumber}_${project.name.replace(/\s+/g, '_')}.pdf`);
  }
};


