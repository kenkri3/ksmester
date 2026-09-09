import React from 'react';
import { Hammer } from 'lucide-react';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showSubtitle?: boolean;
}

const Logo: React.FC<LogoProps> = ({ className = '', size = 'md', showSubtitle = false }) => {
  const sizes = {
    sm: 'w-7 h-7',
    md: 'w-9 h-9',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16'
  };

  const iconSizes = {
    sm: 15,
    md: 19,
    lg: 26,
    xl: 36
  };

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Heavy-duty Viking Shield + Craftsman Precision Hammer Emblem */}
      <div className={`${sizes[size]} bg-gradient-to-br from-zinc-900 via-[#12151f] to-[#0a0c12] border border-amber-500/40 rounded-xl flex items-center justify-center text-amber-500 shadow-xl shadow-amber-500/10 relative overflow-hidden group shrink-0`}>
        {/* Norse Geometric / Precision Grid Lines */}
        <svg 
          viewBox="0 0 100 100" 
          className="absolute inset-0 w-full h-full opacity-25 text-amber-500"
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2.5"
        >
          <polygon points="50,6 90,25 90,75 50,94 10,75 10,25" />
          <line x1="50" y1="6" x2="50" y2="94" strokeDasharray="4 3" />
          <line x1="10" y1="50" x2="90" y2="50" strokeDasharray="4 3" />
        </svg>
        
        {/* Precision Laser Hammer */}
        <div className="relative z-10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
          <Hammer size={iconSizes[size]} className="text-amber-400 drop-shadow-[0_2px_10px_rgba(245,158,11,0.6)] -rotate-12" />
        </div>

        {/* Ambient gold glow highlight */}
        <div className="absolute -top-4 -right-4 w-8 h-8 bg-amber-500/30 rounded-full blur-md" />
      </div>

      <div className="flex flex-col">
        <div className={`font-black tracking-tight flex items-baseline leading-none ${
          size === 'sm' ? 'text-base' : 
          size === 'md' ? 'text-xl' : 
          size === 'lg' ? 'text-3xl' : 
          'text-4xl'
        }`}>
          <span className="text-white font-black tracking-tight">Viking</span>
          <span className="text-amber-400 font-black ml-0.5">Mester</span>
          <span className="text-[10px] uppercase font-mono font-bold tracking-widest px-1.5 py-0.5 ml-2 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30">
            PRO
          </span>
        </div>
        {showSubtitle && (
          <span className="text-[10px] font-mono font-semibold text-zinc-400 uppercase tracking-widest mt-1">
            Powered by Vikingnet
          </span>
        )}
      </div>
    </div>
  );
};

export default Logo;
