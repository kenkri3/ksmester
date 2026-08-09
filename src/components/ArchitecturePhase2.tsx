import { motion } from 'motion/react';
import { 
  Eye, 
  Mic, 
  TrendingUp, 
  Zap, 
  AlertCircle,
  CheckCircle2,
  BrainCircuit,
  MessageSquare,
  Camera,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function ArchitecturePhase2() {
  const { t } = useTranslation();

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-16"
      >
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold uppercase tracking-wider mb-4">
          <BrainCircuit size={14} />
          {t('phase2_title')}
        </div>
        <h1 className="text-4xl lg:text-6xl font-bold tracking-tight mb-6">{t('phase2_hero_title')}</h1>
        <p className="text-neutral-500 max-w-2xl mx-auto">
          {t('phase2_hero_desc')}
        </p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-16">
        {/* Engine 1: Vision - Zero-Touch KS */}
        <div className="bg-white p-8 rounded-[2.5rem] border border-neutral-200 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
            <Camera size={80} />
          </div>
          <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600 mb-6">
            <Eye size={24} />
          </div>
          <h3 className="text-xl font-bold mb-4">{t('phase2_vision_title')}</h3>
          <p className="text-sm text-neutral-500 leading-relaxed mb-6">
            {t('phase2_vision_desc')}
          </p>
          <ul className="space-y-3 mb-8">
            <li className="flex items-center gap-2 text-xs font-medium">
              <CheckCircle2 size={14} className="text-emerald-500" />
              {t('phase2_vision_item1')}
            </li>
            <li className="flex items-center gap-2 text-xs font-medium">
              <CheckCircle2 size={14} className="text-emerald-500" />
              {t('phase2_vision_item2')}
            </li>
            <li className="flex items-center gap-2 text-xs font-medium">
              <CheckCircle2 size={14} className="text-emerald-500" />
              {t('phase2_vision_item3')}
            </li>
          </ul>
          <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100">
            <div className="text-[10px] font-black uppercase tracking-widest text-blue-700 mb-1">{t('phase2_vision_status_label')}</div>
            <div className="text-xs font-bold text-blue-900">{t('phase2_vision_status_value')}</div>
          </div>
        </div>

        {/* Engine 2: Voice - NLP & SJA */}
        <div className="bg-emerald-600 p-8 rounded-[2.5rem] text-white shadow-xl shadow-emerald-100 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
            <Mic size={80} />
          </div>
          <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center text-white mb-6">
            <MessageSquare size={24} />
          </div>
          <h3 className="text-xl font-bold mb-4">{t('phase2_voice_title')}</h3>
          <p className="text-sm text-emerald-100 leading-relaxed mb-6">
            {t('phase2_voice_desc')}
          </p>
          <ul className="space-y-3 mb-8">
            <li className="flex items-center gap-2 text-xs font-medium">
              <CheckCircle2 size={14} className="text-emerald-300" />
              {t('phase2_voice_item1')}
            </li>
            <li className="flex items-center gap-2 text-xs font-medium">
              <CheckCircle2 size={14} className="text-emerald-300" />
              {t('phase2_voice_item2')}
            </li>
            <li className="flex items-center gap-2 text-xs font-medium">
              <CheckCircle2 size={14} className="text-emerald-300" />
              {t('phase2_voice_item3')}
            </li>
          </ul>
          <div className="p-4 bg-white/10 rounded-2xl border border-white/20">
            <div className="text-[10px] font-black uppercase tracking-widest opacity-70 mb-1">{t('phase2_voice_status_label')}</div>
            <div className="text-xs font-bold">{t('phase2_voice_status_value')}</div>
          </div>
        </div>

        {/* Engine 3: Predictive - Risk & Profit */}
        <div className="bg-neutral-900 p-8 rounded-[2.5rem] text-white relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
            <TrendingUp size={80} />
          </div>
          <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-amber-400 mb-6">
            <TrendingUp size={24} />
          </div>
          <h3 className="text-xl font-bold mb-4">{t('phase2_predictive_title')}</h3>
          <p className="text-sm text-neutral-400 leading-relaxed mb-6">
            {t('phase2_predictive_desc')}
          </p>
          <ul className="space-y-3 mb-8">
            <li className="flex items-center gap-2 text-xs font-medium">
              <CheckCircle2 size={14} className="text-amber-400" />
              {t('phase2_predictive_item1')}
            </li>
            <li className="flex items-center gap-2 text-xs font-medium">
              <CheckCircle2 size={14} className="text-amber-400" />
              {t('phase2_predictive_item2')}
            </li>
            <li className="flex items-center gap-2 text-xs font-medium">
              <CheckCircle2 size={14} className="text-amber-400" />
              {t('phase2_predictive_item3')}
            </li>
          </ul>
          <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
            <div className="text-[10px] font-black uppercase tracking-widest opacity-50 mb-1">{t('phase2_predictive_status_label')}</div>
            <div className="text-xs font-bold">{t('phase2_predictive_status_value')}</div>
          </div>
        </div>
      </div>

      {/* The Edge: AR & Digital Twin Sync */}
      <div className="bg-white rounded-[3rem] border border-neutral-200 p-8 lg:p-12 shadow-sm">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-50 text-purple-700 text-[10px] font-black uppercase tracking-wider mb-6">
              {t('phase2_edge_badge')}
            </div>
            <h2 className="text-3xl font-bold mb-6">{t('phase2_edge_title')}</h2>
            <p className="text-neutral-500 text-sm leading-relaxed mb-8">
              {t('phase2_edge_desc')}
            </p>
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 bg-neutral-50 rounded-2xl border border-neutral-100">
                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                  <Zap size={20} className="text-purple-600" />
                </div>
                <div>
                  <div className="text-xs font-bold">{t('phase2_edge_bim_title')}</div>
                  <div className="text-[10px] text-neutral-400 uppercase tracking-widest">{t('phase2_edge_bim_subtitle')}</div>
                </div>
              </div>
              <div className="flex items-center gap-4 p-4 bg-neutral-50 rounded-2xl border border-neutral-100">
                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                  <AlertCircle size={20} className="text-red-500" />
                </div>
                <div>
                  <div className="text-xs font-bold">{t('phase2_edge_ruh_title')}</div>
                  <div className="text-[10px] text-neutral-400 uppercase tracking-widest">{t('phase2_edge_ruh_subtitle')}</div>
                </div>
              </div>
            </div>
          </div>
          <div className="relative aspect-square bg-neutral-100 rounded-[2.5rem] overflow-hidden flex items-center justify-center border border-neutral-200">
            <img 
              src="https://picsum.photos/seed/bim-model/800/800" 
              alt="BIM Model Sync" 
              className="w-full h-full object-cover opacity-40"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-64 h-64 border-2 border-purple-500/50 rounded-3xl relative">
                <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-purple-500 -translate-x-1 -translate-y-1"></div>
                <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-purple-500 translate-x-1 -translate-y-1"></div>
                <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-purple-500 -translate-x-1 translate-y-1"></div>
                <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-purple-500 translate-x-1 translate-y-1"></div>
                
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-[10px] font-black uppercase tracking-widest text-purple-600 bg-white/80 backdrop-blur-sm px-3 py-1 rounded-full">
                    {t('phase2_edge_scanning')}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
