/**
 * Én sannhetskilde for plattformens juridiske opplysninger.
 *
 * BAKGRUNN (revisjonsfunn R-01 / R-02)
 * Organisasjonsnummeret sto hardkodet på 16 steder i repoet, med to ulike
 * verdier: `933 607 779` og `933 851 222`. Begge kunne ikke være riktige.
 *
 * VERIFISERT 2026-10-05 mot Enhetsregisteret:
 * - `933 607 779` → HTTP 404 hos Brreg, og stryker den norske
 *   mod-11-kontrollen (vekter 3,2,7,6,5,4,3,2 → sum 153, forventet
 *   kontrollsiffer 1, faktisk 9). Nummeret finnes ikke.
 * - `933 851 222` → HTTP 200, `"navn":"AI CHAT NORGE AS"`, gyldig
 *   kontrollsiffer, org.form AS, stiftet 2024-06-20, forretningsadresse
 *   Vidjeveien 21, 3151 Tolvsrød, registrert i Foretaksregisteret og MVA.
 *
 * Kilden er offentlig og kan etterprøves:
 * https://data.brreg.no/enhetsregisteret/api/enheter/933851222
 *
 * ⚠️ Dersom det juridiske ansvarlige selskapet endres, skal det endres HER og
 * ingen andre steder. Verdien er ikke en miljøvariabel fordi de offentlige
 * sidene er statisk generert ved bygg og må ha en garantert verdi.
 *
 * ⚠️ Dette er PLATTFORMENS opplysninger. De skal aldri skrives inn i et
 * kundedokument som om de gjaldt kundens egen bedrift — se
 * `displayOrgnr()` under.
 */

export const PLATFORM_LEGAL_NAME = 'AIChat Norge AS';
export const PLATFORM_LEGAL_NAME_FULL = 'AIChat Norge AS / Vikingnet';
export const PLATFORM_ORGNUMBER = '933 851 222';
export const PLATFORM_ORGNUMBER_LABEL = '933 851 222 MVA';
export const PLATFORM_ADDRESS = 'Vidjeveien 21, 3151 Tolvsrød';
export const PLATFORM_SUPPORT_EMAIL = 'hei@vikingmester.no';

/**
 * Formaterer et organisasjonsnummer for visning, eller returnerer en
 * ærlig tomverdi.
 *
 * SIKKERHETSFIKS (R-02): genererte kundedokumenter skrev tidligere inn det
 * hardkodede plattformnummeret som om det var kundens eget. Feil org.nr i en
 * FDV-sluttdokumentasjon er et juridisk dokument med gal opplysning. Mangler
 * prosjektet org.nr, skal dokumentet si det — ikke låne plattformens.
 */
export function displayOrgnr(orgnr?: string | null): string {
  const clean = (orgnr || '').toString().replace(/\s+/g, '').trim();
  if (!/^\d{9}$/.test(clean)) return 'Ikke registrert';
  return `${clean.slice(0, 3)} ${clean.slice(3, 6)} ${clean.slice(6, 9)}`;
}
