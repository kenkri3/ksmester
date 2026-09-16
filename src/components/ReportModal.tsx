import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
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
  HardHat
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/src/lib/utils';
import { Project, Deviation } from '../types';
import { pdfService } from '../services/pdfService';
import { api } from '../services/api';
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
  const [isExporting, setIsExporting] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [exportStep, setExportStep] = useState<'idle' | 'preparing' | 'sending' | 'success'>('idle');

  const handleBoligmappaExport = async () => {
    setIsExporting(true);
    setExportStep('preparing');
    try {
      await new Promise(resolve => setTimeout(resolve, 600));
      setExportStep('sending');
      
      await pdfService.generateBoligmappaPDF(
        project,
        {
          name: (project as any).companyName || project.clientName || 'Fagbedrift AS',
          orgNumber: (project as any).companyOrgNumber || (project as any).clientOrgNumber || '999 888 777'
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
    const toastId = toast.loading('Genererer FDV- og prosjektrapport som PDF...');
    try {
      await pdfService.generateFDVPDF(project);
      toast.success('FDV- og prosjektrapport (PDF) lastet ned!', { id: toastId });
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
          className="relative w-full max-w-5xl max-h-[92vh] sm:max-h-[90vh] bg-white text-neutral-900 rounded-t-[2rem] sm:rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col pb-[env(safe-area-inset-bottom,0px)]"
        >
          {/* Header */}
          <div className="p-4 sm:p-6 border-b border-neutral-100 bg-white sticky top-0 z-10 shrink-0">
            <div className="sm:hidden w-12 h-1.5 bg-neutral-300 rounded-full mx-auto -mt-1 mb-3 shrink-0" />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 sm:gap-4">
                <div className="w-9 h-9 sm:w-10 sm:h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center shrink-0">
                  <FileText size={18} className="sm:w-5 sm:h-5" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-sm sm:text-xl font-bold tracking-tight text-neutral-900 truncate">Prosjektrapport: {project.name}</h2>
                  <p className="text-[10px] sm:text-xs text-neutral-400 font-bold uppercase tracking-wider">Generert {new Date().toLocaleDateString('no-NO')}</p>
                </div>
              </div>
              <button 
                onClick={onClose} 
                aria-label="Lukk" 
                className="p-2 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 rounded-full transition-colors shrink-0"
              >
                <X size={20} className="sm:w-5 sm:h-5" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-8 md:p-12 bg-neutral-50/50 custom-scrollbar">
            <div className="max-w-4xl mx-auto space-y-6 sm:space-y-12 bg-white p-4 sm:p-12 shadow-sm rounded-xl sm:rounded-[2rem] border border-neutral-100">
              
              {/* Report Title Section */}
              <div className="text-center space-y-2 sm:space-y-4 border-b border-neutral-100 pb-6 sm:pb-12">
                <div className="inline-block px-2.5 py-1 bg-emerald-100 text-emerald-700 text-[7px] sm:text-[10px] font-black uppercase tracking-[0.2em] rounded-full mb-1.5 sm:mb-4">
                  Sluttrapport & Dokumentasjon
                </div>
                <h1 className="text-xl sm:text-5xl font-black tracking-tighter text-neutral-900 leading-none">
                  {project.name}
                </h1>
                <p className="text-xs sm:text-xl text-neutral-500 font-medium italic serif">
                  {project.location} • {project.clientName || 'Privat kunde'}
                </p>
              </div>

              {/* Summary Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-8">
                <div className="space-y-1">
                  <div className="text-[7px] sm:text-[10px] font-black uppercase tracking-widest text-neutral-400">Prosjektperiode</div>
                  <div className="text-[10px] sm:text-sm font-bold">{project.startDate || 'Jan 2024'} - {project.endDate || 'Pågående'}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-[7px] sm:text-[10px] font-black uppercase tracking-widest text-neutral-400">Ansvarlig utførende</div>
                  <div className="text-[10px] sm:text-sm font-bold">{project.projectManager || 'MesterBygg AS'}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-[7px] sm:text-[10px] font-black uppercase tracking-widest text-neutral-400">Dokumentasjonsgrad</div>
                  <div className="flex items-center gap-2">
                    <div className="text-[10px] sm:text-sm font-bold text-emerald-600">{project.documentationLevel || 85}%</div>
                    <div className="flex-1 h-1 bg-neutral-100 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500" style={{ width: `${project.documentationLevel || 85}%` }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* KS Section */}
              <section className="space-y-4 sm:space-y-6">
                <div className="flex items-center gap-2 sm:gap-3 border-b border-neutral-100 pb-2 sm:pb-4">
                  <ClipboardCheck className="text-emerald-600 sm:w-6 sm:h-6" size={16} />
                  <h3 className="text-base sm:text-xl font-bold tracking-tight">Kvalitetssikring (KS)</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div className="p-3 sm:p-6 bg-neutral-50 rounded-xl sm:rounded-2xl border border-neutral-100">
                    <div className="flex justify-between items-start mb-2 sm:mb-4">
                      <div className="text-[10px] sm:text-sm font-bold">Utført egenkontroll</div>
                      <CheckCircle2 size={14} className="text-emerald-500 sm:w-4 sm:h-4" />
                    </div>
                    <p className="text-[9px] sm:text-xs text-neutral-500 leading-relaxed">
                      Alle sjekkpunkter i henhold til fagfeltets krav er gjennomgått og dokumentert med bilder der det er påkrevd.
                    </p>
                  </div>
                  <div className="p-3 sm:p-6 bg-neutral-50 rounded-xl sm:rounded-2xl border border-neutral-100">
                    <div className="flex justify-between items-start mb-2 sm:mb-4">
                      <div className="text-[10px] sm:text-sm font-bold">Samsvarserklæring</div>
                      <ShieldCheck size={14} className="text-emerald-500 sm:w-4 sm:h-4" />
                    </div>
                    <p className="text-[9px] sm:text-xs text-neutral-500 leading-relaxed">
                      Arbeidet er utført i samsvar med gjeldende lover og forskrifter (TEK17).
                    </p>
                  </div>
                </div>
              </section>

              {/* HMS Section */}
              <section className="space-y-4 sm:space-y-6">
                <div className="flex items-center gap-2 sm:gap-3 border-b border-neutral-100 pb-2 sm:pb-4">
                  <HardHat className="text-blue-600 sm:w-6 sm:h-6" size={16} />
                  <h3 className="text-base sm:text-xl font-bold tracking-tight">HMS & SJA</h3>
                </div>
                <div className="space-y-2 sm:space-y-4">
                  {sjaReports.length > 0 ? (
                    sjaReports.map((report, i) => (
                      <div key={i} className="flex items-center justify-between p-2.5 sm:p-4 border border-neutral-100 rounded-xl hover:bg-neutral-50 transition-colors">
                        <div className="flex items-center gap-2 sm:gap-4">
                          <div className="w-7 h-7 sm:w-8 sm:h-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center shrink-0">
                            <ShieldCheck size={14} className="sm:w-4 sm:h-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-[10px] sm:text-sm font-bold truncate">{report.title}</div>
                            <div className="text-[7px] sm:text-[10px] text-neutral-400 font-bold uppercase tracking-widest truncate">
                              {typeof report.timestamp === 'string' ? report.timestamp : (report.timestamp as any)?.toDate?.()?.toLocaleString() || String(report.timestamp)} • Godkjent
                            </div>
                          </div>
                        </div>
                        <ArrowRight size={14} className="text-neutral-300 shrink-0 sm:w-4 sm:h-4" />
                      </div>
                    ))
                  ) : (
                    <p className="text-[10px] sm:text-sm text-neutral-400 italic">Ingen SJA-rapporter er logget.</p>
                  )}
                </div>
              </section>

              {/* Deviations Section */}
              <section className="space-y-4 sm:space-y-6">
                <div className="flex items-center gap-2 sm:gap-3 border-b border-neutral-100 pb-2 sm:pb-4">
                  <AlertTriangle className="text-amber-600 sm:w-6 sm:h-6" size={16} />
                  <h3 className="text-base sm:text-xl font-bold tracking-tight">Avvikshåndtering</h3>
                </div>
                <div className="space-y-2 sm:space-y-4">
                  {deviations.length > 0 ? (
                    deviations.map((dev, i) => (
                      <div key={i} className="p-3 sm:p-4 border border-neutral-100 rounded-xl">
                        <div className="flex justify-between items-start mb-1.5 sm:mb-2">
                          <div className="text-[10px] sm:text-sm font-bold truncate pr-2">{dev.title}</div>
                          <span className={cn(
                            "text-[7px] sm:text-[10px] font-black uppercase tracking-widest px-1.5 sm:px-2 py-0.5 rounded shrink-0",
                            dev.status === 'closed' ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                          )}>
                            {dev.status === 'closed' ? 'Lukket' : 'Åpen'}
                          </span>
                        </div>
                        <p className="text-[9px] sm:text-xs text-neutral-500 line-clamp-2">{dev.description}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-[10px] sm:text-sm text-neutral-400 italic">Ingen avvik registrert.</p>
                  )}
                </div>
              </section>

              {/* Photo Documentation */}
              <section className="space-y-4 sm:space-y-6">
                <div className="flex items-center gap-2 sm:gap-3 border-b border-neutral-100 pb-2 sm:pb-4">
                  <Camera className="text-neutral-600 sm:w-6 sm:h-6" size={16} />
                  <h3 className="text-base sm:text-xl font-bold tracking-tight">Fotodokumentasjon</h3>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="aspect-square bg-neutral-100 rounded-lg sm:rounded-2xl overflow-hidden group relative cursor-pointer border border-neutral-200">
                      <img 
                        src={`https://picsum.photos/seed/project-${project.id}-${i}/400/400`} 
                        alt={`Dokumentasjon ${i}`}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <ExternalLink size={16} className="text-white sm:w-5 sm:h-5" />
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Footer Signature */}
              <div className="pt-6 sm:pt-12 border-t border-neutral-100 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-5 sm:gap-8">
                <div className="space-y-2 sm:space-y-4">
                  <div className="text-[7px] sm:text-[10px] font-black uppercase tracking-widest text-neutral-400">Signert digitalt av</div>
                  <div className="flex items-center gap-2 sm:gap-4">
                    <div className="w-8 h-8 sm:w-12 sm:h-12 bg-neutral-900 text-white rounded-full flex items-center justify-center font-bold text-xs sm:text-base">
                      MB
                    </div>
                    <div>
                      <div className="text-[10px] sm:text-sm font-bold">MesterBygg AS</div>
                      <div className="text-[8px] sm:text-xs text-neutral-500">Org.nr: 987 654 321</div>
                    </div>
                  </div>
                </div>
                <div className="sm:text-right">
                  <div className="text-[7px] sm:text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-0.5 sm:mb-2">Dokument ID</div>
                  <div className="text-[7px] sm:text-[10px] font-mono text-neutral-400">MB-REPORT-{project.id?.substring(0, 8).toUpperCase()}-2024</div>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="p-4 sm:p-6 border-t border-neutral-100 bg-white flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 shrink-0">
            <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto">
              <button 
                type="button"
                onClick={handleDownloadPDF}
                disabled={isDownloadingPdf}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 sm:px-6 py-3 bg-neutral-100 text-neutral-700 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-bold hover:bg-neutral-200 transition-all cursor-pointer disabled:opacity-50"
              >
                <Download size={15} className={cn("sm:w-[18px] sm:h-[18px]", isDownloadingPdf && "animate-bounce text-emerald-600")} />
                {isDownloadingPdf ? 'Laster ned...' : <><span className="hidden xs:inline">Last ned</span> PDF</>}
              </button>
              <button 
                onClick={handleShare}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 sm:px-6 py-3 bg-neutral-100 text-neutral-700 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-bold hover:bg-neutral-200 transition-all cursor-pointer"
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
                  ? "bg-emerald-500 text-white shadow-emerald-100" 
                  : "bg-blue-600 text-white hover:bg-blue-500 shadow-blue-100"
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
