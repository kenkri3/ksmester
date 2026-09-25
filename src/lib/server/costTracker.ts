import { saveCollectionItem, getCollectionItems, getCollectionItemById } from './db';

export interface CostLogRecord {
  id: string;
  timestamp: string;
  service: '1min.ai' | 'gemini' | 'railway' | 'resend' | 'database' | 'infrastructure' | 'deepseek';
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

// Offisielle Gemini 2.5 Flash / 2.5 Pro priser per 1M tokens
// Gemini 2.5 Flash: $0.075 input / $0.30 output (markedets billigste og raskeste multimodale modell!)
export const GEMINI_PROMPT_PER_M = 0.075;
export const GEMINI_COMPLETION_PER_M = 0.30;
export const GEMINI_25_FLASH_PROMPT_PER_M = 0.075;
export const GEMINI_25_FLASH_COMPLETION_PER_M = 0.30;
export const GEMINI_LITE_PROMPT_PER_M = 0.075;
export const GEMINI_LITE_COMPLETION_PER_M = 0.30;
export const GEMINI_PRO_PROMPT_PER_M = 1.25;
export const GEMINI_PRO_COMPLETION_PER_M = 5.00;

// 1min.ai og OpenAI (GPT-4o, GPT-4o-mini, o3-mini) priser
export const GPT4O_PROMPT_PER_M = 2.50;
export const GPT4O_COMPLETION_PER_M = 10.00;
export const GPT4O_MINI_PROMPT_PER_M = 0.15;
export const GPT4O_MINI_COMPLETION_PER_M = 0.60;
export const O3_MINI_PROMPT_PER_M = 1.10;
export const O3_MINI_COMPLETION_PER_M = 4.40;

// Claude (Anthropic) priser
export const CLAUDE_HAIKU_PROMPT_PER_M = 0.80;
export const CLAUDE_HAIKU_COMPLETION_PER_M = 4.00;
export const CLAUDE_SONNET_PROMPT_PER_M = 3.00;
export const CLAUDE_SONNET_COMPLETION_PER_M = 15.00;

// DeepSeek V3 chat priser ($0.14 input / $0.28 output - lynrask og superbillig)
export const DEEPSEEK_PROMPT_PER_M = 0.14;
export const DEEPSEEK_COMPLETION_PER_M = 0.28;

// DeepSeek R1 reasoner priser ($0.55 input / $2.19 output)
export const DEEPSEEK_R1_PROMPT_PER_M = 0.55;
export const DEEPSEEK_R1_COMPLETION_PER_M = 2.19;

// Inkluderte månedlige token- og bildekvoter per pakke for 100% marginvern
export const PLAN_LIMITS: Record<string, { tokens: number; images: number; monthlyPrice: number }> = {
  trial: {
    tokens: 500_000,   // 500 000 tokens i 14 dagers prøveperiode (Vår tokenkostnad: ca. 1.80 kr - umulig å tape penger)
    images: 50,        // Inntil 50 TEK17 bildeanalyser under prøveperioden
    monthlyPrice: 0    // Gratis prøveperiode
  },
  solo: {
    tokens: 2_500_000, // 2.5 mill tokens/mnd (Vår tokenkostnad: ca. 8-10 kr)
    images: 250,       // 250 TEK17 bildeanalyser
    monthlyPrice: 690  // 690 kr/mnd -> 98.5% bruttomargin
  },
  team: {
    tokens: 10_000_000, // 10 mill tokens/mnd (Vår tokenkostnad: ca. 35-40 kr)
    images: 1000,
    monthlyPrice: 1490  // 1 490 kr/mnd -> 97.3% bruttomargin
  },
  entreprenor: {
    tokens: 30_000_000, // 30 mill tokens/mnd (Vår tokenkostnad: ca. 110-120 kr)
    images: 3000,
    monthlyPrice: 2990  // 2 990 kr/mnd -> 96.0% bruttomargin
  },
  partner: {
    tokens: 15_000_000, // 15 mill tokens/mnd (Samarbeidspartnere & Interne kollegaer)
    images: 1500,
    monthlyPrice: 0     // 0 kr/mnd -> Alltid ekskludert fra SaaS-omsetning
  },
  internal: {
    tokens: 500_000_000, // 500 mill tokens/mnd (System Eier & SuperAdmin)
    images: 50000,
    monthlyPrice: 0      // 0 kr/mnd -> Systemeier
  },
  admin: {
    tokens: 500_000_000,
    images: 50000,
    monthlyPrice: 0
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
  notes,
  service
}: {
  model?: string;
  promptTokens?: number;
  completionTokens?: number;
  operation: string;
  companyId?: string;
  companyName?: string;
  projectId?: string;
  notes?: string;
  service?: '1min.ai' | 'gemini' | 'railway' | 'resend' | 'database' | 'infrastructure' | 'deepseek';
}): Promise<CostLogRecord> {
  const totalTokens = promptTokens + completionTokens;

  let promptRate = GEMINI_PROMPT_PER_M;
  let completionRate = GEMINI_COMPLETION_PER_M;

  const mLower = model.toLowerCase();
  if (mLower.includes('claude-3-5-sonnet') || mLower.includes('claude-3.5-sonnet') || mLower.includes('claude-3-7-sonnet') || mLower.includes('claude-sonnet')) {
    promptRate = CLAUDE_SONNET_PROMPT_PER_M;
    completionRate = CLAUDE_SONNET_COMPLETION_PER_M;
  } else if (mLower.includes('claude-3-5-haiku') || mLower.includes('haiku')) {
    promptRate = CLAUDE_HAIKU_PROMPT_PER_M;
    completionRate = CLAUDE_HAIKU_COMPLETION_PER_M;
  } else if (mLower.includes('o3-mini')) {
    promptRate = O3_MINI_PROMPT_PER_M;
    completionRate = O3_MINI_COMPLETION_PER_M;
  } else if (mLower.includes('gpt-4o-mini')) {
    promptRate = GPT4O_MINI_PROMPT_PER_M;
    completionRate = GPT4O_MINI_COMPLETION_PER_M;
  } else if (mLower.includes('gpt-4o')) {
    promptRate = GPT4O_PROMPT_PER_M;
    completionRate = GPT4O_COMPLETION_PER_M;
  } else if (mLower.includes('deepseek-reasoner') || mLower.includes('deepseek-r1') || mLower.includes('reasoner')) {
    promptRate = DEEPSEEK_R1_PROMPT_PER_M;
    completionRate = DEEPSEEK_R1_COMPLETION_PER_M;
  } else if (mLower.includes('deepseek')) {
    promptRate = DEEPSEEK_PROMPT_PER_M;
    completionRate = DEEPSEEK_COMPLETION_PER_M;
  } else if (mLower.includes('gemini-2.5-pro') || mLower.includes('gemini-pro')) {
    promptRate = GEMINI_PRO_PROMPT_PER_M;
    completionRate = GEMINI_PRO_COMPLETION_PER_M;
  } else if (mLower.includes('gemini-2.5-flash') || mLower.includes('flash')) {
    promptRate = GEMINI_25_FLASH_PROMPT_PER_M;
    completionRate = GEMINI_25_FLASH_COMPLETION_PER_M;
  }

  const costPromptUsd = (promptTokens / 1_000_000) * promptRate;
  const costCompletionUsd = (completionTokens / 1_000_000) * completionRate;
  const costUsd = Math.max(0.00001, costPromptUsd + costCompletionUsd);
  const costNok = Number((costUsd * NOK_USD_RATE).toFixed(5));

  const resolvedService = service || (
    mLower.includes('deepseek') ? 'deepseek' :
    (mLower.includes('gpt') || mLower.includes('claude') || mLower.includes('1min')) ? '1min.ai' : 'gemini'
  );

  const record: CostLogRecord = {
    id: `cost-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    timestamp: new Date().toISOString(),
    service: resolvedService,
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
  let resolvedStatus: string | undefined = undefined;

  // Hvis planKey ikke er spesifisert, slår vi opp bedriften direkte i databasen
  if (!resolvedPlanKey) {
    try {
      // 1. Sjekk companies-samlingen
      const company = await getCollectionItemById('companies', companyId);
      if (company) {
        if (company.plan) resolvedPlanKey = String(company.plan).toLowerCase();
        if (company.subscriptionStatus) resolvedStatus = String(company.subscriptionStatus).toLowerCase();
      } else {
        // 2. Sjekk alle bedrifter (hvis companyId matcher navn eller orgnr)
        const allCompanies = await getCollectionItems('companies');
        const matchedCompany = allCompanies.find((c: any) => 
          c.id === companyId || c.name === companyId || c.orgNumber === companyId || c.orgnr === companyId
        );
        if (matchedCompany) {
          if (matchedCompany.plan) resolvedPlanKey = String(matchedCompany.plan).toLowerCase();
          if (matchedCompany.subscriptionStatus) resolvedStatus = String(matchedCompany.subscriptionStatus).toLowerCase();
        } else {
          // 3. Sjekk leads-samlingen
          const allLeads = await getCollectionItems('leads');
          const matchedLead = allLeads.find((l: any) => 
            l.companyId === companyId || l.company === companyId || l.orgnr === companyId
          );
          if (matchedLead) {
            if (matchedLead.plan) resolvedPlanKey = String(matchedLead.plan).toLowerCase();
            if (matchedLead.subscriptionStatus || matchedLead.status) {
              resolvedStatus = String(matchedLead.subscriptionStatus || matchedLead.status).toLowerCase();
            }
          }
        }
      }
    } catch (err) {
      console.warn('[Cost Tracker] Kunne ikke slå opp bedrift for kvotesjekk:', err);
    }
  }

  // Normaliser plan-nøkkel: f.eks. "entreprenør" -> "entreprenor", "internal", "partner"
  const isInternal = 
    resolvedPlanKey === 'internal' || 
    resolvedPlanKey === 'admin' || 
    resolvedPlanKey?.includes('intern') ||
    companyId.toLowerCase().includes('aichat norge') ||
    companyId.toLowerCase().includes('vikingnet') ||
    companyId.toLowerCase().includes('vikingmester');

  // 🛡️ 1. MARGINVERN: Hvis bedriftens abonnement er utløpt eller kansellert, blokker AI umiddelbart
  if (!isInternal && (resolvedStatus === 'expired' || resolvedStatus === 'cancelled')) {
    return {
      allowed: false,
      usedTokens: 0,
      limitTokens: 0,
      baseTokens: 0,
      topupTokens: 0,
      topupImages: 0,
      remainingTokens: 0,
      percentUsed: 100,
      isWarning: true,
      needsTopUp: true,
      isExpired: true,
      plan: resolvedPlanKey || 'expired',
      planMonthlyPrice: 0,
      baseImages: 0,
      totalImages: 0,
      error: 'Abonnementet er utløpt eller avsluttet. Vennligst reaktiver under Innstillinger → Fakturering for å fortsette.'
    };
  }

  if (isInternal) {
    resolvedPlanKey = 'internal';
  } else if (resolvedPlanKey?.includes('partner')) {
    resolvedPlanKey = 'partner';
  } else if (resolvedStatus === 'trial' || resolvedPlanKey?.includes('trial')) {
    // 🛡️ 2. PRØVEPERIODE-VERN: Maks 500k tokens i prøveperioden (kostnad for oss: under 2 kr)
    resolvedPlanKey = 'trial';
  } else if (resolvedPlanKey?.includes('entrepren')) {
    resolvedPlanKey = 'entreprenor';
  } else if (resolvedPlanKey?.includes('team')) {
    resolvedPlanKey = 'team';
  } else if (resolvedPlanKey?.includes('solo')) {
    resolvedPlanKey = 'solo';
  }

  // 🛡️ Marginvern: Hvis bedriftens plan er ukjent eller udefinert,
  // faller vi ALLTID tilbake på 'solo' (2.5M tokens), aldri 'team' (10M tokens).
  // Dette forhindrer utilsiktet overforbruk og beskytter 98.5% bruttomargin.
  if (!resolvedPlanKey || !PLAN_LIMITS[resolvedPlanKey]) {
    resolvedPlanKey = 'solo';
  }

  const currentMonthPrefix = new Date().toISOString().substring(0, 7);
  const planInfo = PLAN_LIMITS[resolvedPlanKey];

  try {
    const [allCosts, allTopups] = await Promise.all([
      getCollectionItems('token_costs'),
      getCollectionItems('token_topups').catch(() => [])
    ]);

    const companyCosts = allCosts.filter((c: any) => 
      c.companyId === companyId && 
      c.timestamp && 
      c.timestamp.startsWith(currentMonthPrefix)
    );

    // Hent aktive top-up-kjøp for bedriften denne måneden (eller aktive generelt)
    const companyTopups = (allTopups || []).filter((t: any) =>
      t.companyId === companyId &&
      (t.status === 'active' || (t.purchasedAt && t.purchasedAt.startsWith(currentMonthPrefix)))
    );

    const topupTokens = companyTopups.reduce((sum: number, t: any) => sum + (Number(t.tokensGranted) || 0), 0);
    const topupImages = companyTopups.reduce((sum: number, t: any) => sum + (Number(t.imagesGranted) || 0), 0);

    const usedTokens = companyCosts.reduce((sum: number, c: any) => sum + (c.totalTokens || 0), 0);
    const limitTokens = planInfo.tokens + topupTokens;
    const remainingTokens = Math.max(0, limitTokens - usedTokens);
    const percentUsed = limitTokens > 0 ? Math.min(100, Math.round((usedTokens / limitTokens) * 100)) : 100;

    return {
      allowed: usedTokens < limitTokens,
      usedTokens,
      limitTokens,
      baseTokens: planInfo.tokens,
      topupTokens,
      topupImages,
      remainingTokens,
      percentUsed,
      isWarning: percentUsed >= 80,
      needsTopUp: percentUsed >= 100,
      plan: resolvedPlanKey,
      planMonthlyPrice: planInfo.monthlyPrice,
      baseImages: planInfo.images,
      totalImages: planInfo.images + topupImages
    };
  } catch {
    return { 
      allowed: true, 
      usedTokens: 0, 
      limitTokens: planInfo.tokens, 
      baseTokens: planInfo.tokens,
      topupTokens: 0,
      topupImages: 0,
      remainingTokens: planInfo.tokens, 
      percentUsed: 0, 
      isWarning: false, 
      needsTopUp: false, 
      plan: resolvedPlanKey,
      planMonthlyPrice: planInfo.monthlyPrice,
      baseImages: planInfo.images,
      totalImages: planInfo.images
    };
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
    const plan = (lead.plan || '').toLowerCase();
    const isFreeTier = plan.includes('partner') || plan.includes('intern') || Boolean(lead.isPartner) || Boolean(lead.isInternal) || lead.monthlyPrice === 0;
    const monthlyPrice = isFreeTier ? 0 : (
      lead.monthlyPrice !== undefined ? Number(lead.monthlyPrice) : (
        plan.includes('solo') ? 690 :
        plan.includes('team') ? 1490 :
        plan.includes('entreprenor') ? 2990 : 1490
      )
    );
    totalSubscriptionRevenueNok += monthlyPrice;
    customerBreakdown.push({
      company: lead.company,
      orgnr: lead.orgnr,
      plan: isFreeTier ? 'partner' : lead.plan,
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
