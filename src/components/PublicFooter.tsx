'use client';

import React from 'react';
import Link from 'next/link';
import Logo from './Logo';
import { ShieldCheck, Mail, Phone, MapPin, Award, CheckCircle2 } from 'lucide-react';
import { PLATFORM_LEGAL_NAME_FULL, PLATFORM_ORGNUMBER_LABEL } from '../constants/companyDetails';

export function PublicFooter() {
  return (
    <footer className="bg-navy-950 text-white pt-16 pb-12 border-t border-navy-900 font-sans mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 mb-12">
          {/* Brand Col */}
          <div className="lg:col-span-2 space-y-4">
            <Link href="/" className="inline-block">
              <Logo size="lg" theme="dark" />
            </Link>
            <p className="text-slate-400 text-sm max-w-md leading-relaxed">
              VikingMester er Norges ledende autonome KS- og HMS-system for håndverkere og entreprenører. Utviklet for å fjerne papirarbeid med tale, AI-bildekontroll og automatiske endringsvarsler iht. TEK17 og NS 8406.
            </p>
            {/* ⚖️ MARKEDSFOERINGSSJEKK (B-01): her sto det tidligere
                «Godkjent for Arbeidstilsynet» og «TEK17 & BVN-verifisert».
                Arbeidstilsynet godkjenner ikke programvare - de har
                godkjenningsordninger for bilvask, bedriftshelsetjenester,
                renhold, asbestarbeid, bemanningsforetak og stansede
                virksomheter, ingen for IT-systemer. Og «BVN-verifisert» er ikke
                en kategori: BVN 12.100 godkjenner BEDRIFTER som utforer
                vatromsarbeid (GVB-ordningen), ikke verktoy. AI CHAT NORGE AS er
                ikke registrert som godkjent vatromsbedrift. Begge merkene er
                derfor omformulert til det som faktisk kan belegges: at
                systemet er bygget for kravene, og at sjekklistene folger de
                navngitte normene. */}
            <div className="flex flex-wrap items-center gap-3 pt-2 text-xs text-slate-400">
              <div className="flex items-center gap-1.5 bg-navy-900/80 px-3 py-1.5 rounded-lg border border-navy-800">
                <ShieldCheck size={14} className="text-emerald-400" />
                <span>Bygget for kravene i internkontrollforskriften § 5</span>
              </div>
              <div className="flex items-center gap-1.5 bg-navy-900/80 px-3 py-1.5 rounded-lg border border-navy-800">
                <Award size={14} className="text-amber-400" />
                <span>Sjekklister og kontroller iht. TEK17 og BVN 31.205</span>
              </div>
            </div>
          </div>

          {/* Kolonne 1: Funksjoner */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-slate-300 mb-4">
              Løsninger
            </h4>
            <ul className="space-y-2.5 text-sm text-slate-400">
              <li>
                <Link href="/ks-system" className="hover:text-white transition-colors">
                  KS-system for håndverkere
                </Link>
              </li>
              <li>
                <Link href="/hms" className="hover:text-white transition-colors">
                  HMS & Internkontroll (§ 5)
                </Link>
              </li>
              <li>
                <Link href="/avvikshandtering" className="hover:text-white transition-colors">
                  Avvikshåndtering (TEK17)
                </Link>
              </li>
              <li>
                <Link href="/sja" className="hover:text-white transition-colors">
                  Sikker Jobb Analyse (SJA)
                </Link>
              </li>
              <li>
                <Link href="/stoffkartotek" className="hover:text-white transition-colors">
                  Digitalt Stoffkartotek
                </Link>
              </li>
              <li>
                <Link href="/prosjektstyring" className="hover:text-white transition-colors">
                  Prosjektstyring & Byggedagbok
                </Link>
              </li>
            </ul>
          </div>

          {/* Kolonne 2: Bedrift & Ressurser */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-slate-300 mb-4">
              Ressurser
            </h4>
            <ul className="space-y-2.5 text-sm text-slate-400">
              <li>
                <Link href="/priser" className="hover:text-white transition-colors">
                  Priser & Pakker
                </Link>
              </li>

              <li>
                <Link href="/faq" className="hover:text-white transition-colors">
                  Ofte stilte spørsmål (FAQ)
                </Link>
              </li>
              <li>
                <Link href="/om-oss" className="hover:text-white transition-colors">
                  Om VikingMester
                </Link>
              </li>
              <li>
                <Link href="/kontakt" className="hover:text-white transition-colors">
                  Kontakt & Demo
                </Link>
              </li>
              <li>
                <a href="/llms.txt" className="text-xs text-slate-500 hover:text-slate-300">
                  llms.txt (AI API)
                </a>
              </li>
            </ul>
          </div>

          {/* Kolonne 3: Kontakt & Juridisk */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-slate-300 mb-4">
              Kontakt & Drift
            </h4>
            <div className="space-y-3 text-sm text-slate-400">
              <div className="flex items-start gap-2.5">
                <Mail size={16} className="text-electric-400 shrink-0 mt-0.5" />
                <a href="mailto:hei@vikingmester.no" className="hover:text-white">
                  hei@vikingmester.no
                </a>
              </div>
              <div className="flex items-start gap-2.5">
                <Phone size={16} className="text-electric-400 shrink-0 mt-0.5" />
                <a href="tel:+4740163082" className="hover:text-white">
                  +47 401 63 082
                </a>
              </div>
              <div className="flex items-start gap-2.5">
                <MapPin size={16} className="text-electric-400 shrink-0 mt-0.5" />
                <span>Oslo, Norge</span>
              </div>
              <div className="pt-2 text-xs text-slate-500">
                <p className="font-semibold text-slate-400">{PLATFORM_LEGAL_NAME_FULL}</p>
                <p>Org.nr: {PLATFORM_ORGNUMBER_LABEL}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-navy-900 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div>
            © {new Date().getFullYear()} VikingMester (vikingmester.no). Alle rettigheter forbeholdt.
          </div>
          <div className="flex items-center gap-6">
            <button
              onClick={() => {
                if (typeof window !== 'undefined') {
                  window.dispatchEvent(new CustomEvent('open_cookie_settings'));
                }
              }}
              className="hover:text-slate-400 transition-colors underline cursor-pointer"
            >
              Informasjonskapsler
            </button>
            <Link href="/personvern" className="hover:text-slate-400 transition-colors">
              Personvernerklæring
            </Link>
            <Link href="/vilkar" className="hover:text-slate-400 transition-colors">
              Vilkår for bruk
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
