/**
 * Cross-Trade Interface Engine (Tverrfaglig Grensesnitt- og Lukkesperremotor)
 * 
 * Ensures seamless coordination between General Contractors (Totalentreprenør)
 * and Subcontractors (Underentreprenører/UE) across trades:
 * - Carpenter / Bygg (Tømrer)
 * - Plumber / VVS (Rørlegger)
 * - Electrician / Elektro
 * - Mason / Flislegger / Maler
 * - Ventilation / Blikkenslager
 * - Earthwork / Grunnarbeid
 * 
 * Enforces TEK17 pre-close checks to eliminate the #1 cause of building defect lawsuits:
 * Closing walls or tiling floors before concealed piping/electrical/moisture checks are verified.
 */

export type TradeKey = 'carpenter' | 'plumber' | 'electrician' | 'mason' | 'painter' | 'ventilation' | 'earthwork';

export interface PreCloseRequirement {
  id: string;
  trade: TradeKey;
  tradeName: string;
  category: 'hidden_installation' | 'moisture_barrier' | 'fire_sound' | 'structural' | 'handover';
  title: string;
  description: string;
  tek17Hjemmel: string;
  isMandatoryBeforeClosure: boolean;
}

export interface RoomPreCloseStatus {
  roomName: string;
  canClose: boolean;
  overallStatus: 'GREEN' | 'YELLOW' | 'RED';
  blockers: string[];
  pendingTrades: { trade: TradeKey; tradeName: string; task: string }[];
  recommendations: string[];
}

export interface HandoverComplianceCheck {
  isReadyForHandover: boolean;
  score: number; // 0 - 100
  readyItems: string[];
  missingItems: { trade: string; requirement: string; legalRef: string }[];
  tek17WasteGradOk: boolean; // >= 70% requirement
}

/**
 * Predefined TEK17 Pre-Close Checklist Rules
 */
export const PRE_CLOSE_WALL_REQUIREMENTS: PreCloseRequirement[] = [
  {
    id: 'req_vvs_pressure',
    trade: 'plumber',
    tradeName: 'Rørlegger / VVS',
    category: 'hidden_installation',
    title: 'Trykktesting av rør-i-rør fordelerskap',
    description: 'Trykktestrapport må være registrert og fotodokumentert uten trykkfall før vegg kles.',
    tek17Hjemmel: 'TEK17 § 13-15 (Vanninstallasjoner skal være lett utskiftbare og lekkasjesikre)',
    isMandatoryBeforeClosure: true
  },
  {
    id: 'req_el_photo',
    trade: 'electrician',
    tradeName: 'Elektriker',
    category: 'hidden_installation',
    title: 'Fotodokumentasjon av skjultanlegg og koblingsbokser',
    description: 'Bilder av rørføringer i stenderverk og jording før isolering og plating.',
    tek17Hjemmel: 'NEK 400:2022 og TEK17 § 14-1',
    isMandatoryBeforeClosure: true
  },
  {
    id: 'req_carpenter_vapor',
    trade: 'carpenter',
    tradeName: 'Tømrer',
    category: 'moisture_barrier',
    title: 'Dampsperre klemt og tapet ubrutt ved alle gjennomføringer',
    description: 'Aldringsbestandig teip og klemlist mot tilstøtende betong/konstruksjon.',
    tek17Hjemmel: 'TEK17 § 13-14 (Fuktsikring og lufttetthet)',
    isMandatoryBeforeClosure: true
  },
  {
    id: 'req_carpenter_insulation',
    trade: 'carpenter',
    tradeName: 'Tømrer',
    category: 'fire_sound',
    title: 'Korrekt isolasjonstykkelse uten komprimering eller kuldebroer',
    description: 'Full isolasjonsfylling uten glipper i hjørner og rundt vinduer.',
    tek17Hjemmel: 'TEK17 § 14-2 (Energieffektivitet)',
    isMandatoryBeforeClosure: false
  }
];

export const PRE_TILING_BATHROOM_REQUIREMENTS: PreCloseRequirement[] = [
  {
    id: 'req_sluk_klemring',
    trade: 'plumber',
    tradeName: 'Rørlegger',
    category: 'moisture_barrier',
    title: 'Montering av slukmansjett med klemring og rørgjennomføringer',
    description: 'Typegodkjent mansjett montert og tilpasset sluk før membran smøres/sveises.',
    tek17Hjemmel: 'TEK17 § 13-15 og BVN 31.205 (Våtromsnormen)',
    isMandatoryBeforeClosure: true
  },
  {
    id: 'req_fall_sluk',
    trade: 'mason',
    tradeName: 'Murer / Flislegger',
    category: 'structural',
    title: 'Kontroll av fall til sluk (1:50 i dusjsone)',
    description: 'Verifiser jevnt fall mot sluk uten motfall over hele gulvflaten.',
    tek17Hjemmel: 'TEK17 § 13-15 annet ledd (Fall til sluk)',
    isMandatoryBeforeClosure: true
  },
  {
    id: 'req_restfukt',
    trade: 'mason',
    tradeName: 'Murer / Maler',
    category: 'moisture_barrier',
    title: 'Fuktmåling i underlag / påstøp før membranstryk',
    description: 'Maksimal tillatt restfuktighet i betong/støp iht. leverandøranvisning (< 85-90% RF).',
    tek17Hjemmel: 'TEK17 § 13-14 (Fukt)',
    isMandatoryBeforeClosure: true
  }
];

/**
 * Evaluates whether a room or zone is clear for closure (Lukkesperre)
 */
