import { motion } from 'motion/react';
import { 
  TrendingUp, 
  Coins, 
  Award, 
  Glasses, 
  Bot, 
  Sparkles, 
  BarChart3, 
  Clock,
  Zap,
  ShieldCheck,
  ArrowUpRight,
  Lightbulb
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { useTranslation } from 'react-i18next';

export default function ArchitecturePhase5() {
  const { t } = useTranslation();

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-16"
      >
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-bold uppercase tracking-wider mb-4">
          <Sparkles size={14} />
          {t('phase5_title')}
        </div>
        <h1 className="text-4xl lg:text-6xl font-bold tracking-tight mb-6">{t('phase5_hero_title')}</h1>
        <p className="text-neutral-500 max-w-2xl mx-auto">
          {t('phase5_hero_desc')}
        </p>
      </motion.div>

      {/* ROI & Economic Impact */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-16">
        <div className="bg-white p-8 rounded-[3rem] border border-neutral-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-600">
              <Coins size={24} />
            </div>
            <div>
              <h3 className="text-xl font-bold">{t('phase5_roi_title')}</h3>
              <p className="text-xs text-neutral-400 uppercase tracking-widest font-black">{t('phase5_roi_subtitle')}</p>
            </div>
          </div>
          
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-neutral-50 rounded-2xl border border-neutral-100">
              <div className="flex items-center gap-3">
                <Clock className="text-blue-500" size={20} />
                <span className="text-sm font-medium">{t('phase5_roi_admin_time')}</span>
              </div>
              <span className="text-lg font-bold text-emerald-600">-12t / uke</span>
            </div>
            <div className="flex items-center justify-between p-4 bg-neutral-50 rounded-2xl border border-neutral-100">
              <div className="flex items-center gap-3">
                <ShieldCheck className="text-emerald-500" size={20} />
                <span className="text-sm font-medium">{t('phase5_roi_claims')}</span>
              </div>
              <span className="text-lg font-bold text-emerald-600">-45%</span>
            </div>
            <div className="flex items-center justify-between p-4 bg-neutral-50 rounded-2xl border border-neutral-100">
              <div className="flex items-center gap-3">
                <TrendingUp className="text-amber-500" size={20} />
                <span className="text-sm font-medium">{t('phase5_roi_margin')}</span>
              </div>
              <span className="text-lg font-bold text-emerald-600">+8%</span>
            </div>
          </div>
        </div>

        <div className="bg-neutral-900 p-8 rounded-[3rem] text-white shadow-xl relative overflow-hidden">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-blue-400">
              <Award size={24} />
            </div>
            <div>
              <h3 className="text-xl font-bold">{t('phase5_market_title')}</h3>
              <p className="text-xs text-neutral-500 uppercase tracking-widest font-black">{t('phase5_market_subtitle')}</p>
            </div>
          </div>
          <p className="text-sm text-neutral-400 leading-relaxed mb-8">
            {t('phase5_market_desc')}
          </p>
          <div className="p-6 bg-white/5 rounded-2xl border border-white/10 border-dashed text-center">
            <div className="text-xs font-bold text-blue-400 mb-2">{t('phase5_market_badge')}</div>
            <div className="text-[10px] text-neutral-500 uppercase tracking-widest">{t('phase5_market_guarantee')}</div>
          </div>
        </div>
      </div>

      {/* The Future Vision (2027+) */}
      <div className="bg-white rounded-[3rem] border border-neutral-200 p-8 lg:p-12 shadow-sm mb-16">
        <h2 className="text-3xl font-bold mb-12 text-center">{t('phase5_future_title')}</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <div className="space-y-6">
            <div className="flex items-start gap-4 p-6 bg-neutral-50 rounded-[2rem] border border-neutral-100 hover:border-blue-500/30 transition-colors">
              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm shrink-0">
                <Glasses size={24} className="text-blue-600" />
              </div>
              <div>
                <h4 className="font-bold mb-2">{t('phase5_future_ar_title')}</h4>
                <p className="text-xs text-neutral-500 leading-relaxed">
                  {t('phase5_future_ar_desc')}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4 p-6 bg-neutral-50 rounded-[2rem] border border-neutral-100 hover:border-emerald-500/30 transition-colors">
              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm shrink-0">
                <Bot size={24} className="text-emerald-600" />
              </div>
              <div>
                <h4 className="font-bold mb-2">{t('phase5_future_robots_title')}</h4>
                <p className="text-xs text-neutral-500 leading-relaxed">
                  {t('phase5_future_robots_desc')}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="flex items-start gap-4 p-6 bg-neutral-50 rounded-[2rem] border border-neutral-100 hover:border-amber-500/30 transition-colors">
              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm shrink-0">
                <Lightbulb size={24} className="text-amber-600" />
              </div>
              <div>
                <h4 className="font-bold mb-2">{t('phase5_future_design_title')}</h4>
                <p className="text-xs text-neutral-500 leading-relaxed">
                  {t('phase5_future_design_desc')}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4 p-6 bg-neutral-50 rounded-[2rem] border border-neutral-100 hover:border-purple-500/30 transition-colors">
              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm shrink-0">
                <Zap size={24} className="text-purple-600" />
              </div>
              <div>
                <h4 className="font-bold mb-2">{t('phase5_future_energy_title')}</h4>
                <p className="text-xs text-neutral-500 leading-relaxed">
                  {t('phase5_future_energy_desc')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Final Call to Action */}
      <div className="bg-emerald-600 rounded-[3rem] p-12 text-white text-center shadow-2xl shadow-emerald-100 overflow-hidden relative">
        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
          <div className="absolute top-0 left-0 w-64 h-64 bg-white rounded-full -ml-32 -mt-32 blur-3xl"></div>
          <div className="absolute bottom-0 right-0 w-64 h-64 bg-white rounded-full -mr-32 -mb-32 blur-3xl"></div>
        </div>
        <div className="relative z-10">
          <h2 className="text-4xl font-bold mb-6">{t('phase5_cta_title')}</h2>
          <p className="text-emerald-100 max-w-2xl mx-auto mb-12">
            {t('phase5_cta_desc')}
          </p>
          <div className="flex flex-wrap justify-center gap-6">
            <button className="px-8 py-4 bg-white text-emerald-600 rounded-2xl font-bold text-lg shadow-xl hover:scale-105 transition-transform flex items-center gap-2">
              {t('phase5_cta_button1')} <ArrowUpRight size={20} />
            </button>
            <button className="px-8 py-4 bg-emerald-700 text-white rounded-2xl font-bold text-lg border border-emerald-500 hover:bg-emerald-800 transition-colors">
              {t('phase5_cta_button2')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
