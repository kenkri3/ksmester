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
  ArrowRight
} from 'lucide-react';
import { motion } from 'motion/react';
import { db, collection, query, where, orderBy, limit, onSnapshot, OperationType, handleFirestoreError } from '../services/firebase';
import { cn } from '@/src/lib/utils';

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
}

export default function ProjectActivityLog({ projectId }: ProjectActivityLogProps) {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

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
            className="p-5 hover:bg-neutral-50 transition-colors flex gap-4 group"
          >
            <div className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110",
              "bg-neutral-50 border border-neutral-100"
            )}>
              {getIcon(activity.type, activity.severity)}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-1">
                <h4 className="text-sm font-bold text-neutral-900 truncate">
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
                
                <button className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-black uppercase tracking-widest text-emerald-600 flex items-center gap-1">
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
    </div>
  );
}
