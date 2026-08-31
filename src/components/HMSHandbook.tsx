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
  Users
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { cn } from '@/src/lib/utils';
import { HMSDocument, HMSSignature } from '../types';
import { db, auth, collection, onSnapshot, query, where, orderBy, addDoc, Timestamp, handleFirestoreError, OperationType } from '../services/firebase';
import { useAuth } from '../hooks/useAuth';

const HMSHandbook: React.FC = () => {
  const { user, company, role } = useAuth();
  const [documents, setDocuments] = useState<HMSDocument[]>([]);
  const [signatures, setSignatures] = useState<HMSSignature[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDoc, setSelectedDoc] = useState<HMSDocument | null>(null);
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
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as HMSDocument[];
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
      <div className="flex flex-col items-center justify-center py-20 text-neutral-400">
        <Loader2 className="animate-spin mb-4" size={32} />
        <p className="text-sm font-medium">Laster HMS-håndbok...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search and Filter */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={16} />
          <input 
            type="text" 
            placeholder="Søk i dokumenter..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all",
                activeCategory === cat.id 
                  ? "bg-emerald-600 text-white shadow-lg shadow-emerald-100" 
                  : "bg-white text-neutral-500 border border-neutral-200 hover:border-emerald-200"
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
              className="bg-white p-6 rounded-3xl border border-neutral-200 hover:border-emerald-200 transition-all group"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-2xl bg-neutral-50 flex items-center justify-center text-neutral-400 group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-colors">
                  <FileText size={24} />
                </div>
                {hasSigned(doc.id) ? (
                  <div className="flex items-center gap-1 px-2 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-[10px] font-black uppercase tracking-widest">
                    <CheckCircle2 size={12} />
                    Signert
                  </div>
                ) : (
                  <div className="flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-700 rounded-lg text-[10px] font-black uppercase tracking-widest">
                    <Clock size={12} />
                    Venter
                  </div>
                )}
              </div>
              
              <h3 className="font-bold text-neutral-900 mb-1 group-hover:text-emerald-600 transition-colors">{doc.title}</h3>
              <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest mb-4">
                Versjon {doc.version} • Oppdatert {new Date(doc.updatedAt).toLocaleDateString('no-NO')}
              </p>

              <div className="flex items-center gap-2 mt-auto">
                <button 
                  onClick={() => setSelectedDoc(doc)}
                  className="flex-1 py-2 bg-neutral-900 text-white rounded-xl text-xs font-bold hover:bg-neutral-800 transition-all"
                >
                  Les dokument
                </button>
                {role === 'admin' && (
                  <button 
                    onClick={() => setShowSignees(doc.id)}
                    className="p-2 bg-neutral-100 text-neutral-600 rounded-xl hover:bg-neutral-200 transition-all"
                    title="Se hvem som har signert"
                  >
                    <Users size={18} />
                  </button>
                )}
              </div>
            </motion.div>
          ))
        ) : (
          <div className="col-span-full text-center py-20 bg-white rounded-3xl border border-dashed border-neutral-200">
            <FileText className="mx-auto text-neutral-300 mb-4" size={48} />
            <p className="text-neutral-500 font-medium">Ingen dokumenter funnet</p>
          </div>
        )}
      </div>

      {/* Document Viewer Modal */}
      <AnimatePresence>
        {selectedDoc && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white w-full max-w-4xl max-h-[90vh] rounded-[2.5rem] flex flex-col shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-neutral-100 flex justify-between items-center bg-neutral-50">
                <div>
                  <h3 className="text-xl font-bold">{selectedDoc.title}</h3>
                  <p className="text-xs text-neutral-500 mt-1">Versjon {selectedDoc.version} • Oppdatert {new Date(selectedDoc.updatedAt).toLocaleDateString('no-NO')}</p>
                </div>
                <button onClick={() => setSelectedDoc(null)} aria-label="Lukk" title="Lukk" className="p-2 hover:bg-neutral-200 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 lg:p-12 prose prose-neutral max-w-none">
                <div className="markdown-body">
                  <ReactMarkdown>{selectedDoc.content}</ReactMarkdown>
                </div>
              </div>

              <div className="p-6 border-t border-neutral-100 bg-neutral-50 flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-3 text-neutral-500">
                  <ShieldCheck size={20} className="text-emerald-600" />
                  <span className="text-xs font-medium">Dette dokumentet er en del av selskapets HMS-system.</span>
                </div>
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  {hasSigned(selectedDoc.id) ? (
                    <div className="flex items-center gap-2 px-6 py-3 bg-emerald-100 text-emerald-700 rounded-2xl font-bold text-sm">
                      <CheckCircle2 size={18} />
                      Du har signert dette dokumentet
                    </div>
                  ) : (
                    <button 
                      onClick={() => handleSign(selectedDoc)}
                      disabled={isSigning}
                      className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3 bg-emerald-600 text-white rounded-2xl font-bold hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-100 disabled:opacity-50"
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
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-md rounded-[2rem] p-8 shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-xl font-bold">Signaturer</h3>
                  <p className="text-xs text-neutral-500 mt-1">{documents.find(d => d.id === showSignees)?.title}</p>
                </div>
                <button onClick={() => setShowSignees(null)} className="p-2 hover:bg-neutral-100 rounded-full">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                {documentSignatures.length > 0 ? (
                  documentSignatures.map((sig) => (
                    <div key={sig.id} className="flex items-center justify-between p-4 bg-neutral-50 rounded-2xl border border-neutral-100">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                          <CheckCircle2 size={16} />
                        </div>
                        <div>
                          <div className="text-sm font-bold">{sig.userName}</div>
                          <div className="text-[10px] text-neutral-400 uppercase tracking-widest">
                            {new Date(sig.signedAt).toLocaleString('no-NO')}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12 text-neutral-400">
                    <PenLine className="mx-auto mb-3 opacity-20" size={32} />
                    <p className="text-xs">Ingen har signert dette dokumentet ennå.</p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default HMSHandbook;
