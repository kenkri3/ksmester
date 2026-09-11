import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  ShieldCheck, 
  AlertTriangle, 
  Lock, 
  Unlock, 
  Coins, 
  Mic, 
  FileCheck2, 
  Send, 
  Share2, 
  Building2, 
  Hammer, 
  Wrench, 
  Zap, 
  Paintbrush, 
  CheckCircle2, 
  Clock, 
  Info,
  Sparkles
} from 'lucide-react';
import { Project } from '../types';
import { toast } from 'sonner';

interface CrossTradeCoordinatorProps {
  project: Project;
  onRefreshProject?: () => void;
}

interface RoomZone {
  id: string;
  name: string;
  phase: 'wall_closure' | 'bathroom_tiling' | 'exterior_cladding';
  phaseTitle: string;
  plumberVerified: boolean;
  electricianVerified: boolean;
  vaporBarrierVerified: boolean;
  status: 'GREEN' | 'YELLOW' | 'RED';
  notes?: string;
}

const INITIAL_ROOMS: RoomZone[] = [
  {
    id: 'room_1',
    name: 'Bad 2. etasje (Hovedbad)',
    phase: 'bathroom_tiling',
    phaseTitle: 'Før membran og flislegging (BVN 31.205)',
    plumberVerified: true,
    electricianVerified: true,
    vaporBarrierVerified: true,
    status: 'GREEN',
    notes: 'Slukmansjett montert med klemring, trykktest rør-i-rør OK, fall 1:50 verifisert.'
  },
  {
    id: 'room_2',
    name: 'Stue og Kjøkken',
    phase: 'wall_closure',
    phaseTitle: 'Før gipsing og lukking av vegg',
    plumberVerified: true,
    electricianVerified: false,
    vaporBarrierVerified: true,
    status: 'RED',
    notes: 'STOPP: Elektriker har ikke fotografert skjulte rør og koblingsbokser i vegg mot gang.'
  },
  {
    id: 'room_3',
    name: 'Teknisk Rom / Vaskerom',
    phase: 'wall_closure',
    phaseTitle: 'Før innkassing av fordelerskap',
    plumberVerified: false,
    electricianVerified: false,
    vaporBarrierVerified: true,
    status: 'RED',
    notes: 'STOPP: Trykktesting av vannfordeler mangler, elektriker mangler jordingstest.'
  },
  {
    id: 'room_4',
    name: 'Fasade Vest & Sør',
    phase: 'exterior_cladding',
    phaseTitle: 'Før montering av ytterkledning',
    plumberVerified: true,
    electricianVerified: true,
    vaporBarrierVerified: true,
    status: 'GREEN',
    notes: 'Vindsperre klemt og tapet, musebånd montert, 20 mm luftespalte sikret.'
  }
];

