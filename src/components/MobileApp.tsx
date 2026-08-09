import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Camera, 
  Mic, 
  AlertTriangle, 
  CheckCircle2, 
  X, 
  Zap, 
  HardHat, 
  ChevronRight,
  Loader2,
  FileText,
  ShieldCheck,
  MapPin,
  Upload,
  RefreshCw,
  Info,
  Languages,
  Download,
  ListChecks,
  GraduationCap,
  Cloud
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { generateAiContent } from '../services/aiClient';
import { ImageAnalysisResult, Project as ProjectType, UserProfile, Trade } from '../types';
import InstallGuide from './InstallGuide';
import ChecklistModal from './ChecklistModal';
import ProjectActivityLog from './ProjectActivityLog';
import { useTranslation } from 'react-i18next';
import UniversalTranslator from './UniversalTranslator';
import { db, auth, collection, onSnapshot, addDoc, Timestamp, handleFirestoreError, OperationType, query, orderBy, limit, where, updateDoc, doc, getUserProfile, updateUserProfile, serverTimestamp } from '../services/firebase';

import { weatherService, WeatherData } from '../services/weatherService';
import { logAiService } from '../services/logAiService';
import { locationService } from '../services/locationService';
import { Sparkles, ClipboardList } from 'lucide-react';

// AI Services
async function analyzeVoice(text: string, uiLanguage: string = 'no', trade?: Trade, weather?: WeatherData) {
  const tradeContext = trade ? `Håndverkeren er en ${trade}. ` : '';
  const weatherContext = weather ? `
    VÆRFORHOLD PÅ PLASSEN:
    Temperatur: ${weather.temp}°C, Tilstand: ${weather.condition}, Vind: ${weather.windSpeed} m/s.
    Vurder hvordan dette påvirker sikkerheten for oppgaven.
  ` : '';

  try {
    const response = await generateAiContent({
      prompt: `Du er en ekspert på norsk HMS og SJA (Sikker Jobb Analyse) i henhold til TEK17 og SAK10. 
      ${tradeContext}${weatherContext}Håndverkeren har sagt følgende (kan være på et hvilket som helst europeisk språk): "${text}".
      
      OPPGAVE:
      1. Identifiser språket som er brukt.
      2. Generer en komplett, profesjonell SJA-rapport på NORSK (bokmål) for dokumentasjon.
      3. Generer også en versjon av de viktigste punktene på språket til brukeren (${uiLanguage}) slik at de forstår hva som er logget.
      
      JSON-strukturen skal være: 
      {
        "tittel": "string (NORSK)",
        "arbeidsoppgave": "string (NORSK)",
        "risikoer": [{"aktivitet": "string (NORSK)", "risiko": "string (NORSK)", "tiltak": "string (NORSK)"}],
        "utstyr": ["string (NORSK)"],
        "tek17_referanse": "string (NORSK)",
        "weather_impact": "string (NORSK - hvordan været påvirker oppgaven)",
        "user_feedback": {
          "tittel": "string (${uiLanguage})",
          "hovedrisiko": "string (${uiLanguage})"
        }
      }
      Svar KUN med JSON.`,
      responseMimeType: "application/json"
    });
    return JSON.parse(response.text);
  } catch (e) {
    console.error(e);
    return null;
  }
}

async function analyzeImage(base64Image: string, trade?: Trade): Promise<ImageAnalysisResult | null> {
  const tradeContext = trade ? `Håndverkeren er en ${trade}. ` : '';
  try {
    const response = await generateAiContent({
      prompt: `Du er en ekspert på byggeteknisk kontroll i Norge (KS/HMS). 
      ${tradeContext}Analyser dette bildet fra en byggeplass. Identifiser bygningselementer (f.eks. dampsperre, kledning, isolasjon, stenderverk).
      Vurder om det er utført i henhold til god byggeskikk eller om det er avvik.
      Svar i JSON-format:
      {
        "elements": ["string"],
        "status": "approved" | "deviation",
        "description": "string",
        "confidence": number (0-1),
        "recommendation": "string"
      }
      Svar KUN med JSON.`,
      inlineData: { data: base64Image.split(',')[1], mimeType: "image/jpeg" },
      responseMimeType: "application/json"
    });
    return JSON.parse(response.text);
  } catch (e) {
    console.error(e);
    return null;
  }
}

