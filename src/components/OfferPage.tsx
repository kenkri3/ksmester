import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  CheckCircle2, 
  XCircle, 
  Zap, 
  Shield, 
  Package, 
  Building2, 
  ArrowRight,
  Clock,
  DollarSign,
  Plus
} from 'lucide-react';
import { db, collection, query, where, getDocs, doc, updateDoc, serverTimestamp, handleFirestoreError, OperationType, addDoc } from '../services/firebase';
import { cn } from '../lib/utils';

interface SystemOffer {
  id: string;
  recipientEmail: string;
  recipientName: string;
  companyName: string;
  modules: string[];
  trialDays: number;
  customPrice: number;
  message: string;
  status: 'pending' | 'accepted' | 'declined';
  token: string;
}

export default function OfferPage({ token }: { token: string }) {
  const [offer, setOffer] = useState<SystemOffer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accepted, setAccepted] = useState(false);

  // Available modules (same as in SuperAdmin)
  const allModules = [
    { id: 'projects', name: 'Prosjektstyring', icon: <Plus size={16} /> },
    { id: 'checklists', name: 'KS/HMS Sjekklister', icon: <Shield size={16} /> },
    { id: 'deviations', name: 'Avvikshåndtering', icon: <AlertTriangle size={16} /> },
    { id: 'ai', name: 'AI Analyse & Vision', icon: <Zap size={16} /> },
    { id: 'economy', name: 'Tilbud & Kontrakt', icon: <Calculator size={16} /> },
    { id: 'fdv', name: 'FDV & Dokumentasjon', icon: <Library size={16} /> },
    { id: 'inventory', name: 'Lager & Verktøy', icon: <Package size={16} /> },
    { id: 'vehicle', name: 'Kjørebok & Bil', icon: <Car size={16} /> },
    { id: 'time', name: 'Timeføring', icon: <Timer size={16} /> },
    { id: 'apprentice', name: 'Lærlingmodul', icon: <GraduationCap size={16} /> },
    { id: 'building_app', name: 'Byggesøknad', icon: <Building2 size={16} /> }
  ];

  useEffect(() => {
    const fetchOffer = async () => {
      try {
        const q = query(collection(db, 'system_offers'), where('token', '==', token));
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) {
          setError('Tilbudet ble ikke funnet eller er utgått.');
          setLoading(false);
          return;
        }

        const data = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as SystemOffer;
        
        if (data.status !== 'pending') {
          setError('Dette tilbudet har allerede blitt behandlet.');
          setLoading(false);
          return;
        }

        setOffer(data);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching offer:', err);
        setError('Det oppsto en feil ved henting av tilbudet.');
        setLoading(false);
      }
    };

    fetchOffer();
  }, [token]);

  const handleAccept = async () => {
    if (!offer) return;
    setLoading(true);
    try {
      // 1. Update offer status
      await updateDoc(doc(db, 'system_offers', offer.id), {
        status: 'accepted',
        acceptedAt: serverTimestamp()
      });

      // 2. Create the company
      const companyPlan = (offer as any).plan || (offer.customPrice >= 6000 ? 'entreprenor' : offer.customPrice <= 2000 ? 'solo' : 'team');
      const companyRef = await addDoc(collection(db, 'companies'), {
        name: offer.companyName,
        subscriptionStatus: 'trial',
        plan: companyPlan,
        modules: offer.modules,
        customPrice: offer.customPrice,
        trialDays: offer.trialDays,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        userCount: 0
      });

      setAccepted(true);
      setLoading(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'system_offers');
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-4">
        <div className="max-w-md w-full bg-white p-12 rounded-[2.5rem] shadow-xl text-center border border-neutral-100">
          <XCircle size={64} className="text-red-500 mx-auto mb-6" />
          <h1 className="text-2xl font-bold text-neutral-900 mb-4">Beklager</h1>
          <p className="text-neutral-500 mb-8">{error}</p>
          <a href="/" className="inline-block px-8 py-4 bg-neutral-900 text-white rounded-2xl font-bold hover:bg-neutral-800 transition-all">
            Gå til forsiden
          </a>
        </div>
      </div>
    );
  }

  if (accepted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-4">
        <div className="max-w-md w-full bg-white p-12 rounded-[2.5rem] shadow-xl text-center border border-neutral-100">
          <CheckCircle2 size={64} className="text-emerald-600 mx-auto mb-6" />
          <h1 className="text-3xl font-black text-neutral-900 mb-4">Velkommen!</h1>
          <p className="text-neutral-600 mb-8">
            Tilbudet er akseptert og din bedriftskonto er opprettet. Vi har sendt en e-post til {offer?.recipientEmail} med innloggingsdetaljer.
          </p>
          <a href="/login" className="inline-block w-full px-8 py-4 bg-gradient-to-r from-electric-500 to-electric-400 text-white rounded-2xl font-bold hover:from-electric-400 hover:to-electric-300 transition-all shadow-purple-cta text-center">
            Logg inn nå
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 pt-32 pb-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-[3rem] shadow-2xl shadow-neutral-200/50 border border-neutral-100 overflow-hidden"
        >
          <div className="bg-neutral-900 p-12 text-white relative overflow-hidden">
            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 px-4 py-1 bg-emerald-500/20 text-emerald-400 rounded-full text-[10px] font-black uppercase tracking-widest mb-6 border border-emerald-500/30">
                <Zap size={12} />
                Eksklusivt Tilbud
              </div>
              <h1 className="text-5xl font-black tracking-tight mb-4">Skreddersydd for {offer?.companyName}</h1>
              <p className="text-neutral-400 text-lg max-w-2xl">
                Vi har satt sammen en pakke som passer perfekt for deres behov. Test systemet fullt ut i {offer?.trialDays} dager uten forpliktelser.
              </p>
            </div>
            {/* Abstract background shapes */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
          </div>

          <div className="p-12">
            {offer?.message && (
              <div className="mb-12 p-8 bg-neutral-50 rounded-[2rem] border border-neutral-100 italic text-neutral-600">
                "{offer.message}"
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-12">
              <div>
                <h2 className="text-xs font-black uppercase tracking-widest text-neutral-400 mb-6 flex items-center gap-2">
                  <Package size={16} />
                  Inkluderte Moduler
                </h2>
                <div className="grid grid-cols-1 gap-3">
                  {offer?.modules.map(moduleId => {
                    const module = allModules.find(m => m.id === moduleId);
                    return (
                      <div key={moduleId} className="flex items-center gap-4 p-4 bg-white border border-neutral-100 rounded-2xl shadow-sm">
                        <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                          {module?.icon || <CheckCircle2 size={20} />}
                        </div>
                        <span className="font-bold text-neutral-900">{module?.name || moduleId}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-8">
                <div>
                  <h2 className="text-xs font-black uppercase tracking-widest text-neutral-400 mb-6 flex items-center gap-2">
                    <Clock size={16} />
                    Vilkår
                  </h2>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-orange-50 rounded-2xl border border-orange-100">
                      <span className="text-sm font-bold text-orange-900">Prøveperiode</span>
                      <span className="text-xl font-black text-orange-600">{offer?.trialDays} dager</span>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-blue-50 rounded-2xl border border-blue-100">
                      <span className="text-sm font-bold text-blue-900">Pris etter prøveperiode</span>
                      <span className="text-xl font-black text-blue-600">{offer?.customPrice},- <span className="text-xs font-medium">/mnd</span></span>
                    </div>
                  </div>
                </div>

                <div className="p-8 bg-gradient-to-r from-electric-600 to-electric-500 rounded-[2rem] text-white shadow-purple-cta">
                  <h3 className="font-bold mb-2">Klar til å starte?</h3>
                  <p className="text-sm text-emerald-100 mb-6">Ved å akseptere tilbudet får du umiddelbar tilgang til alle valgte moduler.</p>
                  <button 
                    onClick={handleAccept}
                    disabled={loading}
                    className="w-full py-4 bg-white text-electric-600 rounded-2xl font-bold uppercase tracking-wider hover:bg-slate-50 transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 cursor-pointer"
                  >
                    {loading ? 'Behandler...' : 'Aksepter Tilbud'}
                    <ArrowRight size={18} />
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-8 border-t border-neutral-100 text-center">
              <p className="text-xs text-neutral-400">
                Har du spørsmål? Kontakt oss på hei@vikingmester.no eller via kundeportalen.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

// Helper icons for the module list (copied from SuperAdmin for consistency)
const AlertTriangle = ({ size }: { size: number }) => <Shield size={size} className="text-amber-500" />;
const Calculator = ({ size }: { size: number }) => <Building2 size={size} className="text-blue-500" />;
const Library = ({ size }: { size: number }) => <Building2 size={size} className="text-purple-500" />;
const Car = ({ size }: { size: number }) => <Building2 size={size} className="text-emerald-500" />;
const Timer = ({ size }: { size: number }) => <Clock size={size} className="text-orange-500" />;
const GraduationCap = ({ size }: { size: number }) => <Building2 size={size} className="text-indigo-500" />;
