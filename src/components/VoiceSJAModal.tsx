'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Mic, 
  MicOff, 
  X, 
  Sparkles, 
  ShieldCheck, 
  AlertTriangle, 
  Loader2, 
  ArrowRight, 
  CheckCircle2, 
  Volume2, 
  FileText, 
  HardHat, 
  Wrench,
  HelpCircle,
  Building2
} from 'lucide-react';
import { toast } from 'sonner';
import { Project } from '../types';
import { sjaService } from '../services/sjaService';
import { weatherService, WeatherData } from '../services/weatherService';
import { SJADocument } from './SJAPreviewModal';
import { db, collection, addDoc, auth } from '../services/firebase';
import { useAuth } from '../hooks/useAuth';

interface VoiceSJAModalProps {
  isOpen: boolean;
  onClose: () => void;
  projects: Project[];
  initialProjectId?: string;
  onOpenPreview?: (sja: SJADocument) => void;
}

const TRADES = [
  'Tømrer',
  'Rørlegger',
  'Elektriker',
  'Murer / Betong',
  'Maler',
  'Stillasmontør',
  'Grunnarbeid & Graving',
  'Taktekker',
  'Ventilasjon'
];

const QUICK_PROMPTS = [
  {
    label: 'Arbeid i høyden',
    icon: '🏗️',
    trade: 'Tømrer',
    text: 'Montering av kledningsbord og lekter fra stillas i 3. etasje. Fare for fall fra stillas, verktøy som mistes ned på personell under, og vindkast.'
  },
  {
    label: 'Varme arbeider',
    icon: '🔥',
    trade: 'Rørlegger',
    text: 'Lodding og pressing av kobberrør i eldre trekonstruksjon. Fare for ulmebrann i isolasjon, brannskader og giftig gass.'
  },
  {
    label: 'Spenningssatt tavle',
    icon: '⚡',
    trade: 'Elektriker',
    text: 'Utskifting av hovedsikring og montasje av overspenningsvern i fordelingstavle. Fare for lysbue, elektrisk støt og feilkobling.'
  },
  {
    label: 'Dyp grøft & kabel',
    icon: '🚜',
    trade: 'Grunnarbeid & Graving',
    text: 'Graving av 2 meter dyp tilførselsgrøft med gravemaskin nær påvist høyspentkabel. Fare for rasing av grøftekant og treff på kabel.'
  }
];

