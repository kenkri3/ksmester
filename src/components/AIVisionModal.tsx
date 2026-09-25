import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Camera, Upload, Brain, CheckCircle2, AlertTriangle, RefreshCw, Scan, Save, Loader2, Building2, ListChecks, Search, Lightbulb, ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/src/lib/utils';
import { optimizeImageForVision } from '@/src/lib/imageOptimizer';
import { visionService, VisionAnalysisResult } from '../services/visionService';
import { db, collection, addDoc, serverTimestamp, OperationType, handleFirestoreError, onSnapshot } from '../services/firebase';
import { toast } from 'sonner';

interface AIVisionModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId?: string;
  projectName?: string;
  checklistItemId?: string;
  checklistItemName?: string;
}

export default function AIVisionModal({ isOpen, onClose, projectId: initialProjectId, projectName: initialProjectName, checklistItemId, checklistItemName }: AIVisionModalProps) {
  const { t } = useTranslation();
  const [image, setImage] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | undefined>(initialProjectId);
  const [selectedProjectName, setSelectedProjectName] = useState<string | undefined>(initialProjectName);
  const [projectSearch, setProjectSearch] = useState('');

  useEffect(() => {
    if (initialProjectId) {
      setSelectedProjectId(initialProjectId);
    }
    if (initialProjectName) {
      setSelectedProjectName(initialProjectName);
    }
  }, [initialProjectId, initialProjectName]);
  
  const [result, setResult] = useState<VisionAnalysisResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch projects if not provided
  useEffect(() => {
    if (isOpen && !initialProjectId) {
      const unsub = onSnapshot(collection(db, 'projects'), (snapshot) => {
        setProjects(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });
      return () => unsub();
    }
  }, [isOpen, initialProjectId]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAnalyzing(true);
      setResult(null);
      try {
        const { base64, mimeType } = await optimizeImageForVision(file);
        setImage(base64);
        startAnalysis(base64, mimeType);
      } catch (err: any) {
        console.error('Image optimization failed:', err);
        setAnalyzing(false);
        toast.error('Kunne ikke laste inn bildet. Vennligst prøv en annen fil.');
      }
    }
  };

  const startAnalysis = async (base64Image: string, mimeType: string) => {
    setAnalyzing(true);
    setResult(null);
    
    try {
      const analysis = await visionService.analyzeImage(base64Image, mimeType || 'image/jpeg');
      setResult(analysis);
    } catch (error: any) {
      console.error('AI Vision analysis error:', error);
      const errMsg = error?.message || 'Kunne ikke fullføre AI-analysen. Prøv et tydeligere bilde.';
      setResult({
        status: 'deviation',
        title: 'Analyse feilet',
        description: errMsg.length > 250 ? errMsg.slice(0, 250) + '...' : errMsg,
        elements: [],
        confidence: 0,
        recommendation: 'Prøv å ta et nytt bilde med bedre belysning eller tettere på konstruksjonen.'
      });
      toast.error('AI-analysen feilet: ' + (error?.message || 'Ukjent feil'));
    } finally {
      setAnalyzing(false);
    }
  };

  const reset = () => {
    setImage(null);
    setResult(null);
    setAnalyzing(false);
  };

  const handleSave = async () => {
    if (!result || !image || !selectedProjectId) {
      toast.error("Mangler prosjektinformasjon eller analyseresultat.");
      return;
    }

    setIsSaving(true);
    try {
      // 1. Save as a project document/photo
      await addDoc(collection(db, 'project_photos'), {
        projectId: selectedProjectId,
        checklistItemId: checklistItemId || null,
        checklistItemName: checklistItemName || null,
        imageUrl: image, // In a real app, this would be a Storage URL
        title: result.title || 'AI Vision Kontroll',
        description: result.description,
        status: result.status,
        elements: result.elements,
        confidence: result.confidence,
        type: 'ks_control',
        createdAt: serverTimestamp()
      });

      // 2. If it's a deviation, also create a deviation record
      if (result.status === 'deviation') {
        await addDoc(collection(db, 'deviations'), {
          projectId: selectedProjectId,
          title: `AI Detektert: ${result.title}`,
          description: result.description,
          severity: 'high',
          status: 'open',
          source: 'ai_vision',
          imageUrl: image,
          photoUrl: image,
          timestamp: serverTimestamp(),
          createdAt: new Date().toISOString()
        });
        toast.warning("Avvik logget automatisk.");
      } else {
        toast.success("KS-kontroll lagret i prosjektet.");
      }

      onClose();
      reset();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'project_photos');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.98, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 30 }}
            className="bg-[#0B0F17] text-white w-full max-w-3xl rounded-t-[2.5rem] sm:rounded-[3rem] shadow-2xl overflow-hidden border border-slate-800 flex flex-col max-h-[92vh] sm:max-h-[calc(100vh-2rem)] pb-[env(safe-area-inset-bottom,0px)]"
          >
            {/* Mobile Grab Handle */}
            <div className="sm:hidden w-12 h-1.5 bg-slate-700 rounded-full mx-auto mt-3 mb-1" />

            <div className="p-4 sm:p-8 border-b border-slate-800 flex justify-between items-center bg-[#131722] shrink-0">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="p-2 sm:p-3 bg-rose-500 text-white rounded-xl sm:rounded-2xl shadow-lg shadow-rose-950/50">
                  <Brain size={20} className="sm:w-7 sm:h-7" />
                </div>
                <div>
                  <h2 className="text-lg sm:text-2xl font-bold text-white tracking-tight">MesterAI Vision</h2>
                  <p className="text-[10px] sm:text-xs text-rose-300 font-bold uppercase tracking-wider mt-0.5 sm:mt-1">Automatisk KS-kontroll</p>
                </div>
              </div>
              <button onClick={onClose} aria-label="Lukk" title="Lukk" className="p-2 hover:bg-slate-800 rounded-full transition-colors text-slate-400 hover:text-white cursor-pointer">
                <X size={20} className="sm:w-6 sm:h-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-8 custom-scrollbar">
              {/* Context Selection */}
              {!initialProjectId && !image && (
                <div className="mb-6 sm:mb-8 space-y-3 sm:space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <h3 className="text-[10px] sm:text-xs font-black uppercase tracking-[0.2em] text-slate-400">Velg Prosjekt</h3>
                    <div className="relative w-full sm:w-64">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 sm:w-3.5 sm:h-3.5" size={14} />
                      <input 
                        type="text"
                        placeholder="Søk i prosjekter..."
                        value={projectSearch}
                        onChange={(e) => setProjectSearch(e.target.value)}
                        className="w-full pl-9 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-white placeholder:text-slate-500 focus:border-rose-500 transition-all outline-none"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                    {projects
                      .filter(p => p.name.toLowerCase().includes(projectSearch.toLowerCase()))
                      .map(p => (
                      <button
                        key={p.id}
                        onClick={() => {
                          setSelectedProjectId(p.id);
                          setSelectedProjectName(p.name);
                        }}
                        className={cn(
                          "flex items-center gap-2 sm:gap-3 p-2.5 sm:p-4 rounded-xl sm:rounded-2xl border transition-all text-left",
                          selectedProjectId === p.id 
                            ? "bg-rose-950/40 border-rose-500 text-white shadow-lg shadow-rose-950/30" 
                            : "bg-[#131722] border-slate-800 text-slate-400 hover:border-slate-700"
                        )}
                      >
                        <Building2 size={14} className={cn("sm:w-[18px] sm:h-[18px]", selectedProjectId === p.id ? "text-rose-400" : "text-slate-500")} />
                        <span className="text-[10px] sm:text-sm font-bold truncate">{p.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {checklistItemName && (
                <div className="mb-6 sm:mb-8 p-3 sm:p-4 bg-rose-950/20 border border-rose-500/30 rounded-xl sm:rounded-2xl flex items-center gap-3">
                  <div className="p-2 bg-rose-500 text-white rounded-lg">
                    <ListChecks size={14} className="sm:w-[18px] sm:h-[18px]" />
                  </div>
                  <div>
                    <p className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-rose-400">Koblet til sjekkliste-punkt</p>
                    <p className="text-xs sm:text-sm font-bold text-white">{checklistItemName}</p>
                  </div>
                </div>
              )}

              {!image ? (
                <div 
                  onClick={() => {
                    if (!selectedProjectId) {
                      toast.error("Velg et prosjekt først");
                      return;
                    }
                    fileInputRef.current?.click();
                  }}
                  className={cn(
                    "h-[180px] sm:h-[300px] border-2 border-dashed rounded-2xl sm:rounded-[2.5rem] flex flex-col items-center justify-center gap-3 sm:gap-6 group transition-all",
                    !selectedProjectId ? "border-slate-800 cursor-not-allowed opacity-50" : "border-slate-800 cursor-pointer hover:border-rose-500/50 hover:bg-[#131722]/50"
                  )}
                >
                  <div className="w-12 h-12 sm:w-20 sm:h-20 bg-slate-800 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Upload size={20} className="sm:w-8 sm:h-8 text-slate-400 group-hover:text-rose-400" />
                  </div>
                  <div className="text-center px-4">
                    <p className="text-sm sm:text-lg font-bold text-white">Last opp eller ta bilde</p>
                    <p className="text-xs sm:text-sm text-slate-400 mt-1 sm:mt-2">AI vil automatisk analysere konstruksjonen for KS-krav</p>
                  </div>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileChange} 
                    accept="image/*" 
                    className="hidden" 
                  />
                  <button className="px-5 sm:px-8 py-2 sm:py-3 bg-slate-800 text-slate-200 border border-slate-700 rounded-lg sm:rounded-2xl text-[10px] sm:text-sm font-bold hover:bg-slate-700 hover:text-white transition-all">
                    Velg fil
                  </button>
                </div>
              ) : (
                <div className="space-y-6 sm:space-y-8">
                  <div className="relative rounded-2xl sm:rounded-[2.5rem] overflow-hidden border border-white/10 aspect-video bg-black">
                    <img src={image} alt="Analysis" className="w-full h-full object-contain" />
                    
                    {analyzing && (
                      <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center p-4">
                        <motion.div 
                          animate={{ rotate: 360 }}
                          transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                          className="mb-4"
                        >
                          <RefreshCw size={24} className="sm:w-12 sm:h-12 text-rose-500" />
                        </motion.div>
                        <p className="text-white font-bold tracking-widest uppercase text-[8px] sm:text-xs animate-pulse text-center">Analyserer bilde med TEK17-AI...</p>
                        <button
                          type="button"
                          onClick={() => {
                            setAnalyzing(false);
                            toast.info('Bildeanalyse avbrutt.');
                          }}
                          className="mt-3 px-3 py-1 bg-white/15 hover:bg-white/25 text-white/90 rounded-full text-[10px] font-bold transition-all pointer-events-auto border border-white/20"
                        >
                          Avbryt
                        </button>
                        
                        {/* Scanning line animation */}
                        <motion.div 
                          initial={{ top: 0 }}
                          animate={{ top: '100%' }}
                          transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                          className="absolute left-0 w-full h-0.5 bg-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.8)] z-20"
                        />
                      </div>
                    )}

                    {result && (
                      <div className="absolute inset-0 pointer-events-none">
                        {/* Simulated bounding boxes */}
                        <div className="absolute top-1/4 left-1/4 w-1/2 h-1/2 border-2 border-emerald-500 rounded-lg shadow-[0_0_15px_rgba(16,185,129,0.5)]">
                          <div className="absolute -top-5 sm:-top-6 left-0 bg-emerald-500 text-white text-[8px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 rounded font-bold uppercase tracking-widest">
                            {result.status === 'approved' ? 'Godkjent' : 'Avvik'} ({Math.round(result.confidence * 100)}%)
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {result && (
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6"
                    >
                      <div className="md:col-span-2 space-y-4 sm:space-y-6">
                        <div className={cn(
                          "p-4 sm:p-6 rounded-2xl sm:rounded-3xl border flex gap-3 sm:gap-4",
                          result.status === 'approved' ? "bg-emerald-500/10 border-emerald-500/20" : "bg-red-500/10 border-red-500/20"
                        )}>
                          <div className={cn(
                            "p-2 sm:p-3 h-fit rounded-xl sm:rounded-2xl",
                            result.status === 'approved' ? "bg-emerald-500 text-white" : "bg-red-500 text-white"
                          )}>
                            {result.status === 'approved' ? <CheckCircle2 size={18} className="sm:w-6 sm:h-6" /> : <AlertTriangle size={18} className="sm:w-6 sm:h-6" />}
                          </div>
                          <div>
                            <h3 className="text-sm sm:text-lg font-bold text-white mb-1 sm:mb-2">
                              {result.status === 'approved' ? 'Konstruksjon Godkjent' : 'Avvik Detektert'}
                            </h3>
                            <p className="text-[10px] sm:text-sm text-neutral-400 leading-relaxed">
                              {result.description}
                            </p>
                          </div>
                        </div>

                        <div className="bg-[#131722] rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-slate-800">
                          <h4 className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 sm:mb-4">Detekterte Elementer</h4>
                          <div className="flex flex-wrap gap-2">
                            {result.elements.map((el, i) => (
                              <span key={i} className="px-2.5 sm:px-3 py-1 sm:py-1.5 bg-slate-800 text-slate-200 border border-slate-700 rounded-lg sm:rounded-xl text-xs font-medium flex items-center gap-1.5 sm:gap-2">
                                <Scan size={12} className="sm:w-3.5 sm:h-3.5 text-rose-400" />
                                {el}
                              </span>
                            ))}
                          </div>
                        </div>

                        {result.tips && result.tips.length > 0 && (
                          <div className="bg-amber-950/20 rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-amber-500/30">
                            <div className="flex items-center gap-2 mb-3 sm:mb-4">
                              <Lightbulb className="text-amber-400 sm:w-[18px] sm:h-[18px]" size={16} />
                              <h4 className="text-[10px] sm:text-xs font-bold text-amber-400 uppercase tracking-widest">Tips & Triks</h4>
                            </div>
                            <ul className="space-y-1.5 sm:space-y-2">
                              {result.tips.map((tip, i) => (
                                <li key={i} className="text-xs sm:text-sm text-slate-300 flex gap-2">
                                  <span className="text-amber-500">•</span>
                                  {tip}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {result.nextSteps && result.nextSteps.length > 0 && (
                          <div className="bg-indigo-950/20 rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-indigo-500/30">
                            <div className="flex items-center gap-2 mb-3 sm:mb-4">
                              <ArrowRight className="text-indigo-400 sm:w-[18px] sm:h-[18px]" size={16} />
                              <h4 className="text-[10px] sm:text-xs font-bold text-indigo-400 uppercase tracking-widest">Forslag til videre løp</h4>
                            </div>
                            <ul className="space-y-1.5 sm:space-y-2">
                              {result.nextSteps.map((step, i) => (
                                <li key={i} className="text-xs sm:text-sm text-slate-300 flex gap-2">
                                  <span className="text-indigo-400">→</span>
                                  {step}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>

                      <div className="space-y-4 sm:space-y-6">
                        <div className="bg-[#131722] rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-slate-800 text-center">
                          <div className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 sm:mb-2">Confidence Score</div>
                          <div className="text-xl sm:text-4xl font-bold text-white">{Math.round(result.confidence * 100)}%</div>
                          <div className="mt-2 sm:mt-4 h-1 sm:h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full bg-rose-500" style={{ width: `${result.confidence * 100}%` }} />
                          </div>
                        </div>
                        
                        <button 
                          onClick={reset}
                          className="w-full py-2.5 sm:py-4 bg-slate-800 border border-slate-700 text-white rounded-lg sm:rounded-2xl font-bold hover:bg-slate-700 transition-all flex items-center justify-center gap-2 text-[10px] sm:text-sm cursor-pointer"
                        >
                          <RefreshCw size={14} className="sm:w-[18px] sm:h-[18px]" />
                          Nytt bilde
                        </button>
                      </div>
                    </motion.div>
                  )}
                </div>
              )}
            </div>

            {result && (
              <div className="p-4 sm:p-8 border-t border-slate-800 bg-[#131722] flex flex-col sm:flex-row justify-end gap-3 sm:gap-4 shrink-0">
                <button 
                  onClick={onClose} 
                  disabled={isSaving}
                  className="px-6 sm:px-8 py-2 sm:py-3 text-slate-400 font-bold hover:text-white transition-colors disabled:opacity-50 text-xs sm:text-base cursor-pointer"
                >
                  Lukk
                </button>
                <button 
                  onClick={handleSave}
                  disabled={isSaving || !selectedProjectId}
                  className="px-6 sm:px-8 py-2.5 sm:py-3 bg-rose-600 text-white rounded-lg sm:rounded-2xl font-bold hover:bg-rose-500 transition-all shadow-xl shadow-rose-950/40 flex items-center justify-center gap-2 disabled:opacity-50 text-xs sm:text-base cursor-pointer"
                >
                  {isSaving ? <Loader2 className="animate-spin sm:w-[18px] sm:h-[18px]" size={16} /> : <Save size={16} className="sm:w-[18px] sm:h-[18px]" />}
                  Lagre i KS-mappe
                </button>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
