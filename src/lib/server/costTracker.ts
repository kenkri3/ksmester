import { saveCollectionItem, getCollectionItems, getCollectionItemById } from './db';

export interface CostLogRecord {
  id: string;
  timestamp: string;
  service: 'gemini' | 'railway' | 'resend' | 'database' | 'infrastructure';
  category: 'token_inference' | 'hosting' | 'email_delivery' | 'database';
  model?: string;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  costUsd: number;
  costNok: number;
  operation: string;
  companyId?: string;
  companyName?: string;
  projectId?: string;
  notes?: string;
}

// Valutakurs USD -> NOK
export const NOK_USD_RATE = 10.80;

// Offisielle Gemini 2.5 Flash priser per 1M tokens
// Input: $0.15 / 1M tokens (~1.62 NOK)
// Output: $0.60 / 1M tokens (~6.48 NOK)
// Gemini 2.5 Flash-Lite: $0.075 input / $0.30 output
export const GEMINI_PROMPT_PER_M = 0.15;
export const GEMINI_COMPLETION_PER_M = 0.60;
export const GEMINI_LITE_PROMPT_PER_M = 0.075;
export const GEMINI_LITE_COMPLETION_PER_M = 0.30;

// DeepSeek V3 chat priser
export const DEEPSEEK_PROMPT_PER_M = 0.14;
export const DEEPSEEK_COMPLETION_PER_M = 0.28;

// Inkluderte månedlige token- og bildekvoter per pakke for 100% marginvern
export const PLAN_LIMITS: Record<string, { tokens: number; images: number; monthlyPrice: number }> = {
  solo: {
    tokens: 2_500_000, // 2.5 mill tokens/mnd (Vår tokenkostnad: ca. 8-15 kr)
    images: 250,       // 250 TEK17 bildeanalyser
    monthlyPrice: 1490 // 1 490 kr/mnd -> 98% bruttomargin
  },
  team: {
    tokens: 10_000_000, // 10 mill tokens/mnd (Vår tokenkostnad: ca. 35-60 kr)
    images: 1000,
    monthlyPrice: 3490  // 3 490 kr/mnd -> 98% bruttomargin
  },
  entreprenor: {
    tokens: 30_000_000, // 30 mill tokens/mnd (Vår tokenkostnad: ca. 120-180 kr)
    images: 3000,
    monthlyPrice: 6900  // 6 900 kr/mnd -> 97% bruttomargin
  }
};

// Top-up pakker ved ekstra behov
export const TOPUP_PACKAGES: Record<string, { name: string; tokens: number; images: number; priceNok: number }> = {
  'topup-5m': {
    name: 'Liten Mester-pakke (+5M tokens / +200 bilder)',
    tokens: 5_000_000,
    images: 200,
    priceNok: 490 // Kostnad for oss: ca. 30 kr -> 94% margin
  },
  'topup-20m': {
    name: 'Stor Mester-pakke (+20M tokens / +1000 bilder)',
    tokens: 20_000_000,
    images: 1000,
    priceNok: 1490 // Kostnad for oss: ca. 120 kr -> 92% margin
  }
};

/**
 * Logger tokenforbruk og beregner nøyaktig kostnad i NOK for 50/50-avregning.
 */
