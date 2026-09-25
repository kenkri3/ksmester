import React, { useState } from 'react';
import { 
  HelpCircle, 
  ExternalLink, 
  ChevronDown, 
  ChevronUp, 
  CheckCircle2, 
  Info, 
  Lightbulb, 
  AlertCircle,
  Copy,
  Check
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { toast } from 'sonner';

export type IntegrationServiceType = 'nobb' | 'discord' | 'slack' | 'teams' | 'boligmappa' | 'tripletex' | 'poweroffice' | 'fiken';

interface IntegrationGuideCardProps {
  service: IntegrationServiceType;
  variant?: 'light' | 'dark';
  defaultExpanded?: boolean;
}

interface GuideContent {
  title: string;
  subtitle: string;
  portalName: string;
  portalUrl: string;
  benefits: string[];
  steps: {
    number: number;
    title: string;
    description: string;
    codeExample?: string;
  }[];
  tip: string;
  troubleshooting?: string;
}

const GUIDES: Record<IntegrationServiceType, GuideContent> = {
  nobb: {
    title: 'Slik kobler du til NOBB Byggevarebase',
    subtitle: 'Norsk Byggtjeneste AS leverer Norges ledende database for byggevarer og FDV.',
    portalName: 'Åpne Byggtjeneste Kundeportal',
    portalUrl: 'https://byggtjeneste.no',
    benefits: [
      'Direkte oppslag på over 1 million byggevarer via NOBB- eller EAN-nummer',
      'Offisielle FDV-datablad, HMS-sikkerhetsblader og monteringsanvisninger',
      'Sintef Teknisk Godkjenning og EPD miljødeklarasjoner rett i prosjektarkivet',
      'Oppdaterte grossistpriser og tekniske spesifikasjoner'
    ],
    steps: [
      {
        number: 1,
        title: 'Sjekk bedriftens API-avtale',
        description: 'Norsk Byggtjeneste krever at din bedrift har en lisensavtale for API-tilgang til NOBB. Hvis dere ikke har dette, kontakt Byggtjeneste på support@byggtjeneste.no eller tlf 23 11 44 00.'
      },
      {
        number: 2,
        title: 'Finn din Ocp-Apim-Subscription-Key',
        description: 'Logg inn på Byggtjeneste Developer Portal / Min Side. Under «API-abonnement» eller «Mine nøkler» finner du en 32-tegners nøkkel (Subscription Key).',
        codeExample: 'f.eks. d3b07384d113edec49eaa6238ad5ff00'
      },
      {
        number: 3,
        title: 'Lim inn og verifiser',
        description: 'Lim inn nøkkelen i feltet nedenfor og klikk «Verifiser & Koble til». Systemet kontakter Byggtjeneste i sanntid og sjekker gyldigheten.'
      }
    ],
    tip: 'Nøkkelen lagres kryptert for bedriften. Alle håndverkere i firmaet får automatisk glede av raske FDV-oppslag.',
    troubleshooting: 'Får du status 401 eller 403? Kontroller at modulen «NOBB Export API» er aktivert på din lisens hos Norsk Byggtjeneste.'
  },
  discord: {
    title: 'Slik oppretter du Discord Webhook for byggeplassen',
    subtitle: 'Motta sanntidsvarsler for timer, byggedagbok og HMS-avvik direkte i Discord-appen.',
    portalName: 'Åpne Discord',
    portalUrl: 'https://discord.com/app',
    benefits: [
      'Varsler levert på sekundet til mobil- og desktop-appen til Discord',
      'Byggeplass-teamet holder seg oppdatert uten å måtte åpne nettleseren',
      'Byggedagbok, SJA og sjekkliste-hendelser logges automatisk',
      '100% gratis og krever ingen ekstra programvarelisenser'
    ],
    steps: [
      {
        number: 1,
        title: 'Åpne din Discord-server',
        description: 'Gå inn på bedriftens Discord-server på PC eller i mobilappen.'
      },
      {
        number: 2,
        title: 'Gå til kanalens innstillinger',
        description: 'Finn kanalen du vil motta varsler i (f.eks. #byggeplass eller #prosjekt-varsler). Høyreklikk eller trykk på tannhjulet (Kanalinnstillinger).'
      },
      {
        number: 3,
        title: 'Opprett Webhook',
        description: 'Gå til «Integrasjoner» ➔ «Webhooks» ➔ klikk «Opprett Webhook» (eller «Ny Webhook»). Gi den gjerne navnet «VikingMester Byggeleder».'
      },
      {
        number: 4,
        title: 'Kopier Webhook-URL og koble til',
        description: 'Klikk «Kopier Webhook-URL». Lim den inn nedenfor og trykk «Verifiser & Koble til».',
        codeExample: 'https://discord.com/api/webhooks/123456789/abcdefgh...'
      }
    ],
    tip: 'Du kan opprette ulike webhooks for ulike prosjekter, eller én felles kanal for hele firmaet.',
    troubleshooting: 'Mottar du ikke melding? Kontroller at boten har rettighet til å sende meldinger i den valgte kanalen.'
  },
  slack: {
    title: 'Slik setter du opp Slack Incoming Webhook',
    subtitle: 'Koble VikingMester til bedriftens Slack Workspace for profesjonell prosjektkommunikasjon.',
    portalName: 'Slack App Directory',
    portalUrl: 'https://slack.com/apps/A0F7XDUAZ-incoming-webhooks',
    benefits: [
      'Strukturerte varsler formatert med Slack Block Kit for enkel lesing',
      'Direktevarsler ved kritiske HMS-hendelser og lukkesperrer',
      'Statusoppdateringer på tilleggskrav (NS 8406) rett til prosjektledelsen'
    ],
    steps: [
      {
        number: 1,
        title: 'Åpne Slack App Directory',
        description: 'Logg inn på bedriftens Slack-arbeidsområde og åpne siden for «Incoming WebHooks».'
      },
      {
        number: 2,
        title: 'Velg kanal og installer',
        description: 'Klikk «Add to Slack», velg kanalen som skal motta varsler (f.eks. #prosjekt eller #byggeledelse), og trykk «Legg til integrasjon».'
      },
      {
        number: 3,
        title: 'Kopier Webhook URL',
        description: 'Kopier den genererte Webhook-URL-en og lim den inn i feltet nedenfor.',
        codeExample: 'https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX'
      }
    ],
    tip: 'Slack er spesielt godt egnet for totalentreprenører som samarbeider med eksterne rådgivere og underentreprenører.',
    troubleshooting: 'Hvis Slack svarer med feil, sjekk at integrasjonen ikke er deaktivert av en Slack-arbeidsområdeadministrator.'
  },
  teams: {
    title: 'Slik kobler du til Microsoft Teams (Workflows / Connectors)',
    subtitle: 'Send rike Adaptive Cards med godkjenningsknapper og varsler direkte i Teams.',
    portalName: 'Microsoft Teams Web',
    portalUrl: 'https://teams.microsoft.com',
    benefits: [
      'Rike Adaptive Cards med fargekoder for HMS, avvik og byggedagbok',
      'Sømløst integrert i bedriftens eksisterende Microsoft 365-miljø',
      'Støtter både Power Automate Workflows og Office 365 Connector webhooks'
    ],
    steps: [
      {
        number: 1,
        title: 'Åpne kanalen i Microsoft Teams',
        description: 'Gå til teamet og kanalen der du ønsker varsler (f.eks. «Byggeledelse» eller «Generelt»).'
      },
      {
        number: 2,
        title: 'Velg Arbeidsflyter (Workflows)',
        description: 'Klikk på ••• (Flere alternativer) ved kanalnavnet og velg «Arbeidsflyter» (Workflows) eller «Koblinger» (Connectors).'
      },
      {
        number: 3,
        title: 'Bruk Webhook-malen',
        description: 'Søk opp og velg malen: «Publiser i en kanal når en webhook-forespørsel mottas» (Post to a channel when a webhook request is received).'
      },
      {
        number: 4,
        title: 'Kopier URL og koble til',
        description: 'Følg veiviseren, bekreft team og kanal, og kopier den genererte Webhook-URL-en.',
        codeExample: 'https://prod-XX.westeurope.logic.azure.com:443/workflows/...'
      }
    ],
    tip: 'Både nyere Power Automate Workflow webhooks og eldre Office 365 Connector URL-er støttes fullt ut.',
    troubleshooting: 'Får du status 400? Kontroller at hele webhook-URL-en ble kopiert, inkludert sikkerhetstokenet på slutten.'
  },
  boligmappa: {
    title: 'Slik kobler du til Boligmappa Bedrift',
    subtitle: 'Norges nasjonale arkiv for eiendomsdokumentasjon og lovpålagt boligdokumentasjon.',
    portalName: 'Boligmappa Bedriftsportal',
    portalUrl: 'https://boligmappa.no/bedrift',
    benefits: [
      'Automatisk overføring av FDV og ferdigattest til eiendommens gnr/bnr',
      'Oppfyller kravene i avhendingsloven og forskrift til avhendingslova',
      'Øker eiendommens verdi og forenkler fremtidig salg for kunden din'
    ],
    steps: [
      {
        number: 1,
        title: 'Logg inn på Boligmappa Bedrift',
        description: 'Gå til boligmappa.no/bedrift med BankID for din bedrift.'
      },
      {
        number: 2,
        title: 'Hent API-nøkkel',
        description: 'Gå til «Innstillinger» ➔ «API & Integrasjoner» og generer en bedriftsnøkkel.'
      },
      {
        number: 3,
        title: 'Lim inn og aktiver',
        description: 'Lim inn nøkkelen nedenfor. Dokumenter du ferdigstiller i VikingMester kan nå eksporteres direkte til Boligmappa.'
      }
    ],
    tip: 'Kunden får automatisk varsel i sin egen Boligmappa når du overleverer dokumentasjonen.',
    troubleshooting: 'Krever aktiv bedriftsavtale hos Boligmappa AS.'
  },
  tripletex: {
    title: 'Slik kobler du til Tripletex Økonomi',
    subtitle: 'Synkroniser tilleggsordrer, timelister og prosjektkostnader direkte med regnskapet.',
    portalName: 'Tripletex Innlogging',
    portalUrl: 'https://tripletex.no',
    benefits: [
      'Godkjente tilleggskrav (NS 8406) kan faktureres med ett klikk',
      'Automatisk overføring av timelister fra håndverkernes mobilapp',
      'Reell dekningsgrad og økonomisk fremdrift i sanntid'
    ],
    steps: [
      {
        number: 1,
        title: 'Opprett API-tilgang i Tripletex',
        description: 'Logg inn i Tripletex og gå til «Brukernavn» ➔ «Min profil» ➔ fanen «API-tilgang».'
      },
      {
        number: 2,
        title: 'Opprett ny brukertilgang',
        description: 'Velg «Ny nøkkel», velg tilpasset oppsett med prosjekt- og timeregistreringstillatelser, og generer sesjonstoken.'
      },
      {
        number: 3,
        title: 'Koble til VikingMester',
        description: 'Lim inn nøkkelen nedenfor for å aktivere toveis synkronisering.'
      }
    ],
    tip: 'Du kan velge om ordrer skal opprettes som utkast eller legges rett i godkjenningskøen.',
    troubleshooting: 'Sjekk at ansattprofilen i Tripletex har rettighet til å opprette ordre og registrere timer.'
  },
  poweroffice: {
    title: 'Slik kobler du til PowerOffice Go',
    subtitle: 'Moderne skybasert regnskap og fakturering for håndverksbedrifter.',
    portalName: 'PowerOffice Go Portal',
    portalUrl: 'https://go.poweroffice.net',
    benefits: [
      'Synkronisering av prosjektkunder og underleverandør-fakturaer',
      'Automatisk oppdatering av timepriser og materialpåslag',
      'Sømløst regnskapsflyt uten dobbeltføring'
    ],
    steps: [
      {
        number: 1,
        title: 'Finn Application Key i PowerOffice Go',
        description: 'Logg inn som administrator og gå til «Meny» ➔ «Innstillinger» ➔ «Utvidelser/API».'
      },
      {
        number: 2,
        title: 'Generer Client Key',
        description: 'Opprett en nøkkel dedikert til VikingMester med tilgang til prosjekt og fakturering.'
      },
      {
        number: 3,
        title: 'Lim inn og lagre',
        description: 'Lim inn nøkkelen nedenfor for å fullføre integrasjonen.'
      }
    ],
    tip: 'PowerOffice Go oppdateres i sanntid når prosjektleder godkjenner materialforbruk.',
    troubleshooting: 'Kontakt bedriftens regnskapsfører dersom du mangler administratorrettigheter i PowerOffice Go.'
  },
  fiken: {
    title: 'Slik kobler du til Fiken Regnskap',
    subtitle: 'Norges enkleste regnskapsprogram for små og mellomstore håndverkerbedrifter.',
    portalName: 'Fiken Innlogging',
    portalUrl: 'https://fiken.no',
    benefits: [
      '100% automatisk overføring av godkjente tilleggsordrer til fakturautkast',
      'Direkte opprettelse av kunder og prosjekter i Fiken uten dobbeltføring',
      'Henter automatisk alle tilknyttede foretak på din Fiken-bruker'
    ],
    steps: [
      {
        number: 1,
        title: 'Logg inn på Fiken',
        description: 'Gå til fiken.no og logg inn med din vanlige bruker.'
      },
      {
        number: 2,
        title: 'Hent Personal API Token',
        description: 'Klikk på navnet ditt øverst til høyre ➔ «Brukerinnstillinger» ➔ fanen «API» ➔ «Opprett ny API-nøkkel».'
      },
      {
        number: 3,
        title: 'Lim inn og verifiser',
        description: 'Lim inn nøkkelen nedenfor. VikingMester sjekker umiddelbart mot Fikens API og henter dine foretak.'
      }
    ],
    tip: 'Fiken krever ingen partneravtale – nøkkelen din gir umiddelbar tilgang!',
    troubleshooting: 'Husk å gi nøkkelen skrive- og leserettigheter til selskapene du vil synkronisere.'
  }
};

export default function IntegrationGuideCard({
  service,
  variant = 'light',
  defaultExpanded = true
}: IntegrationGuideCardProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const guide = GUIDES[service];
  if (!guide) return null;

  const isDark = variant === 'dark';

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    toast.success('Kopiert til utklippstavlen!');
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className={cn(
      "rounded-2xl border transition-all text-xs overflow-hidden",
      isDark 
        ? "bg-slate-800/80 border-slate-700/80 text-slate-200" 
        : "bg-blue-50/60 border-blue-200/80 text-slate-800"
    )}>
      {/* Header bar / accordion toggle */}
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          "p-3.5 sm:p-4 flex items-center justify-between cursor-pointer select-none transition-colors",
          isDark ? "hover:bg-slate-800" : "hover:bg-blue-100/50"
        )}
      >
        <div className="flex items-center gap-2.5">
          <div className={cn(
            "w-7 h-7 rounded-xl flex items-center justify-center shrink-0",
            isDark ? "bg-electric-500/20 text-electric-300" : "bg-blue-600 text-white shadow-xs"
          )}>
            <HelpCircle size={16} />
          </div>
          <div>
            <h4 className={cn("font-bold text-sm leading-tight", isDark ? "text-white" : "text-blue-950")}>
              📖 {guide.title}
            </h4>
            <p className={cn("text-[11px] mt-0.5", isDark ? "text-slate-400" : "text-blue-700/90")}>
              Enkel 3-stegs veiledning for oppkobling
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {guide.portalUrl && (
            <a
              href={guide.portalUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className={cn(
                "hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-[11px] transition-all",
                isDark 
                  ? "bg-slate-700 hover:bg-slate-600 text-white" 
                  : "bg-white hover:bg-blue-50 text-blue-800 border border-blue-200 shadow-xs"
              )}
            >
              <span>{guide.portalName}</span>
              <ExternalLink size={12} />
            </a>
          )}
          <button 
            type="button"
            className={cn(
              "p-1.5 rounded-lg transition-colors",
              isDark ? "text-slate-400 hover:text-white" : "text-blue-700 hover:bg-blue-200/50"
            )}
            aria-label={isExpanded ? 'Lukk veiledning' : 'Åpne veiledning'}
          >
            {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
        </div>
      </div>

      {/* Expandable Content */}
      {isExpanded && (
        <div className={cn(
          "px-3.5 pb-4 sm:px-5 sm:pb-5 space-y-4 border-t",
          isDark ? "border-slate-700/60 bg-slate-900/40" : "border-blue-100 bg-white/70"
        )}>
          {/* Subtitle & Mobile Portal link */}
          <div className="pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <p className={cn("text-xs leading-relaxed", isDark ? "text-slate-300" : "text-slate-700")}>
              {guide.subtitle}
            </p>
            {guide.portalUrl && (
              <a
                href={guide.portalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  "sm:hidden inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-[11px] transition-all w-fit",
                  isDark 
                    ? "bg-slate-700 hover:bg-slate-600 text-white" 
                    : "bg-blue-600 text-white"
                )}
              >
                <span>{guide.portalName}</span>
                <ExternalLink size={12} />
              </a>
            )}
          </div>

          {/* Benefits summary list */}
          {guide.benefits && guide.benefits.length > 0 && (
            <div className={cn(
              "p-3 rounded-xl space-y-1.5",
              isDark ? "bg-slate-800/60 border border-slate-700/50" : "bg-blue-50/80 border border-blue-100"
            )}>
              <span className={cn(
                "text-[10px] font-black uppercase tracking-wider block mb-1",
                isDark ? "text-electric-300" : "text-blue-900"
              )}>
                Hva denne integrasjonen gjør for deg:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {guide.benefits.map((b, idx) => (
                  <div key={idx} className="flex items-start gap-1.5 text-[11px]">
                    <CheckCircle2 size={13} className={cn("shrink-0 mt-0.5", isDark ? "text-emerald-400" : "text-emerald-600")} />
                    <span className={isDark ? "text-slate-200" : "text-slate-700"}>{b}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Numbered Steps */}
          <div className="space-y-3">
            <span className={cn(
              "text-[10px] font-black uppercase tracking-wider block",
              isDark ? "text-slate-400" : "text-slate-600"
            )}>
              Steg-for-steg oppsett:
            </span>

            {guide.steps.map((steg, idx) => (
              <div 
                key={idx} 
                className={cn(
                  "p-3 rounded-xl border flex items-start gap-3 transition-colors",
                  isDark 
                    ? "bg-slate-800/40 border-slate-700/40" 
                    : "bg-white border-slate-200 shadow-2xs"
                )}
              >
                <div className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center text-xs font-black shrink-0",
                  isDark ? "bg-electric-500/20 text-electric-300 border border-electric-500/30" : "bg-blue-600 text-white"
                )}>
                  {steg.number}
                </div>
                <div className="flex-1 space-y-1">
                  <h5 className={cn("font-bold text-xs", isDark ? "text-white" : "text-slate-900")}>
                    {steg.title}
                  </h5>
                  <p className={cn("text-[11px] leading-relaxed", isDark ? "text-slate-300" : "text-slate-600")}>
                    {steg.description}
                  </p>
                  {steg.codeExample && (
                    <div className="mt-1.5 flex items-center justify-between gap-2 p-2 rounded-lg bg-slate-950 font-mono text-[11px] text-amber-300 border border-slate-800">
                      <span className="truncate">{steg.codeExample}</span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(steg.codeExample!, idx)}
                        className="text-slate-400 hover:text-white shrink-0 p-1 rounded hover:bg-slate-800 transition-colors"
                        title="Kopier eksempel"
                      >
                        {copiedIndex === idx ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Helpful Tip */}
          {guide.tip && (
            <div className={cn(
              "p-2.5 rounded-xl flex items-start gap-2 text-[11px]",
              isDark ? "bg-emerald-500/10 text-emerald-200 border border-emerald-500/20" : "bg-emerald-50 text-emerald-900 border border-emerald-200"
            )}>
              <Lightbulb size={15} className={cn("shrink-0 mt-0.5", isDark ? "text-emerald-400" : "text-emerald-600")} />
              <div>
                <span className="font-bold">Tips: </span>
                <span>{guide.tip}</span>
              </div>
            </div>
          )}

          {/* Troubleshooting */}
          {guide.troubleshooting && (
            <div className={cn(
              "p-2.5 rounded-xl flex items-start gap-2 text-[11px]",
              isDark ? "bg-amber-500/10 text-amber-200 border border-amber-500/20" : "bg-amber-50 text-amber-900 border border-amber-200"
            )}>
              <AlertCircle size={15} className={cn("shrink-0 mt-0.5", isDark ? "text-amber-400" : "text-amber-600")} />
              <div>
                <span className="font-bold">Feilsøking: </span>
                <span>{guide.troubleshooting}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
