import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  GraduationCap, 
  CheckCircle2, 
  Clock, 
  BookOpen, 
  Camera, 
  MessageSquare, 
  ChevronRight,
  Star,
  Award,
  TrendingUp,
  FileText,
  Plus,
  Search
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/src/lib/utils';

interface KompetanseMaal {
  id: string;
  title: string;
  category: string;
  progress: number;
  status: 'not_started' | 'in_progress' | 'completed';
  lastUpdated?: string;
}

const KOMPETANSEMAAL: KompetanseMaal[] = [
  { id: '1', title: 'Planlegge, utføre og dokumentere arbeid i henhold til tegninger', category: 'Planlegging', progress: 85, status: 'in_progress', lastUpdated: '12.03.2024' },
  { id: '2', title: 'Bruke verktøy og maskiner på en sikker og hensiktsmessig måte', category: 'HMS', progress: 100, status: 'completed', lastUpdated: '05.02.2024' },
  { id: '3', title: 'Montere bærende konstruksjoner i tre', category: 'Konstruksjon', progress: 45, status: 'in_progress', lastUpdated: '20.03.2024' },
  { id: '4', title: 'Isolere og tette klimaskjerm', category: 'Konstruksjon', progress: 10, status: 'in_progress', lastUpdated: '18.03.2024' },
  { id: '5', title: 'Montere vinduer og dører', category: 'Montering', progress: 0, status: 'not_started' },
  { id: '6', title: 'Utføre innvendig kledning og listverk', category: 'Interiør', progress: 0, status: 'not_started' },
];

