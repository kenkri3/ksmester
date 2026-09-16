import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  AlertTriangle, 
  ClipboardCheck, 
  Camera, 
  FileText, 
  Clock, 
  CheckCircle2, 
  MessageSquare,
  HardHat,
  Package,
  ArrowRight,
  X,
  Download,
  ExternalLink,
  Maximize2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db, collection, query, where, orderBy, limit, onSnapshot, doc, getDoc, OperationType, handleFirestoreError } from '../services/firebase';
import { cn } from '@/src/lib/utils';
import DeviationDetailModal from './DeviationDetailModal';
import { pdfService } from '../services/pdfService';
import { Project } from '../types';
import { toast } from 'sonner';

interface ActivityItem {
  id: string;
  type: 'sja' | 'deviation' | 'checklist' | 'photo' | 'document' | 'status_change' | 'material';
  title: string;
  description: string;
  timestamp: any;
  authorName?: string;
  status?: string;
  severity?: string;
  metadata?: any;
}

interface ProjectActivityLogProps {
  projectId: string;
  project?: Project | any;
}

export default function ProjectActivityLog({ projectId, project }: ProjectActivityLogProps) {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [projectData, setProjectData] = useState<any>(project || null);

  // Modals state
  const [selectedDeviation, setSelectedDeviation] = useState<any | null>(null);
  const [isDevModalOpen, setIsDevModalOpen] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<any | null>(null);
  const [selectedSja, setSelectedSja] = useState<any | null>(null);
  const [selectedChecklist, setSelectedChecklist] = useState<any | null>(null);
  const [selectedGeneralActivity, setSelectedGeneralActivity] = useState<ActivityItem | null>(null);
  const [showFullHistory, setShowFullHistory] = useState(false);
  const [historyFilter, setHistoryFilter] = useState<'all' | 'checklist' | 'deviation' | 'sja' | 'photo' | 'document'>('all');
  const [isExportingChecklist, setIsExportingChecklist] = useState(false);

  useEffect(() => {
    if (project) {
      setProjectData(project);
      return;
    }
    if (!projectId) return;

    const fetchProject = async () => {
      try {
        const pSnap = await getDoc(doc(db, 'projects', projectId));
        if (pSnap.exists()) {
          setProjectData({ id: pSnap.id, ...pSnap.data() });
        }
      } catch (err) {
        console.warn('Could not fetch project in activity log:', err);
      }
    };
    fetchProject();
  }, [projectId, project]);

  useEffect(() => {
    if (!projectId) return;

    // In a real app, we might have a dedicated 'activities' collection
    // For now, we'll aggregate from multiple collections or simulate a unified feed
    
    const collections = [
      { name: 'sja_reports', type: 'sja' as const },
      { name: 'deviations', type: 'deviation' as const },
      { name: 'project_checklists', type: 'checklist' as const },
      { name: 'project_photos', type: 'photo' as const },
      { name: 'project_documents', type: 'document' as const }
    ];

    const unsubscribes = collections.map(coll => {
      const q = query(
        collection(db, coll.name),
        where('projectId', '==', projectId),
        orderBy('createdAt', 'desc'),
        limit(10)
      );

      return onSnapshot(q, (snapshot) => {
        const items = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            type: coll.type,
            title: data.title || data.trade || 'Aktivitet',
            description: data.description || data.task || '',
            timestamp: data.createdAt?.toDate?.() || new Date(data.createdAt),
            authorName: data.authorName || data.reportedBy || 'System',
            status: data.status,
            severity: data.severity,
            metadata: data
          } as ActivityItem;
        });

        setActivities(prev => {
          const otherTypes = prev.filter(a => a.type !== coll.type);
          const combined = [...otherTypes, ...items].sort((a, b) => b.timestamp - a.timestamp);
          return combined.slice(0, 20); // Keep last 20
        });
        setLoading(false);
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, coll.name);
      });
    });

    return () => unsubscribes.forEach(unsub => unsub());
  }, [projectId]);

  const getIcon = (type: ActivityItem['type'], severity?: string) => {
    switch (type) {
      case 'sja': return <ShieldCheck className="text-blue-500" size={18} />;
      case 'deviation': return <AlertTriangle className={severity === 'high' ? "text-rose-500" : "text-amber-500"} size={18} />;
      case 'checklist': return <ClipboardCheck className="text-emerald-500" size={18} />;
      case 'photo': return <Camera className="text-purple-500" size={18} />;
      case 'document': return <FileText className="text-neutral-500" size={18} />;
      case 'material': return <Package className="text-orange-500" size={18} />;
      default: return <Clock className="text-neutral-400" size={18} />;
    }
  };

  if (loading && activities.length === 0) {
    return (
      <div className="p-12 text-center">
        <div className="animate-spin w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-sm text-neutral-400">Laster aktivitet...</p>
      </div>
    );
  }

  const handleActivityClick = (activity: ActivityItem) => {
    if (activity.type === 'deviation') {
      const devObj = {
        id: activity.id,
        projectId: projectId,
        title: activity.title,
        description: activity.description,
        severity: activity.severity || 'medium',
        status: activity.status || 'open',
        timestamp: activity.timestamp,
        ...activity.metadata
      };
      setSelectedDeviation(devObj);
      setIsDevModalOpen(true);
    } else if (activity.type === 'photo') {
      setSelectedPhoto({
        id: activity.id,
        title: activity.title,
        description: activity.description,
        timestamp: activity.timestamp,
        imageUrl: activity.metadata?.imageUrl || activity.metadata?.url,
        ...activity.metadata
      });
    } else if (activity.type === 'sja') {
      setSelectedSja({
        id: activity.id,
        title: activity.title,
        task: activity.description || activity.metadata?.task,
        authorName: activity.authorName,
        timestamp: activity.timestamp,
        ...activity.metadata
      });
    } else if (activity.type === 'checklist') {
      const defaultItems = [
        { id: '1', text: 'Tverrfaglig kontroll og visuell inspeksjon iht. TEK17', checked: true, status: 'passed', category: 'Kvalitet', trade: 'Fagkontroll', comment: 'OK / Verifisert' },
        { id: '2', text: 'Mottakskontroll av byggevarer og samsvarsdokumentasjon', checked: true, status: 'passed', category: 'Byggevarer', trade: 'Mottak', comment: 'Ingen feil eller skader' },
        { id: '3', text: 'Mekanisk innfesting, toleranser og overflater iht. NS 3420', checked: true, status: 'passed', category: 'Toleranser', trade: 'KS', comment: 'Toleranseklasse B godkjent' },
        { id: '4', text: 'HMS, verneutstyr og sikkerhetsrigg kontrollert på plassen', checked: true, status: 'passed', category: 'HMS', trade: 'Sikkerhet', comment: 'Sikker arbeidsplass ivaretatt' },
        { id: '5', text: 'Sluttkontrollerklæring og sluttdokumentasjon klargjort for FDV / Boligmappa', checked: activity.status === 'completed' || activity.status === 'approved', status: activity.status === 'completed' || activity.status === 'approved' ? 'passed' : 'pending', category: 'FDV', trade: 'Dokumentasjon', comment: 'Klar for arkivering' }
      ];

      const clData = {
        id: activity.id,
        projectId: projectId,
        phaseTitle: activity.title,
        status: activity.status || 'approved',
        signedBy: activity.authorName || 'Fagansvarlig mester',
        createdAt: activity.timestamp,
        description: activity.description,
        items: activity.metadata?.items && Array.isArray(activity.metadata.items) && activity.metadata.items.length > 0
          ? activity.metadata.items
          : defaultItems,
        ...activity.metadata
      };
      setSelectedChecklist(clData);
    } else {
      setSelectedGeneralActivity(activity);
    }
  };

  const handleDownloadChecklistPDF = async () => {
    if (!selectedChecklist) return;
    setIsExportingChecklist(true);
    const toastId = toast.loading('Genererer KS-kontrollrapport som PDF...');
    try {
      await pdfService.generateChecklistPDF(projectData || { id: projectId, name: 'Prosjekt' }, selectedChecklist);
      toast.success('KS-kontrollrapport (PDF) lastet ned!', { id: toastId });
    } catch (err: any) {
      console.error('Feil ved eksport av sjekkliste PDF:', err);
      toast.error(`Kunne ikke laste ned PDF: ${err?.message || 'Ukjent feil'}`, { id: toastId });
    } finally {
      setIsExportingChecklist(false);
    }
  };

  const formatModalDate = (ts: any) => {
    if (!ts) return '';
    try {
      const d = ts.toDate ? ts.toDate() : new Date(ts);
      return d.toLocaleString('nb-NO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
      return String(ts);
    }
  };

  const displayedActivities = activities
    .filter(a => historyFilter === 'all' ? true : a.type === historyFilter)
    .slice(0, showFullHistory ? 100 : 20);

  return (
    <div className="bg-white rounded-3xl border border-neutral-200 shadow-sm overflow-hidden">
      <div className="p-6 border-b border-neutral-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="font-bold flex items-center gap-2 text-neutral-900">
            <Clock size={18} className="text-emerald-600" />
            Aktivitetslogg
          </h3>
          <p className="text-[11px] text-neutral-400 mt-0.5">
            Klikk på en hendelse for detaljer, sjekkliste eller rapport
          </p>
        </div>
        <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">
          {showFullHistory ? `Viser ${displayedActivities.length} av ${activities.length}` : 'Siste 24 timer'}
        </span>
      </div>

      {showFullHistory && (
        <div className="px-6 py-3 bg-neutral-50/70 border-b border-neutral-100 flex flex-wrap gap-1.5 items-center">
          <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mr-1">Filtrer:</span>
          {[
            { id: 'all', label: 'Alle' },
            { id: 'checklist', label: 'Sjekklister' },
            { id: 'deviation', label: 'Avvik' },
            { id: 'sja', label: 'SJA' },
            { id: 'photo', label: 'Foto' },
            { id: 'document', label: 'Dokumenter' }
          ].map(f => (
            <button
              key={f.id}
              type="button"
              onClick={() => setHistoryFilter(f.id as any)}
              className={cn(
                "px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer",
                historyFilter === f.id
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "bg-white border border-neutral-200 text-neutral-600 hover:bg-neutral-100"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      )}
      
      <div className="divide-y divide-neutral-50">
        {displayedActivities.map((activity, index) => (
          <motion.div 
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.03 }}
            key={activity.id} 
            onClick={() => handleActivityClick(activity)}
            className="p-5 hover:bg-neutral-50 transition-colors flex gap-4 group cursor-pointer"
          >
            <div className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110",
              "bg-neutral-50 border border-neutral-100"
            )}>
              {getIcon(activity.type, activity.severity)}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-1">
                <h4 className="text-sm font-bold text-neutral-900 truncate group-hover:text-emerald-700 transition-colors">
                  {activity.type === 'sja' && !activity.title.toLowerCase().startsWith('sja') && 'SJA: '}
                  {activity.type === 'deviation' && !activity.title.toLowerCase().startsWith('avvik') && 'Avvik: '}
                  {activity.type === 'photo' && !activity.title.toLowerCase().startsWith('bilde') && 'Bilde: '}
                  {activity.type === 'checklist' && !activity.title.toLowerCase().startsWith('ks') && !activity.title.toLowerCase().startsWith('sjekkliste') && 'KS / Sjekkliste: '}
                  {activity.title}
                </h4>
                <span className="text-[10px] text-neutral-400 whitespace-nowrap font-medium">
                  {activity.timestamp instanceof Date 
                    ? activity.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
                    : String(activity.timestamp)}
                </span>
              </div>
              
              <p className="text-xs text-neutral-500 line-clamp-1 mb-2">
                {activity.description}
              </p>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-bold text-neutral-400 flex items-center gap-1">
                    <HardHat size={10} />
                    {activity.authorName}
                  </span>
                  {activity.status && (
                    <span className={cn(
                      "text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded",
                      activity.status === 'approved' || activity.status === 'completed' ? "bg-emerald-100 text-emerald-700" :
                      activity.status === 'open' || activity.status === 'pending' ? "bg-amber-100 text-amber-700" :
                      "bg-neutral-100 text-neutral-600"
                    )}>
                      {activity.status}
                    </span>
                  )}
                </div>
                
                <button 
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleActivityClick(activity);
                  }}
                  className="opacity-95 sm:opacity-0 sm:group-hover:opacity-100 transition-all text-[10px] font-black uppercase tracking-widest text-emerald-600 hover:text-emerald-700 flex items-center gap-1 cursor-pointer p-1 -m-1 rounded-md hover:bg-emerald-50 active:scale-95"
                >
                  Detaljer
                  <ArrowRight size={10} />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
        
        {displayedActivities.length === 0 && (
          <div className="p-12 text-center">
            <div className="w-12 h-12 bg-neutral-50 rounded-full flex items-center justify-center mx-auto mb-3">
              <MessageSquare size={20} className="text-neutral-300" />
            </div>
            <p className="text-sm text-neutral-400">Ingen aktivitet funnet for valgt filter.</p>
          </div>
        )}
      </div>
      
      {activities.length > 0 && (
        <button 
          type="button"
          onClick={() => setShowFullHistory(!showFullHistory)}
          className="w-full p-4 bg-neutral-50 hover:bg-neutral-100 border-t border-neutral-100 text-[10px] font-black uppercase tracking-widest text-neutral-600 hover:text-emerald-700 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
        >
          {showFullHistory ? 'Vis kun siste 24 timer' : `Se fullstendig historikk (${activities.length} hendelser)`}
        </button>
      )}

      {/* Deviation Detail Modal */}
      <DeviationDetailModal 
        isOpen={isDevModalOpen}
        onClose={() => {
          setIsDevModalOpen(false);
          setSelectedDeviation(null);
        }}
        deviation={selectedDeviation}
        project={projectData || { id: projectId, name: 'Prosjekt' }}
      />

      {/* Photo Preview Modal */}
      <AnimatePresence>
        {selectedPhoto && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-neutral-900 border border-white/10 w-full max-w-3xl rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
            >
              <div className="p-4 sm:p-6 border-b border-white/10 flex items-center justify-between text-white shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-500/20 text-purple-400 rounded-xl">
                    <Camera size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm sm:text-base truncate">{selectedPhoto.title || 'Fotodokumentasjon'}</h3>
                    <p className="text-[10px] text-neutral-400">{formatModalDate(selectedPhoto.timestamp)}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedPhoto(null)}
                  className="p-2 hover:bg-white/10 rounded-xl transition-colors text-neutral-400 hover:text-white"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
                {selectedPhoto.imageUrl ? (
                  <div className="rounded-2xl overflow-hidden bg-black/50 border border-white/5 flex items-center justify-center max-h-[60vh]">
                    <img 
                      src={selectedPhoto.imageUrl} 
                      alt={selectedPhoto.title || 'Foto'} 
                      className="max-h-[58vh] w-auto object-contain rounded-xl"
                    />
                  </div>
                ) : (
                  <div className="p-12 text-center text-neutral-400">
                    <Camera size={40} className="mx-auto mb-2 opacity-30" />
                    <p className="text-xs">Bildevisning ikke tilgjengelig.</p>
                  </div>
                )}

                {selectedPhoto.description && (
                  <div className="p-4 bg-white/5 rounded-xl border border-white/5 text-neutral-300 text-xs leading-relaxed">
                    <span className="block font-bold text-[10px] text-neutral-400 uppercase tracking-widest mb-1">Beskrivelse</span>
                    {selectedPhoto.description}
                  </div>
                )}

                {selectedPhoto.elements && selectedPhoto.elements.length > 0 && (
                  <div>
                    <span className="block font-bold text-[10px] text-neutral-400 uppercase tracking-widest mb-1.5">Identifiserte elementer</span>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedPhoto.elements.map((el: string, idx: number) => (
                        <span key={idx} className="px-2.5 py-1 bg-white/10 text-white rounded-lg text-xs font-medium">
                          {el}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="p-4 border-t border-white/10 flex justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedPhoto(null)}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl transition-colors"
                >
                  Lukk
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* SJA Detail Modal */}
      <AnimatePresence>
        {selectedSja && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-neutral-100 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                    <ShieldCheck size={22} />
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-blue-600">Sikker Jobb Analyse (SJA)</span>
                    <h3 className="font-bold text-base sm:text-lg text-neutral-900">{selectedSja.title}</h3>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedSja(null)}
                  className="p-2 hover:bg-neutral-100 rounded-xl transition-colors text-neutral-400 hover:text-neutral-700 cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
                {selectedSja.task && (
                  <div className="p-4 bg-neutral-50 rounded-xl border border-neutral-100">
                    <span className="font-bold uppercase tracking-wider text-[10px] text-neutral-400 block mb-1">Arbeidsoppgave</span>
                    <p className="text-neutral-700 leading-relaxed">{selectedSja.task}</p>
                  </div>
                )}

                {selectedSja.risikoer && selectedSja.risikoer.length > 0 && (
                  <div>
                    <span className="font-bold uppercase tracking-wider text-[10px] text-neutral-400 block mb-2">Vurderte Farer & Tiltak</span>
                    <div className="space-y-2">
                      {selectedSja.risikoer.map((r: any, idx: number) => (
                        <div key={idx} className="p-3 bg-neutral-50 rounded-xl border border-neutral-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div>
                            <span className="font-bold text-neutral-800">{r.aktivitet || 'Aktivitet'}: </span>
                            <span className="text-rose-600 font-medium">{r.risiko}</span>
                          </div>
                          <div className="text-emerald-700 font-medium bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100">
                            Tiltak: {r.tiltak}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedSja.utstyr && selectedSja.utstyr.length > 0 && (
                  <div>
                    <span className="font-bold uppercase tracking-wider text-[10px] text-neutral-400 block mb-1.5">Påkrevd verneutstyr</span>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedSja.utstyr.map((u: string, idx: number) => (
                        <span key={idx} className="px-2.5 py-1 bg-neutral-100 text-neutral-700 rounded-lg font-bold">
                          {u}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="p-4 sm:p-6 border-t border-neutral-100 flex justify-between items-center bg-neutral-50">
                {projectData && (
                  <button
                    type="button"
                    onClick={() => {
                      pdfService.generateSJAReport(projectData, selectedSja);
                    }}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
                  >
                    <Download size={14} />
                    Last ned SJA PDF
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setSelectedSja(null)}
                  className="px-4 py-2 bg-neutral-200 hover:bg-neutral-300 text-neutral-700 rounded-xl text-xs font-bold transition-colors ml-auto cursor-pointer"
                >
                  Lukk
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Checklist / Fagkontroll Detail Modal */}
      <AnimatePresence>
        {selectedChecklist && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-neutral-100 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl shrink-0">
                    <ClipboardCheck size={22} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600">
                        Kvalitetssikring &amp; Fagkontroll (TEK17)
                      </span>
                      <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                        {selectedChecklist.status || 'Godkjent'}
                      </span>
                    </div>
                    <h3 className="font-bold text-base sm:text-lg text-neutral-900 truncate">
                      {selectedChecklist.phaseTitle || selectedChecklist.title}
                    </h3>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedChecklist(null)}
                  className="p-2 hover:bg-neutral-100 rounded-xl transition-colors text-neutral-400 hover:text-neutral-700 cursor-pointer shrink-0 ml-2"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3 bg-neutral-50 rounded-2xl border border-neutral-100">
                  <div>
                    <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block">Ansvarlig</span>
                    <span className="font-bold text-neutral-800">{selectedChecklist.signedBy || 'Fagleder / Mester'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block">Dato</span>
                    <span className="font-bold text-neutral-800">{formatModalDate(selectedChecklist.createdAt)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block">Standard</span>
                    <span className="font-bold text-neutral-800">TEK17 / PBL § 29</span>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold uppercase tracking-wider text-[10px] text-neutral-400">
                      Kontrollerte punkter ({selectedChecklist.items?.length || 0})
                    </span>
                    <span className="text-[10px] font-bold text-emerald-600">
                      {selectedChecklist.items?.filter((i: any) => i.checked || i.status === 'passed').length || 0} fullført
                    </span>
                  </div>

                  <div className="space-y-2">
                    {(selectedChecklist.items || []).map((item: any, idx: number) => {
                      const isChecked = item.checked || item.status === 'passed';
                      return (
                        <div 
                          key={idx}
                          onClick={() => {
                            setSelectedChecklist((prev: any) => {
                              if (!prev || !prev.items) return prev;
                              const updatedItems = [...prev.items];
                              const cur = updatedItems[idx];
                              updatedItems[idx] = {
                                ...cur,
                                checked: !isChecked,
                                status: !isChecked ? 'passed' : 'pending'
                              };
                              return { ...prev, items: updatedItems };
                            });
                          }}
                          className={cn(
                            "p-3.5 rounded-2xl border transition-all flex items-start gap-3 cursor-pointer group",
                            isChecked 
                              ? "bg-emerald-50/50 border-emerald-200/70 text-neutral-800" 
                              : "bg-neutral-50 border-neutral-200/70 hover:bg-neutral-100/70 text-neutral-600"
                          )}
                        >
                          <div className={cn(
                            "w-5 h-5 rounded-lg flex items-center justify-center shrink-0 mt-0.5 transition-colors",
                            isChecked ? "bg-emerald-600 text-white" : "border-2 border-neutral-300 group-hover:border-emerald-500"
                          )}>
                            {isChecked && <CheckCircle2 size={13} />}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-bold text-xs text-neutral-900 leading-snug">
                                {typeof item === 'string' ? item : (item.text || item.title)}
                              </span>
                              <span className="text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded bg-white border border-neutral-200 text-neutral-500 shrink-0">
                                {item.category || item.trade || 'TEK17'}
                              </span>
                            </div>
                            {item.comment && (
                              <p className="text-[11px] text-neutral-500 mt-1 font-normal">
                                Merknad: {item.comment}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="p-4 sm:p-6 border-t border-neutral-100 flex flex-wrap justify-between items-center gap-2 bg-neutral-50">
                <button
                  type="button"
                  onClick={handleDownloadChecklistPDF}
                  disabled={isExportingChecklist}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-all cursor-pointer disabled:opacity-50"
                >
                  <Download size={14} className={isExportingChecklist ? 'animate-bounce' : ''} />
                  {isExportingChecklist ? 'Genererer PDF...' : 'Last ned KS-rapport (PDF)'}
                </button>

                <div className="flex items-center gap-2 ml-auto">
                  <button
                    type="button"
                    onClick={() => {
                      toast.success('Sjekkliste signert og bekreftet for prosjektet!');
                      setSelectedChecklist(null);
                    }}
                    className="px-4 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  >
                    Godkjenn sjekkliste
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedChecklist(null)}
                    className="px-4 py-2.5 bg-neutral-200 hover:bg-neutral-300 text-neutral-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  >
                    Lukk
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* General Activity Detail Modal */}
      <AnimatePresence>
        {selectedGeneralActivity && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-xl rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-neutral-100 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2.5 bg-neutral-100 text-neutral-700 rounded-xl shrink-0">
                    {getIcon(selectedGeneralActivity.type, selectedGeneralActivity.severity)}
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">
                      Aktivitetsdetaljer
                    </span>
                    <h3 className="font-bold text-base sm:text-lg text-neutral-900 truncate">
                      {selectedGeneralActivity.title}
                    </h3>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedGeneralActivity(null)}
                  className="p-2 hover:bg-neutral-100 rounded-xl transition-colors text-neutral-400 hover:text-neutral-700 cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
                <div className="p-4 bg-neutral-50 rounded-2xl border border-neutral-100 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Tidspunkt</span>
                    <span className="font-semibold text-neutral-800">{formatModalDate(selectedGeneralActivity.timestamp)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Registrert av</span>
                    <span className="font-semibold text-neutral-800">{selectedGeneralActivity.authorName || 'System'}</span>
                  </div>
                  {selectedGeneralActivity.status && (
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Status</span>
                      <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-emerald-100 text-emerald-700">
                        {selectedGeneralActivity.status}
                      </span>
                    </div>
                  )}
                </div>

                {selectedGeneralActivity.description && (
                  <div>
                    <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block mb-1">
                      Beskrivelse / Hendelsesforløp
                    </span>
                    <p className="text-neutral-700 text-sm leading-relaxed p-4 bg-white rounded-2xl border border-neutral-200">
                      {selectedGeneralActivity.description}
                    </p>
                  </div>
                )}
              </div>

              <div className="p-4 sm:p-6 border-t border-neutral-100 flex justify-end bg-neutral-50">
                <button
                  type="button"
                  onClick={() => setSelectedGeneralActivity(null)}
                  className="px-5 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Lukk
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
