'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, 
  X, 
  Phone, 
  PhoneCall, 
  MessageSquare, 
  Mail, 
  Search, 
  Plus, 
  Shield, 
  AlertTriangle, 
  Siren,
  Building2,
  CheckCircle2
} from 'lucide-react';
import { toast } from 'sonner';
import { Project } from '../types';

interface ProjectContactsModalProps {
  isOpen: boolean;
  onClose: () => void;
  project?: Project;
}

interface ColleagueContact {
  id: string;
  name: string;
  role: string;
  company: string;
  phone: string;
  email?: string;
  isOnSiteToday?: boolean;
  isKeyPersonnel?: boolean;
}

const DEFAULT_CONTACTS: ColleagueContact[] = [
  {
    id: 'contact_1',
    name: 'Kari Nordmann',
    role: 'Prosjektleder / Faglig leder',
    company: 'VikingMester Entreprenør AS',
    phone: '+47 920 11 222',
    email: 'kari@vikingmester.no',
    isOnSiteToday: true,
    isKeyPersonnel: true
  },
  {
    id: 'contact_2',
    name: 'Ola Hansen',
    role: 'Byggeplassleder / Verneombud',
    company: 'VikingMester Entreprenør AS',
    phone: '+47 930 22 333',
    email: 'hms@vikingmester.no',
    isOnSiteToday: true,
    isKeyPersonnel: true
  },
  {
    id: 'contact_3',
    name: 'Per Olsen',
    role: 'Tømrer bas',
    company: 'VikingMester Entreprenør AS',
    phone: '+47 940 33 444',
    email: 'per@vikingmester.no',
    isOnSiteToday: true,
    isKeyPersonnel: false
  },
  {
    id: 'contact_4',
    name: 'Eirik Berg',
    role: 'Elektroansvarlig / Installatør',
    company: 'Partner Elektro AS',
    phone: '+47 950 44 555',
    email: 'elektro@vikingmester.no',
    isOnSiteToday: false,
    isKeyPersonnel: true
  },
  {
    id: 'contact_5',
    name: 'Marius Lien',
    role: 'VVS & Rørlegger bas',
    company: 'Partner VVS AS',
    phone: '+47 960 55 666',
    email: 'vvs@vikingmester.no',
    isOnSiteToday: true,
    isKeyPersonnel: false
  }
];