export default function MobileApp() {
  const { t, i18n } = useTranslation();
  const [activeScreen, setActiveScreen] = useState<'home' | 'camera' | 'voice' | 'report' | 'imageResult' | 'translator' | 'laerling' | 'dailyLog' | 'activity'>('home');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [dailyLog, setDailyLog] = useState<any>(null);
  const [currentReportId, setCurrentReportId] = useState<string | null>(null);
  const [report, setReport] = useState<any>(null);
  const [imageAnalysis, setImageAnalysis] = useState<ImageAnalysisResult | null>(null);
  const [transcript, setTranscript] = useState("");
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [projects, setProjects] = useState<ProjectType[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [recentEvents, setRecentEvents] = useState<any[]>([]);
  const [showInstallGuide, setShowInstallGuide] = useState(false);
  const [showChecklistModal, setShowChecklistModal] = useState(false);
  const [checklistProjectId, setChecklistProjectId] = useState<string | undefined>(undefined);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [showTradeSelector, setShowTradeSelector] = useState(false);
  const [smartAction, setSmartAction] = useState<{
    id: string;
    label: string;
    icon: React.ReactNode;
    color: string;
    description: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch user profile
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        const profile = await getUserProfile(user.uid);
        if (profile) {
          setUserProfile(profile);
        } else {
          // Create a basic profile if it doesn't exist
          const newProfile: UserProfile = {
            id: user.uid,
            name: user.displayName || 'Anonym',
            email: user.email || '',
            role: 'worker',
            companyId: 'demo-company',
            companyName: 'Demo Entreprenør AS'
          };
          await updateUserProfile(user.uid, newProfile);
          setUserProfile(newProfile);
          setShowTradeSelector(true);
        }
      } else {
        setUserProfile(null);
      }
    });
    return () => unsubscribe();
  }, []);

  // Contextual Smart Action Logic
  useEffect(() => {
    const hour = new Date().getHours();
    
    if (hour >= 6 && hour < 9) {
      setSmartAction({
        id: 'voice',
        label: 'Start SJA',
        icon: <Mic size={24} />,
        color: 'bg-emerald-600',
        description: 'God morgen! Klar for dagens første SJA?'
      });
    } else if (hour >= 9 && hour < 15) {
      setSmartAction({
        id: 'camera',
        label: 'AI Kontroll',
        icon: <Camera size={24} />,
        color: 'bg-neutral-900',
        description: 'Tid for en rask KS-sjekk med AI?'
      });
    } else {
      setSmartAction({
        id: 'deviation',
        label: 'Logg Avvik',
        icon: <AlertTriangle size={24} />,
        color: 'bg-orange-600',
        description: 'Noe som ikke stemmer? Logg et raskt avvik.'
      });
    }
  }, [activeScreen]);

  // Fetch projects
  useEffect(() => {
    const q = query(collection(db, 'projects'), orderBy('name'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const projectsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ProjectType[];
      setProjects(projectsData);
      if (projectsData.length > 0 && !selectedProjectId) {
        setSelectedProjectId(projectsData[0].id);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'projects');
    });
    return () => unsubscribe();
  }, []);

  // Fetch recent events (SJA and Deviations)
  useEffect(() => {
    if (!selectedProjectId) return;

    // This is a bit complex for a single snapshot, so we'll just fetch SJA reports for now
    // In a real app, we might use a cloud function or aggregate collection
    const q = query(
      collection(db, 'sja_reports'), 
      where('projectId', '==', selectedProjectId),
      orderBy('createdAt', 'desc'),
      limit(5)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const events = snapshot.docs.map(doc => ({
        id: doc.id,
        title: `SJA: ${doc.data().title}`,
        time: doc.data().createdAt?.toDate()?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) || 'Nå',
        type: 'HMS'
      }));
      setRecentEvents(events);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'sja_reports');
    });

    return () => unsubscribe();
  }, [selectedProjectId]);

  const handleVoiceSubmit = async () => {
    if (!transcript || !selectedProjectId) return;
    setIsAnalyzing(true);
    
    // Fetch weather for the project
    let weather: WeatherData | undefined;
    const project = projects.find(p => p.id === selectedProjectId);
    if (project) {
      try {
        weather = await weatherService.getWeather(project.location);
      } catch (e) {
        console.error("Failed to fetch weather for SJA", e);
      }
    }

    const result = await analyzeVoice(transcript, i18n.language, userProfile?.trade, weather);
    setIsAnalyzing(false);
    if (result) {
      setReport(result);
      setActiveScreen('report');
      
      // Save to Firestore
      try {
        const docRef = await addDoc(collection(db, 'sja_reports'), {
          projectId: selectedProjectId,
          title: result.tittel,
          task: result.arbeidsoppgave,
          risikoer: result.risikoer,
          utstyr: result.utstyr,
          tek17Reference: result.tek17_referanse,
          weatherImpact: result.weather_impact,
          authorId: auth.currentUser?.uid,
          authorName: auth.currentUser?.displayName || 'Anonym',
          createdAt: Timestamp.now(),
          status: 'draft'
        });
        setCurrentReportId(docRef.id);
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, 'sja_reports');
      }
    }
  };

  const handleGenerateDailyLog = async () => {
    if (!selectedProjectId) return;
    setIsAnalyzing(true);
    try {
      // In a real app, we'd fetch actual time entries and deviations for the day.
      // For this demo, we'll simulate some data.
      const project = projects.find(p => p.id === selectedProjectId);
      const weather = await weatherService.getWeather(project?.location || 'Oslo');
      
      const timeEntries = [
        { userName: 'Ola Nordmann', hours: 7.5, description: 'Gipsing av vegger' },
        { userName: 'Per Person', hours: 8, description: 'Montering av stenderverk' }
      ] as any;
      
      const deviations = [
        { title: 'Forsinket leveranse', severity: 'medium' }
      ] as any;

      const log = await logAiService.generateDailyLog(timeEntries, deviations, weather.description);
      setDailyLog(log);
      setActiveScreen('dailyLog');
    } catch (error) {
      console.error("Failed to generate daily log:", error);
    } finally {
      setIsAnalyzing(false);
    }
  };
  const handleApproveReport = async () => {
    if (!currentReportId) return;
    try {
      await updateDoc(doc(db, 'sja_reports', currentReportId), {
        status: 'approved'
      });
      setActiveScreen('home');
      setCurrentReportId(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `sja_reports/${currentReportId}`);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setPreviewImage(base64);
        startImageAnalysis(base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const startImageAnalysis = async (base64: string) => {
    if (!selectedProjectId) return;
    setIsAnalyzing(true);
    setActiveScreen('camera');
    const result = await analyzeImage(base64, userProfile?.trade);
    setIsAnalyzing(false);
    if (result) {
      setImageAnalysis(result);
      setActiveScreen('imageResult');

      // Save analysis result to project_photos
      try {
        let locationData = {};
        
        // Try to get current location
        if ("geolocation" in navigator) {
          try {
            const position = await new Promise<GeolocationPosition>((resolve, reject) => {
              navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
            });
            const addrInfo = await locationService.getAddressFromCoords(
              position.coords.latitude, 
              position.coords.longitude
            );
            if (addrInfo) {
              locationData = {
                location: addrInfo.fullAddress,
                gnr: addrInfo.gnr || '',
                bnr: addrInfo.bnr || ''
              };
            }
          } catch (geoError) {
            console.warn("Geolocation failed:", geoError);
          }
        }

        // Save to project_photos
        await addDoc(collection(db, 'project_photos'), {
          projectId: selectedProjectId,
          url: base64,
          timestamp: serverTimestamp(),
          analysis: result,
          createdBy: auth.currentUser?.uid,
          ...locationData
        });

        // Save as deviation if status is 'deviation'
        if (result.status === 'deviation') {
          await addDoc(collection(db, 'deviations'), {
            projectId: selectedProjectId,
            title: `AI-avvik: ${result.elements.join(', ')}`,
            description: result.description,
            severity: 'medium',
            status: 'open',
            authorId: auth.currentUser?.uid,
            authorName: auth.currentUser?.displayName || 'AI-Vision',
            reportedBy: auth.currentUser?.displayName || 'AI-Vision',
            createdAt: new Date().toISOString(),
            timestamp: Timestamp.now(),
            imageUrl: base64,
            ...locationData
          });
        }
      } catch (error) {
        console.error("Error saving analysis:", error);
      }
    }
  };

  return (
    <div className="flex items-center justify-center py-0 sm:py-12 bg-neutral-100 min-h-screen sm:min-h-[80vh]">
      {/* Phone Frame */}
      <div className="relative w-full sm:w-[320px] h-screen sm:h-[640px] bg-white sm:bg-neutral-900 sm:rounded-[3rem] sm:border-[8px] border-neutral-800 shadow-2xl overflow-hidden">
        {/* Notch */}
        <div className="hidden sm:block absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-neutral-800 rounded-b-2xl z-20"></div>
        
        {/* Screen Content */}
        <div className="relative h-full bg-white overflow-y-auto pt-4 sm:pt-8 pb-20 px-4 sm:px-6">
          <AnimatePresence mode="wait">
            {activeScreen === 'home' && (
              <motion.div 
                key="home"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-8"
              >
                <div className="flex justify-between items-center">
                  <div className="flex-1 mr-2">
                    <div className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400">{t('project')}</div>
                    <select 
                      value={selectedProjectId}
                      onChange={(e) => setSelectedProjectId(e.target.value)}
                      className="text-sm font-bold bg-transparent border-none p-0 focus:ring-0 w-full truncate"
                    >
                      {projects.length > 0 ? (
                        projects.map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))
                      ) : (
                        <option value="">{t('loading_projects')}</option>
                      )}
                    </select>
                  </div>
                  <div className="w-10 h-10 bg-neutral-100 rounded-full flex items-center justify-center shrink-0">
                    <MapPin size={18} className="text-neutral-400" />
                  </div>
                </div>

                <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                  <div className="flex items-center gap-3 mb-2">
                    <ShieldCheck size={20} className="text-emerald-600" />
                    <span className="text-sm font-bold text-emerald-900">{t('hms_status')}: OK</span>
                  </div>
                  <p className="text-[10px] text-emerald-700 leading-relaxed">
                    {t('ai_monitoring_active')}
                  </p>
                </div>

                {/* Quick Buttons */}
                <div className="grid grid-cols-2 gap-4">
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="flex flex-col items-center justify-center p-6 bg-neutral-900 text-white rounded-[2rem] gap-3 active:scale-95 transition-all shadow-lg shadow-neutral-200"
                  >
                    <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center">
                      <Camera size={24} />
                    </div>
                    <span className="text-xs font-bold uppercase tracking-widest">{t('image')}</span>
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      className="hidden" 
                      accept="image/*" 
                      onChange={handleImageUpload}
                    />
                  </button>
                  <button 
                    onClick={() => setActiveScreen('voice')}
                    className="flex flex-col items-center justify-center p-6 bg-emerald-600 text-white rounded-[2rem] gap-3 active:scale-95 transition-all shadow-lg shadow-emerald-100"
                  >
                    <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center">
                      <Mic size={24} />
                    </div>
                    <span className="text-xs font-bold uppercase tracking-widest">{t('voice')}</span>
                  </button>
                  <button 
                    onClick={() => setActiveScreen('translator')}
                    className="flex flex-col items-center justify-center p-6 bg-blue-600 text-white rounded-[2rem] gap-3 active:scale-95 transition-all shadow-lg shadow-blue-100"
                  >
                    <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center">
                      <Languages size={24} />
                    </div>
                    <span className="text-xs font-bold uppercase tracking-widest">{t('translator')}</span>
                  </button>
                  <button 
                    onClick={() => setActiveScreen('laerling')}
                    className="flex flex-col items-center justify-center p-6 bg-amber-500 text-white rounded-[2rem] gap-3 active:scale-95 transition-all shadow-lg shadow-amber-100"
                  >
                    <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center">
                      <GraduationCap size={24} />
                    </div>
                    <span className="text-xs font-bold uppercase tracking-widest">Lærling</span>
                  </button>
                  <button className="flex flex-col items-center justify-center p-6 bg-white border-2 border-neutral-100 text-neutral-900 rounded-[2rem] gap-3 active:scale-95 transition-all">
                    <div className="w-12 h-12 bg-neutral-50 rounded-2xl flex items-center justify-center">
                      <AlertTriangle size={24} className="text-amber-500" />
                    </div>
                    <span className="text-xs font-bold uppercase tracking-widest">{t('deviation')}</span>
                  </button>
                  <button className="flex flex-col items-center justify-center p-6 bg-white border-2 border-neutral-100 text-neutral-900 rounded-[2rem] gap-3 active:scale-95 transition-all">
                    <div className="w-12 h-12 bg-neutral-50 rounded-2xl flex items-center justify-center">
                      <FileText size={24} className="text-blue-500" />
                    </div>
                    <span className="text-xs font-bold uppercase tracking-widest">{t('sja')}</span>
                  </button>
                  <button 
                    onClick={handleGenerateDailyLog}
                    className="flex flex-col items-center justify-center p-6 bg-white border-2 border-neutral-100 text-neutral-900 rounded-[2rem] gap-3 active:scale-95 transition-all"
                  >
                    <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center">
                      <Sparkles size={24} className="text-indigo-600" />
                    </div>
                    <span className="text-xs font-bold uppercase tracking-widest">Dagsrapport</span>
                  </button>
                  <button 
                    onClick={() => setShowChecklistModal(true)}
                    className="flex flex-col items-center justify-center p-6 bg-white border-2 border-neutral-100 text-neutral-900 rounded-[2rem] gap-3 active:scale-95 transition-all"
                  >
                    <div className="w-12 h-12 bg-neutral-50 rounded-2xl flex items-center justify-center">
                      <ListChecks size={24} className="text-emerald-500" />
                    </div>
                    <span className="text-xs font-bold uppercase tracking-widest">{t('checklist')}</span>
                  </button>
                  <button 
                    onClick={() => setActiveScreen('activity')}
                    className="flex flex-col items-center justify-center p-6 bg-white border-2 border-neutral-100 text-neutral-900 rounded-[2rem] gap-3 active:scale-95 transition-all"
                  >
                    <div className="w-12 h-12 bg-neutral-50 rounded-2xl flex items-center justify-center">
                      <ListChecks size={24} className="text-neutral-500" />
                    </div>
                    <span className="text-xs font-bold uppercase tracking-widest">Prosjektlogg</span>
                  </button>
                </div>

                <div className="space-y-4">
                  <h3 className="text-xs font-black uppercase tracking-[0.2em] text-neutral-400">{t('recent_events')}</h3>
                  {recentEvents.length > 0 ? (
                    recentEvents.map((event, i) => (
                      <div key={i} className="flex items-center justify-between p-4 bg-neutral-50 rounded-2xl border border-neutral-100">
                        <div className="flex-1 mr-2">
                          <div className="text-xs font-bold truncate">{event.title}</div>
                          <div className="text-[10px] text-neutral-400">{event.time} • {event.type}</div>
                        </div>
                        <ChevronRight size={16} className="text-neutral-300 shrink-0" />
                      </div>
                    ))
                  ) : (
                    <div className="text-[10px] text-neutral-400 italic p-4 text-center">
                      {t('no_recent_events')}
                    </div>
                  )}
                </div>

                {/* Smart Contextual Action Button - Recipe 3: Hardware / Specialist Tool */}
                {smartAction && activeScreen === 'home' && (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="fixed bottom-24 left-4 right-4 sm:absolute sm:bottom-24 sm:left-6 sm:right-6 z-30"
                  >
                    <button 
                      onClick={() => {
                        if (smartAction.id === 'camera') fileInputRef.current?.click();
                        else setActiveScreen(smartAction.id as any);
                      }}
                      className={cn(
                        "w-full p-4 rounded-[2.5rem] flex items-center gap-4 shadow-2xl transition-all active:scale-95 group",
                        smartAction.color,
                        "text-white"
                      )}
                    >
                      <div className="w-14 h-14 bg-white/20 rounded-[1.5rem] flex items-center justify-center shrink-0 group-hover:rotate-6 transition-transform">
                        {smartAction.icon}
                      </div>
                      <div className="text-left">
                        <div className="text-[10px] font-black uppercase tracking-widest opacity-70 mb-1">Anbefalt Handling</div>
                        <div className="text-lg font-bold leading-tight">{smartAction.label}</div>
                        <div className="text-[10px] opacity-80 mt-1">{smartAction.description}</div>
                      </div>
                      <div className="ml-auto w-10 h-10 bg-white/10 rounded-full flex items-center justify-center">
                        <ChevronRight size={20} />
                      </div>
                    </button>
                  </motion.div>
                )}
              </motion.div>
            )}

            {activeScreen === 'camera' && (
              <motion.div 
                key="camera"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-full flex flex-col"
              >
                <div className="relative flex-grow bg-neutral-900 rounded-3xl overflow-hidden flex items-center justify-center">
                  {previewImage ? (
                    <img 
                      src={previewImage} 
                      alt="Preview" 
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="text-white text-center p-8">
                      <Loader2 className="animate-spin mx-auto mb-4" size={32} />
                      <p className="text-sm font-bold">{t('loading_image')}</p>
                    </div>
                  )}
                  
                  {isAnalyzing && (
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex flex-col items-center justify-center p-8 text-center">
                      <div className="w-24 h-24 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-6"></div>
                      <h3 className="text-white font-bold text-lg mb-2">{t('ai_vision_analysis')}</h3>
                      <p className="text-emerald-100 text-xs">{t('identifying_elements')}</p>
                    </div>
                  )}
                </div>
                <div className="py-6 flex justify-center">
                  <button onClick={() => setActiveScreen('home')} className="px-6 py-2 bg-neutral-100 rounded-xl text-xs font-bold">{t('cancel')}</button>
                </div>
              </motion.div>
            )}

            {activeScreen === 'imageResult' && imageAnalysis && (
              <motion.div 
                key="imageResult"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <div className="flex items-center gap-3 mb-4">
                  {imageAnalysis.status === 'approved' ? (
                    <CheckCircle2 size={24} className="text-emerald-600" />
                  ) : (
                    <AlertTriangle size={24} className="text-amber-500" />
                  )}
                  <h2 className="text-xl font-bold">
                    {imageAnalysis.status === 'approved' ? t('approved') : t('deviation_detected')}
                  </h2>
                </div>

                <div className="rounded-2xl overflow-hidden border border-neutral-100 mb-4">
                  <img src={previewImage!} alt="Analyzed" className="w-full h-32 object-cover" referrerPolicy="no-referrer" />
                </div>

                <div className="space-y-4">
                  <div className="p-4 bg-neutral-50 rounded-2xl border border-neutral-100">
                    <div className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-2">{t('detected_elements')}</div>
                    <div className="flex flex-wrap gap-2">
                      {imageAnalysis.elements.map((el, i) => (
                        <span key={i} className="px-2 py-1 bg-white border border-neutral-200 rounded text-[10px] font-bold">{el}</span>
                      ))}
                    </div>
                  </div>

                  <div className="p-4 bg-neutral-50 rounded-2xl border border-neutral-100">
                    <div className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-1">{t('description')}</div>
                    <p className="text-xs leading-relaxed">{imageAnalysis.description}</p>
                  </div>

                  {imageAnalysis.recommendation && (
                    <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100">
                      <div className="flex items-center gap-2 mb-1">
                        <Info size={14} className="text-amber-600" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-amber-700">{t('recommendation')}</span>
                      </div>
                      <p className="text-xs text-amber-800 leading-relaxed">{imageAnalysis.recommendation}</p>
                    </div>
                  )}
                </div>

                <div className="py-8 space-y-4">
                  <button 
                    onClick={() => setActiveScreen('home')}
                    className="w-full py-4 bg-neutral-900 text-white rounded-2xl font-bold"
                  >
                    {t('log_status_continue')}
                  </button>
                  <button onClick={() => setActiveScreen('camera')} className="w-full py-4 text-neutral-400 font-bold">{t('take_new_photo')}</button>
                </div>
              </motion.div>
            )}

            {activeScreen === 'voice' && (
              <motion.div 
                key="voice"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="h-full flex flex-col pt-12"
              >
                <div className="text-center mb-12">
                  <div className="w-24 h-24 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6 relative">
                    <motion.div 
                      animate={{ scale: [1, 1.5, 1] }}
                      transition={{ repeat: Infinity, duration: 2 }}
                      className="absolute inset-0 bg-emerald-400/20 rounded-full"
                    ></motion.div>
                    <Mic size={40} className="text-emerald-600 relative z-10" />
                  </div>
                  <h2 className="text-xl font-bold mb-2">{t('smart_sja_voice')}</h2>
                  <p className="text-xs text-neutral-400">{t('voice_desc')}</p>
                </div>

                <div className="flex-grow">
                  <textarea 
                    value={transcript}
                    onChange={(e) => setTranscript(e.target.value)}
                    placeholder={t('voice_placeholder')}
                    className="w-full h-40 p-4 bg-neutral-50 rounded-2xl border border-neutral-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>

                <div className="py-8 space-y-4">
                  <button 
                    onClick={handleVoiceSubmit}
                    disabled={isAnalyzing || !transcript}
                    className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isAnalyzing ? <Loader2 className="animate-spin" /> : <Zap size={18} />}
                    {isAnalyzing ? t('analyzing') : t('generate_sja_report')}
                  </button>
                  <button onClick={() => setActiveScreen('home')} className="w-full py-4 text-neutral-400 font-bold">{t('cancel')}</button>
                </div>
              </motion.div>
            )}

            {activeScreen === 'report' && report && (
              <motion.div 
                key="report"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-6"
              >
                <div className="flex items-center gap-3 text-emerald-600 mb-4">
                  <CheckCircle2 size={24} />
                  <h2 className="text-xl font-bold">{t('smart_sja_ready')}</h2>
                </div>

                {report.user_feedback && i18n.language !== 'no' && (
                  <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 mb-4">
                    <div className="text-[10px] font-black uppercase tracking-widest text-blue-700 mb-1">
                      {t('translate_to')} {i18n.language.toUpperCase()}
                    </div>
                    <div className="text-sm font-bold text-blue-900">{report.user_feedback.tittel}</div>
                    <p className="text-xs text-blue-800 mt-1">{report.user_feedback.hovedrisiko}</p>
                  </div>
                )}

                <div className="p-6 bg-neutral-900 text-white rounded-[2rem] space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                    <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">{t('norwegian_finalizer')}</span>
                  </div>
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-widest opacity-50 mb-1">{t('project_task')}</div>
                    <div className="text-sm font-bold">{report.tittel}</div>
                    <p className="text-[10px] text-emerald-400 mt-1">{report.tek17_referanse}</p>
                  </div>

                  {report.weather_impact && (
                    <div className="p-3 bg-blue-500/10 rounded-xl border border-blue-500/20">
                      <div className="flex items-center gap-2 mb-1">
                        <Cloud size={14} className="text-blue-400" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-blue-400">Værets påvirkning</span>
                      </div>
                      <p className="text-xs text-blue-100">{report.weather_impact}</p>
                    </div>
                  )}
                  
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-widest opacity-50 mb-2">{t('risks_measures')}</div>
                    <div className="space-y-3">
                      {report.risikoer.map((r: any, i: number) => (
                        <div key={i} className="p-3 bg-white/5 rounded-xl border border-white/10">
                          <div className="text-[10px] font-bold text-emerald-400 mb-1">{r.aktivitet}</div>
                          <div className="text-xs font-semibold mb-1">{r.risiko}</div>
                          <div className="text-[10px] opacity-70">Tiltak: {r.tiltak}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="text-[10px] font-black uppercase tracking-widest opacity-50 mb-2">{t('necessary_equipment')}</div>
                    <div className="flex flex-wrap gap-2">
                      {report.utstyr.map((u: string, i: number) => (
                        <span key={i} className="px-2 py-1 bg-white/10 rounded text-[10px] font-bold">{u}</span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="py-8 space-y-4">
                  <button 
                    onClick={handleApproveReport}
                    className="w-full py-4 bg-neutral-900 text-white rounded-2xl font-bold"
                  >
                    {t('approve_archive')}
                  </button>
                  <button 
                    onClick={() => setActiveScreen('home')}
                    className="w-full py-4 text-neutral-400 font-bold"
                  >
                    {t('cancel')}
                  </button>
                  <button onClick={() => setActiveScreen('voice')} className="w-full py-4 text-neutral-400 font-bold">{t('edit')}</button>
                </div>
              </motion.div>
            )}

            {activeScreen === 'dailyLog' && dailyLog && (
              <motion.div 
                key="dailyLog"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-6"
              >
                <div className="flex items-center gap-3 text-indigo-600 mb-4">
                  <ClipboardList size={24} />
                  <h2 className="text-xl font-bold">AI Dagsrapport</h2>
                </div>

                <div className="p-6 bg-neutral-900 text-white rounded-[2rem] space-y-6">
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-widest opacity-50 mb-1">Oppsummering</div>
                    <p className="text-sm leading-relaxed">{dailyLog.summary}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-white/5 rounded-xl border border-white/10">
                      <div className="text-[10px] font-bold text-indigo-400 mb-1">Totaltimer</div>
                      <div className="text-lg font-bold">{dailyLog.totalHours}t</div>
                    </div>
                    <div className="p-3 bg-white/5 rounded-xl border border-white/10">
                      <div className="text-[10px] font-bold text-indigo-400 mb-1">Fremdrift</div>
                      <div className="text-lg font-bold">{dailyLog.progress}%</div>
                    </div>
                  </div>

                  <div>
                    <div className="text-[10px] font-black uppercase tracking-widest opacity-50 mb-2">Viktige Hendelser</div>
                    <ul className="space-y-2">
                      {dailyLog.highlights.map((h: string, i: number) => (
                        <li key={i} className="text-xs flex items-start gap-2">
                          <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full mt-1.5 shrink-0" />
                          {h}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-4 bg-blue-500/10 rounded-2xl border border-blue-500/20">
                    <div className="text-[10px] font-black uppercase tracking-widest text-blue-400 mb-1">Værpåvirkning</div>
                    <p className="text-xs text-blue-100 italic">{dailyLog.weatherImpact}</p>
                  </div>
                </div>

                <div className="py-8 space-y-4">
                  <button 
                    onClick={() => setActiveScreen('home')}
                    className="w-full py-4 bg-neutral-900 text-white rounded-2xl font-bold"
                  >
                    Lagre og Send
                  </button>
                  <button 
                    onClick={() => setActiveScreen('home')}
                    className="w-full py-4 text-neutral-400 font-bold"
                  >
                    Avbryt
                  </button>
                </div>
              </motion.div>
            )}

            {activeScreen === 'activity' && (
              <motion.div 
                key="activity"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3 text-neutral-900">
                    <ListChecks size={24} />
                    <h2 className="text-xl font-bold">Prosjektlogg</h2>
                  </div>
                  <button onClick={() => setActiveScreen('home')} className="p-2 hover:bg-neutral-100 rounded-xl">
                    <X size={20} />
                  </button>
                </div>

                {selectedProjectId ? (
                  <ProjectActivityLog projectId={selectedProjectId} />
                ) : (
                  <div className="p-12 text-center space-y-4">
                    <div className="w-16 h-16 bg-neutral-50 rounded-full flex items-center justify-center mx-auto text-neutral-300">
                      <ListChecks size={32} />
                    </div>
                    <p className="text-sm text-neutral-500 font-medium">Velg et prosjekt for å se loggen</p>
                  </div>
                )}

                <div className="py-8">
                  <button 
                    onClick={() => setActiveScreen('home')}
                    className="w-full py-4 bg-neutral-900 text-white rounded-2xl font-bold"
                  >
                    Tilbake
                  </button>
                </div>
              </motion.div>
            )}

            {activeScreen === 'laerling' && (
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex flex-col h-full bg-white"
              >
                <div className="p-6 border-b border-neutral-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                      <GraduationCap size={20} />
                    </div>
                    <h2 className="text-lg font-bold">Lærling-dokumentasjon</h2>
                  </div>
                  <button onClick={() => setActiveScreen('home')} className="p-2 hover:bg-neutral-100 rounded-lg">
                    <X size={20} />
                  </button>
                </div>
                
                <div className="flex-1 p-6 space-y-6 overflow-y-auto">
                  <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100">
                    <p className="text-xs text-amber-800 font-medium">
                      Logg dagens arbeid for å dokumentere din kompetanseutvikling.
                    </p>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-2">Hva har du gjort i dag?</label>
                    <textarea 
                      placeholder="Beskriv arbeidsoppgavene dine..."
                      className="w-full bg-neutral-50 border-none rounded-2xl p-4 text-sm min-h-[120px] focus:ring-2 focus:ring-amber-500/20"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-2">Bildebevis</label>
                    <button className="w-full aspect-video bg-neutral-50 border-2 border-dashed border-neutral-200 rounded-2xl flex flex-col items-center justify-center gap-2 text-neutral-400 hover:bg-neutral-100 transition-colors">
                      <Camera size={32} />
                      <span className="text-xs font-bold">Ta bilde av arbeidet</span>
                    </button>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-2">Kompetansemål</label>
                    <select className="w-full bg-neutral-50 border-none rounded-2xl p-4 text-sm focus:ring-2 focus:ring-amber-500/20">
                      <option>Velg mål...</option>
                      <option>Montering av dampsperre</option>
                      <option>Isolering av yttervegg</option>
                      <option>Bruk av sagstasjon</option>
                    </select>
                  </div>
                </div>

                <div className="p-6 border-t border-neutral-100">
                  <button 
                    onClick={() => setActiveScreen('home')}
                    className="w-full py-4 bg-amber-600 text-white rounded-2xl font-bold shadow-lg shadow-amber-100 active:scale-95 transition-all"
                  >
                    Send til veileder
                  </button>
                </div>
              </motion.div>
            )}

            {activeScreen === 'translator' && (
              <motion.div 
                key="translator"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="h-full flex flex-col"
              >
                <div className="flex items-center justify-between mb-4">
                  <button 
                    onClick={() => setActiveScreen('home')}
                    className="p-2 hover:bg-neutral-100 rounded-full transition-colors"
                  >
                    <X size={20} className="text-neutral-400" />
                  </button>
                  <h2 className="text-sm font-bold uppercase tracking-widest">{t('translator')}</h2>
                  <div className="w-8"></div>
                </div>
                
                <div className="flex-1 min-h-0">
                  <UniversalTranslator 
                    className="h-full border-none shadow-none rounded-3xl" 
                    projectId={selectedProjectId || undefined}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Home Indicator */}
        <div className="hidden sm:block absolute bottom-2 left-1/2 -translate-x-1/2 w-32 h-1.5 bg-neutral-800 rounded-full z-20"></div>
        
        {/* Install Guide Modal Overlay */}
        {showInstallGuide && (
          <div className="absolute inset-0 z-50 bg-neutral-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              className="w-full max-h-[90%] overflow-y-auto"
            >
              <InstallGuide onClose={() => setShowInstallGuide(false)} />
            </motion.div>
          </div>
        )}

        {/* Checklist Modal */}
        <ChecklistModal 
          isOpen={showChecklistModal} 
          onClose={() => setShowChecklistModal(false)} 
          projectId={checklistProjectId}
          initialTrade={userProfile?.trade}
        />

        {/* Trade Selector Modal (First time) */}
        {showTradeSelector && (
          <div className="absolute inset-0 z-50 bg-neutral-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-3xl p-6 w-full max-w-xs shadow-2xl"
            >
              <h3 className="text-lg font-bold mb-4">{t('select_your_trade', 'Velg ditt fag')}</h3>
              <div className="grid grid-cols-2 gap-3">
                {(['carpenter', 'plumber', 'electrician', 'mason', 'painter', 'general'] as Trade[]).map((trade) => (
                  <button
                    key={trade}
                    onClick={async () => {
                      if (userProfile) {
                        const updated = { ...userProfile, trade };
                        await updateUserProfile(userProfile.id, { trade });
                        setUserProfile(updated);
                        setShowTradeSelector(false);
                      }
                    }}
                    className="p-3 bg-neutral-50 rounded-2xl border border-neutral-100 text-xs font-bold hover:bg-emerald-50 hover:border-emerald-100 transition-colors"
                  >
                    {t(`trade_${trade}`, trade.charAt(0).toUpperCase() + trade.slice(1))}
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </div>

      {/* Demo Instructions */}
      <div className="hidden lg:block ml-12 max-w-xs space-y-6">
        <div className="p-6 bg-white rounded-3xl border border-neutral-200 shadow-sm">
          <h3 className="font-bold mb-4 flex items-center gap-2">
            <Camera size={18} className="text-blue-600" />
            {t('ai_vision_test_title')}
          </h3>
          <p className="text-xs text-neutral-500 leading-relaxed mb-4">
            {t('ai_vision_test_desc1')}
          </p>
          <p className="text-xs text-neutral-500 leading-relaxed">
            {t('ai_vision_test_desc2')}
          </p>
        </div>
        
        <div className="p-6 bg-white rounded-3xl border border-neutral-200 shadow-sm">
          <h3 className="font-bold mb-4 flex items-center gap-2">
            <Mic size={18} className="text-emerald-600" />
            {t('smart_sja_test_title')}
          </h3>
          <p className="text-xs text-neutral-500 leading-relaxed mb-4">
            {t('smart_sja_test_desc1')}
          </p>
          <p className="text-xs text-neutral-500 leading-relaxed">
            {t('smart_sja_test_desc2')}
          </p>
        </div>

        <div className="p-6 bg-white rounded-3xl border border-neutral-200 shadow-sm">
          <h3 className="font-bold mb-4 flex items-center gap-2">
            <Languages size={18} className="text-blue-600" />
            {t('realtime_translation')}
          </h3>
          <p className="text-xs text-neutral-500 leading-relaxed mb-4">
            {t('translator_test_desc1', 'Skriv på polsk, litauisk eller engelsk.')}
          </p>
          <p className="text-xs text-neutral-500 leading-relaxed">
            {t('translator_test_desc2', 'AI-en oversetter til ditt valgte språk og lager en profesjonell norsk versjon for dokumentasjon.')}
          </p>
        </div>
      </div>
    </div>
  );
}
