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
  Shield,
  LayoutGrid,
  List
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
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

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
      subtitle: 'Ring, send e-post og finn nøkkelpersoner på byggeplassen',
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
    { id: 'all', label: 'Alle', fullLabel: 'Alle verktøy', count: modules.length },
    { id: 'prosjekt', label: '🏗️ Prosjekt', fullLabel: '🏗️ Prosjekt & Bygg', count: modules.filter(m => m.category === 'prosjekt').length },
    { id: 'ks_hms', label: '🛡️ KS & HMS', fullLabel: '🛡️ Kvalitet & HMS', count: modules.filter(m => m.category === 'ks_hms').length },
    { id: 'okonomi', label: '💰 Økonomi', fullLabel: '💰 Økonomi & Kontrakt', count: modules.filter(m => m.category === 'okonomi').length },
    { id: 'ressurser', label: '🚗 Ressurser', fullLabel: '🚗 Ressurser & Felt', count: modules.filter(m => m.category === 'ressurser').length }
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
    <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center p-0 sm:p-6 bg-navy-950/70 backdrop-blur-md animate-fadeIn">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        transition={{ duration: 0.2 }}
        className="bg-[#0B0F17] text-white w-full h-[100dvh] sm:h-auto sm:max-h-[90vh] sm:max-w-5xl rounded-none sm:rounded-[2.5rem] shadow-2xl overflow-hidden border-0 sm:border sm:border-slate-800 flex flex-col"
      >
        {/* Header */}
        <div className="px-4 py-3 sm:p-8 bg-[#131722] text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-4 min-w-0">
            <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-lg sm:rounded-2xl bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center justify-center shrink-0">
              <Sparkles size={16} className="sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-2xl font-black tracking-tight text-white truncate">
                  Moduler & Verktøy
                </h2>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 shrink-0">
                  {modules.length} moduler
                </span>
              </div>
              <p className="hidden sm:block text-xs sm:text-sm text-slate-400 mt-0.5">
                Alt du trenger samlet på ett sted — klikk på et verktøy for å åpne det umiddelbart.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 sm:p-3 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl sm:rounded-2xl transition-all cursor-pointer shrink-0 ml-2"
            title="Lukk"
          >
            <X size={18} className="sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* Search & Category Filter Bar */}
        <div className="px-3 py-2 sm:px-6 sm:py-4 bg-[#0D131F] border-b border-slate-800 flex flex-col sm:flex-row gap-2 sm:gap-3 items-stretch sm:items-center justify-between shrink-0">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="Søk i verktøy (f.eks. bil, kontrakt)..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-8 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm font-medium text-white placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 transition-all shadow-inner"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-0.5 rounded-full"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* View Mode Toggle (Grid / List) */}
            <div className="flex items-center bg-slate-900 p-0.5 rounded-xl shrink-0 border border-slate-800">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={cn(
                  "p-1.5 rounded-lg transition-all cursor-pointer",
                  viewMode === 'grid' ? "bg-purple-600 text-white shadow-xs font-bold" : "text-slate-400 hover:text-white"
                )}
                title="Rutenett"
              >
                <LayoutGrid size={15} />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={cn(
                  "p-1.5 rounded-lg transition-all cursor-pointer",
                  viewMode === 'list' ? "bg-purple-600 text-white shadow-xs font-bold" : "text-slate-400 hover:text-white"
                )}
                title="Kompakt liste"
              >
                <List size={15} />
              </button>
            </div>
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-0.5 sm:pb-0 no-scrollbar">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={cn(
                  "px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl text-[11px] sm:text-xs font-bold transition-all whitespace-nowrap cursor-pointer shrink-0",
                  selectedCategory === cat.id
                    ? "bg-purple-600 text-white shadow-xs"
                    : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800 hover:border-slate-700"
                )}
              >
                <span className="sm:hidden">{cat.label} ({cat.count})</span>
                <span className="hidden sm:inline">{cat.fullLabel} ({cat.count})</span>
              </button>
            ))}
          </div>
        </div>

        {/* Grid or List of Modules */}
        <div className="p-3 sm:p-8 overflow-y-auto flex-1 overscroll-contain bg-[#0B0F17] custom-scrollbar">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <p className="text-sm font-bold text-slate-300">Ingen moduler matcher søket ditt.</p>
              <button
                onClick={() => { setSearch(''); setSelectedCategory('all'); }}
                className="mt-3 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Tilbakestill filter
              </button>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-4">
              {filtered.map((m) => (
                <div
                  key={m.id}
                  onClick={() => {
                    m.action();
                    onClose();
                  }}
                  className="p-3 sm:p-5 rounded-2xl border border-slate-800 bg-[#131722] hover:bg-[#181f2f] hover:border-slate-700 transition-all cursor-pointer group flex flex-col justify-between shadow-2xs hover:shadow-md active:scale-[0.98]"
                >
                  <div>
                    <div className="flex items-start justify-between gap-1.5 mb-2 sm:mb-2.5">
                      <div className={cn("w-8 h-8 sm:w-11 sm:h-11 rounded-lg sm:rounded-xl bg-slate-950 border border-slate-800 shadow-2xs flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform", m.color)}>
                        {m.icon}
                      </div>
                      {m.badge && (
                        <span className="px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-wider bg-slate-800 text-slate-300 border border-slate-700 shadow-2xs shrink-0 truncate max-w-[70px] sm:max-w-none">
                          {m.badge}
                        </span>
                      )}
                    </div>
                    <h3 className="text-xs sm:text-sm font-extrabold text-white group-hover:text-purple-400 transition-colors line-clamp-1 sm:line-clamp-none">
                      {m.title}
                    </h3>
                    <p className="text-[10px] sm:text-xs text-slate-400 mt-0.5 sm:mt-1 leading-tight sm:leading-relaxed line-clamp-2">
                      {m.subtitle}
                    </p>
                  </div>

                  <div className="hidden sm:flex items-center justify-between text-xs font-bold text-slate-500 group-hover:text-purple-400 mt-4 pt-3 border-t border-slate-800/80">
                    <span>Åpne verktøy</span>
                    <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-1.5 sm:gap-2">
              {filtered.map((m) => (
                <div
                  key={m.id}
                  onClick={() => {
                    m.action();
                    onClose();
                  }}
                  className="flex items-center justify-between p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl border border-slate-800 bg-[#131722] hover:bg-[#181f2f] hover:border-slate-700 transition-all cursor-pointer group shadow-2xs hover:shadow-xs active:scale-[0.99]"
                >
                  <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
                    <div className={cn("w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-slate-950 border border-slate-800 shadow-2xs flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform", m.color)}>
                      {m.icon}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <h3 className="text-xs sm:text-sm font-extrabold text-white group-hover:text-purple-400 transition-colors truncate">
                          {m.title}
                        </h3>
                        {m.badge && (
                          <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-slate-800 text-slate-300 border border-slate-700 shrink-0">
                            {m.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] sm:text-xs text-slate-400 truncate">
                        {m.subtitle}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 text-slate-500 group-hover:text-purple-400 shrink-0 ml-2">
                    <span className="hidden sm:inline text-xs font-bold">Åpne</span>
                    <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer info (Desktop only) */}
        <div className="hidden sm:flex px-6 py-3.5 bg-[#131722] border-t border-slate-800 items-center justify-between gap-2 text-xs text-slate-400 shrink-0">
          <span>💡 <strong>Tips:</strong> Du kan også trykke <strong>Søk</strong> øverst på skjermen eller bruke mikrofonen for å åpne verktøy med stemmen.</span>
          {isSuperAdmin && (
            <span className="text-rose-400 font-bold flex items-center gap-1 shrink-0">
              <Shield size={13} /> SuperAdmin-rettigheter aktiv
            </span>
          )}
        </div>
      </motion.div>
    </div>
  );
}
