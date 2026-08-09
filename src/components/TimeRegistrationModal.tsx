import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-neutral-50 w-full max-w-2xl rounded-2xl sm:rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[calc(100vh-2rem)]"
      >
        {/* Header */}
        <div className="p-4 sm:p-8 border-b border-neutral-200 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-neutral-900 flex items-center justify-center text-white shadow-lg shadow-neutral-200">
              <Timer size={20} className="sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-2xl font-bold tracking-tight truncate">Timeføring</h2>
              <p className="text-neutral-500 text-[8px] sm:text-sm font-medium truncate">Registrer timer raskt og enkelt</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-neutral-100 rounded-xl transition-colors">
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
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-4 sm:mb-6">
                  <CheckCircle2 size={32} className="sm:w-12 sm:h-12" />
                </div>
                <h3 className="text-xl sm:text-2xl font-bold mb-1 sm:mb-2">Timer Registrert!</h3>
                <p className="text-xs sm:text-sm text-neutral-500">Dine timer er lagret og sendt til godkjenning.</p>
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
                  <label className="text-[8px] sm:text-xs font-black uppercase tracking-widest text-neutral-400 ml-1">Velg Prosjekt</label>
                  <select 
                    value={selectedProjectId}
                    onChange={(e) => setSelectedProjectId(e.target.value)}
                    className="w-full p-3 sm:p-4 bg-white border border-neutral-200 rounded-xl sm:rounded-2xl focus:ring-2 focus:ring-neutral-900 outline-none font-bold appearance-none text-sm sm:text-base"
                  >
                    <option value="">Velg et prosjekt...</option>
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  {/* Date */}
                  <div className="space-y-1.5 sm:space-y-2">
                    <label className="text-[8px] sm:text-xs font-black uppercase tracking-widest text-neutral-400 ml-1">Dato</label>
                    <div className="relative">
                      <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 sm:w-[18px] sm:h-[18px]" size={16} />
                      <input 
                        type="date" 
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="w-full pl-10 sm:pl-12 pr-4 py-2.5 sm:py-4 bg-white border border-neutral-200 rounded-xl sm:rounded-2xl focus:ring-2 focus:ring-neutral-900 outline-none font-bold text-xs sm:text-base"
                      />
                    </div>
                  </div>

                  {/* Hours */}
                  <div className="space-y-1.5 sm:space-y-2">
                    <label className="text-[8px] sm:text-xs font-black uppercase tracking-widest text-neutral-400 ml-1">Antall Timer</label>
                    <input 
                      type="number" 
                      step="0.5"
                      value={hours}
                      onChange={(e) => setHours(e.target.value)}
                      className="w-full p-2.5 sm:p-4 bg-white border border-neutral-200 rounded-xl sm:rounded-2xl focus:ring-2 focus:ring-neutral-900 outline-none font-bold text-center text-lg sm:text-2xl"
                    />
                  </div>
                </div>

                {/* Category */}
                <div className="space-y-1.5 sm:space-y-2">
                  <label className="text-[8px] sm:text-xs font-black uppercase tracking-widest text-neutral-400 ml-1">Kategori</label>
                  <div className="grid grid-cols-3 gap-2 sm:gap-3">
                    {[
                      { id: 'arbeid', label: 'Arbeid', icon: <Briefcase size={14} className="sm:w-4 sm:h-4" /> },
                      { id: 'reise', label: 'Reise', icon: <MapPin size={14} className="sm:w-4 sm:h-4" /> },
                      { id: 'overtid', label: 'Overtid', icon: <Timer size={14} className="sm:w-4 sm:h-4" /> },
                    ].map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => setCategory(cat.id as any)}
                        className={`flex flex-col items-center gap-1 sm:gap-2 p-2.5 sm:p-4 rounded-xl sm:rounded-2xl border transition-all ${
                          category === cat.id 
                            ? 'bg-neutral-900 text-white border-neutral-900 shadow-lg shadow-neutral-200' 
                            : 'bg-white border-neutral-200 text-neutral-500 hover:border-neutral-400'
                        }`}
                      >
                        {cat.icon}
                        <span className="text-[8px] sm:text-xs font-bold">{cat.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-1.5 sm:space-y-2">
                  <label className="text-[8px] sm:text-xs font-black uppercase tracking-widest text-neutral-400 ml-1">Beskrivelse (Valgfritt)</label>
                  <div className="relative">
                    <MessageSquare className="absolute left-4 top-4 text-neutral-400 sm:w-[18px] sm:h-[18px]" size={16} />
                    <textarea 
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Hva har du gjort i dag?"
                      rows={3}
                      className="w-full pl-10 sm:pl-12 pr-4 py-3 sm:py-4 bg-white border border-neutral-200 rounded-xl sm:rounded-2xl focus:ring-2 focus:ring-neutral-900 outline-none font-bold resize-none text-sm sm:text-base"
                    />
                  </div>
                </div>

                <div className="sticky bottom-0 bg-neutral-50 pt-2 pb-2 sm:pb-0">
                  <button 
                    onClick={handleSave}
                    disabled={!selectedProjectId || !hours || isSaving}
                    className="w-full py-3 sm:py-5 bg-neutral-900 text-white rounded-xl sm:rounded-3xl font-bold hover:bg-neutral-800 transition-all shadow-xl shadow-neutral-200 disabled:opacity-50 flex items-center justify-center gap-2 sm:gap-3 text-sm sm:text-base"
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
