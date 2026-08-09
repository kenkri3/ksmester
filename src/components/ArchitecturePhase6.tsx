import { motion } from 'motion/react';
import { 
  Flag, 
  CheckCircle2, 
  ArrowRight, 
  Play, 
  Settings, 
  Code2, 
  Layers, 
  Zap,
  ShieldCheck,
  MessageSquare,
  Smartphone,
  LayoutDashboard
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { useTranslation } from 'react-i18next';

export default function ArchitecturePhase6() {
  const { t } = useTranslation();

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-16"
      >
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neutral-900 text-white text-xs font-bold uppercase tracking-wider mb-4">
          <Flag size={14} />
          {t('phase6_title')}
        </div>
        <h1 className="text-4xl lg:text-6xl font-bold tracking-tight mb-6">{t('phase6_hero_title')}</h1>
        <p className="text-neutral-500 max-w-2xl mx-auto">
          {t('phase6_hero_desc')}
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
        {/* Step 1: Core Infrastructure */}
        <div className="bg-white p-8 rounded-[2.5rem] border border-neutral-200 shadow-sm relative overflow-hidden">
          <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600 mb-6 font-bold">1</div>
          <h3 className="text-xl font-bold mb-4">{t('phase6_step1_title')}</h3>
          <p className="text-sm text-neutral-500 leading-relaxed mb-6">
            {t('phase6_step1_desc')}
          </p>
          <ul className="space-y-3 text-xs font-medium text-neutral-600">
            <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-500" /> {t('phase6_step1_item1')}</li>
            <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-500" /> {t('phase6_step1_item2')}</li>
            <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-500" /> {t('phase6_step1_item3')}</li>
          </ul>
        </div>

        {/* Step 2: Specialized Modules */}
        <div className="bg-white p-8 rounded-[2.5rem] border border-neutral-200 shadow-sm relative overflow-hidden">
          <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-600 mb-6 font-bold">2</div>
          <h3 className="text-xl font-bold mb-4">{t('phase6_step2_title')}</h3>
          <p className="text-sm text-neutral-500 leading-relaxed mb-6">
            {t('phase6_step2_desc')}
          </p>
          <ul className="space-y-3 text-xs font-medium text-neutral-600">
            <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-500" /> {t('phase6_step2_item1')}</li>
            <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-500" /> {t('phase6_step2_item2')}</li>
            <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-500" /> {t('phase6_step2_item3')}</li>
          </ul>
        </div>

        {/* Step 3: Integration & Launch */}
        <div className="bg-white p-8 rounded-[2.5rem] border border-neutral-200 shadow-sm relative overflow-hidden">
          <div className="w-12 h-12 bg-purple-100 rounded-2xl flex items-center justify-center text-purple-600 mb-6 font-bold">3</div>
          <h3 className="text-xl font-bold mb-4">{t('phase6_step3_title')}</h3>
          <p className="text-sm text-neutral-500 leading-relaxed mb-6">
            {t('phase6_step3_desc')}
          </p>
          <ul className="space-y-3 text-xs font-medium text-neutral-600">
            <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-500" /> {t('phase6_step3_item1')}</li>
            <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-500" /> {t('phase6_step3_item2')}</li>
            <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-500" /> {t('phase6_step3_item3')}</li>
          </ul>
        </div>

        {/* Step 4: Craft-Specific Adaptation */}
        <div className="bg-white p-8 rounded-[2.5rem] border border-neutral-200 shadow-sm relative overflow-hidden">
          <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center text-amber-600 mb-6 font-bold">4</div>
          <h3 className="text-xl font-bold mb-4">{t('phase6_step4_title')}</h3>
          <p className="text-sm text-neutral-500 leading-relaxed mb-6">
            {t('phase6_step4_desc')}
          </p>
          <ul className="space-y-3 text-xs font-medium text-neutral-600">
            <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-500" /> {t('phase6_step4_item1')}</li>
            <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-500" /> {t('phase6_step4_item2')}</li>
            <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-500" /> {t('phase6_step4_item3')}</li>
          </ul>
        </div>
      </div>

      {/* Interactive Prototype Selection */}
      <div className="bg-neutral-900 rounded-[3rem] p-8 lg:p-12 text-white mb-16">
        <h2 className="text-2xl font-bold mb-8 text-center">{t('phase6_build_first_title')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { icon: <LayoutDashboard />, title: t('phase6_build_item1_title'), desc: t('phase6_build_item1_desc') },
            { icon: <Smartphone />, title: t('phase6_build_item2_title'), desc: t('phase6_build_item2_desc') },
            { icon: <MessageSquare />, title: t('phase6_build_item3_title'), desc: t('phase6_build_item3_desc') },
            { icon: <ShieldCheck />, title: t('phase6_build_item4_title'), desc: t('phase6_build_item4_desc') }
          ].map((item, i) => (
            <button key={i} className="p-6 bg-white/5 border border-white/10 rounded-3xl text-left hover:bg-white/10 hover:border-emerald-500/50 transition-all group">
              <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center mb-4 text-emerald-400 group-hover:scale-110 transition-transform">
                {item.icon}
              </div>
              <h4 className="font-bold text-sm mb-2">{item.title}</h4>
              <p className="text-[10px] text-neutral-400 leading-relaxed">{item.desc}</p>
              <div className="mt-4 flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity">
                {t('phase6_select')} <ArrowRight size={10} />
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Final Summary Statement */}
      <div className="max-w-3xl mx-auto text-center">
        <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-8 text-emerald-600">
          <Play size={32} fill="currentColor" />
        </div>
        <h2 className="text-3xl font-bold mb-6">{t('phase6_ready_title')}</h2>
        <p className="text-neutral-500 text-sm leading-relaxed mb-12">
          {t('phase6_ready_desc')}
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <div className="flex items-center gap-2 px-4 py-2 bg-neutral-100 rounded-full text-xs font-bold text-neutral-600">
            <Code2 size={14} />
            {t('phase6_stack')}
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-neutral-100 rounded-full text-xs font-bold text-neutral-600">
            <Layers size={14} />
            {t('phase6_architecture')}
          </div>
        </div>
      </div>
    </div>
  );
}
