import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, FileSignature, CheckCircle2, Clock, AlertCircle, Search, Filter, Download, ExternalLink, Plus, Send, Sparkles, ShieldAlert, ArrowLeft, ShieldCheck } from 'lucide-react';
import { Contract, Project } from '../types';
import { db, auth, handleFirestoreError, OperationType, collection, addDoc, serverTimestamp, onSnapshot, query, orderBy, where } from '../services/firebase';
import { contractAiService, ContractRisk } from '../services/contractAiService';
import { masterAiService } from '../services/masterAiService';
import AiTextAssistant from './AiTextAssistant';
import { useAuth } from '../hooks/useAuth';
import { cn } from '../lib/utils';

interface ContractModalProps {
  isOpen: boolean;
  onClose: () => void;
  projects?: Project[];
  selectedProject?: Project | null;
  inline?: boolean;
}

const ContractModal: React.FC<ContractModalProps> = ({ 
  isOpen, 
  onClose,
  projects = [],
  selectedProject,
  inline = false
}) => {
  const { user, company } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isNewContractOpen, setIsNewContractOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isReviewing, setIsReviewing] = useState(false);
  const [isComparing, setIsComparing] = useState(false);
  const [risks, setRisks] = useState<ContractRisk[]>([]);
  const [comparisonResult, setComparisonResult] = useState<any>(null);
  const [selectedContractForReview, setSelectedContractForReview] = useState<Contract | null>(null);

  // Form state
  const [newTitle, setNewTitle] = useState('');
  const [newProjectCode, setNewProjectCode] = useState('');
  const [newClientName, setNewClientName] = useState('');
  const [newClientEmail, setNewClientEmail] = useState('');

  useEffect(() => {
    if (!isOpen || !user) return;

    if (!company) {
      setIsLoading(false);
      return;
    }

    const q = query(
      collection(db, 'contracts'), 
      where('company', '==', company),
      orderBy('createdAt', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const contractsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Contract[];
      setContracts(contractsData);
      setIsLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'contracts');
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [isOpen, user]);

  const handleReviewContract = async (contract: Contract) => {
    setSelectedContractForReview(contract);
    setIsReviewing(true);
    setRisks([]);
    try {
      // In a real app, we'd fetch the actual contract text. 
      // For this demo, we'll simulate it based on the title and client.
      const simulatedText = `Kontrakt for ${contract.title} mellom ${contract.clientName} og Entreprenør. 
      Dette er et standardoppdrag for tømrerarbeid. Ingen spesifikke dagmulkter er nevnt. 
      Betalingsbetingelser er 14 dager netto.`;
      
      const analysis = await contractAiService.reviewContract(simulatedText);
      setRisks(analysis);
    } catch (error) {
      console.error("Contract review failed:", error);
    } finally {
      setIsReviewing(false);
    }
  };
  const handleCompareWithOffer = async (contract: Contract) => {
    setIsComparing(true);
    setComparisonResult(null);
    try {
      // In a real app, we'd fetch the actual contract text and the associated offer items.
      const simulatedContractText = `Kontrakt for ${contract.title}. Pris: 150 000 kr. Oppstart: 01.04.2026.`;
      const simulatedOfferItems = [
        { description: 'Arbeid', quantity: 1, unit: 'stk', pricePerUnit: 120000, total: 120000 },
        { description: 'Materiell', quantity: 1, unit: 'stk', pricePerUnit: 30000, total: 30000 }
      ];
      
      const comparison = await contractAiService.compareContractWithOffer(simulatedContractText, simulatedOfferItems);
      setComparisonResult(comparison);
    } catch (error) {
      console.error("Contract comparison failed:", error);
    } finally {
      setIsComparing(false);
    }
  };

  const handleCreateContract = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;

    setIsSaving(true);
    try {
      const contractData = {
        title: newTitle,
        projectCode: newProjectCode,
        clientName: newClientName,
        clientEmail: newClientEmail,
        status: 'draft',
        authorId: auth.currentUser.uid,
        company: company || '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await addDoc(collection(db, 'contracts'), contractData);
      setIsNewContractOpen(false);
      setNewTitle('');
      setNewProjectCode('');
      setNewClientName('');
      setNewClientEmail('');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'contracts');
    } finally {
      setIsSaving(false);
    }
  };

  // ⚡ Bolt: Memoize filteredContracts to prevent expensive O(N) recalculations on every render
  const filteredContracts = useMemo(() => {
    return contracts.filter(c =>
      c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.projectCode?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [contracts, searchTerm]);

  const getStatusBadge = (status: Contract['status']) => {
    switch (status) {
      case 'signed':
        return <span className="flex items-center gap-1 px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full text-[10px] font-bold uppercase tracking-wider"><CheckCircle2 size={10} /> Signert</span>;
      case 'pending_signature':
        return <span className="flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-700 rounded-full text-[10px] font-bold uppercase tracking-wider"><Clock size={10} /> Venter på signering</span>;
      case 'draft':
        return <span className="flex items-center gap-1 px-2 py-1 bg-neutral-100 text-neutral-700 rounded-full text-[10px] font-bold uppercase tracking-wider"><AlertCircle size={10} /> Utkast</span>;
      default:
        return null;
    }
  };

  if (!isOpen) return null;

  const content = (
    <div className={cn(
      "bg-[#0B0F17] text-white border border-slate-800 w-full overflow-hidden flex flex-col",
      inline 
        ? "rounded-3xl shadow-xl min-h-[720px]" 
        : "max-w-5xl rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl max-h-[92vh] sm:max-h-[90vh] pb-[env(safe-area-inset-bottom,0px)]"
    )}>
      {/* Mobile Grab Handle */}
      {!inline && <div className="sm:hidden w-12 h-1.5 bg-slate-700 rounded-full mx-auto mt-3 mb-1 shrink-0" />}

      {/* Header */}
      <div className="p-4 sm:p-6 border-b border-slate-800 flex items-center justify-between bg-[#131722] shrink-0">
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-lg shrink-0">
            <FileSignature size={22} className="sm:w-6 sm:h-6" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-2xl font-bold tracking-tight text-white truncate">Kontraktshåndtering</h2>
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                <ShieldCheck size={11} /> NS 8405 / NS 8406
              </span>
            </div>
            <p className="text-slate-400 text-xs sm:text-sm font-medium truncate">
              Administrer, signer og analyser kontrakter mot tilbud med MesterAI
            </p>
          </div>
        </div>
        {inline ? (
          <button 
            type="button"
            onClick={onClose} 
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold transition-all cursor-pointer border border-slate-700 shrink-0"
            title="Gå tilbake til arbeidsstasjonen"
          >
            <ArrowLeft size={14} />
            <span className="hidden sm:inline">Tilbake til chat</span>
          </button>
        ) : (
          <button onClick={onClose} aria-label="Lukk" className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors shrink-0 cursor-pointer">
            <X size={20} className="sm:w-6 sm:h-6" />
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-8 custom-scrollbar bg-[#0B0F17]">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6 sm:mb-8">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <input 
                type="text" 
                placeholder="Søk i kontrakter..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-slate-950 border border-slate-800 text-white placeholder:text-slate-600 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-sm"
              />
            </div>
            <div className="flex items-center gap-3 w-full md:w-auto">
              <button className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-3 bg-[#131722] border border-slate-800 text-slate-300 rounded-2xl text-sm font-bold hover:bg-slate-800 transition-all">
                <Filter size={16} />
                Filter
              </button>
              <button 
                onClick={() => setIsNewContractOpen(true)}
                className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl text-sm font-bold hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-900/30"
              >
                <Plus size={16} />
                Ny Kontrakt
              </button>
            </div>
          </div>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-12 h-12 border-4 border-indigo-900 border-t-indigo-500 rounded-full animate-spin mb-4" />
              <p className="text-slate-400 font-medium">Laster kontrakter...</p>
            </div>
          ) : (
            <div className="bg-[#131722] border border-slate-800 rounded-2xl sm:rounded-[2rem] overflow-hidden shadow-sm">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#0D131F] border-b border-slate-800">
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Kode / Tittel / Kunde</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Opprettet</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Handlinger</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredContracts.map((contract) => (
                    <tr key={contract.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {contract.projectCode && (
                            <span className="px-1.5 py-0.5 bg-slate-800 text-slate-300 text-[10px] font-bold rounded uppercase border border-slate-700">
                              {contract.projectCode}
                            </span>
                          )}
                          <div className="font-bold text-white">{contract.title}</div>
                        </div>
                        <div className="text-xs text-slate-400 font-medium">{contract.clientName}</div>
                      </td>
                      <td className="px-6 py-4">
                        {getStatusBadge(contract.status)}
                      </td>
                      <td className="px-6 py-4 text-sm font-bold text-slate-300">
                        {(contract.createdAt as any)?.seconds 
                          ? new Date((contract.createdAt as any).seconds * 1000).toLocaleDateString()
                          : String(contract.createdAt)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => {
                              handleReviewContract(contract);
                              handleCompareWithOffer(contract);
                            }}
                            className="p-2 text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10 rounded-lg transition-all flex items-center gap-1"
                            title="AI Kontroll & Sammenligning"
                          >
                            <Sparkles size={18} />
                          </button>
                          <button className="p-2 text-slate-400 hover:text-indigo-400 hover:bg-slate-800 rounded-lg transition-all">
                            <Download size={18} />
                          </button>
                          <button className="p-2 text-slate-400 hover:text-indigo-400 hover:bg-slate-800 rounded-lg transition-all">
                            <ExternalLink size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredContracts.length === 0 && (
                <div className="p-12 text-center">
                  <div className="w-16 h-16 bg-slate-800/50 text-slate-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-700">
                    <FileSignature size={32} />
                  </div>
                  <h3 className="text-lg font-bold text-white">Ingen kontrakter funnet</h3>
                  <p className="text-slate-400 text-sm">Prøv et annet søkeord eller opprett en ny kontrakt.</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* AI Review Modal */}
        <AnimatePresence>
          {selectedContractForReview && (
            <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md">
              <motion.div
                initial={{ opacity: 0, scale: 0.98, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98, y: 20 }}
                className="bg-[#0B0F17] text-white border border-slate-800 w-full max-w-2xl rounded-t-[2rem] sm:rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[85vh] pb-[env(safe-area-inset-bottom,0px)]"
              >
                {/* Mobile Grab Handle */}
                <div className="sm:hidden w-12 h-1.5 bg-slate-700 rounded-full mx-auto mt-3 mb-1 shrink-0" />

                <div className="p-4 sm:p-6 border-b border-slate-800 flex items-center justify-between bg-[#131722] text-white shrink-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <Sparkles size={20} className="text-indigo-400 sm:w-6 sm:h-6 shrink-0" />
                    <div className="min-w-0">
                      <h3 className="text-base sm:text-xl font-bold truncate">AI Kontraktskontroll</h3>
                      <p className="text-xs text-indigo-300 truncate">{selectedContractForReview.title}</p>
                    </div>
                  </div>
                  <button onClick={() => setSelectedContractForReview(null)} className="p-2 hover:bg-slate-800 rounded-xl transition-colors shrink-0 text-slate-400 hover:text-white">
                    <X size={20} />
                  </button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-6 custom-scrollbar bg-[#0B0F17]">
                  {isReviewing ? (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                      <div className="w-12 h-12 border-4 border-indigo-900 border-t-indigo-500 rounded-full animate-spin mb-4" />
                      <p className="font-bold">AI analyserer juridiske risikoer...</p>
                    </div>
                  ) : (
                    <>
                      <div className="p-4 bg-indigo-950/30 rounded-2xl border border-indigo-800/40 flex items-start gap-3">
                        <ShieldAlert className="text-indigo-400 shrink-0" size={20} />
                        <p className="text-xs text-indigo-200 font-medium">
                          Vår AI har skannet kontrakten opp mot NS-standarder og identifisert følgende punkter som bør vurderes.
                        </p>
                      </div>

                      <div className="space-y-4">
                        <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Risikovurdering</h4>
                        {risks.map((risk, i) => (
                          <div key={i} className="p-5 bg-[#131722] border border-slate-800 rounded-2xl space-y-3">
                            <div className="flex items-center justify-between">
                              <h4 className="font-bold text-sm text-white">{risk.risk}</h4>
                              <span className={cn(
                                "px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest",
                                risk.severity === 'high' ? "bg-rose-950/40 text-rose-300 border border-rose-800/50" :
                                risk.severity === 'medium' ? "bg-amber-950/40 text-amber-300 border border-amber-800/50" :
                                "bg-blue-950/40 text-blue-300 border border-blue-800/50"
                              )}>
                                {risk.severity === 'high' ? 'Høy Risiko' : risk.severity === 'medium' ? 'Middels' : 'Lav'}
                              </span>
                            </div>
                            <p className="text-xs text-slate-300 leading-relaxed">
                              <span className="font-bold text-white">Anbefaling:</span> {risk.recommendation}
                            </p>
                          </div>
                        ))}
                      </div>

                      {isComparing ? (
                        <div className="flex flex-col items-center justify-center py-10 text-slate-400 border-t border-slate-800 pt-10">
                          <div className="w-8 h-8 border-3 border-indigo-900 border-t-indigo-500 rounded-full animate-spin mb-3" />
                          <p className="text-xs font-bold">Sammenligner med tilbud...</p>
                        </div>
                      ) : comparisonResult && (
                        <div className="space-y-4 border-t border-slate-800 pt-10">
                          <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Sammenligning med Tilbud</h4>
                          <div className="p-5 bg-emerald-950/20 border border-emerald-800/40 rounded-2xl space-y-4">
                            <div className="flex items-center gap-2 text-emerald-400">
                              <CheckCircle2 size={16} />
                              <h5 className="font-bold text-sm">Samsvarsanalyse</h5>
                            </div>
                            
                            <div className="space-y-3">
                              <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400 mb-1">Samsvarer</p>
                                <ul className="space-y-1">
                                  {comparisonResult.matches.map((match: string, i: number) => (
                                    <li key={i} className="text-xs text-emerald-200 flex items-start gap-2">
                                      <span className="mt-1 w-1 h-1 bg-emerald-400 rounded-full shrink-0" />
                                      {match}
                                    </li>
                                  ))}
                                </ul>
                              </div>

                              {comparisonResult.discrepancies.length > 0 && (
                                <div>
                                  <p className="text-[10px] font-black uppercase tracking-widest text-rose-400 mb-1">Avvik Funnet</p>
                                  <ul className="space-y-1">
                                    {comparisonResult.discrepancies.map((disc: string, i: number) => (
                                      <li key={i} className="text-xs text-rose-200 flex items-start gap-2">
                                        <span className="mt-1 w-1 h-1 bg-rose-400 rounded-full shrink-0" />
                                        {disc}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              {comparisonResult.missingItems.length > 0 && (
                                <div>
                                  <p className="text-[10px] font-black uppercase tracking-widest text-amber-400 mb-1">Mangler i Kontrakt</p>
                                  <ul className="space-y-1">
                                    {comparisonResult.missingItems.map((item: string, i: number) => (
                                      <li key={i} className="text-xs text-amber-200 flex items-start gap-2">
                                        <span className="mt-1 w-1 h-1 bg-amber-400 rounded-full shrink-0" />
                                        {item}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>

                <div className="p-6 border-t border-slate-800 bg-[#131722] flex justify-end">
                  <button 
                    onClick={() => setSelectedContractForReview(null)}
                    className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-900/30"
                  >
                    Forstått
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* New Contract Modal */}
        <AnimatePresence>
          {isNewContractOpen && (
            <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md">
              <motion.div
                initial={{ opacity: 0, scale: 0.98, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98, y: 20 }}
                className="bg-[#0B0F17] text-white border border-slate-800 w-full max-w-lg rounded-t-[2rem] sm:rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[85vh] pb-[env(safe-area-inset-bottom,0px)]"
              >
                {/* Mobile Grab Handle */}
                <div className="sm:hidden w-12 h-1.5 bg-slate-700 rounded-full mx-auto mt-3 mb-1 shrink-0" />

                <div className="p-4 sm:p-6 border-b border-slate-800 flex items-center justify-between bg-[#131722] shrink-0">
                  <h3 className="text-lg sm:text-xl font-bold text-white">Ny Kontrakt</h3>
                  <button onClick={() => setIsNewContractOpen(false)} className="p-2 hover:bg-slate-800 rounded-xl transition-colors shrink-0 text-slate-400 hover:text-white">
                    <X size={20} />
                  </button>
                </div>
                <form onSubmit={handleCreateContract} className="p-4 sm:p-8 space-y-6 overflow-y-auto custom-scrollbar flex-1 bg-[#0B0F17]">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Tittel</label>
                      <AiTextAssistant 
                        currentText={newTitle} 
                        onApply={(text) => setNewTitle(text)}
                        placeholder="Hva er tittelen på kontrakten?"
                      />
                    </div>
                    <input 
                      required
                      type="text" 
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      placeholder="F.eks. Renovering Bad"
                      className="w-full p-4 bg-slate-950 border border-slate-800 text-white placeholder:text-slate-600 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Prosjektkode (Valgfritt)</label>
                    <input 
                      type="text" 
                      value={newProjectCode}
                      onChange={(e) => setNewProjectCode(e.target.value)}
                      placeholder="f.eks. P2024-001"
                      className="w-full p-4 bg-slate-950 border border-slate-800 text-white placeholder:text-slate-600 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Kundenavn</label>
                    <input 
                      required
                      type="text" 
                      value={newClientName}
                      onChange={(e) => setNewClientName(e.target.value)}
                      placeholder="Ola Nordmann"
                      className="w-full p-4 bg-slate-950 border border-slate-800 text-white placeholder:text-slate-600 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Kunde E-post</label>
                    <input 
                      type="email" 
                      value={newClientEmail}
                      onChange={(e) => setNewClientEmail(e.target.value)}
                      placeholder="ola@eksempel.no"
                      className="w-full p-4 bg-slate-950 border border-slate-800 text-white placeholder:text-slate-600 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-900/30 disabled:opacity-50"
                  >
                    {isSaving ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <Send size={18} />
                    )}
                    {isSaving ? 'Oppretter...' : 'Opprett Kontrakt'}
                  </button>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
  );

  if (inline) {
    return content;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center md:pl-[290px] lg:pl-[320px] p-0 sm:p-4 bg-black/60 backdrop-blur-xs">
      <motion.div 
        initial={{ opacity: 0, scale: 0.98, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-5xl"
      >
        {content}
      </motion.div>
    </div>
  );
};

export default ContractModal;
