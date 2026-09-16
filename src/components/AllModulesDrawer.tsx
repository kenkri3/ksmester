import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  X,
  Search,
  Building2,
  FileText,
  CloudSun,
  Library,
  ShieldCheck,
  Camera,
  ClipboardCheck,
  AlertTriangle,
  Lock,
  BookOpen,
  FileSignature,
  Calculator,
  FileSpreadsheet,
  Clock,
  CheckCircle2,
  Car,
  Package,
  Users,
  Languages,
  GraduationCap,
  Sparkles,
  ArrowRight,
  Shield
} from 'lucide-react';
import { cn } from '../lib/utils';

export interface ModuleItem {
  id: string;
  title: string;
  subtitle: string;
  category: 'prosjekt' | 'ks_hms' | 'okonomi' | 'ressurser';
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  badge?: string;
  trade?: string[];
  action: () => void;
}

interface AllModulesDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenAction: (actionId: string) => void;
  isSuperAdmin?: boolean;
}

export default function AllModulesDrawer({
  isOpen,
  onClose,
  onOpenAction,
  isSuperAdmin = false
}: AllModulesDrawerProps) {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const modules: ModuleItem[] = [
    // 🏗️ Kategori 1: Prosjekt & Bygg
    {
      id: 'projects',
      title: 'Prosjektoversikt',
      subtitle: 'Alle aktive byggeplasser, adresser og fremdrift',
      category: 'prosjekt',
      icon: <Building2 size={22} />,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50 hover:bg-blue-100/80 border-blue-200/80',
      action: () => onOpenAction('projects')
    },
    {
      id: 'new_project',
      title: 'Nytt Prosjekt',
      subtitle: 'Opprett nytt prosjekt på under 1 minutt',
      category: 'prosjekt',
      icon: <Building2 size={22} />,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50 hover:bg-indigo-100/80 border-indigo-200/80',
      badge: 'Rask',
      action: () => onOpenAction('new_project')
    },
    {
      id: 'daily_log',
      title: 'Byggedagbok',
      subtitle: 'Før dagbok via tale, legg til mannskap og vær',
      category: 'prosjekt',
      icon: <FileText size={22} />,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50 hover:bg-purple-100/80 border-purple-200/80',
      badge: 'Tale',
      action: () => onOpenAction('daily_log')
    },
    {
      id: 'weather',
      title: 'Vær & Yr.no',
      subtitle: 'Sanntids værdata, vindstyrke og stillasvurdering',
      category: 'prosjekt',
      icon: <CloudSun size={22} />,
      color: 'text-cyan-600',
      bgColor: 'bg-cyan-50 hover:bg-cyan-100/80 border-cyan-200/80',
      action: () => onOpenAction('weather')
    },
    {
      id: 'archive',
      title: 'Dokumentarkiv & FDV',
      subtitle: 'Tegninger, FDV-dokumentasjon og godkjenninger',
      category: 'prosjekt',
      icon: <Library size={22} />,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50 hover:bg-emerald-100/80 border-emerald-200/80',
      action: () => onOpenAction('archive')
    },
    {
      id: 'building_app',
      title: 'Byggesøknad',
      subtitle: 'Veileder for tiltak uten ansvarsrett og nabovarsling',
      category: 'prosjekt',
      icon: <Building2 size={22} />,
      color: 'text-teal-600',
      bgColor: 'bg-teal-50 hover:bg-teal-100/80 border-teal-200/80',
      action: () => onOpenAction('building_app')
    },

    // 🛡️ Kategori 2: Kvalitet, KS & HMS
    {
      id: 'checklists',
      title: 'KS-Sjekklister',
      subtitle: 'Lovpålagte sjekklister tilpasset ditt fag',
      category: 'ks_hms',
      icon: <ClipboardCheck size={22} />,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50 hover:bg-amber-100/80 border-amber-200/80',
      action: () => onOpenAction('checklists')
    },
    {
      id: 'ai_vision',
      title: 'AI Bildekontroll (TEK17)',
      subtitle: 'Sjekk sluk, membran og kledning med AI på 5 sekunder',
      category: 'ks_hms',
      icon: <Camera size={22} />,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50 hover:bg-blue-100/80 border-blue-200/80',
      badge: 'AI Vision',
      action: () => onOpenAction('ai_vision')
    },
    {
      id: 'voice_sja',
      title: 'Tale til SJA (HMS)',
      subtitle: 'Sikker Jobb Analyse generert på 10 sekunder via tale',
      category: 'ks_hms',
      icon: <ShieldCheck size={22} />,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50 hover:bg-purple-100/80 border-purple-200/80',
      badge: 'Lovkrav',
      action: () => onOpenAction('voice_sja')
    },
    {
      id: 'deviations',
      title: 'Avvikshåndtering',
      subtitle: 'Registrer avvik med foto, årsak og korrigerende tiltak',
      category: 'ks_hms',
      icon: <AlertTriangle size={22} />,
      color: 'text-rose-600',
      bgColor: 'bg-rose-50 hover:bg-rose-100/80 border-rose-200/80',
      action: () => onOpenAction('deviations')
    },
    {
      id: 'lukkesperre',
      title: 'Lukkesperre (Pre-close)',
      subtitle: 'Hindrer lukking av vegger før rør, el og membran er godkjent',
      category: 'ks_hms',
      icon: <Lock size={22} />,
      color: 'text-red-600',
      bgColor: 'bg-red-50 hover:bg-red-100/80 border-red-200/80',
      badge: 'TEK17',
      action: () => onOpenAction('lukkesperre')
    },
    {
      id: 'hms_handbook',
      title: 'HMS & Stoffkartotek',
      subtitle: 'Internkontroll, vernerunder og sikkerhetsdatablader',
      category: 'ks_hms',
      icon: <BookOpen size={22} />,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50 hover:bg-emerald-100/80 border-emerald-200/80',
      action: () => onOpenAction('hms')
    },

    // 💰 Kategori 3: Økonomi, Tilbud & Kontrakt
    {
      id: 'change_orders',
      title: 'Endringsordrer (NS 8406)',
      subtitle: 'Sikre betaling for ekstraarbeid med digital kundesignering',
      category: 'okonomi',
      icon: <FileSignature size={22} />,
      color: 'text-rose-600',
      bgColor: 'bg-rose-50 hover:bg-rose-100/80 border-rose-200/80',
      badge: 'Penger sikret',
      action: () => onOpenAction('change_orders')
    },
    {
      id: 'offers',
      title: 'Tilbudskalkulator',
      subtitle: 'Send profesjonelle tilbud med digital godkjenning',
      category: 'okonomi',
      icon: <Calculator size={22} />,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50 hover:bg-blue-100/80 border-blue-200/80',
      action: () => onOpenAction('offer')
    },
    {
      id: 'contracts',
      title: 'Byggekontrakter',
      subtitle: 'Juridisk trygge avtaler iht. NS 8405/8406 og Håndverkertjenesteloven',
      category: 'okonomi',
      icon: <FileSpreadsheet size={22} />,
      color: 'text-violet-600',
      bgColor: 'bg-violet-50 hover:bg-violet-100/80 border-violet-200/80',
      action: () => onOpenAction('contract')
    },
    {
      id: 'time_tracking',
      title: 'Timeføring',
      subtitle: 'Før timer per prosjekt, oppgave og maskin',
      category: 'okonomi',
      icon: <Clock size={22} />,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50 hover:bg-emerald-100/80 border-emerald-200/80',
      action: () => onOpenAction('time')
    },
    {
      id: 'handover',
      title: 'Overtakelse & Sluttoppgjør',
      subtitle: 'Ferdigbefaring, mangelliste og digital signatur',
      category: 'okonomi',
      icon: <CheckCircle2 size={22} />,
      color: 'text-teal-600',
      bgColor: 'bg-teal-50 hover:bg-teal-100/80 border-teal-200/80',
      action: () => onOpenAction('handover')
    },

    // 🚗 Kategori 4: Ressurser, Bil & Felt
    {
      id: 'vehicle',
      title: 'Kjørebok & Bil',
      subtitle: 'Elektronisk kjørebok, bompenger og prosjektkobling',
      category: 'ressurser',
      icon: <Car size={22} />,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50 hover:bg-amber-100/80 border-amber-200/80',
      action: () => onOpenAction('vehicle')
    },
    {
      id: 'inventory',
      title: 'Verktøy & Maskinlager',
      subtitle: 'Ha full kontroll på hvem som har lånt verktøy og utstyr',
      category: 'ressurser',
      icon: <Package size={22} />,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50 hover:bg-orange-100/80 border-orange-200/80',
      action: () => onOpenAction('inventory')
    },
    {
      id: 'contacts',
      title: 'Telefonliste & Kolleger',
      subtitle: 'Ring, send SMS og finn nøkkelpersoner på byggeplassen',
      category: 'ressurser',
      icon: <Users size={22} />,
      color: 'text-cyan-600',
      bgColor: 'bg-cyan-50 hover:bg-cyan-100/80 border-cyan-200/80',
      action: () => onOpenAction('contacts')
    },
    {
      id: 'translator',
      title: 'Flerspråklig Oversetter',
      subtitle: 'Byggeplassoversetter (polsk, litauisk, engelsk, ukrainsk)',
      category: 'ressurser',
      icon: <Languages size={22} />,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50 hover:bg-blue-100/80 border-blue-200/80',
      action: () => onOpenAction('translator')
    },
    {
      id: 'apprentice',
      title: 'Lærlingmodul',
      subtitle: 'Kompetansemål, dokumentasjon og godkjenning for lærlinger',
      category: 'ressurser',
      icon: <GraduationCap size={22} />,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50 hover:bg-indigo-100/80 border-indigo-200/80',
      action: () => onOpenAction('apprentice')
    }
  ];

  const categories = [
    { id: 'all', label: 'Alle verktøy', count: modules.length },
    { id: 'prosjekt', label: '🏗️ Prosjekt & Bygg', count: modules.filter(m => m.category === 'prosjekt').length },
    { id: 'ks_hms', label: '🛡️ Kvalitet & HMS', count: modules.filter(m => m.category === 'ks_hms').length },
    { id: 'okonomi', label: '💰 Økonomi & Kontrakt', count: modules.filter(m => m.category === 'okonomi').length },
    { id: 'ressurser', label: '🚗 Ressurser & Felt', count: modules.filter(m => m.category === 'ressurser').length }
  ];

  const filtered = modules.filter(m => {
    const matchesSearch = !search || 
      m.title.toLowerCase().includes(search.toLowerCase()) || 
      m.subtitle.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || m.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-6 bg-navy-950/70 backdrop-blur-md animate-fadeIn">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="bg-white w-full max-w-5xl rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[92vh]"
      >
        {/* Header */}
        <div className="p-6 sm:p-8 bg-gradient-to-r from-navy-950 via-slate-900 to-navy-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-electric-500/20 text-electric-300 border border-electric-500/30">
                <Sparkles size={12} />
                <span>Verktøykasse</span>
              </span>
              <span className="text-xs text-slate-400 font-bold">{modules.length} moduler tilgjengelig</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Alle Moduler & Verktøy i VikingMester
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-1">
              Alt du trenger samlet på ett sted — klikk på et verktøy for å åpne det umiddelbart.
            </p>
          </div>

          <button
            onClick={onClose}
            className="self-end sm:self-center p-3 bg-white/10 hover:bg-white/20 text-white rounded-2xl transition-all cursor-pointer"
            title="Lukk"
          >
            <X size={20} />
          </button>
        </div>

        {/* Search & Category Filter Bar */}
        <div className="p-4 sm:p-6 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Søk i verktøy (f.eks. bil, kontrakt, sjekkliste)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-medium outline-none focus:ring-2 focus:ring-purple-500 transition-all shadow-inner"
            />
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer",
                  selectedCategory === cat.id
                    ? "bg-navy-900 text-white shadow-sm"
                    : "bg-white text-slate-600 hover:bg-slate-200/70 border border-slate-200/80"
                )}
              >
                {cat.label} ({cat.count})
              </button>
            ))}
          </div>
        </div>

        {/* Grid of Modules */}
        <div className="p-6 sm:p-8 overflow-y-auto flex-1">
          {filtered.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <p className="text-sm font-bold text-slate-600">Ingen moduler matcher søket ditt.</p>
              <button
                onClick={() => { setSearch(''); setSelectedCategory('all'); }}
                className="mt-3 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Tilbakestill filter
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((m) => (
                <div
                  key={m.id}
                  onClick={() => {
                    m.action();
                    onClose();
                  }}
                  className={cn(
                    "p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer group flex flex-col justify-between shadow-xs hover:shadow-md active:scale-[0.98]",
                    m.bgColor
                  )}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2.5">
                      <div className={cn("w-11 h-11 rounded-xl bg-white shadow-sm flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform", m.color)}>
                        {m.icon}
                      </div>
                      {m.badge && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-white/90 text-slate-800 border border-slate-200/80 shadow-2xs">
                          {m.badge}
                        </span>
                      )}
                    </div>
                    <h3 className="text-sm font-extrabold text-navy-900 group-hover:text-purple-700 transition-colors">
                      {m.title}
                    </h3>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed line-clamp-2">
                      {m.subtitle}
                    </p>
                  </div>

                  <div className="flex items-center justify-between text-xs font-bold text-slate-400 group-hover:text-purple-600 mt-4 pt-3 border-t border-slate-200/50">
                    <span>Åpne verktøy</span>
                    <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <span>💡 <strong>Tips:</strong> Du kan også trykke <strong>Søk</strong> øverst på skjermen eller bruke mikrofonen for å åpne verktøy med stemmen.</span>
          {isSuperAdmin && (
            <span className="text-rose-600 font-bold flex items-center gap-1">
              <Shield size={13} /> SuperAdmin-rettigheter aktiv
            </span>
          )}
        </div>
      </motion.div>
    </div>
  );
}