export default function CrossTradeCoordinator({ project }: CrossTradeCoordinatorProps) {
  const [rooms, setRooms] = useState<RoomZone[]>(INITIAL_ROOMS);
  const [voiceText, setVoiceText] = useState('');
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);
  const [generatedChangeOrder, setGeneratedChangeOrder] = useState<any>(null);

  // Toggle trade verification for demonstration and real workflow
  const toggleTrade = (roomId: string, trade: 'plumber' | 'electrician' | 'vapor') => {
    setRooms(prev => prev.map(r => {
      if (r.id !== roomId) return r;
      const updated = {
        ...r,
        plumberVerified: trade === 'plumber' ? !r.plumberVerified : r.plumberVerified,
        electricianVerified: trade === 'electrician' ? !r.electricianVerified : r.electricianVerified,
        vaporBarrierVerified: trade === 'vapor' ? !r.vaporBarrierVerified : r.vaporBarrierVerified,
      };

      const allGood = updated.plumberVerified && updated.electricianVerified && updated.vaporBarrierVerified;
      const someGood = updated.plumberVerified || updated.electricianVerified || updated.vaporBarrierVerified;

      return {
        ...updated,
        status: allGood ? 'GREEN' : someGood ? 'YELLOW' : 'RED',
        notes: allGood 
          ? 'Alle tverrfaglige kontroller godkjent. Klar for lukking/plating.' 
          : 'Mangler godkjenning fra ' + [
              !updated.plumberVerified ? 'Rørlegger' : null,
              !updated.electricianVerified ? 'Elektriker' : null,
              !updated.vaporBarrierVerified ? 'Tømrer (dampsperre)' : null
            ].filter(Boolean).join(', ')
      };
    }));
    toast.success('Status oppdatert for rom!');
  };

  const handleProcessVoiceChangeOrder = async () => {
    if (!voiceText.trim()) {
      toast.error('Vennligst dikter eller skriv inn hva endringen gjelder.');
      return;
    }

    setIsProcessingVoice(true);
    try {
      const res = await fetch('/api/agent/dispatch', {
        method: 'POST',
        // FIX (11.09.2026): Send med Authorization-token – /api/agent/dispatch krever nå pålogging.
        headers: { 'Content-Type': 'application/json', ...(typeof window !== 'undefined' && localStorage.getItem('token') ? { 'Authorization': `Bearer ${localStorage.getItem('token')}` } : {}) },
        body: JSON.stringify({
          action: 'change_order',
          text: voiceText,
          projectId: project.id,
          projectName: project.name,
          authorName: 'Byggeleder / Håndverker'
        })
      });

      if (!res.ok) throw new Error('Kunne ikke behandle endringsordre');

      const data = await res.json();
      setGeneratedChangeOrder(data.data.changeOrder);
      toast.success('Juridisk endringsvarsel opprettet på sekunder!');
      setVoiceText('');
    } catch (err: any) {
      toast.error(err.message || 'Feil ved behandling av endring');
    } finally {
      setIsProcessingVoice(false);
    }
  };

  const copyShareLink = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success('Kopierte signeringslenke til kunden!');
  };

  return (
    <div className="space-y-8">
      {/* Top Banner: Totalentreprenør Hovedoversikt */}
      <div className="bg-gradient-to-r from-neutral-900 via-neutral-800 to-neutral-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-neutral-700/50">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-6 border-b border-neutral-700/60">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="p-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg">
                <ShieldCheck size={18} />
              </span>
              <span className="text-[11px] font-black uppercase tracking-widest text-emerald-400">
                Tverrfaglig Byggeledermotor & Lukkesperre
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
              Totalentreprenør & Underentreprenør-koordinering
            </h2>
            <p className="text-xs text-neutral-400 max-w-2xl mt-1">
              Forhindrer byggfeil og tvister i overgangene mellom fagene. Sikrer at ingen vegger gipses eller flislegges før rør-i-rør, elektro og fuktsikring er verifisert iht. TEK17.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="px-4 py-2.5 bg-neutral-800/80 rounded-2xl border border-neutral-700 text-right">
              <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Lovkrav TEK17</div>
              <div className="text-sm font-black text-emerald-400">§ 13-14 & § 13-15</div>
            </div>
          </div>
        </div>

        {/* Trade Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-6">
          <div className="p-3 bg-neutral-800/50 rounded-2xl border border-neutral-700/50 flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 text-blue-400 rounded-xl"><Wrench size={16} /></div>
            <div>
              <div className="text-[10px] uppercase font-bold text-neutral-400">VVS / Rørlegger</div>
              <div className="text-xs font-bold text-white">Trykktest & Sluk</div>
            </div>
          </div>

          <div className="p-3 bg-neutral-800/50 rounded-2xl border border-neutral-700/50 flex items-center gap-3">
            <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl"><Zap size={16} /></div>
            <div>
              <div className="text-[10px] uppercase font-bold text-neutral-400">Elektriker</div>
              <div className="text-xs font-bold text-white">Skjultanlegg & NEK400</div>
            </div>
          </div>

          <div className="p-3 bg-neutral-800/50 rounded-2xl border border-neutral-700/50 flex items-center gap-3">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl"><Hammer size={16} /></div>
            <div>
              <div className="text-[10px] uppercase font-bold text-neutral-400">Tømrer / Bygg</div>
              <div className="text-xs font-bold text-white">Dampsperre & Gips</div>
            </div>
          </div>

          <div className="p-3 bg-neutral-800/50 rounded-2xl border border-neutral-700/50 flex items-center gap-3">
            <div className="p-2 bg-purple-500/20 text-purple-400 rounded-xl"><Paintbrush size={16} /></div>
            <div>
              <div className="text-[10px] uppercase font-bold text-neutral-400">Flis / Maler</div>
              <div className="text-xs font-bold text-white">Membran & Fall 1:50</div>
            </div>
          </div>
        </div>
      </div>

      {/* Seksjon 1: Lukkesperre-matrise (Pre-Close Gatekeeper) */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-neutral-200 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
              Kritisk grensesnittkontroll
            </span>
            <h3 className="text-xl font-black text-neutral-900 mt-2">
              Lukkesperre for Skjulte Konstruksjoner (Pre-Close Gate)
            </h3>
            <p className="text-xs text-neutral-500">
              Grønt lys kreves før håndverkeren får lov til å kle vegger eller legge fliser.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs font-bold text-neutral-500">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> Klar</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" /> Sperret</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {rooms.map((room) => (
            <div 
              key={room.id}
              className={`p-5 rounded-2xl border transition-all ${
                room.status === 'GREEN' 
                  ? 'bg-emerald-50/40 border-emerald-200' 
                  : 'bg-rose-50/40 border-rose-200'
              }`}
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                    {room.phaseTitle}
                  </span>
                  <h4 className="font-bold text-neutral-900 text-base">{room.name}</h4>
                </div>

                <div className={`px-3 py-1 rounded-full text-[11px] font-black uppercase flex items-center gap-1.5 ${
                  room.status === 'GREEN' 
                    ? 'bg-emerald-100 text-emerald-800' 
                    : 'bg-rose-100 text-rose-800'
                }`}>
                  {room.status === 'GREEN' ? <Unlock size={12} /> : <Lock size={12} />}
                  {room.status === 'GREEN' ? 'Grønt lys' : 'Sperret'}
                </div>
              </div>

              {/* Trade toggles */}
              <div className="space-y-2 mb-4">
                <button
                  type="button"
                  onClick={() => toggleTrade(room.id, 'plumber')}
                  className="w-full flex items-center justify-between p-2 rounded-xl bg-white border border-neutral-200 text-xs font-medium hover:bg-neutral-50 text-left cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <Wrench size={14} className="text-blue-500" />
                    Rørlegger trykktest / sluk
                  </span>
                  {room.plumberVerified ? (
                    <span className="text-emerald-600 font-bold flex items-center gap-1 text-[11px]">
                      <CheckCircle2 size={14} /> Kvittert OK
                    </span>
                  ) : (
                    <span className="text-rose-500 font-bold text-[11px]">Mangler</span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => toggleTrade(room.id, 'electrician')}
                  className="w-full flex items-center justify-between p-2 rounded-xl bg-white border border-neutral-200 text-xs font-medium hover:bg-neutral-50 text-left cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <Zap size={14} className="text-amber-500" />
                    Elektriker skjultanlegg-foto
                  </span>
                  {room.electricianVerified ? (
                    <span className="text-emerald-600 font-bold flex items-center gap-1 text-[11px]">
                      <CheckCircle2 size={14} /> Kvittert OK
                    </span>
                  ) : (
                    <span className="text-rose-500 font-bold text-[11px]">Mangler</span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => toggleTrade(room.id, 'vapor')}
                  className="w-full flex items-center justify-between p-2 rounded-xl bg-white border border-neutral-200 text-xs font-medium hover:bg-neutral-50 text-left cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <Hammer size={14} className="text-emerald-500" />
                    Tømrer dampsperre / isolasjon
                  </span>
                  {room.vaporBarrierVerified ? (
                    <span className="text-emerald-600 font-bold flex items-center gap-1 text-[11px]">
                      <CheckCircle2 size={14} /> Kvittert OK
                    </span>
                  ) : (
                    <span className="text-rose-500 font-bold text-[11px]">Mangler</span>
                  )}
                </button>
              </div>

              <div className={`p-3 rounded-xl text-xs ${
                room.status === 'GREEN' ? 'bg-emerald-100/60 text-emerald-900' : 'bg-rose-100/60 text-rose-900'
              }`}>
                {room.notes}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Seksjon 2: Tale-til-Endringsordre (Instant Voice Change Order) */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-neutral-200 shadow-sm space-y-6">
        <div>
          <span className="text-[10px] font-black uppercase tracking-widest text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
            Juridisk Sikring på 15 sekunder
          </span>
          <h3 className="text-xl font-black text-neutral-900 mt-2">
            Tale-til-Endringsordre (NS 8406 / Håndverkertjenesteloven)
          </h3>
          <p className="text-xs text-neutral-500">
            Gjør muntlige kundeønsker på byggeplassen om til et juridisk bindende endringsvarsel med 1-klikks SMS-godkjenning for kunden.
          </p>
        </div>

        <div className="bg-neutral-50 p-4 sm:p-6 rounded-2xl border border-neutral-200 space-y-3">
          <label className="block text-xs font-bold text-neutral-700">
            Snakk inn eller skriv hva kunden ba om:
          </label>
          <div className="relative">
            <textarea
              rows={3}
              value={voiceText}
              onChange={(e) => setVoiceText(e.target.value)}
              placeholder="F.eks: 'Kunden vil ha 4 ekstra downlights i gangen og flytte lettvegg 30 cm. Anslår 5 timer snekker og 3 timer elektriker, ca 4500 kr materiell og 2 dager fristforlengelse...'"
              className="w-full p-4 pr-12 bg-white rounded-xl border border-neutral-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <button
              type="button"
              onClick={() => setVoiceText("Kunden vil ha 4 ekstra downlights i gangen og flytte lettveggen 30 cm mot øst. Anslår 5 timer snekker og 3 timer elektriker, 4500 kr i materiell og vi trenger 2 dagers fristforlengelse.")}
              title="Sett inn eksempeltekst"
              className="absolute right-3 bottom-4 p-2 text-neutral-400 hover:text-emerald-600 transition-colors"
            >
              <Sparkles size={16} />
            </button>
          </div>

          <div className="flex justify-between items-center pt-2">
            <span className="text-[11px] text-neutral-400 flex items-center gap-1">
              <Info size={13} /> Bruker Gemini 3.8 Flash for norsk kontraktsrett
            </span>
            <button
              type="button"
              onClick={handleProcessVoiceChangeOrder}
              disabled={isProcessingVoice}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md transition-all cursor-pointer"
            >
              <Send size={14} />
              {isProcessingVoice ? 'Behandler med VikingMester...' : 'Generer Endringsvarsel'}
            </button>
          </div>
        </div>

        {/* Generated Order Card */}
        {generatedChangeOrder && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-6 bg-emerald-500/10 rounded-2xl border border-emerald-500/30 space-y-4"
          >
            <div className="flex justify-between items-start">
              <div>
                <span className="px-2 py-0.5 bg-emerald-600 text-white text-[10px] font-black uppercase rounded-md">
                  #{generatedChangeOrder.changeNumber} Klar til sending
                </span>
                <h4 className="text-base font-bold text-neutral-900 mt-1">{generatedChangeOrder.title}</h4>
                <p className="text-xs text-neutral-600 mt-1">{generatedChangeOrder.description}</p>
              </div>

              <div className="text-right">
                <div className="text-lg font-black text-neutral-900">
                  {generatedChangeOrder.totalAmount?.toLocaleString('no-NO')} kr
                </div>
                <div className="text-[10px] text-neutral-500">inkl. mva (eks: {generatedChangeOrder.amountExVat?.toLocaleString('no-NO')} kr)</div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-emerald-500/20 text-xs">
              <span className="text-neutral-600 font-medium">
                Hjemmel: <strong>{generatedChangeOrder.legalHjemmel}</strong> (+{generatedChangeOrder.impactDays} dager frist)
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => copyShareLink(generatedChangeOrder.shareUrl)}
                  className="px-3 py-1.5 bg-white hover:bg-neutral-50 text-neutral-900 border border-neutral-200 rounded-lg font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all"
                >
                  <Share2 size={13} /> Kopier godkjenningslenke for SMS
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
