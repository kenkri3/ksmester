import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { getCollectionItems, saveCollectionItem, updateCollectionItem, deleteCollectionItem } from '@/src/lib/server/db';
import {
  maskPII,
  sanitizeProjectForAgent,
  sanitizeLeadForAgent,
  sanitizeTimeEntryForAgent,
  sanitizeDailyLogForAgent,
  sanitizeDeviationForAgent,
  sanitizeSjaForAgent,
  anonymizeAddress,
  anonymizePersonName,
  isCorporateEntity,
  applyPrivacyShield
} from '@/src/lib/server/privacyShield';

/**
 * 🛠️ VikingMester Remote MCP Server (Model Context Protocol)
 * Eksponerer trygge, strukturerte byggmesterverktøy for eksterne agenter.
 * Støtter både JSON-RPC 2.0 (Stream/POST) og SSE (GET).
 */

/**
 * 🛡️ SIKKERHETSFIKS (P0): MCP-tjeneren krevde tidligere ingen autentisering.
 *
 * Gammel implementasjon slapp ALLE inn:
 *   1. Manglende Authorization-header returnerte `true` ("No Authentication").
 *   2. `token.length > 0` godtok hvilken som helst ikke-tom verdi.
 *
 * Det gjorde at hvem som helst på internett kunne kalle alle 23 verktøy —
 * inkludert `slett_oppforing` (permanent sletting), `hent_leads` og
 * `hent_okonomi_status` — på tvers av alle kunder.
 *
 * Ny implementasjon feiler LUKKET: er ikke AGENT_MCP_SECRET_KEY konfigurert,
 * avvises alle kall. Sammenligningen er timing-safe.
 */
const EXPECTED_SECRET = (process.env.AGENT_MCP_SECRET_KEY || '').trim();

function isAuthorized(req: NextRequest): boolean {
  if (!EXPECTED_SECRET) {
    console.error(
      '[MCP] AGENT_MCP_SECRET_KEY er ikke konfigurert. Alle MCP-kall avvises (fail-closed). ' +
      'Sett AGENT_MCP_SECRET_KEY i miljøvariablene for å aktivere MCP-tjeneren.'
    );
    return false;
  }

  const authHeader =
    req.headers.get('authorization') ||
    req.headers.get('x-api-key') ||
    req.headers.get('x-mcp-secret') ||
    '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();

  if (!token || token.length !== EXPECTED_SECRET.length) return false;

  try {
    return timingSafeEqual(Buffer.from(token), Buffer.from(EXPECTED_SECRET));
  } catch {
    return false;
  }
}

