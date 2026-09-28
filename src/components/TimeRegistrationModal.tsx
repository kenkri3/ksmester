import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Timer, Calendar, Briefcase, MapPin, MessageSquare, CheckCircle2, ChevronRight, ArrowLeft, ShieldCheck } from 'lucide-react';
import { Project } from '../types';
import { db, auth, handleFirestoreError, OperationType, collection, addDoc, serverTimestamp } from '../services/firebase';
import { useAuth } from '../hooks/useAuth';
import { cn } from '../lib/utils';

interface TimeRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  projects: { id: string; name: string }[] | Project[];
  selectedProject?: Project | null;
  inline?: boolean;
}

const TimeRegistrationModal: React.FC<TimeRegistrationModalProps> = ({ 
  isOpen, 
  onClose, 
  projects = [],
  selectedProject,
  inline = false
}) => {
  const { user } = useAuth();
  const [selectedProjectId, setSelectedProjectId] = useState(selectedProject?.id || '');
  const [hours, setHours] = useState('8');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [category, setCategory] = useState<'arbeid' | 'reise' | 'overtid'>('arbeid');
  const [description, setDescription] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (selectedProject?.id) {
      setSelectedProjectId(selectedProject.id);
    } else if (!selectedProjectId && projects.length > 0) {
      setSelectedProjectId(projects[0].id);
    }
  }, [selectedProject?.id, projects]);

  const handleSave = async () => {
    if (!auth.currentUser || !selectedProjectId) return;

    setIsSaving(true);
    try {
      const userCompany = (user as any)?.company || '';
      const timeEntryData = {
        projectId: selectedProjectId,
        userId: auth.currentUser.uid,
        company: userCompany,
        date,
        hours: parseFloat(hours),
        category,
        description,
        status: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await addDoc(collection(db, 'time_entries'), timeEntryData);
      
      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        // Reset
        setHours('8');
        setDescription('');
        if (!inline) {
          onClose();
        }
      }, 1800);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'time_entries');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  const content = (
    <div className={cn(
      "bg-[#0B0F17] text-white border border-slate-800 w-full overflow-hidden flex flex-col",
      inline 
        ? "rounded-3xl shadow-xl min-h-[650px]" 
        : "max-w-xl rounded-t-[2rem] sm:rounded-[2.5rem] shadow-2xl max-h-[92vh] sm:max-h-[90vh] pb-[env(safe-area-inset-bottom,0px)]"
    )}>
      {/* Mobile Grab Handle */}
      {!inline && <div className="sm:hidden w-12 h-1.5 bg-slate-700 rounded-full mx-auto mt-3 mb-1" />}

      {/* Header */}
      <div className="p-4 sm:p-8 border-b border-slate-800 flex items-center justify-between bg-[#131722] shrink-0">
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center shadow-lg shadow-blue-950/50 shrink-0">
            <Timer size={20} className="sm:w-6 sm:h-6" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-2xl font-bold tracking-tight text-white truncate">Timeføring</h2>
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-500/30">
                <ShieldCheck size={11} /> AML § 10-7
              </span>
            </div>
            <p className="text-slate-400 text-[11px] sm:text-sm font-medium truncate">Registrer timer, overtid og arbeidsoppgaver</p>
          </div>
        </div>
        {inline ? (
          <button 
            type="button"
            onClick={onClose} 
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold transition-all cursor-pointer border border-slate-700 shrink-0"
            title="Gå tilbake til arbeidsstasjonen"
          >
            <ArrowLeft size={14} />
            <span className="hidden sm:inline">Tilbake til chat</span>
          </button>
        ) : (
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer shrink-0">
            <X size={20} className="sm:w-6 sm:h-6" />
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-8 custom-scrollbar">
        <AnimatePresence mode="wait">
          {isSuccess ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center py-8 sm:py-12 text-center"
            >
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full flex items-center justify-center mb-4 sm:mb-6 shadow-lg shadow-emerald-950/50">
                <CheckCircle2 size={32} className="sm:w-12 sm:h-12" />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold mb-1 sm:mb-2 text-white">Timer Registrert!</h3>
              <p className="text-xs sm:text-sm text-slate-400">Dine timer er lagret og sendt til godkjenning.</p>
            </motion.div>
          ) : (
            <motion.div 
              key="form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-4 sm:space-y-6"
            >
              {/* Project Selection */}
              <div className="space-y-1.5 sm:space-y-2">
                <label className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Velg Prosjekt</label>
                <select 
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  className="w-full p-3 sm:p-4 bg-slate-950 border border-slate-800 rounded-xl sm:rounded-2xl focus:border-blue-500 outline-none font-bold text-white text-sm sm:text-base cursor-pointer"
                >
                  <option value="" className="bg-slate-950 text-slate-400">Velg et prosjekt...</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id} className="bg-slate-950 text-white">{p.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                {/* Date */}
                <div className="space-y-1.5 sm:space-y-2">
                  <label className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Dato</label>
                  <div className="relative">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 sm:w-[18px] sm:h-[18px]" size={16} />
                    <input 
                      type="date" 
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full pl-10 sm:pl-12 pr-4 py-2.5 sm:py-4 bg-slate-950 border border-slate-800 rounded-xl sm:rounded-2xl focus:border-blue-500 outline-none font-bold text-xs sm:text-base text-white [color-scheme:dark]"
                    />
                  </div>
                </div>

                {/* Hours */}
                <div className="space-y-1.5 sm:space-y-2">
                  <label className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Timer</label>
                  <input 
                    type="number" 
                    step="0.5"
                    min="0.5"
                    max="24"
                    value={hours}
                    onChange={(e) => setHours(e.target.value)}
                    className="w-full p-2.5 sm:p-4 bg-slate-950 border border-slate-800 rounded-xl sm:rounded-2xl focus:border-blue-500 outline-none font-bold text-sm sm:text-base text-white"
                  />
                </div>
              </div>

              {/* Category */}
              <div className="space-y-1.5 sm:space-y-2">
                <label className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Kategori</label>
                <div className="grid grid-cols-3 gap-2 sm:gap-3">
                  {(['arbeid', 'reise', 'overtid'] as const).map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategory(cat)}
                      className={`p-2.5 sm:p-3 rounded-xl sm:rounded-2xl border font-bold capitalize text-xs sm:text-sm transition-all cursor-pointer ${
                        category === cat 
                          ? 'bg-blue-600/20 border-blue-500 text-blue-400' 
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1.5 sm:space-y-2">
                <label className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Beskrivelse</label>
                <div className="relative">
                  <MessageSquare className="absolute left-4 top-4 text-slate-500 sm:w-[18px] sm:h-[18px]" size={16} />
                  <textarea 
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Hva har du gjort i dag?"
                    rows={3}
                    className="w-full pl-10 sm:pl-12 pr-4 py-3 sm:py-4 bg-slate-950 border border-slate-800 rounded-xl sm:rounded-2xl focus:border-blue-500 outline-none font-medium resize-none text-sm sm:text-base text-white placeholder:text-slate-600"
                  />
                </div>
              </div>

              <div className="pt-4 pb-2 border-t border-slate-800 mt-4 bg-[#0B0F17]">
                <button 
                  type="button"
                  onClick={handleSave}
                  disabled={!selectedProjectId || !hours || isSaving}
                  className="w-full py-3.5 sm:py-4 bg-blue-600 text-white rounded-xl sm:rounded-2xl font-bold hover:bg-blue-500 transition-all shadow-xl shadow-blue-950/50 disabled:opacity-50 flex items-center justify-center gap-2 sm:gap-3 text-sm sm:text-base cursor-pointer"
                >
                  {isSaving ? (
                    <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      Registrer Timer
                      <ChevronRight size={16} className="sm:w-[18px] sm:h-[18px]" />
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );

  if (inline) {
    return content;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center md:pl-[290px] lg:pl-[320px] p-0 sm:p-4 bg-black/60 backdrop-blur-xs">
      <motion.div 
        initial={{ opacity: 0, scale: 0.98, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.98, y: 20 }}
        className="w-full max-w-xl"
      >
        {content}
      </motion.div>
    </div>
  );
};

export default TimeRegistrationModal;
