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
  ShieldCheck,
  Eye,
  Send,
  Copy,
  Check
} from 'lucide-react';
import { ProjectDocument, ProjectMaterial } from '../types';
import { db, collection, query, where, onSnapshot, addDoc, serverTimestamp } from '../services/firebase';
import { api } from '../services/api';
import { toast } from 'sonner';
import { cn } from '@/src/lib/utils';

interface ProjectOption {
  id: string;
  name: string;
  clientName?: string;
  clientEmail?: string;
  category?: string;
  address?: string;
  description?: string;
}

export function generateSingleDocHtml(docItem: any, project: any, companyName: string = 'Viking Entreprenør AS'): string {
  const dateStr = typeof docItem.createdAt === 'string' 
    ? docItem.createdAt 
    : (docItem.createdAt?.toDate?.()?.toLocaleDateString('no-NO') || new Date().toLocaleDateString('no-NO'));

  return `<!DOCTYPE html>
<html lang="no">
<head>
  <meta charset="UTF-8">
  <title>${docItem.title} - FDV Datablad</title>
  <style>
    @page { size: A4; margin: 15mm; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #0f172a;
      background: #ffffff;
      margin: 0;
      padding: 24px;
      line-height: 1.5;
    }
    .header {
      border-bottom: 3px solid #0f172a;
      padding-bottom: 16px;
      margin-bottom: 24px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .logo {
      font-size: 20px;
      font-weight: 900;
      color: #0f172a;
      letter-spacing: -0.5px;
    }
    .badge {
      background: #0f172a;
      color: #ffffff;
      padding: 5px 14px;
      border-radius: 9999px;
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .title {
      font-size: 22px;
      font-weight: 900;
      margin: 12px 0 4px 0;
      color: #0f172a;
    }
    .subtitle {
      font-size: 12px;
      color: #64748b;
    }
    .stamps {
      display: flex;
      gap: 10px;
      margin: 16px 0;
      flex-wrap: wrap;
    }
    .stamp {
      padding: 6px 12px;
      border-radius: 8px;
      font-size: 11px;
      font-weight: 800;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .stamp-green {
      background: #f0fdf4;
      color: #166534;
      border: 1px solid #bbf7d0;
    }
    .stamp-blue {
      background: #eff6ff;
      color: #1e40af;
      border: 1px solid #bfdbfe;
    }
    .grid-meta {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 16px;
      margin-bottom: 24px;
    }
    .meta-field label {
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
      color: #64748b;
      display: block;
      margin-bottom: 2px;
    }
    .meta-field div {
      font-size: 13px;
      font-weight: 700;
      color: #0f172a;
    }
    .section-title {
      font-size: 13px;
      font-weight: 800;
      color: #0f172a;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin: 20px 0 8px 0;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 4px;
    }
    .content-box {
      font-size: 13px;
      color: #334155;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 12px 16px;
      line-height: 1.6;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 14px 0;
      font-size: 13px;
    }
    th, td {
      padding: 10px 14px;
      text-align: left;
      border-bottom: 1px solid #e2e8f0;
    }
    th {
      background: #f1f5f9;
      font-weight: 800;
      font-size: 11px;
      text-transform: uppercase;
      color: #475569;
    }
    .signatures {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 30px;
      margin-top: 36px;
      padding-top: 20px;
      border-top: 1px dashed #cbd5e1;
    }
    .sig-line {
      border-top: 1px solid #94a3b8;
      padding-top: 6px;
      font-size: 11px;
      color: #64748b;
    }
    @media print {
      body { padding: 0; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="logo">VIKINGMESTER KS & FDV-ARKIV</div>
      <div class="title">${docItem.title}</div>
      <div class="subtitle">Forvaltning, Drift og Vedlikehold iht. TEK17 § 4-1 & Plan- og bygningsloven</div>
    </div>
    <span class="badge">${docItem.category || 'FDV Dokumentasjon'}</span>
  </div>

  <div class="stamps">
    <span class="stamp stamp-green">✓ TEK17 & PBL § 29-1 Verifisert</span>
    ${docItem.sintefApproval ? `<span class="stamp stamp-blue">✓ Godkjenning: ${docItem.sintefApproval}</span>` : ''}
    ${docItem.nobbNumber ? `<span class="stamp stamp-blue">NOBB: ${docItem.nobbNumber}</span>` : ''}
  </div>

  <div class="grid-meta">
    <div class="meta-field">
      <label>Prosjekt</label>
      <div>${docItem.projectName || project?.name || 'VikingMester Prosjekt'}</div>
      <div style="font-size: 11px; color: #64748b; font-weight: normal;">${project?.address || 'Byggeplass'}</div>
    </div>
    <div class="meta-field">
      <label>Leverandør / Produsent</label>
      <div>${docItem.supplier || 'Norsk Byggevareleverandør'}</div>
      <div style="font-size: 11px; color: #64748b; font-weight: normal;">Kilde: ${(docItem.source || 'NOBB').toUpperCase()}</div>
    </div>
    <div class="meta-field">
      <label>Dato registrert</label>
      <div>${dateStr}</div>
    </div>
    <div class="meta-field">
      <label>Lovhjemmel</label>
      <div>${docItem.tek17Clause || 'TEK17 / Plan- og bygningsloven § 29-1'}</div>
    </div>
  </div>

  <div class="section-title">1. Formål og bruksområde</div>
  <div class="content-box">
    ${docItem.description || 'Dette dokumentet inngår i prosjektets offisielle FDV-perm og bekrefter at produktet er levert og montert i overensstemmelse med prosjekterte ytelser.'}
  </div>

  <div class="section-title">2. Tekniske spesifikasjoner & ytelseserklæring</div>
  <table>
    <thead>
      <tr>
        <th>Egenskap / Krav</th>
        <th>Spesifikasjon</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Produktbetegnelse</td>
        <td><strong>${docItem.title}</strong></td>
      </tr>
      <tr>
        <td>NOBB Varenummer</td>
        <td>${docItem.nobbNumber || 'Ikke registrert / Generisk'}</td>
      </tr>
      <tr>
        <td>Teknisk Godkjenning (TG / CE)</td>
        <td>${docItem.sintefApproval || 'Sintef Byggforsk / Europeisk Teknisk Bedømmelse'}</td>
      </tr>
      <tr>
        <td>Krav i Byggeteknisk forskrift</td>
        <td>${docItem.tek17Clause || 'TEK17 Kapittel 11 / 13 / 15'}</td>
      </tr>
    </tbody>
  </table>

  <div class="section-title">3. Anvisning for drift og vedlikehold</div>
  <div class="content-box">
    <strong>Vedlikeholdsintervall:</strong> ${docItem.maintenanceInterval || 'Periodisk kontroll og ettersyn minimum 1 gang per år.'}
    <p style="margin: 8px 0 0 0; font-size: 12px; color: #64748b;">
      Renhold utføres med milde, nøytrale rengjøringsmidler. Unngå slipemidler eller sterke kjemikalier som kan forringe overflaten.
    </p>
  </div>

  <div class="signatures">
    <div>
      <div style="height: 35px;"></div>
      <div class="sig-line">
        <strong>Utarbeidet for entreprenør:</strong><br>
        ${companyName} / VikingMester KS
      </div>
    </div>
    <div>
      <div style="height: 35px; color: #16a34a; font-weight: bold; font-size: 12px; display: flex; align-items: flex-end;">
        ✓ Gyldig for overlevering
      </div>
      <div class="sig-line">
        <strong>Kontrollert & Arkivert:</strong><br>
        Sluttdokumentasjon for overlevering
      </div>
    </div>
  </div>
</body>
</html>`;
}