export function evaluatePreCloseWall(params: {
  roomName: string;
  hasPlumberSignoff: boolean;
  hasElectricianPhotos: boolean;
  hasVaporBarrierChecked: boolean;
  hasInsulationChecked: boolean;
}): RoomPreCloseStatus {
  const blockers: string[] = [];
  const pendingTrades: { trade: TradeKey; tradeName: string; task: string }[] = [];
  const recommendations: string[] = [];

  if (!params.hasPlumberSignoff) {
    blockers.push('Rørlegger har ikke registrert trykktest / lekkasjetest for rør-i-rør på dette rommet.');
    pendingTrades.push({
      trade: 'plumber',
      tradeName: 'Rørlegger / VVS',
      task: 'Gjennomfør trykkprøving og last opp bilde av manometer i VikingMester.'
    });
  }

  if (!params.hasElectricianPhotos) {
    blockers.push('Elektriker har ikke fotografert skjulte rørføringer og koblingsbokser.');
    pendingTrades.push({
      trade: 'electrician',
      tradeName: 'Elektriker',
      task: 'Ta oversiktsbilde av skjultanlegg i stendere før plater skrus.'
    });
  }

  if (!params.hasVaporBarrierChecked) {
    blockers.push('Dampsperrekontroll (lufttetthet og teipede mansjetter) er ikke kvittert ut.');
    pendingTrades.push({
      trade: 'carpenter',
      tradeName: 'Tømrer',
      task: 'Sjekk gjennomføringer og klem dampsperre før gips monteres.'
    });
  }

  if (!params.hasInsulationChecked) {
    recommendations.push('Husk å kontrollere isolasjon mot kuldebroer bak hjørnestendere før plating.');
  }

  const canClose = blockers.length === 0;
  const overallStatus: RoomPreCloseStatus['overallStatus'] = blockers.length === 0 
    ? 'GREEN' 
    : blockers.length === 1 
    ? 'YELLOW' 
    : 'RED';

  return {
    roomName: params.roomName,
    canClose,
    overallStatus,
    blockers,
    pendingTrades,
    recommendations
  };
}

/**
 * Checks overall project compliance for Handover and Byggherreforskriften
 */
export function checkHandoverCompliance(params: {
  samsvarserklaeringElektro: boolean;
  vvsTrykktestRapport: boolean;
  fdvBoligmappaKlar: boolean;
  avfallKildesorteringsGrad: number; // e.g. 74%
  sluttkontrollFullfort: boolean;
  uavklarteAvvikCount: number;
}): HandoverComplianceCheck {
  const readyItems: string[] = [];
  const missingItems: { trade: string; requirement: string; legalRef: string }[] = [];

  let score = 0;

  // 1. Elektro Samsvar
  if (params.samsvarserklaeringElektro) {
    score += 25;
    readyItems.push('Samsvarserklæring og sluttkontroll for el-anlegg foreligger (NEK 400).');
  } else {
    missingItems.push({
      trade: 'Elektriker',
      requirement: 'Lovpålagt samsvarserklæring og sluttkontroll mangler.',
      legalRef: 'Forskrift om elektriske lavspenningsanlegg (FEL) § 12'
    });
  }

  // 2. VVS Trykktest
  if (params.vvsTrykktestRapport) {
    score += 25;
    readyItems.push('Trykktest- og tetthetsrapport for sanitæranlegg er godkjent.');
  } else {
    missingItems.push({
      trade: 'Rørlegger / VVS',
      requirement: 'Trykktestrapport for vannbårent anlegg / forbruksvann mangler.',
      legalRef: 'TEK17 § 13-15'
    });
  }

  // 3. Avfallsplan og sorteringsgrad (TEK17 kap. 9 krav er min. 70%)
  const tek17WasteGradOk = params.avfallKildesorteringsGrad >= 70;
  if (tek17WasteGradOk) {
    score += 20;
    readyItems.push(`Avfallsrapport oppfyller TEK17: ${params.avfallKildesorteringsGrad}% kildesortering (krav: 70%).`);
  } else {
    missingItems.push({
      trade: 'Totalentreprenør / Bygg',
      requirement: `Kildesorteringsgrad er ${params.avfallKildesorteringsGrad}%, som er under TEK17-kravet på 70%.`,
      legalRef: 'TEK17 § 9-6 (Sluttrapport for avfallshåndtering)'
    });
  }

  // 4. FDV & Boligmappa
  if (params.fdvBoligmappaKlar) {
    score += 15;
    readyItems.push('Komplett FDV-dokumentasjon og produktdatablad er generert for Boligmappa.');
  } else {
    missingItems.push({
      trade: 'Alle fag',
      requirement: 'FDV-dokumentasjon (Forvaltning, Drift og Vedlikehold) for innsatte produkter er ufullstendig.',
      legalRef: 'SAK10 § 8-2 og TEK17 § 4-1'
    });
  }

  // 5. Sluttkontroll & Avvik
  if (params.sluttkontrollFullfort && params.uavklarteAvvikCount === 0) {
    score += 15;
    readyItems.push('Felles sluttkontroll / overleveringsprotokoll er signert uten åpne avvik.');
  } else {
    missingItems.push({
      trade: 'Totalentreprenør / Byggherre',
      requirement: params.uavklarteAvvikCount > 0 
        ? `Det gjenstår ${params.uavklarteAvvikCount} uavklarte avvik som må lukkes før overtakelse.`
        : 'Sluttkontroll / overleveringsprotokoll er ikke gjennomført.',
      legalRef: 'Bustadoppføringslova § 14 / NS 8406 pkt 26'
    });
  }

  return {
    isReadyForHandover: missingItems.length === 0,
    score,
    readyItems,
    missingItems,
    tek17WasteGradOk
  };
}
