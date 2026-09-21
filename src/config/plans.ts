export type PlanId = 'solo' | 'team' | 'entreprenor' | 'enterprise' | 'partner' | 'internal';

export interface PlanConfig {
  id: PlanId;
  name: string;
  badge: string;
  tagline: string;
  monthlyPrice: number;
  monthlyPriceLabel: string;
  annualPrice: number;
  userLimit: number; // Antall inkluderte brukere (1, 5, 25, ubegrenset)
  userLimitLabel: string;
  projectLimit: number;
  projectLimitLabel: string;
  tokenMonthlyQuota: number;
  tokenQuotaLabel: string;
  allowedModuleIds: string[];
  features: string[];
  isInternal?: boolean;
  color: string;
  accentBorder: string;
}

export const PLAN_MODULES = [
  { id: 'dailylog', label: 'Byggedagbok & Timer', category: 'Kjerne', desc: 'Lovpålagt time- og værlogging iht. AML § 10-7' },
  { id: 'pre_close', label: 'KS & Lukkesperre (TEK17)', category: 'Kvalitet', desc: 'Sjekklister og digital signering før vegger lukkes' },
  { id: 'sja', label: 'SJA & Sikkerhet', category: 'HMS', desc: 'Sikker Jobb Analyse og risikovurdering' },
  { id: 'deviations', label: 'Avvik & RUH', category: 'Kvalitet', desc: 'Avvikshåndtering med TEK17 bildeanalyse' },
  { id: 'contacts', label: 'Kontakter & Team', category: 'Kjerne', desc: 'Telefonbok for byggeplass og team-administrasjon' },
  { id: 'change_orders', label: 'Endringsordrer (NS 8406)', category: 'Jus & Kontrakt', desc: 'Varsling av tillegg, frister og økonomisk krav' },
  { id: 'archive', label: 'Dokumentarkiv & FDV', category: 'Dokumentasjon', desc: 'Sluttdokumentasjon og Boligmappa PDF-eksport' },
  { id: 'time_approval', label: 'Timegodkjenning & Overtid', category: 'Leder & Lønn', desc: 'Ledergodkjenning av timer, 50% og 100% overtid' },
  { id: 'offers', label: 'Tilbud & AI Kalkyle', category: 'Kalkyle', desc: 'Smart prising, anbud og materialkalkyle' },
  { id: 'subcontractors', label: 'Underentreprenør-portal', category: 'Prosjekt', desc: 'Portal for underentreprenører og innsyn' },
  { id: 'integrations', label: 'Regnskap (Tripletex/Fiken)', category: 'Integrasjon', desc: 'Automatisk synk av timer, ordre og fakturagrunnlag' },
  { id: 'all_modules', label: 'Alle 20+ fagmoduler', category: 'Avansert', desc: 'Våtrom BVN, Elektro NEK400, Stoffkartotek m.m.' },
];

