import React from 'react';
import { Sparkles } from 'lucide-react';
import { cn } from '@/src/lib/utils';

interface MesterAIIconProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  animate?: boolean;
}

/**
 * 🌟 MesterAIIcon
 * Elegant, proprietært AI-ikon for VikingMester.
 * Bruker det universelle, åpne Sparkles-symbolet i Vikingnets egne
 * elektriske marineblå, indigo og fiolette signaturfarger med gyllen glød.
 */
export default function MesterAIIcon({
  size = 'md',
  className,
  animate = false
}: MesterAIIconProps) {
  const sizeMap = {
    xs: { box: 'w-5 h-5 rounded-lg', icon: 11 },
    sm: { box: 'w-6 h-6 rounded-xl', icon: 13 },
    md: { box: 'w-9 h-9 rounded-2xl', icon: 18 },
    lg: { box: 'w-11 h-11 rounded-2xl', icon: 22 },
    xl: { box: 'w-14 h-14 rounded-3xl', icon: 28 }
  };

  const currentSize = sizeMap[size] || sizeMap.md;

  return (
    <div
      className={cn(
        currentSize.box,
        "relative flex items-center justify-center shrink-0 overflow-hidden select-none",
        "bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600",
        "border border-white/20 shadow-md shadow-indigo-500/30",
        animate && "animate-pulse",
        className
      )}
      title="VikingMester AI"
    >
      {/* Subtil lysbrytning */}
      <div className="absolute -top-2 -right-2 w-5 h-5 bg-white/20 rounded-full blur-xs pointer-events-none" />

      {/* Universell, åpen AI-stjerne */}
      <Sparkles
        size={currentSize.icon}
        className="text-white fill-white/25 drop-shadow-[0_1px_4px_rgba(255,255,255,0.4)]"
      />
    </div>
  );
}
