import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileText, 
  ShieldCheck, 
  Zap, 
  Database, 
  Lock, 
  Globe, 
  Code,
  Smartphone,
  LayoutDashboard,
  Server,
  Layers,
  Cpu,
  Share2,
  TrendingUp,
  Rocket,
  ChevronRight
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useTranslation } from 'react-i18next';
import { cn } from '@/src/lib/utils';

// Import architecture phases
import ArchitecturePhase1 from './ArchitecturePhase1';
import ArchitecturePhase2 from './ArchitecturePhase2';
import ArchitecturePhase3 from './ArchitecturePhase3';
import ArchitecturePhase4 from './ArchitecturePhase4';
import ArchitecturePhase5 from './ArchitecturePhase5';
import ArchitecturePhase6 from './ArchitecturePhase6';

const SPEC_CONTENT = `
# Teknisk Spesifikasjon: KS Mester AI Elite

## 1. Systemarkitektur & Infrastruktur
Systemet er bygget som en moderne **Full-Stack Enterprise Cloud-Native** applikasjon med robust sikkerhet, sanntidsfunksjonalitet og dypt integrert AI.

### Frontend
- **Mobil & Felt:** PWA (Progressive Web App) optimalisert for nettbrett og smarttelefoner på byggeplass med offline-støtte.
- **Web:** React 18 med TypeScript, Tailwind CSS og Framer Motion for kontordashboard og administrasjon.
- **Hardware-Tilgang:** lazy/demand-driven tillatelser. Kamera og mikrofon etterspørres *kun* når brukeren aktivt starter bildedokumentasjon eller taleinnlogging i appen.

### Backend & API Architecture
- **Server:** Node.js / Express med TypeScript.
- **Autentisering:** JWT (JSON Web Tokens) kombinert med bcrypt passord-hashing og sesjonskontroll.
- **Database:** PostgreSQL (Relasjonell Cloud SQL) for persistering av prosjekter, SJA, avvik, timeføring og mannskapslister.
- **REST API Client:** Sanntids REST-klient med automatisk lokal fallback og caching.

### AI Mesterhjerne
- **AI-Kvalitetssikring & TEK17:** DeepSeek-V3 for sanntids analyse, gjenkjenning av bygningselementer og avvikssjekk mot TEK17.
- **Smart-SJA & Autonom KS:** DeepSeek-V3 og DeepSeek-R1 for naturlig språkforståelse, automatisk risikovurdering og generering av HMS/KS-dokumentasjon.

## 2. Kjernefunksjonalitet
### HMS/KS, SJA & Avvik
- Full digitalisering av krav i SAK10 og Arbeidstilsynets forskrifter.
- AI-generert SJA (Sikker Jobb Analyse) med tiltaksforslag tilpasset valgt fagområde.
- Digital signering og historikk med endringslogg.

### Mannskapslister & Prosjektstyring
- Geofencing-støttet mannskapsregistrering i tråd med Byggherreforskriften.
- Prosjektdashboard med økonomioversikt, faggruppehåndtering og avviksstatistikk.

### FDV & Sluttkontroll
- Automatisk henting av produktdata og miljødokumentasjon via NOBB API.
- Generering av FDV-dokumentasjon og overleveringsprotokoller for Boligmappa.no.

## 3. Personvern, GDPR & Norsk Lovgivning
- **Samtykkehåndtering (Cookie Banner):** Full etterlevelse av GDPR og den norske **Ekomloven § 2-7b**. Brukerne har aktiv kontroll med muligheten til å velge kun nødvendige kapsler eller skreddersy kategorier.
- **Rett til å bli glemt:** Innebygd støtte for eksport og sletting av personopplysninger.
- **Sikker Lagring:** Datalagring i henhold til europeiske datasenterstandarder.

## 4. Håndverkerspesifikk Tilpasning
Systemet støtter alle fagområder (Tømrer, Rørlegger, Elektriker, Maler, Murer m.fl.):
- **Fagspesifikke Moduler:** Egen SJA-katalog, sjekklister og HMS-håndbøker skreddersydd for den enestående faggruppen.
- **Flerspråklig Grensesnitt:** Innebygd universelt oversettelsesverktøy (Norsk, Engelsk, Polsk, Litauisk).
`;

type Tab = 'spec' | 'phase1' | 'phase2' | 'phase3' | 'phase4' | 'phase5' | 'phase6';

export default function TechnicalSpec() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<Tab>('spec');

  const tabs = [
    { id: 'spec', label: 'Spesifikasjon', icon: <FileText size={16} /> },
    { id: 'phase1', label: 'Fase 1', icon: <Layers size={16} /> },
    { id: 'phase2', label: 'Fase 2', icon: <Cpu size={16} /> },
    { id: 'phase3', label: 'Fase 3', icon: <Share2 size={16} /> },
    { id: 'phase4', label: 'Fase 4', icon: <TrendingUp size={16} /> },
    { id: 'phase5', label: 'Fase 5', icon: <Rocket size={16} /> },
    { id: 'phase6', label: 'Fase 6', icon: <ChevronRight size={16} /> },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="flex flex-col gap-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-neutral-900 rounded-xl flex items-center justify-center text-white">
                <Code size={20} />
              </div>
              <h1 className="text-3xl font-bold tracking-tight">Master-Blueprint</h1>
            </div>
            <p className="text-neutral-500 max-w-2xl">
              Dette dokumentet definerer den tekniske og kommersielle rammen for KS Mester AI. 
              Utviklet for å møte kravene i TEK17 og SAK10.
            </p>
          </div>
        </div>

        {/* Tabs Navigation */}
        <div className="flex items-center gap-2 p-1 bg-neutral-100 rounded-2xl w-fit overflow-x-auto no-scrollbar max-w-full">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as Tab)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap",
                activeTab === tab.id 
                  ? "bg-white text-neutral-900 shadow-sm" 
                  : "text-neutral-500 hover:text-neutral-700 hover:bg-neutral-50"
              )}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="min-h-[600px]"
          >
            {activeTab === 'spec' && (
              <div className="bg-white rounded-[3rem] border border-neutral-200 shadow-sm overflow-hidden">
                <div className="p-8 lg:p-12 prose prose-neutral max-w-none">
                  <div className="markdown-body">
                    <ReactMarkdown>{SPEC_CONTENT}</ReactMarkdown>
                  </div>
                </div>

                <div className="p-8 lg:p-12 bg-neutral-900 text-white">
                  <h3 className="text-xl font-bold mb-8">Sentrale Teknologier</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                    {[
                      { icon: <Zap className="text-emerald-400" />, label: "DeepSeek AI" },
                      { icon: <Database className="text-blue-400" />, label: "PostgreSQL" },
                      { icon: <Lock className="text-purple-400" />, label: "BankID" },
                      { icon: <Globe className="text-amber-400" />, label: "NOBB API" }
                    ].map((tech, i) => (
                      <div key={i} className="flex flex-col items-center gap-3">
                        <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center">
                          {tech.icon}
                        </div>
                        <span className="text-xs font-bold uppercase tracking-widest opacity-70">{tech.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'phase1' && <ArchitecturePhase1 />}
            {activeTab === 'phase2' && <ArchitecturePhase2 />}
            {activeTab === 'phase3' && <ArchitecturePhase3 />}
            {activeTab === 'phase4' && <ArchitecturePhase4 />}
            {activeTab === 'phase5' && <ArchitecturePhase5 />}
            {activeTab === 'phase6' && <ArchitecturePhase6 />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
