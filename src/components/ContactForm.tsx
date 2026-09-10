'use client';

import React, { useState } from 'react';
import { Send, CheckCircle2, AlertCircle, Loader2, Sparkles, Building2, User, Mail, Phone, MessageSquare } from 'lucide-react';
import { trackLeadSubmission } from '@/src/lib/analytics';

export function ContactForm() {
  const [formData, setFormData] = useState({
    name: '',
    company: '',
    orgnr: '',
    email: '',
    phone: '',
    interest: 'demo',
    message: '',
  });

  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);

    try {
      const payload = {
        name: formData.name,
        company: formData.company,
        orgnr: formData.orgnr,
        email: formData.email,
        phone: formData.phone,
        plan: formData.interest === 'solo' ? 'solo' : formData.interest === 'team' ? 'team' : 'demo',
        message: `Henvendelse (${formData.interest}): ${formData.message}`,
        source: 'vikingmester.no/kontakt',
      };

      const res = await fetch('/api/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Det oppstod en feil ved sending av skjema.');
      }

      setSubmitted(true);
      trackLeadSubmission('contact_page_form');
    } catch (err: any) {
      setErrorMessage(err.message || 'Kunne ikke sende meldingen. Vennligst prøv igjen.');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="p-8 sm:p-10 bg-emerald-50 border border-emerald-200 rounded-3xl text-center space-y-4 animate-fadeIn">
        <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle2 size={32} />
        </div>
        <h3 className="text-2xl font-black text-emerald-950">Takk for henvendelsen!</h3>
        <p className="text-emerald-800 text-sm max-w-md mx-auto leading-relaxed">
          Vi har mottatt meldingen din og svarer deg normalt innen 1 time i arbeidstiden (07:00–18:00).
        </p>
        <button
          onClick={() => {
            setSubmitted(false);
            setFormData({
              name: '',
              company: '',
              orgnr: '',
              email: '',
              phone: '',
              interest: 'demo',
              message: '',
            });
          }}
          className="text-xs font-bold text-emerald-700 hover:text-emerald-900 underline mt-4 inline-block"
        >
          Send en ny melding
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white p-8 sm:p-10 rounded-3xl border border-slate-200 shadow-xl space-y-6">
      {errorMessage && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-sm flex items-start gap-3">
          <AlertCircle size={20} className="shrink-0 text-rose-500 mt-0.5" />
          <div>{errorMessage}</div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
            Ditt navn <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <User size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              required
              placeholder="Ola Nordmann"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-electric-500 focus:border-transparent text-navy-900"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
            Firmanavn <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <Building2 size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              required
              placeholder="Nordmann Bygg AS"
              value={formData.company}
              onChange={(e) => setFormData({ ...formData, company: e.target.value })}
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-electric-500 focus:border-transparent text-navy-900"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
            E-postadresse <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <Mail size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="email"
              required
              placeholder="ola@nordmannbygg.no"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-electric-500 focus:border-transparent text-navy-900"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
            Telefonnummer <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <Phone size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="tel"
              required
              placeholder="912 34 567"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-electric-500 focus:border-transparent text-navy-900"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
            Organisasjonsnummer (valgfritt)
          </label>
          <input
            type="text"
            placeholder="9 siffer"
            value={formData.orgnr}
            onChange={(e) => setFormData({ ...formData, orgnr: e.target.value })}
            className="w-full px-4 py-3 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-electric-500 focus:border-transparent text-navy-900"
          />
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
            Hva gjelder henvendelsen?
          </label>
          <select
            value={formData.interest}
            onChange={(e) => setFormData({ ...formData, interest: e.target.value })}
            className="w-full px-4 py-3 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-electric-500 focus:border-transparent text-navy-900 bg-white"
          >
            <option value="demo">Bestille uforpliktende 15 min demo</option>
            <option value="solo">VikingMester Solo (kr 990/mnd)</option>
            <option value="team">VikingMester Team (kr 3 490/mnd)</option>
            <option value="entreprenor">Totalentreprenør / Tilpasset</option>
            <option value="partner">Bli forhandler / Partner</option>
            <option value="support">Spørsmål eller teknisk support</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
          Melding eller spørsmål
        </label>
        <div className="relative">
          <MessageSquare size={18} className="absolute left-3.5 top-3.5 text-slate-400" />
          <textarea
            rows={4}
            placeholder="Fortell kort om bedriften din, fagområde eller hva du ønsker hjelp til..."
            value={formData.message}
            onChange={(e) => setFormData({ ...formData, message: e.target.value })}
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-electric-500 focus:border-transparent text-navy-900 resize-y"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-4 px-6 rounded-2xl font-bold bg-electric-500 hover:bg-electric-600 disabled:opacity-50 text-white transition-all shadow-lg shadow-electric-500/25 flex items-center justify-center gap-2 text-base"
      >
        {loading ? (
          <>
            <Loader2 size={18} className="animate-spin" />
            Sender henvendelse...
          </>
        ) : (
          <>
            <Send size={18} />
            Send melding &rarr;
          </>
        )}
      </button>

      <p className="text-[11px] text-slate-400 text-center">
        Ved å sende inn skjemaet samtykker du til at vi kontakter deg angående din henvendelse. Ingen spam, og vi deler aldri dataene dine med tredjeparter.
      </p>
    </form>
  );
}
