/**
 * 🛡️ VikingMester GDPR Privacy Shield & PII Sanitizer
 * 
 * Sikrer at sensitive personopplysninger (PII) aldri lekker ut av systemet
 * til eksterne AI-agenter, tredjeparts-LLM-er (f.eks. DeepSeek) eller eksterne dashboards.
 * 
 * Standarder som oppfylles:
 * - GDPR Art. 5 (Prinsipp om dataminimering og konfidensialitet)
 * - GDPR Art. 9 (Særlige kategorier / helseopplysninger i avvik og ulykker)
 * - Personopplysningsloven § 12 (Forbud mot ubeskyttet overføring av fødselsnummer)
 * - Schrems II-beskyttelse: Data pseudonymiseres matematisk før de sendes ut av Norge/EU
 */

// 1. Norsk fødselsnummer (11 siffer, ddmmååxxxxx eller med mellomrom)
const FNR_REGEX = /\b(0[1-9]|[12]\d|3[01])(0[1-9]|1[0-2])(\d{2})[\s-]?(\d{5})\b/g;

// 2. Norsk bankkontonummer (11 siffer, xxxx.xx.xxxxx eller 11 siffer sammenhengende)
const BANK_ACCOUNT_REGEX = /\b(\d{4})[.\s]?(\d{2})[.\s]?(\d{5})\b/g;

// 3. E-postadresser (med unntak av interne systemtagger)
const EMAIL_REGEX = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,7}\b/g;

// 4. Norske telefonnumre (mobil 4xx xx xxx, 9xx xx xxx, og fasttelefon med eller uten +47 / 0047)
// Nøye formulert for å unngå å matche valutabeløp (f.eks. 120 000 kr) eller datoer (2026-09-24)
const PHONE_NORWAY_REGEX = /(?:(?:\+|00)47[\s.-]?)?(?:[49]\d{2}[\s.-]?\d{2}[\s.-]?\d{3}|[49]\d{1}[\s.-]?\d{2}[\s.-]?\d{2}[\s.-]?\d{2}|[235678]\d{1}[\s.-]?\d{2}[\s.-]?\d{2}[\s.-]?\d{2})\b/g;

// 5. Sensitive helse- og personskadefraser i avvik (GDPR Art. 9)
const HEALTH_SENSITIVE_WORDS = [
  /\b(?:sykemeldt|sykemelding|sykemeldte)\s+([A-ZÆØÅ][a-zæøå]+(?:\s+[A-ZÆØÅ][a-zæøå]+)?)/gi,
  /\b(?:sendt til legevakt|innlagt på sykehus|behandlet av lege)\s+(?:for\s+)?([A-ZÆØÅ][a-zæøå]+(?:\s+[A-ZÆØÅ][a-zæøå]+)?)/gi,
  /\b(?:kuttet seg|brukket|blødning|hodeskade|ryggskade|amputasjon)\s+(?:på\s+)?([A-ZÆØÅ][a-zæøå]+(?:\s+[A-ZÆØÅ][a-zæøå]+)?)/gi,
];

/**
 * 🔒 Renser en fritekststreng for alle kjente personidentifikatorer (PII).
 */
export function maskPII(text: string): string {
  if (!text || typeof text !== 'string') return '';

  let sanitized = text;

  // Masker fødselsnummer
  sanitized = sanitized.replace(FNR_REGEX, '[FNR_SKJULT_GDPR]');

  // Masker bankkonto
  sanitized = sanitized.replace(BANK_ACCOUNT_REGEX, '[KONTONR_SKJULT_GDPR]');

  // Masker e-postadresser (men bevar allerede maskerte tagger)
  sanitized = sanitized.replace(EMAIL_REGEX, (match) => {
    if (match.includes('skjult') || match.includes('gdpr')) return match;
    return '[EPOST_SKJULT_GDPR]';
  });

  // Masker telefonnumre
  sanitized = sanitized.replace(PHONE_NORWAY_REGEX, (match) => {
    // Unngå datoer som 2026-09-24 eller 2024.11.05
    if (/^\d{4}[-.]\d{2}[-.]\d{2}$/.test(match.trim())) return match;
    return '[TLF_SKJULT_GDPR]';
  });

  // Masker personskader og helseforhold knyttet til navngitte personer
  for (const rx of HEALTH_SENSITIVE_WORDS) {
    sanitized = sanitized.replace(rx, (fullMatch, personName) => {
      if (personName) {
        return fullMatch.replace(personName, '[Medarbeider]');
      }
      return fullMatch;
    });
  }

  return sanitized;
}