export async function trackTokenCost({
  model = 'gemini-2.5-flash',
  promptTokens = 0,
  completionTokens = 0,
  operation,
  companyId,
  companyName,
  projectId,
  notes
}: {
  model?: string;
  promptTokens?: number;
  completionTokens?: number;
  operation: string;
  companyId?: string;
  companyName?: string;
  projectId?: string;
  notes?: string;
}): Promise<CostLogRecord> {
  const totalTokens = promptTokens + completionTokens;

  let promptRate = GEMINI_PROMPT_PER_M;
  let completionRate = GEMINI_COMPLETION_PER_M;

  if (model.includes('lite')) {
    promptRate = GEMINI_LITE_PROMPT_PER_M;
    completionRate = GEMINI_LITE_COMPLETION_PER_M;
  } else if (model.includes('deepseek')) {
    promptRate = DEEPSEEK_PROMPT_PER_M;
    completionRate = DEEPSEEK_COMPLETION_PER_M;
  }

  const costPromptUsd = (promptTokens / 1_000_000) * promptRate;
  const costCompletionUsd = (completionTokens / 1_000_000) * completionRate;
  const costUsd = Math.max(0.00001, costPromptUsd + costCompletionUsd);
  const costNok = Number((costUsd * NOK_USD_RATE).toFixed(5));

  const record: CostLogRecord = {
    id: `cost-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    timestamp: new Date().toISOString(),
    service: model.includes('deepseek') ? 'gemini' : 'gemini',
    category: 'token_inference',
    model,
    promptTokens,
    completionTokens,
    totalTokens,
    costUsd,
    costNok,
    operation,
    companyId,
    companyName,
    projectId,
    notes
  };

  try {
    await saveCollectionItem('token_costs', record);
  } catch (err) {
    console.warn('[Cost Tracker] Kunne ikke lagre kostnadspost:', err);
  }

  return record;
}

/**
 * Sjekker om bedriften er innenfor sin trygge token-kvote (Marginvern).
 * Forhindrer at noen kunde påfører oss tap eller overforbruk.
 */
export async function checkCompanyQuota(companyId?: string, planKey?: string) {
  if (!companyId) return { allowed: true, percentUsed: 0, isWarning: false, needsTopUp: false, plan: 'unrestricted' };

  let resolvedPlanKey = planKey?.toLowerCase().trim();

  // Hvis planKey ikke er spesifisert, slår vi opp bedriften direkte i databasen
  if (!resolvedPlanKey) {
    try {
      // 1. Sjekk companies-samlingen
      const company = await getCollectionItemById('companies', companyId);
      if (company?.plan) {
        resolvedPlanKey = String(company.plan).toLowerCase();
      } else {
        // 2. Sjekk alle bedrifter (hvis companyId matcher navn eller orgnr)
        const allCompanies = await getCollectionItems('companies');
        const matchedCompany = allCompanies.find((c: any) => 
          c.id === companyId || c.name === companyId || c.orgNumber === companyId || c.orgnr === companyId
        );
        if (matchedCompany?.plan) {
          resolvedPlanKey = String(matchedCompany.plan).toLowerCase();
        } else {
          // 3. Sjekk leads-samlingen
          const allLeads = await getCollectionItems('leads');
          const matchedLead = allLeads.find((l: any) => 
            l.companyId === companyId || l.company === companyId || l.orgnr === companyId
          );
          if (matchedLead?.plan) {
            resolvedPlanKey = String(matchedLead.plan).toLowerCase();
          }
        }
      }
    } catch (err) {
      console.warn('[Cost Tracker] Kunne ikke slå opp bedrift for kvotesjekk:', err);
    }
  }

  // Normaliser plan-nøkkel: f.eks. "entreprenør" -> "entreprenor"
  if (resolvedPlanKey?.includes('entrepren')) {
    resolvedPlanKey = 'entreprenor';
  } else if (resolvedPlanKey?.includes('team')) {
    resolvedPlanKey = 'team';
  } else if (resolvedPlanKey?.includes('solo')) {
    resolvedPlanKey = 'solo';
  }

  // 🛡️ Marginvern: Hvis bedriftens plan er ukjent eller udefinert,
  // faller vi ALLTID tilbake på 'solo' (2.5M tokens), aldri 'team' (10M tokens).
  // Dette forhindrer 4x utilsiktet overforbruk og beskytter 98% bruttomargin.
  if (!resolvedPlanKey || !PLAN_LIMITS[resolvedPlanKey]) {
    resolvedPlanKey = 'solo';
  }

  const currentMonthPrefix = new Date().toISOString().substring(0, 7);
  const planInfo = PLAN_LIMITS[resolvedPlanKey];

  try {
    const allCosts = await getCollectionItems('token_costs');
    const companyCosts = allCosts.filter((c: any) => 
      c.companyId === companyId && 
      c.timestamp && 
      c.timestamp.startsWith(currentMonthPrefix)
    );

    const usedTokens = companyCosts.reduce((sum: number, c: any) => sum + (c.totalTokens || 0), 0);
    const limitTokens = planInfo.tokens;
    const percentUsed = Math.min(100, Math.round((usedTokens / limitTokens) * 100));

    return {
      allowed: usedTokens < limitTokens,
      usedTokens,
      limitTokens,
      percentUsed,
      isWarning: percentUsed >= 80,
      needsTopUp: percentUsed >= 100,
      plan: resolvedPlanKey,
      planMonthlyPrice: planInfo.monthlyPrice
    };
  } catch {
    return { allowed: true, percentUsed: 0, isWarning: false, needsTopUp: false, plan: resolvedPlanKey };
  }
}

/**
 * Henter samlet 50/50 regnskapsoversikt for VikingMester.
 * Deler kjerneinntekter og kjerne-kostnader 50/50 mellom AIChat Norge AS og partnerfirmaet.
 * Isolerer mersalgsprodukter (B2B Salgsagent, Samspill, Kursmarkedet, Doffin, Qognito) 100% til AIChat Norge AS.
 */
export async function getPartnershipAccountingSummary(periodMonth?: string) {
  const currentMonthPrefix = periodMonth || new Date().toISOString().substring(0, 7); // f.eks. '2026-09'

  // 1. Hent alle registrerte leads / aktive abonnementer for VikingMester
  const allLeads = await getCollectionItems('leads');
  const periodLeads = allLeads.filter((l: any) => 
    l.createdAt && l.createdAt.startsWith(currentMonthPrefix)
  );

  let totalSubscriptionRevenueNok = 0;
  const customerBreakdown: any[] = [];

  for (const lead of periodLeads) {
    const monthlyPrice = lead.monthlyPrice || (
      lead.plan?.toLowerCase().includes('solo') ? 1490 :
      lead.plan?.toLowerCase().includes('team') ? 3490 :
      lead.plan?.toLowerCase().includes('entreprenor') ? 6900 : 3490
    );
    totalSubscriptionRevenueNok += monthlyPrice;
    customerBreakdown.push({
      company: lead.company,
      orgnr: lead.orgnr,
      plan: lead.plan,
      monthlyPriceNok: monthlyPrice,
      date: lead.createdAt
    });
  }

  // 2. Hent alle registrerte AI-tokenkostnader for perioden
  const allCosts = await getCollectionItems('token_costs');
  const periodCosts: CostLogRecord[] = allCosts.filter((c: any) =>
    c.timestamp && c.timestamp.startsWith(currentMonthPrefix)
  );

  let totalTokenCostNok = 0;
  let totalTokensUsed = 0;

  for (const c of periodCosts) {
    totalTokenCostNok += (c.costNok || 0);
    totalTokensUsed += (c.totalTokens || 0);
  }

  // 3. Faste infrastrukturkostnader for VikingMester (Railway Server + PostgreSQL + Resend pro-rata)
  // Spesifisert og revisjonsklart grunnlag
  const fixedInfrastructureCostNok = 270; // Railway Pro hosting + PostgreSQL backup
  const resendEmailCostNok = 100;         // Resend transaksjonell e-post
  const totalDirectExpensesNok = Number((totalTokenCostNok + fixedInfrastructureCostNok + resendEmailCostNok).toFixed(2));

  // 4. 50/50 Deling (Inntekter og kostnader deles likt)
  const netProfitNok = Number((totalSubscriptionRevenueNok - totalDirectExpensesNok).toFixed(2));
  const aiChatNorgeShare = Number((netProfitNok / 2).toFixed(2));
  const partnerShare = Number((netProfitNok / 2).toFixed(2));

  return {
    period: currentMonthPrefix,
    partnershipStructure: {
      scope: 'VikingMester Kjerneplattform & Autonome Mester-agent',
      ownershipSplit: '50% AIChat Norge AS / 50% Partnerbedrift',
      accountingMethod: 'Netto overskuddsdeling (Brutto abonnementsinntekter minus dokumenterte drifts- og tokenkostnader)'
    },
    mersalgIsolasjon: {
      rule: 'EKSKLUSIVT FOR AICHAT NORGE AS (0% TIL PARTNER)',
      description: 'Mersalgsprodukter (B2B Salgs- & Møtebookingsagent, Samspill varslingskanal, Kursmarkedet HMS-kurs, Doffin Anbudsovervåking, Qognito) tilhører 100% AIChat Norge AS og inngår IKKE i partnerskapets 50/50-deling.',
      products: [
        'B2B Salgs- & Møtebookingsagent for håndverkere (kr 4 900,-/mnd)',
        'Samspill Lovpålagt Varslingskanal AML § 2A-3 (kr 249,-/mnd)',
        'Kursmarkedet Leder- og HMS-kurs',
        'Doffin Anbudsovervåking',
        'Qognito LinkedIn B2B-prospektering'
      ]
    },
    summary: {
      totalRevenueNok: totalSubscriptionRevenueNok,
      totalExpensesNok: totalDirectExpensesNok,
      netProfitNok: netProfitNok,
      split: {
        aiChatNorgeNok: aiChatNorgeShare,
        partnerShareNok: partnerShare
      }
    },
    expensesBreakdown: {
      tokenInferenceNok: Number(totalTokenCostNok.toFixed(2)),
      infrastructureRailwayNok: fixedInfrastructureCostNok,
      resendEmailDeliveryNok: resendEmailCostNok,
      totalTokensLogged: totalTokensUsed,
      recordsCount: periodCosts.length
    },
    customersCount: customerBreakdown.length,
    customers: customerBreakdown
  };
}
