import { motion } from 'motion/react';
import { 
  Server, 
  Database, 
  Cpu, 
  Globe, 
  Smartphone, 
  Zap, 
  Shield, 
  Layers,
  Network,
  GitBranch,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function ArchitecturePhase1() {
  const { t } = useTranslation();

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-16"
      >
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold uppercase tracking-wider mb-4">
          <Cpu size={14} />
          {t('phase1_title')}
        </div>
        <h1 className="text-4xl lg:text-6xl font-bold tracking-tight mb-6">{t('phase1_hero_title')}</h1>
        <p className="text-neutral-500 max-w-2xl mx-auto">
          {t('phase1_hero_desc')}
        </p>
      </motion.div>

      {/* Architecture Diagram - Recipe 1: Technical Dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-16">
        {/* Layer 1: Data Sources & Ingestion */}
        <div className="space-y-6">
          <h3 className="text-sm font-black uppercase tracking-widest text-neutral-400 flex items-center gap-2">
            <Layers size={16} /> {t('phase1_ingestion_title')}
          </h3>
          <div className="bg-white p-6 rounded-3xl border border-neutral-200 shadow-sm space-y-4">
            <div className="flex items-center gap-3 p-3 bg-neutral-50 rounded-xl border border-neutral-100">
              <Smartphone size={18} className="text-blue-500" />
              <span className="text-sm font-bold">{t('phase1_ingestion_item1')}</span>
            </div>
            <div className="flex items-center gap-3 p-3 bg-neutral-50 rounded-xl border border-neutral-100">
              <Zap size={18} className="text-amber-500" />
              <span className="text-sm font-bold">{t('phase1_ingestion_item2')}</span>
            </div>
            <div className="flex items-center gap-3 p-3 bg-neutral-50 rounded-xl border border-neutral-100">
              <Globe size={18} className="text-emerald-500" />
              <span className="text-sm font-bold">{t('phase1_ingestion_item3')}</span>
            </div>
          </div>
        </div>

        {/* Layer 2: AI Orchestration (The Brain) */}
        <div className="space-y-6">
          <h3 className="text-sm font-black uppercase tracking-widest text-emerald-600 flex items-center gap-2">
            <Cpu size={16} /> {t('phase1_orchestration_title')}
          </h3>
          <div className="bg-emerald-600 p-8 rounded-[3rem] text-white shadow-2xl shadow-emerald-100 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-3xl"></div>
            <div className="relative z-10 space-y-6">
              <div className="flex items-center gap-3">
                <Zap size={24} className="text-amber-300" />
                <span className="text-lg font-bold">{t('phase1_orchestration_core')}</span>
              </div>
              <div className="space-y-3">
                <div className="p-3 bg-white/10 rounded-xl border border-white/20 text-xs font-medium">
                  {t('phase1_orchestration_vision')}
                </div>
                <div className="p-3 bg-white/10 rounded-xl border border-white/20 text-xs font-medium">
                  {t('phase1_orchestration_nlp')}
                </div>
                <div className="p-3 bg-white/10 rounded-xl border border-white/20 text-xs font-medium">
                  {t('phase1_orchestration_predictive')}
                </div>
              </div>
              <div className="pt-4 border-t border-white/20">
                <div className="text-[10px] font-black uppercase tracking-widest opacity-70 mb-2">{t('phase1_orchestration_realtime')}</div>
                <div className="flex gap-2">
                  <div className="w-2 h-2 bg-emerald-300 rounded-full animate-pulse"></div>
                  <div className="w-2 h-2 bg-emerald-300 rounded-full animate-pulse delay-75"></div>
                  <div className="w-2 h-2 bg-emerald-300 rounded-full animate-pulse delay-150"></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Layer 3: Storage & Knowledge Base */}
        <div className="space-y-6">
          <h3 className="text-sm font-black uppercase tracking-widest text-neutral-400 flex items-center gap-2">
            <Database size={16} /> {t('phase1_storage_title')}
          </h3>
          <div className="bg-white p-6 rounded-3xl border border-neutral-200 shadow-sm space-y-4">
            <div className="p-4 bg-neutral-50 rounded-2xl border border-neutral-100">
              <div className="flex items-center gap-2 mb-2">
                <Database size={16} className="text-blue-600" />
                <span className="text-xs font-bold uppercase tracking-widest">{t('phase1_storage_sql_title')}</span>
              </div>
              <p className="text-[10px] text-neutral-500">{t('phase1_storage_sql_desc')}</p>
            </div>
            <div className="p-4 bg-neutral-50 rounded-2xl border border-neutral-100">
              <div className="flex items-center gap-2 mb-2">
                <Network size={16} className="text-purple-600" />
                <span className="text-xs font-bold uppercase tracking-widest">{t('phase1_storage_vector_title')}</span>
              </div>
              <p className="text-[10px] text-neutral-500">{t('phase1_storage_vector_desc')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Database Schema Visualization */}
      <div className="bg-neutral-900 rounded-[3rem] p-8 lg:p-12 text-white">
        <div className="flex flex-col md:flex-row justify-between items-start gap-8 mb-12">
          <div>
            <h2 className="text-2xl font-bold mb-4">{t('phase1_schema_title')}</h2>
            <p className="text-neutral-400 text-sm max-w-xl">
              {t('phase1_schema_desc')}
            </p>
          </div>
          <div className="flex gap-4">
            <div className="px-4 py-2 bg-white/5 rounded-xl border border-white/10 text-xs font-bold">{t('phase1_schema_sql_badge')}</div>
            <div className="px-4 py-2 bg-emerald-500/20 rounded-xl border border-emerald-500/30 text-xs font-bold text-emerald-400">{t('phase1_schema_vector_badge')}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { 
              title: t('phase1_schema_entity1_title'), 
              fields: ["ID", "BIM_Model_Ref", "Geo_Fence", "Weather_Profile"],
              type: t('phase1_schema_entity1_type')
            },
            { 
              title: t('phase1_schema_entity2_title'), 
              fields: ["Image_Hash", "Vision_Labels", "Confidence_Score", "TEK17_Ref"],
              type: t('phase1_schema_entity2_type')
            },
            { 
              title: t('phase1_schema_entity3_title'), 
              fields: ["Embedding", "Law_Paragraph", "Safety_Data", "Historical_Risk"],
              type: t('phase1_schema_entity3_type')
            },
            { 
              title: t('phase1_schema_entity4_title'), 
              fields: ["Voice_ID", "Skill_Matrix", "Safety_Record", "Efficiency_Index"],
              type: t('phase1_schema_entity4_type')
            }
          ].map((entity, i) => (
            <div key={i} className="p-6 bg-white/5 rounded-2xl border border-white/10 hover:border-emerald-500/50 transition-colors">
              <div className="text-[10px] font-black uppercase tracking-widest text-emerald-400 mb-3">{entity.type}</div>
              <h4 className="font-bold mb-4">{entity.title}</h4>
              <ul className="space-y-2">
                {entity.fields.map((f, j) => (
                  <li key={j} className="text-[10px] font-mono text-neutral-500 flex items-center gap-2">
                    <div className="w-1 h-1 bg-neutral-700 rounded-full"></div>
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 p-8 bg-white/5 rounded-3xl border border-white/10 border-dashed">
          <h4 className="text-sm font-bold mb-4 flex items-center gap-2">
            <GitBranch size={16} className="text-blue-400" />
            {t('phase1_orchestration_how_title')}
          </h4>
          <p className="text-xs text-neutral-400 leading-relaxed">
            {t('phase1_orchestration_how_desc')}
          </p>
        </div>
      </div>
    </div>
  );
}
