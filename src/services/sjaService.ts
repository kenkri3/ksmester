import { generateAiContent } from "./aiClient";
import { WeatherData } from "./weatherService";

export interface SJADraft {
  title: string;
  task: string;
  risikoer: { aktivitet: string; risiko: string; tiltak: string }[];
  utstyr: string[];
  tek17Reference: string;
  weatherImpact?: string;
  tittel?: string;
  arbeidsoppgave?: string;
  tek17_referanse?: string;
  weather_impact?: string;
  user_feedback?: {
    tittel: string;
    hovedrisiko: string;
  };
}

export const sjaService = {
  /**
   * Generates a draft SJA based on project context, task description, and weather.
   * Leverages server-side rule engine (0 tokens) and AI caching.
   */
  async generateDraft(
    projectContext: { name: string; description?: string; location: string }, 
    taskDescription: string,
    weather?: WeatherData,
    uiLanguage: string = 'no'
  ): Promise<SJADraft> {
    const weatherPrompt = weather ? `
      VÆRFORHOLD:
      Temperatur: ${weather.temp}°C
      Tilstand: ${weather.condition}
      Vindstyrke: ${weather.windSpeed} m/s
      Nedbør: ${weather.precipitation} mm
      Beskrivelse: ${weather.description}
      
      Vurder spesielt hvordan disse værforholdene påvirker sikkerheten for oppgaven (f.eks. vind ved kranløft, glatte flater ved takarbeid, kulde ved støping).
    ` : '';

    const prompt = `
      Som en ekspert på HMS og Sikker Jobb Analyse (SJA) i den norske byggebransjen, generer et utkast til SJA.
      Prosjekt: ${projectContext.name}
      Beskrivelse: ${projectContext.description || 'Ikke oppgitt'}
      Lokasjon: ${projectContext.location}
      Arbeidsoppgave: ${taskDescription}
      ${weatherPrompt}

      Vurder relevante TEK17 og SAK10 krav.
      Foreslå spesifikke risikoelementer knyttet til aktiviteten, og konkrete tiltak for å minimere risiko.
      Inkluder også nødvendig verneutstyr og verktøy.

      VIKTIG PROSESS-KRAV: Uansett hvilket språk arbeidsoppgaven eller inputen er skrevet på (polsk, litauisk, engelsk osv.), SKAL alle felt i SJA-dokumentet ALLTID skrives/genereres på profesjonelt NORSK (Bokmål) i henhold til norsk HMS-lovgivning.
      ${uiLanguage !== 'no' ? `Generer også et kort "user_feedback"-objekt på språket "${uiLanguage}" slik at håndverkeren umiddelbart forstår hovedrisikoen.` : ''}

      Returner et JSON-objekt med følgende struktur:
      {
        "title": "En passende tittel for SJAen",
        "task": "En detaljert beskrivelse av oppgaven",
        "risikoer": [
          { "aktivitet": "Spesifikk deloppgave", "risiko": "Hva kan gå galt?", "tiltak": "Hvordan forhindre det?" }
        ],
        "utstyr": ["Liste", "over", "utstyr"],
        "tek17Reference": "Relevante paragrafer fra TEK17/SAK10",
        "weatherImpact": "En kort oppsummering av hvordan været påvirker denne spesifikke oppgaven"${uiLanguage !== 'no' ? ',\n        "user_feedback": { "tittel": "tittel på ' + uiLanguage + '", "hovedrisiko": "hovedrisiko på ' + uiLanguage + '" }' : ''}
      }
    `;

    try {
      const response = await generateAiContent({
        model: "gemini-2.5-flash",
        prompt: prompt,
        operation: "sja_generation",
        taskDescription: taskDescription,
        weatherContext: weather ? `${weather.condition}, ${weather.temp}°C, vind ${weather.windSpeed} m/s` : undefined,
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            title: { type: "STRING" },
            task: { type: "STRING" },
            risikoer: {
              type: "ARRAY",
              items: {
                type: "OBJECT",
                properties: {
                  aktivitet: { type: "STRING" },
                  risiko: { type: "STRING" },
                  tiltak: { type: "STRING" }
                },
                required: ["aktivitet", "risiko", "tiltak"]
              }
            },
            utstyr: {
              type: "ARRAY",
              items: { type: "STRING" }
            },
            tek17Reference: { type: "STRING" },
            weatherImpact: { type: "STRING" }
          },
          required: ["title", "task", "risikoer", "utstyr", "tek17Reference", "weatherImpact"]
        }
      });

      const parsed = JSON.parse(response.text || '{}');
      const title = parsed.title || parsed.tittel || 'Sikker Jobb Analyse';
      const task = parsed.task || parsed.arbeidsoppgave || taskDescription;
      const tek17 = parsed.tek17Reference || parsed.tek17_referanse || 'TEK17 § 12-16';
      const weatherImp = parsed.weatherImpact || parsed.weather_impact || 'Normalt';

      return {
        title,
        tittel: title,
        task,
        arbeidsoppgave: task,
        risikoer: parsed.risikoer || [],
        utstyr: parsed.utstyr || [],
        tek17Reference: tek17,
        tek17_referanse: tek17,
        weatherImpact: weatherImp,
        weather_impact: weatherImp,
        user_feedback: parsed.user_feedback || {
          tittel: title,
          hovedrisiko: parsed.risikoer?.[0]?.risiko || 'Følg vanlige HMS-rutiner'
        }
      };
    } catch (error) {
      console.error("SJA Generation error:", error);
      throw error;
    }
  }
};