// 📋 Definisjon av alle 8 verktøy i MCP-format
const MCP_TOOLS = [
  {
    name: 'registrer_timeforing',
    description: 'Bokfører timer på et byggeprosjekt og synkroniserer direkte inn i elektronisk byggedagbok (Byggherreforskriften § 15 & NS 8406).',
    inputSchema: {
      type: 'object',
      properties: {
        prosjektId: { type: 'string', description: 'ID eller navn på prosjektet (f.eks. "Kongeveien 93A")' },
        handverkerNavn: { type: 'string', description: 'Navn på håndverkeren som utførte arbeidet' },
        timer: { type: 'number', description: 'Antall timer arbeidet (f.eks. 7.5 eller 6)' },
        beskrivelse: { type: 'string', description: 'Hva slags arbeid som ble utført (f.eks. "Montering av stenderverk")' },
        dato: { type: 'string', description: 'Dato i format YYYY-MM-DD (standard er i dag)' },
        kategori: { type: 'string', enum: ['arbeid', 'overtid', 'reise'], description: 'Type timeføring' }
      },
      required: ['prosjektId', 'handverkerNavn', 'timer', 'beskrivelse']
    }
  },
  {
    name: 'oppdater_byggedagbok',
    description: 'Fører et notat eller registrerer status i prosjektets elektroniske byggedagbok iht. Byggherreforskriften § 15 og NS 8406.',
    inputSchema: {
      type: 'object',
      properties: {
        prosjektId: { type: 'string', description: 'ID eller navn på prosjektet' },
        notat: { type: 'string', description: 'Hendelse, notat eller fremdriftsrapport for dagen' },
        vaerforhold: { type: 'string', description: 'Værforhold observert på byggeplassen (f.eks. "14°C, opphold, 3 m/s vind")' },
        bemanning: { type: 'string', description: 'Bemanning på plassen i dag' }
      },
      required: ['prosjektId', 'notat']
    }
  },
  {
    name: 'opprett_sja',
    description: 'Oppretter og arkiverer en formell Sikker Jobb Analyse (SJA) iht. Byggherreforskriften § 18 og Internkontrollforskriften.',
    inputSchema: {
      type: 'object',
      properties: {
        prosjektId: { type: 'string', description: 'ID eller navn på prosjektet' },
        tittel: { type: 'string', description: 'Tittel på arbeidsoperasjonen (f.eks. "Arbeid i stillas over 4 meter")' },
        arbeidsoppgave: { type: 'string', description: 'Nærmere beskrivelse av hva som skal gjøres' },
        risikoer: { 
          type: 'array', 
          items: { type: 'string' }, 
          description: 'Identifiserte farer (f.eks. ["Fall fra høyde", "Gjenstander faller ned"])' 
        },
        tiltak: { 
          type: 'array', 
          items: { type: 'string' }, 
          description: 'Påkrevde vernetiltak (f.eks. ["Sikkerhetssele", "Avsperring under stillas", "Hjelm"])' 
        },
        hjemmel: { type: 'string', description: 'Lovhjemmel, f.eks. "Byggherreforskriften § 18 & Forskrift om utførelse av arbeid kap 17"' }
      },
      required: ['prosjektId', 'tittel', 'arbeidsoppgave', 'risikoer', 'tiltak']
    }
  },
  {
    name: 'registrer_avvik',
    description: 'Registrerer et kvalitets- eller HMS-avvik i prosjektets avviksregister med alvorlighetsgrad og forslag til tiltak.',
    inputSchema: {
      type: 'object',
      properties: {
        prosjektId: { type: 'string', description: 'ID eller navn på prosjektet' },
        tittel: { type: 'string', description: 'Kort og konsis tittel på avviket' },
        beskrivelse: { type: 'string', description: 'Detaljert beskrivelse av avviket' },
        alvorlighetsgrad: { type: 'string', enum: ['low', 'medium', 'high', 'critical'], description: 'Alvorlighetsgrad' },
        fag: { type: 'string', description: 'Berørt fag (f.eks. "Tømrer", "Membran", "Rørlegger")' },
        korrigerendeTiltak: { type: 'string', description: 'Forslag til hvordan avviket skal utbedres' }
      },
      required: ['prosjektId', 'tittel', 'beskrivelse']
    }
  },
  {
    name: 'opprett_endringsordre',
    description: 'Oppretter et formelt endrings- eller tilleggsvarsel i henhold til NS 8406 / Håndverkertjenesteloven § 9.',
    inputSchema: {
      type: 'object',
      properties: {
        prosjektId: { type: 'string', description: 'ID eller navn på prosjektet' },
        tittel: { type: 'string', description: 'Kort tittel på endringen (f.eks. "Ekstra bærebjelke stue")' },
        beskrivelse: { type: 'string', description: 'Hvorfor endringen er nødvendig og hva den innebærer' },
        belopEksMva: { type: 'number', description: 'Prisoverslag eller avtalt tilleggsbeløp eks mva i NOK' },
        dagerFristforlengelse: { type: 'number', description: 'Antall dager krevd i fristforlengelse (hvis aktuelt)' }
      },
      required: ['prosjektId', 'tittel', 'beskrivelse', 'belopEksMva']
    }
  },
  {
    name: 'hent_prosjekter',
    description: 'Henter listen over alle aktive og planlagte byggeprosjekter med ID, adresse og status.',
    inputSchema: {
      type: 'object',
      properties: {
        sokeord: { type: 'string', description: 'Valgfritt søkeord for å filtrere på navn, adresse eller kunde' }
      }
    }
  },
  {
    name: 'hent_prosjektdetaljer',
    description: 'Henter utfyllende informasjon om et prosjekt, inkludert førte timer, avvik, dagsrapporter og status.',
    inputSchema: {
      type: 'object',
      properties: {
        prosjektId: { type: 'string', description: 'ID eller navn på prosjektet' }
      },
      required: ['prosjektId']
    }
  },
  {
    name: 'sjekk_tek17_krav',
    description: 'Slår opp juridiske og faglige krav i Byggteknisk forskrift (TEK17) og Våtromsnormen (BVN).',
    inputSchema: {
      type: 'object',
      properties: {
        emne: { 
          type: 'string', 
          description: 'Hva du lurer på (f.eks. "fall mot sluk våtrom", "radonsperre", "lydkrav skillevegg", "u-verdi yttervegg")' 
        }
      },
      required: ['emne']
    }
  },
  {
    name: 'opprett_oppgave',
    description: 'Tildeler en ny arbeidsoppgave til en håndverker på et prosjekt med frist og prioritet.',
    inputSchema: {
      type: 'object',
      properties: {
        prosjektId: { type: 'string', description: 'ID eller navn på prosjektet' },
        tittel: { type: 'string', description: 'Kort tittel på oppgaven (f.eks. "Montere gipsplater i 2. etg")' },
        beskrivelse: { type: 'string', description: 'Beskrivelse av hva som skal gjøres' },
        tildeltTil: { type: 'string', description: 'Navn på håndverker som tildeles oppgaven' },
        frist: { type: 'string', description: 'Frist i format YYYY-MM-DD' },
        prioritet: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'], description: 'Prioritet på oppgaven' }
      },
      required: ['prosjektId', 'tittel']
    }
  },
  {
    name: 'hent_oppgaver',
    description: 'Henter listen over oppgaver og fremdrift, med mulighet for filtrering på prosjekt eller håndverker.',
    inputSchema: {
      type: 'object',
      properties: {
        prosjektId: { type: 'string', description: 'Valgfritt prosjekt-ID eller navn' },
        tildeltTil: { type: 'string', description: 'Valgfritt navn på håndverker' },
        status: { type: 'string', enum: ['pending', 'in_progress', 'completed', 'all'], description: 'Statusfilter' }
      }
    }
  },
  {
    name: 'hent_timer',
    description: 'Henter førte timer og timelister for et byggeprosjekt eller en spesifikk håndverker iht. Byggherreforskriften § 15.',
    inputSchema: {
      type: 'object',
      properties: {
        prosjektId: { type: 'string', description: 'Valgfritt prosjekt-ID eller navn' },
        handverkerNavn: { type: 'string', description: 'Valgfritt navn på håndverker' },
        fraDato: { type: 'string', description: 'Valgfri startdato (YYYY-MM-DD)' }
      }
    }
  },
  {
    name: 'opprett_prosjekt',
    description: 'Oppretter et nytt byggeprosjekt i VikingMester med prosjektkode, adresse, kunde og byggeleder.',
    inputSchema: {
      type: 'object',
      properties: {
        navn: { type: 'string', description: 'Navn på prosjektet (f.eks. "Rehabilitering Bad Storgata 12")' },
        adresse: { type: 'string', description: 'Gateadresse og poststed for byggeplassen' },
        byggeleder: { type: 'string', description: 'Navn på prosjekt- eller byggeleder' },
        kundeNavn: { type: 'string', description: 'Navn på kunden eller tiltakshaver' },
        kundeEpost: { type: 'string', description: 'E-postadresse til kunden' },
        kundeTelefon: { type: 'string', description: 'Telefonnummer til kunden' }
      },
      required: ['navn', 'adresse']
    }
  },
  {
    name: 'opprett_tilbud',
    description: 'Genererer et formelt tilbudsutkast eller priskalkyle for en kunde eller prosjekt.',
    inputSchema: {
      type: 'object',
      properties: {
        prosjektId: { type: 'string', description: 'ID eller navn på prosjektet (hvis knyttet til prosjekt)' },
        kundeNavn: { type: 'string', description: 'Kundenavn' },
        tittel: { type: 'string', description: 'Tittel på tilbudet (f.eks. "Tilbud snekkerarbeid tilbygg")' },
        beskrivelse: { type: 'string', description: 'Beskrivelse av leveransen og forbehold' },
        belopEksMva: { type: 'number', description: 'Totalbeløp eks mva i NOK' }
      },
      required: ['tittel', 'belopEksMva']
    }
  },
  {
    name: 'hent_leads',
    description: 'Henter listen over nye ubehandlede kundehenvendelser og leads.',
    inputSchema: {
      type: 'object',
      properties: {
        antall: { type: 'number', description: 'Maks antall henvendelser som skal returneres (standard 10)' }
      }
    }
  },
  {
    name: 'hent_okonomi_status',
    description: 'Gir en komplett finansiell oversikt over et prosjekt: godkjente endringsordrer, førte timer, og fakturerbart beløp.',
    inputSchema: {
      type: 'object',
      properties: {
        prosjektId: { type: 'string', description: 'ID eller navn på prosjektet' }
      },
      required: ['prosjektId']
    }
  },
  {
    name: 'hent_byggedagbok',
    description: 'Henter historikk og notater fra elektronisk byggedagbok for et prosjekt.',
    inputSchema: {
      type: 'object',
      properties: {
        prosjektId: { type: 'string', description: 'ID eller navn på prosjektet' },
        antall: { type: 'number', description: 'Maks antall dager som skal returneres (standard 7)' }
      },
      required: ['prosjektId']
    }
  },
  {
    name: 'hent_avvik',
    description: 'Henter registrerte avvik og RUH for et prosjekt, med filter på åpne eller lukkede.',
    inputSchema: {
      type: 'object',
      properties: {
        prosjektId: { type: 'string', description: 'Valgfritt prosjekt-ID eller navn' },
        status: { type: 'string', enum: ['open', 'closed', 'all'], description: 'Statusfilter (standard open)' }
      }
    }
  },
  {
    name: 'hent_sja_analyser',
    description: 'Henter liste over gjennomførte Sikker Jobb Analyser (SJA) på et prosjekt.',
    inputSchema: {
      type: 'object',
      properties: {
        prosjektId: { type: 'string', description: 'Valgfritt prosjekt-ID eller navn' },
        antall: { type: 'number', description: 'Maks antall SJA-er som skal returneres (standard 5)' }
      }
    }
  },
  {
    name: 'hent_endringsordrer',
    description: 'Henter alle endringsordrer og tilleggskrav (NS 8406) for et prosjekt med beløp og godkjenningsstatus.',
    inputSchema: {
      type: 'object',
      properties: {
        prosjektId: { type: 'string', description: 'ID eller navn på prosjektet' }
      },
      required: ['prosjektId']
    }
  },
  {
    name: 'oppdater_oppgave',
    description: 'Oppdaterer status på en oppgave (f.eks. fullført, pågår) eller endrer tildeling og frist.',
    inputSchema: {
      type: 'object',
      properties: {
        oppgaveId: { type: 'string', description: 'ID på oppgaven' },
        status: { type: 'string', enum: ['pending', 'in_progress', 'completed'], description: 'Ny status' },
        tildeltTil: { type: 'string', description: 'Ny håndverker oppgaven skal tildeles til' },
        frist: { type: 'string', description: 'Ny frist (YYYY-MM-DD)' }
      },
      required: ['oppgaveId']
    }
  },
  {
    name: 'godkjenn_endringsordre',
    description: 'Godkjenner eller avviser en endringsordre / tilleggsarbeid i systemet.',
    inputSchema: {
      type: 'object',
      properties: {
        endringsordreId: { type: 'string', description: 'ID på endringsordren' },
        handling: { type: 'string', enum: ['godkjenn', 'avvis'], description: 'Om endringsordren godkjennes eller avvises' },
        kommentar: { type: 'string', description: 'Begrunnelse eller kommentar til beslutningen' }
      },
      required: ['endringsordreId', 'handling']
    }
  },
  {
    name: 'lukk_avvik',
    description: 'Lukker og kvitterer ut et registrert avvik/RUH når tiltaket er gjennomført.',
    inputSchema: {
      type: 'object',
      properties: {
        avvikId: { type: 'string', description: 'ID på avviket som skal lukkes' },
        tiltakUtfort: { type: 'string', description: 'Beskrivelse av hva som ble gjort for å rette avviket' }
      },
      required: ['avvikId', 'tiltakUtfort']
    }
  },
  {
    name: 'slett_oppforing',
    description: 'Sletter en feilregistrert oppføring fra systemets database (f.eks. timeføring, oppgave, notat).',
    inputSchema: {
      type: 'object',
      properties: {
        samling: { 
          type: 'string', 
          enum: ['tasks', 'time_entries', 'deviations', 'change_orders', 'sja_reports', 'daily_logs'], 
          description: 'Hvilken modul/samling oppføringen tilhører' 
        },
        id: { type: 'string', description: 'ID på oppføringen som skal slettes' }
      },
      required: ['samling', 'id']
    }
  }
];

