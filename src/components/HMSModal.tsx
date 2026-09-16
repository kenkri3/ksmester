import React from 'react';
import { motion } from 'motion/react';
import { X, ShieldCheck } from 'lucide-react';
import { Project } from '../types';
import HMSModule from './HMSModule';

interface HMSModalProps {
  isOpen: boolean;
  onClose: () => void;
  projects: Project[];
}

const HMSModal: React.FC<HMSModalProps> = ({ isOpen, onClose, projects }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-neutral-50 text-neutral-900 w-full max-w-5xl rounded-t-[2rem] sm:rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[90vh] pb-[env(safe-area-inset-bottom,0px)]"
      >
        {/* Header */}
        <div className="p-4 sm:p-8 border-b border-neutral-200 bg-white shrink-0">
          <div className="sm:hidden w-12 h-1.5 bg-neutral-300 rounded-full mx-auto -mt-1 mb-3 shrink-0" />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-emerald-600 flex items-center justify-center text-white shadow-lg shadow-emerald-100">
              <ShieldCheck size={20} className="sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-2xl font-bold tracking-tight text-neutral-900 truncate">HMS &amp; Mannskap</h2>
              <p className="text-neutral-500 text-[10px] sm:text-sm font-medium truncate">Administrer mannskapsliste, vernerunder og HMS-kort</p>
            </div>
          </div>
            <button onClick={onClose} aria-label="Lukk" title="Lukk" className="p-2 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 rounded-xl transition-colors shrink-0">
              <X size={20} className="sm:w-6 sm:h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 custom-scrollbar">
          <HMSModule projects={projects} />
        </div>
      </motion.div>
    </div>
  );
};

export default HMSModal;
