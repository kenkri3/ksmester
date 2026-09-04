import { SafetyDataSheet, Project, ProjectMaterial } from '../types';
import { api } from './api';

// Standard database of common Norwegian building chemical safety data sheets
const COMMON_CHEMICAL_TEMPLATES: Omit<SafetyDataSheet, 'id' | 'projectId' | 'createdAt'>[] = [
  {
    productName: 'Tec7 Fuge- og monteringslim',
    manufacturer: 'Novatech AS',
    usageArea: 'Allsidig liming, fuging og tetting innvendig/utvendig',
    dangerSymbols: ['Helsefare'],
    hazardStatements: ['H317: Kan utløse en allergisk hudreaksjon.'],
    ppe: ['Hansker (Nitril)', 'Vernebriller'],
    firstAid: {
      inhalation: 'Frisk luft. Kontakt lege ved vedvarende ubehag.',
      skin: 'Vask umiddelbart med såpe og vann. Ikke bruk løsemidler.',
      eyes: 'Skyll grundig med rikelig vann i minst 15 minutter med åpne øyelokk.',
      ingestion: 'Skyll munnen. Drikk et par glass vann. Fremkall IKKE brekninger.'
    },
    fireHazards: 'Ikke brannfarlig under normale lagringsforhold.',
    storageInstructions: 'Oppbevares frostfritt og tørt mellom +5°C og +25°C.',
    autoDetected: true
  },
  {
    productName: 'Casco AquaStop Smøremembran',
    manufacturer: 'Sika Norge AS',
    usageArea: 'Vanntetting av våtrom, bad og vaskerom under fliser',
    dangerSymbols: ['Miljøfare', 'Helsefare'],
    hazardStatements: [
      'H317: Kan utløse en allergisk hudreaksjon.',
      'H412: Skadelig, med langtidsvirkning, for liv i vann.'
    ],
    ppe: ['Hansker (Kjemikaliebestandige)', 'Vernebriller', 'Vernetøy'],
    firstAid: {
      inhalation: 'Sørg for god ventilasjon og frisk luft.',
      skin: 'Fjern tilsølte klær og vask huden grundig med mild såpe og lunkent vann.',
      eyes: 'Skyll straks med øyeskylling eller lunkent vann i 15 min.',
      ingestion: 'Gi vann å drikke hvis personen er ved full bevissthet. Kontakt Giftinformasjonen.'
    },
    fireHazards: 'Vannbasert produkt, ikke brannfarlig.',
    storageInstructions: 'Oppbevares frostfritt. Må ikke utsettes for direkte sollys.',
    autoDetected: true
  },
  {
    productName: 'Sikaflex-11 FC+ Polyuretanlim/fuge',
    manufacturer: 'Sika Norge AS',
    usageArea: 'Konstruksjonsfuging og elastisk liming',
    dangerSymbols: ['Helsefare'],
    hazardStatements: [
      'H317: Kan utløse en allergisk hudreaksjon.',
      'H334: Kan gi allergi- eller astmasymptomer eller pustevansker ved innånding.'
    ],
    ppe: ['Hansker (Butylgummi)', 'Vernebriller', 'Åndedrettsvern (A2/P3 ved utilstrekkelig ventilasjon)'],
    firstAid: {
      inhalation: 'Flytt til frisk luft. Kontakt lege ved pustevansker.',
      skin: 'Vask grundig med rensekrem og vann.',
      eyes: 'Skyll umiddelbart med rikelig vann.',
      ingestion: 'Søk lege straks og vis etikett/datablad.'
    },
    fireHazards: 'Unngå åpen ild. Utvikler giftige gasser ved brann.',
    storageInstructions: 'Tørt og kjølig, unngå fuktighet før herding.',
    autoDetected: true
  },
  {
    productName: 'Jotun Drygolin Nordic Extreme / Veggmaling',
    manufacturer: 'Jotun A/S',
    usageArea: 'Fasade- og overflatebehandling treverk',
    dangerSymbols: ['Miljøfare'],
    hazardStatements: ['H412: Skadelig, med langtidsvirkning, for liv i vann.'],
    ppe: ['Hansker', 'Vernebriller ved sprøyting', 'Støvmaske ved sliping'],
    firstAid: {
      inhalation: 'Sørg for god lufting.',
      skin: 'Vask med vann og såpe.',
      eyes: 'Skyll godt med rent vann i 10 min.',
      ingestion: 'Drikk rikelig med vann. Kontakt lege ved større inntak.'
    },
    fireHazards: 'Ikke brennbar.',
    storageInstructions: 'Frostfritt og utilgjengelig for barn.',
    autoDetected: true
  },
  {
    productName: 'Hey\'di K10 / Byggmørtel / Hurtigstøp',
    manufacturer: 'Hey\'di AS',
    usageArea: 'Avretting av gulv, støp og reparasjon',
    dangerSymbols: ['Etsende', 'Helsefare'],
    hazardStatements: [
      'H315: Irriterer huden.',
      'H318: Gir alvorlig øyeskade.',
      'H335: Kan forårsake irritasjon av luftveiene.'
    ],
    ppe: ['Tette hansker', 'Tette vernebriller', 'Støvmaske P2'],
    firstAid: {
      inhalation: 'Frisk luft, puss nesen.',
      skin: 'Skyll med lunkent vann. Sement er alkalisk (etsende ved fuktighet).',
      eyes: 'Skyll umiddelbart kontinuerlig med saltvann/øyeskyll i minst 20 minutter. Legevakt omgående!',
      ingestion: 'Skyll munn, drikk melk/vann. Ikke fremkall brekning.'
    },
    fireHazards: 'Ubrennbar.',
    storageInstructions: 'Oppbevares helt tørt i lukkede sekker for å unngå klumping.',
    autoDetected: true
  },
  {
    productName: 'Dana Lim Byggskum / Fugeskum Pro 592',
    manufacturer: 'Dana Lim A/S',
    usageArea: 'Isolering og tetting rundt vinduer, dører og rør',
    dangerSymbols: ['Gass under trykk', 'Brannfarlig', 'Helsefare'],
    hazardStatements: [
      'H222: Ekstremt brannfarlig aerosol.',
      'H351: Mistenkes for å kunne forårsake kreft.',
      'H334: Kan gi astmasymptomer ved innånding.'
    ],
    ppe: ['Kjemikaliehansker', 'Vernebriller', 'God ventilasjon'],
    firstAid: {
      inhalation: 'Frisk luft, oppsøk lege ved ubehag.',
      skin: 'Uherdet skum fjernes med aceton/renseservietter, deretter såpe og vann. Herdet skum må slites av mekanisk.',
      eyes: 'Skyll øyeblikkelig med vann i minst 15 min.',
      ingestion: 'Søk legevakt umiddelbart.'
    },
    fireHazards: 'Beholder under trykk. Må ikke utsettes for temperaturer over 50°C.',
    storageInstructions: 'Stående, tørt og i romtemperatur (maks 30°C).',
    autoDetected: true
  }
];

