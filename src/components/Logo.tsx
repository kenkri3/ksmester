import React from 'react';
import { Hammer, ShieldCheck } from 'lucide-react';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showSubtitle?: boolean;
}

const Logo: React.FC<LogoProps> = ({ className = '', size = 'md', showSubtitle = false }) => {
  const sizes = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16'
  };

  const iconSizes = {
    sm: 14,
    md: 18,
    lg: 26,
    xl: 36
  };

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      {/* Heavy-duty Viking Shield + Craftsman Hammer Emblem */}
      <div className={`${sizes[size]} bg-gradient-to-br from-zinc-900 via-zinc-950 to-black border border-amber-500/40 rounded-xl flex items-center justify-center text-amber-500 shadow-lg shadow-amber-500/10 relative overflow-hidden group`}>
        {/* Norse Geometric / Precision Grid Lines */}
        <svg 
          viewBox="0 0 100 100" 
          className="absolute inset-0 w-full h-full opacity-30 text-amber-500"
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2.5"
        >
          <polygon points="50,5 90,25 90,75 50,95 10,75 10,25" />
          <line x1="50" y1="5" x2="50" y2="95" strokeDasharray="4 3" />
          <line x1="10" y1="50" x2="90" y2="50" strokeDasharray="4 3" />
        </svg>
        
        {/* Dual Tool Icon: Hammer overlaid with precision */}
        <div className="relative z-10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
          <Hammer size={iconSizes[size]} className="text-amber-400 drop-shadow-[0_2px_8px_rgba(245,158,11,0.5)] -rotate-12" />
        </div>

        {/* Ambient gold corner reflection */}
        <div className="absolute -top-6 -right-6 w-12 h-12 bg-amber-500/20 rounded-full blur-md" />
      </div>

      <div className="flex flex-col">
        <span className={`font-black tracking-tight flex items-baseline ${
          size === 'sm' ? 'text-base' : 
          size === 'md' ? 'text-xl' : 
          size === 'lg' ? 'text-3xl' : 
          'text-4xl'
        }`}>
          <span className="text-zinc-900 dark:text-white font-extrabold tracking-tight">Viking</span>
          <span className="text-amber-500 dark:text-amber-400 font-black ml-0.5">Mester</span>
          <span className="text-[10px] uppercase font-bold tracking-widest px-1.5 py-0.5 ml-2 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            PRO
          </span>
        </span>
        {showSubtitle && (
          <span className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest -mt-0.5">
            Powered by Vikingnet
          </span>
        )}
      </div>
    </div>
  );
};

export default Logo;
