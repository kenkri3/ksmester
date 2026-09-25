import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Timer, Calendar, Briefcase, MapPin, MessageSquare, CheckCircle2, ChevronRight } from 'lucide-react';
import { Project } from '../types';
import { db, auth, handleFirestoreError, OperationType, collection, addDoc, serverTimestamp } from '../services/firebase';
import { useAuth } from '../hooks/useAuth';

interface TimeRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  projects: { id: string, name: string }[];
}

const TimeRegistrationModal: React.FC<TimeRegistrationModalProps> = ({ isOpen, onClose, projects }) => {
  const { user } = useAuth();
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [hours, setHours] = useState('8');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [category, setCategory] = useState<'arbeid' | 'reise' | 'overtid'>('arbeid');
  const [description, setDescription] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

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
        onClose();
        setIsSuccess(false);
        // Reset
        setSelectedProjectId('');
        setHours('8');
        setDescription('');
      }, 2000);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'time_entries');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md">
      <motion.div 
        initial={{ opacity: 0, scale: 0.98, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.98, y: 20 }}
        className="bg-[#0B0F17] text-white border border-slate-800 w-full max-w-xl rounded-t-[2rem] sm:rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[90vh] pb-[env(safe-area-inset-bottom,0px)]"
      >
        {/* Mobile Grab Handle */}
        <div className="sm:hidden w-12 h-1.5 bg-slate-700 rounded-full mx-auto mt-3 mb-1" />

        {/* Header */}
        <div className="p-4 sm:p-8 border-b border-slate-800 flex items-center justify-between bg-[#131722] shrink-0">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center shadow-lg shadow-blue-950/50">
              <Timer size={20} className="sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-2xl font-bold tracking-tight text-white truncate">Timeføring</h2>
              <p className="text-slate-400 text-[11px] sm:text-sm font-medium truncate">Registrer timer raskt og enkelt</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer">
            <X size={20} className="sm:w-6 sm:h-6" />
          </button>
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
                    <label className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Antall Timer</label>
                    <input 
                      type="number" 
                      step="0.5"
                      value={hours}
                      onChange={(e) => setHours(e.target.value)}
                      className="w-full p-2.5 sm:p-4 bg-slate-950 border border-slate-800 rounded-xl sm:rounded-2xl focus:border-blue-500 outline-none font-bold text-center text-lg sm:text-2xl text-white"
                    />
                  </div>
                </div>

                {/* Category */}
                <div className="space-y-1.5 sm:space-y-2">
                  <label className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Kategori</label>
                  <div className="grid grid-cols-3 gap-2 sm:gap-3">
                    {[
                      { id: 'arbeid', label: 'Arbeid', icon: <Briefcase size={14} className="sm:w-4 sm:h-4" /> },
                      { id: 'reise', label: 'Reise', icon: <MapPin size={14} className="sm:w-4 sm:h-4" /> },
                      { id: 'overtid', label: 'Overtid', icon: <Timer size={14} className="sm:w-4 sm:h-4" /> },
                    ].map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setCategory(cat.id as any)}
                        className={`flex flex-col items-center gap-1 sm:gap-2 p-2.5 sm:p-4 rounded-xl sm:rounded-2xl border transition-all cursor-pointer ${
                          category === cat.id 
                            ? 'bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-950/50' 
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                        }`}
                      >
                        {cat.icon}
                        <span className="text-[10px] sm:text-xs font-bold">{cat.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-1.5 sm:space-y-2">
                  <label className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Beskrivelse (Valgfritt)</label>
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
      </motion.div>
    </div>
  );
};

export default TimeRegistrationModal;
