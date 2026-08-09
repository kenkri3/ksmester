import React from 'react';
import { ShieldCheck } from 'lucide-react';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const Logo: React.FC<LogoProps> = ({ className, size = 'md' }) => {
  const sizes = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
    xl: 'w-20 h-20'
  };

  const iconSizes = {
    sm: 14,
    md: 20,
    lg: 28,
    xl: 48
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className={`${sizes[size]} bg-emerald-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-emerald-200 relative overflow-hidden group`}>
        {/* Background Pattern: Stylized Stave Church / AI Grid */}
        <svg 
          viewBox="0 0 100 100" 
          className="absolute inset-0 w-full h-full opacity-20 text-white"
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2"
        >
          <path d="M10 90 L50 10 L90 90" />
          <path d="M30 90 L50 50 L70 90" />
          <circle cx="50" cy="40" r="5" fill="currentColor" />
          <path d="M50 40 L20 70" strokeDasharray="4 2" />
          <path d="M50 40 L80 70" strokeDasharray="4 2" />
        </svg>
        
        <ShieldCheck size={iconSizes[size]} className="relative z-10 group-hover:scale-110 transition-transform" />
      </div>
      <span className={`font-bold tracking-tight ${
        size === 'sm' ? 'text-sm' : 
        size === 'md' ? 'text-xl' : 
        size === 'lg' ? 'text-3xl' : 
        'text-5xl'
      }`}>
        <span className="text-inherit">KS Mester</span><span className="text-emerald-600">AI</span>
      </span>
    </div>
  );
};

export default Logo;