export const stoffkartotekService = {
  /**
   * Get all safety data sheets for a project
   */
  async getProjectSheets(projectId: string): Promise<SafetyDataSheet[]> {
    try {
      const sheets = await api.getDocs<SafetyDataSheet>('safety_data_sheets');
      return sheets.filter(s => s.projectId === projectId);
    } catch (e) {
      console.warn('Error fetching safety data sheets:', e);
      return [];
    }
  },

  /**
   * Automatically scans project materials and generates required safety data sheets
   * to satisfy Arbeidstilsynets krav til kjemisk stoffkartotek.
   */
  async autoScanAndPopulate(project: Project): Promise<SafetyDataSheet[]> {
    const existing = await this.getProjectSheets(project.id);
    const existingNames = new Set(existing.map(s => s.productName.toLowerCase()));

    // Fetch project materials
    let materials: ProjectMaterial[] = [];
    try {
      const allMats = await api.getDocs<ProjectMaterial>('project_materials');
      materials = allMats.filter(m => m.projectId === project.id);
    } catch (e) {
      console.warn('Could not fetch materials:', e);
    }

    const created: SafetyDataSheet[] = [];

    // Match templates based on material names or general trade
    for (const tpl of COMMON_CHEMICAL_TEMPLATES) {
      const nameMatch = materials.some(m => 
        m.name.toLowerCase().includes(tpl.productName.toLowerCase().split(' ')[0]) ||
        m.description?.toLowerCase().includes(tpl.productName.toLowerCase().split(' ')[0])
      );

      // Or match typical trade requirements
      const trade = (project.tags?.[0] || 'general').toLowerCase();
      const isRelevantForTrade = 
        (tpl.productName.includes('AquaStop') && (trade.includes('plumb') || trade.includes('bad') || trade.includes('våtrom') || project.name.toLowerCase().includes('bad'))) ||
        (tpl.productName.includes('Drygolin') && (trade.includes('paint') || trade.includes('maler') || project.name.toLowerCase().includes('maling'))) ||
        (tpl.productName.includes('Hey\'di') && (trade.includes('mason') || trade.includes('murer') || project.name.toLowerCase().includes('støp') || project.name.toLowerCase().includes('bad'))) ||
        tpl.productName.includes('Tec7'); // Tec7 is used by all Norwegian trades

      if ((nameMatch || isRelevantForTrade) && !existingNames.has(tpl.productName.toLowerCase())) {
        const newSheet: SafetyDataSheet = {
          id: `sds_${project.id}_${Math.random().toString(36).substring(2, 8)}`,
          projectId: project.id,
          ...tpl,
          createdAt: new Date().toISOString()
        };

        await api.saveDoc('safety_data_sheets', newSheet);
        created.push(newSheet);
        existingNames.add(tpl.productName.toLowerCase());
      }
    }

    return [...existing, ...created];
  },

  /**
   * Add a custom safety data sheet manually
   */
  async addCustomSheet(sheet: Omit<SafetyDataSheet, 'id' | 'createdAt'>): Promise<SafetyDataSheet> {
    const newSheet: SafetyDataSheet = {
      id: `sds_${sheet.projectId}_${Math.random().toString(36).substring(2, 8)}`,
      ...sheet,
      createdAt: new Date().toISOString()
    };
    await api.saveDoc('safety_data_sheets', newSheet);
    return newSheet;
  }
};
