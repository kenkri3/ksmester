import React from 'react';
import { motion } from 'framer-motion';
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
              <Clock size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Aktivitetslogg</h2>
              <p className="text-neutral-500 text-sm font-medium">Fullstendig oversikt over hendelser i prosjektet</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-neutral-100 rounded-xl transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8">
          {projectId ? (
            <ProjectActivityLog projectId={projectId} />
          ) : (
            <div className="p-12 text-center">
              <p className="text-neutral-500">Velg et prosjekt for å se loggen.</p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default ActivityLogModal;
