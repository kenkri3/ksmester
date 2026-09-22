'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Logo from './Logo';
import { 
  Menu, 
  X, 
  ArrowRight, 
  ShieldCheck, 
  Sparkles, 
  ChevronDown,
  CheckCircle2,
  FileSignature,
  Camera,
  Lock,
  FileCheck,
  Users,
  AlertTriangle,
  Package,
  FolderKanban,
  Zap,
  Clock
} from 'lucide-react';

export function PublicHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [featuresOpen, setFeaturesOpen] = useState(false);

  return (
    <>
      {/* 🏆 THE DREAM TICKER: Slutt på kveldsarbeid og tapte penger */}
      <div className="bg-slate-950 text-white py-1.5 px-3 sm:px-4 border-b border-white/10 relative z-50">
        {/* Desktop */}
        <div className="hidden sm:flex items-center justify-center gap-3 lg:gap-5 text-[11px] font-semibold tracking-wide whitespace-nowrap overflow-hidden">
          <span className="flex items-center gap-1.5 text-amber-400 font-black tracking-wider uppercase shrink-0">
            <Sparkles size={12} className="text-amber-400" />
            <span>DRØMMEN OM FRIHET:</span>
          </span>
          <span className="text-slate-300 font-medium truncate">
            Slutt på kveldsarbeid foran PC etter 10 timer på byggeplassen.
          </span>
          <span className="text-emerald-400 font-extrabold flex items-center gap-1 shrink-0">
            <CheckCircle2 size={12} />
            <span>Få betalt for alle endringer (NS 8406)</span>
          </span>
          <span className="text-electric-300 font-extrabold hidden lg:inline shrink-0">
            ⚡ 100% Autonom MesterAI
          </span>
          <span className="text-amber-300 bg-amber-500/20 border border-amber-400/40 px-2 py-0.5 rounded-full text-[9px] font-black uppercase shrink-0">
            14 dager gratis • 0,- etablering
          </span>
        </div>

        {/* Mobile (1 ren linje) */}
        <div className="sm:hidden flex items-center justify-between gap-1.5 text-[10.5px] font-semibold whitespace-nowrap overflow-hidden px-1">
          <div className="flex items-center gap-1.5 min-w-0">
            <Sparkles size={11} className="text-amber-400 shrink-0" />
            <span className="text-slate-200 truncate">
              Slutt på kveldsarbeid • Få betalt for endringer
            </span>
          </div>
          <span className="text-amber-300 font-bold shrink-0 text-[10px]">
            14 dgr gratis ➔
          </span>
        </div>
      </div>

      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo & Vision Tag */}
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2.5">
              <Logo size="md" />
            </Link>
            <span className="hidden lg:inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              100% AUTONOM BYGGELEDER
            </span>
          </div>

          {/* Desktop Nav - SELLER DRØMMEN */}
          <nav className="hidden md:flex items-center gap-5 text-xs lg:text-sm font-semibold text-slate-700">
            {/* Superkrefter / Autonome Løsninger Dropdown */}
            <div className="relative group">
              <button
                onClick={() => setFeaturesOpen(!featuresOpen)}
                className="flex items-center gap-1 hover:text-electric-600 transition-colors py-2 font-bold cursor-pointer"
              >
                <span>Autonome Superkrefter</span>
                <ChevronDown size={14} className="transition-transform group-hover:rotate-180 text-slate-400" />
              </button>
              <div className="absolute left-0 top-full hidden group-hover:block hover:block w-96 p-2 bg-white rounded-2xl shadow-2xl border border-slate-200 mt-1 space-y-1 z-50">
                <Link
                  href="/ks-system"
                  className="block p-2.5 rounded-xl hover:bg-slate-50 transition-colors group/item"
                >
                  <div className="flex items-start gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 group-hover/item:bg-emerald-600 group-hover/item:text-white transition-colors">
                      <Zap size={16} />
                    </div>
                    <div>
                      <div className="font-bold text-navy-900 text-xs flex items-center gap-1.5">
                        <span>Autonom Tilbud-til-KS</span>
                        <span className="text-[9px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.2 rounded">Magisk</span>
                      </div>
                      <div className="text-[11px] text-slate-500 leading-tight">
                        Signert tilbud oppretter kontrakt, prosjekt og sjekklister automatisk på 3 sekunder.
                      </div>
                    </div>
                  </div>
                </Link>

                <Link
                  href="/prosjektstyring"
                  className="block p-2.5 rounded-xl hover:bg-slate-50 transition-colors group/item"
                >
                  <div className="flex items-start gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center shrink-0 group-hover/item:bg-rose-600 group-hover/item:text-white transition-colors">
                      <FileSignature size={16} />
                    </div>
                    <div>
                      <div className="font-bold text-navy-900 text-xs flex items-center gap-1.5">
                        <span>Tale-til-Endringsordre (NS 8406)</span>
                        <span className="text-[9px] bg-rose-100 text-rose-800 font-bold px-1.5 py-0.2 rounded">Få betalt</span>
                      </div>
                      <div className="text-[11px] text-slate-500 leading-tight">
                        Snakk inn endringen på 15 sek. Kunden signerer på SMS før arbeidet starter.
                      </div>
                    </div>
                  </div>
                </Link>

                <Link
                  href="/avvikshandtering"
                  className="block p-2.5 rounded-xl hover:bg-slate-50 transition-colors group/item"
                >
                  <div className="flex items-start gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center shrink-0 group-hover/item:bg-purple-600 group-hover/item:text-white transition-colors">
                      <Lock size={16} />
                    </div>
                    <div>
                      <div className="font-bold text-navy-900 text-xs flex items-center gap-1.5">
                        <span>Tverrfaglig Lukkesperre (TEK17)</span>
                        <span className="text-[9px] bg-purple-100 text-purple-800 font-bold px-1.5 py-0.2 rounded">Null rivning</span>
                      </div>
                      <div className="text-[11px] text-slate-500 leading-tight">
                        Vegg låses mot plating inntil rør & el er fotokvittert. Full trygghet mot tabber.
                      </div>
                    </div>
                  </div>
                </Link>

                <Link
                  href="/ks-system#fdv"
                  className="block p-2.5 rounded-xl hover:bg-slate-50 transition-colors group/item"
                >
                  <div className="flex items-start gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 group-hover/item:bg-blue-600 group-hover/item:text-white transition-colors">
                      <FileCheck size={16} />
                    </div>
                    <div>
                      <div className="font-bold text-navy-900 text-xs flex items-center gap-1.5">
                        <span>1-Klikk Slutt-FDV til Boligmappa</span>
                        <span className="text-[9px] bg-blue-100 text-blue-800 font-bold px-1.5 py-0.2 rounded">Slutt på permer</span>
                      </div>
                      <div className="text-[11px] text-slate-500 leading-tight">
                        Generer all dokumentasjon og bilder inn i en fiks ferdig rapport med ett tastetrykk.
                      </div>
                    </div>
                  </div>
                </Link>

                <Link
                  href="/hms"
                  className="block p-2.5 rounded-xl hover:bg-slate-50 transition-colors group/item"
                >
                  <div className="flex items-start gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 group-hover/item:bg-amber-600 group-hover/item:text-white transition-colors">
                      <ShieldCheck size={16} />
                    </div>
                    <div>
                      <div className="font-bold text-navy-900 text-xs">HMS, SJA & Yr-sanntidsvær</div>
                      <div className="text-[11px] text-slate-500 leading-tight">
                        Lovpålagt internkontroll og risikovurdering ferdig dokumentert på sekunder.
                      </div>
                    </div>
                  </div>
                </Link>

                <Link
                  href="/stoffkartotek"
                  className="block p-2.5 rounded-xl hover:bg-slate-50 transition-colors group/item"
                >
                  <div className="flex items-start gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center shrink-0 group-hover/item:bg-teal-600 group-hover/item:text-white transition-colors">
                      <Package size={16} />
                    </div>
                    <div>
                      <div className="font-bold text-navy-900 text-xs">Digitalt Stoffkartotek (Offline)</div>
                      <div className="text-[11px] text-slate-500 leading-tight">
                        Sikkerhetsdatablader offline på byggeplassen for alle ansatte og lærlinger.
                      </div>
                    </div>
                  </div>
                </Link>
              </div>
            </div>

            {/* Priser (fra 690,- / spar 40t) */}
            <Link 
              href="/priser" 
              className="hover:text-electric-600 transition-colors flex items-center gap-1.5 font-bold"
            >
              <span>Priser</span>
              <span className="text-[10px] font-black uppercase text-electric-700 bg-electric-50 border border-electric-200 px-2 py-0.5 rounded-full">
                Fra 690,-
              </span>
            </Link>

            {/* Kundeportal */}
            <Link 
              href="/?portal=demo" 
              className="hover:text-electric-600 transition-colors flex items-center gap-1 text-slate-700"
            >
              <Users size={14} className="text-emerald-600" />
              <span>Kundeportal</span>
            </Link>

            {/* FAQ */}
            <Link href="/faq" className="hover:text-electric-600 transition-colors">
              FAQ
            </Link>

            {/* Om oss */}
            <Link href="/om-oss" className="hover:text-electric-600 transition-colors">
              Om oss
            </Link>

            {/* Kontakt */}
            <Link href="/kontakt" className="hover:text-electric-600 transition-colors">
              Kontakt
            </Link>
          </nav>

          {/* Action buttons */}
          <div className="hidden sm:flex items-center gap-2.5 shrink-0">
            <Link
              href="/?login=true"
              className="whitespace-nowrap shrink-0 px-3 py-2 text-xs font-bold text-slate-700 hover:text-navy-900 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Logg inn
            </Link>
            <Link
              href="/?action=demo"
              className="whitespace-nowrap shrink-0 px-4 py-2 text-xs font-extrabold text-white bg-gradient-to-r from-electric-500 to-electric-400 hover:from-electric-400 hover:to-electric-300 rounded-xl transition-all shadow-md shadow-electric-500/25 flex items-center gap-1.5 active:scale-95"
            >
              <Sparkles size={14} className="text-amber-300 animate-pulse shrink-0" />
              <span>Start 14 dager gratis</span>
            </Link>
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-slate-700 hover:text-navy-900 rounded-lg hover:bg-slate-100"
            aria-label="Meny"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile nav modal/dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-b border-slate-200 px-4 pt-2 pb-6 space-y-3">
            <div className="font-bold text-xs uppercase tracking-wider text-slate-400 pt-2 flex items-center justify-between">
              <span>Drømmen om frihet</span>
              <span className="text-emerald-600 font-bold text-[10px]">100% Autonom</span>
            </div>
            
            <Link
              href="/ks-system"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-sm font-semibold text-navy-900 py-1"
            >
              ⚡ Autonom Tilbud-til-KS
            </Link>
            <Link
              href="/prosjektstyring"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-sm font-semibold text-navy-900 py-1"
            >
              🎙️ Tale-til-Endringsordre (NS 8406)
            </Link>
            <Link
              href="/avvikshandtering"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-sm font-semibold text-navy-900 py-1"
            >
              🔒 Tverrfaglig Lukkesperre (TEK17)
            </Link>
            <Link
              href="/ks-system#fdv"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-sm font-semibold text-navy-900 py-1"
            >
              📑 1-Klikk FDV til Boligmappa
            </Link>
            <Link
              href="/hms"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-sm font-semibold text-navy-900 py-1"
            >
              🛡️ HMS, SJA & Yr-vær
            </Link>
            <Link
              href="/stoffkartotek"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-sm font-semibold text-navy-900 py-1"
            >
              📦 Digitalt Stoffkartotek (Offline)
            </Link>

            <div className="border-t border-slate-100 pt-3 space-y-2">
              <Link
                href="/priser"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-between text-sm font-bold text-navy-900 py-1"
              >
                <span>Priser & Rammer</span>
                <span className="text-xs text-electric-600 bg-electric-50 px-2 py-0.5 rounded-full">Fra 690,-</span>
              </Link>
              <Link
                href="/?portal=demo"
                onClick={() => setMobileMenuOpen(false)}
                className="block text-sm font-semibold text-navy-900 py-1"
              >
                📱 Kundeportal & Digital Signatur
              </Link>
              <Link
                href="/faq"
                onClick={() => setMobileMenuOpen(false)}
                className="block text-sm font-semibold text-navy-900 py-1"
              >
                Ofte stilte spørsmål (FAQ)
              </Link>
              <Link
                href="/om-oss"
                onClick={() => setMobileMenuOpen(false)}
                className="block text-sm font-semibold text-navy-900 py-1"
              >
                Om oss
              </Link>
              <Link
                href="/kontakt"
                onClick={() => setMobileMenuOpen(false)}
                className="block text-sm font-semibold text-navy-900 py-1"
              >
                Kontakt oss
              </Link>
            </div>

            <div className="pt-3 flex flex-col gap-2">
              <Link
                href="/?action=demo"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center py-3 text-sm font-bold text-white bg-gradient-to-r from-electric-500 to-electric-400 rounded-xl shadow-md"
              >
                Start 14 dagers gratis prøve
              </Link>
              <Link
                href="/?login=true"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center py-2.5 text-sm font-bold text-slate-700 bg-slate-100 rounded-xl"
              >
                Logg inn
              </Link>
            </div>
          </div>
        )}
      </header>
    </>
  );
}