export default function ApprenticeModule() {
  const { t } = useTranslation();
  const [activeCategory, setActiveCategory] = useState<string>('Alle');
  const [searchQuery, setSearchQuery] = useState('');

  const categories = ['Alle', ...Array.from(new Set(KOMPETANSEMAAL.map(m => m.category)))];

  const filteredMaal = KOMPETANSEMAAL.filter(m => 
    (activeCategory === 'Alle' || m.category === activeCategory) &&
    (m.title.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const totalProgress = Math.round(KOMPETANSEMAAL.reduce((acc, curr) => acc + curr.progress, 0) / KOMPETANSEMAAL.length);

  return (
    <div className="space-y-8">
      {/* Apprentice Header Card */}
      <div className="bg-neutral-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl -mr-48 -mt-48" />
        <div className="relative z-10 flex flex-col md:flex-row gap-8 items-center">
          <div className="relative">
            <div className="w-32 h-32 rounded-full border-4 border-blue-500/30 p-1">
              <img 
                src="https://picsum.photos/seed/apprentice/200/200" 
                alt="Lærling" 
                className="w-full h-full rounded-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="absolute -bottom-2 -right-2 bg-blue-500 text-white p-2 rounded-xl shadow-lg">
              <GraduationCap size={20} />
            </div>
          </div>
          
          <div className="flex-1 text-center md:text-left">
            <div className="flex flex-col md:flex-row md:items-center gap-3 mb-2">
              <h2 className="text-3xl font-black tracking-tight">Erik Nordmann</h2>
              <span className="px-3 py-1 bg-blue-500/20 text-blue-400 text-[10px] font-black uppercase tracking-widest rounded-full border border-blue-500/30">
                2. Års Lærling • Tømrer
              </span>
            </div>
            <p className="text-neutral-400 mb-6 max-w-xl">
              Erik er i rute for svenneprøve i Oktober 2024. Han viser særlig styrke innen HMS og bruk av maskiner.
            </p>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div>
                <div className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1">Total Fremgang</div>
                <div className="flex items-center gap-3">
                  <div className="text-2xl font-bold">{totalProgress}%</div>
                  <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500" style={{ width: `${totalProgress}%` }} />
                  </div>
                </div>
              </div>
              <div>
                <div className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1">Fullførte Mål</div>
                <div className="text-2xl font-bold">12 / 48</div>
              </div>
              <div>
                <div className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1">Neste Vurdering</div>
                <div className="text-2xl font-bold">15. April</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Competency Goals List */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h3 className="text-xl font-bold tracking-tight">Kompetansemål</h3>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input 
                  type="text" 
                  placeholder="Søk i mål..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 bg-white border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={cn(
                  "px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all",
                  activeCategory === cat 
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-100" 
                    : "bg-white text-neutral-500 border border-neutral-200 hover:bg-neutral-50"
                )}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="space-y-4">
            {filteredMaal.map((m) => (
              <motion.div 
                layout
                key={m.id}
                className="bg-white p-6 rounded-3xl border border-neutral-200 shadow-sm hover:border-blue-200 transition-all group cursor-pointer"
              >
                <div className="flex justify-between items-start gap-4 mb-4">
                  <div className="flex gap-4">
                    <div className={cn(
                      "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0",
                      m.status === 'completed' ? "bg-emerald-50 text-emerald-600" : 
                      m.status === 'in_progress' ? "bg-blue-50 text-blue-600" : "bg-neutral-50 text-neutral-400"
                    )}>
                      {m.status === 'completed' ? <Award size={24} /> : <BookOpen size={24} />}
                    </div>
                    <div>
                      <div className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-1">{m.category}</div>
                      <h4 className="font-bold group-hover:text-blue-600 transition-colors">{m.title}</h4>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-black text-neutral-900">{m.progress}%</div>
                    <div className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest">Fremgang</div>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="flex-1 h-2 bg-neutral-100 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${m.progress}%` }}
                      className={cn(
                        "h-full rounded-full",
                        m.status === 'completed' ? "bg-emerald-500" : "bg-blue-500"
                      )}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="p-2 bg-neutral-50 text-neutral-400 hover:text-blue-600 rounded-lg transition-colors">
                      <Camera size={16} />
                    </button>
                    <button className="p-2 bg-neutral-50 text-neutral-400 hover:text-blue-600 rounded-lg transition-colors">
                      <MessageSquare size={16} />
                    </button>
                    <ChevronRight size={16} className="text-neutral-300" />
                  </div>
                </div>
                
                {m.lastUpdated && (
                  <div className="mt-4 pt-4 border-t border-neutral-50 flex items-center gap-2 text-[10px] text-neutral-400 font-bold uppercase tracking-widest">
                    <Clock size={12} /> Sist dokumentert: {m.lastUpdated}
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>

        {/* Sidebar: Log & Feedback */}
        <div className="space-y-8">
          <div className="bg-white p-8 rounded-[2.5rem] border border-neutral-200 shadow-sm">
            <h3 className="font-bold mb-6 flex items-center justify-between">
              Siste Loggføringer
              <button className="p-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-colors">
                <Plus size={16} />
              </button>
            </h3>
            <div className="space-y-6">
              {[
                { title: 'Montering av takstoler', date: 'I dag, 09:15', project: 'Bjørklund', type: 'Bilde' },
                { title: 'SJA for arbeid i høyden', date: 'I går, 14:30', project: 'Bjørklund', type: 'Dokument' },
                { title: 'Bruk av kappsag', date: '20. Mars', project: 'Verksted', type: 'Video' },
              ].map((log, i) => (
                <div key={i} className="flex gap-4 group cursor-pointer">
                  <div className="w-10 h-10 bg-neutral-50 rounded-xl flex items-center justify-center text-neutral-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                    <FileText size={18} />
                  </div>
                  <div>
                    <div className="text-sm font-bold">{log.title}</div>
                    <div className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest">{log.date} • {log.project}</div>
                  </div>
                </div>
              ))}
            </div>
            <button className="w-full mt-8 py-3 bg-neutral-50 text-neutral-500 rounded-2xl text-xs font-bold hover:bg-neutral-100 transition-colors">
              Se alle loggføringer
            </button>
          </div>

          <div className="bg-emerald-50 p-8 rounded-[2.5rem] border border-emerald-100">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-white rounded-xl text-emerald-600 shadow-sm">
                <Star size={20} />
              </div>
              <h3 className="font-bold text-emerald-900">Veilederens Vurdering</h3>
            </div>
            <p className="text-sm text-emerald-800 leading-relaxed mb-6">
              "Erik viser god forståelse for sikkerhet. Han må jobbe mer med nøyaktighet på listverk, men konstruksjonsmessig er han veldig sterk."
            </p>
            <div className="flex items-center gap-3">
              <img 
                src="https://picsum.photos/seed/supervisor/100/100" 
                alt="Veileder" 
                className="w-10 h-10 rounded-full object-cover"
                referrerPolicy="no-referrer"
              />
              <div>
                <div className="text-xs font-bold text-emerald-900">Morten Mester</div>
                <div className="text-[10px] text-emerald-600 font-bold uppercase tracking-widest">Faglig leder</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
