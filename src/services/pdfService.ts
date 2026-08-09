import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { Project, SJAReport, Deviation } from '../types';

// Extend jsPDF with autotable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

export const pdfService = {
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
      ['Ansvarlig', report.createdBy],
      ['Lokasjon', project.location],
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
    doc.text('Risikovurdering', 20, (doc as any).lastAutoTable.finalY + 15);

    const riskData = report.risikoer.map(risk => [
      risk.aktivitet,
      risk.risiko,
      '', // No consequence in current type, but we can leave it empty or add it
      risk.tiltak
    ]);

    doc.autoTable({
      startY: (doc as any).lastAutoTable.finalY + 20,
      head: [['Aktivitet', 'Fare', 'Konsekvens', 'Tiltak']],
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
      doc.text(`Side ${i} av ${pageCount} - Generert av KS MesterAI Elite`, 105, 285, { align: 'center' });
    }

    doc.save(`SJA_${project.name}_${new Date().toISOString().split('T')[0]}.pdf`);
  },

  async generateDeviationReport(project: Project, deviation: Deviation) {
    const doc = new jsPDF();
    const primaryColor = [220, 38, 38]; // red-600 (for deviations)

    // Header
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(0, 0, 210, 40, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('AVVIKSRAPPORT', 20, 25);
    
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
      ['Alvorlighetsgrad', deviation.severity === 'high' ? 'Kritisk' : deviation.severity === 'medium' ? 'Moderat' : 'Lav'],
      ['Status', deviation.status === 'open' ? 'Åpen' : 'Lukket'],
      ['Beskrivelse', (deviation as any).norwegianDescription || (deviation as any).norwegianVersion || deviation.description],
      ['Tiltak', (deviation as any).norwegianAction || deviation.action || 'Ikke definert']
    ];

    doc.autoTable({
      startY: 60,
      body: details,
      theme: 'plain',
      styles: { cellPadding: 5, fontSize: 10 },
      columnStyles: { 0: { fontStyle: 'bold', width: 40 } }
    });

    if (deviation.imageUrl) {
      doc.text('Vedlegg (Bilde)', 20, (doc as any).lastAutoTable.finalY + 15);
      // Note: In a real app, you'd need to fetch the image and convert to base64
      // For now we just add a placeholder text
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text('Bildevedlegg er tilgjengelig i systemet.', 20, (doc as any).lastAutoTable.finalY + 25);
    }

    doc.save(`AVVIK_${deviation.title}_${new Date().toISOString().split('T')[0]}.pdf`);
  }
};
