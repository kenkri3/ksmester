import { WarrantyInspection, Project } from '../types';
import { api } from './api';

export const warrantyInspectionService = {
  /**
   * Get warranty inspection for a project
   */
  async getProjectWarranty(projectId: string): Promise<WarrantyInspection | null> {
    try {
      const items = await api.getDocs<WarrantyInspection>('warranty_inspections');
      return items.find(i => i.projectId === projectId) || null;
    } catch (e) {
      console.warn('Error fetching warranty inspection:', e);
      return null;
    }
  },

  /**
   * Schedules a 1-year warranty inspection 11 months after project handover
   */
  async scheduleWarrantyInspection(project: Project): Promise<WarrantyInspection> {
    const completedDate = project.endDate || new Date().toISOString().split('T')[0];
    
    // Target date: 11 months later
    const target = new Date(completedDate);
    target.setMonth(target.getMonth() + 11);
    const scheduledDate = target.toISOString().split('T')[0];

    const existing = await this.getProjectWarranty(project.id);
    const inspection: WarrantyInspection = {
      id: existing ? existing.id : `wi_${project.id}`,
      projectId: project.id,
      projectName: project.name,
      clientName: project.clientName || 'Kunde',
      clientEmail: project.clientEmail,
      projectCompletedDate: completedDate,
      scheduledInspectionDate: scheduledDate,
      status: existing?.status || 'scheduled',
      createdAt: existing?.createdAt || new Date().toISOString()
    };

    await api.saveDoc('warranty_inspections', inspection);
    return inspection;
  },

  /**
   * Send automated invitation to client
   */
  async sendClientInvitation(inspectionId: string, companyName?: string): Promise<boolean> {
    const items = await api.getDocs<WarrantyInspection>('warranty_inspections');
    const inspection = items.find(i => i.id === inspectionId);
    if (!inspection || !inspection.clientEmail) return false;

    try {
      await fetch('/api/notify/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: inspection.clientEmail,
          subject: `Invitasjon til 1-års garanti-inspeksjon: ${inspection.projectName}`,
          content: `
            Hei ${inspection.clientName}!
            
            Det nærmer seg nå 1 år siden vi fullførte prosjektet "${inspection.projectName}".
            
            Som en del av vår kvalitetsgaranti og i henhold til Bustadoppføringslova § 16 / NS 8406, ønsker vi å invitere deg til en hyggelig og uforpliktende 1-årsbefaring.
            
            Under befaringen går vi gjennom utført arbeid, sjekker at alt fungerer som det skal, og retter opp eventuelle småjusteringer.
            
            Foreslått tidsrom: ${new Date(inspection.scheduledInspectionDate).toLocaleDateString('no-NO')}
            
            Vennligst ta kontakt med oss for å avtale nøyaktig tidspunkt som passer for deg.
            
            Med vennlig hilsen,
            ${companyName || 'Byggmesteren'} / KS Mester
          `
        })
      });

      await api.saveDoc('warranty_inspections', {
        ...inspection,
        status: 'invitation_sent',
        invitationSentAt: new Date().toISOString()
      });

      return true;
    } catch (e) {
      console.warn('Could not send warranty invitation email:', e);
      return false;
    }
  }
};
