import React from 'react';
import { Hammer } from 'lucide-react';
import { cn } from '@/src/lib/utils';

interface MesterAIIconProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  animate?: boolean;
}

/**
 * 🛡️ MesterAIIcon
 * Offisielt, proprietært merkevare-ikon for VikingMester AI.
 * Kombinerer norrønt presisjonsskjold, fagarbeider-hammer og en pulserende AI-kjerne.
 * 100% uavhengig og trygt fra eksterne varemerker (f.eks. Google Gemini).
 */
export default function MesterAIIcon({
  size = 'md',
  className,
  animate = false
}: MesterAIIconProps) {
  const sizeMap = {
    xs: { box: 'w-5 h-5 rounded-lg', icon: 11, shield: 'w-full h-full' },
    sm: { box: 'w-6 h-6 rounded-xl', icon: 13, shield: 'w-full h-full' },
    md: { box: 'w-9 h-9 rounded-2xl', icon: 18, shield: 'w-full h-full' },
    lg: { box: 'w-11 h-11 rounded-2xl', icon: 22, shield: 'w-full h-full' },
    xl: { box: 'w-14 h-14 rounded-3xl', icon: 28, shield: 'w-full h-full' }
  };

  const currentSize = sizeMap[size] || sizeMap.md;

  return (
    <div
      className={cn(
        currentSize.box,
        "relative flex items-center justify-center shrink-0 overflow-hidden select-none",
        "bg-gradient-to-br from-[#0c1830] via-[#12234c] to-[#1e1b4b]",
        "border border-blue-400/40 shadow-md shadow-blue-500/25",
        className
      )}
      title="VikingMester AI"
    >
      {/* 1. Norrønt presisjonsgitter (SVG skjoldkontur) */}
      <svg
        viewBox="0 0 100 100"
        className="absolute inset-0 w-full h-full text-blue-400/30"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
      >
        <polygon points="50,8 90,26 90,74 50,92 10,74 10,26" />
        <line x1="50" y1="8" x2="50" y2="92" strokeDasharray="4 3" strokeWidth="2" />
        <line x1="10" y1="50" x2="90" y2="50" strokeDasharray="4 3" strokeWidth="2" />
      </svg>

      {/* 2. Subtil nordisk lysbrytning (Ambient cyan/electric glow) */}
      <div className="absolute -top-3 -right-3 w-8 h-8 bg-blue-500/30 rounded-full blur-md pointer-events-none" />
      <div className="absolute -bottom-3 -left-3 w-8 h-8 bg-indigo-500/20 rounded-full blur-md pointer-events-none" />

      {/* 3. Fagarbeider-hammer med presisjonsvinkel */}
      <div className={cn(
        "relative z-10 flex items-center justify-center transition-transform duration-300",
        animate && "animate-pulse"
      )}>
        <Hammer
          size={currentSize.icon}
          className="text-blue-200 drop-shadow-[0_2px_8px_rgba(59,130,246,0.6)] -rotate-12"
        />

        {/* 4. Gylden AI-kjerne i hammerhodet */}
        <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_8px_#fbbf24] animate-pulse" />
      </div>
    </div>
  );
}
