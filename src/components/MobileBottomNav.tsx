import React from 'react';
import { motion } from 'motion/react';
import { 
  LayoutDashboard, 
  Briefcase, 
  ShieldCheck, 
  Menu, 
  Plus, 
  Zap,
  HardHat,
  User as UserIcon,
  Sparkles
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { useAuth } from '../hooks/useAuth';

interface MobileBottomNavProps {
  currentView: string;
  activeTab?: string;
  onNavigate: (view: string, tab?: string) => void;
  onOpenQuickActions: () => void;
  onOpenMenu: () => void;
}

export default function MobileBottomNav({
  currentView,
  activeTab,
  onNavigate,
  onOpenQuickActions,
  onOpenMenu
}: MobileBottomNavProps) {
  const { user } = useAuth();

  const isHomeActive = currentView === 'dashboard' && (!activeTab || activeTab === 'oversikt');
  const isProjectsActive = currentView === 'dashboard' && activeTab === 'prosjekter';
  const isHmsActive = currentView === 'mobile' || (currentView === 'dashboard' && activeTab === 'hms');
  const isMenuActive = currentView === 'settings' || currentView === 'super-admin';

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-2xl border-t border-neutral-200/90 shadow-[0_-10px_35px_rgba(0,0,0,0.06)] pb-[env(safe-area-inset-bottom,0px)]">
      <div className="flex items-center justify-around px-2 h-16 relative">
        
        {/* 1. Hjem (Oversikt) */}
        <button
          onClick={() => onNavigate('dashboard', 'oversikt')}
          className={cn(
            "flex flex-col items-center justify-center flex-1 py-1 transition-all active:scale-90",
            isHomeActive ? "text-electric-600 font-bold" : "text-neutral-500 hover:text-neutral-800"
          )}
        >
          <div className="relative">
            <LayoutDashboard size={20} strokeWidth={isHomeActive ? 2.5 : 1.8} />
            {isHomeActive && (
              <motion.div
                layoutId="activeBottomDot"
                className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-electric-500 rounded-full"
              />
            )}
          </div>
          <span className="text-[10px] mt-1 tracking-tight font-medium">Oversikt</span>
        </button>

        {/* 2. Prosjekter */}
        <button
          onClick={() => onNavigate('dashboard', 'prosjekter')}
          className={cn(
            "flex flex-col items-center justify-center flex-1 py-1 transition-all active:scale-90",
            isProjectsActive ? "text-electric-600 font-bold" : "text-neutral-500 hover:text-neutral-800"
          )}
        >
          <div className="relative">
            <Briefcase size={20} strokeWidth={isProjectsActive ? 2.5 : 1.8} />
            {isProjectsActive && (
              <motion.div
                layoutId="activeBottomDot"
                className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-electric-500 rounded-full"
              />
            )}
          </div>
          <span className="text-[10px] mt-1 tracking-tight font-medium">Prosjekter</span>
        </button>

        {/* 3. Center Floating Action Button (+) */}
        <div className="flex-1 flex justify-center -mt-6">
          <button
            onClick={onOpenQuickActions}
            className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-electric-600 to-electric-400 text-white flex items-center justify-center shadow-purple-cta border-2 border-white active:scale-90 transition-all group"
            title="Åpne hurtighandlinger"
          >
            <Plus size={24} className="group-hover:rotate-90 transition-transform duration-200" strokeWidth={2.6} />
          </button>
        </div>

        {/* 4. HMS & SJA */}
        <button
          onClick={() => onNavigate('mobile')}
          className={cn(
            "flex flex-col items-center justify-center flex-1 py-1 transition-all active:scale-90",
            isHmsActive ? "text-electric-600 font-bold" : "text-neutral-500 hover:text-neutral-800"
          )}
        >
          <div className="relative">
            <ShieldCheck size={20} strokeWidth={isHmsActive ? 2.5 : 1.8} />
            {isHmsActive && (
              <motion.div
                layoutId="activeBottomDot"
                className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-electric-500 rounded-full"
              />
            )}
          </div>
          <span className="text-[10px] mt-1 tracking-tight font-medium">HMS/Felt</span>
        </button>

        {/* 5. Meny / Profil */}
        <button
          onClick={onOpenMenu}
          className={cn(
            "flex flex-col items-center justify-center flex-1 py-1 transition-all active:scale-90",
            isMenuActive ? "text-electric-600 font-bold" : "text-neutral-500 hover:text-neutral-800"
          )}
        >
          <div className="relative">
            {user?.photoURL ? (
              <img 
                src={user.photoURL} 
                alt="User" 
                className="w-5 h-5 rounded-full object-cover border border-neutral-300"
                referrerPolicy="no-referrer"
              />
            ) : (
              <Menu size={20} strokeWidth={isMenuActive ? 2.5 : 1.8} />
            )}
            {isMenuActive && (
              <motion.div
                layoutId="activeBottomDot"
                className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-electric-500 rounded-full"
              />
            )}
          </div>
          <span className="text-[10px] mt-1 tracking-tight font-medium">Meny</span>
        </button>

      </div>
    </nav>
  );
}
