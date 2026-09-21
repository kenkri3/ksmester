'use client';

import React from 'react';
import { Crown, ArrowLeft, X, Eye, Layers, ShieldCheck } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { PLANS, PlanId } from '../config/plans';
import { cn } from '../lib/utils';
import { toast } from 'sonner';

export default function AdminSimulationBar() {
  const { 
    isPlatformOwner, 
    impersonatedCompanyId, 
    simulatedPlan, 
    setSimulatedPlan, 
    stopImpersonation 
  } = useAuth();

  // Kun synlig for Kenneth/plattformeier når han tester en pakke eller impersonerer en kunde
  if (!isPlatformOwner || (!impersonatedCompanyId && !simulatedPlan)) {
    return null;
  }

  const currentPlanConfig = simulatedPlan ? PLANS[simulatedPlan as PlanId] : null;

  const handleReturnToSuperAdmin = () => {
    // Stopp eventuell simulering og gå til SuperAdmin
    setSimulatedPlan(null);
    window.dispatchEvent(new CustomEvent('navigate_view', { detail: { view: 'super-admin' } }));
    toast.success('Returnert til SuperAdmin Portal');
  };

  const handleExitAll = () => {
    setSimulatedPlan(null);
    stopImpersonation();
    window.dispatchEvent(new CustomEvent('navigate_view', { detail: { view: 'super-admin' } }));
    toast.success('Avsluttet alle testmoduser. Tilbake i SuperAdmin.');
  };

  return (
    <aside aria-label="SuperAdmin forhåndsvisning" className="sticky top-0 z-[9999] bg-gradient-to-r from-amber-950 via-neutral-900 to-amber-950 text-white border-b-2 border-amber-500/80 shadow-2xl px-3 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
      {/* Venstre: Status & hva som testes */}
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-400/50 flex items-center justify-center text-amber-400 shrink-0">
          <Crown size={16} />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-black text-amber-300 uppercase tracking-widest text-[10px]">
              👑 SuperAdmin Simulator
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
          </div>
          <p className="text-slate-200 text-xs font-semibold truncate">
            {impersonatedCompanyId && (
              <span>Kunde: <strong className="text-white">{impersonatedCompanyId}</strong> • </span>
            )}
            {currentPlanConfig ? (
              <span>Forhåndsviser: <strong className="text-amber-300">{currentPlanConfig.name}</strong> ({currentPlanConfig.userLimitLabel})</span>
            ) : (
              <span>Viser som kunde</span>
            )}
          </p>
        </div>
      </div>

      {/* Midten: Hurtigbytte mellom pakkeløsninger */}
      <div className="flex items-center gap-1.5 bg-black/40 p-1 rounded-xl border border-white/10 overflow-x-auto">
        <span className="text-[10px] font-bold text-slate-400 px-2 flex items-center gap-1">
          <Layers size={12} /> Test pakke:
        </span>
        {(['solo', 'team', 'entreprenor'] as PlanId[]).map((planId) => {
          const p = PLANS[planId];
          const isActive = simulatedPlan === planId;
          return (
            <button
              key={planId}
              type="button"
              onClick={() => {
                setSimulatedPlan(planId);
                toast.success(`Forhåndsviser nå ${p.name} (${p.userLimitLabel})`);
              }}
              className={cn(
                "px-2.5 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer",
                isActive
                  ? "bg-amber-400 text-neutral-950 shadow-sm"
                  : "text-slate-300 hover:text-white hover:bg-white/10"
              )}
            >
              {p.badge || p.name}
            </button>
          );
        })}
      </div>

      {/* Høyre: Urokkelige navigasjonsknapper tilbake til SuperAdmin */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={handleReturnToSuperAdmin}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-black rounded-xl text-xs transition-all shadow-md cursor-pointer"
          title="Gå direkte til SuperAdmin kontrollpanel"
        >
          <ArrowLeft size={14} />
          <span>← Tilbake til SuperAdmin</span>
        </button>

        <button
          type="button"
          onClick={handleExitAll}
          className="flex items-center gap-1 px-2.5 py-1.5 bg-white/10 hover:bg-rose-600/80 text-white rounded-xl text-xs font-medium transition-all cursor-pointer border border-white/10"
          title="Avslutt simulator og logg ut av kundevisning"
        >
          <X size={13} />
          <span className="hidden sm:inline">Avslutt visning</span>
        </button>
      </div>
    </aside>
  );
}
