import { motion } from 'motion/react';
import { 
  Share2, 
  RefreshCw, 
  FileCheck, 
  Building2, 
  Truck, 
  CreditCard, 
  Globe, 
  ShieldCheck,
  ArrowRightLeft,
  Box,
  FileText,
  Users
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { useTranslation } from 'react-i18next';

export default function ArchitecturePhase3() {
  const { t } = useTranslation();

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-16"
      >
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold uppercase tracking-wider mb-4">
          <Share2 size={14} />
          {t('phase3_title')}
        </div>
        <h1 className="text-4xl lg:text-6xl font-bold tracking-tight mb-6">{t('phase3_hero_title')}</h1>
        <p className="text-neutral-500 max-w-2xl mx-auto">
          {t('phase3_hero_desc')}
        </p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-16">
        {/* Auto-FDV: Material Brain */}
        <div className="bg-white p-8 rounded-[3rem] border border-neutral-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600">
              <Box size={24} />
            </div>
            <div>
              <h3 className="text-xl font-bold">{t('phase3_fdv_title')}</h3>
              <p className="text-xs text-neutral-400 uppercase tracking-widest font-black">{t('phase3_fdv_subtitle')}</p>
            </div>
          </div>
          
          <div className="space-y-4 mb-8">
            <div className="p-4 bg-neutral-50 rounded-2xl border border-neutral-100 flex items-start gap-4">
              <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm shrink-0">
                <RefreshCw size={16} className="text-blue-500" />
              </div>
              <p className="text-xs text-neutral-600 leading-relaxed">
                <strong>{t('phase3_fdv_harvesting_title')}</strong> {t('phase3_fdv_harvesting_desc')}
              </p>
            </div>
            <div className="p-4 bg-neutral-50 rounded-2xl border border-neutral-100 flex items-start gap-4">
              <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm shrink-0">
                <ShieldCheck size={16} className="text-emerald-500" />
              </div>
              <p className="text-xs text-neutral-600 leading-relaxed">
                <strong>{t('phase3_fdv_compliance_title')}</strong> {t('phase3_fdv_compliance_desc')}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-blue-50 rounded-2xl border border-blue-100">
            <div className="flex gap-2">
              <div className="px-2 py-1 bg-white rounded text-[10px] font-bold text-blue-700">{t('phase3_fdv_api_badge')}</div>
              <div className="px-2 py-1 bg-white rounded text-[10px] font-bold text-blue-700">{t('phase3_fdv_gtin_badge')}</div>
            </div>
            <div className="text-[10px] font-black text-blue-400 uppercase tracking-widest">{t('phase3_fdv_status')}</div>
          </div>
        </div>

        {/* Compliance & Law Automation */}
        <div className="bg-neutral-900 p-8 rounded-[3rem] text-white shadow-xl relative overflow-hidden">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-emerald-400">
              <FileCheck size={24} />
            </div>
            <div>
              <h3 className="text-xl font-bold">{t('phase3_legal_title')}</h3>
              <p className="text-xs text-neutral-500 uppercase tracking-widest font-black">{t('phase3_legal_subtitle')}</p>
            </div>
          </div>

          <div className="space-y-4 mb-8">
            <div className="p-4 bg-white/5 rounded-2xl border border-white/10 flex items-start gap-4">
              <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center shrink-0">
                <Globe size={16} className="text-emerald-400" />
              </div>
              <p className="text-xs text-neutral-400 leading-relaxed">
                <strong>{t('phase3_legal_scanning_title')}</strong> {t('phase3_legal_scanning_desc')}
              </p>
            </div>
            <div className="p-4 bg-white/5 rounded-2xl border border-white/10 flex items-start gap-4">
              <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center shrink-0">
                <Users size={16} className="text-blue-400" />
              </div>
              <p className="text-xs text-neutral-400 leading-relaxed">
                <strong>{t('phase3_legal_crew_title')}</strong> {t('phase3_legal_crew_desc')}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10 border-dashed">
            <span className="text-[10px] font-black uppercase tracking-widest opacity-50">{t('phase3_legal_last_update')}</span>
            <div className="flex gap-1">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
              <span className="text-[10px] font-bold text-emerald-400">{t('phase3_legal_monitoring')}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Integration Map */}
      <div className="bg-white rounded-[3rem] border border-neutral-200 p-8 lg:p-12 shadow-sm mb-16">
        <h2 className="text-2xl font-bold mb-12 text-center">{t('phase3_ecosystem_title')}</h2>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {[
            { icon: <Building2 />, title: t('phase3_ecosystem_item1_title'), desc: t('phase3_ecosystem_item1_desc') },
            { icon: <CreditCard />, title: t('phase3_ecosystem_item2_title'), desc: t('phase3_ecosystem_item2_desc') },
            { icon: <Truck />, title: t('phase3_ecosystem_item3_title'), desc: t('phase3_ecosystem_item3_desc') },
            { icon: <ArrowRightLeft />, title: t('phase3_ecosystem_item4_title'), desc: t('phase3_ecosystem_item4_desc') }
          ].map((item, i) => (
            <div key={i} className="text-center space-y-4 group">
              <div className="w-16 h-16 bg-neutral-50 rounded-3xl flex items-center justify-center mx-auto text-neutral-400 group-hover:bg-emerald-600 group-hover:text-white transition-all duration-500 shadow-sm">
                {item.icon}
              </div>
              <h4 className="font-bold text-sm">{item.title}</h4>
              <p className="text-[10px] text-neutral-400 leading-relaxed px-4">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Customer Portal 2.0 */}
      <div className="bg-emerald-600 rounded-[3rem] p-8 lg:p-12 text-white shadow-2xl shadow-emerald-100">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-white text-[10px] font-black uppercase tracking-wider mb-6">
            {t('phase3_portal_badge')}
          </div>
          <h2 className="text-3xl font-bold mb-6">{t('phase3_portal_title')}</h2>
          <p className="text-emerald-100 text-sm leading-relaxed mb-12">
            {t('phase3_portal_desc')}
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <div className="px-6 py-3 bg-white text-emerald-600 rounded-2xl font-bold text-sm shadow-lg">{t('phase3_portal_cta1')}</div>
            <div className="px-6 py-3 bg-emerald-700 text-white rounded-2xl font-bold text-sm border border-emerald-500">{t('phase3_portal_cta2')}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