// ⚙️ Hjelpefunksjon for å finne prosjekt basert på ID, navn, aliaser eller lokasjon
async function resolveProject(projectIdOrName?: string) {
  const projects = await getCollectionItems('projects');
  if (!projectIdOrName || !projectIdOrName.trim()) {
    return projects[0] || { id: 'p-default', name: 'Hovedprosjekt' };
  }
  const cleanQuery = projectIdOrName.toLowerCase().trim();
  const match = projects.find((p: any) => 
    p.id === projectIdOrName || 
    (p.name && p.name.toLowerCase().includes(cleanQuery)) ||
    (p.name && cleanQuery.includes(p.name.toLowerCase())) ||
    (p.projectCode && p.projectCode.toLowerCase() === cleanQuery) ||
    (Array.isArray(p.aliases) && p.aliases.some((a: string) => a.toLowerCase().includes(cleanQuery) || cleanQuery.includes(a.toLowerCase()))) ||
    (cleanQuery.includes('vidjeveien') && (p.name?.toLowerCase().includes('vidjeveien') || p.location?.toLowerCase().includes('vidjeveien') || p.address?.toLowerCase().includes('vidjeveien'))) ||
    (cleanQuery.includes('sjusjøen') && (p.name?.toLowerCase().includes('sjusjøen') || p.location?.toLowerCase().includes('sjusjøen')))
  );
  return match || projects[0] || { id: projectIdOrName, name: projectIdOrName };
}

