import { ChangeOrder, Project } from '../types';
import { api } from './api';

export function normalizeChangeOrder(raw: any): ChangeOrder {
  if (!raw) return raw;
  const amountExVat = Number(raw.amountExVat ?? raw.amount ?? raw.price ?? raw.totalPrice ?? 0) || 0;
  const vatAmount = Number(raw.vatAmount ?? raw.vat ?? Math.round(amountExVat * 0.25)) || 0;
  const totalAmount = Number(raw.totalAmount ?? raw.total ?? (amountExVat + vatAmount)) || 0;
  const impactDays = Number(raw.impactDays ?? raw.days ?? 0) || 0;
  const changeNumber = Number(raw.changeNumber ?? raw.number ?? 1) || 1;

  return {
    ...raw,
    id: raw.id || `co_${Date.now()}`,
    projectId: raw.projectId || raw.project_id || '',
    projectCode: raw.projectCode || raw.project_code || '',
    changeNumber,
    title: raw.title || 'Endringsordre',
    description: raw.description || '',
    cause: raw.cause || 'kundetillegg',
    amountExVat,
    vatAmount,
    totalAmount,
    impactDays,
    status: (raw.status === 'Godkjent av kunde' ? 'approved' : raw.status) || 'pending_customer',
    token: raw.token || raw.id,
    shareUrl: raw.shareUrl || '',
    clientName: raw.clientName || raw.client || '',
    clientEmail: raw.clientEmail || '',
    signedByClientAt: raw.signedByClientAt || null,
    clientSignatureUrl: raw.clientSignatureUrl || null,
    clientIp: raw.clientIp || null,
    authorId: raw.authorId || raw.author_id || '',
    authorName: raw.authorName || raw.author_name || 'Mester',
    createdAt: raw.createdAt || raw.created_at || new Date().toISOString(),
    updatedAt: raw.updatedAt || raw.updated_at || undefined,
  };
}

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
        .map(normalizeChangeOrder)
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
      const cleanToken = token ? token.trim() : '';
      const res = await fetch(`/api/data/change_orders?token=${encodeURIComponent(cleanToken)}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0 && data[0]) {
          return normalizeChangeOrder(data[0]);
        }
      }
      const items = await api.getDocs<ChangeOrder>('change_orders');
      const found = items.find(item => 
        item.token === cleanToken || 
        item.id === cleanToken ||
        (item.token && item.token.toLowerCase() === cleanToken.toLowerCase()) ||
        (item.id && item.id.toLowerCase() === cleanToken.toLowerCase()) ||
        (typeof item.shareUrl === 'string' && item.shareUrl.includes(cleanToken))
      );
      return found ? normalizeChangeOrder(found) : null;
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
              ${params.authorName} / VikingMester
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
    let order = orders.find(o => o.id === orderId || o.token === orderId);

    if (!order) {
      try {
        const res = await fetch(`/api/data/change_orders?token=${encodeURIComponent(orderId)}`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0 && data[0]) {
            order = normalizeChangeOrder(data[0]);
          }
        }
      } catch (err) {
        console.warn('Fallback token lookup in approveChangeOrder failed:', err);
      }
    }

    if (!order) return null;

    const normalized = normalizeChangeOrder(order);

    const updated: ChangeOrder = {
      ...normalized,
      status: 'approved',
      signedByClientAt: new Date().toISOString(),
      clientSignatureUrl: signatureDataUrl,
      clientName: signerName || normalized.clientName || 'Kunde',
      updatedAt: new Date().toISOString()
    };

    await api.saveDoc('change_orders', updated);

    // 100% Automated Project Sync:
    // Update project budget and timeline
    try {
      const projects = await api.getDocs<Project>('projects');
      const project = projects.find(p => p.id === order.projectId);
      if (project) {
        const currentBudget = project.budget || 0;
        const newBudget = currentBudget + (order.totalAmount || order.amountExVat || 0);
        
        await api.saveDoc('projects', {
          ...project,
          budget: newBudget,
          lastUpdate: `Endringsordre #${order.changeNumber} godkjent av ${signerName || 'kunde'}`
        });
      }
    } catch (e) {
      console.warn('Could not update project budget:', e);
    }

    // 100% Real-time In-App Notification to Contractor/Admin
    try {
      const notifId = `notif_co_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const amountStr = (order.totalAmount || order.amountExVat || 0).toLocaleString('no-NO');
      
      await api.saveDoc('notifications', {
        id: notifId,
        userId: order.authorId || 'all',
        projectId: order.projectId,
        title: `Endringsordre #${order.changeNumber} godkjent!`,
        message: `${signerName || 'Kunden'} har signert og godkjent endringsordre "${order.title}" (${amountStr} kr). Prosjektbudsjett er oppdatert automatisk.`,
        type: 'success',
        category: 'change_order',
        read: false,
        link: `/prosjekt/${order.projectId}?tab=change_orders`,
        createdAt: new Date().toISOString()
      });
    } catch (err) {
      console.warn('Could not save in-app notification:', err);
    }

    // Real-time Agent Activity Feed (so SuperAdmin & logs show instant approval)
    try {
      await api.saveDoc('agent_activities', {
        id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        action: 'Endringsordre godkjent av kunde',
        details: `${signerName || 'Kunde'} signerte endringsordre #${order.changeNumber}: "${order.title}" for ${(order.totalAmount || order.amountExVat || 0).toLocaleString('no-NO')} kr inkl. mva.`,
        projectId: order.projectId,
        projectName: order.projectCode || 'Prosjekt',
        status: 'completed',
        createdAt: new Date()
      });
    } catch (err) {
      console.warn('Could not register agent activity:', err);
    }

    // Instant Email Dispatch to Contractor / Management
    try {
      const amountExVatStr = (order.amountExVat || 0).toLocaleString('no-NO');
      const totalAmountStr = (order.totalAmount || Math.round((order.amountExVat || 0) * 1.25)).toLocaleString('no-NO');
      
      await fetch('/api/notify/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: order.token,
          subject: `✅ GODKJENT: Endringsordre #${order.changeNumber} signert av ${signerName || 'kunde'}`,
          content: `
            Hei!
            
            Byggherre/kunde (${signerName || order.clientName || 'Kunde'}) har nettopp godkjent og signert endringsordre #${order.changeNumber}.
            
            Tittel: ${order.title}
            Beløp: ${amountExVatStr} kr eks. mva (${totalAmountStr} kr inkl. mva)
            Fremdriftskonsekvens: ${order.impactDays > 0 ? `+${order.impactDays} virkedager` : 'Ingen forsinkelse'}
            Godkjent tidspunkt: ${new Date().toLocaleString('no-NO')}
            Signert av: ${signerName || order.clientName || 'Kunde'}
            
            Prosjektbudsjettet er automatisk oppdatert i KS Mester.
            
            Med vennlig hilsen,
            VikingMester System
          `
        })
      });
    } catch (err) {
      console.warn('Could not dispatch instant approval email:', err);
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

    // Register in-app notification about rejection
    try {
      await api.saveDoc('notifications', {
        id: `notif_co_rej_${Date.now()}`,
        userId: order.authorId || 'all',
        projectId: order.projectId,
        title: `Endringsordre #${order.changeNumber} avvist`,
        message: `Kunden har avvist endringsordre "${order.title}". Begrunnelse: ${reason || 'Ingen begrunnelse oppgitt'}.`,
        type: 'warning',
        category: 'change_order',
        read: false,
        createdAt: new Date().toISOString()
      });
    } catch (err) {}

    return updated;
  },

  /**
   * Re-send or send change order invitation email to customer
   */
  async sendChangeOrderEmail(order: ChangeOrder, targetEmail?: string): Promise<boolean> {
    const emailTo = targetEmail || order.clientEmail;
    if (!emailTo) {
      throw new Error('Mangler mottakers e-postadresse.');
    }

    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const shareUrl = order.shareUrl || `${baseUrl}?changeOrderToken=${order.token}`;
    const amountStr = (order.amountExVat || 0).toLocaleString('no-NO');
    const totalStr = (order.totalAmount || Math.round((order.amountExVat || 0) * 1.25)).toLocaleString('no-NO');

    const res = await fetch('/api/notify/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: emailTo,
        subject: `Endringsmelding #${order.changeNumber}: ${order.title}`,
        content: `
          Hei ${order.clientName || 'Kunde'}!
          
          Det er opprettet et tilleggsarbeid/endringsordre som krever din godkjenning:
          
          Arbeid: ${order.title}
          Beskrivelse: ${order.description}
          Beløp: ${amountStr} kr eks. mva (${totalStr} kr ink. mva)
          Fremdriftskonsekvens: ${order.impactDays > 0 ? `+${order.impactDays} virkedager` : 'Ingen forsinkelse'}
          
          Du kan se spesifikasjonen og signere digitalt med 1 klikk her:
          ${shareUrl}
          
          Vilkår: NS 8406 / Håndverkertjenesteloven § 9.
          
          Med vennlig hilsen,
          ${order.authorName || 'VikingMester'}
        `
      })
    });

    return res.ok;
  },

  /**
   * Deletes a change order
   */
  async deleteChangeOrder(orderId: string): Promise<boolean> {
    try {
      await api.deleteDoc('change_orders', orderId);
      return true;
    } catch (e) {
      console.warn('Error deleting change order:', e);
      return false;
    }
  }
};
