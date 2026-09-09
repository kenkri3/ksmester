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
import { isAndroid, isIOS, isPWAInstalled, promptPWAInstall } from '../lib/pwa';

interface InstallGuideProps {
  onClose?: () => void;
}

export default function InstallGuide({ onClose }: InstallGuideProps) {
  const { t } = useTranslation();
  const [device, setDevice] = useState<'android' | 'ios'>('android');
  const [isInstalled, setIsInstalled] = useState(false);
  const [hasInstallPrompt, setHasInstallPrompt] = useState(false);

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

    const outcome = await promptPWAInstall();
    if (outcome === 'accepted') {
      toast.success('Laster ned og installerer VikingMester på telefonen...');
      onClose?.();
    } else if (outcome === 'unavailable') {
      if (isIOS()) {
        toast.info('På iPhone: Trykk på Del-knappen nederst og velg "Legg til på Hjem-skjerm".');
      } else {
        toast.info('Trykk på menyen (tre prikker ⋮) øverst i nettleseren og velg "Installer app".');
      }
    }
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
    <div className="bg-white rounded-t-[2rem] sm:rounded-[2.5rem] shadow-2xl border border-neutral-200 overflow-hidden max-w-3xl w-full mx-auto">
      {/* Header */}
      <div className="p-4 sm:p-8 border-b border-neutral-100 bg-neutral-50/80 shrink-0">
        <div className="sm:hidden w-12 h-1.5 bg-neutral-300 rounded-full mx-auto -mt-1 mb-3 shrink-0" />
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/20 shrink-0">
              <Smartphone size={22} />
            </div>
            <div>
              <h2 className="text-lg sm:text-2xl font-black tracking-tight text-neutral-900">Installer VikingMester på mobilen</h2>
              <p className="text-xs font-semibold text-neutral-500">Direkte tilgang på byggeplassen – lynrask og tilgjengelig offline.</p>
            </div>
          </div>
          {onClose && (
            <button 
              onClick={onClose}
              aria-label="Lukk"
              className="p-2 sm:p-2.5 hover:bg-neutral-200/70 rounded-full transition-colors shrink-0 cursor-pointer"
            >
              <X size={20} className="text-neutral-400" />
            </button>
          )}
        </div>
      </div>

      {/* Main 1-Click Install CTA */}
      <div className="p-4 sm:p-8 space-y-5">
        <div className="bg-gradient-to-br from-emerald-500/10 via-emerald-50 to-teal-50/50 p-5 sm:p-6 rounded-3xl border border-emerald-200/80">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="space-y-1 text-center sm:text-left">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase tracking-wider">
                <Sparkles size={12} />
                <span>1-Klikk Direkte Nedlasting</span>
              </div>
              <h3 className="text-base sm:text-lg font-black text-neutral-900">
                Klar til å installere på din enhet
              </h3>
              <p className="text-xs text-neutral-600 max-w-md">
                Trykk på knappen under for å laste ned og legge VikingMester direkte på hjemskjermen med eget app-ikon og fullskjermsvisning.
              </p>
            </div>

            <button
              onClick={handleDirectInstall}
              className="w-full sm:w-auto px-8 py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black text-sm flex items-center justify-center gap-2.5 shadow-xl shadow-emerald-600/30 active:scale-95 transition-all cursor-pointer shrink-0"
            >
              <Download size={18} />
              <span>Last ned / Installer app</span>
            </button>
          </div>
        </div>

        {/* Device Switcher */}
        <div className="flex bg-neutral-100 p-1 rounded-2xl max-w-sm mx-auto">
          <button
            onClick={() => setDevice('android')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              device === 'android' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-800'
            }`}
          >
            Android (Samsung, Google osv.)
          </button>
          <button
            onClick={() => setDevice('ios')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              device === 'ios' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-800'
            }`}
          >
            iPhone & iPad (Apple)
          </button>
        </div>

        {/* Dynamic Device Guidance */}
        <div className="bg-neutral-50/70 p-5 sm:p-6 rounded-3xl border border-neutral-200/70">
          <div className="flex items-center gap-3 pb-3 mb-4 border-b border-neutral-200/60">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-white shadow-sm ${
              device === 'ios' ? 'bg-blue-500' : 'bg-emerald-600'
            }`}>
              <Smartphone size={16} />
            </div>
            <h4 className="font-black text-sm text-neutral-900">
              {device === 'ios' ? 'Slik legger du til på iPhone (Safari)' : 'Slik installerer du på Android (Google Chrome)'}
            </h4>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {(device === 'ios' ? steps.ios : steps.android).map((step, i) => (
              <div key={i} className="bg-white p-3.5 rounded-2xl border border-neutral-200/80 space-y-1.5 shadow-xs">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-neutral-100 flex items-center justify-center text-xs font-black text-neutral-700">
                    {i + 1}
                  </div>
                  <div className="shrink-0">{step.icon}</div>
                  <h5 className="font-bold text-xs text-neutral-900">{step.title}</h5>
                </div>
                <p className="text-[11px] text-neutral-500 leading-relaxed pl-8">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Offline Feature Callout Banner */}
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200/80 flex items-start gap-3.5">
          <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
            <WifiOff size={16} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-bold text-xs sm:text-sm text-amber-950">100 % Frakoblet modus (Offline First)</h4>
              <span className="px-2 py-0.5 bg-amber-200/60 text-amber-800 text-[9px] font-black uppercase rounded-full tracking-wider">Auto-Sync</span>
            </div>
            <p className="text-xs text-amber-900/80 mt-0.5 leading-relaxed">
              Mister du mobildekningen på byggeplassen eller i en betongkjeller? Du kan fortsatt opprette SJA, føre timer og registrere avvik. Alt synkroniseres automatisk til skyen med en gang du er på nett igjen.
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 sm:p-6 bg-neutral-900 text-white flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-emerald-500 text-neutral-950 rounded-xl flex items-center justify-center shrink-0">
            <CheckCircle2 size={18} />
          </div>
          <div>
            <h4 className="font-bold text-xs sm:text-sm">Ekte app-opplevelse</h4>
            <p className="text-[11px] text-neutral-400">Ingen nettleseradressefelt, lynrask oppstart og automatisk oppdatert.</p>
          </div>
        </div>
        <button 
          onClick={onClose}
          className="w-full sm:w-auto px-6 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer"
        >
          Lukk
        </button>
      </div>
    </div>
  );
}
