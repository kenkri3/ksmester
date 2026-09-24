'use client';

import React from 'react';
import {
  Hammer,
  Bot,
  Plus,
  Search,
  BookOpen,
  Zap,
  Shield,
  AlertTriangle,
  HardHat,
  Calculator,
  FolderArchive,
  Users,
  MessageSquare,
  LayoutGrid,
  Crown,
  Settings,
  LogOut,
  Menu,
  Mic,
  CornerDownLeft,
  ChevronDown,
  Sparkles,
  Radio,
  RadioTower,
  SlidersHorizontal,
  Flame,
  CheckCircle2
} from 'lucide-react';
import { cn } from '@/src/lib/utils';

interface WorkstationShowcaseProps {
  onInteract?: (actionText?: string) => void;
}

export default function WorkstationShowcase({ onInteract }: WorkstationShowcaseProps) {
  const suggestions = [
    { text: "Opprett endringsordre for ekstraarbeid (NS 8406)", action: "Varsle endringsordre iht. NS 8406" },
    { text: "Ta TEK17 bildekontroll av sluk og membran", action: "Hva er TEK17-kravene til sluk og membran?" },
    { text: "Snakk inn byggedagbok med Yr-sanntidsvær", action: "Før dagens byggedagbok med Yr-vær" },
    { text: "Sjekk om sone bad er klar for lukking", action: "Sjekk sjekkliste for lukkesperre" }
  ];

  return (
    <div className="w-full flex h-[580px] sm:h-[620px] lg:h-[680px] bg-[#0A101D] text-slate-200 select-none overflow-hidden relative font-sans">
      {/* 1. VENSTRE SIDEBAR (WorkstationSidebar i sin helhet - aldri avkuttet) */}
      <aside className="w-56 sm:w-60 lg:w-64 bg-[#0d1424] border-r border-white/10 flex flex-col shrink-0 overflow-hidden text-xs">
        {/* Logo & header */}
        <div className="p-3 sm:p-4 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-purple-500/20 shrink-0">
              <Hammer size={16} />
            </div>
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="font-black text-white text-sm tracking-tight truncate">VikingMester</span>
              <span className="px-1.5 py-0.2 rounded-md bg-purple-500/20 text-purple-300 font-bold text-[9px] border border-purple-500/30">
                AI
              </span>
            </div>
          </div>
          <div className="text-slate-500 hover:text-slate-300 cursor-pointer">
            <SlidersHorizontal size={14} />
          </div>
        </div>

        {/* Ny samtale-knapp */}
        <div className="p-3 pb-1">
          <button
            type="button"
            onClick={() => onInteract?.('Ny samtale')}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-gradient-to-r from-purple-600/30 to-electric-600/30 hover:from-purple-600/40 hover:to-electric-600/40 border border-purple-500/40 text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
          >
            <Plus size={15} className="text-purple-300" />
            <span>Ny samtale</span>
          </button>
        </div>

        {/* Søkefelt */}
        <div className="px-3 py-1.5">
          <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-white/5 border border-white/5 text-[11px] text-slate-400">
            <Search size={13} className="text-slate-500 shrink-0" />
            <span className="truncate flex-1">Søk i samtaler...</span>
            <span className="font-mono text-[9px] opacity-60 bg-black/40 px-1 py-0.5 rounded">⌘K</span>
          </div>
        </div>

        {/* Skrollbar modul-meny */}
        <div className="flex-1 overflow-y-auto custom-scrollbar px-2 py-2 space-y-3">
          {/* FAGSYSTEM seksjon */}
          <div className="space-y-0.5">
            <div className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-slate-500">
              Fagsystem
            </div>
            {[
              { icon: BookOpen, label: 'Byggedagbok & Timer', color: 'text-amber-400' },
              { icon: Zap, label: 'Endringsordrer (NS 8406)', color: 'text-purple-400', active: true },
              { icon: Shield, label: 'Lukkesperre (TEK17)', color: 'text-emerald-400' },
              { icon: AlertTriangle, label: 'Avvik & RUH', color: 'text-rose-400' },
              { icon: HardHat, label: 'HMS & Sikkerhet', color: 'text-teal-400' },
              { icon: Calculator, label: 'Tilbud & Kalkyle', color: 'text-blue-400' },
              { icon: FolderArchive, label: 'Dokumentarkiv & FDV', color: 'text-indigo-400' },
              { icon: Users, label: 'Kontakter & Team', color: 'text-cyan-400' },
              { icon: MessageSquare, label: 'Prosjekt- & Firmachatt', color: 'text-fuchsia-400' },
              { icon: LayoutGrid, label: '20+ moduler', color: 'text-slate-400' },
            ].map((item, idx) => {
              const Icon = item.icon;
              return (
                <div
                  key={idx}
                  onClick={() => onInteract?.(item.label)}
                  className={cn(
                    "flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-[11px] font-semibold transition-colors cursor-pointer group",
                    item.active
                      ? "bg-purple-600/20 text-purple-200 border border-purple-500/30"
                      : "text-slate-400 hover:text-white hover:bg-white/5"
                  )}
                >
                  <Icon size={14} className={cn("shrink-0", item.color)} />
                  <span className="truncate">{item.label}</span>
                </div>
              );
            })}
          </div>

          {/* SuperAdmin badge */}
          <div className="px-1">
            <div className="p-2 rounded-xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/25 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-amber-300 font-bold text-[10px]">
                <Crown size={12} className="text-amber-400" />
                <span>SuperAdmin Portal</span>
              </div>
              <span className="text-[8px] font-mono px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                SYS
              </span>
            </div>
          </div>

          {/* BYGGEPLASSER seksjon */}
          <div className="space-y-0.5">
            <div className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center justify-between">
              <span>Byggeplasser</span>
              <Plus size={11} className="text-slate-400 hover:text-white cursor-pointer" />
            </div>
            <div className="flex items-center justify-between px-2.5 py-1.5 rounded-xl bg-white/5 border border-white/5 text-[11px] font-bold text-white">
              <div className="flex items-center gap-2 truncate">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0 animate-pulse" />
                <span className="truncate">Renovering Bad Vidjeveien 21</span>
              </div>
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-mono">
                1 SJA
              </span>
            </div>
          </div>
        </div>

        {/* Innlogget bruker footer */}
        <div className="p-3 border-t border-white/5 bg-[#090d17] flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 text-white font-black text-xs flex items-center justify-center shrink-0">
              K
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold text-white truncate">Kenneth (Admin)</p>
              <p className="text-[9px] text-slate-500 truncate">Viking Bygg AS</p>
            </div>
          </div>
          <div className="flex items-center gap-1 text-slate-500">
            <Crown size={12} className="text-amber-400" />
            <Settings size={12} className="hover:text-white cursor-pointer" />
          </div>
        </div>
      </aside>

      {/* 2. HOVEDSTAGE (Chat & Autonom Agent) */}
      <main className="flex-1 flex flex-col bg-[#0A101D] overflow-hidden relative">
        {/* Top Navbar */}
        <div className="h-12 border-b border-white/10 px-4 flex items-center justify-between shrink-0 bg-[#0A101D]/90 backdrop-blur-md">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-white/5 text-slate-400 md:hidden">
              <Menu size={15} />
            </div>

            {/* Prosjektvelger pill */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#131b2e] border border-white/10 text-xs font-bold text-white shadow-xs cursor-pointer hover:border-purple-500/40 transition-colors">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="truncate max-w-[180px] sm:max-w-xs">Renovering Bad Vidjeveien 21</span>
              <ChevronDown size={13} className="text-slate-400 shrink-0" />
            </div>

            {/* Autonom status */}
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-[11px] font-bold text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>100% Autonom Agent</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 font-bold text-[11px] cursor-pointer hover:bg-amber-500/25 transition-colors"
            >
              <Crown size={12} className="text-amber-400" />
              <span className="hidden sm:inline">SuperAdmin</span>
            </button>

            <div className="w-8 h-8 rounded-full bg-purple-500/20 text-purple-300 font-bold text-xs flex items-center justify-center border border-purple-500/30">
              K
            </div>
          </div>
        </div>

        {/* Hovedinnhold i scenen */}
        <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 relative overflow-hidden pb-24 sm:pb-28">
          {/* Ambient Glow Bakgrunn */}
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 sm:w-96 h-80 sm:h-96 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />

          {/* 4-spiss AI Stjerne-ikon med myk gradient (1:1 med ekte Workstation) */}
          <div className="mb-4 relative group">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-tr from-purple-500 via-fuchsia-500 to-amber-300 p-0.5 shadow-xl shadow-purple-500/20 transition-transform group-hover:scale-105 duration-300 flex items-center justify-center">
              <div className="w-full h-full bg-[#0A101D] rounded-[14px] flex items-center justify-center">
                <Sparkles size={24} className="text-amber-300 animate-pulse" />
              </div>
            </div>
          </div>

          {/* Hovedtittel */}
          <div className="text-center space-y-1.5 max-w-lg mx-auto mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight">
              Mikrofonen er din, Ken
            </h1>
            <p className="text-xs sm:text-sm text-slate-400">
              Aktiv byggeplass: <strong className="text-slate-200 font-bold">Renovering Bad Vidjeveien 21</strong>
            </p>
          </div>

          {/* 4 Hurtigforslag-kort (1:1 med ekte app) */}
          <div className="w-full max-w-md sm:max-w-lg space-y-2 relative z-10">
            {suggestions.map((item, idx) => (
              <div
                key={idx}
                onClick={() => onInteract?.(item.action)}
                className="w-full flex items-center justify-between gap-3 p-3 sm:p-3.5 rounded-2xl bg-[#1e1f20]/80 hover:bg-[#1e1f20] border border-white/10 hover:border-white/20 text-left text-xs sm:text-sm text-slate-200 hover:text-white transition-all cursor-pointer group active:scale-98 shadow-sm backdrop-blur-xs"
              >
                <span className="truncate font-normal">{item.text}</span>
                <CornerDownLeft size={15} className="text-slate-400 group-hover:text-purple-300 shrink-0 transition-transform group-hover:-translate-x-0.5" />
              </div>
            ))}
          </div>
        </div>

        {/* 3. FLYTENDE GOOGLE GEMINI-PILLE I BUNNEN */}
        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-[#0A101D] via-[#0A101D]/90 to-transparent pt-6 pb-3 px-4 sm:px-8 pointer-events-none z-20">
          <div className="max-w-xl mx-auto w-full space-y-1.5 pointer-events-auto">
            {/* Pillen */}
            <div className="relative flex items-center bg-[#1e1f20] border border-white/10 hover:border-white/20 rounded-full p-1.5 sm:p-2 shadow-2xl transition-all">
              <button
                type="button"
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white flex items-center justify-center shrink-0 cursor-pointer transition-colors"
                title="Legg til vedlegg eller bildekontroll"
              >
                <Plus size={16} />
              </button>

              <div className="flex-1 px-3 text-xs sm:text-sm text-slate-400 cursor-text select-none">
                Spør MesterAI...
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  className="w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <Mic size={16} />
                </button>

                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-tr from-electric-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-electric-500/30">
                  <div className="flex items-center gap-0.5 h-3">
                    <span className="w-0.5 h-2 bg-white rounded-full animate-pulse" />
                    <span className="w-0.5 h-3 bg-white rounded-full animate-pulse delay-75" />
                    <span className="w-0.5 h-1.5 bg-white rounded-full animate-pulse delay-150" />
                  </div>
                </div>
              </div>
            </div>

            {/* Disclaimer */}
            <p className="text-[10px] text-center text-slate-500/80">
              MesterAI v2.6 kan gjøre feil. Kontroller viktige mål og NS 8406 endringsordrer.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