export interface NormalizedSJARisk {
  aktivitet: string;
  risiko: string;
  tiltak: string;
  riskLevel: 'Lav' | 'Middels' | 'Høy';
}

export interface NormalizedSJA {
  id: string;
  title: string;
  task: string;
  projectName: string;
  location: string;
  participants: string;
  authorName: string;
  status: 'draft' | 'approved' | 'completed' | string;
  tek17Reference: string;
  weatherImpact?: string;
  timestamp?: any;
  createdAt?: any;
  risikoer: NormalizedSJARisk[];
  utstyr: string[];
}

export function normalizeSJAData(sja: any, projectContext?: any): NormalizedSJA {
  if (!sja) {
    return {
      id: 'sja-default',
      title: 'Sikker Jobb Analyse (SJA)',
      task: 'Generell fagoppgave',
      projectName: projectContext?.name || 'Byggeprosjekt',
      location: projectContext?.location || 'Byggeplass',
      participants: 'Arbeidslag',
      authorName: 'HMS-ansvarlig',
      status: 'approved',
      tek17Reference: 'Byggherreforskriften § 18',
      risikoer: [],
      utstyr: []
    };
  }

  const title = sja.title || sja.jobTitle || sja.phaseTitle || 'Sikker Jobb Analyse (SJA)';
  const task = sja.task || sja.workTask || sja.description || sja.title || 'Fagmessig utførelse av arbeidsoperasjon';
  const projectName = sja.projectName || projectContext?.name || 'Byggeprosjekt';
  const location = sja.location || sja.arbeidssted || projectContext?.location || 'Byggeplass';
  const participants = sja.participants || sja.deltakere || 'Tømrerteam / Utførende håndverkere';
  const authorName = sja.authorName || sja.responsible || sja.createdBy || 'HMS-ansvarlig';
  const status = sja.status || 'approved';
  const tek17Reference = sja.tek17Reference || sja.tek17_referanse || sja.hjemmel || 'Byggherreforskriften § 18 & Forskrift om utførelse av arbeid';
  const weatherImpact = sja.weatherImpact || sja.weather_impact || sja.weather || '';

  let risikoer: NormalizedSJARisk[] = [];

  if (Array.isArray(sja.risikoer) && sja.risikoer.length > 0) {
    risikoer = sja.risikoer.map((r: any, idx: number) => {
      if (typeof r === 'string') {
        return {
          aktivitet: `Arbeidsmoment ${idx + 1}`,
          risiko: r,
          tiltak: (Array.isArray(sja.mitigations) && sja.mitigations[idx]) || 'Bruk påkrevd verneutstyr og etabler sikkerhetssone',
          riskLevel: (idx === 0 ? 'Høy' : 'Middels') as 'Høy' | 'Middels'
        };
      }
      return {
        aktivitet: r.aktivitet || r.activity || `Moment ${idx + 1}`,
        risiko: r.risiko || r.hazard || r.risk || 'Vurdert risiko',
        tiltak: r.tiltak || r.measure || r.mitigation || 'Iverksett påkrevd vernetiltak',
        riskLevel: (r.riskLevel || (idx === 0 ? 'Høy' : 'Middels')) as 'Lav' | 'Middels' | 'Høy'
      };
    });
  } else if (Array.isArray(sja.hazards) && sja.hazards.length > 0) {
    const mitigations = Array.isArray(sja.mitigations) 
      ? sja.mitigations 
      : (Array.isArray(sja.measures) ? sja.measures : []);
    
    risikoer = sja.hazards.map((h: any, idx: number) => ({
      aktivitet: `Operasjon ${idx + 1}`,
      risiko: typeof h === 'string' ? h : (h.risiko || h.hazard || 'Vurdert fare'),
      tiltak: mitigations[idx] || (typeof h === 'object' && h.tiltak) || 'Påkrevd sikkerhetstiltak og barrierer iverksatt',
      riskLevel: (idx === 0 ? 'Høy' : 'Middels') as 'Høy' | 'Middels'
    }));
  } else if (Array.isArray(sja.risks) && sja.risks.length > 0) {
    const mitigations = Array.isArray(sja.mitigations) ? sja.mitigations : [];
    risikoer = sja.risks.map((r: any, idx: number) => ({
      aktivitet: r.activity || r.aktivitet || `Moment ${idx + 1}`,
      risiko: typeof r === 'string' ? r : (r.hazard || r.risk || r.risiko || 'Fare'),
      tiltak: r.measure || r.tiltak || mitigations[idx] || 'Sikre arbeidsstedet og bruk egnet verneutstyr',
      riskLevel: (r.riskLevel || (idx === 0 ? 'Høy' : 'Middels')) as 'Lav' | 'Middels' | 'Høy'
    }));
  } else {
    // Intelligent fallback basert på oppgavetekst og faginnhold
    const lower = (task + ' ' + title).toLowerCase();
    if (lower.includes('stillas') || lower.includes('høyde') || lower.includes('tak')) {
      risikoer = [
        {
          aktivitet: 'Arbeid i stillas og på tak (> 2 meter)',
          risiko: 'Fall fra høyde ved montering/bruk, svikt i stillasunderlag',
          tiltak: 'Godkjent stillas med grønt kontrollskilt, komplett rekkverk og godkjent fallsikringssele',
          riskLevel: 'Høy'
        },
        {
          aktivitet: 'Håndtering av verktøy og byggevarer',
          risiko: 'Miste gjenstander ned mot bakkeplan eller personell under',
          tiltak: 'Sperr av bakkenivå med sperrebånd, bruk verktøysnor og vernehjelm med hakestropp',
          riskLevel: 'Middels'
        },
        {
          aktivitet: 'Adkomst og daglig ferdsel',
          risiko: 'Sklifare og fall gjennom åpne stillasluker',
          tiltak: 'Luker skal alltid holdes lukket etter passering. Daglig visuell kontroll før oppstart',
          riskLevel: 'Middels'
        }
      ];
    } else if (lower.includes('varm') || lower.includes('sveis') || lower.includes('brenn') || lower.includes('taktekking')) {
      risikoer = [
        {
          aktivitet: 'Bruk av åpen flamme / gassbrenner',
          risiko: 'Brannutvikling i brennbart treverk eller isolasjon',
          tiltak: 'Sertifikat for varme arbeider, 2x 6kg pulverapparat umiddelbart tilgjengelig og 10m ryddesone',
          riskLevel: 'Høy'
        },
        {
          aktivitet: 'Etterkontroll og ulmebrannsikring',
          risiko: 'Ulmebrann i bjelkelag/vegg etter avsluttet arbeid',
          tiltak: 'Kontinuerlig brannvakt i minst 60 minutter etter at flamme/varme er slukket',
          riskLevel: 'Høy'
        }
      ];
    } else if (lower.includes('sag') || lower.includes('kapp') || lower.includes('riving') || lower.includes('støv')) {
      risikoer = [
        {
          aktivitet: 'Kapping med gjerdesag og vinkelsliper',
          risiko: 'Kutt- og øyeskader fra roterende blad eller splint/gnist',
          tiltak: 'Bruk vernebriller, hørselsvern, arbeidshansker og påse at spaltekniv/skjerm er montert',
          riskLevel: 'Høy'
        },
        {
          aktivitet: 'Bearbeiding av plater og trevirke',
          risiko: 'Innånding av kvarts- og trestøv (støvflukt)',
          tiltak: 'Bruk punktavsug med M/H-klasse filter og godkjent P3 støvmaske',
          riskLevel: 'Middels'
        }
      ];
    } else {
      risikoer = [
        {
          aktivitet: 'Klargjøring og oppstart av oppgaven',
          risiko: 'Uoversiktlig arbeidsområde, snuble- og klemfare',
          tiltak: 'Rydd adkomstveier, etabler tilstrekkelig arbeidsbelysning og sperr av risikoområde',
          riskLevel: 'Middels'
        },
        {
          aktivitet: 'Fagmessig utførelse og verktøybruk',
          risiko: 'Feilbelastning, klemfare og skade ved maskinbruk',
          tiltak: 'Bruk personlig verneutstyr (hjelm, hansker, vernesko) og kontroller maskiner før start',
          riskLevel: 'Middels'
        },
        {
          aktivitet: 'Avslutning, rydding og sikring',
          risiko: 'Uavdekket risiko for andre fag, tredjeperson eller brann',
          tiltak: 'Sluttkontroll, låsing av verktøy/strøm og bortkjøring av brennbart avfall',
          riskLevel: 'Lav'
        }
      ];
    }
  }

  let utstyr: string[] = [];
  if (Array.isArray(sja.utstyr) && sja.utstyr.length > 0) {
    utstyr = sja.utstyr;
  } else if (Array.isArray(sja.ppe) && sja.ppe.length > 0) {
    utstyr = sja.ppe;
  } else if (Array.isArray(sja.equipment) && sja.equipment.length > 0) {
    utstyr = sja.equipment;
  } else if (Array.isArray(sja.verneutstyr) && sja.verneutstyr.length > 0) {
    utstyr = sja.verneutstyr;
  } else {
    utstyr = ['Hjelm med hakestropp', 'Vernesko S3', 'Vernebriller', 'Hørselvern', 'Arbeidshansker EN 388'];
  }

  return {
    id: sja.id || `sja-${Date.now()}`,
    title,
    task,
    projectName,
    location,
    participants,
    authorName,
    status,
    tek17Reference,
    weatherImpact,
    timestamp: sja.timestamp || sja.createdAt || new Date().toISOString(),
    createdAt: sja.createdAt || sja.timestamp || new Date().toISOString(),
    risikoer,
    utstyr
  };
}
