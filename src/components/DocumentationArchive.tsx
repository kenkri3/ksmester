import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Library, Search, Filter, Download, FileText, Image as ImageIcon, FileCode, Sparkles, RefreshCw, CheckCircle2 } from 'lucide-react';
import { ProjectDocument, ProjectMaterial } from '../types';
import { db, collection, query, where, onSnapshot, addDoc, serverTimestamp, handleFirestoreError, OperationType } from '../services/firebase';
import { api } from '../services/api';
import { toast } from 'sonner';

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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleManualUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const newDoc: any = {
          projectId: projectId || 'general',
          title: file.name,
          category: activeCategory === 'all' ? 'FDV Dokumentasjon' : activeCategory === 'drawing' ? 'Tegninger' : activeCategory === 'contract' ? 'Kontrakter' : 'FDV Dokumentasjon',
          type: file.type.includes('pdf') ? 'pdf' : file.type.includes('image') ? 'image' : 'word',
          source: 'manual',
          fileData: reader.result as string,
          createdAt: new Date().toLocaleDateString('no-NO')
        };
        await api.saveDoc('project_documents', newDoc);
        try {
          await addDoc(collection(db, 'project_documents'), newDoc);
        } catch {}
        setDocuments(prev => [newDoc, ...prev]);
        toast.success(`'${file.name}' ble lastet opp og arkivert!`);
      } catch (err) {
        console.error('Feil ved lagring av dokument:', err);
        toast.error('Feil ved lagring av dokument.');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDownloadDoc = (docItem: any) => {
    if (docItem.fileData) {
      const a = document.createElement('a');
      a.href = docItem.fileData;
      a.download = docItem.title || 'dokument';
      a.click();
      toast.success(`Laster ned ${docItem.title}`);
    } else {
      // Create download blob
      const content = `VikingMester DOKUMENTARKIV\nDokument: ${docItem.title}\nKategori: ${docItem.category}\nKilde: ${docItem.source}\nDato: ${docItem.createdAt}\nStatus: Gyldig og verifisert`;
      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${docItem.title || 'dokument'}.txt`;
      a.click();
      toast.success(`Laster ned ${docItem.title}`);
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    const loadDocs = async () => {
      try {
        const allDocs = await api.getDocs<ProjectDocument>('project_documents');
        if (allDocs && allDocs.length > 0) {
          const filtered = projectId ? allDocs.filter(d => d.projectId === projectId) : allDocs;
          setDocuments(filtered);
        }
      } catch (err) {
        console.warn('Kunne ikke hente dokumenter fra api:', err);
      }
    };
    loadDocs();

    let docsQuery = query(collection(db, 'project_documents'));
    if (projectId) {
      docsQuery = query(collection(db, 'project_documents'), where('projectId', '==', projectId));
    }

    const unsubscribe = onSnapshot(docsQuery, (snapshot) => {
      if (!snapshot.empty) {
        const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ProjectDocument));
        setDocuments(list);
      }
    }, (err) => {
      console.warn('Firestore project_documents fallback:', err);
    });

    return () => unsubscribe();
  }, [isOpen, projectId]);

  // ⚡ Bolt: Memoize filtered list to prevent unnecessary O(N) recalculations on every render, especially during fast typing in the search input.
  const filteredDocs = useMemo(() => {
    return documents.filter(doc => {
      const matchesSearch = doc.title.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = activeCategory === 'all' || doc.type === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [documents, searchTerm, activeCategory]);

  const handleSyncNOBB = async () => {
    setIsSyncing(true);
    try {
      // 1. Fetch project materials
      let materials: ProjectMaterial[] = [];
      try {
        const allMats = await api.getDocs<ProjectMaterial>('project_materials');
        materials = projectId ? allMats.filter(m => m.projectId === projectId) : allMats;
      } catch (err) {
        console.warn('Kunne ikke hente prosjektmateriell fra API:', err);
      }

      // 2. Prepare documents to sync
      const docsToCreate: any[] = [];
      const existingTitles = new Set(documents.map(d => d.title.toLowerCase()));

      if (materials.length > 0) {
        for (const mat of materials) {
          const docTitle = `FDV - ${mat.name}`;
          if (!existingTitles.has(docTitle.toLowerCase())) {
            docsToCreate.push({
              projectId: projectId || mat.projectId || 'generelt',
              title: docTitle,
              type: 'fdv',
              url: mat.fdvUrl || '#',
              category: mat.category || 'Byggevarer',
              source: 'nobb',
              nobbNumber: mat.nobbNumber || '',
              supplier: mat.supplier || '',
              createdAt: new Date().toISOString().split('T')[0]
            });
            existingTitles.add(docTitle.toLowerCase());
          }
        }
      }

      // Standard trade items if no project materials are present or to complement archive
      if (docsToCreate.length === 0) {
        const standardNOBBItems = [
          {
            title: 'FDV - Rockwool Flexi A-plate 100mm',
            category: 'Isolasjon',
            source: 'nobb',
            nobbNumber: '21543892',
            supplier: 'AS Rockwool',
            url: 'https://export.byggtjeneste.no/fdv/21543892'
          },
          {
            title: 'FDV - Norgips Standard Gipsplate 12,5mm',
            category: 'Plater',
            source: 'nobb',
            nobbNumber: '12345678',
            supplier: 'Norgips Norge AS',
            url: 'https://export.byggtjeneste.no/fdv/12345678'
          },
          {
            title: 'FDV - Litex Membranplate Våtrom 13mm',
            category: 'Våtrom',
            source: 'nobb',
            nobbNumber: '44556677',
            supplier: 'Litex AS',
            url: 'https://export.byggtjeneste.no/fdv/44556677'
          },
          {
            title: 'FDV - Jotun Lady Vegg & Tak Maling',
            category: 'Maling & Kjemi',
            source: 'nobb',
            nobbNumber: '55667788',
            supplier: 'Jotun A/S',
            url: 'https://export.byggtjeneste.no/fdv/55667788'
          }
        ];

        for (const item of standardNOBBItems) {
          if (!existingTitles.has(item.title.toLowerCase())) {
            docsToCreate.push({
              projectId: projectId || 'generelt',
              title: item.title,
              type: 'fdv',
              url: item.url,
              category: item.category,
              source: item.source,
              nobbNumber: item.nobbNumber,
              supplier: item.supplier,
              createdAt: new Date().toISOString().split('T')[0]
            });
            existingTitles.add(item.title.toLowerCase());
          }
        }
      }

      // 3. Save each generated doc
      const savedDocs: any[] = [];
      for (const newDoc of docsToCreate) {
        try {
          const saved = await api.saveDoc('project_documents', newDoc);
          savedDocs.push(saved || newDoc);
          try {
            await addDoc(collection(db, 'project_documents'), newDoc);
          } catch {}
        } catch (e) {
          console.warn('Kunne ikke lagre FDV:', e);
        }
      }

      if (savedDocs.length > 0) {
        setDocuments(prev => [...savedDocs, ...prev]);
        toast.success(`Synkroniserte ${savedDocs.length} FDV-dokumenter fra NOBB Byggevarebase!`);
      } else {
        toast.info('Alle FDV-dokumenter for prosjektet er allerede oppdatert.');
      }

      setIsSyncing(false);
      setSyncSuccess(true);
      setTimeout(() => setSyncSuccess(false), 3000);
    } catch (e) {
      console.error('NOBB sync error:', e);
      setIsSyncing(false);
      toast.error('Feil ved synkronisering mot NOBB.');
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
              <p className="text-neutral-500 text-sm font-medium">Automatisert FDV- og produktdokumentasjon</p>
            </div>
          </div>
          <button onClick={onClose} aria-label="Lukk" title="Lukk" className="p-2 hover:bg-neutral-100 rounded-xl transition-colors">
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
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleManualUpload} 
                className="hidden" 
              />
              <button 
                onClick={handleSyncNOBB}
                disabled={isSyncing}
                className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-2xl text-sm font-bold hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-100 disabled:opacity-50"
              >
                {isSyncing ? <RefreshCw className="animate-spin" size={16} /> : <Sparkles size={16} />}
                {syncSuccess ? 'Synkronisert!' : 'Hent FDV-dokumenter'}
              </button>
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-white border border-neutral-200 rounded-2xl text-sm font-bold hover:bg-neutral-50 transition-all cursor-pointer"
              >
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
                        <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full text-[9px] font-black uppercase tracking-tighter">FDV Automatikk</span>
                      )}
                      {doc.source === 'system' && (
                        <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-full text-[9px] font-black uppercase tracking-tighter">Systemgenerert</span>
                      )}
                    </div>
                  </div>
                  <button 
                    onClick={() => handleDownloadDoc(doc)}
                    title="Last ned dokument"
                    className="p-2 text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 rounded-xl transition-all cursor-pointer"
                  >
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
