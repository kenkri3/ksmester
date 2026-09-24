import React from 'react';
import { Project } from '../types';
import { VehicleFleetManager } from './VehicleFleetManager';

interface VehicleModalProps {
  isOpen: boolean;
  onClose: () => void;
  projects: Project[];
}

const VehicleModal: React.FC<VehicleModalProps> = ({ isOpen, onClose, projects }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="w-full max-w-6xl my-auto">
        <VehicleFleetManager 
          projects={projects} 
          isModal={true} 
          onClose={onClose} 
        />
      </div>
    </div>
  );
};

export default VehicleModal;
