import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, GraduationCap, CheckCircle2, Clock, AlertCircle, BookOpen, MessageSquare, User, TrendingUp } from 'lucide-react';
import { ApprenticeProfile, ApprenticeGoal } from '../types';
import { db, collection, onSnapshot, query, orderBy } from '../services/firebase';

interface ApprenticeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ApprenticeModal: React.FC<ApprenticeModalProps> = ({ isOpen, onClose }) => {
  const [selectedApprenticeId, setSelectedApprenticeId] = useState<string | null>(null);
  const [apprentices, setApprentices] = useState<ApprenticeProfile[]>([]);

  useEffect(() => {
    if (!isOpen) return;

    const q = query(collection(db, 'apprentice_profiles'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ApprenticeProfile));
      setApprentices(list);
      if (list.length > 0 && !selectedApprenticeId) {
        setSelectedApprenticeId(list[0].id);
      }
    });

    return () => unsubscribe();
  }, [isOpen]);

  const selectedApprentice = apprentices.find(a => a.id === selectedApprenticeId);

  const getStatusIcon = (status: ApprenticeGoal['status']) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="text-emerald-500" size={18} />;
      case 'in_progress': return <Clock className="text-amber-500" size={18} />;
      default: return <AlertCircle className="text-neutral-300" size={18} />;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-neutral-50 w-full max-w-4xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-8 border-b border-neutral-200 flex items-center justify-between bg-white">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-600 flex items-center justify-center text-white shadow-lg shadow-emerald-100">
              <GraduationCap size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Lærlingmodul</h2>
              <p className="text-neutral-500 text-sm font-medium">Oppfølging av lærlinger og opplæringsmål</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-neutral-100 rounded-xl transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto flex flex-col md:flex-row">
          {/* Sidebar - Apprentice List */}
          <div className="w-full md:w-72 border-r border-neutral-200 bg-white p-6 space-y-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-neutral-400">Dine Lærlinger</h3>
            <div className="space-y-2">
              {apprentices.map((apprentice) => (
                <button
                  key={apprentice.id}
                  onClick={() => setSelectedApprenticeId(apprentice.id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-all ${
                    selectedApprenticeId === apprentice.id 
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                      : 'hover:bg-neutral-50 text-neutral-600 border border-transparent'
                  }`}
                >
                  <div className="w-10 h-10 rounded-xl bg-neutral-100 flex items-center justify-center overflow-hidden">
                    <img src={`https://picsum.photos/seed/${apprentice.id}/40/40`} alt={apprentice.name} referrerPolicy="no-referrer" />
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-bold truncate">{apprentice.name}</div>
                    <div className="text-[10px] font-medium opacity-70">Startet: {apprentice.startDate}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Main Content - Goals & Progress */}
          <div className="flex-1 p-8">
            {selectedApprentice ? (
              <div className="space-y-8">
                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white p-5 rounded-3xl border border-neutral-200 shadow-sm">
                    <div className="text-xs font-black uppercase tracking-widest text-neutral-400 mb-2">Fullført</div>
                    <div className="text-2xl font-black text-emerald-600">
                      {selectedApprentice.goals.filter(g => g.status === 'completed').length} / {selectedApprentice.goals.length}
                    </div>
                  </div>
                  <div className="bg-white p-5 rounded-3xl border border-neutral-200 shadow-sm">
                    <div className="text-xs font-black uppercase tracking-widest text-neutral-400 mb-2">Mentor</div>
                    <div className="text-sm font-bold text-neutral-900">{selectedApprentice.mentorName}</div>
                  </div>
                  <div className="bg-white p-5 rounded-3xl border border-neutral-200 shadow-sm">
                    <div className="text-xs font-black uppercase tracking-widest text-neutral-400 mb-2">Neste Mål</div>
                    <div className="text-sm font-bold text-amber-600 truncate">
                      {selectedApprentice.goals.find(g => g.status === 'in_progress')?.title || 'Ingen aktive'}
                    </div>
                  </div>
                </div>

                {/* Goals List */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-black uppercase tracking-widest text-neutral-400">Læreplanmål</h3>
                    <button className="text-xs font-bold text-emerald-600 hover:underline">Legg til mål</button>
                  </div>
                  <div className="space-y-3">
                    {selectedApprentice.goals.map((goal) => (
                      <div key={goal.id} className="bg-white p-5 rounded-3xl border border-neutral-200 group hover:border-emerald-500 transition-all">
                        <div className="flex items-start gap-4">
                          <div className="mt-1">{getStatusIcon(goal.status)}</div>
                          <div className="flex-1">
                            <h4 className="font-bold text-neutral-900">{goal.title}</h4>
                            <p className="text-xs text-neutral-500 mt-1 leading-relaxed">{goal.description}</p>
                            <div className="flex items-center gap-4 mt-4">
                              <button className="flex items-center gap-1 text-[10px] font-bold text-neutral-400 hover:text-emerald-600 transition-colors">
                                <BookOpen size={12} /> Se dokumentasjon
                              </button>
                              <button className="flex items-center gap-1 text-[10px] font-bold text-neutral-400 hover:text-emerald-600 transition-colors">
                                <MessageSquare size={12} /> Gi tilbakemelding
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* AI Recommendation */}
                <div className="bg-emerald-900 rounded-3xl p-6 text-white flex items-start gap-4 shadow-xl shadow-emerald-100">
                  <div className="w-10 h-10 rounded-xl bg-emerald-800 flex items-center justify-center flex-shrink-0">
                    <TrendingUp size={20} className="text-emerald-400" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold mb-1">AI-Anbefaling for {selectedApprentice.name.split(' ')[0]}</h4>
                    <p className="text-xs text-emerald-100 leading-relaxed opacity-80">
                      Lærlingen viser god progresjon på praktiske oppgaver. Vi anbefaler å starte på målet "Bruk av nivelleringsutstyr" 
                      i neste uke under prosjektet "Enebolig Bjørklund".
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-12">
                <div className="w-20 h-20 bg-neutral-100 text-neutral-300 rounded-full flex items-center justify-center mb-6">
                  <User size={40} />
                </div>
                <h3 className="text-xl font-bold text-neutral-900">Ingen lærling valgt</h3>
                <p className="text-neutral-500">Velg en lærling fra listen til venstre for å se fremdrift og mål.</p>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default ApprenticeModal;
