import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Library, Search, Filter, Download, FileText, Image as ImageIcon, FileCode, Sparkles, RefreshCw, CheckCircle2 } from 'lucide-react';
import { ProjectDocument } from '../types';
import { db, collection, query, where, onSnapshot, addDoc, serverTimestamp, handleFirestoreError, OperationType } from '../services/firebase';

interface DocumentationArchiveProps {
  isOpen: boolean;
  onClose: () => void;
  projectId?: string;
}

const DocumentationArchive: React.FC<DocumentationArchiveProps> = ({ isOpen, onClose, projectId }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState<'all' | 'fdv' | 'drawing' | 'contract'>('all');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState(false);
  const [documents, setDocuments] = useState<ProjectDocument[]>([]);

  useEffect(() => {
    if (!isOpen) return;

    let docsQuery = query(collection(db, 'project_documents'));
    if (projectId) {
      docsQuery = query(collection(db, 'project_documents'), where('projectId', '==', projectId));
    }

    const unsubscribe = onSnapshot(docsQuery, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ProjectDocument));
      setDocuments(list);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'project_documents');
    });

    return () => unsubscribe();
  }, [isOpen, projectId]);

  const filteredDocs = documents.filter(doc => {
    const matchesSearch = doc.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = activeCategory === 'all' || doc.type === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const handleSyncNOBB = async () => {
    setIsSyncing(true);
    try {
      const newDoc = {
        projectId: projectId || 'generelt',
        title: 'FDV - Isolasjon Rockwool Flexi A-plate',
        type: 'fdv',
        url: '#',
        createdAt: new Date().toISOString().split('T')[0],
        source: 'nobb',
        category: 'Isolasjon'
      };
      await addDoc(collection(db, 'project_documents'), newDoc);
      setIsSyncing(false);
      setSyncSuccess(true);
      setTimeout(() => setSyncSuccess(false), 3000);
    } catch (e) {
      console.error(e);
      setIsSyncing(false);
    }
  };

  const getIcon = (type: ProjectDocument['type']) => {
    switch (type) {
      case 'fdv': return <FileText className="text-blue-500" size={20} />;
      case 'drawing': return <FileCode className="text-emerald-500" size={20} />;
      case 'contract': return <CheckCircle2 className="text-indigo-500" size={20} />;
      default: return <FileText className="text-neutral-400" size={20} />;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-neutral-50 w-full max-w-5xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-8 border-b border-neutral-200 flex items-center justify-between bg-white">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-neutral-900 flex items-center justify-center text-white shadow-lg shadow-neutral-200">
              <Library size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight">FDV Arkiv & Dokumentasjon</h2>
              <p className="text-neutral-500 text-sm font-medium">Automatisert dokumenthåndtering med NOBB-integrasjon</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-neutral-100 rounded-xl transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-8">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
              <input 
                type="text" 
                placeholder="Søk i dokumenter..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-white border border-neutral-200 rounded-2xl focus:ring-2 focus:ring-neutral-900 outline-none font-bold"
              />
            </div>
            
            <div className="flex items-center gap-3 w-full md:w-auto">
              <button 
                onClick={handleSyncNOBB}
                disabled={isSyncing}
                className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-2xl text-sm font-bold hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-100 disabled:opacity-50"
              >
                {isSyncing ? <RefreshCw className="animate-spin" size={16} /> : <Sparkles size={16} />}
                {syncSuccess ? 'Synkronisert!' : 'Hent fra NOBB'}
              </button>
              <button className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-white border border-neutral-200 rounded-2xl text-sm font-bold hover:bg-neutral-50 transition-all">
                Last opp manuelt
              </button>
            </div>
          </div>

          {/* Categories */}
          <div className="flex items-center gap-3 mb-8 overflow-x-auto pb-2">
            {[
              { id: 'all', label: 'Alle Dokumenter' },
              { id: 'fdv', label: 'FDV Dokumentasjon' },
              { id: 'drawing', label: 'Tegninger' },
              { id: 'contract', label: 'Kontrakter' },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id as any)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  activeCategory === cat.id 
                    ? 'bg-neutral-900 text-white shadow-lg shadow-neutral-200' 
                    : 'bg-white border border-neutral-200 text-neutral-500 hover:border-neutral-400'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredDocs.map((doc) => (
              <motion.div 
                layout
                key={doc.id}
                className="bg-white p-5 rounded-3xl border border-neutral-200 hover:border-neutral-400 transition-all group"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-neutral-50 flex items-center justify-center group-hover:scale-110 transition-transform">
                    {getIcon(doc.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-neutral-900 truncate">{doc.title}</h3>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">{doc.category}</span>
                      <span className="w-1 h-1 rounded-full bg-neutral-200" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">
                        {typeof doc.createdAt === 'string' ? doc.createdAt : (doc.createdAt as any)?.toDate?.()?.toLocaleDateString() || String(doc.createdAt)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-3">
                      {doc.source === 'nobb' && (
                        <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full text-[9px] font-black uppercase tracking-tighter">NOBB Automatikk</span>
                      )}
                      {doc.source === 'system' && (
                        <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-full text-[9px] font-black uppercase tracking-tighter">Systemgenerert</span>
                      )}
                    </div>
                  </div>
                  <button className="p-2 text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 rounded-xl transition-all">
                    <Download size={20} />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>

          {filteredDocs.length === 0 && (
            <div className="p-20 text-center">
              <div className="w-20 h-20 bg-neutral-100 text-neutral-300 rounded-full flex items-center justify-center mx-auto mb-6">
                <Library size={40} />
              </div>
              <h3 className="text-xl font-bold text-neutral-900">Ingen dokumenter funnet</h3>
              <p className="text-neutral-500 max-w-xs mx-auto">Prøv å endre søket eller bruk NOBB-knappen for å hente dokumentasjon automatisk.</p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default DocumentationArchive;