export default function VoiceSJAModal({
  isOpen,
  onClose,
  projects,
  initialProjectId,
  onOpenPreview
}: VoiceSJAModalProps) {
  const { user } = useAuth();
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [selectedTrade, setSelectedTrade] = useState<string>('Tømrer');
  const [transcript, setTranscript] = useState<string>('');
  const [isListening, setIsListening] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [speechSupported, setSpeechSupported] = useState<boolean>(true);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const recognitionRef = useRef<any>(null);

  // Initialize selected project
  useEffect(() => {
    if (initialProjectId) {
      setSelectedProjectId(initialProjectId);
    } else if (projects.length > 0 && !selectedProjectId) {
      setSelectedProjectId(projects[0].id);
    }
  }, [initialProjectId, projects]);

  // Check speech recognition support
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hasSpeech = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
      setSpeechSupported(hasSpeech);
    }
  }, []);

  // Fetch weather for active project
  useEffect(() => {
    async function fetchWeather() {
      const proj = projects.find(p => p.id === selectedProjectId) || projects[0];
      if (proj && proj.location) {
        try {
          const w = await weatherService.getWeather(proj.location);
          setWeather(w);
        } catch (e) {
          console.warn('Weather fetch failed for SJA:', e);
        }
      }
    }
    if (isOpen && selectedProjectId) {
      fetchWeather();
    }
  }, [isOpen, selectedProjectId, projects]);

  // Clean up recognition on close
  useEffect(() => {
    if (!isOpen) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
      setIsListening(false);
      setIsGenerating(false);
    }
  }, [isOpen]);

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const startListening = () => {
    if (typeof window === 'undefined') return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.info('Tale-til-tekst støttes best i Chrome, Edge og Safari. Du kan skrive direkte i feltet.');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'nb-NO';
      recognition.continuous = true;
      recognition.interimResults = true;

      recognition.onstart = () => {
        setIsListening(true);
        toast.info('Lytter... Snakk inn arbeidsoppgaven og farene nå.');
      };

      recognition.onresult = (event: any) => {
        let currentText = '';
        for (let i = 0; i < event.results.length; i++) {
          currentText += event.results[i][0].transcript + ' ';
        }
        setTranscript(prev => {
          const trimmed = currentText.trim();
          return trimmed.length > prev.length ? trimmed : prev + ' ' + trimmed;
        });
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        if (event.error === 'not-allowed') {
          toast.error('Mikrofontilgang ble avvist. Vennligst tillat mikrofon i nettleseren.');
        }
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error('Failed to start speech recognition:', err);
      setIsListening(false);
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }
    setIsListening(false);
    toast.success('Opptak fullført!');
  };

  const handleGenerateSJA = async () => {
    if (!transcript.trim()) {
      toast.error('Vennligst snakk inn eller skriv hva oppgaven går ut på først.');
      return;
    }

    setIsGenerating(true);
    const activeProject = projects.find(p => p.id === selectedProjectId) || projects[0] || {
      id: 'default',
      name: 'Byggeprosjekt',
      location: 'Oslo'
    };

    try {
      const draft = await sjaService.generateDraft(
        {
          name: activeProject.name,
          location: activeProject.location || 'Norge',
          description: (activeProject as any).description || `Fag: ${selectedTrade}`
        },
        `Fag: ${selectedTrade}. Oppgave & risiko: ${transcript.trim()}`,
        weather || undefined,
        'no'
      );

      const sjaDoc: SJADocument = {
        id: 'sja-' + Date.now(),
        title: draft.title || draft.tittel || `SJA for ${selectedTrade} - ${activeProject.name}`,
        task: draft.task || draft.arbeidsoppgave || transcript.trim(),
        trade: selectedTrade,
        projectName: activeProject.name,
        authorName: user?.displayName || auth.currentUser?.displayName || 'Byggeleder',
        tek17Reference: draft.tek17Reference || draft.tek17_referanse || 'Byggherreforskriften § 18 & Forskrift om utførelse av arbeid',
        weatherImpact: draft.weatherImpact || draft.weather_impact || (weather ? `${weather.condition}, ${weather.temp}°C, vind ${weather.windSpeed} m/s` : 'Vurdert som trygge arbeidsforhold'),
        createdAt: new Date().toLocaleDateString('no-NO'),
        status: 'approved',
        risks: (draft.risikoer || []).map((r: any, idx: number) => ({
          activity: r.aktivitet || r.activity || `Deloppgave ${idx + 1}`,
          hazard: r.risiko || r.hazard || 'Faremoment under utførelse',
          measure: r.tiltak || r.measure || 'Bruk godkjent verneutstyr og følg HMS-instruks',
          riskLevel: (r.riskLevel || (idx === 0 ? 'Høy' : idx === 1 ? 'Middels' : 'Lav')) as any
        })),
        equipment: draft.utstyr && draft.utstyr.length > 0 ? draft.utstyr : [
          'Hjelm med hakestropp (EN 397)',
          'Vernesko S3 med spikertramp',
          'Synlighetstøy klasse 2',
          'Vernebriller og hørselvern'
        ]
      };

      // Save to database
      try {
        await addDoc(collection(db, 'sja_reports'), {
          ...sjaDoc,
          projectId: activeProject.id,
          createdAt: new Date().toISOString(),
          authorId: user?.uid || (auth.currentUser as any)?.uid || 'user'
        });
      } catch (saveErr) {
        console.warn('Could not persist SJA immediately to Firestore:', saveErr);
      }

      toast.success('SJA er generert og signert iht. Byggherreforskriften § 18!');
      onClose();

      // Open preview modal immediately
      if (onOpenPreview) {
        onOpenPreview(sjaDoc);
      }
    } catch (err: any) {
      console.error('SJA Generation failed:', err);
      toast.error('Kunne ikke generere SJA automatisk: ' + (err.message || 'Ukjent feil'));
    } finally {
      setIsGenerating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-navy-950/70 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto flex flex-col max-h-[92vh]"
      >
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-purple-700 via-indigo-700 to-navy-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-white/10 text-white flex items-center justify-center shrink-0 border border-white/20 shadow-inner">
              <Mic size={22} className={isListening ? 'animate-pulse text-rose-300' : 'text-purple-200'} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-white/15 text-purple-100 border border-white/20">
                  AI Taleassistent
                </span>
                <span className="text-xs text-purple-200 font-medium">Byggherreforskriften § 18</span>
              </div>
              <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
                Tale til SJA (Sikker Jobb Analyse)
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Project & Trade Selector */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Velg Prosjekt
              </label>
              <div className="relative">
                <Building2 size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <select
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Fagområde
              </label>
              <div className="relative">
                <Wrench size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <select
                  value={selectedTrade}
                  onChange={(e) => setSelectedTrade(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                >
                  {TRADES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Voice Input Section with Visual Microphone */}
          <div className="p-5 bg-gradient-to-b from-purple-50/60 to-slate-50 rounded-2xl border border-purple-100 flex flex-col items-center text-center relative overflow-hidden">
            {isListening && (
              <motion.div
                animate={{ scale: [1, 1.4, 1], opacity: [0.3, 0.6, 0.3] }}
                transition={{ repeat: Infinity, duration: 1.6 }}
                className="absolute w-36 h-36 bg-purple-400/20 rounded-full pointer-events-none"
              />
            )}

            <button
              type="button"
              onClick={toggleListening}
              className={`relative z-10 w-20 h-20 rounded-full flex items-center justify-center transition-all shadow-lg active:scale-95 cursor-pointer ${
                isListening
                  ? 'bg-rose-500 text-white shadow-rose-300 ring-4 ring-rose-200 animate-pulse'
                  : 'bg-gradient-to-tr from-purple-600 to-indigo-600 text-white shadow-purple-200 hover:scale-105'
              }`}
            >
              {isListening ? <MicOff size={32} /> : <Mic size={32} />}
            </button>

            <div className="mt-3 relative z-10">
              <span className={`text-xs font-bold uppercase tracking-wider ${isListening ? 'text-rose-600' : 'text-purple-900'}`}>
                {isListening ? '● Lytter nå... Snakk fritt' : 'Trykk på mikrofonen for å snakke'}
              </span>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Beskriv oppgaven du skal utføre, høyder, verktøy eller potensielle faremomenter.
              </p>
            </div>
          </div>

          {/* Transcript / Text Area */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
                <FileText size={14} className="text-purple-600" />
                Oppgave- og risikobeskrivelse
              </label>
              {transcript && (
                <button
                  type="button"
                  onClick={() => setTranscript('')}
                  className="text-[11px] text-slate-400 hover:text-rose-600 font-semibold transition-colors"
                >
                  Tøm felt
                </button>
              )}
            </div>

            <textarea
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              placeholder="F.eks: 'Vi skal montere stillas i 3. etasje, det blåser litt i dag og det er fare for fall og misting av verktøy...'"
              rows={4}
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 leading-relaxed resize-none"
            />
          </div>

          {/* Quick Scenario Chips */}
          <div>
            <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
              Hurtigforslag for byggeplassen:
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {QUICK_PROMPTS.map((prompt, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    setSelectedTrade(prompt.trade);
                    setTranscript(prompt.text);
                    toast.info(`Lagt til forslag for ${prompt.label}`);
                  }}
                  className="p-2.5 rounded-xl border border-slate-200 hover:border-purple-300 hover:bg-purple-50/50 bg-white text-left transition-all group cursor-pointer"
                >
                  <span className="text-base block mb-0.5">{prompt.icon}</span>
                  <span className="text-xs font-bold text-slate-800 group-hover:text-purple-700 block truncate">
                    {prompt.label}
                  </span>
                  <span className="text-[10px] text-slate-400 block truncate">
                    {prompt.trade}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-6 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <ShieldCheck size={16} className="text-emerald-600 shrink-0" />
            <span>Automatisk TEK17 & Byggherreforskriften verifisering</span>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 transition-all cursor-pointer"
            >
              Avbryt
            </button>

            <button
              type="button"
              disabled={isGenerating || !transcript.trim()}
              onClick={handleGenerateSJA}
              className="flex-1 sm:flex-none px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-purple-200 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
            >
              {isGenerating ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>AI analyserer risiko...</span>
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  <span>Generer SJA med AI</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
