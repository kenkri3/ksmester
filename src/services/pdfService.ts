import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { Project, SJAReport, Deviation, Offer, Contract, ProjectMaterial } from '../types';

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
      doc.text(`Side ${i} av ${pageCount} - Generert av KS MesterAI`, 105, 285, { align: 'center' });
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
      doc.text('Fotobevis er registrert digitalt i KS MesterAI-arkivet.', 20, (doc as any).lastAutoTable.finalY + 25);
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
    doc.text('Digitalt bekreftet i KS MesterAI', 20, signY + 20);
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
  }
};
