import { FinalSettlement, Project, Contract, Offer, ChangeOrder } from '../types';
import { api } from './api';
import { changeOrderService } from './changeOrderService';

export const finalSettlementService = {
  /**
   * Get final settlement for a project
   */
  async getProjectSettlement(projectId: string): Promise<FinalSettlement | null> {
    try {
      const items = await api.getDocs<FinalSettlement>('final_settlements');
      return items.find(i => i.projectId === projectId) || null;
    } catch (e) {
      console.warn('Error fetching final settlement:', e);
      return null;
    }
  },

  /**
   * Automatically calculates the final settlement for a project
   */
  async calculateFinalSettlement(project: Project): Promise<FinalSettlement> {
    // 1. Find contract amount
    let originalContractAmount = 0;
    try {
      const contracts = await api.getDocs<Contract>('contracts');
      const projectContract = contracts.find(c => c.projectId === project.id);
      if (projectContract && projectContract.totalAmount) {
        originalContractAmount = projectContract.totalAmount;
      } else {
        const offers = await api.getDocs<Offer>('offers');
        const projectOffer = offers.find(o => o.projectId === project.id);
        if (projectOffer && projectOffer.totalAmount) {
          originalContractAmount = projectOffer.totalAmount;
        } else {
          originalContractAmount = project.budget || 150000;
        }
      }
    } catch (e) {
      originalContractAmount = project.budget || 150000;
    }

    // 2. Sum approved change orders
    const changeOrders = await changeOrderService.getProjectChangeOrders(project.id);
    const approvedOrders = changeOrders.filter(co => co.status === 'approved');
    const approvedChangeOrdersAmount = approvedOrders.reduce((sum, co) => sum + (Number(co.amountExVat ?? (co as any).amount) || 0), 0);

    // Total order amount eks mva
    const totalOrderAmount = originalContractAmount + approvedChangeOrdersAmount;

    // Estimate invoiced amount (default ~70% if active, or actual spent)
    const invoicedAmount = Math.min(totalOrderAmount, Math.round(totalOrderAmount * 0.7));
    const remainingToInvoice = totalOrderAmount - invoicedAmount;

    // Retention guarantee (5% iht. NS 8406)
    const retentionGuaranteeAmount = Math.round(totalOrderAmount * 0.05);

    // Net settlement eks mva
    const netSettlementExVat = remainingToInvoice;
    const vatAmount = Math.round(netSettlementExVat * 0.25);
    const totalSettlementIncVat = netSettlementExVat + vatAmount;

    // Due date: 14 days from now
    const dueDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Objection deadline: exactly 2 months from today (NS 8406 pkt. 26.2)
    const objectionDate = new Date();
    objectionDate.setMonth(objectionDate.getMonth() + 2);
    const objectionDeadline = objectionDate.toISOString().split('T')[0];

    const existing = await this.getProjectSettlement(project.id);

    const settlement: FinalSettlement = {
      id: existing ? existing.id : `fs_${project.id}`,
      projectId: project.id,
      originalContractAmount,
      approvedChangeOrdersAmount,
      totalOrderAmount,
      invoicedAmount,
      remainingToInvoice,
      retentionGuaranteeAmount,
      netSettlementExVat,
      vatAmount,
      totalSettlementIncVat,
      invoiceDueDate: dueDate,
      objectionDeadline,
      status: existing?.status || 'draft',
      createdAt: existing?.createdAt || new Date().toISOString()
    };

    await api.saveDoc('final_settlements', settlement);
    return settlement;
  },

  /**
   * Mark settlement as sent
   */
  async sendSettlement(settlementId: string): Promise<void> {
    const settlements = await api.getDocs<FinalSettlement>('final_settlements');
    const found = settlements.find(s => s.id === settlementId);
    if (found) {
      await api.saveDoc('final_settlements', {
        ...found,
        status: 'sent',
        sentAt: new Date().toISOString()
      });
    }
  }
};
