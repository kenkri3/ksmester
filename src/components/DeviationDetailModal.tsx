import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  MapPin, 
  HardHat, 
  Download, 
  Trash2, 
  Sparkles, 
  Camera, 
  Save, 
  Loader2, 
  Maximize2,
  FileText,
  Wrench,
  Check
} from 'lucide-react';
import { toast } from 'sonner';
import { db, doc, updateDoc, deleteDoc, serverTimestamp, collection, query, where, getDocs, limit, OperationType, handleFirestoreError } from '../services/firebase';
import { Deviation, Project } from '../types';
import { pdfService } from '../services/pdfService';
import { deviationAiService, DeviationRemedySuggestion } from '../services/deviationAiService';
import { cn } from '@/src/lib/utils';

interface DeviationDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  deviation: Deviation | any | null;
  project?: Project | { id: string; name: string };
  onUpdated?: () => void;
}

export default function DeviationDetailModal({
  isOpen,
  onClose,
  deviation,
  project,
  onUpdated
}: DeviationDetailModalProps) {
  const [currentDev, setCurrentDev] = useState<any>(null);
  const [status, setStatus] = useState<'open' | 'in-progress' | 'closed'>('open');
  const [severity, setSeverity] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');
  const [actionText, setActionText] = useState('');
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [resolvedPhotoUrl, setResolvedPhotoUrl] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<DeviationRemedySuggestion | null>(null);
  const [isLoadingAi, setIsLoadingAi] = useState(false);
  const [isImageZoomed, setIsImageZoomed] = useState(false);

  useEffect(() => {
    if (!deviation) return;

    setCurrentDev(deviation);
    setStatus(deviation.status || 'open');
    setSeverity(deviation.severity || 'medium');
    setActionText(deviation.action || deviation.tiltak || '');
    setPhotoUrl(deviation.imageUrl || deviation.photoUrl || null);
    setResolvedPhotoUrl(deviation.resolvedPhotoUrl || null);
    setAiSuggestion(null);

    // If no direct image URL on deviation, try to look up matching photo in project_photos
    if (!deviation.imageUrl && !deviation.photoUrl && (deviation.projectId || project?.id)) {
      const projId = deviation.projectId || project?.id;
      const findPhoto = async () => {
        try {
          const q = query(
            collection(db, 'project_photos'),
            where('projectId', '==', projId),
            limit(15)
          );
          const snap = await getDocs(q);
          if (!snap.empty) {
            const devTitle = (deviation.title || '').replace(/^AI Detektert:\s*/i, '').trim();
            const match = snap.docs.find(d => {
              const pData = d.data();
              return (
                (pData.title && devTitle && (pData.title.includes(devTitle) || devTitle.includes(pData.title))) ||
                pData.status === 'deviation'
              );
            });
            if (match) {
              setPhotoUrl(match.data().imageUrl);
            }
          }
        } catch (e) {
          console.warn('Could not auto-lookup matching photo:', e);
        }
      };
      findPhoto();
    }
  }, [deviation, project?.id]);

  if (!isOpen || !currentDev) return null;

  const handleUpdateStatus = async (newStatus: 'open' | 'in-progress' | 'closed') => {
    setIsSaving(true);
    try {
      const devRef = doc(db, 'deviations', currentDev.id);
      const updateData: any = {
        status: newStatus,
        updatedAt: serverTimestamp()
      };
      if (newStatus === 'closed') {
        updateData.closedAt = new Date().toISOString();
      }
      await updateDoc(devRef, updateData);
      setStatus(newStatus);
      setCurrentDev((prev: any) => ({ ...prev, status: newStatus }));
      toast.success(
        newStatus === 'closed' 
          ? 'Avviket er lukket og markert som utbedret!' 
          : newStatus === 'in-progress' 
          ? 'Avviket er satt til under behandling.' 
          : 'Avviket er gjenåpnet.'
      );
      onUpdated?.();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'deviations');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveDetails = async () => {
    setIsSaving(true);
    try {
      const devRef = doc(db, 'deviations', currentDev.id);
      const updateData: any = {
        severity,
        action: actionText,
        resolvedPhotoUrl: resolvedPhotoUrl || null,
        updatedAt: serverTimestamp()
      };
      if (photoUrl && !currentDev.imageUrl) {
        updateData.imageUrl = photoUrl;
      }
      await updateDoc(devRef, updateData);
      setCurrentDev((prev: any) => ({ ...prev, ...updateData }));
      toast.success('Avviket ble oppdatert!');
      onUpdated?.();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'deviations');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Er du sikker på at du vil slette dette avviket? Dette kan ikke angres.')) return;
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, 'deviations', currentDev.id));
      toast.success('Avviket ble slettet.');
      onUpdated?.();
      onClose();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'deviations');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleFetchAiRemedy = async () => {
    setIsLoadingAi(true);
    try {
      const suggestion = await deviationAiService.suggestDeviationRemedy({
        title: currentDev.title,
        description: currentDev.description,
        severity,
        location: currentDev.location
      });
      setAiSuggestion(suggestion);
      toast.success('AI-forslag til utbedring hentet!');
    } catch (error) {
      toast.error('Kunne ikke hente AI-forslag. Prøv igjen senere.');
    } finally {
      setIsLoadingAi(false);
    }
  };

  const handleApplyAiAction = () => {
    if (!aiSuggestion) return;
    const textToApply = `${aiSuggestion.recommendedAction}\n\nLovreferanse: ${aiSuggestion.tek17Ref || 'TEK17'}\nForebygging: ${aiSuggestion.preventiveAction}`;
    setActionText(textToApply);
    toast.info('AI-anbefaling lagt inn i tiltaksfeltet.');
  };

  const handleResolvedPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setResolvedPhotoUrl(reader.result as string);
        toast.success('Bilde av utbedring lagt til. Husk å lagre.');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDownloadPDF = async () => {
    try {
      const fullProject: Project = {
        id: project?.id || currentDev.projectId || '',
        name: project?.name || currentDev.project || 'Prosjekt',
        location: currentDev.location || '',
        progress: 0,
        status: 'active',
        stage: 'active',
        documentationLevel: 100,
        lastUpdate: new Date().toISOString()
      };
      await pdfService.generateDeviationReport(fullProject, {
        ...currentDev,
        severity,
        status,
        action: actionText,
        imageUrl: photoUrl || currentDev.imageUrl
      });
      toast.success('Avviksrapport (RUH) lastet ned som PDF!');
    } catch (err) {
      console.error('PDF error:', err);
      toast.error('Kunne ikke generere PDF.');
    }
  };

  const formatTimestamp = (ts: any) => {
    if (!ts) return 'Nylig registrert';
    try {
      const date = ts.toDate ? ts.toDate() : new Date(ts);
      return date.toLocaleString('nb-NO', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return String(ts);
    }
  };

  const isAiDetected = currentDev.source === 'ai_vision' || (currentDev.title && currentDev.title.toLowerCase().includes('ai detektert'));

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 20 }}
          className="bg-[#0B0F17] text-white w-full max-w-3xl rounded-t-[2rem] sm:rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[90vh] pb-[env(safe-area-inset-bottom,0px)] border border-slate-800"
        >
          {/* Mobile Handle */}
          <div className="sm:hidden w-12 h-1.5 bg-slate-700 rounded-full mx-auto mt-3 mb-1 shrink-0" />

          {/* Modal Header */}
          <div className="p-4 sm:p-6 border-b border-slate-800 flex items-start justify-between bg-[#131722] shrink-0">
            <div className="flex items-start gap-4 min-w-0">
              <div className={cn(
                "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm border",
                severity === 'critical' || severity === 'high' 
                  ? "bg-rose-950/40 text-rose-400 border-rose-800/50" 
                  : severity === 'medium'
                  ? "bg-amber-950/40 text-amber-400 border-amber-800/50"
                  : "bg-blue-950/40 text-blue-400 border-blue-800/50"
              )}>
                <AlertTriangle size={24} />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Avvik / RUH
                  </span>
                  {isAiDetected && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-950/40 text-indigo-300 border border-indigo-800/50">
                      <Sparkles size={10} />
                      MesterAI Vision
                    </span>
                  )}
                  <span className="text-[10px] text-slate-400 flex items-center gap-1">
                    <Clock size={10} />
                    {formatTimestamp(currentDev.timestamp || currentDev.createdAt)}
                  </span>
                </div>
                <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight leading-snug">
                  {currentDev.title}
                </h2>
              </div>
            </div>

            <button 
              onClick={onClose} 
              aria-label="Lukk"
              className="p-2 hover:bg-slate-800 rounded-xl transition-colors shrink-0 text-slate-400 hover:text-white"
            >
              <X size={20} />
            </button>
          </div>

          {/* Scrollable Modal Body */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 custom-scrollbar bg-[#0B0F17]">

            {/* Status & Quick Action Banner */}
            <div className="bg-[#131722] p-4 sm:p-5 rounded-2xl border border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-slate-400">Status:</span>
                <span className={cn(
                  "text-xs font-black uppercase tracking-wider px-3 py-1 rounded-full flex items-center gap-1.5 border",
                  status === 'closed' ? "bg-emerald-950/40 text-emerald-300 border-emerald-800/50" :
                  status === 'in-progress' ? "bg-blue-950/40 text-blue-300 border-blue-800/50" :
                  "bg-amber-950/40 text-amber-300 border-amber-800/50"
                )}>
                  {status === 'closed' ? (
                    <><CheckCircle2 size={13} /> Lukket / Utbedret</>
                  ) : status === 'in-progress' ? (
                    <><Clock size={13} /> Under behandling</>
                  ) : (
                    <><AlertTriangle size={13} /> Åpen</>
                  )}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {status !== 'in-progress' && status !== 'closed' && (
                  <button
                    disabled={isSaving}
                    onClick={() => handleUpdateStatus('in-progress')}
                    className="px-3.5 py-1.5 bg-blue-950/40 hover:bg-blue-900/40 text-blue-300 rounded-xl text-xs font-bold transition-all border border-blue-800/50"
                  >
                    Start behandling
                  </button>
                )}

                {status !== 'closed' ? (
                  <button
                    disabled={isSaving}
                    onClick={() => handleUpdateStatus('closed')}
                    className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
                  >
                    <CheckCircle2 size={14} />
                    Lukk avvik
                  </button>
                ) : (
                  <button
                    disabled={isSaving}
                    onClick={() => handleUpdateStatus('open')}
                    className="px-3.5 py-1.5 bg-amber-950/40 hover:bg-amber-900/40 text-amber-300 rounded-xl text-xs font-bold transition-all border border-amber-800/50"
                  >
                    Gjenåpne avvik
                  </button>
                )}
              </div>
            </div>

            {/* Metadata Badges (Severity, Reported By, Location) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Severity */}
              <div className="bg-[#131722] p-3.5 rounded-2xl border border-slate-800 shadow-sm">
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
                  Alvorlighetsgrad
                </label>
                <select
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs font-bold text-white focus:ring-2 focus:ring-emerald-500/20"
                >
                  <option value="low">Lav</option>
                  <option value="medium">Middels</option>
                  <option value="high">Høy</option>
                  <option value="critical">Kritisk</option>
                </select>
              </div>

              {/* Reported By */}
              <div className="bg-[#131722] p-3.5 rounded-2xl border border-slate-800 shadow-sm flex flex-col justify-center">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
                  Rapportert av
                </span>
                <span className="text-xs font-bold text-white flex items-center gap-1.5 truncate">
                  <HardHat size={14} className="text-slate-400 shrink-0" />
                  {currentDev.reportedBy || currentDev.authorName || 'System'}
                </span>
              </div>

              {/* Location */}
              <div className="bg-[#131722] p-3.5 rounded-2xl border border-slate-800 shadow-sm flex flex-col justify-center">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
                  Lokasjon / Bygg
                </span>
                <span className="text-xs font-bold text-white flex items-center gap-1.5 truncate">
                  <MapPin size={14} className="text-slate-400 shrink-0" />
                  {currentDev.location || project?.name || 'Ikke spesifisert'}
                </span>
              </div>
            </div>

            {/* Description Card */}
            <div className="bg-[#131722] p-5 rounded-2xl border border-slate-800 shadow-sm space-y-2">
              <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                <FileText size={14} />
                Observasjon & Beskrivelse
              </h4>
              <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-line font-normal">
                {currentDev.description || 'Ingen utfyllende beskrivelse tilgjengelig.'}
              </p>
            </div>

            {/* Photo Section */}
            <div className="bg-[#131722] p-5 rounded-2xl border border-slate-800 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                  <Camera size={14} />
                  Fotodokumentasjon
                </h4>
                {photoUrl && (
                  <span className="text-[11px] font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-2 py-0.5 rounded-md">
                    1 bilde registrert
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Original Photo */}
                <div>
                  <span className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">
                    Opprinnelig bilde (Avvik):
                  </span>
                  {photoUrl ? (
                    <div 
                      onClick={() => setIsImageZoomed(true)}
                      className="relative rounded-xl overflow-hidden border border-slate-800 bg-slate-950 group cursor-pointer aspect-video flex items-center justify-center"
                    >
                      <img 
                        src={photoUrl} 
                        alt="Avviksfoto" 
                        className="w-full h-full object-cover transition-transform group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white font-bold text-xs gap-1.5">
                        <Maximize2 size={16} />
                        Klikk for å forstørre
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-slate-800 bg-slate-950 p-6 text-center">
                      <Camera size={24} className="mx-auto text-slate-600 mb-2" />
                      <p className="text-xs text-slate-400">Ingen bilde vedlagt ved registrering.</p>
                    </div>
                  )}
                </div>

                {/* Resolved Photo (Etter utbedring) */}
                <div>
                  <span className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">
                    Dokumentasjon etter utbedring:
                  </span>
                  {resolvedPhotoUrl ? (
                    <div className="relative rounded-xl overflow-hidden border border-emerald-800/40 bg-emerald-950/20 aspect-video flex items-center justify-center group">
                      <img 
                        src={resolvedPhotoUrl} 
                        alt="Utbedret bilde" 
                        className="w-full h-full object-cover"
                      />
                      <label className="absolute bottom-2 right-2 px-2 py-1 bg-slate-900/90 border border-slate-700 backdrop-blur-sm text-[10px] font-bold text-white rounded-lg shadow cursor-pointer hover:bg-slate-800">
                        Endre bilde
                        <input type="file" accept="image/*" onChange={handleResolvedPhotoUpload} className="hidden" />
                      </label>
                    </div>
                  ) : (
                    <label className="rounded-xl border-2 border-dashed border-slate-800 hover:border-emerald-500 bg-slate-950 hover:bg-emerald-950/20 p-6 text-center cursor-pointer transition-all block aspect-video flex flex-col items-center justify-center">
                      <Camera size={24} className="mx-auto text-slate-600 group-hover:text-emerald-400 mb-1" />
                      <p className="text-xs font-bold text-slate-300">Last opp bilde etter utbedring</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">Vis at feilen er rettet fagmessig</p>
                      <input type="file" accept="image/*" onChange={handleResolvedPhotoUpload} className="hidden" />
                    </label>
                  )}
                </div>
              </div>
            </div>

            {/* Corrective Measures & AI Recommendation */}
            <div className="bg-[#131722] p-5 rounded-2xl border border-slate-800 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                  <Wrench size={14} />
                  Korrigerende Tiltak & Faglig Utbedring
                </h4>

                <button
                  type="button"
                  onClick={handleFetchAiRemedy}
                  disabled={isLoadingAi}
                  className="px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 w-fit"
                >
                  {isLoadingAi ? (
                    <><Loader2 size={12} className="animate-spin" /> Analyserer TEK17...</>
                  ) : (
                    <><Sparkles size={12} /> Hent AI-tiltaksforslag (TEK17)</>
                  )}
                </button>
              </div>

              {/* AI Remedy Box if loaded */}
              {aiSuggestion && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 rounded-xl bg-teal-950/30 border border-teal-800/50 text-teal-200 space-y-2.5 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold flex items-center gap-1 text-teal-300">
                      <Sparkles size={14} className="text-teal-400" />
                      Faglig anbefaling ({aiSuggestion.tek17Ref || 'TEK17'})
                    </span>
                    <button
                      type="button"
                      onClick={handleApplyAiAction}
                      className="px-2.5 py-1 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1 transition-colors"
                    >
                      <Check size={10} />
                      Bruk som tiltak
                    </button>
                  </div>

                  <p className="leading-relaxed font-medium text-slate-200">
                    {aiSuggestion.recommendedAction}
                  </p>

                  {aiSuggestion.preventiveAction && (
                    <div className="pt-2 border-t border-teal-800/40 text-[11px] text-teal-300">
                      <span className="font-bold">Forebyggende tiltak: </span>
                      {aiSuggestion.preventiveAction}
                    </div>
                  )}

                  {aiSuggestion.requiredMaterials && aiSuggestion.requiredMaterials.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {aiSuggestion.requiredMaterials.map((mat, i) => (
                        <span key={i} className="px-2 py-0.5 bg-slate-900 text-teal-300 rounded-md border border-teal-800/50 text-[10px] font-bold">
                          {mat}
                        </span>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}

              {/* Action Text Area */}
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">
                  Beskrivelse av utført tiltak
                </label>
                <textarea
                  value={actionText}
                  onChange={(e) => setActionText(e.target.value)}
                  rows={4}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs font-medium focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-white placeholder:text-slate-600 leading-relaxed"
                  placeholder="Beskriv hvilke tiltak som er gjort eller planlagt for å lukke avviket..."
                />
              </div>
            </div>

          </div>

          {/* Modal Footer */}
          <div className="p-4 sm:p-6 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-[#131722] shrink-0">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleDownloadPDF}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
                title="Last ned offisiell avviksrapport (PDF)"
              >
                <Download size={14} />
                <span>Last ned PDF</span>
              </button>

              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="p-2.5 text-rose-400 hover:bg-rose-950/30 rounded-xl transition-colors"
                title="Slett avvik"
              >
                {isDeleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-colors"
              >
                Lukk
              </button>

              <button
                type="button"
                disabled={isSaving}
                onClick={handleSaveDetails}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-emerald-900/30 disabled:opacity-50"
              >
                {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                <span>Lagre endringer</span>
              </button>
            </div>
          </div>
        </motion.div>

        {/* Lightbox / Zoomed Image Overlay */}
        <AnimatePresence>
          {isImageZoomed && photoUrl && (
            <div 
              onClick={() => setIsImageZoomed(false)}
              className="fixed inset-0 z-60 bg-black/90 flex items-center justify-center p-4 cursor-zoom-out"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="relative max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl"
              >
                <img 
                  src={photoUrl} 
                  alt="Forstørret avviksfoto" 
                  className="max-w-full max-h-[85vh] object-contain mx-auto rounded-xl"
                />
                <button 
                  onClick={() => setIsImageZoomed(false)}
                  className="absolute top-3 right-3 p-2 bg-black/60 text-white rounded-full hover:bg-black/80 transition-colors"
                >
                  <X size={20} />
                </button>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </AnimatePresence>
  );
}
