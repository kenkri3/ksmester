import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { 
  ShieldCheck, 
  Zap, 
  Smartphone, 
  BarChart3, 
  CheckCircle2, 
  ArrowRight,
  HardHat,
  Camera,
  Mic,
  FileText,
  Users,
  Download,
  Layers,
  Cpu,
  Database,
  Globe,
  Activity,
  Box,
  Layout,
  ChevronRight
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import InstallGuide from './InstallGuide';

export default function LandingPage({ onStartDemo, onOpenPortal, onViewChange }: { onStartDemo: () => void, onOpenPortal: (code: string) => void, onViewChange: (view: any) => void }) {
  const { t } = useTranslation();
  const [showInstallGuide, setShowInstallGuide] = useState(false);
  const [showPortalInput, setShowPortalInput] = useState(false);
  const [projectCode, setProjectCode] = useState('');

  const handlePortalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (projectCode) {
      onOpenPortal(projectCode);
    }
  };

  return (
    <div className="bg-white selection:bg-emerald-100 selection:text-emerald-900">
      {/* Hero Section - Recipe 11: Split Layout with Editorial Flair */}
      <section className="relative min-h-screen grid grid-cols-1 lg:grid-cols-2 border-b border-neutral-100">
        <div className="flex flex-col justify-center p-8 lg:p-24 bg-white relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neutral-100 text-neutral-500 text-[10px] font-bold uppercase tracking-[0.2em] mb-8">
              <Activity size={12} className="text-emerald-500" />
              Next-Gen Construction Intelligence
            </div>
            
            <h1 className="text-5xl sm:text-7xl lg:text-[112px] font-bold tracking-tighter leading-[0.88] mb-10 text-neutral-900">
              Systemet som <span className="text-emerald-600 italic font-serif font-normal">tenker</span> mens du bygger.
            </h1>
            
            <p className="text-xl text-neutral-500 max-w-lg mb-12 leading-relaxed">
              KS MesterAI Elite eliminerer manuelt papirarbeid gjennom autonom HMS, AI-drevet SJA og radikal automatisering i alle ledd.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <button 
                onClick={onStartDemo}
                className="group bg-neutral-900 text-white px-10 py-5 rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-neutral-800 transition-all active:scale-95 shadow-2xl shadow-neutral-200"
              >
                {t('see_demo')}
                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </button>
              
              <div className="relative">
                <button 
                  onClick={() => setShowPortalInput(!showPortalInput)}
                  className="bg-white text-neutral-900 border border-neutral-200 px-10 py-5 rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-neutral-50 transition-all active:scale-95 w-full"
                >
                  <Users size={20} className="text-neutral-400" />
                  Kundeportal
                </button>
                
                <AnimatePresence>
                  {showPortalInput && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute top-full left-0 right-0 mt-4 p-6 bg-white rounded-[2rem] border border-neutral-200 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.1)] z-50 min-w-[320px]"
                    >
                      <form onSubmit={handlePortalSubmit} className="space-y-4">
                        <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1">Prosjektkode</div>
                        <input 
                          autoFocus
                          type="text" 
                          value={projectCode}
                          onChange={(e) => setProjectCode(e.target.value)}
                          placeholder="F.eks. PRO-123"
                          className="w-full px-5 py-4 bg-neutral-50 border border-neutral-100 rounded-2xl text-sm focus:outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all"
                        />
                        <button 
                          type="submit"
                          className="w-full py-4 bg-emerald-600 text-white rounded-2xl text-xs font-bold hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-100"
                        >
                          Gå til portal
                        </button>
                      </form>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        </div>
        
        <div className="relative bg-neutral-50 flex items-center justify-center p-8 lg:p-0 overflow-hidden border-l border-neutral-100">
          {/* Technical Grid Overlay */}
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
          
          {/* Floating UI Elements - Hardware Feel (Recipe 3) */}
          <div className="relative w-full max-w-lg">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 40 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 1, ease: [0.16, 1, 0.3, 1] }}
              className="relative z-20 bg-neutral-900 rounded-[2.5rem] shadow-[0_48px_96px_-12px_rgba(0,0,0,0.3)] border border-white/10 overflow-hidden text-white"
            >
              <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/5">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                  <span className="text-[10px] font-mono text-emerald-500/70 uppercase tracking-widest">Live_Vision_Feed</span>
                </div>
                <div className="flex gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-white/10"></div>
                  <div className="w-2 h-2 rounded-full bg-white/10"></div>
                </div>
              </div>
              
              <div className="p-10">
                <div className="flex items-center gap-5 mb-10">
                  <div className="w-14 h-14 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-500 border border-emerald-500/20">
                    <Camera size={28} />
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-neutral-500 uppercase tracking-[0.2em] mb-1">Neural Analysis</div>
                    <div className="text-lg font-bold">Dampsperre Verifisert</div>
                  </div>
                </div>
                
                <div className="space-y-6 mb-10">
                  <div className="relative h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: '94%' }}
                      transition={{ delay: 1.2, duration: 2, ease: "easeInOut" }}
                      className="h-full bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.5)]"
                    ></motion.div>
                  </div>
                  <div className="flex justify-between text-[10px] font-mono uppercase tracking-widest text-neutral-500">
                    <span>TEK17 § 14-2 Compliance</span>
                    <span className="text-emerald-500">94.2% Confidence</span>
                  </div>
                </div>
                
                <div className="p-6 bg-white/5 rounded-2xl border border-white/5 font-mono text-[11px] leading-relaxed text-neutral-400">
                  <span className="text-emerald-500">$</span> Identifying building elements...<br/>
                  <span className="text-emerald-500">$</span> Checking material GTIN: 7036260123456<br/>
                  <span className="text-emerald-500">$</span> Result: <span className="text-white">Samsvarer med teknisk forskrift.</span>
                </div>
              </div>
            </motion.div>
            
            {/* Secondary Floating Widget */}
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5, duration: 1 }}
              className="absolute -right-12 -bottom-12 z-30 bg-white p-6 rounded-3xl shadow-2xl border border-neutral-100 max-w-[240px]"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
                  <Mic size={20} />
                </div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">Voice SJA</div>
              </div>
              <p className="text-xs font-medium text-neutral-900 leading-relaxed">
                "Vi sikrer området før takarbeid starter..."
              </p>
              <div className="mt-4 flex gap-1">
                {[1, 2, 3, 4, 5].map(i => (
                  <motion.div 
                    key={i}
                    animate={{ height: [8, 16, 8] }}
                    transition={{ repeat: Infinity, duration: 1, delay: i * 0.1 }}
                    className="w-1 bg-blue-500 rounded-full"
                  ></motion.div>
                ))}
              </div>
            </motion.div>
          </div>
          
          {/* Background Accents */}
          <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-[120px]"></div>
          <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-[120px]"></div>
        </div>
      </section>

      {/* Stats/Trust Bar */}
      <section className="py-12 border-b border-neutral-100 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap justify-center lg:justify-between items-center gap-12 opacity-40 grayscale hover:grayscale-0 transition-all duration-500">
            <div className="text-xl font-black tracking-tighter">BOLIGMAPPA</div>
            <div className="text-xl font-black tracking-tighter">TRIPLETEX</div>
            <div className="text-xl font-black tracking-tighter">NOBB.NO</div>
            <div className="text-xl font-black tracking-tighter">HMS-REG</div>
            <div className="text-xl font-black tracking-tighter">DIBK</div>
          </div>
        </div>
      </section>

      {/* Features Grid - Recipe 1: Visible Structure */}
      <section className="py-32 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mb-24">
            <div className="text-emerald-600 text-[10px] font-bold uppercase tracking-[0.3em] mb-4">Core Capabilities</div>
            <h2 className="text-4xl lg:text-6xl font-bold tracking-tight mb-8">
              Bygget for hverdagen til en travel håndverker.
            </h2>
            <p className="text-xl text-neutral-500 leading-relaxed">
              Vi har fjernet alle unødvendige menyer. Systemet bruker AI for å forstå kontekst, slik at du kan fokusere på faget ditt.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 border-t border-l border-neutral-100">
            {[
              {
                icon: <Mic size={24} />,
                title: t('feature_voice_title'),
                desc: t('feature_voice_desc'),
                color: "text-blue-600"
              },
              {
                icon: <Camera size={24} />,
                title: t('feature_vision_title'),
                desc: t('feature_vision_desc'),
                color: "text-emerald-600"
              },
              {
                icon: <Zap size={24} />,
                title: t('feature_fdv_title'),
                desc: t('feature_fdv_desc'),
                color: "text-amber-600"
              },
              {
                icon: <ShieldCheck size={24} />,
                title: t('feature_legal_title'),
                desc: t('feature_legal_desc'),
                color: "text-purple-600"
              },
              {
                icon: <Users size={24} />,
                title: t('feature_crew_title'),
                desc: t('feature_crew_desc'),
                color: "text-indigo-600"
              },
              {
                icon: <FileText size={24} />,
                title: t('feature_boligmappa_title'),
                desc: t('feature_boligmappa_desc'),
                color: "text-red-600"
              }
            ].map((feature, i) => (
              <div 
                key={i}
                className="p-12 border-r border-b border-neutral-100 hover:bg-neutral-50 transition-colors group"
              >
                <div className={cn("mb-8 transition-transform group-hover:scale-110 duration-500", feature.color)}>
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold mb-4">{feature.title}</h3>
                <p className="text-neutral-500 text-sm leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Roadmap & Architecture Section - Dark & Immersive */}
      <section className="py-32 bg-neutral-900 text-white overflow-hidden relative">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,#10b98110,transparent_70%)]"></div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-24 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-bold uppercase tracking-widest mb-8 border border-emerald-500/20">
                <Layers size={14} />
                Strategisk Roadmap
              </div>
              <h2 className="text-4xl lg:text-7xl font-bold tracking-tighter mb-10 leading-[0.95]">
                6 Faser mot <span className="text-emerald-500">Full Automatisering.</span>
              </h2>
              <p className="text-xl text-neutral-400 mb-12 leading-relaxed max-w-lg">
                Vi bygger ikke bare en app, vi bygger en autonom hjerne for byggebransjen. Vår roadmap tar deg fra digital dokumentasjon til sanntids AI-veiledning.
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-12">
                {[
                  { phase: "1", title: t('phase1_title') },
                  { phase: "2", title: t('phase2_title') },
                  { phase: "3", title: t('phase3_title') },
                  { phase: "4", title: t('phase4_title') },
                  { phase: "5", title: t('phase5_title') },
                  { phase: "6", title: t('phase6_title') }
                ].map((p, i) => (
                  <div key={i} className="p-5 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all group cursor-default">
                    <div className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-2">Fase {p.phase}</div>
                    <h4 className="font-bold text-sm group-hover:text-emerald-400 transition-colors">{p.title}</h4>
                  </div>
                ))}
              </div>

              <button 
                onClick={() => onViewChange('spec')}
                className="group flex items-center gap-3 px-10 py-5 bg-white text-neutral-900 rounded-2xl font-bold hover:bg-neutral-100 transition-all active:scale-95 shadow-2xl"
              >
                Se Teknisk Spesifikasjon
                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </div>

            <div className="relative hidden lg:block">
              <div className="absolute inset-0 bg-emerald-500/20 blur-[160px] rounded-full"></div>
              <div className="relative z-10 grid grid-cols-2 gap-6">
                <div className="space-y-6">
                  <div className="aspect-square bg-white/5 rounded-[3rem] border border-white/10 p-10 flex flex-col justify-center items-center text-center backdrop-blur-sm hover:bg-white/10 transition-colors">
                    <Cpu size={56} className="text-emerald-500 mb-6" />
                    <div className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-50">AI Core Engine</div>
                  </div>
                  <div className="aspect-[4/5] bg-white/5 rounded-[3rem] border border-white/10 p-10 flex flex-col justify-center items-center text-center backdrop-blur-sm hover:bg-white/10 transition-colors">
                    <Database size={56} className="text-blue-500 mb-6" />
                    <div className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-50">Neural Schema</div>
                  </div>
                </div>
                <div className="space-y-6 pt-16">
                  <div className="aspect-[4/5] bg-white/5 rounded-[3rem] border border-white/10 p-10 flex flex-col justify-center items-center text-center backdrop-blur-sm hover:bg-white/10 transition-colors">
                    <Globe size={56} className="text-amber-500 mb-6" />
                    <div className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-50">Global Ecosystem</div>
                  </div>
                  <div className="aspect-square bg-white/5 rounded-[3rem] border border-white/10 p-10 flex flex-col justify-center items-center text-center backdrop-blur-sm hover:bg-white/10 transition-colors">
                    <ShieldCheck size={56} className="text-purple-500 mb-6" />
                    <div className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-50">Compliance</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing - Recipe 8: Clean Utility with Modern Cards */}
      <section className="py-32 bg-neutral-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <div className="text-emerald-600 text-[10px] font-bold uppercase tracking-[0.3em] mb-4">Pricing Plans</div>
            <h2 className="text-4xl lg:text-6xl font-bold tracking-tight mb-6">{t('pricing_title')}</h2>
            <p className="text-xl text-neutral-500 max-w-2xl mx-auto">{t('pricing_desc')}</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                name: t('plan_start'),
                price: "490,-",
                desc: t('plan_start_desc'),
                features: ["Lovpålagt HMS/KS", "Enkel Avvikshåndtering", "Dokumentarkiv", "E-post support"],
                color: "bg-white"
              },
              {
                name: t('plan_vekst'),
                price: "1.490,-",
                desc: t('plan_vekst_desc'),
                features: ["Alt i Start", "AI Smart-SJA (Voice)", "Mannskapslister (GPS)", "Prosjektstyring", "Prioritert support"],
                color: "bg-emerald-600 text-white",
                popular: true
              },
              {
                name: t('plan_pro'),
                price: t('contact_us'),
                desc: t('plan_pro_desc'),
                features: ["Alt i Vekst", "Full AI Bildeanalyse", "Uavhengig Kontroll", "API-integrasjoner", "Dedikert rådgiver"],
                color: "bg-neutral-900 text-white"
              }
            ].map((plan, i) => (
              <div key={i} className={cn(
                "relative p-12 rounded-[3rem] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.05)] flex flex-col transition-transform hover:scale-[1.02] duration-500",
                plan.color
              )}>
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-amber-400 text-neutral-900 text-[10px] font-black uppercase tracking-[0.2em] px-6 py-1.5 rounded-full shadow-lg shadow-amber-400/20">
                    {t('most_popular')}
                  </div>
                )}
                <div className="mb-10">
                  <h3 className="text-2xl font-bold mb-3">{plan.name}</h3>
                  <p className={cn("text-sm opacity-70 leading-relaxed", plan.popular ? "text-emerald-50" : "text-neutral-500")}>{plan.desc}</p>
                </div>
                <div className="mb-10">
                  <span className="text-5xl font-bold tracking-tighter">{plan.price}</span>
                  {plan.price !== t('contact_us') && <span className="text-sm opacity-70 ml-2">{t('per_month')}</span>}
                </div>
                <ul className="space-y-5 mb-12 flex-grow">
                  {plan.features.map((f, j) => (
                    <li key={j} className="flex items-center gap-4 text-sm font-medium">
                      <div className={cn("w-5 h-5 rounded-full flex items-center justify-center", plan.popular ? "bg-white/20" : "bg-emerald-50")}>
                        <CheckCircle2 size={14} className={plan.popular ? "text-white" : "text-emerald-600"} />
                      </div>
                      {f}
                    </li>
                  ))}
                </ul>
                <button className={cn(
                  "w-full py-5 rounded-2xl font-bold transition-all active:scale-95 shadow-xl shadow-current/10",
                  plan.popular ? "bg-white text-emerald-600 hover:bg-neutral-50" : (plan.name === t('plan_start') ? "bg-neutral-900 text-white hover:bg-neutral-800" : "bg-emerald-600 text-white hover:bg-emerald-500")
                )}>
                  {t('select_plan', { name: plan.name })}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Mobile App Section - Immersive Split */}
      <section className="py-32 bg-white overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-24 items-center">
            <div className="relative order-2 lg:order-1">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[140%] h-[140%] bg-emerald-50 rounded-full blur-[120px] opacity-60"></div>
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 60 }}
                whileInView={{ opacity: 1, scale: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
                className="relative z-10 flex justify-center"
              >
                <div className="relative w-[300px] h-[620px] bg-neutral-900 rounded-[3.5rem] border-[10px] border-neutral-800 shadow-[0_64px_128px_-12px_rgba(0,0,0,0.4)] overflow-hidden">
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-36 h-7 bg-neutral-800 rounded-b-[1.5rem] z-20"></div>
                  <img 
                    src="https://picsum.photos/seed/mobile-app/300/620" 
                    alt="Mobile App Preview" 
                    className="w-full h-full object-cover opacity-90"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-neutral-900 via-transparent to-transparent"></div>
                  <div className="absolute bottom-10 left-0 w-full px-8">
                    <div className="p-5 bg-white/10 backdrop-blur-xl rounded-3xl border border-white/20 shadow-2xl">
                      <div className="flex items-center gap-4 mb-3">
                        <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
                          <Mic size={20} className="text-white" />
                        </div>
                        <div className="text-[10px] font-bold text-white uppercase tracking-[0.2em]">Smart-SJA Aktiv</div>
                      </div>
                      <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                        <motion.div 
                          animate={{ width: ['20%', '80%', '40%', '90%'] }}
                          transition={{ repeat: Infinity, duration: 4 }}
                          className="h-full bg-emerald-500"
                        ></motion.div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>

            <div className="order-1 lg:order-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-[10px] font-bold uppercase tracking-widest mb-8 border border-blue-100">
                <Smartphone size={14} />
                Progressive Web App (PWA)
              </div>
              <h2 className="text-4xl lg:text-7xl font-bold tracking-tighter mb-10 leading-[0.95]">
                Full kontroll <span className="text-emerald-600 italic font-serif font-normal">rett i lomma.</span>
              </h2>
              <p className="text-xl text-neutral-500 mb-12 leading-relaxed max-w-lg">
                Vår app krever ingen nedlasting fra App Store. Installer den direkte fra nettleseren for lynrask tilgang til AI-verktøy, avvikshåndtering og mannskapslister.
              </p>
              
              <div className="space-y-8 mb-12">
                {[
                  { title: t('offline_access', 'Fungerer offline'), desc: t('offline_desc', 'Registrer data selv uten dekning, synkroniseres automatisk når du er online.') },
                  { title: t('push_notifications', 'Push-varslinger'), desc: t('push_desc', 'Få beskjed med en gang et avvik krever din oppmerksomhet.') },
                  { title: t('fast_access', 'Lynrask tilgang'), desc: t('fast_desc', 'Eget ikon på hjemskjermen akkurat som en vanlig app.') }
                ].map((item, i) => (
                  <div key={i} className="flex gap-6 group">
                    <div className="flex-shrink-0 w-12 h-12 bg-neutral-50 rounded-2xl flex items-center justify-center text-emerald-600 border border-neutral-100 group-hover:bg-emerald-50 transition-colors">
                      <CheckCircle2 size={24} />
                    </div>
                    <div>
                      <h4 className="font-bold text-lg mb-1">{item.title}</h4>
                      <p className="text-sm text-neutral-500 leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <button 
                onClick={() => setShowInstallGuide(true)}
                className="flex items-center gap-3 px-10 py-5 bg-neutral-900 text-white rounded-2xl font-bold hover:bg-neutral-800 transition-all active:scale-95 shadow-2xl shadow-neutral-200"
              >
                <Download size={20} />
                {t('how_to_install', 'Se hvordan du installerer')}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Install Guide Modal */}
      {showInstallGuide && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="w-full max-w-2xl"
          >
            <InstallGuide onClose={() => setShowInstallGuide(false)} />
          </motion.div>
        </div>
      )}

      {/* CTA Section - Recipe 2: Editorial Hero */}
      <section className="py-32 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-neutral-900 rounded-[4rem] p-12 lg:p-32 text-center text-white relative overflow-hidden">
            <div className="absolute inset-0 opacity-20 bg-[url('https://picsum.photos/seed/construction/1200/800')] bg-cover bg-center grayscale"></div>
            <div className="absolute inset-0 bg-gradient-to-b from-neutral-900/80 to-neutral-900"></div>
            
            <div className="relative z-10 max-w-4xl mx-auto">
              <h2 className="text-5xl lg:text-8xl font-bold tracking-tighter mb-10 leading-[0.85]">
                Klar for å eliminere <span className="text-emerald-500">papirarbeidet?</span>
              </h2>
              <p className="text-xl lg:text-2xl text-neutral-400 mb-16 leading-relaxed">
                Bli med over 500 norske bedrifter som allerede bruker KS Mester AI for en enklere hverdag.
              </p>
              <button className="bg-emerald-600 text-white px-12 py-6 rounded-2xl font-bold text-xl hover:bg-emerald-500 transition-all active:scale-95 shadow-[0_20px_50px_rgba(16,185,129,0.3)]">
                {t('cta_button')}
              </button>
              <p className="mt-10 text-sm text-neutral-500 font-medium uppercase tracking-widest">{t('cta_footer')}</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