export const PLANS: Record<PlanId, PlanConfig> = {
  solo: {
    id: 'solo',
    name: 'VikingMester Solo',
    badge: 'Enkeltpersonforetak & Mester',
    tagline: 'For deg som jobber alene og vil ha 100% frihet fra kveldsarbeid og full kontroll på byggeplassen.',
    monthlyPrice: 690,
    monthlyPriceLabel: '690 kr/mnd',
    annualPrice: 550,
    userLimit: 1,
    userLimitLabel: '1 aktiv bruker',
    projectLimit: 5,
    projectLimitLabel: 'Inntil 5 aktive prosjekter',
    tokenMonthlyQuota: 2_500_000,
    tokenQuotaLabel: '2.5M tokens/mnd',
    color: 'text-amber-400',
    accentBorder: 'border-amber-500/40',
    allowedModuleIds: [
      'dailylog',
      'pre_close',
      'sja',
      'deviations',
      'contacts'
    ],
    features: [
      '1 aktiv bruker (Solo håndverker / Mester)',
      'Inntil 5 aktive prosjekter samtidig',
      'Autonom byggedagbok & timeføring (AML § 10-7)',
      'Tale-til-notat fra varebilen (handsfree)',
      'Yr.no automatisk sanntids værlogging',
      'KS & sjekklister (TEK17) generert automatisk',
      'Avviksfotografering & TEK17 bildeanalyse',
      'SJA & Sikker Jobb Analyse på 30 sekunder',
      '14 dagers gratis prøveperiode (0,- etablering)'
    ]
  },
  team: {
    id: 'team',
    name: 'VikingMester Team',
    badge: 'Mest populær for bedrifter',
    tagline: 'For voksende mesterbedrifter som vil ha autonom byggeleder, digital kundesignering og full margin- og timekontroll.',
    monthlyPrice: 1490,
    monthlyPriceLabel: '1 490 kr/mnd',
    annualPrice: 1190,
    userLimit: 5,
    userLimitLabel: 'Inntil 5-10 brukere (+199,- per ekstra)',
    projectLimit: 15,
    projectLimitLabel: 'Inntil 15 aktive prosjekter',
    tokenMonthlyQuota: 10_000_000,
    tokenQuotaLabel: '10M tokens/mnd',
    color: 'text-blue-400',
    accentBorder: 'border-blue-500/40',
    allowedModuleIds: [
      'dailylog',
      'pre_close',
      'sja',
      'deviations',
      'contacts',
      'change_orders',
      'archive',
      'time_approval'
    ],
    features: [
      'Inntil 5-10 aktive fagarbeidere (+199,- per ekstra)',
      'Inntil 15 aktive byggeprosjekter samtidig',
      'Tale-til-Endringsordre & fristvarsel (NS 8406)',
      'Digital kundesignering på mobil med fingeren',
      'Tverrfaglig Lukkesperre med soner (TEK17)',
      'Ledergodkjenning av timer & overtid (50%/100%)',
      '1-Klikks FDV-sluttrapport til Boligmappa',
      'Digitalt stoffkartotek offline for hele laget',
      'Flerspråklig oversettelse for mannskap',
      '10M AI tokens per måned inkludert'
    ]
  },
  entreprenor: {
    id: 'entreprenor',
    name: 'Totalentreprenør Pro',
    badge: 'Full rigg for store bygg',
    tagline: 'For entreprenører med 10+ ansatte, underentreprenører, komplekse anbud og store kontrakter.',
    monthlyPrice: 2990,
    monthlyPriceLabel: '2 990 kr/mnd',
    annualPrice: 2390,
    userLimit: 25,
    userLimitLabel: 'Inntil 25 brukere / Ubegrenset',
    projectLimit: 999,
    projectLimitLabel: 'Ubegrenset antall prosjekter',
    tokenMonthlyQuota: 30_000_000,
    tokenQuotaLabel: '30M tokens/mnd',
    color: 'text-purple-400',
    accentBorder: 'border-purple-500/40',
    allowedModuleIds: [
      'dailylog',
      'pre_close',
      'sja',
      'deviations',
      'contacts',
      'change_orders',
      'archive',
      'time_approval',
      'offers',
      'subcontractors',
      'integrations',
      'all_modules'
    ],
    features: [
      'Inntil 25+ brukere (ubegrenset kapasitet)',
      'Ubegrenset antall byggeprosjekter',
      'Autonom Tilbud-til-Prosjekt-til-KS flyt',
      'Alle 20+ fagmoduler ulåst',
      'Underentreprenør-portal (UE-innsyn og signering)',
      'Tripletex, PowerOffice & Fiken API-synk',
      'Juridisk NS 8405 / NS 8406 motor',
      'Tverrfaglig Lukkesperre med tidslås og soner',
      'Dedikert onboarding & prioritert support',
      '30M AI tokens per måned inkludert'
    ]
  },
  enterprise: {
    id: 'enterprise',
    name: 'Totalentreprenør Pro',
    badge: 'Konsern & Entreprenør',
    tagline: 'For konsern og store entreprenører med underentreprenører og krevende rammeavtaler.',
    monthlyPrice: 2990,
    monthlyPriceLabel: 'Fra 2 990 kr/mnd',
    annualPrice: 2390,
    userLimit: 999,
    userLimitLabel: 'Ubegrenset brukere',
    projectLimit: 999,
    projectLimitLabel: 'Ubegrenset antall prosjekter',
    tokenMonthlyQuota: 50_000_000,
    tokenQuotaLabel: '50M tokens/mnd',
    color: 'text-purple-400',
    accentBorder: 'border-purple-500/40',
    allowedModuleIds: [
      'dailylog',
      'pre_close',
      'sja',
      'deviations',
      'contacts',
      'change_orders',
      'archive',
      'time_approval',
      'offers',
      'subcontractors',
      'integrations',
      'all_modules'
    ],
    features: [
      'Ubegrenset brukere & prosjekter',
      'Alle 20+ fagmoduler ulåst',
      'Autonom Tilbud-til-Prosjekt-til-KS motor',
      'Underentreprenør-portal (UE)',
      'Tripletex, PowerOffice & Fiken API-synk',
      'Dedikert support & opplæring'
    ]
  },
  partner: {
    id: 'partner',
    name: 'Samarbeidspartner / Test',
    badge: 'Partner (0 kr)',
    tagline: 'For strategiske partnere, rådgivere og interne testbedrifter.',
    monthlyPrice: 0,
    monthlyPriceLabel: '0 kr (Partner)',
    annualPrice: 0,
    userLimit: 10,
    userLimitLabel: '10 brukere',
    projectLimit: 20,
    projectLimitLabel: '20 prosjekter',
    tokenMonthlyQuota: 15_000_000,
    tokenQuotaLabel: '15M tokens/mnd',
    color: 'text-emerald-400',
    accentBorder: 'border-emerald-500/40',
    allowedModuleIds: [
      'dailylog',
      'pre_close',
      'sja',
      'deviations',
      'contacts',
      'change_orders',
      'archive',
      'time_approval',
      'offers',
      'all_modules'
    ],
    features: [
      '10 aktive brukere',
      '20 aktive prosjekter',
      'Full tilgang til standard moduler',
      '15M tokens per måned',
      '0 kr/mnd'
    ]
  },
  internal: {
    id: 'internal',
    name: 'SuperAdmin / Systemeier',
    badge: 'Plattformeier',
    tagline: 'Kenneth Glosli Kristiansen / AIChat Norge AS / Vikingnet.',
    monthlyPrice: 0,
    monthlyPriceLabel: '0 kr (Eier)',
    annualPrice: 0,
    userLimit: 9999,
    userLimitLabel: 'Ubegrenset',
    projectLimit: 9999,
    projectLimitLabel: 'Ubegrenset',
    tokenMonthlyQuota: 500_000_000,
    tokenQuotaLabel: '500M tokens/mnd',
    color: 'text-amber-400',
    accentBorder: 'border-amber-400',
    isInternal: true,
    allowedModuleIds: [
      'dailylog',
      'pre_close',
      'sja',
      'deviations',
      'contacts',
      'change_orders',
      'archive',
      'time_approval',
      'offers',
      'subcontractors',
      'integrations',
      'all_modules'
    ],
    features: [
      'Full SuperAdmin kontroll',
      'Ubegrenset brukere og prosjekter',
      'Alle moduler og API-er ulåst',
      'Tenant switching & inspeksjon'
    ]
  }
};

