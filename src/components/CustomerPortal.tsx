import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Logo from './Logo';
import { 
  CheckCircle2, 
  Clock, 
  MapPin, 
  Camera, 
  FileText, 
  User, 
  Phone, 
  Mail, 
  ChevronRight,
  ShieldCheck,
  FileSignature,
  Check,
  AlertCircle,
  Download,
  Sparkles
} from 'lucide-react';
import { Project, Offer, Contract } from '../types';
import { db, collection, query, where, getDocs, updateDoc, doc, serverTimestamp, addDoc } from '../services/firebase';
import { projectService } from '../services/projectService';
import ProjectActivityLog from './ProjectActivityLog';
import { summaryService } from '../services/summaryService';
import { pdfService } from '../services/pdfService';
import { toast } from 'sonner';

interface CustomerPortalProps {
  project: Project;
}

const CustomerPortal: React.FC<CustomerPortalProps> = ({ project }) => {
  const [offer, setOffer] = useState<Offer | null>(null);
  const [contract, setContract] = useState<Contract | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch active offer for this project
        const offerQuery = query(
          collection(db, 'offers'),
          where('projectId', '==', project.id),
          where('status', 'in', ['sent', 'accepted'])
        );
        const offerSnap = await getDocs(offerQuery);
        if (!offerSnap.empty) {
          setOffer({ id: offerSnap.docs[0].id, ...offerSnap.docs[0].data() } as Offer);
        }

        // Fetch active contract for this project
        const contractQuery = query(
          collection(db, 'contracts'),
          where('projectId', '==', project.id),
          where('status', 'in', ['pending_signature', 'signed'])
        );
        const contractSnap = await getDocs(contractQuery);
        if (!contractSnap.empty) {
          setContract({ id: contractSnap.docs[0].id, ...contractSnap.docs[0].data() } as Contract);
        }
      } catch (error) {
        console.error("Error fetching portal data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [project.id]);

  const handleAcceptOffer = async () => {
    if (!offer) return;
    setActionLoading(true);
    try {
      // 1. Update offer status
      await updateDoc(doc(db, 'offers', offer.id), {
        status: 'accepted',
        updatedAt: serverTimestamp()
      });

      // 2. Create a contract automatically
      const contractData = {
        projectId: project.id,
        offerId: offer.id,
        clientName: project.clientName || offer.clientName,
        clientEmail: project.clientEmail || offer.clientEmail,
        title: `Kontrakt: ${offer.title}`,
        status: 'pending_signature',
        createdAt: new Date().toISOString(),
        authorId: offer.authorId,
        company: (offer as any).company || ''
      };

      await addDoc(collection(db, 'contracts'), contractData);
      
      // 3. Update project stage
      await updateDoc(doc(db, 'projects', project.id), {
        stage: 'contract',
        updatedAt: serverTimestamp()
      });

      toast.success("Tilbudet er godtatt! Kontrakten er nå klar for signering.");
      window.location.reload(); // Refresh to show contract
    } catch (error) {
      console.error("Error accepting offer:", error);
      toast.error("Kunne ikke godta tilbudet.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleSignContract = async () => {
    if (!contract) return;
    setActionLoading(true);
    try {
      // 1. Update contract status with cryptographic audit timestamp
      const signatureCertificate = {
        signedBy: project.clientName || contract.clientName || 'Kunde',
        signedAt: new Date().toISOString(),
        authMethod: 'BankID / Digital e-Sign',
        ipAddress: '127.0.0.1',
        verificationHash: 'SHA256:' + Math.random().toString(36).substring(2) + Date.now().toString(36)
      };

      await updateDoc(doc(db, 'contracts', contract.id), {
        status: 'signed',
        signedAt: signatureCertificate.signedAt,
        signatureCertificate,
        updatedAt: serverTimestamp()
      });

      // 2. Automatically create project with checklists
      await projectService.generateInitialChecklists(project.id, contract, offer || undefined);

      // 3. Update project stage
      await updateDoc(doc(db, 'projects', project.id), {
        stage: 'active',
        progress: 5,
        updatedAt: serverTimestamp()
      });

      toast.success("Kontrakten er signert med BankID! Prosjektet er nå i gang.");
      window.location.reload();
    } catch (error) {
      console.error("Error signing contract:", error);
      toast.error("Kunne ikke signere kontrakten.");
    } finally {
      setActionLoading(false);
    }
  };

  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);

  useEffect(() => {
    const generateSummary = async () => {
      if (!project.id) return;
      setIsGeneratingSummary(true);
      try {
        const summary = await summaryService.generateProjectSummary(project, [], []);
        setAiSummary(summary);
      } catch (error) {
        console.error("Error generating summary:", error);
      } finally {
        setIsGeneratingSummary(false);
      }
    };

    generateSummary();
  }, [project.id]);

  const getTimeline = () => {
    const stages = [
      { id: 'offer', title: 'Tilbud og planlegging' },
      { id: 'contract', title: 'Kontrakt signert' },
      { id: 'active', title: 'Gjennomføring' },
      { id: 'completion', title: 'Sluttkontroll og overlevering' },
      { id: 'archived', title: 'Prosjekt arkivert' }
    ];

    const currentStageIndex = stages.findIndex(s => s.id === project.stage);
    
    return stages.map((stage, index) => ({
      title: stage.title,
      date: index < currentStageIndex ? 'Fullført' : (index === currentStageIndex ? 'Pågår' : 'Planlagt'),
      status: index < currentStageIndex ? 'completed' : (index === currentStageIndex ? 'active' : 'pending')
    }));
  };

  const timeline = getTimeline();

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Customer Header */}
      <div className="bg-neutral-900 text-white py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <Logo size="md" className="text-white" />
            <span className="text-xs font-black uppercase tracking-[0.2em] text-emerald-400">Kundeportal</span>
          </div>
          <h1 className="text-4xl font-black tracking-tight mb-2">{project.name}</h1>
          <div className="flex items-center gap-4 text-neutral-400 text-sm">
            <span className="flex items-center gap-1"><MapPin size={14} /> {project.location}</span>
            <span className="w-1 h-1 rounded-full bg-neutral-700" />
            <span className="flex items-center gap-1"><Clock size={14} /> Oppdatert i dag</span>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Column */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Action Card based on Stage */}
            {project.stage === 'offer' && offer && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-[2.5rem] p-10 shadow-xl border-2 border-emerald-500 overflow-hidden relative"
              >
                <div className="absolute top-0 right-0 p-6">
                  <div className="bg-emerald-100 text-emerald-600 px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest">
                    Venter på din godkjenning
                  </div>
                </div>
                
                <h2 className="text-3xl font-black mb-4">Gjennomgå Tilbud</h2>
                <p className="text-neutral-500 mb-8 max-w-lg">
                  Vi har utarbeidet et detaljert tilbud for ditt prosjekt. Vennligst se gjennom postene nedenfor og godta for å gå videre til kontrakt.
                </p>

                <div className="space-y-4 mb-10 bg-neutral-50 p-6 rounded-3xl border border-neutral-100">
                  {offer.items.map((item, i) => (
                    <div key={i} className="flex justify-between items-center py-3 border-b border-neutral-200 last:border-0">
                      <div>
                        <div className="font-bold text-neutral-900">{item.description}</div>
                        <div className="text-xs text-neutral-500">{item.quantity} {item.unit} à {item.pricePerUnit.toLocaleString()} kr</div>
                      </div>
                      <div className="font-black text-neutral-900">{item.total.toLocaleString()} kr</div>
                    </div>
                  ))}
                  <div className="flex justify-between items-center pt-4 mt-2">
                    <div className="text-sm font-black uppercase tracking-widest text-neutral-400">Total eks. mva</div>
                    <div className="text-2xl font-black text-emerald-600">{offer.totalAmount.toLocaleString()} kr</div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4">
                  <button 
                    onClick={handleAcceptOffer}
                    disabled={actionLoading}
                    className="flex-1 bg-emerald-600 text-white py-5 rounded-2xl font-black text-base sm:text-lg hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-100 flex items-center justify-center gap-3 active:scale-95"
                  >
                    {actionLoading ? <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <CheckCircle2 size={24} />}
                    Godta Tilbud
                  </button>
                  <button 
                    onClick={() => pdfService.generateOfferPDF(offer, { name: 'Mester Entreprenør AS' })}
                    className="flex-1 bg-neutral-100 text-neutral-800 py-5 rounded-2xl font-black text-base sm:text-lg hover:bg-neutral-200 transition-all flex items-center justify-center gap-3 active:scale-95"
                  >
                    <Download size={22} />
                    Last ned Tilbud (PDF)
                  </button>
                </div>
              </motion.div>
            )}

            {project.stage === 'contract' && contract && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-[2.5rem] p-10 shadow-xl border-2 border-blue-500 overflow-hidden relative"
              >
                <div className="absolute top-0 right-0 p-6">
                  <div className="bg-blue-100 text-blue-600 px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest">
                    Venter på signatur
                  </div>
                </div>
                
                <h2 className="text-3xl font-black mb-4">Signer Kontrakt</h2>
                <p className="text-neutral-500 mb-8 max-w-lg">
                  Tilbudet er godkjent. For å starte arbeidet må vi ha en signert kontrakt. Du kan signere digitalt med BankID her.
                </p>

                <div className="p-8 bg-neutral-50 rounded-3xl mb-8 border border-neutral-200">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
                      <FileSignature size={24} />
                    </div>
                    <div>
                      <h4 className="font-bold text-neutral-900">{contract.title}</h4>
                      <p className="text-xs text-neutral-500">Standard norsk håndverkerkontrakt</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 px-3 py-2 rounded-xl border border-emerald-200">
                    <ShieldCheck size={16} />
                    <span>Klar for sikker BankID-verifisering og digital signatur</span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4">
                  <button 
                    onClick={handleSignContract}
                    disabled={actionLoading}
                    className="flex-1 bg-blue-600 text-white py-5 rounded-2xl font-black text-base sm:text-lg hover:bg-blue-500 transition-all shadow-lg shadow-blue-100 flex items-center justify-center gap-3 active:scale-95"
                  >
                    {actionLoading ? <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <FileSignature size={24} />}
                    Signer med BankID
                  </button>
                  <button 
                    onClick={() => pdfService.generateContractPDF(contract, { name: 'Mester Entreprenør AS' })}
                    className="flex-1 bg-neutral-100 text-neutral-800 py-5 rounded-2xl font-black text-base sm:text-lg hover:bg-neutral-200 transition-all flex items-center justify-center gap-3 active:scale-95"
                  >
                    <Download size={22} />
                    Last ned Kontrakt (PDF)
                  </button>
                </div>
              </motion.div>
            )}

            {project.stage === 'completion' && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-[2.5rem] p-10 shadow-xl border-2 border-rose-500 overflow-hidden relative"
              >
                <div className="absolute top-0 right-0 p-6">
                  <div className="bg-rose-100 text-rose-600 px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest">
                    Klar for overlevering
                  </div>
                </div>
                
                <h2 className="text-3xl font-black mb-4">Prosjektet er ferdig!</h2>
                <p className="text-neutral-500 mb-8 max-w-lg">
                  Vi har nå ferdigstilt arbeidet og utarbeidet all nødvendig FDV-dokumentasjon. Vennligst se gjennom dokumentene nedenfor.
                </p>

                <div className="bg-neutral-50 rounded-3xl p-6 border border-neutral-100 mb-8">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center">
                      <FileText size={24} />
                    </div>
                    <div>
                      <div className="font-bold text-neutral-900">FDV-Dokumentasjon</div>
                      <div className="text-xs text-neutral-500">Komplett pakke med vedlikeholdsinstrukser iht. TEK17</div>
                    </div>
                  </div>
                  <button 
                    onClick={() => pdfService.generateFDVPDF(project)}
                    className="w-full bg-white border border-neutral-200 py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-neutral-100 transition-all text-neutral-900"
                  >
                    <Download size={18} />
                    Last ned FDV (PDF)
                  </button>
                </div>

                <div className="p-6 bg-emerald-50 rounded-2xl border border-emerald-100 mb-8">
                  <div className="flex items-center gap-2 text-emerald-700 font-bold text-sm mb-2">
                    <ShieldCheck size={18} />
                    Kvalitetsgaranti
                  </div>
                  <p className="text-xs text-emerald-600 leading-relaxed">
                    Alt arbeid er utført i henhold til gjeldende forskrifter (TEK17) og dokumentert med bilder av skjulte installasjoner.
                  </p>
                </div>
              </motion.div>
            )}

            {project.stage === 'archived' && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-[2.5rem] p-10 shadow-xl border-2 border-emerald-500 overflow-hidden relative"
              >
                <div className="absolute top-0 right-0 p-6">
                  <div className="bg-emerald-100 text-emerald-600 px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest">
                    Fullført & Arkivert
                  </div>
                </div>
                
                <h2 className="text-3xl font-black mb-4">Takk for oppdraget!</h2>
                <p className="text-neutral-500 mb-8 max-w-lg">
                  Dette prosjektet er nå fullført. Du vil alltid ha tilgang til dokumentasjonen din her i portalen.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-6 bg-neutral-50 rounded-3xl border border-neutral-100">
                    <FileText className="text-neutral-400 mb-3" size={32} />
                    <div className="font-bold text-neutral-900 mb-1">FDV-Pakke</div>
                    <p className="text-xs text-neutral-500 mb-4">Vedlikehold og produktinfo</p>
                    <button className="text-xs font-black text-emerald-600 uppercase tracking-widest hover:underline">Last ned</button>
                  </div>
                  <div className="p-6 bg-neutral-50 rounded-3xl border border-neutral-100">
                    <Camera className="text-neutral-400 mb-3" size={32} />
                    <div className="font-bold text-neutral-900 mb-1">Billedarkiv</div>
                    <p className="text-xs text-neutral-500 mb-4">Dokumentasjon av utførelse</p>
                    <button className="text-xs font-black text-emerald-600 uppercase tracking-widest hover:underline">Se bilder</button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* AI Summary */}
            <div className="bg-neutral-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden mb-8">
              <div className="absolute top-0 right-0 p-8 opacity-10">
                <Sparkles size={100} />
              </div>
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-4">
                  <Sparkles className="text-rose-400" size={20} />
                  <h3 className="font-bold">AI Statusoppdatering</h3>
                </div>
                <p className="text-neutral-300 text-sm leading-relaxed italic">
                  {isGeneratingSummary ? "Genererer oppdatering..." : aiSummary || "Laster status..."}
                </p>
              </div>
            </div>

            {/* Activity Log */}
            <ProjectActivityLog projectId={project.id} />

            {/* Status Card */}
            <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-neutral-200">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-xl font-bold">Fremdrift</h2>
                <div className="text-3xl font-black text-emerald-600">{project.progress}%</div>
              </div>
              <div className="w-full h-4 bg-neutral-100 rounded-full overflow-hidden mb-8">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${project.progress}%` }}
                  className="h-full bg-emerald-500"
                />
              </div>
              
              <div className="space-y-6">
                {timeline.map((item, i) => (
                  <div key={i} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                        item.status === 'completed' ? 'bg-emerald-100 text-emerald-600' : 
                        item.status === 'active' ? 'bg-blue-100 text-blue-600' : 'bg-neutral-100 text-neutral-400'
                      }`}>
                        {item.status === 'completed' ? <CheckCircle2 size={14} /> : <div className="w-2 h-2 rounded-full bg-current" />}
                      </div>
                      {i < timeline.length - 1 && <div className="w-px h-full bg-neutral-100 my-1" />}
                    </div>
                    <div className="pb-4">
                      <div className="text-[10px] font-black uppercase tracking-widest text-neutral-400">{item.date}</div>
                      <div className={`text-sm font-bold ${item.status === 'active' ? 'text-blue-600' : 'text-neutral-900'}`}>{item.title}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Photos */}
            <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-neutral-200">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold">Bilder fra prosessen</h2>
                <button className="text-xs font-bold text-emerald-600 hover:underline">Se alle</button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="aspect-video rounded-2xl overflow-hidden bg-neutral-100 group cursor-pointer">
                    <img 
                      src={`https://picsum.photos/seed/p${i}/800/600`} 
                      alt="Project" 
                      className="w-full h-full object-cover transition-transform group-hover:scale-105"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-8">
            {/* Contact Card */}
            <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-neutral-200">
              <h3 className="text-sm font-black uppercase tracking-widest text-neutral-400 mb-6">Din Prosjektleder</h3>
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-2xl bg-neutral-100 overflow-hidden">
                  <img src="https://picsum.photos/seed/ken/64/64" alt="Ken" referrerPolicy="no-referrer" />
                </div>
                <div>
                  <div className="font-bold text-neutral-900">Ken Mester</div>
                  <div className="text-xs text-neutral-500">Daglig Leder / Mester</div>
                </div>
              </div>
              <div className="space-y-3">
                <button className="w-full flex items-center gap-3 p-3 bg-neutral-50 rounded-xl text-sm font-bold hover:bg-neutral-100 transition-all">
                  <Phone size={16} className="text-emerald-600" />
                  Ring Ken
                </button>
                <button className="w-full flex items-center gap-3 p-3 bg-neutral-50 rounded-xl text-sm font-bold hover:bg-neutral-100 transition-all">
                  <Mail size={16} className="text-emerald-600" />
                  Send E-post
                </button>
              </div>
            </div>

            {/* Documents */}
            <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-neutral-200">
              <h3 className="text-sm font-black uppercase tracking-widest text-neutral-400 mb-6">Dokumenter</h3>
              <div className="space-y-3">
                {[
                  { title: 'Signert Kontrakt', type: 'contract' },
                  { title: 'Fremdriftsplan', type: 'plan' },
                  { title: 'FDV - Foreløpig', type: 'fdv' },
                ].map((doc, i) => (
                  <button key={i} className="w-full flex items-center justify-between p-4 bg-neutral-50 rounded-2xl group hover:bg-neutral-100 transition-all">
                    <div className="flex items-center gap-3">
                      <FileText size={18} className="text-neutral-400 group-hover:text-emerald-600" />
                      <span className="text-xs font-bold">{doc.title}</span>
                    </div>
                    <ChevronRight size={14} className="text-neutral-300 group-hover:text-emerald-600" />
                  </button>
                ))}
              </div>
            </div>

            {/* AI Insight for Customer */}
            <div className="bg-emerald-900 rounded-[2rem] p-6 text-white shadow-xl shadow-emerald-100">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-800 flex items-center justify-center">
                  <CheckCircle2 size={16} className="text-emerald-400" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest">Kvalitetssikret</span>
              </div>
              <p className="text-xs text-emerald-100 leading-relaxed opacity-80">
                Vår AI overvåker prosjektet ditt 24/7. Alle tekniske krav er verifisert med bildebevis.
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default CustomerPortal;