// 🚀 Utførelse av individuelle verktøykall
async function executeToolCall(toolName: string, args: any) {
  switch (toolName) {
    case 'registrer_timeforing': {
      const proj = await resolveProject(args.prosjektId);
      const dateStr = args.dato || new Date().toISOString().split('T')[0];
      const hoursNum = Number(args.timer) || 0;

      const timeEntry = {
        projectId: proj.id,
        projectName: proj.name,
        userId: 'mcp-agent-user',
        userName: args.handverkerNavn,
        date: dateStr,
        hours: hoursNum,
        description: args.beskrivelse,
        category: args.kategori || 'arbeid',
        createdAt: new Date().toISOString()
      };

      const savedTime = await saveCollectionItem('time_entries', timeEntry);

      // Oppdater også elektronisk byggedagbok for dagen
      try {
        const allLogs = await getCollectionItems('daily_logs');
        const existingToday = allLogs.find((l: any) => l.projectId === proj.id && l.date === dateStr);
        const crew = existingToday?.crewMembers 
          ? Array.from(new Set([...existingToday.crewMembers, args.handverkerNavn]))
          : [args.handverkerNavn];
        const updatedHours = (Number(existingToday?.totalHoursWorked) || 0) + hoursNum;
        const noteLine = `• ${args.handverkerNavn}: ${hoursNum}t – ${args.beskrivelse}`;
        const notes = existingToday?.generalNotes 
          ? `${existingToday.generalNotes}\n${noteLine}`
          : noteLine;

        await saveCollectionItem('daily_logs', {
          id: existingToday?.id || `log_${proj.id}_${dateStr}`,
          projectId: proj.id,
          projectName: proj.name,
          date: dateStr,
          crewCount: crew.length,
          crewMembers: crew,
          totalHoursWorked: updatedHours,
          generalNotes: notes,
          weatherCondition: existingToday?.weatherCondition || 'Opphold',
          inspectedBy: 'MesterAI Autonom Agent',
          autoGenerated: true,
          updatedAt: new Date().toISOString(),
          createdAt: existingToday?.createdAt || new Date().toISOString()
        });
      } catch (e) {
        console.warn('MCP daily log sync warning:', e);
      }

      return `⏱️ ${hoursNum} timer registrert for ${args.handverkerNavn} på «${proj.name}». Timene er bokført i prosjektregnskapet og synkronisert med byggedagboken iht. Byggherreforskriften § 15. (ID: ${savedTime.id})`;
    }

    case 'oppdater_byggedagbok': {
      const proj = await resolveProject(args.prosjektId);
      const dateStr = new Date().toISOString().split('T')[0];
      const allLogs = await getCollectionItems('daily_logs');
      const existing = allLogs.find((l: any) => l.projectId === proj.id && l.date === dateStr);

      const noteText = `• ${args.notat}`;
      const notes = existing?.generalNotes ? `${existing.generalNotes}\n${noteText}` : noteText;

      await saveCollectionItem('daily_logs', {
        id: existing?.id || `log_${proj.id}_${dateStr}`,
        projectId: proj.id,
        projectName: proj.name,
        date: dateStr,
        generalNotes: notes,
        weatherCondition: args.vaerforhold || existing?.weatherCondition || 'Opphold',
        inspectedBy: 'MesterAI Agent',
        autoGenerated: true,
        updatedAt: new Date().toISOString(),
        createdAt: existing?.createdAt || new Date().toISOString()
      });

      return `📋 Byggedagbok for «${proj.name}» er oppdatert for ${dateStr}. Notatet er arkivert iht. Byggherreforskriften § 15 & NS 8406.`;
    }

    case 'opprett_sja': {
      const proj = await resolveProject(args.prosjektId);
      const sjaDoc = {
        projectId: proj.id,
        projectName: proj.name,
        title: args.tittel,
        task: args.arbeidsoppgave,
        description: args.arbeidsoppgave,
        tek17Reference: args.hjemmel || 'Byggherreforskriften § 18 & Forskrift om utførelse av arbeid',
        weatherImpact: 'Vurdert og klarert',
        risikoer: (args.risikoer || []).map((r: string, idx: number) => ({
          aktivitet: args.tittel,
          risiko: r,
          tiltak: (args.tiltak || [])[idx] || (args.tiltak || [])[0] || 'Bruk påbudt verneutstyr'
        })),
        utstyr: ['Hjelm med hakestropp', 'Vernetøy', 'Vernesko S3', 'Fallsikringsutstyr'],
        status: 'approved',
        authorName: 'MesterAI Sikkerhetsagent',
        createdAt: new Date().toISOString()
      };

      const saved = await saveCollectionItem('sja_reports', sjaDoc);
      return `🛡️ Sikker Jobb Analyse (SJA) opprettet og arkivert for «${proj.name}»: «${args.tittel}». ${args.risikoer.length} farer identifisert med tilhørende tiltak. Oppfyller Byggherreforskriften § 18. (SJA-ID: ${saved.id})`;
    }

    case 'registrer_avvik': {
      const proj = await resolveProject(args.prosjektId);
      const devDoc = {
        projectId: proj.id,
        projectName: proj.name,
        title: args.tittel,
        description: args.beskrivelse,
        severity: args.alvorlighetsgrad || 'medium',
        trade: args.fag || 'Byggmester',
        correctiveAction: args.korrigerendeTiltak || 'Utbedres iht. TEK17 og produsentanvisning',
        status: 'open',
        createdAt: new Date().toISOString()
      };

      const saved = await saveCollectionItem('deviations', devDoc);
      return `⚠️ Avvik loggført på «${proj.name}»: «${args.tittel}» (${args.alvorlighetsgrad || 'medium'}). Varsel er lagret i avviksregisteret og knyttet til prosjektet. (Avviks-ID: ${saved.id})`;
    }

    case 'opprett_endringsordre': {
      const proj = await resolveProject(args.prosjektId);
      const changeOrder = {
        projectId: proj.id,
        projectName: proj.name,
        title: args.tittel,
        description: args.beskrivelse,
        amountExVat: Number(args.belopEksMva) || 0,
        totalAmount: Math.round((Number(args.belopEksMva) || 0) * 1.25),
        extensionDays: Number(args.dagerFristforlengelse) || 0,
        status: 'pending_client_approval',
        legalStandard: 'NS 8406',
        createdAt: new Date().toISOString()
      };

      const saved = await saveCollectionItem('change_orders', changeOrder);
      return `📝 Endringsordre utarbeidet iht. NS 8406 for «${proj.name}»: «${args.tittel}» på ${args.belopEksMva.toLocaleString('no-NO')} kr eks mva (${changeOrder.totalAmount.toLocaleString('no-NO')} kr inkl. mva). Status: Venter på kundens godkjenning. (Ordrenr: ${saved.id})`;
    }

    case 'hent_prosjekter': {
      const projects = await getCollectionItems('projects');
      const search = (args.sokeord || '').toLowerCase().trim();
      const filtered = search 
        ? projects.filter((p: any) => 
            (p.name && p.name.toLowerCase().includes(search)) ||
            (p.location && p.location.toLowerCase().includes(search)) ||
            (p.projectCode && p.projectCode.toLowerCase() === cleanQuery(search))
          )
        : projects;

      function cleanQuery(str: string) {
        return str.toLowerCase().trim();
      }

      // 🛡️ GDPR-sikret: Returnerer kun anonymiserte prosjekter uten private kontaktpunkter
      const summary = filtered.slice(0, 10).map((p: any) => sanitizeProjectForAgent(p));

      return JSON.stringify(summary, null, 2);
    }

    case 'hent_prosjektdetaljer': {
      const proj = await resolveProject(args.prosjektId);
      const [allTimes, allDevs, allLogs] = await Promise.all([
        getCollectionItems('time_entries'),
        getCollectionItems('deviations'),
        getCollectionItems('daily_logs')
      ]);

      const projectTimes = allTimes.filter((t: any) => t.projectId === proj.id);
      const projectDevs = allDevs.filter((d: any) => d.projectId === proj.id);
      const projectLogs = allLogs.filter((l: any) => l.projectId === proj.id);

      const totalHours = projectTimes.reduce((sum: number, t: any) => sum + (Number(t.hours) || 0), 0);
      const isCorp = isCorporateEntity(proj.clientName);

      // 🛡️ GDPR-sikret: Private adresser, e-post og telefon holdes tilbake fra ekstern AI
      return JSON.stringify({
        prosjektId: proj.id,
        prosjektKode: proj.projectCode || '-',
        prosjektNavn: maskPII(proj.name || 'Byggeprosjekt'),
        adresse: anonymizeAddress(proj.location || proj.address),
        leder: proj.projectManager ? `${proj.projectManager.split(' ')[0]} (Byggeleder)` : 'Byggeleder',
        kundetype: isCorp ? 'Bedrift / Offentlig' : 'Privatkunde',
        kunde: isCorp ? proj.clientName : anonymizePersonName(proj.clientName, 'Privat oppdragsgiver'),
        status: proj.stage || proj.status || 'Aktiv',
        totaleTimer: totalHours,
        antallTimeforinger: projectTimes.length,
        aktiveAvvik: projectDevs.filter((d: any) => d.status !== 'closed').length,
        antallDagsrapporter: projectLogs.length,
        sisteDagsrapport: projectLogs[0] ? projectLogs[0].date : 'Ingen'
      }, null, 2);
    }

    case 'sjekk_tek17_krav': {
      const q = (args.emne || '').toLowerCase();
      if (q.includes('fall') || q.includes('sluk') || q.includes('våtrom') || q.includes('vatrom')) {
        return `🚿 TEK17 § 13-15 Våtrom & Fall mot sluk:\n` +
          `• Gulv må ha tilstrekkelig fall mot sluk slik at bruksvann ledes bort.\n` +
          `• Preakseptert ytelse (Byggforsk 541.805): Fall 1:50 i dusjsonen (min. 0,8 m ut fra sluket) eller 1:100 på hele gulvet.\n` +
          `• Membranen må gå minimum 25 mm over topp slukrist ved terskel/dør og klemring må være forskriftsmessig montert.`;
      }
      if (q.includes('radon')) {
        return `☢️ TEK17 § 13-5 Radon:\n` +
          `• Årsmiddelverdi skal ikke overstige 200 Bq/m³.\n` +
          `• Bygning med rom for varig opphold skal ha radonsperre mot grunnen og tilrettelegges for trykkreduserende tiltak i byggegrunn (radonbrønn).`;
      }
      if (q.includes('lyd')) {
        return `🔊 TEK17 § 13-6 Lydforhold:\n` +
          `• Skillevegg mellom boenheter skal tilfredsstille Lydklasse C iht. NS 8175 (R'w + C50-5000 min. 55 dB).\n` +
          `• Trinnlydnivå L'n,w maksimalt 53 dB.`;
      }
      return `📐 Byggteknisk forskrift (TEK17):\n` +
        `Krav for ${args.emne}: Arbeidet må utføres i henhold til Byggforskserien og preaksepterte ytelser for å dokumentere oppfyllelse av TEK17 funksjonskrav.`;
    }

    case 'opprett_oppgave': {
      const proj = await resolveProject(args.prosjektId);
      const newTask = {
        title: args.tittel,
        description: args.beskrivelse || '',
        projectId: proj.id,
        projectName: proj.name,
        assignedTo: args.tildeltTil || 'Ikke tildelt',
        dueDate: args.frist || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        priority: args.prioritet || 'medium',
        status: 'pending',
        createdAt: new Date().toISOString()
      };
      await saveCollectionItem('tasks', newTask);
      return `✅ Ny oppgave opprettet og tildelt!\n` +
        `• Tittel: ${newTask.title}\n` +
        `• Prosjekt: ${proj.name}\n` +
        `• Tildelt: ${newTask.assignedTo}\n` +
        `• Frist: ${newTask.dueDate}\n` +
        `• Prioritet: ${newTask.priority}`;
    }

    case 'hent_oppgaver': {
      let tasks = await getCollectionItems('tasks');
      if (args.prosjektId) {
        const proj = await resolveProject(args.prosjektId);
        tasks = tasks.filter((t: any) => t.projectId === proj.id || t.projectName === proj.name);
      }
      if (args.tildeltTil) {
        const query = args.tildeltTil.toLowerCase();
        tasks = tasks.filter((t: any) => t.assignedTo && t.assignedTo.toLowerCase().includes(query));
      }
      if (args.status && args.status !== 'all') {
        tasks = tasks.filter((t: any) => t.status === args.status);
      }

      if (tasks.length === 0) {
        return 'Ingen oppgaver funnet med de angitte kriteriene.';
      }

      return JSON.stringify(tasks.slice(0, 15).map((t: any) => ({
        id: t.id,
        tittel: maskPII(t.title),
        prosjekt: maskPII(t.projectName),
        tildelt: t.assignedTo ? `${t.assignedTo.split(' ')[0]} (Medarbeider)` : 'Ikke tildelt',
        frist: t.dueDate,
        status: t.status,
        prioritet: t.priority
      })), null, 2);
    }

    case 'hent_timer': {
      const proj = await resolveProject(args.prosjektId);
      const allTimes = await getCollectionItems('time_entries');
      let projectTimes = allTimes.filter((t: any) => 
        t.projectId === proj.id || 
        t.projectName === proj.name ||
        (proj.aliases && proj.aliases.some((a: string) => t.projectName === a || t.projectId === a)) ||
        (proj.name && t.projectName && t.projectName.toLowerCase().includes(proj.name.toLowerCase()))
      );
      if (args.handverkerNavn) {
        const hName = args.handverkerNavn.toLowerCase();
        projectTimes = projectTimes.filter((t: any) => 
          (t.workerName && t.workerName.toLowerCase().includes(hName)) ||
          (t.userName && t.userName.toLowerCase().includes(hName))
        );
      }
      if (args.fraDato) {
        projectTimes = projectTimes.filter((t: any) => t.date >= args.fraDato);
      }

      if (projectTimes.length === 0) {
        return `Ingen førte timer registrert på «${proj.name}» ennå.`;
      }

      const totalHours = projectTimes.reduce((sum: number, t: any) => sum + (Number(t.hours) || 0), 0);
      return JSON.stringify({
        prosjekt: proj.name,
        totaleTimer: totalHours,
        antallOppforinger: projectTimes.length,
        timeforinger: projectTimes.slice(0, 15).map((t: any) => sanitizeTimeEntryForAgent(t))
      }, null, 2);
    }

    case 'opprett_prosjekt': {
      const newProj = {
        name: args.navn,
        location: args.adresse,
        projectManager: args.byggeleder || 'Byggeleder',
        clientName: args.kundeNavn || 'Privat / Bedrift',
        clientEmail: args.kundeEpost || '',
        clientPhone: args.kundeTelefon || '',
        status: 'active',
        stage: 'Aktiv',
        projectCode: `P-${Date.now().toString().slice(-4)}`,
        createdAt: new Date().toISOString()
      };
      await saveCollectionItem('projects', newProj);
      return `🏗️ Nytt prosjekt registrert i VikingMester!\n` +
        `• Prosjektnavn: ${newProj.name}\n` +
        `• Prosjektkode: ${newProj.projectCode}\n` +
        `• Byggeleder: ${newProj.projectManager.split(' ')[0]}\n` +
        `• Lokasjon: ${anonymizeAddress(newProj.location)}\n` +
        `• Status: Aktiv`;
    }

    case 'opprett_tilbud': {
      const proj = args.prosjektId ? await resolveProject(args.prosjektId) : null;
      const newOffer = {
        title: args.tittel,
        description: args.beskrivelse || '',
        projectId: proj ? proj.id : null,
        projectName: proj ? proj.name : (args.kundeNavn || 'Forespørsel'),
        clientName: args.kundeNavn || (proj ? proj.clientName : 'Kunde'),
        totalAmount: Number(args.belopEksMva) || 0,
        amount: Number(args.belopEksMva) || 0,
        status: 'draft',
        createdAt: new Date().toISOString()
      };
      await saveCollectionItem('offers', newOffer);
      return `📄 Tilbudsutkast opprettet!\n` +
        `• Tittel: ${newOffer.title}\n` +
        `• Kunde/Prosjekt: ${newOffer.projectName}\n` +
        `• Sum eks mva: kr ${newOffer.totalAmount.toLocaleString('no-NO')},-\n` +
        `• Status: Utkast (Klar til gjennomgang og utsendelse)`;
    }

    case 'hent_leads': {
      const allLeads = await getCollectionItems('leads');
      const limit = Number(args.antall) || 10;
      const recent = allLeads.slice(0, limit);
      if (recent.length === 0) {
        return 'Ingen henvendelser funnet i databasen.';
      }
      // 🛡️ GDPR-sikret: Private e-poster og telefonnumre maskeres før ekstern agent mottar data
      return JSON.stringify(recent.map((l: any) => sanitizeLeadForAgent(l)), null, 2);
    }

    case 'hent_okonomi_status': {
      const proj = await resolveProject(args.prosjektId);
      const allTimes = await getCollectionItems('time_entries');
      const allChanges = await getCollectionItems('change_orders');
      const allOffers = await getCollectionItems('offers');

      const projectTimes = allTimes.filter((t: any) => t.projectId === proj.id || t.projectName === proj.name);
      const projectChanges = allChanges.filter((c: any) => c.projectId === proj.id || c.projectName === proj.name);
      const projectOffers = allOffers.filter((o: any) => o.projectId === proj.id || o.projectName === proj.name);

      const totalHours = projectTimes.reduce((sum: number, t: any) => sum + (Number(t.hours) || 0), 0);
      const standardHourlyRate = 980;
      const loggedLaborValue = totalHours * standardHourlyRate;

      const approvedChanges = projectChanges.filter((c: any) => c.status === 'approved');
      const approvedChangesSum = approvedChanges.reduce((sum: number, c: any) => sum + (Number(c.amount) || Number(c.belopEksMva) || 0), 0);

      const pendingChanges = projectChanges.filter((c: any) => c.status === 'pending');
      const pendingChangesSum = pendingChanges.reduce((sum: number, c: any) => sum + (Number(c.amount) || Number(c.belopEksMva) || 0), 0);

      const baseContract = projectOffers[0] ? (Number(projectOffers[0].totalAmount) || Number(projectOffers[0].amount) || 0) : 0;

      return JSON.stringify({
        prosjektNavn: maskPII(proj.name || 'Byggeplass'),
        prosjektLeder: proj.projectManager ? `${proj.projectManager.split(' ')[0]} (Byggeleder)` : 'Byggeleder',
        status: proj.stage || 'Aktiv',
        grunnkontraktEksMva: baseContract,
        godkjenteEndringsordrerSum: approvedChangesSum,
        antallGodkjenteEndringsordrer: approvedChanges.length,
        ventendeEndringsordrerSum: pendingChangesSum,
        antallVentendeEndringsordrer: pendingChanges.length,
        totaleTimerArbeidet: totalHours,
        estimertTimeverdi: loggedLaborValue,
        fakturerbartTilNaa: baseContract + approvedChangesSum
      }, null, 2);
    }

    case 'hent_byggedagbok': {
      const proj = await resolveProject(args.prosjektId);
      const allLogs = await getCollectionItems('daily_logs');
      const limit = Number(args.antall) || 7;
      const logs = allLogs
        .filter((l: any) => l.projectId === proj.id || l.projectName === proj.name)
        .slice(0, limit);

      if (logs.length === 0) return `Ingen byggedagboknotater funnet for «${proj.name}».`;
      // 🛡️ GDPR-sikret: Håndverkere anonymiseres til roller/antall og notater vaskes for PII
      return JSON.stringify(logs.map((l: any) => sanitizeDailyLogForAgent(l)), null, 2);
    }

    case 'hent_avvik': {
      let deviations = await getCollectionItems('deviations');
      if (args.prosjektId) {
        const proj = await resolveProject(args.prosjektId);
        deviations = deviations.filter((d: any) => d.projectId === proj.id || d.projectName === proj.name);
      }
      const statusFilter = args.status || 'open';
      if (statusFilter !== 'all') {
        deviations = deviations.filter((d: any) => (statusFilter === 'closed' ? d.status === 'closed' : d.status !== 'closed'));
      }
      if (deviations.length === 0) return 'Ingen avvik funnet som matcher kriteriene.';
      // 🛡️ GDPR-sikret: Helseopplysninger og personkonflikter vaskes bort
      return JSON.stringify(deviations.slice(0, 15).map((d: any) => sanitizeDeviationForAgent(d)), null, 2);
    }

    case 'hent_sja_analyser': {
      let sjas = await getCollectionItems('sja_reports');
      if (args.prosjektId) {
        const proj = await resolveProject(args.prosjektId);
        sjas = sjas.filter((s: any) => s.projectId === proj.id || s.projectName === proj.name);
      }
      const limit = Number(args.antall) || 5;
      if (sjas.length === 0) return 'Ingen SJA-analyser funnet.';
      // 🛡️ GDPR-sikret: SJA-data vaskes for personnavn
      return JSON.stringify(sjas.slice(0, limit).map((s: any) => sanitizeSjaForAgent(s)), null, 2);
    }

    case 'hent_endringsordrer': {
      const proj = await resolveProject(args.prosjektId);
      const allOrders = await getCollectionItems('change_orders');
      const orders = allOrders.filter((c: any) => c.projectId === proj.id || c.projectName === proj.name);
      if (orders.length === 0) return `Ingen endringsordrer registrert for «${proj.name}».`;
      return JSON.stringify(orders.map((c: any) => ({
        id: c.id,
        nummer: c.orderNumber || c.id,
        tittel: c.title,
        belopEksMva: Number(c.amount) || Number(c.belopEksMva) || 0,
        status: c.status || 'pending',
        fristforlengelseDager: c.delayDays || c.fristforlengelseDager || 0,
        dato: c.createdAt
      })), null, 2);
    }

    case 'oppdater_oppgave': {
      const updates: any = {};
      if (args.status) updates.status = args.status;
      if (args.tildeltTil) updates.assignedTo = args.tildeltTil;
      if (args.frist) updates.dueDate = args.frist;
      if (args.prioritet) updates.priority = args.prioritet;
      const updated = await updateCollectionItem('tasks', args.oppgaveId, updates);
      return `✅ Oppgave «${updated.title || args.oppgaveId}» er oppdatert! Status: ${updated.status || 'oppdatert'}.`;
    }

    case 'godkjenn_endringsordre': {
      const status = args.handling === 'avvis' ? 'rejected' : 'approved';
      const updated = await updateCollectionItem('change_orders', args.endringsordreId, {
        status,
        decisionNote: args.kommentar || '',
        decidedAt: new Date().toISOString()
      });
      return `📋 Endringsordre «${updated.title || args.endringsordreId}» er ${status === 'approved' ? 'godkjent ✅' : 'avvist ❌'}.`;
    }

    case 'lukk_avvik': {
      const updated = await updateCollectionItem('deviations', args.avvikId, {
        status: 'closed',
        closedAt: new Date().toISOString(),
        resolutionNote: args.tiltakUtfort
      });
      return `✅ Avvik «${updated.title || args.avvikId}» er nå kvittert ut og lukket! Utført tiltak: ${args.tiltakUtfort}.`;
    }

    case 'slett_oppforing': {
      const allowed = ['tasks', 'time_entries', 'deviations', 'change_orders', 'sja_reports', 'daily_logs', 'offers'];
      if (!allowed.includes(args.samling)) {
        throw new Error(`Ugyldig samling for sletting. Tillatte moduler: ${allowed.join(', ')}`);
      }
      await deleteCollectionItem(args.samling, args.id);
      return `🗑️ Oppføring med ID ${args.id} er permanent slettet fra ${args.samling}.`;
    }

    default:
      throw new Error(`Ukjent verktøy: ${toolName}`);
  }
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept, X-Requested-With',
};

