import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { 
  Smartphone, 
  Share, 
  PlusSquare, 
  MoreVertical, 
  Download, 
  X, 
  CheckCircle2, 
  ArrowRight, 
  WifiOff, 
  Sparkles,
  Zap
} from 'lucide-react';
import { toast } from 'sonner';
import { isAndroid, isIOS, isPWAInstalled, promptPWAInstall, downloadMobileShortcut } from '../lib/pwa';

interface InstallGuideProps {
  onClose?: () => void;
}

export default function InstallGuide({ onClose }: InstallGuideProps) {
  const { t } = useTranslation();
  const [device, setDevice] = useState<'android' | 'ios'>('android');
  const [isInstalled, setIsInstalled] = useState(false);
  const [hasInstallPrompt, setHasInstallPrompt] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    setIsInstalled(isPWAInstalled());
    if (isIOS()) {
      setDevice('ios');
    } else {
      setDevice('android');
    }

    if (typeof window !== 'undefined' && (window as any).deferredInstallPrompt) {
      setHasInstallPrompt(true);
    }

    const handlePromptReady = () => {
      setHasInstallPrompt(true);
    };
    window.addEventListener('pwa_prompt_available', handlePromptReady);
    return () => window.removeEventListener('pwa_prompt_available', handlePromptReady);
  }, []);

  const handleDirectInstall = async () => {
    if (isInstalled) {
      toast.info('VikingMester er allerede installert som app på denne enheten!');
      onClose?.();
      return;
    }

    setIsDownloading(true);

    // 1. First attempt: Native 1-click OS PWA prompt
    const outcome = await promptPWAInstall();
    if (outcome === 'accepted') {
      toast.success('Laster ned og installerer VikingMester på telefonen...');
      setIsDownloading(false);
      onClose?.();
      return;
    }

    // 2. Direct file download fallback
    const isApple = device === 'ios' || isIOS();
    downloadMobileShortcut(isApple ? 'ios' : 'shortcut');
    toast.success(
      isApple 
        ? 'Profil lastet ned! Trykk "Tillat" og åpne Innstillinger på din iPhone for å installere.'
        : 'Snarvei lastet ned! Åpne filen eller velg "Installer" for å legge til på hjemskjermen.'
    );
    setIsDownloading(false);
  };

  const steps = {
    ios: [
      {
        icon: <Smartphone className="text-blue-500" size={18} />,
        title: '1. Åpne i Safari',
        desc: 'Sjekk at du har åpnet vikingmester.no i Safari på din iPhone/iPad.'
      },
      {
        icon: <Share className="text-blue-500" size={18} />,
        title: '2. Trykk på Del-knappen',
        desc: 'Trykk på det blå delingsikonet (firkant med pil opp) i bunnlinjen på Safari.'
      },
      {
        icon: <PlusSquare className="text-blue-500" size={18} />,
        title: '3. «Legg til på Hjem-skjerm»',
        desc: 'Scroll litt ned og trykk på «Legg til på Hjem-skjerm». Appen legger seg direkte på telefonen!'
      }
    ],
    android: [
      {
        icon: <Download className="text-emerald-500" size={18} />,
        title: '1. 1-Klikk Direkte Installasjon',
        desc: 'Trykk på den grønne knappen over for å laste ned og installere appen direkte på telefonen.'
      },
      {
        icon: <MoreVertical className="text-emerald-500" size={18} />,
        title: '2. Alternativt via Chrome-menyen',
        desc: 'Trykk på de tre prikkene (⋮) øverst til høyre i Google Chrome.'
      },
      {
        icon: <Smartphone className="text-emerald-500" size={18} />,
        title: '3. Velg «Installer app»',
        desc: 'Trykk på «Installer app» eller «Legg til på startsiden». Appen åpnes i fullskjerm uten nettleserlinjer.'
      }
    ]
  };

  return (
    <div className="bg-[#0B0F17] rounded-t-[2rem] sm:rounded-[2.5rem] shadow-2xl border border-slate-800 overflow-hidden max-w-3xl w-full mx-auto text-white">
      {/* Header */}
      <div className="p-4 sm:p-8 border-b border-slate-800 bg-[#131722] shrink-0">
        <div className="sm:hidden w-12 h-1.5 bg-slate-700 rounded-full mx-auto -mt-1 mb-3 shrink-0" />
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-950/50 shrink-0">
              <Smartphone size={22} />
            </div>
            <div>
              <h2 className="text-lg sm:text-2xl font-black tracking-tight text-white">Installer VikingMester på mobilen</h2>
              <p className="text-xs font-semibold text-slate-400">Direkte tilgang på byggeplassen – lynrask og tilgjengelig offline.</p>
            </div>
          </div>
          {onClose && (
            <button 
              onClick={onClose}
              aria-label="Lukk"
              className="p-2 sm:p-2.5 hover:bg-slate-800 rounded-full transition-colors shrink-0 cursor-pointer"
            >
              <X size={20} className="text-slate-400 hover:text-white" />
            </button>
          )}
        </div>
      </div>

      {/* Main 1-Click Install CTA */}
      <div className="p-4 sm:p-8 space-y-5 bg-[#0B0F17]">
        <div className="bg-gradient-to-br from-emerald-950/40 via-slate-900/80 to-teal-950/30 p-5 sm:p-6 rounded-3xl border border-emerald-500/30">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="space-y-1 text-center sm:text-left">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-black uppercase tracking-wider">
                <Sparkles size={12} />
                <span>1-Klikk Direkte Nedlasting</span>
              </div>
              <h3 className="text-base sm:text-lg font-black text-white">
                Klar til å installere på din enhet
              </h3>
              <p className="text-xs text-slate-300 max-w-md">
                Trykk på knappen under for å laste ned og legge VikingMester direkte på hjemskjermen med eget app-ikon og fullskjermsvisning.
              </p>
            </div>

            <button
              onClick={handleDirectInstall}
              disabled={isDownloading}
              className="w-full sm:w-auto px-8 py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black text-sm flex items-center justify-center gap-2.5 shadow-xl shadow-emerald-950/50 active:scale-95 transition-all cursor-pointer shrink-0 disabled:opacity-50"
            >
              <Download size={18} />
              <span>{isDownloading ? 'Laster ned...' : 'Last ned / Installer app nå'}</span>
            </button>
          </div>

          {/* Direct download file alternatives */}
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-3 mt-3 border-t border-slate-800 text-xs">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Direkte filnedlasting:</span>
            <button
              type="button"
              onClick={() => {
                downloadMobileShortcut('ios');
                toast.success('Apple-profil lastet ned! Åpne Innstillinger på din iPhone for å installere.');
              }}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-bold border border-slate-700 shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <span>iPhone profil (.mobileconfig)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                downloadMobileShortcut('shortcut');
                toast.success('Snarvei lastet ned! Kan åpnes i alle nettlesere.');
              }}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-bold border border-slate-700 shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <span>Android/Mobil snarvei (.html)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                downloadMobileShortcut('windows');
                toast.success('Windows-snarvei lastet ned til skrivebordet!');
              }}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-bold border border-slate-700 shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <span>PC snarvei (.url)</span>
            </button>
          </div>
        </div>

        {/* Device Switcher */}
        <div className="flex bg-slate-950 p-1 rounded-2xl max-w-sm mx-auto border border-slate-800">
          <button
            onClick={() => setDevice('android')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              device === 'android' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            Android (Samsung, Google osv.)
          </button>
          <button
            onClick={() => setDevice('ios')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              device === 'ios' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            iPhone & iPad (Apple)
          </button>
        </div>

        {/* Dynamic Device Guidance */}
        <div className="bg-[#131722] p-5 sm:p-6 rounded-3xl border border-slate-800">
          <div className="flex items-center gap-3 pb-3 mb-4 border-b border-slate-800">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-white shadow-sm ${
              device === 'ios' ? 'bg-blue-600' : 'bg-emerald-600'
            }`}>
              <Smartphone size={16} />
            </div>
            <h4 className="font-black text-sm text-white">
              {device === 'ios' ? 'Slik legger du til på iPhone (Safari)' : 'Slik installerer du på Android (Google Chrome)'}
            </h4>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {(device === 'ios' ? steps.ios : steps.android).map((step, i) => (
              <div key={i} className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-1.5 shadow-xs">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-xs font-black text-slate-300">
                    {i + 1}
                  </div>
                  <div className="shrink-0">{step.icon}</div>
                  <h5 className="font-bold text-xs text-white">{step.title}</h5>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed pl-8">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Offline Feature Callout Banner */}
        <div className="p-4 rounded-2xl bg-amber-950/30 border border-amber-500/30 flex items-start gap-3.5">
          <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
            <WifiOff size={16} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-bold text-xs sm:text-sm text-amber-300">100 % Frakoblet modus (Offline First)</h4>
              <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[9px] font-black uppercase rounded-full tracking-wider">Auto-Sync</span>
            </div>
            <p className="text-xs text-amber-200/80 mt-0.5 leading-relaxed">
              Mister du mobildekningen på byggeplassen eller i en betongkjeller? Du kan fortsatt opprette SJA, føre timer og registrere avvik. Alt synkroniseres automatisk til skyen med en gang du er på nett igjen.
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 sm:p-6 bg-[#0B0F17] border-t border-slate-800 text-white flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl flex items-center justify-center shrink-0">
            <CheckCircle2 size={18} />
          </div>
          <div>
            <h4 className="font-bold text-xs sm:text-sm text-white">Ekte app-opplevelse</h4>
            <p className="text-[11px] text-slate-400">Ingen nettleseradressefelt, lynrask oppstart og automatisk oppdatert.</p>
          </div>
        </div>
        <button 
          onClick={onClose}
          className="w-full sm:w-auto px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold border border-slate-700 transition-all shrink-0 cursor-pointer"
        >
          Lukk
        </button>
      </div>
    </div>
  );
}
