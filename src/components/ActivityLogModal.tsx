import React from 'react';
import { motion } from 'motion/react';
import { X, Clock } from 'lucide-react';
import ProjectActivityLog from './ProjectActivityLog';

interface ActivityLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId?: string;
}

const ActivityLogModal: React.FC<ActivityLogModalProps> = ({ isOpen, onClose, projectId }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md">
      <motion.div 
        initial={{ opacity: 0, scale: 0.98, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-[#0B0F17] text-white border border-slate-800 w-full max-w-4xl rounded-t-[2rem] sm:rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[90vh] pb-[env(safe-area-inset-bottom,0px)]"
      >
        {/* Mobile Grab Handle */}
        <div className="sm:hidden w-12 h-1.5 bg-slate-700 rounded-full mx-auto mt-3 mb-1 shrink-0" />

        {/* Header */}
        <div className="p-4 sm:p-8 border-b border-slate-800 flex items-center justify-between bg-[#131722] shrink-0">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-emerald-600 flex items-center justify-center text-white shadow-lg shadow-emerald-950/40 shrink-0">
              <Clock size={20} className="sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg sm:text-2xl font-bold tracking-tight text-white truncate">Aktivitetslogg</h2>
              <p className="text-slate-400 text-xs sm:text-sm font-medium truncate">Fullstendig oversikt over hendelser i prosjektet</p>
            </div>
          </div>
          <button onClick={onClose} aria-label="Lukk" title="Lukk" className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors shrink-0 cursor-pointer">
            <X size={20} className="sm:w-6 sm:h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 custom-scrollbar">
          {projectId ? (
            <ProjectActivityLog projectId={projectId} />
          ) : (
            <div className="p-8 sm:p-12 text-center">
              <p className="text-neutral-500 text-sm">Velg et prosjekt for å se loggen.</p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default ActivityLogModal;