// 🌐 OPTIONS-håndterer for CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: CORS_HEADERS
  });
}

// ⚙️ Behandler en enkelt JSON-RPC melding iht. MCP-spesifikasjonen
async function processRpcMessage(body: any): Promise<any> {
  const reqId = body.id !== undefined ? body.id : 1;
  const method = body.method;

  // 1. Initialize
  if (method === 'initialize') {
    return {
      jsonrpc: '2.0',
      id: reqId,
      result: {
        protocolVersion: '2024-11-05',
        capabilities: {
          tools: {
            listChanged: false
          },
          resources: {
            subscribe: false,
            listChanged: false
          },
          prompts: {
            listChanged: false
          },
          logging: {}
        },
        serverInfo: {
          name: 'VikingMester_MCP_Bridge',
          version: '1.0.0'
        }
      }
    };
  }

  // 2. Notifikasjoner (notifications/initialized, initialized, cancelled, progress etc.)
  // I henhold til MCP-spesifikasjonen skal disse alltid kvitteres ut som suksess
  if (
    method === 'notifications/initialized' ||
    method === 'initialized' ||
    method === 'notifications/cancelled' ||
    method === 'notifications/progress' ||
    method === 'notifications/message' ||
    (typeof method === 'string' && method.startsWith('notifications/'))
  ) {
    return {
      jsonrpc: '2.0',
      id: reqId,
      result: {}
    };
  }

  // 3. Tools List
  if (method === 'tools/list') {
    return {
      jsonrpc: '2.0',
      id: reqId,
      result: {
        tools: MCP_TOOLS
      }
    };
  }

  // 4. Tools Call
  if (method === 'tools/call') {
    const toolName = body.params?.name;
    const toolArgs = body.params?.arguments || {};

    try {
      const rawResult = await executeToolCall(toolName, toolArgs);
      // 🛡️ GDPR Privacy Shield: Totalfiltrering av PII før data forlater systemet
      const shieldedResult = applyPrivacyShield(rawResult);
      const safeText = typeof shieldedResult === 'string' ? shieldedResult : JSON.stringify(shieldedResult, null, 2);

      return {
        jsonrpc: '2.0',
        id: reqId,
        result: {
          content: [
            {
              type: 'text',
              text: safeText
            }
          ],
          isError: false
        }
      };
    } catch (err: any) {
      return {
        jsonrpc: '2.0',
        id: reqId,
        result: {
          content: [
            {
              type: 'text',
              text: maskPII(`Feil ved utførelse av ${toolName}: ${err.message}`)
            }
          ],
          isError: true
        }
      };
    }
  }

  // 5. Ping
  if (method === 'ping') {
    return {
      jsonrpc: '2.0',
      id: reqId,
      result: {}
    };
  }

  // 6. Resources discovery
  if (method === 'resources/list') {
    return {
      jsonrpc: '2.0',
      id: reqId,
      result: {
        resources: []
      }
    };
  }

  if (method === 'resources/templates/list') {
    return {
      jsonrpc: '2.0',
      id: reqId,
      result: {
        resourceTemplates: []
      }
    };
  }

  // 7. Prompts discovery
  if (method === 'prompts/list') {
    return {
      jsonrpc: '2.0',
      id: reqId,
      result: {
        prompts: []
      }
    };
  }

  // 8. Logging
  if (method === 'logging/setLevel') {
    return {
      jsonrpc: '2.0',
      id: reqId,
      result: {}
    };
  }

  // 9. Roots
  if (method === 'roots/list') {
    return {
      jsonrpc: '2.0',
      id: reqId,
      result: {
        roots: []
      }
    };
  }

  // Dersom det er en notifikasjon uten ID, skal det aldri kastes feil iht. JSON-RPC 2.0
  if (body.id === undefined) {
    return null;
  }

  return {
    jsonrpc: '2.0',
    id: reqId,
    error: {
      code: -32601,
      message: `Metode '${method}' støttes ikke av MCP-serveren.`
    }
  };
}

