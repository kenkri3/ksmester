'use client';

import React, { useState } from 'react';
import { 
  Bot, 
  Sparkles, 
  ShieldCheck, 
  ArrowRight, 
  HardHat, 
  Wrench, 
  Building2, 
  Zap, 
  ChevronRight,
  Copy,
  Code,
  ExternalLink,
  RefreshCw,
  Check
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { toast } from 'sonner';
import MesterAIAgentFrame from './MesterAIAgentFrame';

export type DemoRole = 'byggmester' | 'tomrer' | 'rorlegger';

interface DemoPreset {
  id: string;
  role: DemoRole;
  label: string;
  prompt: string;
  description: string;
}

const DEMO_PRESETS: DemoPreset[] = [
  // BYGGMESTER PRESETS
  {
    id: 'bm-eo',
    role: 'byggmester',
    label: '⚡ Varsle endringsordre (NS 8406)',
    prompt: 'Varsle endringsordre iht. NS 8406 på 28 500 kr for ekstra bærebjelke',
    description: 'Genererer formelt krav om vederlagsjustering og fristforlengelse iht. NS 8406 punkt 19.'
  },
  {
    id: 'bm-status',
    role: 'byggmester',
    label: '📊 Prosjekthelse & Krav',
    prompt: 'Hva er prosjekthelse og ubehandlede krav på Geitekleiva?',
    description: 'Henter sanntidsstatus på fremdrift, økonomiske krav og aktive lukkesperrer.'
  },
  {
    id: 'bm-offer',
    role: 'byggmester',
    label: '📝 Kalkyle på etterisolering',
    prompt: 'Lag et tilbud på etterisolering og ny kledning med 15% påslag',
    description: 'Beregner materialer, timer og dekningsbidrag for kundeavtale.'
  },

  // TØMRER PRESETS
  {
    id: 'tom-log',
    role: 'tomrer',
    label: '🎙️ Stemmestyrt dagbok',
    prompt: 'Før 7,5 timer lekting og vindsperre i byggedagboken for Geitekleiva',
    description: 'Loggfører timer og henter sanntids værdata automatisk fra Yr.no.'
  },
  {
    id: 'tom-sja',
    role: 'tomrer',
    label: '🛡️ SJA for arbeid i stillas',
    prompt: 'Lag en SJA for utvendig fasadearbeid og stillas i 3. etasje',
    description: 'Strukturerer faremomenter og vernetiltak iht. Forskrift om utførelse av arbeid.'
  },
  {
    id: 'tom-tek17',
    role: 'tomrer',
    label: '📐 Krav til dampsperre (TEK17)',
    prompt: 'Hva sier TEK17 og Våtromsnormen om dampsperre mot yttervegg?',
    description: 'Slår opp byggtekniske krav for å unngå kondens og fuktfeller.'
  },

  // RØRLEGGER PRESETS
  {
    id: 'ror-close',
    role: 'rorlegger',
    label: '🚰 Godkjenn trykktest (Lukkesperre)',
    prompt: 'Trykktest av rør-i-rør fordelerskap fullført med 10 bar, alt tett',
    description: 'Kvitterer ut rørleggersjekk og opphever lukkesperre for Bad 2. etasje.'
  },
  {
    id: 'ror-fall',
    role: 'rorlegger',
    label: '📐 Fall mot sluk (TEK17)',
    prompt: 'Hva er kravene til fall mot sluk i TEK17 på bad?',
    description: 'Viser standardiserte krav til fallforhold i våtsone og gulv generelt.'
  },
  {
    id: 'ror-deviation',
    role: 'rorlegger',
    label: '📸 Meld avvik: Utsparing',
    prompt: 'Meld avvik: Bjelkelag mangler utsparing for avløpsrør 110mm i teknisk sjakt',
    description: 'Registrerer tverrfaglig avvik og varsler byggeleder Ken direkte.'
  }
];

export default function MesterAIDemoSimulator({
  onStartFreeTrial,
  id = 'live-demo'
}: {
  onStartFreeTrial?: () => void;
  id?: string;
}) {
  const [selectedRole, setSelectedRole] = useState<DemoRole>('byggmester');
  const [viewMode, setViewMode] = useState<'agent' | 'iframe'>('agent');
  const [pendingPrompt, setPendingPrompt] = useState<string | undefined>(undefined);
  const [refreshKey, setRefreshKey] = useState<number>(0);
  const [copiedEmbed, setCopiedEmbed] = useState(false);

  // Bytte av rolle
  const handleRoleChange = (role: DemoRole) => {
    setSelectedRole(role);
    setPendingPrompt(undefined);
    setRefreshKey(prev => prev + 1);
  };

  // Kjøre en av forhåndskommandoene direkte i agenten
  const handleTriggerPreset = (prompt: string) => {
    setViewMode('agent');
    setPendingPrompt(prompt);
  };

  const handleResetSession = () => {
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.removeItem(`demo_agent_chat_${selectedRole}`);
      } catch {}
    }
    setPendingPrompt(undefined);
    setRefreshKey(prev => prev + 1);
    toast.success(`Sandkasse for ${selectedRole === 'byggmester' ? 'Byggmester' : selectedRole === 'tomrer' ? 'Tømrer' : 'Rørlegger'} er nullstilt`);
  };

  const embedCodeSnippet = `<iframe 
  src="https://vikingmester.no/embed/agent?role=${selectedRole}&project=Geitekleiva" 
  width="100%" 
  height="600" 
  frameborder="0" 
  allow="microphone"
  style="border-radius: 16px; border: 1px solid #334155; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.3);">
</iframe>`;

  const handleCopyEmbedCode = () => {
    navigator.clipboard.writeText(embedCodeSnippet);
    setCopiedEmbed(true);
    toast.success('iFrame-innbyggingskode kopiert til utklippstavlen!');
    setTimeout(() => setCopiedEmbed(false), 2500);
  };

  const rolePresets = DEMO_PRESETS.filter(p => p.role === selectedRole);

  return (
    <section id={id} className="py-16 sm:py-24 bg-gradient-to-b from-white via-slate-50 to-white border-b border-slate-200">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-electric-50 border border-electric-300/40 text-electric-600 text-xs font-bold tracking-wide uppercase shadow-xs mb-3">
            <Sparkles size={14} className="text-electric-500 animate-pulse" />
            <span>100% EKTE BACKEND AGENT • PRØVEKJØR MESTERAI LIVE</span>
          </div>
          <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black tracking-tight text-navy-900 leading-tight">
            Opplev den virkelige autonome agenten <span className="text-gradient-purple">i sanntid</span>.
          </h2>
          <p className="mt-4 text-sm sm:text-base text-slate-600 leading-relaxed font-sans">
            Dette er ikke en animert mockup – du kommuniserer direkte med MesterAIs backend-hjerne. Byggmesteren styrer kalkylen og NS-krav, mens tømreren og rørleggeren har en lynrask assistent på byggeplassen.
          </p>
        </div>

        {/* Interactive Simulator Shell */}
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-card-hover overflow-hidden">
          
          {/* Top Header: Role Selector & Mode Toggle */}
          <div className="p-3 sm:p-4 bg-slate-900 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
            
            {/* Project Indicator & View Toggle */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider">
                  Sandkasse: <strong className="text-white">Geitekleiva</strong>
                </span>
              </div>

              {/* View Mode Tabs (Direct Agent vs Embed iFrame) */}
              <div className="flex items-center bg-slate-800 p-0.5 rounded-xl border border-slate-700">
                <button
                  type="button"
                  onClick={() => setViewMode('agent')}
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1.5 cursor-pointer",
                    viewMode === 'agent'
                      ? "bg-electric-600 text-white shadow-xs"
                      : "text-slate-400 hover:text-white"
                  )}
                >
                  <Bot size={13} />
                  <span>🟢 Ekte Agent</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('iframe')}
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1.5 cursor-pointer",
                    viewMode === 'iframe'
                      ? "bg-electric-600 text-white shadow-xs"
                      : "text-slate-400 hover:text-white"
                  )}
                >
                  <Code size={13} />
                  <span>🖼️ iFrame Visning & Kode</span>
                </button>
              </div>
            </div>

            {/* 3 Role Buttons */}
            <div className="flex items-center gap-1.5 bg-slate-800/90 p-1 rounded-2xl border border-slate-700/60 overflow-x-auto">
              <button
                type="button"
                onClick={() => handleRoleChange('byggmester')}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer",
                  selectedRole === 'byggmester'
                    ? "bg-electric-600 text-white shadow-md shadow-electric-600/30"
                    : "text-slate-400 hover:text-white hover:bg-slate-700/50"
                )}
              >
                <Building2 size={13} />
                <span>1. Byggmester / Leder</span>
              </button>

              <button
                type="button"
                onClick={() => handleRoleChange('tomrer')}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer",
                  selectedRole === 'tomrer'
                    ? "bg-amber-600 text-white shadow-md shadow-amber-600/30"
                    : "text-slate-400 hover:text-white hover:bg-slate-700/50"
                )}
              >
                <HardHat size={13} />
                <span>2. Tømrer (I stillas)</span>
              </button>

              <button
                type="button"
                onClick={() => handleRoleChange('rorlegger')}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer",
                  selectedRole === 'rorlegger'
                    ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                    : "text-slate-400 hover:text-white hover:bg-slate-700/50"
                )}
              >
                <Wrench size={13} />
                <span>3. Rørlegger (Lukkesperre)</span>
              </button>
            </div>
          </div>

          {/* Role Status & GDPR Security Banner */}
          <div className={cn(
            "px-4 sm:px-5 py-2.5 text-xs font-medium flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b transition-colors",
            selectedRole === 'byggmester' && "bg-purple-50 text-purple-900 border-purple-100",
            selectedRole === 'tomrer' && "bg-amber-50 text-amber-900 border-amber-100",
            selectedRole === 'rorlegger' && "bg-blue-50 text-blue-900 border-blue-100"
          )}>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold uppercase tracking-wider text-[10px] px-2 py-0.5 rounded-full bg-white/90 border shadow-xs">
                {selectedRole === 'byggmester' ? 'Full Administrator • Alle Prosjekter & Kalkyler' : selectedRole === 'tomrer' ? 'Prosjektbundet • Kun Geitekleiva' : 'Underentreprenør • Faglig Lukkesperre'}
              </span>
              <span className="hidden sm:inline-block">•</span>
              <span className="text-[11px]">
                {selectedRole === 'byggmester' 
                  ? 'Kan utstede NS 8406 krav, godkjenne fakturering og se dekningsgrad.'
                  : selectedRole === 'tomrer'
                    ? 'Kan føre timer, stemmestyre byggedagbok og lage SJA. Skjermet mot interne kalkyler.'
                    : 'Kan kvittere trykktest for å oppheve lukkesperre og melde tverrfaglige avvik.'}
              </span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-slate-500 bg-white/80 px-2 py-0.5 rounded-md border border-slate-200">
                <ShieldCheck size={12} className="text-emerald-600" />
                <span>GDPR & Norsk Lov Isolert</span>
              </span>
              <button
                type="button"
                onClick={handleResetSession}
                className="p-1 rounded-md text-slate-500 hover:text-slate-900 hover:bg-white/60 transition-colors"
                title="Nullstill sandkassesamtale"
              >
                <RefreshCw size={12} />
              </button>
            </div>
          </div>

          {/* Quick Scenario Buttons (Click-to-test real AI) */}
          <div className="p-3 sm:p-4 bg-slate-50 border-b border-slate-200">
            <p className="text-[11px] font-black uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
              <Zap size={13} className="text-electric-600" />
              <span>Klikk for å prøve en reell fagforespørsel for denne rollen (eller skriv fritt i chatten):</span>
            </p>
            <div className="flex flex-wrap gap-2">
              {rolePresets.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleTriggerPreset(preset.prompt)}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all text-left flex items-center gap-1.5 cursor-pointer shadow-xs bg-white text-navy-900 border border-slate-200/90 hover:border-electric-400 hover:bg-electric-50/50 active:scale-[0.99]"
                  title={preset.description}
                >
                  <span>{preset.label}</span>
                  <ChevronRight size={12} className="text-slate-400" />
                </button>
              ))}
            </div>
          </div>

          {/* VIEW MODE 1: LIVE AGENT (Direct MesterAIAgentFrame) */}
          {viewMode === 'agent' && (
            <div className="relative bg-slate-900 overflow-hidden">
              <MesterAIAgentFrame
                key={`${selectedRole}-${refreshKey}`}
                className="w-full h-[520px] sm:h-[560px] border-0 rounded-none shadow-none"
                selectedProjectName="Geitekleiva"
                userName={
                  selectedRole === 'byggmester' 
                    ? 'Byggmester Ken' 
                    : selectedRole === 'tomrer' 
                      ? 'Tømrer Magne' 
                      : 'Rørlegger Ole'
                }
                userTrade={
                  selectedRole === 'rorlegger' 
                    ? 'plumber' 
                    : selectedRole === 'tomrer' 
                      ? 'carpenter' 
                      : 'general'
                }
                companyName="VikingMester Sandkasse"
                userId={`demo_visitor_${selectedRole}`}
                storageKey={`demo_agent_chat_${selectedRole}`}
                hasBottomNav={false}
                initialPrompt={pendingPrompt}
                onPromptHandled={() => setPendingPrompt(undefined)}
              />
            </div>
          )}

          {/* VIEW MODE 2: LIVE IFRAME & EMBED SNIPPET */}
          {viewMode === 'iframe' && (
            <div className="p-5 sm:p-7 bg-slate-950 text-white space-y-6">
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                    <Code size={16} className="text-electric-400" />
                    <span>iFrame Integrasjon: MesterAI på din egen nettside eller intranett</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Agenten kan bygges inn i ethvert prosjektverktøy, SharePoint, Byggeweb eller kundens hjemmeside med én enkelt linje HTML.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href={`/embed/agent?role=${selectedRole}&project=Geitekleiva`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all flex items-center gap-1.5 border border-slate-700"
                  >
                    <span>Åpne i nytt vindu</span>
                    <ExternalLink size={12} />
                  </a>

                  <button
                    type="button"
                    onClick={handleCopyEmbedCode}
                    className="px-3.5 py-1.5 rounded-xl bg-electric-600 hover:bg-electric-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
                  >
                    {copiedEmbed ? <Check size={13} /> : <Copy size={13} />}
                    <span>{copiedEmbed ? 'Kopiert!' : 'Kopier iFrame-kode'}</span>
                  </button>
                </div>
              </div>

              {/* Real Live iFrame Rendering */}
              <div className="rounded-2xl overflow-hidden border border-slate-700 bg-slate-900 shadow-2xl">
                <div className="px-4 py-2 bg-slate-800/80 border-b border-slate-700 flex items-center justify-between text-[11px] font-mono text-slate-400">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <span className="ml-2 text-slate-300">https://vikingmester.no/embed/agent?role={selectedRole}&project=Geitekleiva</span>
                  </div>
                  <span className="uppercase text-[10px] tracking-wider text-electric-400 font-bold">iFrame Preview</span>
                </div>
                <iframe
                  src={`/embed/agent?role=${selectedRole}&project=Geitekleiva`}
                  className="w-full h-[480px] sm:h-[520px] bg-slate-900"
                  title="MesterAI iFrame Live Preview"
                  allow="microphone"
                />
              </div>

              {/* Code Snippet Box */}
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono font-bold text-slate-300">HTML Innbyggingskode:</span>
                  <button
                    type="button"
                    onClick={handleCopyEmbedCode}
                    className="text-[11px] font-mono text-electric-400 hover:text-electric-300 flex items-center gap-1 cursor-pointer"
                  >
                    <Copy size={12} />
                    <span>Kopier kode</span>
                  </button>
                </div>
                <pre className="p-3 bg-slate-950 rounded-xl text-xs font-mono text-electric-300 overflow-x-auto border border-slate-800/60 leading-relaxed">
                  {embedCodeSnippet}
                </pre>
              </div>

            </div>
          )}

          {/* GDPR & Multi-Tenant Security Guarantee Footer */}
          <div className="p-4 sm:p-5 bg-slate-900/90 border-t border-slate-800 text-xs text-slate-400 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <ShieldCheck size={18} className="text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-slate-200 block text-xs">
                  Garanti for Multi-Tenant Isolasjon og GDPR (Personvernforordningen Art. 5 & 28):
                </strong>
                <p className="text-[11px] text-slate-400 leading-relaxed mt-0.5">
                  Uansett hvor mange bedrifter eller brukere som opprettes, har hver kunde en unik kryptografisk sesjonshash. Agenten kan <em>aldri</em> forveksle eller dele kalkyler, HMS-avvik, timelister eller personopplysninger mellom bedrifter.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-[10px] font-mono font-bold text-emerald-400 border border-slate-700">
                ISO / GDPR Kompatibel
              </span>
            </div>
          </div>

          {/* Bottom Conversion CTA Strip */}
          <div className="p-4 sm:p-6 bg-gradient-to-r from-navy-950 via-slate-900 to-navy-950 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-emerald-400">
                  KLAR FOR DETTE I DIN EGEN BEDRIFT?
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 mt-0.5">
                Start 14 dagers gratis prøveperiode. Ingen bindingstid – kom i gang på 30 sekunder.
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <a
                href="#bestill"
                onClick={onStartFreeTrial}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-electric-500 to-electric-400 hover:from-electric-400 hover:to-electric-300 text-white font-bold text-xs shadow-purple-cta transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap"
              >
                <span>Start Gratis Prøveperiode</span>
                <ArrowRight size={14} />
              </a>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
}
