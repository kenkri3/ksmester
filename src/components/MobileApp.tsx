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
  Cloud,
  Smartphone,
  Phone,
  PhoneCall,
  MessageSquare,
  Mail,
  Search,
  Plus,
  Users,
  ArrowLeft,
  Siren
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { optimizeImageForVision } from '@/src/lib/imageOptimizer';
import { sjaService } from '../services/sjaService';
import { visionService } from '../services/visionService';
import { ImageAnalysisResult, Project as ProjectType, UserProfile, Trade } from '../types';
import InstallGuide from './InstallGuide';
import ChecklistModal from './ChecklistModal';
import CreateDeviationModal from './CreateDeviationModal';
import ProjectActivityLog from './ProjectActivityLog';
import { toast } from 'sonner';
import { promptPWAInstall, isPWAInstalled, triggerAppDownloadOrInstall, downloadMobileShortcut } from '../lib/pwa';
import { useTranslation } from 'react-i18next';
import UniversalTranslator from './UniversalTranslator';
import { db, auth, collection, onSnapshot, addDoc, Timestamp, handleFirestoreError, OperationType, query, orderBy, limit, where, updateDoc, doc, getUserProfile, updateUserProfile, serverTimestamp, getDocs } from '../services/firebase';
import { weatherService, WeatherData } from '../services/weatherService';
import WeatherWidget from './WeatherWidget';
import { logAiService } from '../services/logAiService';
import { locationService } from '../services/locationService';
import { Sparkles, ClipboardList } from 'lucide-react';
import { api } from '../services/api';

export interface ColleagueContact {
  id: string;
  name: string;
  role: string;
  company: string;
  trade?: Trade | string;
  phone: string;
  email?: string;
  isOnSiteToday?: boolean;
  isKeyPersonnel?: boolean;
  projectId?: string;
}

const DEFAULT_COLLEAGUES: ColleagueContact[] = [
  {
    id: 'contact_1',
    name: 'Kari Nordmann (Prosjektleder)',
    role: 'Prosjektleder / Faglig leder',
    company: 'VikingMester AS',
    trade: 'carpenter',
    phone: '920 11 222',
    email: 'prosjekt@vikingmester.no',
    isOnSiteToday: true,
    isKeyPersonnel: true
  },
  {
    id: 'contact_2',
    name: 'Ola Hansen (Bas & Verneombud)',
    role: 'Byggeplassleder / Verneombud',
    company: 'VikingMester AS',
    trade: 'carpenter',
    phone: '930 22 333',
    email: 'hms@vikingmester.no',
    isOnSiteToday: true,
    isKeyPersonnel: true
  },
  {
    id: 'contact_3',
    name: 'Per Olsen (Tømrer bas)',
    role: 'Tømrer / Montør',
    company: 'VikingMester AS',
    trade: 'carpenter',
    phone: '940 33 444',
    email: 'per@vikingmester.no',
    isOnSiteToday: true,
    isKeyPersonnel: false
  },
  {
    id: 'contact_4',
    name: 'Eirik Berg (Elektroansvarlig)',
    role: 'Elektriker / Installatør',
    company: 'Partner Elektro AS',
    trade: 'electrician',
    phone: '950 44 555',
    email: 'elektro@vikingmester.no',
    isOnSiteToday: false,
    isKeyPersonnel: true
  },
  {
    id: 'contact_5',
    name: 'Marius Lien (Rørlegger bas)',
    role: 'VVS / Rørlegger bas',
    company: 'Partner VVS AS',
    trade: 'plumber',
    phone: '960 55 666',
    email: 'vvs@vikingmester.no',
    isOnSiteToday: true,
    isKeyPersonnel: false
  }
];

interface MobileAppProps {
  initialScreen?: 'home' | 'camera' | 'voice' | 'report' | 'imageResult' | 'translator' | 'laerling' | 'dailyLog' | 'activity' | 'contacts';
  onScreenChange?: (screen: 'home' | 'camera' | 'voice' | 'report' | 'imageResult' | 'translator' | 'laerling' | 'dailyLog' | 'activity' | 'contacts') => void;
}