/**
 * 🏢 Avgjør om et navn tilhører et selskap (AS, ENK, DA, ASA, NUF, Eiendom osv.)
 * Selskapsnavn er juridisk IKKE personopplysninger iht. GDPR.
 */
export function isCorporateEntity(name?: string): boolean {
  if (!name || typeof name !== 'string') return false;
  const corporateKeywords = ['as', 'a/s', 'enk', 'da', 'ans', 'asa', 'nuf', 'eiendom', 'bygg', 'entreprenør', 'kommune', 'borettslag', 'sameie', 'holding'];
  const words = name.toLowerCase().split(/[\s,.-]+/);
  return corporateKeywords.some(kw => words.includes(kw));
}

/**
 * 🛡️ Pseudonymiserer et personnavn dersom det er en privatperson.
 */
export function anonymizePersonName(name?: string, fallback = 'Privat oppdragsgiver'): string {
  if (!name || typeof name !== 'string' || !name.trim()) return fallback;
  const clean = name.trim();
  if (isCorporateEntity(clean)) {
    return clean; // Bevar bedriftsnavn
  }
  // Masker privatperson til et generisk pseudonym med fornavn eller rolle
  const parts = clean.split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0]} [Etternavn skjult iht. GDPR]`;
  }
  return `${clean} (Privat)`;
}

/**
 * 📍 Vasker en adresse for nøyaktig leilighets- eller husnummer for privatboliger,
 * men beholder poststed/kommune slik at agenten kan gi korrekt vær, snølast og geografisk info.
 */
export function anonymizeAddress(address?: string): string {
  if (!address || typeof address !== 'string' || !address.trim()) return 'Norge';
  const clean = address.trim();

  // Hvis adressen inneholder et postnummer (4 siffer) og stedsnavn
  const postalMatch = clean.match(/\b\d{4}\s+([A-ZÆØÅa-zæøå\s-]+)/);
  if (postalMatch) {
    return `${postalMatch[1].trim()} (Byggeplass)`;
  }

  // Fjerner nøyaktig husnummer og leilighetsnummer hvis det ligner en gateadresse
  const streetWithoutNumber = clean.replace(/\b\d+[A-Za-z]?(?:\s*[-/]\s*\d+[A-Za-z]?)?(?:,\s*leil(?:\.|\s+)\w+)?\b/gi, '').trim();
  return streetWithoutNumber.length > 3 ? `${streetWithoutNumber} (Område)` : clean;
}

/**
 * 📋 Vasker et prosjekt for eksponering til eksterne agenter (MCP).
 * Agenten får beholde ID, kode, status og teknisk info, men ingen private kontaktpunkter lekker.
 */
export function sanitizeProjectForAgent(project: any) {
  if (!project) return null;
  const isCorp = isCorporateEntity(project.clientName);

  return {
    id: project.id,
    kode: project.projectCode || '-',
    navn: maskPII(project.name || 'Byggeprosjekt'),
    adresse: anonymizeAddress(project.location || project.address),
    status: project.stage || project.status || 'Aktiv',
    leder: project.projectManager ? `${project.projectManager.split(' ')[0]} (Byggeleder)` : 'Byggeleder',
    kundeType: isCorp ? 'Bedrift / Offentlig' : 'Privatkunde',
    kundeNavn: isCorp ? project.clientName : anonymizePersonName(project.clientName, 'Privat oppdragsgiver')
  };
}

/**
 * 📬 Vasker leads (henvendelser) slik at private e-poster og telefonnumre aldri lekker ut.
 */
export function sanitizeLeadForAgent(lead: any) {
  if (!lead) return null;
  const isCorp = isCorporateEntity(lead.company) || isCorporateEntity(lead.name);

  return {
    id: lead.id,
    kundeReferanse: isCorp ? (lead.company || lead.name) : `Privat henvendelse (#${(lead.id || 'ref').slice(-4)})`,
    kundetype: isCorp ? 'Bedriftskunde' : 'Privatkunde',
    epost: '[EPOST_SKJULT_GDPR]',
    telefon: '[TLF_SKJULT_GDPR]',
    behov: maskPII(lead.needs || lead.message || 'Forespørsel om byggearbeid'),
    dato: lead.createdAt || lead.date || 'Nylig'
  };
}

