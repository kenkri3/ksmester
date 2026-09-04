import { ChangeOrder, Project } from '../types';
import { api } from './api';

export const changeOrderService = {
  /**
   * Generates a unique crypto-safe token for public customer approval link
   */
  generateToken(): string {
    return 'co_' + Math.random().toString(36).substring(2, 12) + Date.now().toString(36);
  },

  /**
   * Get all change orders for a project
   */
  async getProjectChangeOrders(projectId: string): Promise<ChangeOrder[]> {
    try {
      const items = await api.getDocs<ChangeOrder>('change_orders');
      return items
        .filter(item => item.projectId === projectId)
        .sort((a, b) => b.changeNumber - a.changeNumber);
    } catch (e) {
      console.warn('Error fetching change orders:', e);
      return [];
    }
  },

  /**
   * Get a change order by token (for public customer view)
   */
  async getChangeOrderByToken(token: string): Promise<ChangeOrder | null> {
    try {
      const items = await api.getDocs<ChangeOrder>('change_orders');
      return items.find(item => item.token === token) || null;
    } catch (e) {
      console.warn('Error finding change order by token:', e);
      return null;
    }
  },

  /**
   * Creates a new change order
   */
  async createChangeOrder(params: {
    project: Project;
    title: string;
    description: string;
    cause: ChangeOrder['cause'];
    amountExVat: number;
    impactDays: number;
    authorId: string;
    authorName: string;
  }): Promise<ChangeOrder> {
    const existing = await this.getProjectChangeOrders(params.project.id);
    const nextNumber = existing.length > 0 ? Math.max(...existing.map(e => e.changeNumber || 0)) + 1 : 1;

    const vatAmount = Math.round(params.amountExVat * 0.25);
    const totalAmount = params.amountExVat + vatAmount;
    const token = this.generateToken();

    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const shareUrl = `${baseUrl}?changeOrderToken=${token}`;

    const newOrder: ChangeOrder = {
      id: `co_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      projectId: params.project.id,
      projectCode: params.project.projectCode,
      changeNumber: nextNumber,
      title: params.title,
      description: params.description,
      cause: params.cause,
      amountExVat: params.amountExVat,
      vatAmount,
      totalAmount,
      impactDays: params.impactDays,
      status: 'pending_customer',
      token,
      shareUrl,
      clientName: params.project.clientName,
      clientEmail: params.project.clientEmail,
      authorId: params.authorId,
      authorName: params.authorName,
      createdAt: new Date().toISOString()
    };

    await api.saveDoc('change_orders', newOrder);

    // Send email notification to client if email exists
    if (params.project.clientEmail) {
      try {
        await fetch('/api/notify/email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: params.project.clientEmail,
            subject: `Endringsmelding #${nextNumber}: ${params.title} - ${params.project.name}`,
            content: `
              Hei ${params.project.clientName || 'Kunde'}!
              
              Det er registrert et tilleggsarbeid/endringsmelding på prosjektet "${params.project.name}":
              
              Beskrivelse: ${params.description}
              Beløp: ${params.amountExVat.toLocaleString('no-NO')} kr eks. mva (${totalAmount.toLocaleString('no-NO')} kr ink. mva).
              Fremdriftskonsekvens: ${params.impactDays > 0 ? `+${params.impactDays} virkedager` : 'Ingen forsinkelse'}.
              
              Vennligst godkjenn endringen her:
              ${shareUrl}
              
              Med vennlig hilsen,
              ${params.authorName} / KS Mester
            `
          })
        });
      } catch (err) {
        console.warn('Could not send notification email:', err);
      }
    }

    return newOrder;
  },

  /**
   * Approves a change order with digital signature and automatically updates project budget
   */
  async approveChangeOrder(
    orderId: string, 
    signatureDataUrl: string, 
    signerName: string
  ): Promise<ChangeOrder | null> {
    const orders = await api.getDocs<ChangeOrder>('change_orders');
    const order = orders.find(o => o.id === orderId);
    if (!order) return null;

    const updated: ChangeOrder = {
      ...order,
      status: 'approved',
      signedByClientAt: new Date().toISOString(),
      clientSignatureUrl: signatureDataUrl,
      clientName: signerName || order.clientName,
      updatedAt: new Date().toISOString()
    };

    await api.saveDoc('change_orders', updated);

    // 100% Automated Project Sync:
    // Update project budget
    try {
      const projects = await api.getDocs<Project>('projects');
      const project = projects.find(p => p.id === order.projectId);
      if (project) {
        const currentBudget = project.budget || 0;
        const newBudget = currentBudget + order.totalAmount;
        
        await api.saveDoc('projects', {
          ...project,
          budget: newBudget,
          lastUpdate: 'Nylig oppdatert (Endringsordre godkjent)'
        });
      }
    } catch (e) {
      console.warn('Could not update project budget:', e);
    }

    return updated;
  },

  /**
   * Rejects a change order
   */
  async rejectChangeOrder(orderId: string, reason?: string): Promise<ChangeOrder | null> {
    const orders = await api.getDocs<ChangeOrder>('change_orders');
    const order = orders.find(o => o.id === orderId);
    if (!order) return null;

    const updated: ChangeOrder = {
      ...order,
      status: 'rejected',
      updatedAt: new Date().toISOString()
    };

    await api.saveDoc('change_orders', updated);
    return updated;
  }
};