export default function ProjectContactsModal({
  isOpen,
  onClose,
  project
}: ProjectContactsModalProps) {
  const [contacts, setContacts] = useState<ColleagueContact[]>(DEFAULT_CONTACTS);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'on_site' | 'key'>('all');
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState('');
  const [newCompany, setNewCompany] = useState('');
  const [newPhone, setNewPhone] = useState('');

  if (!isOpen) return null;

  const filtered = contacts.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          c.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          c.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          c.phone.includes(searchQuery);
    if (!matchesSearch) return false;
    if (filter === 'on_site') return c.isOnSiteToday;
    if (filter === 'key') return c.isKeyPersonnel;
    return true;
  });

  const handleAddContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newPhone.trim()) {
      toast.error('Vennligst oppgi navn og telefonnummer.');
      return;
    }

    const newC: ColleagueContact = {
      id: 'c-' + Date.now(),
      name: newName.trim(),
      role: newRole.trim() || 'Fagmedarbeider',
      company: newCompany.trim() || (project?.name ? project.name : 'Byggeplass'),
      phone: newPhone.trim(),
      isOnSiteToday: true,
      isKeyPersonnel: false
    };

    setContacts(prev => [newC, ...prev]);
    setNewName('');
    setNewRole('');
    setNewCompany('');
    setNewPhone('');
    setIsAdding(false);
    toast.success(`${newC.name} er lagt til i telefonlisten!`);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-navy-950/70 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto flex flex-col max-h-[92vh]"
      >
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-cyan-700 via-blue-700 to-navy-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-white/10 text-white flex items-center justify-center shrink-0 border border-white/20 shadow-inner">
              <Users size={22} className="text-cyan-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-white/15 text-cyan-100 border border-white/20">
                  Byggeplass & Team
                </span>
                <span className="text-xs text-cyan-200 font-medium">1-klikk oppringning</span>
              </div>
              <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
                Telefonliste {project ? `– ${project.name}` : ''}
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Search & Filter Bar */}
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Søk etter navn, rolle, firma eller telefon..."
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-medium focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500"
            />
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                filter === 'all'
                  ? 'bg-cyan-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              Alle ({contacts.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter('on_site')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                filter === 'on_site'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              På plassen i dag
            </button>
            <button
              type="button"
              onClick={() => setIsAdding(prev => !prev)}
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 ml-1 transition-all cursor-pointer"
            >
              <Plus size={14} />
              Legg til
            </button>
          </div>
        </div>

        {/* Add Contact Form (collapsible) */}
        <AnimatePresence>
          {isAdding && (
            <motion.form
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              onSubmit={handleAddContact}
              className="p-4 bg-cyan-50/70 border-b border-cyan-100 grid grid-cols-1 sm:grid-cols-4 gap-2.5 overflow-hidden"
            >
              <input
                type="text"
                required
                placeholder="Fullt navn *"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="p-2.5 bg-white border border-cyan-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-cyan-500"
              />
              <input
                type="text"
                placeholder="Rolle / Fag (f.eks. Tømrer bas)"
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                className="p-2.5 bg-white border border-cyan-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-cyan-500"
              />
              <input
                type="text"
                placeholder="Firma"
                value={newCompany}
                onChange={(e) => setNewCompany(e.target.value)}
                className="p-2.5 bg-white border border-cyan-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-cyan-500"
              />
              <div className="flex gap-2">
                <input
                  type="tel"
                  required
                  placeholder="Telefonnummer *"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  className="flex-1 p-2.5 bg-white border border-cyan-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-cyan-500"
                />
                <button
                  type="submit"
                  className="px-4 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Lagre
                </button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>

        {/* Contacts List */}
        <div className="p-6 space-y-3 overflow-y-auto flex-1">
          {filtered.length === 0 ? (
            <div className="text-center py-10 text-slate-400">
              <Users size={36} className="mx-auto mb-2 opacity-40" />
              <p className="text-sm font-semibold">Ingen kontakter funnet</p>
              <p className="text-xs">Prøv et annet søkeord eller legg til en ny person.</p>
            </div>
          ) : (
            filtered.map((c) => (
              <div
                key={c.id}
                className="p-4 bg-white hover:bg-slate-50 border border-slate-200/90 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all shadow-xs"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-cyan-600 to-blue-600 text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-xs">
                    {c.name.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-bold text-slate-900 text-sm truncate">{c.name}</h4>
                      {c.isKeyPersonnel && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-800">
                          Nøkkelperson
                        </span>
                      )}
                      {c.isOnSiteToday && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          På plassen
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-medium text-slate-600 mt-0.5">{c.role} • <span className="text-slate-400">{c.company}</span></p>
                    <p className="text-xs font-bold text-slate-800 mt-0.5">{c.phone}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  <a
                    href={`tel:${c.phone.replace(/\s+/g, '')}`}
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all active:scale-95 cursor-pointer"
                  >
                    <Phone size={14} />
                    <span>Ring</span>
                  </a>
                  {c.email && (
                    <a
                      href={`mailto:${c.email}`}
                      className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                      title={c.email}
                    >
                      <Mail size={14} />
                      <span>E-post</span>
                    </a>
                  )}
                </div>
              </div>
            ))
          )}

          {/* Emergency Numbers Card */}
          <div className="mt-4 p-4 rounded-2xl bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-600 text-white flex items-center justify-center shrink-0">
                <Siren size={20} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-red-950 uppercase tracking-wider">Nødetater & Akutthjelp</h4>
                <p className="text-xs text-red-800 font-medium">Ved akutt skade på byggeplass: Ring 113</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <a href="tel:113" className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-bold shadow-xs">
                Ambulanse (113)
              </a>
              <a href="tel:110" className="px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-bold">
                Brann (110)
              </a>
              <a href="tel:112" className="px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-bold">
                Politi (112)
              </a>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-100 flex items-center justify-between shrink-0">
          <span className="text-xs text-slate-500 font-medium">
            Telefonliste synkroniseres automatisk med mannskapslisten på byggeplassen.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            Lukk
          </button>
        </div>
      </motion.div>
    </div>
  );
}
