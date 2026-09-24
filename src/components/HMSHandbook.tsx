import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileText, 
  Download, 
  CheckCircle2, 
  Clock, 
  ShieldCheck, 
  ChevronRight, 
  Search, 
  Filter,
  Plus,
  X,
  Loader2,
  PenLine,
  Pencil,
  Users,
  Trash2
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { cn } from '@/src/lib/utils';
import { HMSDocument, HMSSignature } from '../types';
import { db, auth, collection, onSnapshot, query, where, orderBy, addDoc, updateDoc, doc as firebaseDoc, deleteDoc, Timestamp, handleFirestoreError, OperationType } from '../services/firebase';
import { useAuth } from '../hooks/useAuth';
import { toast } from 'sonner';

const HMSHandbook: React.FC = () => {
  const { user, company, role } = useAuth();
  const [documents, setDocuments] = useState<HMSDocument[]>([]);
  const [signatures, setSignatures] = useState<HMSSignature[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDoc, setSelectedDoc] = useState<HMSDocument | null>(null);
  const [editingDoc, setEditingDoc] = useState<HMSDocument | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [isSigning, setIsSigning] = useState(false);
  const [showSignees, setShowSignees] = useState<string | null>(null);

  const categories = [
    { id: 'all', label: 'Alle' },
    { id: 'general', label: 'Generelt' },
    { id: 'safety', label: 'Sikkerhet' },
    { id: 'first_aid', label: 'Førstehjelp' },
    { id: 'fire', label: 'Brann' },
    { id: 'equipment', label: 'Utstyr' },
  ];

  useEffect(() => {
    if (!company) return;

    const docsQuery = query(
      collection(db, 'hms_documents'),
      where('companyId', 'in', [company, 'system']),
      orderBy('updatedAt', 'desc')
    );

    const unsubscribeDocs = onSnapshot(docsQuery, (snapshot) => {
      const docs = snapshot.docs.map(doc => {
        const data = doc.data() as any;
        let title = data.title || '';
        if (/arbied/i.test(title)) {
          title = title.replace(/arbied/gi, 'arbeid');
          updateDoc(firebaseDoc(db, 'hms_documents', doc.id), { title }).catch(() => {});
        }
        return { id: doc.id, ...data, title } as HMSDocument;
      });
      setDocuments(docs);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'hms_documents');
      setLoading(false);
    });

    const sigsQuery = query(
      collection(db, 'hms_signatures'),
      where('companyId', '==', company)
    );

    const unsubscribeSigs = onSnapshot(sigsQuery, (snapshot) => {
      const sigs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as HMSSignature[];
      setSignatures(sigs);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'hms_signatures');
    });

    return () => {
      unsubscribeDocs();
      unsubscribeSigs();
    };
  }, [company]);

  const handleSign = async (doc: HMSDocument) => {
    if (!user || !company) return;
    setIsSigning(true);
    try {
      await addDoc(collection(db, 'hms_signatures'), {
        documentId: doc.id,
        documentTitle: doc.title,
        userId: user.uid,
        userName: user.displayName || 'Anonym',
        signedAt: new Date().toISOString(),
        companyId: company
      });
      setSelectedDoc(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'hms_signatures');
    } finally {
      setIsSigning(false);
    }
  };

  const hasSigned = (docId: string) => {
    return signatures.some(s => s.documentId === docId && s.userId === user?.uid);
  };

  const handleDeleteDoc = async (docId: string, title: string) => {
    if (!window.confirm(`Er du sikker på at du vil slette dokumentet "${title}"?`)) {
      return;
    }
    try {
      await deleteDoc(firebaseDoc(db, 'hms_documents', docId));
      toast.success(`Dokumentet "${title}" er slettet.`);
    } catch (e) {
      console.error('Error deleting doc:', e);
      toast.error('Kunne ikke slette dokumentet.');
    }
  };

  const handleUpdateDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDoc) return;
    try {
      await updateDoc(firebaseDoc(db, 'hms_documents', editingDoc.id), {
        title: editingDoc.title,
        category: editingDoc.category,
        version: editingDoc.version,
        content: editingDoc.content,
        updatedAt: new Date().toISOString()
      });
      toast.success(`Dokumentet "${editingDoc.title}" ble oppdatert.`);
      setEditingDoc(null);
    } catch (e) {
      console.error('Error updating doc:', e);
      toast.error('Kunne ikke oppdatere dokumentet.');
    }
  };

  // ⚡ Bolt: Memoize filtered list to prevent unnecessary recalculations on every render.
  const filteredDocs = useMemo(() => {
    return documents.filter(doc => {
      const matchesSearch = doc.title.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = activeCategory === 'all' || doc.category === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [documents, searchQuery, activeCategory]);

  // ⚡ Bolt: Memoize filtered signatures for the open modal to avoid duplicated array filtering
  const documentSignatures = useMemo(() => {
    if (!showSignees) return [];
    return signatures.filter(s => s.documentId === showSignees);
  }, [signatures, showSignees]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-500">
        <Loader2 className="animate-spin mb-4 text-emerald-500" size={32} />
        <p className="text-sm font-medium text-slate-400">Laster HMS-håndbok...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search and Filter */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
          <input 
            type="text" 
            placeholder="Søk i dokumenter..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-slate-900 border border-slate-800 text-white placeholder:text-slate-500 rounded-xl text-sm focus:outline-none focus:border-emerald-500/50 shadow-inner"
          />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 no-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={cn(
                "px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer",
                activeCategory === cat.id 
                  ? "bg-emerald-600 text-white shadow-lg shadow-emerald-500/20" 
                  : "bg-slate-900 text-slate-400 border border-slate-800 hover:border-slate-700 hover:text-white"
              )}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Document Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredDocs.length > 0 ? (
          filteredDocs.map((doc) => (
            <motion.div 
              key={doc.id}
              layout
              className="bg-slate-900/90 p-6 rounded-3xl border border-slate-800 hover:border-emerald-500/40 transition-all group flex flex-col shadow-xl"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-2xl bg-slate-800/80 border border-slate-750 flex items-center justify-center text-slate-400 group-hover:bg-emerald-500/20 group-hover:text-emerald-400 group-hover:border-emerald-500/30 transition-colors">
                  <FileText size={24} />
                </div>
                {hasSigned(doc.id) ? (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg text-[10px] font-black uppercase tracking-widest">
                    <CheckCircle2 size={12} />
                    Signert
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-lg text-[10px] font-black uppercase tracking-widest">
                    <Clock size={12} />
                    Venter
                  </div>
                )}
              </div>
              
              <h3 className="font-bold text-white text-base mb-1 group-hover:text-emerald-400 transition-colors line-clamp-2">{doc.title}</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-4">
                Versjon {doc.version} • Oppdatert {new Date(doc.updatedAt).toLocaleDateString('no-NO')}
              </p>

              <div className="flex items-center gap-2 mt-auto pt-2">
                <button 
                  onClick={() => setSelectedDoc(doc)}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-950/40 cursor-pointer text-center"
                >
                  Les dokument
                </button>
                {role === 'admin' && (
                  <>
                    <button 
                      onClick={() => setShowSignees(doc.id)}
                      className="p-2.5 bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white rounded-xl border border-slate-700/60 transition-all cursor-pointer"
                      title="Se hvem som har signert"
                    >
                      <Users size={16} />
                    </button>
                    {doc.companyId === company && (
                      <>
                        <button 
                          onClick={() => setEditingDoc(doc)}
                          className="p-2.5 bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-emerald-400 rounded-xl border border-slate-700/60 transition-all cursor-pointer"
                          title="Rediger dokument"
                        >
                          <Pencil size={16} />
                        </button>
                        <button 
                          onClick={() => handleDeleteDoc(doc.id, doc.title)}
                          className="p-2.5 bg-slate-800 hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 hover:border-rose-500/40 rounded-xl border border-slate-700/60 transition-all cursor-pointer"
                          title="Slett dokument"
                        >
                          <Trash2 size={16} />
                        </button>
                      </>
                    )}
                  </>
                )}
              </div>
            </motion.div>
          ))
        ) : (
          <div className="col-span-full text-center py-20 bg-slate-900/60 rounded-3xl border border-dashed border-slate-800">
            <FileText className="mx-auto text-slate-600 mb-4" size={48} />
            <p className="text-slate-400 font-medium">Ingen dokumenter funnet</p>
          </div>
        )}
      </div>

      {/* Document Viewer Modal */}
      <AnimatePresence>
        {selectedDoc && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-slate-900 border border-slate-800 text-white w-full max-w-4xl max-h-[90vh] rounded-3xl sm:rounded-[2.5rem] flex flex-col shadow-2xl overflow-hidden"
            >
              <div className="p-5 sm:p-6 border-b border-slate-800 flex justify-between items-center bg-slate-950/60">
                <div>
                  <h3 className="text-lg sm:text-xl font-bold text-white">{selectedDoc.title}</h3>
                  <p className="text-xs text-slate-400 mt-1">Versjon {selectedDoc.version} • Oppdatert {new Date(selectedDoc.updatedAt).toLocaleDateString('no-NO')}</p>
                </div>
                <button onClick={() => setSelectedDoc(null)} aria-label="Lukk" title="Lukk" className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors cursor-pointer">
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 sm:p-10 prose prose-invert max-w-none text-slate-200">
                <div className="markdown-body">
                  <ReactMarkdown>{selectedDoc.content}</ReactMarkdown>
                </div>
              </div>

              <div className="p-5 sm:p-6 border-t border-slate-800 bg-slate-950/60 flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-3 text-slate-400">
                  <ShieldCheck size={20} className="text-emerald-400" />
                  <span className="text-xs font-medium">Dette dokumentet er en del av selskapets HMS-system.</span>
                </div>
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  {hasSigned(selectedDoc.id) ? (
                    <div className="flex items-center gap-2 px-6 py-3 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-2xl font-bold text-sm">
                      <CheckCircle2 size={18} />
                      Du har signert dette dokumentet
                    </div>
                  ) : (
                    <button 
                      onClick={() => handleSign(selectedDoc)}
                      disabled={isSigning}
                      className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3 bg-emerald-600 text-white rounded-2xl font-bold hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-950/50 disabled:opacity-50 cursor-pointer"
                    >
                      {isSigning ? <Loader2 className="animate-spin" size={18} /> : <PenLine size={18} />}
                      Signer digitalt
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Signees Modal */}
      <AnimatePresence>
        {showSignees && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-slate-800 text-white w-full max-w-md rounded-3xl p-6 sm:p-8 shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-lg sm:text-xl font-bold text-white">Signaturer</h3>
                  <p className="text-xs text-slate-400 mt-1">{documents.find(d => d.id === showSignees)?.title}</p>
                </div>
                <button onClick={() => setShowSignees(null)} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full cursor-pointer">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {documentSignatures.length > 0 ? (
                  documentSignatures.map((sig) => (
                    <div key={sig.id} className="flex items-center justify-between p-3.5 bg-slate-950/60 rounded-2xl border border-slate-800">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
                          <CheckCircle2 size={16} />
                        </div>
                        <div>
                          <div className="text-sm font-bold text-white">{sig.userName}</div>
                          <div className="text-[10px] text-slate-400 uppercase tracking-widest">
                            {new Date(sig.signedAt).toLocaleString('no-NO')}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12 text-slate-500">
                    <PenLine className="mx-auto mb-3 opacity-30" size={32} />
                    <p className="text-xs">Ingen har signert dette dokumentet ennå.</p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Document Modal */}
      <AnimatePresence>
        {editingDoc && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-slate-800 text-white w-full max-w-lg rounded-3xl p-6 sm:p-8 shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar"
            >
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-lg sm:text-xl font-bold text-white">Rediger HMS-dokument</h3>
                  <p className="text-xs text-slate-400 mt-1">Oppdater tittel, innhold eller versjon</p>
                </div>
                <button onClick={() => setEditingDoc(null)} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full cursor-pointer">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleUpdateDoc} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Dokumenttittel</label>
                  <input
                    required
                    type="text"
                    value={editingDoc.title}
                    onChange={(e) => setEditingDoc({...editingDoc, title: e.target.value})}
                    className="w-full p-3 bg-slate-950 border border-slate-800 text-white rounded-xl text-xs sm:text-sm font-medium focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Kategori</label>
                    <select
                      value={editingDoc.category}
                      onChange={(e) => setEditingDoc({...editingDoc, category: e.target.value as any})}
                      className="w-full p-2.5 bg-slate-950 border border-slate-800 text-white rounded-xl text-xs font-medium focus:outline-none focus:border-emerald-500"
                    >
                      <option value="general">Generelt</option>
                      <option value="safety">Sikkerhet</option>
                      <option value="first_aid">Førstehjelp</option>
                      <option value="fire">Brann</option>
                      <option value="equipment">Utstyr</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Versjon</label>
                    <input
                      type="text"
                      value={editingDoc.version}
                      onChange={(e) => setEditingDoc({...editingDoc, version: e.target.value})}
                      className="w-full p-2.5 bg-slate-950 border border-slate-800 text-white rounded-xl text-xs font-medium focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Innhold (Markdown)</label>
                  <textarea
                    required
                    rows={8}
                    value={editingDoc.content}
                    onChange={(e) => setEditingDoc({...editingDoc, content: e.target.value})}
                    className="w-full p-3 bg-slate-950 border border-slate-800 text-white rounded-xl text-xs sm:text-sm font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingDoc(null)}
                    className="px-4 py-2.5 text-xs font-bold text-slate-400 hover:text-white transition-colors cursor-pointer"
                  >
                    Avbryt
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-emerald-950/40 cursor-pointer"
                  >
                    Lagre endringer
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default HMSHandbook;
