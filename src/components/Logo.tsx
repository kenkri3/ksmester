import React from 'react';
import { Hammer } from 'lucide-react';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showSubtitle?: boolean;
  theme?: 'light' | 'dark';
}

const Logo: React.FC<LogoProps> = ({ 
  className = '', 
  size = 'md', 
  showSubtitle = false,
  theme = 'light'
}) => {
  const sizes = {
    sm: 'w-7 h-7',
    md: 'w-9 h-9',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16'
  };

  const iconSizes = {
    sm: 15,
    md: 19,
    lg: 25,
    xl: 34
  };

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Viking Shield + Craftsman Precision Hammer in Vikingnet signature Navy & Electric */}
      <div className={`${sizes[size]} bg-gradient-to-br from-navy-900 via-navy-850 to-navy-950 border border-electric-500/30 rounded-xl flex items-center justify-center text-electric-300 shadow-sm relative overflow-hidden group shrink-0`}>
        {/* Geometric Norse Precision Grid */}
        <svg 
          viewBox="0 0 100 100" 
          className="absolute inset-0 w-full h-full opacity-20 text-electric-300"
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
          <Hammer size={iconSizes[size]} className="text-electric-300 drop-shadow-[0_2px_8px_rgba(157,0,255,0.4)] -rotate-12" />
        </div>

        {/* Subtle Ambient Electric Glow Highlight */}
        <div className="absolute -top-2 -right-2 w-6 h-6 bg-electric-500/20 rounded-full blur-sm pointer-events-none" />
      </div>

      <div className="flex flex-col">
        <div className={`font-black tracking-tight flex items-baseline leading-none ${
          size === 'sm' ? 'text-base' : 
          size === 'md' ? 'text-xl' : 
          size === 'lg' ? 'text-3xl' : 
          'text-4xl'
        }`}>
          <span className={`${theme === 'dark' ? 'text-white' : 'text-navy-900'} font-extrabold tracking-tight`}>Viking</span>
          <span className="text-gradient-purple font-black ml-0.5">Mester</span>
          <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 ml-2 rounded-full bg-electric-50 text-electric-600 border border-electric-300/40 shadow-xs">
            PRO
          </span>
        </div>
        {showSubtitle && (
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">
            En del av Vikingnet
          </span>
        )}
      </div>
    </div>
  );
};

export default Logo;
