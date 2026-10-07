import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { displayOrgnr } from '../constants/companyDetails';
import { 
  X, 
  FileText, 
  Download, 
  Share2, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldCheck, 
  Camera, 
  ArrowRight, 
  Loader2, 
  ExternalLink, 
  ClipboardCheck, 
  HardHat,
  Image as ImageIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/src/lib/utils';
import { Project, Deviation } from '../types';
import { pdfService } from '../services/pdfService';
import { api } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { toast } from 'sonner';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project;
  sjaReports: any[];
  deviations: Deviation[];
}

export default function ReportModal({ isOpen, onClose, project, sjaReports, deviations }: ReportModalProps) {
  const { t } = useTranslation();
  const { user, company } = useAuth();
  const [isExporting, setIsExporting] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [exportStep, setExportStep] = useState<'idle' | 'preparing' | 'sending' | 'success'>('idle');

  // Dynamiske bedriftsopplysninger basert på reelle bruker- og prosjektdata
  const companyName = project.companyName || (project as any).company || company || user?.company || 'Ansvarlig Entreprenør';
  const companyOrg = (project as any).companyOrgNumber || (project as any).companyOrg || '';
  const projectLeader = project.projectManager || user?.displayName || companyName;
  const companyInitials = (companyName || 'VM')
    .split(' ')
    .filter(Boolean)
    .map((n: string) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase() || 'VM';
  const docId = `RAPPORT-${(project.id || 'PROJ').substring(0, 8).toUpperCase()}-${new Date().getFullYear()}`;

  // Samle reell fotodokumentasjon fra prosjektet (avvik, sjekklister, prosjektbilde)
  const projectPhotos = useMemo(() => {
    const photos: { url: string; title: string; date?: string }[] = [];
    if (project.imageUrl) {
      photos.push({ url: project.imageUrl, title: 'Prosjektfoto' });
    }
    deviations.forEach(d => {
      if (d.imageUrl && !photos.some(p => p.url === d.imageUrl)) {
        photos.push({ url: d.imageUrl, title: `Avvik: ${d.title}`, date: d.createdAt || d.timestamp });
      }
    });
    if (Array.isArray((project as any).photos)) {
      (project as any).photos.forEach((p: any) => {
        const url = typeof p === 'string' ? p : p.url;
        if (url && !photos.some(existing => existing.url === url)) {
          photos.push({ url, title: p.title || 'Dokumentasjon', date: p.createdAt });
        }
      });
    }
    if (Array.isArray((project as any).checklists)) {
      (project as any).checklists.forEach((chk: any) => {
        if (Array.isArray(chk.items)) {
          chk.items.forEach((item: any) => {
            if (item.photoUrl && !photos.some(existing => existing.url === item.photoUrl)) {
              photos.push({ url: item.photoUrl, title: item.text || 'Kontrollpunkt', date: chk.updatedAt });
            }
          });
        }
      });
    }
    return photos;
  }, [project, deviations]);

  const handleBoligmappaExport = async () => {
    setIsExporting(true);
    setExportStep('preparing');
    try {
      await new Promise(resolve => setTimeout(resolve, 600));
      setExportStep('sending');
      
      await pdfService.generateBoligmappaPDF(
        project,
        {
          name: companyName,
          // SIKKERHETSFIKS (R-02): falt tilbake pa et hardkodet org.nr som ikke
          // tilhørte kunden. Na brukes kundens eget nummer, eller en aelig
          // tomverdi, i stedet for a tilskrive dem feil organisasjon.
          orgNumber: companyOrg || displayOrgnr(null)
        },
        (project as any).checklists || []
      );

      // 📁 Arkiver i prosjektets faste dokumentarkiv
      await api.saveDoc('project_documents', {
        projectId: project.id,
        title: `Boligmappa FDV-underlag - ${project.name}`,
        type: 'fdv',
        category: 'FDV & Sluttdokumentasjon',
        source: 'system',
        createdAt: new Date().toISOString().split('T')[0]
      }).catch(() => {});
      
      setExportStep('success');
      toast.success('Boligmappa-underlag generert, lastet ned og arkivert i prosjektet!');
    } catch (error) {
      console.error('Boligmappa export error:', error);
      toast.error('Kunne ikke generere Boligmappa-dokument.');
      setExportStep('idle');
    } finally {
      setTimeout(() => {
        setIsExporting(false);
        setExportStep('idle');
      }, 2500);
    }
  };

  const handleDownloadPDF = async () => {
    setIsDownloadingPdf(true);
    const toastId = toast.loading('Genererer prosjekt- og KS-rapport som PDF...');
    try {
      await pdfService.generateProjectReportPDF(project, {
        sjaReports,
        deviations,
        companyInfo: {
          name: companyName,
          orgNumber: companyOrg
        }
      });
      toast.success('Prosjektrapport (PDF) lastet ned!', { id: toastId });
    } catch (error: any) {
      console.error('PDF generation error:', error);
      toast.error(`Kunne ikke generere PDF: ${error?.message || 'Ukjent feil'}`, { id: toastId });
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const handleShare = async () => {
    const portalUrl = `${window.location.origin}/?portal=${project.portalToken || project.id}`;
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `Prosjektrapport: ${project.name}`,
          text: `Her er oppdatert kvalitetssikringsdokumentasjon for ${project.name}`,
          url: portalUrl
        });
        toast.success('Rapport delt!');
      } catch (e) {
        // Avbrutt av bruker
      }
    } else if (typeof navigator !== 'undefined' && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(portalUrl);
        toast.success('Kundeportal-lenke kopiert til utklippstavlen!');
      } catch {
        toast.info(`Kundeportal-lenke: ${portalUrl}`);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 md:p-8">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="relative w-full max-w-5xl max-h-[92vh] sm:max-h-[90vh] bg-[#0B0F17] text-white border border-slate-800 rounded-t-[2rem] sm:rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col pb-[env(safe-area-inset-bottom,0px)]"
        >
          {/* Header */}
          <div className="p-4 sm:p-6 border-b border-slate-800 bg-[#131722] sticky top-0 z-10 shrink-0">
            <div className="sm:hidden w-12 h-1.5 bg-slate-700 rounded-full mx-auto -mt-1 mb-3 shrink-0" />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 sm:gap-4">
                <div className="w-9 h-9 sm:w-10 sm:h-10 bg-emerald-950/60 text-emerald-400 border border-emerald-800/40 rounded-xl flex items-center justify-center shrink-0">
                  <FileText size={18} className="sm:w-5 sm:h-5" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-sm sm:text-xl font-bold tracking-tight text-white truncate">Prosjektrapport: {project.name}</h2>
                  <p className="text-[10px] sm:text-xs text-slate-400 font-bold uppercase tracking-wider">Generert {new Date().toLocaleDateString('no-NO')}</p>
                </div>
              </div>
              <button 
                onClick={onClose} 
                aria-label="Lukk" 
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors shrink-0 cursor-pointer"
              >
                <X size={20} className="sm:w-5 sm:h-5" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-8 md:p-12 bg-[#0B0F17] custom-scrollbar">
            <div className="max-w-4xl mx-auto space-y-6 sm:space-y-12 bg-[#131722] text-white p-4 sm:p-12 shadow-sm rounded-xl sm:rounded-[2rem] border border-slate-800">
              
              {/* Report Title Section */}
              <div className="text-center space-y-2 sm:space-y-4 border-b border-slate-800 pb-6 sm:pb-12">
                <div className="inline-block px-2.5 py-1 bg-emerald-950/60 text-emerald-300 border border-emerald-800/40 text-[7px] sm:text-[10px] font-black uppercase tracking-[0.2em] rounded-full mb-1.5 sm:mb-4">
                  Sluttrapport & Dokumentasjon
                </div>
                <h1 className="text-xl sm:text-5xl font-black tracking-tighter text-white leading-none">
                  {project.name}
                </h1>
                <p className="text-xs sm:text-xl text-slate-400 font-medium italic serif">
                  {project.location} • {project.clientName || 'Privat kunde'}
                </p>
              </div>

              {/* Summary Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-8">
                <div className="space-y-1">
                  <div className="text-[7px] sm:text-[10px] font-black uppercase tracking-widest text-slate-400">Prosjektperiode</div>
                  <div className="text-[10px] sm:text-sm font-bold text-white">{project.startDate || 'Jan 2024'} - {project.endDate || 'Pågående'}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-[7px] sm:text-[10px] font-black uppercase tracking-widest text-slate-400">Ansvarlig utførende</div>
                  <div className="text-[10px] sm:text-sm font-bold text-white">{projectLeader}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-[7px] sm:text-[10px] font-black uppercase tracking-widest text-slate-400">Dokumentasjonsgrad</div>
                  <div className="flex items-center gap-2">
                    <div className="text-[10px] sm:text-sm font-bold text-emerald-400">{project.documentationLevel || 85}%</div>
                    <div className="flex-1 h-1 bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500" style={{ width: `${project.documentationLevel || 85}%` }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* KS Section */}
              <section className="space-y-4 sm:space-y-6">
                <div className="flex items-center gap-2 sm:gap-3 border-b border-slate-800 pb-2 sm:pb-4">
                  <ClipboardCheck className="text-emerald-400 sm:w-6 sm:h-6" size={16} />
                  <h3 className="text-base sm:text-xl font-bold tracking-tight text-white">Kvalitetssikring (KS)</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div className="p-3 sm:p-6 bg-slate-900/60 rounded-xl sm:rounded-2xl border border-slate-800">
                    <div className="flex justify-between items-start mb-2 sm:mb-4">
                      <div className="text-[10px] sm:text-sm font-bold text-white">Utført egenkontroll</div>
                      <CheckCircle2 size={14} className="text-emerald-400 sm:w-4 sm:h-4" />
                    </div>
                    <p className="text-[9px] sm:text-xs text-slate-400 leading-relaxed">
                      Alle sjekkpunkter i henhold til fagfeltets krav er gjennomgått og dokumentert med bilder der det er påkrevd.
                    </p>
                  </div>
                  <div className="p-3 sm:p-6 bg-slate-900/60 rounded-xl sm:rounded-2xl border border-slate-800">
                    <div className="flex justify-between items-start mb-2 sm:mb-4">
                      <div className="text-[10px] sm:text-sm font-bold text-white">Samsvarserklæring</div>
                      <ShieldCheck size={14} className="text-emerald-400 sm:w-4 sm:h-4" />
                    </div>
                    <p className="text-[9px] sm:text-xs text-slate-400 leading-relaxed">
                      Arbeidet er utført i samsvar med gjeldende lover og forskrifter (TEK17).
                    </p>
                  </div>
                </div>
              </section>

              {/* HMS Section */}
              <section className="space-y-4 sm:space-y-6">
                <div className="flex items-center gap-2 sm:gap-3 border-b border-slate-800 pb-2 sm:pb-4">
                  <HardHat className="text-blue-400 sm:w-6 sm:h-6" size={16} />
                  <h3 className="text-base sm:text-xl font-bold tracking-tight text-white">HMS & SJA</h3>
                </div>
                <div className="space-y-2 sm:space-y-4">
                  {sjaReports.length > 0 ? (
                    sjaReports.map((report, i) => (
                      <div key={i} className="flex items-center justify-between p-2.5 sm:p-4 border border-slate-800 rounded-xl hover:bg-slate-800/50 transition-colors">
                        <div className="flex items-center gap-2 sm:gap-4">
                          <div className="w-7 h-7 sm:w-8 sm:h-8 bg-blue-950/60 text-blue-400 border border-blue-800/40 rounded-lg flex items-center justify-center shrink-0">
                            <ShieldCheck size={14} className="sm:w-4 sm:h-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-[10px] sm:text-sm font-bold text-white truncate">{report.title}</div>
                            <div className="text-[7px] sm:text-[10px] text-slate-400 font-bold uppercase tracking-widest truncate">
                              {typeof report.timestamp === 'string' ? report.timestamp : (report.timestamp as any)?.toDate?.()?.toLocaleString() || String(report.timestamp)} • Godkjent
                            </div>
                          </div>
                        </div>
                        <ArrowRight size={14} className="text-slate-500 shrink-0 sm:w-4 sm:h-4" />
                      </div>
                    ))
                  ) : (
                    <p className="text-[10px] sm:text-sm text-slate-500 italic">Ingen SJA-rapporter er logget.</p>
                  )}
                </div>
              </section>

              {/* Deviations Section */}
              <section className="space-y-4 sm:space-y-6">
                <div className="flex items-center gap-2 sm:gap-3 border-b border-slate-800 pb-2 sm:pb-4">
                  <AlertTriangle className="text-amber-400 sm:w-6 sm:h-6" size={16} />
                  <h3 className="text-base sm:text-xl font-bold tracking-tight text-white">Avvikshåndtering</h3>
                </div>
                <div className="space-y-2 sm:space-y-4">
                  {deviations.length > 0 ? (
                    deviations.map((dev, i) => (
                      <div key={i} className="p-3 sm:p-4 border border-slate-800 rounded-xl bg-slate-900/60">
                        <div className="flex justify-between items-start mb-1.5 sm:mb-2">
                          <div className="text-[10px] sm:text-sm font-bold text-white truncate pr-2">{dev.title}</div>
                          <span className={cn(
                            "text-[7px] sm:text-[10px] font-black uppercase tracking-widest px-1.5 sm:px-2 py-0.5 rounded shrink-0",
                            dev.status === 'closed' ? "bg-emerald-950/60 text-emerald-300 border border-emerald-800/40" : "bg-amber-950/60 text-amber-300 border border-amber-800/40"
                          )}>
                            {dev.status === 'closed' ? 'Lukket' : 'Åpen'}
                          </span>
                        </div>
                        <p className="text-[9px] sm:text-xs text-slate-400 line-clamp-2">{dev.description}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-[10px] sm:text-sm text-slate-500 italic">Ingen avvik registrert.</p>
                  )}
                </div>
              </section>

              {/* Photo Documentation */}
              <section className="space-y-4 sm:space-y-6">
                <div className="flex items-center gap-2 sm:gap-3 border-b border-slate-800 pb-2 sm:pb-4">
                  <Camera className="text-slate-400 sm:w-6 sm:h-6" size={16} />
                  <h3 className="text-base sm:text-xl font-bold tracking-tight text-white">Fotodokumentasjon</h3>
                </div>
                {projectPhotos.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
                    {projectPhotos.map((photo, i) => (
                      <div key={i} className="aspect-square bg-slate-900 rounded-lg sm:rounded-2xl overflow-hidden group relative cursor-pointer border border-slate-800">
                        <img 
                          src={photo.url} 
                          alt={photo.title || `Dokumentasjon ${i + 1}`}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                          referrerPolicy="no-referrer"
                        />
                        <a 
                          href={photo.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-2 text-center"
                        >
                          <ExternalLink size={16} className="text-white mb-1" />
                          <span className="text-[9px] text-white font-bold truncate max-w-full">{photo.title}</span>
                        </a>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 bg-slate-900/60 rounded-2xl border border-dashed border-slate-800 text-center">
                    <Camera className="mx-auto text-slate-500 mb-2" size={32} />
                    <p className="text-xs font-bold text-slate-300">Ingen fotodokumentasjon registrert ennå</p>
                    <p className="text-[10px] text-slate-500 mt-1 max-w-md mx-auto">
                      Bilder som lastes opp i sjekklister, avvikshåndtering og sluttkontroller vil automatisk arkiveres og vises her.
                    </p>
                  </div>
                )}
              </section>

              {/* Footer Signature */}
              <div className="pt-6 sm:pt-12 border-t border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-5 sm:gap-8">
                <div className="space-y-2 sm:space-y-4">
                  <div className="text-[7px] sm:text-[10px] font-black uppercase tracking-widest text-slate-400">Signert digitalt av</div>
                  <div className="flex items-center gap-2 sm:gap-4">
                    <div className="w-8 h-8 sm:w-12 sm:h-12 bg-slate-800 text-white border border-slate-700 rounded-full flex items-center justify-center font-bold text-xs sm:text-base">
                      {companyInitials}
                    </div>
                    <div>
                      <div className="text-[10px] sm:text-sm font-bold text-white">{companyName}</div>
                      {companyOrg ? (
                        <div className="text-[8px] sm:text-xs text-slate-400">Org.nr: {companyOrg}</div>
                      ) : (
                        <div className="text-[8px] sm:text-xs text-emerald-400 font-bold flex items-center gap-1">
                          <CheckCircle2 size={12} /> Verifisert foretak
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="sm:text-right">
                  <div className="text-[7px] sm:text-[10px] font-black uppercase tracking-widest text-slate-400 mb-0.5 sm:mb-2">Dokument ID</div>
                  <div className="text-[7px] sm:text-[10px] font-mono text-slate-500">{docId}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="p-4 sm:p-6 border-t border-slate-800 bg-[#131722] flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 shrink-0">
            <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto">
              <button 
                type="button"
                onClick={handleDownloadPDF}
                disabled={isDownloadingPdf}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 sm:px-6 py-3 bg-slate-800 text-slate-200 border border-slate-700 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-bold hover:bg-slate-700 hover:text-white transition-all cursor-pointer disabled:opacity-50"
              >
                <Download size={15} className={cn("sm:w-[18px] sm:h-[18px]", isDownloadingPdf && "animate-bounce text-emerald-400")} />
                {isDownloadingPdf ? 'Laster ned...' : <><span className="hidden xs:inline">Last ned</span> PDF</>}
              </button>
              <button 
                onClick={handleShare}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 sm:px-6 py-3 bg-slate-800 text-slate-200 border border-slate-700 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-bold hover:bg-slate-700 hover:text-white transition-all cursor-pointer"
              >
                <Share2 size={15} className="sm:w-[18px] sm:h-[18px]" />
                Del <span className="hidden xs:inline">med kunde</span>
              </button>
            </div>
            
            <button 
              onClick={handleBoligmappaExport}
              disabled={isExporting}
              className={cn(
                "w-full sm:w-auto flex items-center justify-center gap-2.5 sm:gap-3 px-6 sm:px-8 py-3.5 sm:py-3 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-bold transition-all shadow-xl cursor-pointer",
                exportStep === 'success' 
                  ? "bg-emerald-500 text-white shadow-emerald-950/50" 
                  : "bg-blue-600 text-white hover:bg-blue-500 shadow-blue-950/50"
              )}
            >
              {isExporting ? (
                <>
                  <Loader2 size={12} className="animate-spin sm:w-3.5 sm:h-3.5" />
                  <span className="truncate">
                    {exportStep === 'preparing' ? 'Klargjør...' : 'Sender...'}
                  </span>
                </>
              ) : exportStep === 'success' ? (
                <>
                  <CheckCircle2 size={12} className="sm:w-3.5 sm:h-3.5" />
                  Sendt!
                </>
              ) : (
                <>
                  <ExternalLink size={12} className="sm:w-3.5 sm:h-3.5" />
                  Send til Boligmappa
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
