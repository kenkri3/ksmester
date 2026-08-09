import { motion } from 'motion/react';
import { 
  Rocket, 
  ShieldAlert, 
  WifiOff, 
  Repeat, 
  Lock, 
  Database, 
  Cpu, 
  Users,
  HardHat,
  BarChart,
  Target,
  Zap
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { useTranslation } from 'react-i18next';

export default function ArchitecturePhase4() {
  const { t } = useTranslation();

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-16"
      >
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold uppercase tracking-wider mb-4">
          <Rocket size={14} />
          {t('phase4_title')}
        </div>
        <h1 className="text-4xl lg:text-6xl font-bold tracking-tight mb-6">{t('phase4_hero_title')}</h1>
        <p className="text-neutral-500 max-w-2xl mx-auto">
          {t('phase4_hero_desc')}
        </p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-16">
        {/* Edge Computing & Offline Mode */}
        <div className="bg-white p-8 rounded-[3rem] border border-neutral-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center text-amber-600">
              <WifiOff size={24} />
            </div>
            <div>
              <h3 className="text-xl font-bold">{t('phase4_edge_title')}</h3>
              <p className="text-xs text-neutral-400 uppercase tracking-widest font-black">{t('phase4_edge_subtitle')}</p>
            </div>
          </div>
          
          <div className="space-y-4 mb-8">
            <div className="p-4 bg-neutral-50 rounded-2xl border border-neutral-100 flex items-start gap-4">
              <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm shrink-0">
                <Cpu size={16} className="text-amber-500" />
              </div>
              <p className="text-xs text-neutral-600 leading-relaxed">
                <strong>{t('phase4_edge_local_title')}:</strong> {t('phase4_edge_local_desc')}
              </p>
            </div>
            <div className="p-4 bg-neutral-50 rounded-2xl border border-neutral-100 flex items-start gap-4">
              <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm shrink-0">
                <Repeat size={16} className="text-blue-500" />
              </div>
              <p className="text-xs text-neutral-600 leading-relaxed">
                <strong>{t('phase4_edge_sync_title')}:</strong> {t('phase4_edge_sync_desc')}
              </p>
            </div>
          </div>
        </div>

        {/* Security & GDPR */}
        <div className="bg-neutral-900 p-8 rounded-[3rem] text-white shadow-xl relative overflow-hidden">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-emerald-400">
              <Lock size={24} />
            </div>
            <div>
              <h3 className="text-xl font-bold">{t('phase4_privacy_title')}</h3>
              <p className="text-xs text-neutral-500 uppercase tracking-widest font-black">{t('phase4_privacy_subtitle')}</p>
            </div>
          </div>

          <div className="space-y-4 mb-8">
            <div className="p-4 bg-white/5 rounded-2xl border border-white/10 flex items-start gap-4">
              <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center shrink-0">
                <ShieldAlert size={16} className="text-emerald-400" />
              </div>
              <p className="text-xs text-neutral-400 leading-relaxed">
                <strong>{t('phase4_privacy_anon_title')}:</strong> {t('phase4_privacy_anon_desc')}
              </p>
            </div>
            <div className="p-4 bg-white/5 rounded-2xl border border-white/10 flex items-start gap-4">
              <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center shrink-0">
                <Database size={16} className="text-blue-400" />
              </div>
              <p className="text-xs text-neutral-400 leading-relaxed">
                <strong>{t('phase4_privacy_sovereignty_title')}:</strong> {t('phase4_privacy_sovereignty_desc')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* The Feedback Loop: RLHF */}
      <div className="bg-white rounded-[3rem] border border-neutral-200 p-8 lg:p-12 shadow-sm mb-16">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase tracking-wider mb-6">
            {t('phase4_rlhf_badge')}
          </div>
          <h2 className="text-3xl font-bold mb-6">{t('phase4_rlhf_title')}</h2>
          <p className="text-neutral-500 text-sm leading-relaxed mb-12">
            {t('phase4_rlhf_desc')}
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="space-y-2">
              <div className="text-2xl font-bold text-emerald-600">99.8%</div>
              <div className="text-[10px] font-black uppercase tracking-widest text-neutral-400">{t('phase4_stat_precision')}</div>
            </div>
            <div className="space-y-2">
              <div className="text-2xl font-bold text-emerald-600">-85%</div>
              <div className="text-[10px] font-black uppercase tracking-widest text-neutral-400">{t('phase4_stat_reduction')}</div>
            </div>
            <div className="space-y-2">
              <div className="text-2xl font-bold text-emerald-600">0</div>
              <div className="text-[10px] font-black uppercase tracking-widest text-neutral-400">{t('phase4_stat_accidents')}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Roadmap Visualization */}
      <div className="bg-neutral-900 rounded-[3rem] p-8 lg:p-12 text-white">
        <h2 className="text-2xl font-bold mb-12 flex items-center gap-3">
          <Target size={24} className="text-emerald-400" />
          {t('phase4_roadmap_title')}
        </h2>
        
        <div className="relative space-y-12 before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-neutral-700 before:to-transparent">
          {[
            { 
              phase: t('phase4_roadmap_step1_title'), 
              desc: t('phase4_roadmap_step1_desc'),
              icon: <HardHat size={16} />
            },
            { 
              phase: t('phase4_roadmap_step2_title'), 
              desc: t('phase4_roadmap_step2_desc'),
              icon: <Zap size={16} />
            },
            { 
              phase: t('phase4_roadmap_step3_title'), 
              desc: t('phase4_roadmap_step3_desc'),
              icon: <BarChart size={16} />
            }
          ].map((step, i) => (
            <div key={i} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
              <div className="flex items-center justify-center w-10 h-10 rounded-full border border-neutral-700 bg-neutral-900 text-emerald-400 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                {step.icon}
              </div>
              <div className="w-[calc(100%-4rem)] md:w-[45%] p-6 rounded-2xl bg-white/5 border border-white/10">
                <h4 className="font-bold mb-2 text-emerald-400">{step.phase}</h4>
                <p className="text-xs text-neutral-400 leading-relaxed">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
