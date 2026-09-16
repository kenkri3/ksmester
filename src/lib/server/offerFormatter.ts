import { sanitizePlainText } from '@/src/lib/utils';

/**
 * Formaterer en ren, komplett og kundevennlig tilbudsbeskrivelse med standardforbehold
 * i henhold til TEK17, Byggforskserien og NS 8406 / Bustadoppføringslova.
 * Unngår 100% avkutting, markdown-stjerner (**) og intern chat-dialog.
 */
export function formatCleanOfferDescription(
  scopeText: string,
  projectName?: string,
  clientName?: string
): string {
  const clean = sanitizePlainText(scopeText)
    .replace(/^tilbud\s+(?:til|på|om)?\s*/i, '')
    .replace(/^(?:lag|skriv|opprett|beregn|gi\s+meg)\s+(?:et\s+)?tilbud\s+(?:til|på|om)?\s*/i, '')
    .replace(/^(?:trenger\s+(?:et\s+)?tilbud\s+(?:til|på|om)?\s*)/i, '')
    .trim();

  const scopeHeader = clean && clean.length > 3
    ? `Arbeidet omfatter fagmessig leveranse og utførelse av: ${clean.slice(0, 160)}.`
    : (projectName ? `Arbeidet omfatter avtalt fagmessig håndverksleveranse på prosjektet «${projectName}».` : `Arbeidet omfatter avtalt fagmessig håndverksleveranse iht. prosjektbeskrivelse.`);

  return `${scopeHeader}\n\n` +
    `Standard forbehold og betingelser:\n` +
    `• Utførelse iht. gjeldende teknisk forskrift (TEK17) og Byggforskserien.\n` +
    `• Det tas forbehold om skjulte feil, fukt/råte eller uforutsette bygningsmessige hindringer som ikke var synlige ved befaring.\n` +
    `• Eventuelle tilleggsarbeider eller avvik avtales skriftlig iht. NS 8406 før igangsettelse.\n` +
    `• Tilbudet er gyldig i 30 dager fra dags dato. Alle priser er oppgitt ekskl. mva med mindre annet er spesifisert.`;
}

/**
 * Formaterer en ren, komplett og formell endringsordrebeskrivelse iht. NS 8406 pkt. 19.
 */
export function formatCleanChangeOrderDescription(
  causeText: string,
  projectName?: string
): string {
  const clean = sanitizePlainText(causeText)
    .replace(/^endring\s+(?:på|om|i)?\s*/i, '')
    .replace(/^(?:opprett|lag|varsle)\s+(?:en\s+)?endringsordre\s+(?:på|om|for)?\s*/i, '')
    .trim();

  const scopeHeader = clean && clean.length > 3
    ? `Beskrivelse av endrings- og tilleggsarbeid: ${clean.slice(0, 160)}.`
    : `Endrings- og tilleggsarbeid iht. oppdragsgivers anvisning eller uforutsette forhold på byggeplass.`;

  return `${scopeHeader}\n\n` +
    `Hjemmel og vilkår (NS 8406 pkt. 19):\n` +
    `• Arbeidet utføres som skriftlig varslet tillegg til opprinnelig kontrakt.\n` +
    `• Det kreves vederlagsjustering og eventuell fristforlengelse iht. oppgitt spesifikasjon.\n` +
    `• Endringen iverksettes etter skriftlig avklaring eller pålegg uten ugrunnet opphold.`;
}
