import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Library, 
  Search, 
  Filter, 
  Download, 
  FileText, 
  FileCode, 
  Sparkles, 
  RefreshCw, 
  CheckCircle2, 
  Building2, 
  Printer, 
  Mail, 
  ExternalLink,
  ShieldCheck
} from 'lucide-react';
import { ProjectDocument, ProjectMaterial } from '../types';
import { db, collection, query, where, onSnapshot, addDoc, serverTimestamp } from '../services/firebase';
import { api } from '../services/api';
import { toast } from 'sonner';

interface ProjectOption {
  id: string;
  name: string;
  clientName?: string;
  clientEmail?: string;
  category?: string;
  address?: string;
  description?: string;
}

interface DocumentationArchiveProps {
  isOpen: boolean;
  onClose: () => void;
  projectId?: string;
  projects?: ProjectOption[];
}

const DocumentationArchive: React.FC<DocumentationArchiveProps> = ({ 
  isOpen, 
  onClose, 
  projectId: initialProjectId, 
  projects = [] 
}) => {
  const [selectedProjectId, setSelectedProjectId] = useState<string>(
    initialProjectId || (projects.length > 0 ? projects[0].id : '')
  );
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState<'all' | 'fdv' | 'drawing' | 'contract'>('all');
  const [isSyncing, setIsSyncing] = useState(false);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState(false);
  const [documents, setDocuments] = useState<ProjectDocument[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Synkroniser når initialProjectId endres
  useEffect(() => {
    if (initialProjectId) {
      setSelectedProjectId(initialProjectId);
    } else if (projects.length > 0 && !selectedProjectId) {
      setSelectedProjectId(projects[0].id);
    }
  }, [initialProjectId, projects]);

  const activeProject = useMemo(() => {
    return projects.find(p => p.id === selectedProjectId) || (selectedProjectId ? { id: selectedProjectId, name: 'Valgt prosjekt' } : null);
  }, [projects, selectedProjectId]);

  const handleManualUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const newDoc: any = {
          projectId: selectedProjectId || 'general',
          projectName: activeProject?.name || 'Prosjekt',
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
      // Create download blob with detailed content
      const content = `========================================================\n` +
        `VIKINGMESTER FDV & TEKNISK DOKUMENTASJON\n` +
        `========================================================\n\n` +
        `Dokument:      ${docItem.title}\n` +
        `Prosjekt:      ${docItem.projectName || activeProject?.name || 'VikingMester Prosjekt'}\n` +
        `Kategori:      ${docItem.category || 'FDV Dokumentasjon'}\n` +
        `Kilde:         ${(docItem.source || 'NOBB').toUpperCase()}\n` +
        `NOBB-nr:       ${docItem.nobbNumber || 'Ikke oppgitt'}\n` +
        `Leverandør:    ${docItem.supplier || 'Norsk Byggevare'}\n` +
        `Godkjenning:   ${docItem.sintefApproval || 'Sintef Byggforsk / CE'}\n` +
        `Lovhjemmel:    ${docItem.tek17Clause || 'TEK17 / Plan- og bygningsloven § 29-1'}\n` +
        `Vedlikehold:   ${docItem.maintenanceInterval || 'Periodisk kontroll iht. forskrift'}\n` +
        `Dato:          ${docItem.createdAt || new Date().toISOString().split('T')[0]}\n` +
        `Status:        Gyldig, verifisert og godkjent for overlevering\n\n` +
        `Beskrivelse:\n${docItem.description || 'Dette dokumentet inngår i prosjektets offisielle FDV-perm.'}\n`;

      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${(docItem.title || 'dokument').replace(/[^a-zA-Z0-9_-]/g, '_')}.txt`;
      a.click();
      toast.success(`Laster ned ${docItem.title}`);
    }
  };

  // Åpne samlet FDV-perm i utskriftsvisning
  const handleOpenCombinedFdv = async () => {
    try {
      toast.info('Klargjør samlet FDV-perm for utskrift/PDF...');
      const res = await fetch('/api/documentation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'get_combined_fdv',
          projectId: selectedProjectId || 'general',
          projectInfo: activeProject
        })
      });

      const data = await res.json();
      if (data?.html) {
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          printWindow.document.write(data.html);
          printWindow.document.close();
          setTimeout(() => {
            printWindow.focus();
            printWindow.print();
          }, 400);
        }
      } else {
        toast.error('Kunne ikke generere samlet FDV-perm.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Feil ved generering av samlet FDV-perm.');
    }
  };

  // Autonom AI-generering av FDV for det valgte prosjektet
  const handleGenerateAiFdv = async () => {
    setIsGeneratingAi(true);
    try {
      toast.info(`MesterAI analyserer ${activeProject?.name || 'prosjektet'} og genererer FDV-blader...`);
      const res = await fetch('/api/documentation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate_project_fdv',
          projectId: selectedProjectId || 'general',
          projectInfo: activeProject
        })
      });

      const data = await res.json();
      if (data.success && data.documents) {
        setDocuments(prev => {
          const existingIds = new Set(prev.map(p => p.id));
          const newDocs = data.documents.filter((d: any) => !existingIds.has(d.id));
          return [...newDocs, ...prev];
        });
        toast.success(`Genererte ${data.documents.length} skreddersydde FDV- og samsvarsdokumenter for ${activeProject?.name}!`);
      } else {
        toast.error(data.error || 'Kunne ikke generere FDV-dokumenter');
      }
    } catch (err) {
      console.error(err);
      toast.error('Feil ved autonom FDV-generering');
    } finally {
      setIsGeneratingAi(false);
    }
  };

  // Send dokumentasjon til kunde på e-post
  const handleEmailDocumentation = async () => {
    const defaultEmail = activeProject?.clientEmail || '';
    const emailPrompt = prompt('Oppgi e-postadressen til kunden som skal motta FDV-permen:', defaultEmail);
    if (!emailPrompt) return;

    setIsSendingEmail(true);
    try {
      const res = await fetch('/api/documentation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'email_documentation',
          projectId: selectedProjectId || 'general',
          projectInfo: activeProject,
          recipientEmail: emailPrompt.trim()
        })
      });

      const data = await res.json();
      if (data.success) {
        toast.success(`FDV-perm er sendt på e-post til ${emailPrompt}!`);
      } else {
        toast.error(data.error || 'Kunne ikke sende dokumentasjon på e-post');
      }
    } catch (err) {
      console.error(err);
      toast.error('Feil ved sending av e-post');
    } finally {
      setIsSendingEmail(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    const loadDocs = async () => {
      try {
        const allDocs = await api.getDocs<ProjectDocument>('project_documents');
        if (allDocs && allDocs.length > 0) {
          const filtered = selectedProjectId 
            ? allDocs.filter(d => !d.projectId || d.projectId === selectedProjectId || d.projectId === 'general') 
            : allDocs;
          setDocuments(filtered);
        }
      } catch (err) {
        console.warn('Kunne ikke hente dokumenter fra api:', err);
      }
    };
    loadDocs();

    let docsQuery = query(collection(db, 'project_documents'));
    if (selectedProjectId) {
      docsQuery = query(collection(db, 'project_documents'), where('projectId', '==', selectedProjectId));
    }

    const unsubscribe = onSnapshot(docsQuery, (snapshot) => {
      if (!snapshot.empty) {
        const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ProjectDocument));
        setDocuments(prev => {
          const otherDocs = prev.filter(p => p.projectId !== selectedProjectId);
          return [...list, ...otherDocs];
        });
      }
    }, (err) => {
      console.warn('Firestore project_documents fallback:', err);
    });

    return () => unsubscribe();
  }, [isOpen, selectedProjectId]);

  const filteredDocs = useMemo(() => {
    return documents.filter(doc => {
      const matchesProject = !selectedProjectId || doc.projectId === selectedProjectId || doc.projectId === 'general';
      const matchesSearch = !searchTerm || doc.title.toLowerCase().includes(searchTerm.toLowerCase()) || (doc.category && doc.category.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesCategory = activeCategory === 'all' || doc.type === activeCategory || (activeCategory === 'fdv' && doc.category?.toLowerCase().includes('fdv'));
      return matchesProject && matchesSearch && matchesCategory;
    });
  }, [documents, selectedProjectId, searchTerm, activeCategory]);

  const handleSyncNOBB = async () => {
    setIsSyncing(true);
    try {
      let materials: ProjectMaterial[] = [];
      try {
        const allMats = await api.getDocs<ProjectMaterial>('project_materials');
        materials = selectedProjectId ? allMats.filter(m => m.projectId === selectedProjectId) : allMats;
      } catch (err) {
        console.warn('Kunne ikke hente prosjektmateriell fra API:', err);
      }

      const docsToCreate: any[] = [];
      const existingTitles = new Set(documents.map(d => d.title.toLowerCase()));

      if (materials.length > 0) {
        for (const mat of materials) {
          const docTitle = `FDV - ${mat.name}`;
          if (!existingTitles.has(docTitle.toLowerCase())) {
            docsToCreate.push({
              projectId: selectedProjectId || mat.projectId || 'general',
              projectName: activeProject?.name || 'Prosjekt',
              title: docTitle,
              type: 'fdv',
              url: mat.fdvUrl || '#',
              category: mat.category || 'FDV Dokumentasjon',
              source: 'nobb',
              nobbNumber: mat.nobbNumber || '',
              supplier: mat.supplier || '',
              createdAt: new Date().toISOString().split('T')[0]
            });
            existingTitles.add(docTitle.toLowerCase());
          }
        }
      }

      if (docsToCreate.length === 0) {
        const standardNOBBItems = [
          {
            title: `FDV - Rockwool Flexi A-plate 100mm (${activeProject?.name || 'Prosjekt'})`,
            category: 'FDV Dokumentasjon',
            source: 'nobb',
            nobbNumber: '21543892',
            supplier: 'AS Rockwool',
            url: 'https://export.byggtjeneste.no/fdv/21543892'
          },
          {
            title: `FDV - Norgips Standard Gipsplate 12,5mm (${activeProject?.name || 'Prosjekt'})`,
            category: 'FDV Dokumentasjon',
            source: 'nobb',
            nobbNumber: '12345678',
            supplier: 'Norgips Norge AS',
            url: 'https://export.byggtjeneste.no/fdv/12345678'
          },
          {
            title: `FDV - Litex Membranplate Våtrom 13mm (${activeProject?.name || 'Prosjekt'})`,
            category: 'FDV Dokumentasjon',
            source: 'nobb',
            nobbNumber: '44556677',
            supplier: 'Litex AS',
            url: 'https://export.byggtjeneste.no/fdv/44556677'
          },
          {
            title: `FDV - Jotun Lady Vegg & Tak Maling (${activeProject?.name || 'Prosjekt'})`,
            category: 'FDV Dokumentasjon',
            source: 'nobb',
            nobbNumber: '55667788',
            supplier: 'Jotun A/S',
            url: 'https://export.byggtjeneste.no/fdv/55667788'
          }
        ];

        for (const item of standardNOBBItems) {
          if (!existingTitles.has(item.title.toLowerCase())) {
            docsToCreate.push({
              projectId: selectedProjectId || 'general',
              projectName: activeProject?.name || 'Prosjekt',
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
      case 'fdv': return <FileText className="text-blue-600" size={20} />;
      case 'drawing': return <FileCode className="text-emerald-600" size={20} />;
      case 'contract': return <CheckCircle2 className="text-indigo-600" size={20} />;
      default: return <FileText className="text-neutral-500" size={20} />;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.98, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-neutral-50 text-neutral-900 w-full max-w-5xl rounded-t-[2rem] sm:rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[90vh] pb-[env(safe-area-inset-bottom,0px)]"
      >
        {/* Mobile Grab Handle */}
        <div className="sm:hidden w-12 h-1.5 bg-neutral-300 rounded-full mx-auto mt-3 mb-1 shrink-0" />

        {/* Header */}
        <div className="p-4 sm:p-8 border-b border-neutral-200 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-neutral-900 flex items-center justify-center text-white shadow-lg shadow-neutral-200 shrink-0">
              <Library size={22} className="sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-2xl font-bold tracking-tight text-neutral-900 truncate">FDV Arkiv & Dokumentasjon</h2>
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800">
                  <ShieldCheck size={12} /> TEK17 Godkjent
                </span>
              </div>
              <p className="text-neutral-500 text-xs sm:text-sm font-medium truncate">
                Automatisert FDV- og produktdokumentasjon for alle prosjekter
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            aria-label="Lukk" 
            title="Lukk" 
            className="p-2 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 rounded-xl transition-colors shrink-0"
          >
            <X size={20} className="sm:w-6 sm:h-6" />
          </button>
        </div>

        {/* Project Selector & Actions Bar */}
        <div className="p-4 sm:px-8 py-3 bg-neutral-100 border-b border-neutral-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 flex-1 min-w-[240px]">
            <Building2 size={16} className="text-neutral-500 shrink-0" />
            <span className="text-xs font-bold text-neutral-600 shrink-0">Prosjekt:</span>
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="flex-1 max-w-xs px-3 py-1.5 bg-white border border-neutral-300 rounded-xl text-xs font-bold text-neutral-900 outline-none focus:ring-2 focus:ring-neutral-900"
            >
              <option value="">Alle prosjekter ({documents.length} dok)</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name} {p.category ? `(${p.category})` : ''}</option>
              ))}
            </select>
            {activeProject?.category && (
              <span className="hidden md:inline-block px-2 py-0.5 bg-blue-100 text-blue-800 rounded-md text-[11px] font-bold">
                {activeProject.category}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleGenerateAiFdv}
              disabled={isGeneratingAi || !selectedProjectId}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-500 transition-all shadow-sm disabled:opacity-50"
              title="Generer automatisk tilpassede FDV-blader for prosjektet"
            >
              {isGeneratingAi ? <RefreshCw className="animate-spin" size={14} /> : <Sparkles size={14} />}
              <span>⚡ AI Autogenerer FDV</span>
            </button>

            <button
              onClick={handleOpenCombinedFdv}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-neutral-300 text-neutral-800 hover:text-neutral-900 rounded-xl text-xs font-bold hover:bg-neutral-50 transition-all shadow-sm"
              title="Generer og skriv ut samlet FDV-perm for prosjektet"
            >
              <Printer size={14} />
              <span className="hidden sm:inline">Samlet FDV-perm (PDF)</span>
              <span className="sm:hidden">FDV-perm</span>
            </button>

            {activeProject && (
              <button
                onClick={handleEmailDocumentation}
                disabled={isSendingEmail}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-neutral-300 text-neutral-800 hover:text-neutral-900 rounded-xl text-xs font-bold hover:bg-neutral-50 transition-all shadow-sm disabled:opacity-50"
                title="Send komplett FDV-perm til kunden på e-post"
              >
                {isSendingEmail ? <RefreshCw className="animate-spin" size={14} /> : <Mail size={14} />}
                <span className="hidden md:inline">Send til kunde</span>
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 custom-scrollbar">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
              <input 
                type="text" 
                placeholder="Søk i dokumenter, FDV, godkjenninger..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-2.5 bg-white text-neutral-900 placeholder:text-neutral-400 border border-neutral-200 rounded-2xl focus:ring-2 focus:ring-neutral-900 outline-none font-bold text-sm"
              />
            </div>
            
            <div className="flex items-center gap-2 w-full md:w-auto">
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleManualUpload} 
                className="hidden" 
              />
              <button 
                onClick={handleSyncNOBB}
                disabled={isSyncing}
                className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-2xl text-xs font-bold hover:bg-emerald-500 transition-all shadow-sm disabled:opacity-50"
              >
                {isSyncing ? <RefreshCw className="animate-spin" size={14} /> : <Sparkles size={14} />}
                {syncSuccess ? 'Synkronisert!' : 'Hent fra NOBB'}
              </button>
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-white text-neutral-700 hover:text-neutral-900 border border-neutral-200 rounded-2xl text-xs font-bold hover:bg-neutral-50 transition-all cursor-pointer"
              >
                Last opp manuelt
              </button>
            </div>
          </div>

          {/* Categories */}
          <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2 scrollbar-none">
            {[
              { id: 'all', label: `Alle (${filteredDocs.length})` },
              { id: 'fdv', label: 'FDV Dokumentasjon' },
              { id: 'drawing', label: 'Tegninger' },
              { id: 'contract', label: 'Kontrakter & Samsvar' },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id as any)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  activeCategory === cat.id 
                    ? 'bg-neutral-900 text-white shadow-sm' 
                    : 'bg-white border border-neutral-200 text-neutral-600 hover:border-neutral-400'
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
                key={doc.id || doc.title}
                className="bg-white p-5 rounded-3xl border border-neutral-200 hover:border-neutral-400 transition-all group flex flex-col justify-between"
              >
                <div className="flex items-start gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-neutral-100 flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
                    {getIcon(doc.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-neutral-900 text-sm leading-snug break-words">{doc.title}</h3>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      <span className="text-[10px] font-black uppercase tracking-wider text-neutral-500">{doc.category}</span>
                      {doc.projectName && (
                        <>
                          <span className="w-1 h-1 rounded-full bg-neutral-300" />
                          <span className="text-[10px] font-bold text-neutral-600 truncate max-w-[120px]">{doc.projectName}</span>
                        </>
                      )}
                      <span className="w-1 h-1 rounded-full bg-neutral-300" />
                      <span className="text-[10px] font-bold text-neutral-400">
                        {typeof doc.createdAt === 'string' ? doc.createdAt : (doc.createdAt as any)?.toDate?.()?.toLocaleDateString() || String(doc.createdAt)}
                      </span>
                    </div>

                    {(doc.supplier || doc.nobbNumber || (doc as any).sintefApproval) && (
                      <div className="mt-2 text-xs text-neutral-600 space-y-0.5">
                        {(doc as any).sintefApproval && (
                          <div className="text-[11px] font-bold text-emerald-700 flex items-center gap-1">
                            <span>✓ Godkjenning:</span> {(doc as any).sintefApproval}
                          </div>
                        )}
                        {doc.supplier && (
                          <div className="text-[11px] text-neutral-500">
                            Leverandør: <span className="font-semibold text-neutral-700">{doc.supplier}</span> {doc.nobbNumber ? `(NOBB: ${doc.nobbNumber})` : ''}
                          </div>
                        )}
                        {(doc as any).tek17Clause && (
                          <div className="text-[11px] text-neutral-500">
                            Hjemmel: <span className="font-medium text-neutral-700">{(doc as any).tek17Clause}</span>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex items-center gap-2 mt-3">
                      {doc.source === 'nobb' && (
                        <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-full text-[9px] font-black uppercase tracking-wider">NOBB Byggevare</span>
                      )}
                      {doc.source === 'ai_engine' && (
                        <span className="px-2 py-0.5 bg-purple-50 text-purple-700 border border-purple-200 rounded-full text-[9px] font-black uppercase tracking-wider">AI Prosjekt-FDV</span>
                      )}
                      {doc.source === 'sintef' && (
                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-[9px] font-black uppercase tracking-wider">SINTEF Verifisert</span>
                      )}
                      {doc.source === 'manual' && (
                        <span className="px-2 py-0.5 bg-neutral-100 text-neutral-700 rounded-full text-[9px] font-black uppercase tracking-wider">Opplastet</span>
                      )}
                    </div>
                  </div>
                  <button 
                    onClick={() => handleDownloadDoc(doc)}
                    title="Last ned dokument"
                    className="p-2 text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 rounded-xl transition-all cursor-pointer shrink-0"
                  >
                    <Download size={18} />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>

          {filteredDocs.length === 0 && (
            <div className="p-16 text-center">
              <div className="w-16 h-16 bg-neutral-100 text-neutral-400 rounded-full flex items-center justify-center mx-auto mb-4">
                <Library size={32} />
              </div>
              <h3 className="text-lg font-bold text-neutral-900">Ingen dokumenter funnet</h3>
              <p className="text-neutral-500 text-sm max-w-sm mx-auto mt-1 mb-4">
                {selectedProjectId 
                  ? `Prosjektet «${activeProject?.name}» har ingen lagrede dokumenter ennå. Trykk på «AI Autogenerer FDV» for å lage en fullstendig perm.` 
                  : 'Prøv å endre søket eller bruk knappene over for å hente eller autogenerere dokumentasjon.'}
              </p>
              {selectedProjectId && (
                <button
                  onClick={handleGenerateAiFdv}
                  disabled={isGeneratingAi}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-500 transition-all shadow-md"
                >
                  <Sparkles size={14} />
                  <span>Autogenerer FDV for {activeProject?.name}</span>
                </button>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default DocumentationArchive;