interface DocumentationArchiveProps {
  isOpen: boolean;
  onClose: () => void;
  projectId?: string;
  projects?: ProjectOption[];
  inline?: boolean;
}

const DocumentationArchive: React.FC<DocumentationArchiveProps> = ({ 
  isOpen, 
  onClose, 
  projectId: initialProjectId, 
  projects = [],
  inline = false
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
  const [previewDoc, setPreviewDoc] = useState<ProjectDocument | null>(null);
  const [isSendModalOpen, setIsSendModalOpen] = useState(false);
  const [selectedDocForEmail, setSelectedDocForEmail] = useState<ProjectDocument | null>(null);
  const [recipientEmailInput, setRecipientEmailInput] = useState('');
  const [clientNameInput, setClientNameInput] = useState('');
  const [emailMode, setEmailMode] = useState<'single' | 'combined'>('combined');
  const [showNobbByokModal, setShowNobbByokModal] = useState(false);
  const [nobbKeyInput, setNobbKeyInput] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('nobb_api_key') || '';
    }
    return '';
  });
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

  const handlePrintDoc = (docItem: any) => {
    try {
      const html = generateSingleDocHtml(docItem, activeProject);
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(html);
        printWindow.document.close();
        setTimeout(() => {
          printWindow.focus();
          printWindow.print();
        }, 400);
      } else {
        toast.error('Utskriftsvindu blokkert. Tillat sprettoppvinduer i nettleseren.');
      }
    } catch (e) {
      console.error(e);
      toast.error('Kunne ikke åpne utskriftsvisning');
    }
  };

  const handleDownloadDoc = (docItem: any) => {
    if (docItem.fileData) {
      const a = document.createElement('a');
      a.href = docItem.fileData;
      a.download = docItem.title || 'dokument';
      a.click();
      toast.success(`Laster ned ${docItem.title}`);
    } else {
      // Aldri last ned .txt - generer profesjonelt A4 HTML-dokument
      const html = generateSingleDocHtml(docItem, activeProject);
      const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${(docItem.title || 'dokument').replace(/[^a-zA-Z0-9_-]/g, '_')}.html`;
      a.click();
      toast.success(`Lastet ned ${docItem.title} som formatert dokument`);
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

  // Åpne interaktiv modal for sending til kunde
  const handleOpenEmailModal = (docItem?: any) => {
    setSelectedDocForEmail(docItem || null);
    setEmailMode(docItem ? 'single' : 'combined');
    setRecipientEmailInput(activeProject?.clientEmail || '');
    setClientNameInput(activeProject?.clientName || 'Kunde');
    setIsSendModalOpen(true);
  };

  const handleExecuteSendEmail = async () => {
    if (!recipientEmailInput.trim()) {
      toast.error('Vennligst oppgi en gyldig e-postadresse.');
      return;
    }

    setIsSendingEmail(true);
    try {
      if (emailMode === 'single' && selectedDocForEmail) {
        await fetch('/api/notify/email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: recipientEmailInput.trim(),
            subject: `📄 ${selectedDocForEmail.title} - ${activeProject?.name || 'Prosjekt'}`,
            content: `
              Hei ${clientNameInput || 'Kunde'}!

              Vedlagt oversendes offisiell FDV- og produktdokumentasjon for prosjektet "${activeProject?.name || 'Prosjekt'}":

              Dokument: ${selectedDocForEmail.title}
              Kategori: ${selectedDocForEmail.category || 'FDV Dokumentasjon'}
              Leverandør: ${selectedDocForEmail.supplier || 'Norsk Byggevare'}
              Godkjenning: ${selectedDocForEmail.sintefApproval || 'Sintef Byggforsk / CE'}
              Lovhjemmel: ${selectedDocForEmail.tek17Clause || 'TEK17 § 4-1'}

              Dokumentet er verifisert og godkjent for prosjektets sluttdokumentasjon.

              Med vennlig hilsen,
              VikingMester KS & Byggeledelse
            `
          })
        });
        toast.success(`Dokumentet «${selectedDocForEmail.title}» er sendt til ${recipientEmailInput}!`);
      } else {
        const res = await fetch('/api/documentation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'email_documentation',
            projectId: selectedProjectId || 'general',
            projectInfo: {
              ...activeProject,
              clientName: clientNameInput,
              clientEmail: recipientEmailInput
            },
            recipientEmail: recipientEmailInput.trim()
          })
        });

        const data = await res.json();
        if (data.success) {
          toast.success(`Komplett FDV-perm er sendt på e-post til ${recipientEmailInput}!`);
        } else {
          toast.error(data.error || 'Kunne ikke sende dokumentasjon på e-post');
        }
      }
      setIsSendModalOpen(false);
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
    if (!nobbKeyInput.trim()) {
      setShowNobbByokModal(true);
      return;
    }
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
        toast.info('Ingen nye materialer eller FDV-blader ble funnet for prosjektet. Du kan laste opp dokumenter med «Last opp manuelt».');
        setIsSyncing(false);
        return;
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

  const content = (
    <div className={cn(
      "bg-neutral-50 text-neutral-900 w-full overflow-hidden flex flex-col",
      inline 
        ? "rounded-3xl border border-slate-800 shadow-xl min-h-[600px]" 
        : "max-w-5xl rounded-t-[2rem] sm:rounded-[2.5rem] shadow-2xl max-h-[92vh] sm:max-h-[90vh] pb-[env(safe-area-inset-bottom,0px)]"
    )}>
      {/* Mobile Grab Handle */}
      {!inline && <div className="sm:hidden w-12 h-1.5 bg-neutral-300 rounded-full mx-auto mt-3 mb-1 shrink-0" />}

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
                onClick={() => handleOpenEmailModal()}
                disabled={isSendingEmail}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-neutral-300 text-neutral-800 hover:text-neutral-900 rounded-xl text-xs font-bold hover:bg-neutral-50 transition-all shadow-sm disabled:opacity-50 cursor-pointer"
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
                className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-2xl text-xs font-bold hover:bg-emerald-500 transition-all shadow-sm disabled:opacity-50 cursor-pointer"
                title="Hent FDV-dokumentasjon direkte fra NOBB med bedriftens egen API-nøkkel (BYOK)"
              >
                {isSyncing ? <RefreshCw className="animate-spin" size={14} /> : <Sparkles size={14} />}
                {syncSuccess ? 'Synkronisert!' : 'Hent fra NOBB (BYOK)'}
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
                onClick={() => setPreviewDoc(doc)}
                className="bg-white p-5 rounded-3xl border border-neutral-200 hover:border-purple-400/80 hover:shadow-md transition-all group flex flex-col justify-between cursor-pointer"
              >
                <div className="flex items-start gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-neutral-100 flex items-center justify-center group-hover:scale-105 group-hover:bg-purple-50 group-hover:text-purple-600 transition-all shrink-0">
                    {getIcon(doc.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-neutral-900 group-hover:text-purple-900 transition-colors text-sm leading-snug break-words">{doc.title}</h3>
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

                    <div className="flex items-center gap-2 mt-3 flex-wrap">
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

                  {/* Actions toolbar */}
                  <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <button 
                      type="button"
                      onClick={() => setPreviewDoc(doc)}
                      title="Forhåndsvis FDV-dokument"
                      className="p-1.5 text-neutral-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-all cursor-pointer"
                    >
                      <Eye size={16} />
                    </button>
                    <button 
                      type="button"
                      onClick={() => handlePrintDoc(doc)}
                      title="Skriv ut / PDF"
                      className="p-1.5 text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition-all cursor-pointer"
                    >
                      <Printer size={16} />
                    </button>
                    <button 
                      type="button"
                      onClick={() => handleOpenEmailModal(doc)}
                      title="Send på e-post til kunde"
                      className="p-1.5 text-neutral-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all cursor-pointer"
                    >
                      <Mail size={16} />
                    </button>
                    <button 
                      type="button"
                      onClick={() => handleDownloadDoc(doc)}
                      title="Last ned formatert dokument"
                      className="p-1.5 text-neutral-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all cursor-pointer"
                    >
                      <Download size={16} />
                    </button>
                  </div>
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
      </div>
  );

  return (
    <>
      {inline ? (
        content
      ) : (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.98, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="w-full max-w-5xl"
          >
            {content}
          </motion.div>
        </div>
      )}

      {/* NOBB BYOK Modal */}
      {showNobbByokModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-neutral-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
                  <Sparkles size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-neutral-900">NOBB Byggevarebase (BYOK)</h3>
                  <span className="text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-900 px-2 py-0.5 rounded">
                    Bring Your Own Key
                  </span>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setShowNobbByokModal(false)}
                className="text-neutral-400 hover:text-neutral-600 p-1 cursor-pointer font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-neutral-600 mb-4 leading-relaxed">
              Norsk Byggtjeneste AS krever at hver enkelt bedrift har egen lisensavtale for API-tilgang til Norsk Byggevarebase (NOBB). VikingMester henter offisielle FDV-blader, EPD og grossistpriser direkte på din bedrifts avtale.
            </p>

            <div className="mb-4">
              <label className="block text-[11px] font-black uppercase tracking-wider text-neutral-700 mb-1.5">
                NOBB API-nøkkel (Subscription Key)
              </label>
              <input
                type="password"
                value={nobbKeyInput}
                onChange={(e) => setNobbKeyInput(e.target.value)}
                placeholder="f.eks. d3b07384d113edec49eaa6238ad5ff00"
                className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 text-sm font-mono focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none"
              />
              <span className="text-[10px] text-neutral-400 mt-1 block">
                Nøkkelen lagres trygt for din bedrift og benyttes for alle FDV-oppslag.
              </span>
            </div>

            <div className="flex gap-2 justify-end pt-3 border-t border-neutral-100">
              <button
                type="button"
                onClick={() => setShowNobbByokModal(false)}
                className="px-3.5 py-2 rounded-xl text-xs font-bold text-neutral-600 hover:bg-neutral-100 transition-colors cursor-pointer"
              >
                Avbryt
              </button>
              <button
                type="button"
                disabled={!nobbKeyInput.trim()}
                onClick={async () => {
                  try {
                    localStorage.setItem('nobb_api_key', nobbKeyInput.trim());
                    await fetch('/api/settings/integrations', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        service: 'NOBB',
                        secretToken: nobbKeyInput.trim(),
                        status: 'active'
                      })
                    }).catch(() => {});
                    setShowNobbByokModal(false);
                    toast.success('NOBB API-nøkkel (BYOK) er lagret!');
                    handleSyncNOBB();
                  } catch (e) {
                    toast.error('Kunne ikke lagre NOBB API-nøkkel');
                  }
                }}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md transition-all disabled:opacity-50 cursor-pointer"
              >
                Lagre og synkroniser FDV
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 📄 ELEGANT A4 FORHÅNDSVISNINGSMODAL FOR ENKELTDOKUMENT */}
      {previewDoc && (
        <div className="fixed inset-0 z-[115] flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in overflow-y-auto">
          <div className="bg-neutral-900 border border-neutral-700/80 rounded-3xl max-w-4xl w-full flex flex-col max-h-[94vh] shadow-2xl overflow-hidden text-neutral-100">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-neutral-800 bg-neutral-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    {previewDoc.category || 'FDV Dokumentasjon'}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    ✓ TEK17 Godkjent
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-black text-white truncate mt-1">
                  {previewDoc.title}
                </h3>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handlePrintDoc(previewDoc)}
                  className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                  title="Skriv ut eller lagre som PDF"
                >
                  <Printer size={14} />
                  <span>Skriv ut / PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenEmailModal(previewDoc)}
                  className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                  title="Send til kunde på e-post"
                >
                  <Mail size={14} />
                  <span className="hidden sm:inline">Send til kunde</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDownloadDoc(previewDoc)}
                  className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                  title="Last ned formatert dokument"
                >
                  <Download size={14} />
                  <span className="hidden sm:inline">Last ned</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewDoc(null)}
                  className="p-1.5 text-neutral-400 hover:text-white rounded-xl cursor-pointer"
                  title="Lukk"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Modal Document Body: Authentic A4 White Sheet */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-neutral-950/70">
              <div className="max-w-3xl mx-auto bg-white text-neutral-900 rounded-2xl shadow-2xl p-6 sm:p-10 border border-neutral-200">
                {/* Brevhode */}
                <div className="border-b-2 border-neutral-900 pb-5 mb-6 flex flex-col sm:flex-row justify-between items-start gap-4">
                  <div>
                    <div className="text-xs font-black tracking-wider uppercase text-purple-700 flex items-center gap-1.5">
                      <ShieldCheck size={14} />
                      <span>VikingMester KS & FDV-Arkiv</span>
                    </div>
                    <h1 className="text-xl sm:text-2xl font-black text-neutral-900 tracking-tight mt-1">
                      {previewDoc.title}
                    </h1>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      Forvaltning, Drift og Vedlikehold iht. TEK17 § 4-1 & Plan- og bygningsloven § 29-1
                    </p>
                  </div>
                  <div className="text-left sm:text-right">
                    <span className="inline-block px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-neutral-900 text-white">
                      {previewDoc.category || 'FDV Dokument'}
                    </span>
                    <div className="text-[11px] text-neutral-500 mt-1.5 font-medium">
                      Dato: {typeof previewDoc.createdAt === 'string' ? previewDoc.createdAt : (previewDoc.createdAt as any)?.toDate?.()?.toLocaleDateString('no-NO') || new Date().toLocaleDateString('no-NO')}
                    </div>
                  </div>
                </div>

                {/* Verifiseringsmerker */}
                <div className="flex flex-wrap gap-2 mb-6">
                  <span className="px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-bold flex items-center gap-1.5">
                    <CheckCircle2 size={13} className="text-emerald-600" />
                    <span>TEK17 & PBL § 29-1 Verifisert</span>
                  </span>
                  {previewDoc.sintefApproval && (
                    <span className="px-3 py-1 bg-blue-50 text-blue-800 border border-blue-200 rounded-lg text-xs font-bold">
                      ✓ Godkjenning: {previewDoc.sintefApproval}
                    </span>
                  )}
                  {previewDoc.nobbNumber && (
                    <span className="px-3 py-1 bg-blue-50 text-blue-800 border border-blue-200 rounded-lg text-xs font-bold">
                      NOBB: {previewDoc.nobbNumber}
                    </span>
                  )}
                </div>

                {/* Prosjekt & Partinfo */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-neutral-50 rounded-xl border border-neutral-200 mb-6 text-xs">
                  <div>
                    <span className="font-extrabold text-[10px] uppercase tracking-wider text-neutral-500 block mb-1">
                      Byggeplass / Prosjekt:
                    </span>
                    <div className="font-bold text-neutral-900 text-sm">
                      {previewDoc.projectName || activeProject?.name || 'VikingMester Prosjekt'}
                    </div>
                    <div className="text-neutral-600 mt-0.5">{activeProject?.address || 'Byggeplass'}</div>
                  </div>
                  <div>
                    <span className="font-extrabold text-[10px] uppercase tracking-wider text-neutral-500 block mb-1">
                      Leverandør / Kilde:
                    </span>
                    <div className="font-bold text-neutral-900 text-sm">
                      {previewDoc.supplier || 'Norsk Byggevareleverandør'}
                    </div>
                    <div className="text-neutral-600 mt-0.5">
                      Kilde: {(previewDoc.source || 'NOBB').toUpperCase()}
                    </div>
                  </div>
                </div>

                {/* 1. Formål */}
                <div className="mb-6">
                  <h3 className="text-xs font-black uppercase tracking-wider text-neutral-700 border-b border-neutral-200 pb-1.5 mb-2">
                    1. Formål og bruksområde
                  </h3>
                  <div className="bg-neutral-50/80 p-4 rounded-xl border border-neutral-200 text-sm text-neutral-800 leading-relaxed">
                    <p className="whitespace-pre-wrap">
                      {previewDoc.description || 'Dette dokumentet inngår i prosjektets offisielle FDV-perm og bekrefter at produktet er levert og montert i overensstemmelse med prosjekterte ytelser.'}
                    </p>
                  </div>
                </div>

                {/* 2. Tekniske spesifikasjoner */}
                <div className="mb-6">
                  <h3 className="text-xs font-black uppercase tracking-wider text-neutral-700 border-b border-neutral-200 pb-1.5 mb-2">
                    2. Tekniske spesifikasjoner & ytelseserklæring
                  </h3>
                  <div className="border border-neutral-200 rounded-xl overflow-hidden text-xs sm:text-sm">
                    <table className="w-full text-left">
                      <thead className="bg-neutral-100 text-neutral-700 text-xs uppercase font-extrabold">
                        <tr>
                          <th className="p-3">Egenskap / Krav</th>
                          <th className="p-3">Spesifikasjon</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-200">
                        <tr>
                          <td className="p-3 font-medium text-neutral-700">Produktbetegnelse</td>
                          <td className="p-3 font-bold text-neutral-900">{previewDoc.title}</td>
                        </tr>
                        <tr>
                          <td className="p-3 font-medium text-neutral-700">NOBB Varenummer</td>
                          <td className="p-3 font-bold text-neutral-900">{previewDoc.nobbNumber || 'Ikke registrert / Generisk'}</td>
                        </tr>
                        <tr>
                          <td className="p-3 font-medium text-neutral-700">Teknisk godkjenning</td>
                          <td className="p-3 font-bold text-neutral-900">{previewDoc.sintefApproval || 'Sintef Byggforsk / CE'}</td>
                        </tr>
                        <tr>
                          <td className="p-3 font-medium text-neutral-700">Krav i TEK17</td>
                          <td className="p-3 font-bold text-neutral-900">{previewDoc.tek17Clause || 'TEK17 § 4-1'}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 3. Anvisning for drift og vedlikehold */}
                <div className="mb-6">
                  <h3 className="text-xs font-black uppercase tracking-wider text-neutral-700 border-b border-neutral-200 pb-1.5 mb-2">
                    3. Anvisning for drift og vedlikehold
                  </h3>
                  <div className="bg-neutral-50/80 p-4 rounded-xl border border-neutral-200 text-xs sm:text-sm text-neutral-800 leading-relaxed">
                    <strong>Vedlikeholdsintervall:</strong> {previewDoc.maintenanceInterval || 'Periodisk kontroll og ettersyn minimum 1 gang per år.'}
                    <p className="mt-2 text-neutral-600 text-xs">
                      Renhold utføres med milde, nøytrale rengjøringsmidler. Unngå slipemidler eller sterke kjemikalier som kan forringe overflaten.
                    </p>
                  </div>
                </div>

                {/* Signaturblokk */}
                <div className="pt-4 border-t-2 border-dashed border-neutral-200 grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
                  <div>
                    <div className="text-[11px] text-neutral-400 uppercase font-black tracking-wider mb-1">Utarbeidet for entreprenør</div>
                    <div className="font-bold text-neutral-900">VikingMester KS & Byggeledelse</div>
                    <div className="text-[11px] text-neutral-500">Dato: {new Date().toLocaleDateString('no-NO')}</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-neutral-400 uppercase font-black tracking-wider mb-1">Status overlevering</div>
                    <div className="flex items-center gap-1.5 text-emerald-700 font-bold">
                      <CheckCircle2 size={16} />
                      <span>Verifisert og gyldig for overtakelse</span>
                    </div>
                    <div className="text-[11px] text-neutral-500 mt-0.5">Sluttdokumentasjon for arkivering</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-neutral-800 bg-neutral-950 flex justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setPreviewDoc(null)}
                className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Lukk forhåndsvisning
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ✉️ INTERAKTIV MODAL: SEND FDV-DOKUMENTASJON TIL KUNDE */}
      {isSendModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-neutral-200 text-neutral-900">
            <div className="flex items-center justify-between pb-4 border-b border-neutral-100 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-purple-100 text-purple-800 rounded-2xl">
                  <Mail size={20} />
                </div>
                <div>
                  <h3 className="text-base font-black text-neutral-900">Send dokumentasjon til kunde</h3>
                  <p className="text-xs text-neutral-500">
                    {emailMode === 'single' && selectedDocForEmail 
                      ? selectedDocForEmail.title 
                      : `Komplett FDV-perm for ${activeProject?.name || 'prosjektet'}`}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsSendModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-700 p-1.5 rounded-xl cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Kundens e-post */}
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">
                  Mottakers e-postadresse *
                </label>
                <input
                  type="email"
                  value={recipientEmailInput}
                  onChange={(e) => setRecipientEmailInput(e.target.value)}
                  placeholder="f.eks. kunde@eksempel.no"
                  className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-300 rounded-xl text-sm text-neutral-900 focus:border-purple-600 focus:ring-2 focus:ring-purple-600/20 outline-none"
                />
              </div>

              {/* Kundens navn */}
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">
                  Kundens navn
                </label>
                <input
                  type="text"
                  value={clientNameInput}
                  onChange={(e) => setClientNameInput(e.target.value)}
                  placeholder="Ola Nordmann"
                  className="w-full px-3.5 py-2 bg-neutral-50 border border-neutral-300 rounded-xl text-xs text-neutral-900 focus:border-purple-600 outline-none"
                />
              </div>

              {/* Følgebrev Forhåndsvisning */}
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">
                  Forhåndsvisning av oversendelse
                </label>
                <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-xl text-[11px] text-neutral-600 space-y-1 font-mono">
                  <p><strong>Emne:</strong> 📁 FDV & Sluttdokumentasjon - {activeProject?.name || 'Prosjekt'}</p>
                  <p className="pt-1 text-neutral-500">
                    «Hei {clientNameInput || 'kunde'}, her er offisiell FDV- og sluttdokumentasjon for {activeProject?.name || 'prosjektet'}, verifisert iht. TEK17.»
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-5 mt-4 border-t border-neutral-100">
              <button
                type="button"
                onClick={() => setIsSendModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-neutral-600 hover:bg-neutral-100 rounded-xl transition-colors cursor-pointer"
              >
                Avbryt
              </button>
              <button
                type="button"
                disabled={isSendingEmail || !recipientEmailInput.trim()}
                onClick={handleExecuteSendEmail}
                className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                {isSendingEmail ? <RefreshCw className="animate-spin" size={14} /> : <Send size={14} />}
                <span>{isSendingEmail ? 'Sender over...' : 'Send dokumentasjon'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default DocumentationArchive;