// 🌐 POST-håndterer for standard JSON-RPC 2.0 (MCP Protocol)
export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json(
      { error: 'Uautorisert tilgang til MCP-serveren. Kontroller Bearer Token.' }, 
      { status: 401, headers: CORS_HEADERS }
    );
  }

  try {
    const body = await req.json();

    // Håndter batch-forespørsler (array)
    if (Array.isArray(body)) {
      const responses = [];
      for (const item of body) {
        const res = await processRpcMessage(item);
        if (res !== null) {
          responses.push(res);
        }
      }
      return NextResponse.json(responses, { headers: CORS_HEADERS });
    }

    const response = await processRpcMessage(body);

    if (response === null) {
      // JSON-RPC notifikasjon uten ID
      return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
    }

    const status = response.error ? 400 : 200;
    return NextResponse.json(response, { status, headers: CORS_HEADERS });

  } catch (error: any) {
    console.error('MCP Server POST error:', error);
    return NextResponse.json({
      jsonrpc: '2.0',
      id: null,
      error: {
        code: -32700,
        message: 'Ugyldig JSON-forespørsel: ' + error.message
      }
    }, { status: 400, headers: CORS_HEADERS });
  }
}

// 🌐 GET-håndterer for Discovery og SSE (Server-Sent Events)
export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json(
      { error: 'Uautorisert tilgang. Vennligst oppgi Bearer Token.' }, 
      { status: 401, headers: CORS_HEADERS }
    );
  }

  const acceptHeader = req.headers.get('accept') || '';
  const isSSE = acceptHeader.includes('text/event-stream') || req.nextUrl.searchParams.get('transport') === 'sse';

  if (isSSE) {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        // Send initial endpoint announcement
        const endpointData = JSON.stringify({
          endpoint: '/api/mcp'
        });
        controller.enqueue(encoder.encode(`event: endpoint\ndata: ${endpointData}\n\n`));

        // Send tools list event
        const toolsData = JSON.stringify({
          tools: MCP_TOOLS
        });
        controller.enqueue(encoder.encode(`event: tools\ndata: ${toolsData}\n\n`));
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        ...CORS_HEADERS
      }
    });
  }

  // Standard JSON discovery response
  return NextResponse.json({
    status: 'active',
    server: 'VikingMester_MCP_Bridge',
    version: '1.0.0',
    protocolVersion: '2024-11-05',
    availableToolsCount: MCP_TOOLS.length,
    tools: MCP_TOOLS
  }, { headers: CORS_HEADERS });
}
