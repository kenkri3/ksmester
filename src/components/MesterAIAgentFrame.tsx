'use client';

import React, { useState, useRef } from 'react';
import { 
  Sparkles, 
  RefreshCw, 
  ExternalLink, 
  Maximize2, 
  Minimize2, 
  Loader2,
  ShieldCheck,
  Zap,
  Building2
} from 'lucide-react';
import { cn } from '@/src/lib/utils';

interface MesterAIAgentFrameProps {
  className?: string;
  selectedProjectName?: string;
  initialHeight?: string;
}

const AGENT_LANDING_URL = 'https://agentic.botsify.com/web-bot/landing/UDuz6jJYyXeVli7LuNyWqNUJHORWZQBDZYeF3sKs';

export default function MesterAIAgentFrame({
  className,
  selectedProjectName,
  initialHeight = 'h-full'
}: MesterAIAgentFrameProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleRefresh = () => {
    setIsLoading(true);
    setIframeKey(prev => prev + 1);
  };

  const handleOpenExternal = () => {
    window.open(AGENT_LANDING_URL, '_blank', 'noopener,noreferrer');
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  return (
    <div 
      ref={containerRef}
      className={cn(
        "flex flex-col bg-white overflow-hidden transition-all duration-300",
        isFullscreen 
          ? "fixed inset-0 z-50 rounded-none shadow-2xl" 
          : "rounded-2xl border border-slate-200/90 shadow-sm",
        initialHeight,
        className
      )}
    >
      {/* 🌟 MesterAI White-label Header */}
      <div className="px-4 py-2.5 bg-gradient-to-r from-slate-50 via-white to-electric-50/20 border-b border-slate-200/80 flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-electric-600 to-electric-500 text-white flex items-center justify-center shadow-xs shrink-0">
            <Sparkles size={16} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-black text-navy-950 truncate">
                MesterAI Prosjektpilot
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200/70 text-emerald-700 text-[10px] font-bold shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Sanntid aktiv
              </span>
            </div>
            <p className="text-[11px] text-slate-500 truncate hidden sm:block">
              {selectedProjectName 
                ? `Aktiv på prosjekt: ${selectedProjectName}` 
                : 'Autonom byggmesteragent for timeføring, byggedagbok og TEK17'}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={handleRefresh}
            className="p-1.5 rounded-lg text-slate-500 hover:text-navy-900 hover:bg-slate-100 transition-colors cursor-pointer"
            title="Last inn agenten på nytt"
          >
            <RefreshCw size={14} className={isLoading ? "animate-spin text-electric-600" : ""} />
          </button>
          <button
            type="button"
            onClick={toggleFullscreen}
            className="p-1.5 rounded-lg text-slate-500 hover:text-navy-900 hover:bg-slate-100 transition-colors cursor-pointer hidden sm:block"
            title={isFullscreen ? "Avslutt fullskjerm" : "Åpne i fullskjerm"}
          >
            {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
          <button
            type="button"
            onClick={handleOpenExternal}
            className="p-1.5 rounded-lg text-slate-500 hover:text-electric-600 hover:bg-slate-100 transition-colors cursor-pointer"
            title="Åpne i eget vindu"
          >
            <ExternalLink size={14} />
          </button>
        </div>
      </div>

      {/* 🚀 Agent iFrame Container */}
      <div className="relative flex-1 w-full bg-slate-50 overflow-hidden min-h-[500px]">
        {isLoading && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-white/90 backdrop-blur-xs">
            <div className="w-10 h-10 rounded-2xl bg-electric-50 border border-electric-100 flex items-center justify-center text-electric-600 shadow-xs animate-bounce">
              <Sparkles size={20} />
            </div>
            <div className="text-center">
              <p className="text-xs font-bold text-navy-950">Kobler til MesterAI...</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Laster inn autonom prosjektpilot</p>
            </div>
          </div>
        )}

        <iframe
          key={iframeKey}
          src={AGENT_LANDING_URL}
          onLoad={() => setIsLoading(false)}
          allow="microphone; camera; clipboard-write; autoplay; fullscreen"
          title="MesterAI Prosjektpilot"
          className="w-full h-full border-0 block"
          style={{ minHeight: '100%', height: '100%' }}
        />
      </div>
    </div>
  );
}