/**
 * ⏱️ Vasker timeføringer slik at medarbeidernes fulle private identitet beskyttes.
 */
export function sanitizeTimeEntryForAgent(entry: any) {
  if (!entry) return null;
  const rawName = entry.userName || entry.handverkerNavn || 'Håndverker';
  const roleOrFirstName = rawName.split(' ')[0];

  return {
    id: entry.id,
    prosjektId: entry.projectId,
    prosjektNavn: maskPII(entry.projectName || 'Prosjekt'),
    handverker: `${roleOrFirstName} (${entry.category || 'Fagarbeider'})`,
    timer: Number(entry.hours) || 0,
    beskrivelse: maskPII(entry.description || ''),
    dato: entry.date,
    kategori: entry.category || 'arbeid'
  };
}

/**
 * 📖 Vasker byggedagbok for ekstern visning.
 */
export function sanitizeDailyLogForAgent(log: any) {
  if (!log) return null;

  const crew = Array.isArray(log.crewMembers) 
    ? log.crewMembers.map((member: string) => {
        const first = member.split(' ')[0];
        return `${first} (Håndverker)`;
      })
    : [];

  return {
    id: log.id,
    prosjektId: log.projectId,
    dato: log.date,
    vaerforhold: log.weatherCondition || 'Normalt',
    bemanningAntall: crew.length || 1,
    bemanningRoller: crew,
    totaleTimer: Number(log.totalHoursWorked) || 0,
    dagsrapport: maskPII(log.generalNotes || log.notat || '')
  };
}

/**
 * ⚠️ Vasker avvik for helseopplysninger og personkonflikter.
 */
export function sanitizeDeviationForAgent(dev: any) {
  if (!dev) return null;
  return {
    id: dev.id,
    prosjektId: dev.projectId,
    prosjektNavn: maskPII(dev.projectName || 'Byggeplass'),
    tittel: maskPII(dev.title || 'Avvik'),
    alvorlighetsgrad: dev.severity || 'medium',
    fag: dev.trade || 'Byggmester',
    status: dev.status || 'open',
    beskrivelse: maskPII(dev.description || ''),
    korrigerendeTiltak: maskPII(dev.correctiveAction || dev.resolutionNote || ''),
    dato: dev.createdAt
  };
}

/**
 * 🛡️ Sikker Jobb Analyse (SJA) vask.
 */
export function sanitizeSjaForAgent(sja: any) {
  if (!sja) return null;
  return {
    id: sja.id,
    prosjektId: sja.projectId,
    prosjektNavn: maskPII(sja.projectName || 'Byggeplass'),
    tittel: maskPII(sja.title || 'SJA'),
    arbeidsoppgave: maskPII(sja.task || sja.description || sja.arbeidsoppgave || ''),
    risikoer: Array.isArray(sja.risikoer) ? sja.risikoer.map((r: string) => maskPII(r)) : [],
    tiltak: Array.isArray(sja.tiltak) ? sja.tiltak.map((t: string) => maskPII(t)) : [],
    dato: sja.createdAt
  };
}

/**
 * 🔄 Universell GDPR-skjold for all tekst og JSON som returneres fra MCP-verktøy.
 */
export function applyPrivacyShield(payload: any): any {
  if (payload === null || payload === undefined) return payload;

  if (typeof payload === 'string') {
    return maskPII(payload);
  }

  if (Array.isArray(payload)) {
    return payload.map(item => applyPrivacyShield(item));
  }

  if (typeof payload === 'object') {
    const cleansed: Record<string, any> = {};
    for (const [key, value] of Object.entries(payload)) {
      // Sensitivitetsnøkler som aldri skal sendes ut i rå format
      const lowerKey = key.toLowerCase();
      if (lowerKey === 'fnr' || lowerKey === 'fodselsnummer' || lowerKey === 'personnummer') {
        cleansed[key] = '[FNR_SKJULT_GDPR]';
      } else if (lowerKey.includes('bankkonto') || lowerKey.includes('kontonummer')) {
        cleansed[key] = '[KONTONR_SKJULT_GDPR]';
      } else if (lowerKey.includes('passord') || lowerKey.includes('secret') || lowerKey.includes('token')) {
        cleansed[key] = '[HEMMELIGHET_SKJULT]';
      } else {
        cleansed[key] = applyPrivacyShield(value);
      }
    }
    return cleansed;
  }

  return payload;
}