/**
 * Hjelper som avgjør om en gitt plan har tilgang til en modul.
 * Hvis bedriften har skreddersydde overstyringer i `customModules`, respekteres disse.
 */
export function isModuleAllowedForPlan(
  moduleId: string,
  planId: string = 'solo',
  customModules?: string[] | null
): boolean {
  if (customModules && Array.isArray(customModules) && customModules.length > 0) {
    if (customModules.includes(moduleId) || customModules.includes('all_modules')) return true;
    // Map legacy aliaser dersom lagret med eldre modul-ID i bedriftsdatabasen
    if (moduleId === 'archive' && customModules.includes('fdv')) return true;
    if (moduleId === 'offers' && (customModules.includes('economy') || customModules.includes('ai'))) return true;
    if (moduleId === 'pre_close' && (customModules.includes('checklists') || customModules.includes('projects'))) return true;
    if (moduleId === 'sja' && (customModules.includes('checklists') || customModules.includes('hms'))) return true;
    if (moduleId === 'dailylog' && customModules.includes('time')) return true;
    if (moduleId === 'time_approval' && customModules.includes('time')) return true;
    if (moduleId === 'deviations' && (customModules.includes('deviations') || customModules.includes('ai'))) return true;
    if (moduleId === 'subcontractors' && customModules.includes('projects')) return true;
  }

  const normalizedPlan = (planId || 'solo').toLowerCase() as PlanId;
  const config = PLANS[normalizedPlan] || (normalizedPlan === 'demo' as any ? PLANS.team : PLANS.solo);

  if (config.isInternal) return true;
  return config.allowedModuleIds.includes(moduleId);
}

/**
 * Henter hvilken plan som kreves for å låse opp en gitt modul
 */
export function getRequiredPlanForModule(moduleId: string): PlanConfig {
  if (PLANS.solo.allowedModuleIds.includes(moduleId)) return PLANS.solo;
  if (PLANS.team.allowedModuleIds.includes(moduleId)) return PLANS.team;
  return PLANS.entreprenor;
}
