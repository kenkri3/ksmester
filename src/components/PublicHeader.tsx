'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Logo from './Logo';
import { Menu, X, ArrowRight, ShieldCheck, Sparkles, ChevronDown } from 'lucide-react';

export function PublicHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [featuresOpen, setFeaturesOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3">
          <Logo size="md" />
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-semibold text-slate-700">
          {/* Features Dropdown */}
          <div className="relative group">
            <button
              onClick={() => setFeaturesOpen(!featuresOpen)}
              className="flex items-center gap-1 hover:text-electric-600 transition-colors py-2"
            >
              Funksjoner
              <ChevronDown size={14} className="transition-transform group-hover:rotate-180" />
            </button>
            <div className="absolute left-0 top-full hidden group-hover:block hover:block w-72 p-2 bg-white rounded-2xl shadow-xl border border-slate-200 mt-1 space-y-1">
              <Link
                href="/ks-system"
                className="block p-2.5 rounded-xl hover:bg-slate-50 transition-colors"
              >
                <div className="font-bold text-navy-900 text-xs">KS-system & Kvalitetssikring</div>
                <div className="text-[11px] text-slate-500">Byggedagbok, sjekklister & TEK17</div>
              </Link>
              <Link
                href="/hms"
                className="block p-2.5 rounded-xl hover:bg-slate-50 transition-colors"
              >
                <div className="font-bold text-navy-900 text-xs">HMS & Internkontroll</div>
                <div className="text-[11px] text-slate-500">Lovpålagt § 5, vernerunde & risikovurdering</div>
              </Link>
              <Link
                href="/avvikshandtering"
                className="block p-2.5 rounded-xl hover:bg-slate-50 transition-colors"
              >
                <div className="font-bold text-navy-900 text-xs">Avvik med TEK17-visjon</div>
                <div className="text-[11px] text-slate-500">AI-analyse av bilder på 5 sekunder</div>
              </Link>
              <Link
                href="/sja"
                className="block p-2.5 rounded-xl hover:bg-slate-50 transition-colors"
              >
                <div className="font-bold text-navy-900 text-xs">Sikker Jobb Analyse (SJA)</div>
                <div className="text-[11px] text-slate-500">Risikokartlegging for farlig arbeid</div>
              </Link>
              <Link
                href="/stoffkartotek"
                className="block p-2.5 rounded-xl hover:bg-slate-50 transition-colors"
              >
                <div className="font-bold text-navy-900 text-xs">Digitalt Stoffkartotek</div>
                <div className="text-[11px] text-slate-500">Sikkerhetsdatablader offline på mobil</div>
              </Link>
              <Link
                href="/prosjektstyring"
                className="block p-2.5 rounded-xl hover:bg-slate-50 transition-colors"
              >
                <div className="font-bold text-navy-900 text-xs">Prosjektstyring & Endringsordre</div>
                <div className="text-[11px] text-slate-500">Få betalt for uvarslet ekstraarbeid (NS 8406)</div>
              </Link>
            </div>
          </div>

          <Link href="/priser" className="hover:text-electric-600 transition-colors">
            Priser
          </Link>

          <Link href="/faq" className="hover:text-electric-600 transition-colors">
            FAQ
          </Link>
          <Link href="/om-oss" className="hover:text-electric-600 transition-colors">
            Om oss
          </Link>
          <Link href="/kontakt" className="hover:text-electric-600 transition-colors">
            Kontakt
          </Link>
        </nav>

        {/* Action buttons */}
        <div className="hidden sm:flex items-center gap-3">
          <Link
            href="/?login=true"
            className="px-4 py-2 text-xs font-bold text-slate-700 hover:text-navy-900 hover:bg-slate-100 rounded-xl transition-colors"
          >
            Logg inn
          </Link>
          <Link
            href="/?action=demo"
            className="px-4 py-2 text-xs font-bold text-white bg-electric-500 hover:bg-electric-600 rounded-xl transition-all shadow-md shadow-electric-500/20 flex items-center gap-1.5"
          >
            <Sparkles size={14} />
            Start gratis prøve
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
          <div className="font-bold text-xs uppercase tracking-wider text-slate-400 pt-2">Funksjoner</div>
          <Link
            href="/ks-system"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-sm font-semibold text-navy-900 py-1"
          >
            KS-system & Kvalitetssikring
          </Link>
          <Link
            href="/hms"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-sm font-semibold text-navy-900 py-1"
          >
            HMS & Internkontroll
          </Link>
          <Link
            href="/avvikshandtering"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-sm font-semibold text-navy-900 py-1"
          >
            Avvik med TEK17-visjon
          </Link>
          <Link
            href="/sja"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-sm font-semibold text-navy-900 py-1"
          >
            Sikker Jobb Analyse (SJA)
          </Link>
          <Link
            href="/stoffkartotek"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-sm font-semibold text-navy-900 py-1"
          >
            Digitalt Stoffkartotek
          </Link>
          <Link
            href="/prosjektstyring"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-sm font-semibold text-navy-900 py-1"
          >
            Prosjektstyring & Endringsordre
          </Link>

          <div className="border-t border-slate-100 pt-3 space-y-2">
            <Link
              href="/priser"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-sm font-semibold text-navy-900 py-1"
            >
              Priser
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
              className="w-full text-center py-2.5 text-sm font-bold text-white bg-electric-500 rounded-xl"
            >
              Start gratis prøve
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
  );
}
