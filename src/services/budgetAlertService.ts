import { Project, ExtensionOfTimeClaim, TimeEntry } from '../types';
import { api } from './api';

export interface BudgetStatus {
  budget: number;
  spent: number;
  percentUsed: number;
  hoursLogged: number;
  isWarning80: boolean;
  isOverBudget100: boolean;
  message: string;
}

export const budgetAlertService = {
  /**
   * Check budget status and generate early warnings
   */
  async checkProjectBudget(project: Project): Promise<BudgetStatus> {
    const budget = project.budget || 100000;
    
    // Calculate spent from time entries
    let hoursLogged = 0;
    let laborCost = 0;
    const HOURLY_RATE = 850; // standard håndverkertimepris

    try {
      const allTime = await api.getDocs<TimeEntry>('time_entries');
      const projectTime = allTime.filter(t => t.projectId === project.id);
      hoursLogged = projectTime.reduce((sum, t) => sum + (Number(t.hours) || 0), 0);
      laborCost = hoursLogged * HOURLY_RATE;
    } catch (e) {
      console.warn('Could not fetch time entries:', e);
    }

    const spent = Math.max(project.spent || 0, laborCost);
    const percentUsed = Math.round((spent / budget) * 100);

    const isWarning80 = percentUsed >= 80 && percentUsed < 100;
    const isOverBudget100 = percentUsed >= 100;

    let message = 'Budsjett og timeforbruk er innenfor planlagt ramme.';
    if (isOverBudget100) {
      message = `KRITISK: Prosjektet har passert 100% av budsjett (${percentUsed}%). Vurder stans eller endringsmelding umiddelbart iht. NS 8406 pkt. 19.`;
    } else if (isWarning80) {
      message = `ADVARSEL: Prosjektet har nådd ${percentUsed}% av budsjettrammen. Kontroller gjenstående arbeidsposter.`;
    }

    return {
      budget,
      spent,
      percentUsed,
      hoursLogged,
      isWarning80,
      isOverBudget100,
      message
    };
  },

  /**
   * Create a formal Claim for Extension of Time (Krav om fristforlengelse NS 8406 pkt. 19.3)
   */
  async createExtensionClaim(params: {
    project: Project;
    cause: ExtensionOfTimeClaim['cause'];
    description: string;
    daysClaimed: number;
    costImpactClaimed?: number;
  }): Promise<ExtensionOfTimeClaim> {
    const existing = await api.getDocs<ExtensionOfTimeClaim>('time_extension_claims');
    const projectClaims = existing.filter(c => c.projectId === params.project.id);
    const claimNumber = projectClaims.length + 1;

    const claim: ExtensionOfTimeClaim = {
      id: `claim_${params.project.id}_${claimNumber}`,
      projectId: params.project.id,
      claimNumber,
      cause: params.cause,
      description: params.description,
      daysClaimed: params.daysClaimed,
      costImpactClaimed: params.costImpactClaimed,
      status: 'submitted',
      submittedDate: new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString()
    };

    await api.saveDoc('time_extension_claims', claim);
    return claim;
  }
};