export default function MobileApp({ initialScreen, onScreenChange }: MobileAppProps = {}) {
  const { t, i18n } = useTranslation();
  const [activeScreen, setActiveScreen] = useState<'home' | 'camera' | 'voice' | 'report' | 'imageResult' | 'translator' | 'laerling' | 'dailyLog' | 'activity' | 'contacts'>(initialScreen || 'home');

  useEffect(() => {
    if (initialScreen) {
      setActiveScreen(initialScreen);
    }
  }, [initialScreen]);

  const handleScreenChange = (screen: 'home' | 'camera' | 'voice' | 'report' | 'imageResult' | 'translator' | 'laerling' | 'dailyLog' | 'activity' | 'contacts') => {
    setActiveScreen(screen);
    onScreenChange?.(screen);
  };
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [dailyLog, setDailyLog] = useState<any>(null);
  const [currentReportId, setCurrentReportId] = useState<string | null>(null);
  const [report, setReport] = useState<any>(null);
  const [imageAnalysis, setImageAnalysis] = useState<ImageAnalysisResult | null>(null);
  const [transcript, setTranscript] = useState("");
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [projects, setProjects] = useState<ProjectType[]>([
    {
      id: 'proj_default_1',
      name: 'Hovedprosjekt (Byggeplass Oslo)',
      location: 'Oslo',
      status: 'active',
      description: 'Aktivt standardprosjekt'
    } as any
  ]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("proj_default_1");
  const [recentEvents, setRecentEvents] = useState<any[]>([]);
  const [showInstallGuide, setShowInstallGuide] = useState(false);
  const handleInstallApp = async () => {
    if (isPWAInstalled()) {
      toast.info('VikingMester er allerede installert som app på denne enheten!');
      return;
    }
    await triggerAppDownloadOrInstall({
      onInstalled: () => toast.info('VikingMester er allerede installert som app på denne enheten!'),
      onAccepted: () => toast.success('Laster ned og installerer VikingMester på telefonen...'),
      onFallback: () => {
        setShowInstallGuide(true);
      }
    });
  };
  const [showChecklistModal, setShowChecklistModal] = useState(false);
  const [showDeviationModal, setShowDeviationModal] = useState(false);
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
  // FIX (11.09.2026): Lar brukeren lukke forslagsboblen for resten av økten i stedet for
  // at den blokkerer skjermen uten mulighet til å fjerne den.
  const [smartActionDismissed, setSmartActionDismissed] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const apprenticeFileInputRef = useRef<HTMLInputElement>(null);
  const [apprenticeImage, setApprenticeImage] = useState<string | null>(null);
  // --- Telefonliste & Kolleger State ---
  const [colleagues, setColleagues] = useState<ColleagueContact[]>(DEFAULT_COLLEAGUES);
  const [contactsSearch, setContactsSearch] = useState('');
  const [contactsFilter, setContactsFilter] = useState<'all' | 'onsite' | 'key' | 'emergency'>('all');
  const [showAddContactModal, setShowAddContactModal] = useState(false);
  const [newContact, setNewContact] = useState({
    name: '',
    role: 'Tømrer',
    company: '',
    phone: '',
    email: '',
    trade: 'carpenter' as Trade,
    isOnSiteToday: true
  });
  // Hent team og kolleger fra PostgreSQL API og Firestore
  useEffect(() => {
    async function loadTeamMembers() {
      try {
        const users = await api.getDocs<any>('users');
        if (users && users.length > 0) {
          const fetched: ColleagueContact[] = users.map((u: any) => ({
            id: u.id,
            name: u.name || u.displayName || u.email?.split('@')[0] || 'Kollega',
            role: u.role === 'admin' ? 'Prosjektleder' : u.role === 'manager' ? 'Byggeplassleder' : u.trade ? String(u.trade) : (u.role || 'Fagarbeider'),
            company: u.companyName || u.company || userProfile?.companyName || 'VikingMester AS',
            trade: u.trade || 'general',
            phone: u.phone || '900 00 000',
            email: u.email || '',
            isOnSiteToday: u.isOnSiteToday ?? true,
            isKeyPersonnel: u.isKeyPersonnel ?? (u.role === 'admin' || u.role === 'manager')
          }));
          setColleagues(prev => {
            const ids = new Set(fetched.map(f => f.id));
            const remainingDefaults = prev.filter(d => !ids.has(d.id));
            return [...fetched, ...remainingDefaults];
          });
          return;
        }

        const usersRef = collection(db, 'users');
        const q = userProfile?.companyId 
          ? query(usersRef, where('companyId', '==', userProfile.companyId))
          : query(usersRef, limit(100));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const fetched: ColleagueContact[] = snap.docs.map(doc => {
            const d = doc.data();
            return {
              id: doc.id,
              name: d.name || d.displayName || d.email?.split('@')[0] || 'Kollega',
              role: d.role === 'admin' ? 'Prosjektleder' : d.role === 'manager' ? 'Byggeplassleder' : d.trade ? String(d.trade) : 'Fagarbeider',
              company: d.companyName || userProfile?.companyName || 'VikingMester AS',
              trade: d.trade || 'general',
              phone: d.phone || '900 00 000',
              email: d.email || '',
              isOnSiteToday: true,
              isKeyPersonnel: d.role === 'admin' || d.role === 'manager'
            };
          });
          if (fetched.length > 0) {
            setColleagues(prev => {
              const ids = new Set(fetched.map(f => f.id));
              const remainingDefaults = prev.filter(d => !ids.has(d.id));
              return [...fetched, ...remainingDefaults];
            });
          }
        }
      } catch (err) {
        console.warn('Lokal telefonliste benyttes:', err);
      }
    }
    loadTeamMembers();
  }, [userProfile?.companyId]);
  // Lytt på åpning av telefonliste og mobile handlinger
  useEffect(() => {
    const handleOpenContacts = () => {
      handleScreenChange('contacts');
    };
    const handleAction = (e: any) => {
      const actionId = e.detail?.actionId;
      if (!actionId) return;
      if (actionId === 'log_deviation') {
        setShowDeviationModal(true);
      } else if (actionId === 'take_photo') {
        handleScreenChange('camera');
      } else if (actionId === 'voice_sja') {
        handleScreenChange('voice');
      } else if (actionId === 'start_checklist') {
        setShowChecklistModal(true);
      } else if (actionId === 'contacts') {
        handleScreenChange('contacts');
      } else if (actionId === 'laerling') {
        handleScreenChange('laerling');
      } else if (actionId === 'translator') {
        handleScreenChange('translator');
      } else if (actionId === 'activity') {
        handleScreenChange('activity');
      }
    };

    window.addEventListener('open_mobile_contacts', handleOpenContacts);
    window.addEventListener('trigger_dashboard_action', handleAction as EventListener);
    return () => {
      window.removeEventListener('open_mobile_contacts', handleOpenContacts);
      window.removeEventListener('trigger_dashboard_action', handleAction as EventListener);
    };
  }, []);
  const handleCreateContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContact.name.trim() || !newContact.phone.trim()) {
      toast.error('Vennligst fyll ut navn og telefonnummer');
      return;
    }
    const created: ColleagueContact = {
      id: 'contact_' + Date.now(),
      name: newContact.name.trim(),
      role: newContact.role.trim(),
      company: newContact.company.trim() || userProfile?.companyName || 'VikingMester AS',
      trade: newContact.trade,
      phone: newContact.phone.trim(),
      email: newContact.email.trim(),
      isOnSiteToday: newContact.isOnSiteToday,
      isKeyPersonnel: newContact.role.toLowerCase().includes('leder') || newContact.role.toLowerCase().includes('hms')
    };
    setColleagues(prev => [created, ...prev]);
    setShowAddContactModal(false);
    setNewContact({
      name: '',
      role: 'Tømrer',
      company: '',
      phone: '',
      email: '',
      trade: 'carpenter',
      isOnSiteToday: true
    });
    toast.success(created.name + ' er lagt til i telefonlisten!');
    try {
      await api.saveDoc('users', {
        id: created.id,
        name: created.name,
        role: created.role,
        trade: created.trade,
        phone: created.phone,
        email: created.email || '',
        companyId: userProfile?.companyId || 'vikingmester',
        companyName: created.company,
        isOnSiteToday: created.isOnSiteToday,
        isKeyPersonnel: created.isKeyPersonnel,
        createdAt: new Date().toISOString()
      });
      try {
        await addDoc(collection(db, 'users'), {
          name: created.name,
          role: 'worker',
          trade: created.trade,
          phone: created.phone,
          email: created.email || '',
          companyId: userProfile?.companyId || 'vikingmester',
          companyName: created.company,
          createdAt: serverTimestamp()
        });
      } catch {}
    } catch (e) {
      console.warn('Lagret kun i aktiv sesjon:', e);
    }
  };
  const emergencyContacts = [
    { title: 'Medisinsk Nødhjelp', number: '113', desc: 'Akutt ulykke / livstruende skade', color: 'bg-red-600', icon: '🚑' },
    { title: 'Brann & Redning', number: '110', desc: 'Brann, røykutvikling og redning', color: 'bg-orange-600', icon: '🚒' },
    { title: 'Politi', number: '112', desc: 'Politi og orden på byggeplass', color: 'bg-blue-600', icon: '👮' },
    { title: 'Giftinformasjonen', number: '22 59 13 00', desc: 'Kjemikaliesøl / akutt forgiftning', color: 'bg-amber-600', icon: '☣️' },
    { title: 'Arbeidstilsynet Vakt', number: '73 19 97 00', desc: 'Varsling av alvorlige arbeidsulykker', color: 'bg-purple-600', icon: '⚠️' }
  ];
  const filteredColleagues = colleagues.filter(c => {
    const term = contactsSearch.toLowerCase();
    const matchSearch = 
      c.name.toLowerCase().includes(term) ||
      c.role.toLowerCase().includes(term) ||
      c.company.toLowerCase().includes(term) ||
      c.phone.replace(/\s+/g, '').includes(term.replace(/\s+/g, ''));
    if (!matchSearch) return false;
    if (contactsFilter === 'onsite') return c.isOnSiteToday;
    if (contactsFilter === 'key') return c.isKeyPersonnel;
    return true;
  });
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
            name: user.displayName || user.email?.split('@')[0] || 'Bruker',
            email: user.email || '',
            role: 'worker',
            companyId: '',
            companyName: ''
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
  // FIX (11.09.2026): Boblen var fastlåst på skjermen (uten lukkeknapp) i 15 av 24 timer i
  // døgnet (15:00-06:00), inkludert sent på kvelden. Den er nå begrenset til et smalere,
  // arbeidsrelevant tidsvindu på ettermiddagen, og respekterer at brukeren har lukket den.
  useEffect(() => {
    if (smartActionDismissed) {
      setSmartAction(null);
      return;
    }
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
    } else if (hour >= 15 && hour < 19) {
      setSmartAction({
        id: 'deviation',
        label: 'Logg Avvik',
        icon: <AlertTriangle size={24} />,
        color: 'bg-orange-600',
        description: 'Noe som ikke stemmer? Logg et raskt avvik.'
      });
    } else {
      setSmartAction(null);
    }
  }, [activeScreen, smartActionDismissed]);
  // Fetch projects
  useEffect(() => {
    const q = query(collection(db, 'projects'), orderBy('name'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const projectsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ProjectType[];
      if (projectsData.length > 0) {
        setProjects(projectsData);
        setSelectedProjectId(prev => (prev && projectsData.some(p => p.id === prev) ? prev : projectsData[0].id));
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
        time: typeof doc.data().createdAt?.toDate === 'function' 
          ? doc.data().createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
          : (doc.data().createdAt ? new Date(doc.data().createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Nå'),
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
    const result = await sjaService.generateDraft(
      {
        name: project?.name || 'Byggeplass',
        description: project?.description,
        location: project?.location || 'Oslo'
      },
      transcript,
      weather,
      i18n.language
    );
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
      const project = projects.find(p => p.id === selectedProjectId);
      const weather = await weatherService.getWeather(project?.location || 'Oslo');
      
      const timesQ = query(collection(db, 'time_registrations'), where('projectId', '==', selectedProjectId));
      const timesSnap = await getDocs(timesQ);
      const timeEntries = timesSnap.docs.map(doc => doc.data());
      const devsQ = query(collection(db, 'deviations'), where('projectId', '==', selectedProjectId));
      const devsSnap = await getDocs(devsQ);
      const deviations = devsSnap.docs.map(doc => doc.data());
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
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        setIsAnalyzing(true);
        setActiveScreen('camera');
        const { base64, mimeType } = await optimizeImageForVision(file);
        setPreviewImage(base64);
        startImageAnalysis(base64, mimeType);
      } catch (err) {
        console.error('Mobile image optimization error:', err);
        setIsAnalyzing(false);
        toast.error('Kunne ikke laste opp bildet.');
      }
    }
  };
  const startImageAnalysis = async (base64: string, mimeType = 'image/jpeg') => {
    if (!selectedProjectId) {
      toast.error('Velg et prosjekt først');
      setIsAnalyzing(false);
      return;
    }
    setIsAnalyzing(true);
    setActiveScreen('camera');
    try {
      const result = await visionService.analyzeImage(base64, mimeType);
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
  } catch (error: any) {
    console.error("Image analysis error:", error);
    toast.error("Bildeanalyse feilet: " + (error?.message || "Ukjent feil"));
  } finally {
    setIsAnalyzing(false);
  }
};
  return (
    <div className="min-h-screen bg-slate-100 py-3 sm:py-6 px-2 sm:px-4">
      <div className="max-w-2xl mx-auto space-y-4">
        {/* Navigation & Header */}
        <div className="flex items-center justify-between bg-white px-4 py-3 rounded-2xl border border-slate-200/80 shadow-xs">
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('navigate_view', { detail: { view: 'dashboard' } }))}
            className="flex items-center gap-2 text-xs font-bold text-slate-700 hover:text-navy-900 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-xl transition-all cursor-pointer"
          >
            <ArrowLeft size={14} />
            <span>Tilbake til oversikt</span>
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleScreenChange('contacts')}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer",
                activeScreen === 'contacts' 
                  ? "bg-cyan-600 text-white shadow-sm" 
                  : "bg-cyan-50 text-cyan-800 hover:bg-cyan-100 border border-cyan-200/70"
              )}
              title="Åpne telefonliste og kolleger"
            >
              <PhoneCall size={13} />
              <span>Telefonliste</span>
            </button>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse hidden xs:inline" />
          </div>
        </div>
        {/* 1-Klikk Direkte Nedlasting Banner */}
        <div className="bg-gradient-to-br from-navy-950 via-navy-900 to-slate-900 text-white p-4 sm:p-5 rounded-2xl border border-slate-800 shadow-lg">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-black uppercase tracking-wider mb-1 border border-emerald-500/30">
                <Smartphone size={12} />
                <span>Lynrask mobil-tilgang</span>
              </div>
              <h2 className="text-sm sm:text-base font-bold text-white">
                Last ned VikingMester til din mobil
              </h2>
              <p className="text-xs text-slate-300 max-w-sm mt-0.5">
                1-klikk direkte nedlasting. Legg appen rett på hjemskjermen uten ventetid.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => {
                  downloadMobileShortcut('ios');
                  toast.success('Laster ned Apple-profil (.mobileconfig) til iPhone/iPad!');
                }}
                className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold border border-white/20 flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
                title="Last ned Apple profil for iPhone og iPad"
              >
                <Download size={13} className="text-emerald-400" />
                <span>iPhone profil</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  downloadMobileShortcut('shortcut');
                  toast.success('Laster ned mobil-snarvei (.html)!');
                }}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
                title="Last ned snarvei for Android og mobil"
              >
                <Download size={13} />
                <span>Android snarvei</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  downloadMobileShortcut('windows');
                  toast.success('Laster ned PC-snarvei (.url)!');
                }}
                className="px-2.5 py-2 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white rounded-xl text-xs font-bold border border-white/10 flex items-center gap-1.5 transition-all cursor-pointer"
                title="Last ned Windows snarvei"
              >
                <Download size={12} />
                <span>PC snarvei</span>
              </button>
            </div>
          </div>
        </div>
        {/* Real App Container */}
        <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-xl overflow-hidden min-h-[600px] flex flex-col">
          <div className="relative flex-1 bg-white overflow-y-auto pt-4 sm:pt-6 pb-20 px-4 sm:px-6">
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
                      className="text-sm font-bold bg-transparent border-none p-0 focus:ring-0 w-full truncate cursor-pointer text-slate-800"
                    >
                      {projects.length > 0 ? (
                        projects.map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))
                      ) : (
                        <option value="proj_default_1">Hovedprosjekt (Byggeplass Oslo)</option>
                      )}
                    </select>
                  </div>
                  <div className="w-10 h-10 bg-neutral-100 rounded-full flex items-center justify-center shrink-0">
                    <MapPin size={18} className="text-neutral-400" />
                  </div>
                </div>
                {/* Weather Widget */}
                <WeatherWidget 
                  projectLocation={projects.find(p => p.id === selectedProjectId)?.location || 'Oslo'} 
                />

                {/* Smart Contextual Action Button - Inline non-blocking card */}
                {smartAction && activeScreen === 'home' && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="relative w-full rounded-[2rem] overflow-hidden shadow-lg"
                  >
                    <div className="relative">
                      <button 
                        onClick={() => {
                          if (smartAction.id === 'camera') fileInputRef.current?.click();
                          else handleScreenChange(smartAction.id as any);
                        }}
                        className={cn(
                          "w-full p-4 rounded-[2rem] flex items-center gap-4 transition-all active:scale-[0.98] group text-left cursor-pointer",
                          smartAction.color,
                          "text-white"
                        )}
                      >
                        <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                          {smartAction.icon}
                        </div>
                        <div className="text-left flex-1 min-w-0">
                          <div className="text-[10px] font-black uppercase tracking-widest opacity-75 mb-0.5">Anbefalt Handling</div>
                          <div className="text-base font-bold leading-tight truncate">{smartAction.label}</div>
                          <div className="text-[11px] opacity-85 mt-0.5 truncate">{smartAction.description}</div>
                        </div>
                        <div className="ml-auto w-8 h-8 bg-white/10 rounded-full flex items-center justify-center shrink-0">
                          <ChevronRight size={18} />
                        </div>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSmartActionDismissed(true);
                        }}
                        aria-label="Lukk forslag"
                        title="Lukk forslag"
                        className="absolute top-2.5 right-2.5 w-6 h-6 rounded-full bg-black/20 hover:bg-black/40 text-white flex items-center justify-center active:scale-90 transition-all cursor-pointer"
                      >
                        <X size={13} strokeWidth={2.5} />
                      </button>
                    </div>
                  </motion.div>
                )}

                <button
                  onClick={handleInstallApp}
                  className="w-full py-2.5 px-3.5 bg-neutral-100/90 hover:bg-emerald-50 text-neutral-800 hover:text-emerald-900 rounded-2xl text-xs font-bold flex items-center justify-between border border-neutral-200 transition-all cursor-pointer"
                >
                  <span className="flex items-center gap-2"><Download size={15} className="text-emerald-600" /> Last ned app / snarvei</span>
                  <span className="text-[10px] uppercase font-black text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded-full">Offline OK</span>
                </button>
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
                <div className="grid grid-cols-2 gap-3.5 sm:gap-4">
                  {/* 1. Telefonliste & Kolleger - 1-klikk direkte */}
                  <button 
                    onClick={() => handleScreenChange('contacts')}
                    className="flex flex-col items-center justify-center p-5 sm:p-6 bg-gradient-to-br from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-[2rem] gap-2.5 active:scale-95 transition-all shadow-lg shadow-cyan-100/50 cursor-pointer col-span-2 sm:col-span-1"
                  >
                    <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                      <PhoneCall size={24} />
                    </div>
                    <span className="text-xs font-bold uppercase tracking-widest text-center">Telefonliste</span>
                    <span className="text-[10px] text-cyan-100 font-medium">Ring & SMS kolleger</span>
                  </button>

                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="flex flex-col items-center justify-center p-5 sm:p-6 bg-neutral-900 text-white rounded-[2rem] gap-2.5 active:scale-95 transition-all shadow-lg shadow-neutral-200 cursor-pointer"
                  >
                    <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center">
                      <Camera size={24} />
                    </div>
                    <span className="text-xs font-bold uppercase tracking-widest">{t('image')}</span>
                    <span className="text-[10px] text-slate-300 font-medium">AI Bildeanalyse</span>
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      className="hidden" 
                      accept="image/*" 
                      onChange={handleImageUpload}
                    />
                  </button>
                  <button 
                    onClick={() => handleScreenChange('voice')}
                    className="flex flex-col items-center justify-center p-5 sm:p-6 bg-emerald-600 text-white rounded-[2rem] gap-2.5 active:scale-95 transition-all shadow-lg shadow-emerald-100 cursor-pointer"
                  >
                    <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center">
                      <Mic size={24} />
                    </div>
                    <span className="text-xs font-bold uppercase tracking-widest">{t('voice')}</span>
                    <span className="text-[10px] text-emerald-100 font-medium">Tale til SJA</span>
                  </button>
                  <button 
                    onClick={() => handleScreenChange('translator')}
                    className="flex flex-col items-center justify-center p-5 sm:p-6 bg-blue-600 text-white rounded-[2rem] gap-2.5 active:scale-95 transition-all shadow-lg shadow-blue-100 cursor-pointer"
                  >
                    <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center">
                      <Languages size={24} />
                    </div>
                    <span className="text-xs font-bold uppercase tracking-widest">{t('translator')}</span>
                    <span className="text-[10px] text-blue-100 font-medium">Byggetolk</span>
                  </button>
                  <button 
                    onClick={() => handleScreenChange('laerling')}
                    className="flex flex-col items-center justify-center p-5 sm:p-6 bg-amber-500 text-white rounded-[2rem] gap-2.5 active:scale-95 transition-all shadow-lg shadow-amber-100 cursor-pointer"
                  >
                    <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center">
                      <GraduationCap size={24} />
                    </div>
                    <span className="text-xs font-bold uppercase tracking-widest">Lærling</span>
                    <span className="text-[10px] text-amber-100 font-medium">AI Opplæring</span>
                  </button>
                  <button 
                    onClick={() => setShowDeviationModal(true)}
                    className="flex flex-col items-center justify-center p-5 sm:p-6 bg-white border-2 border-neutral-100 text-neutral-900 rounded-[2rem] gap-2.5 active:scale-95 transition-all cursor-pointer"
                  >
                    <div className="w-12 h-12 bg-neutral-50 rounded-2xl flex items-center justify-center">
                      <AlertTriangle size={24} className="text-amber-500" />
                    </div>
                    <span className="text-xs font-bold uppercase tracking-widest">{t('deviation')}</span>
                    <span className="text-[10px] text-neutral-400 font-medium">Registrer avvik</span>
                  </button>
                  <button 
                    onClick={() => handleScreenChange('voice')}
                    className="flex flex-col items-center justify-center p-5 sm:p-6 bg-white border-2 border-neutral-100 text-neutral-900 rounded-[2rem] gap-2.5 active:scale-95 transition-all cursor-pointer"
                  >
                    <div className="w-12 h-12 bg-neutral-50 rounded-2xl flex items-center justify-center">
                      <FileText size={24} className="text-blue-500" />
                    </div>
                    <span className="text-xs font-bold uppercase tracking-widest">{t('sja')}</span>
                    <span className="text-[10px] text-neutral-400 font-medium">Sikker jobb analyse</span>
                  </button>
                  <button 
                    onClick={handleGenerateDailyLog}
                    className="flex flex-col items-center justify-center p-5 sm:p-6 bg-white border-2 border-neutral-100 text-neutral-900 rounded-[2rem] gap-2.5 active:scale-95 transition-all cursor-pointer"
                  >
                    <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center">
                      <Sparkles size={24} className="text-indigo-600" />
                    </div>
                    <span className="text-xs font-bold uppercase tracking-widest">Dagsrapport</span>
                    <span className="text-[10px] text-neutral-400 font-medium">AI Dagbok</span>
                  </button>
                  <button 
                    onClick={() => setShowChecklistModal(true)}
                    className="flex flex-col items-center justify-center p-5 sm:p-6 bg-white border-2 border-neutral-100 text-neutral-900 rounded-[2rem] gap-2.5 active:scale-95 transition-all cursor-pointer"
                  >
                    <div className="w-12 h-12 bg-neutral-50 rounded-2xl flex items-center justify-center">
                      <ListChecks size={24} className="text-emerald-500" />
                    </div>
                    <span className="text-xs font-bold uppercase tracking-widest">{t('checklist')}</span>
                    <span className="text-[10px] text-neutral-400 font-medium">TEK17 / HMS</span>
                  </button>
                  <button 
                    onClick={() => handleScreenChange('activity')}
                    className="flex flex-col items-center justify-center p-5 sm:p-6 bg-white border-2 border-neutral-100 text-neutral-900 rounded-[2rem] gap-2.5 active:scale-95 transition-all cursor-pointer"
                  >
                    <div className="w-12 h-12 bg-neutral-50 rounded-2xl flex items-center justify-center">
                      <ListChecks size={24} className="text-neutral-500" />
                    </div>
                    <span className="text-xs font-bold uppercase tracking-widest">Prosjektlogg</span>
                    <span className="text-[10px] text-neutral-400 font-medium">Aktivitetshistorikk</span>
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
            
            {activeScreen === 'contacts' && (
              <motion.div 
                key="contacts"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-5 pb-16"
              >
                {/* Header */}
                <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setActiveScreen('home')}
                      className="w-10 h-10 rounded-2xl bg-neutral-100 text-neutral-600 hover:text-neutral-900 flex items-center justify-center active:scale-90 transition-all cursor-pointer"
                      title="Tilbake til oversikt"
                    >
                      <ArrowLeft size={20} />
                    </button>
                    <div>
                      <h2 className="text-lg font-bold text-neutral-900 leading-tight">Telefonliste & Kolleger</h2>
                      <p className="text-[11px] text-neutral-500 font-medium">
                        {filteredColleagues.length} kolleger • 1-klikks anrop & SMS
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowAddContactModal(true)}
                    className="px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white flex items-center gap-1.5 text-xs font-bold shadow-sm transition-all cursor-pointer"
                  >
                    <Plus size={16} />
                    <span>Ny kollega</span>
                  </button>
                </div>
                {/* Søkefelt i sanntid */}
                <div className="relative">
                  <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                  <input
                    type="text"
                    value={contactsSearch}
                    onChange={(e) => setContactsSearch(e.target.value)}
                    placeholder="Søk navn, rolle (maskinfører, bas...), firma eller tlf..."
                    className="w-full pl-10 pr-10 py-3 bg-neutral-100/90 border border-neutral-200/80 rounded-2xl text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:bg-white transition-all"
                  />
                  {contactsSearch && (
                    <button 
                      onClick={() => setContactsSearch('')}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
                {/* Filter-tabs */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs font-bold">
                  <button
                    onClick={() => setContactsFilter('all')}
                    className={cn(
                      "px-3 py-1.5 rounded-xl transition-all shrink-0 cursor-pointer",
                      contactsFilter === 'all'
                        ? "bg-neutral-900 text-white shadow-sm"
                        : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                    )}
                  >
                    Alle ({colleagues.length})
                  </button>
                  <button
                    onClick={() => setContactsFilter('onsite')}
                    className={cn(
                      "px-3 py-1.5 rounded-xl transition-all shrink-0 flex items-center gap-1.5 cursor-pointer",
                      contactsFilter === 'onsite'
                        ? "bg-emerald-600 text-white shadow-sm"
                        : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                    )}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    På plassen ({colleagues.filter(c => c.isOnSiteToday).length})
                  </button>
                  <button
                    onClick={() => setContactsFilter('key')}
                    className={cn(
                      "px-3 py-1.5 rounded-xl transition-all shrink-0 cursor-pointer",
                      contactsFilter === 'key'
                        ? "bg-blue-600 text-white shadow-sm"
                        : "bg-blue-50 text-blue-800 hover:bg-blue-100"
                    )}
                  >
                    Nøkkelpersoner ({colleagues.filter(c => c.isKeyPersonnel).length})
                  </button>
                  <button
                    onClick={() => setContactsFilter('emergency')}
                    className={cn(
                      "px-3 py-1.5 rounded-xl transition-all shrink-0 flex items-center gap-1 cursor-pointer",
                      contactsFilter === 'emergency'
                        ? "bg-red-600 text-white shadow-sm"
                        : "bg-red-50 text-red-800 hover:bg-red-100"
                    )}
                  >
                    <Siren size={14} />
                    Nødnumre
                  </button>
                </div>
                {/* Nødnumre Vises dersom filter er emergency eller øverst */}
                {contactsFilter === 'emergency' ? (
                  <div className="space-y-3">
                    <div className="p-3 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-2 text-xs text-red-800 font-medium">
                      <Siren size={18} className="text-red-600 shrink-0" />
                      <span>Akutte nødnumre for byggeplassen og hendelser iht. HMS-forskriften.</span>
                    </div>
                    <div className="grid grid-cols-1 gap-2.5">
                      {emergencyContacts.map((em, idx) => (
                        <div key={idx} className="p-4 rounded-2xl bg-white border border-neutral-200 shadow-sm flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">{em.icon}</span>
                            <div>
                              <h4 className="text-sm font-bold text-neutral-900">{em.title}</h4>
                              <p className="text-xs text-neutral-500">{em.desc}</p>
                              <p className="text-xs font-mono font-bold text-neutral-800 mt-0.5">{em.number}</p>
                            </div>
                          </div>
                          <a
                            href={'tel:' + em.number.replace(/\s+/g, '')}
                            className={'px-4 py-2 rounded-xl text-white font-bold text-xs flex items-center gap-1.5 shadow-sm active:scale-95 transition-all ' + em.color}
                          >
                            <Phone size={15} />
                            <span>Ring {em.number}</span>
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  /* Kontaktliste */
                  <div className="space-y-2.5">
                    {filteredColleagues.length === 0 ? (
                      <div className="p-12 text-center rounded-2xl bg-neutral-50 border border-dashed border-neutral-200 space-y-3">
                        <Users size={36} className="text-neutral-300 mx-auto" />
                        <p className="text-sm font-bold text-neutral-700">Ingen kolleger matchet søket</p>
                        <p className="text-xs text-neutral-400">Prøv et annet navn, fag eller trykk «Ny kollega» for å legge til.</p>
                      </div>
                    ) : (
                      filteredColleagues.map((contact) => (
                        <div
                          key={contact.id}
                          className="p-4 rounded-2xl bg-white border border-neutral-200/90 shadow-sm hover:shadow-md transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                        >
                          <div className="flex items-start gap-3.5 min-w-0">
                            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-neutral-800 to-neutral-700 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-sm">
                              {contact.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-sm text-neutral-900 truncate">{contact.name}</span>
                                {contact.isOnSiteToday && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                    På plassen
                                  </span>
                                )}
                                {contact.isKeyPersonnel && (
                                  <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200">
                                    Nøkkelperson
                                  </span>
                                )}
                              </div>
                              <p className="text-xs font-semibold text-neutral-600 truncate mt-0.5">
                                {contact.role} <span className="text-neutral-400 font-normal">• {contact.company}</span>
                              </p>
                              <p className="text-[11px] text-neutral-400 font-mono mt-0.5">
                                {contact.phone}
                              </p>
                            </div>
                          </div>
                          {/* Handlingsknapper (Ring & SMS) */}
                          <div className="flex items-center gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-neutral-100 shrink-0">
                            <a
                              href={'tel:' + contact.phone.replace(/\s+/g, '')}
                              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs shadow-sm transition-all"
                              title={'Ring ' + contact.name}
                            >
                              <Phone size={15} />
                              <span>Ring</span>
                            </a>
                            <a
                              href={'sms:' + contact.phone.replace(/\s+/g, '')}
                              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-xs shadow-sm transition-all"
                              title={'Send SMS til ' + contact.name}
                            >
                              <MessageSquare size={15} />
                              <span>SMS</span>
                            </a>
                            {contact.email && (
                              <a
                                href={'mailto:' + contact.email}
                                className="p-2.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-600 active:scale-95 transition-all hidden xs:flex items-center justify-center"
                                title={'E-post til ' + contact.name}
                              >
                                <Mail size={15} />
                              </a>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
                {/* Hurtigknapp for å gå tilbake */}
                <div className="pt-4">
                  <button
                    onClick={() => setActiveScreen('home')}
                    className="w-full py-3.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-2xl font-bold text-xs transition-all cursor-pointer"
                  >
                    Tilbake til hovedoversikt
                  </button>
                </div>
              </motion.div>
            )}
            {activeScreen === 'laerling' && (
                <motion.div key="laerling" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex flex-col h-full bg-white">
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
                    <input 
                      type="file" 
                      ref={apprenticeFileInputRef} 
                      accept="image/*" 
                      capture="environment" 
                      className="hidden" 
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) {
                          const r = new FileReader();
                          r.onloadend = () => setApprenticeImage(r.result as string);
                          r.readAsDataURL(f);
                        }
                      }} 
                    />
                    {apprenticeImage ? (
                      <div className="relative aspect-video rounded-2xl overflow-hidden border border-neutral-200">
                        <img src={apprenticeImage} alt="Arbeidsbevis" className="w-full h-full object-cover" />
                        <button 
                          type="button" 
                          onClick={() => setApprenticeImage(null)} 
                          className="absolute top-2 right-2 p-1.5 bg-black/60 text-white rounded-full hover:bg-black"
                          title="Fjern bilde"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ) : (
                      <button 
                        type="button" 
                        onClick={() => apprenticeFileInputRef.current?.click()}
                        className="w-full aspect-video bg-neutral-50 border-2 border-dashed border-neutral-200 rounded-2xl flex flex-col items-center justify-center gap-2 text-neutral-400 hover:bg-neutral-100 transition-colors cursor-pointer"
                      >
                        <Camera size={32} />
                        <span className="text-xs font-bold">Ta bilde av arbeidet</span>
                      </button>
                    )}
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
      </div>
    </div>
      {/* Checklist Modal */}
      <ChecklistModal 
        isOpen={showChecklistModal} 
        onClose={() => setShowChecklistModal(false)} 
        projectId={checklistProjectId}
        initialTrade={userProfile?.trade}
      />

      {/* Deviation Modal */}
      <CreateDeviationModal
        isOpen={showDeviationModal}
        onClose={() => setShowDeviationModal(false)}
        projects={projects}
      />
      {/* Trade Selector Modal (First time) */}
      {showTradeSelector && (
        <div className="fixed inset-0 z-50 bg-neutral-900/60 backdrop-blur-sm flex items-center justify-center p-4">
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
  );
}
