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

  return (
    <div className="bg-white rounded-3xl border border-neutral-200 shadow-sm overflow-hidden">
      <div className="p-6 border-b border-neutral-100 flex items-center justify-between">
        <h3 className="font-bold flex items-center gap-2">
          <Clock size={18} className="text-emerald-600" />
          Aktivitetslogg
        </h3>
        <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Siste 24 timer</span>
      </div>
      
      <div className="divide-y divide-neutral-50">
        {activities.map((activity, index) => (
          <motion.div 
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
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
                  {activity.type === 'sja' && 'SJA: '}
                  {activity.type === 'deviation' && 'Avvik: '}
                  {activity.type === 'photo' && 'Bilde: '}
                  {activity.title}
                </h4>
                <span className="text-[10px] text-neutral-400 whitespace-nowrap font-medium">
                  {activity.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
                      activity.status === 'open' ? "bg-amber-100 text-amber-700" :
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
                  className="opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition-all text-[10px] font-black uppercase tracking-widest text-emerald-600 hover:text-emerald-700 flex items-center gap-1 cursor-pointer p-1 -m-1 rounded-md hover:bg-emerald-50 active:scale-95"
                >
                  Detaljer
                  <ArrowRight size={10} />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
        
        {activities.length === 0 && (
          <div className="p-12 text-center">
            <div className="w-12 h-12 bg-neutral-50 rounded-full flex items-center justify-center mx-auto mb-3">
              <MessageSquare size={20} className="text-neutral-300" />
            </div>
            <p className="text-sm text-neutral-400">Ingen aktivitet registrert ennå.</p>
          </div>
        )}
      </div>
      
      {activities.length > 0 && (
        <button className="w-full p-4 bg-neutral-50 border-t border-neutral-100 text-[10px] font-black uppercase tracking-widest text-neutral-500 hover:text-neutral-700 transition-colors">
          Se fullstendig historikk
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
                  className="p-2 hover:bg-neutral-100 rounded-xl transition-colors text-neutral-400 hover:text-neutral-700"
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
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm"
                  >
                    <Download size={14} />
                    Last ned SJA PDF
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setSelectedSja(null)}
                  className="px-4 py-2 bg-neutral-200 hover:bg-neutral-300 text-neutral-700 rounded-xl text-xs font-bold transition-colors ml-auto"
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
