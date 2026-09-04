import { motion } from 'motion/react';
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
  RefreshCw,
  Zap
} from 'lucide-react';

interface InstallGuideProps {
  onClose?: () => void;
}

export default function InstallGuide({ onClose }: InstallGuideProps) {
  const { t } = useTranslation();

  const steps = {
    ios: [
      {
        icon: <Smartphone className="text-blue-500" size={18} />,
        title: '1. Åpne i Safari',
        desc: 'Åpne denne nettsiden (ksmester.no) i Safari på din iPhone.'
      },
      {
        icon: <Share className="text-blue-500" size={18} />,
        title: '2. Trykk på Del-knappen',
        desc: 'Trykk på delingsikonet (firkant med pil opp) i bunnmenyen på Safari.'
      },
      {
        icon: <PlusSquare className="text-blue-500" size={18} />,
        title: '3. "Legg til på Hjem-skjerm"',
        desc: 'Scroll ned på listen og trykk på «Legg til på Hjem-skjerm» (Add to Home Screen).'
      }
    ],
    android: [
      {
        icon: <Smartphone className="text-emerald-500" size={18} />,
        title: '1. Åpne i Chrome',
        desc: 'Åpne nettsiden i Google Chrome på din Android-telefon.'
      },
      {
        icon: <MoreVertical className="text-emerald-500" size={18} />,
        title: '2. Trykk på menyen',
        desc: 'Trykk på de tre prikkene øverst i høyre hjørne av nettleseren.'
      },
      {
        icon: <Download className="text-emerald-500" size={18} />,
        title: '3. "Legg til på startsiden"',
        desc: 'Velg «Installer app» eller «Legg til på startsiden».'
      }
    ]
  };

  return (
    <div className="bg-white rounded-t-[2rem] sm:rounded-[2.5rem] shadow-2xl border border-neutral-200 overflow-hidden max-w-3xl w-full mx-auto">
      <div className="p-4 sm:p-8 border-b border-neutral-100 bg-neutral-50/80 shrink-0">
        <div className="sm:hidden w-12 h-1.5 bg-neutral-300 rounded-full mx-auto -mt-1 mb-3 shrink-0" />
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/20 shrink-0">
              <Smartphone size={22} />
            </div>
            <div>
              <h2 className="text-lg sm:text-2xl font-black tracking-tight text-neutral-900">Bruk som app på mobilen</h2>
              <p className="text-xs font-semibold text-neutral-500">Rask tilgang direkte fra hjemskjermen – ingen nedlasting fra App Store nødvendig.</p>
            </div>
          </div>
          {onClose && (
            <button 
              onClick={onClose}
              aria-label="Lukk"
              className="p-2 sm:p-2.5 hover:bg-neutral-200/70 rounded-full transition-colors shrink-0"
            >
              <X size={20} className="text-neutral-400" />
            </button>
          )}
        </div>
      </div>

      {/* Offline Feature Callout Banner */}
      <div className="mx-4 sm:mx-8 mt-4 sm:mt-6 p-4 rounded-2xl bg-amber-50 border border-amber-200/80 flex items-start gap-3.5">
        <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
          <WifiOff size={16} />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h4 className="font-bold text-sm text-amber-950">100 % Frakoblet modus (Offline First)</h4>
            <span className="px-2 py-0.5 bg-amber-200/60 text-amber-800 text-[10px] font-black uppercase rounded-full tracking-wider">Auto-Sync</span>
          </div>
          <p className="text-xs text-amber-900/80 mt-0.5 leading-relaxed">
            Mister du mobildekningen i en kjeller eller på byggeplassen? Ingen problem! Du kan fortsette å fylle ut <strong>SJA, sjekklister, timeføring og avvik</strong>. Alt lagres lokalt og synkroniseres automatisk til skyen med en gang du får nett igjen.
          </p>
        </div>
      </div>

      <div className="p-4 sm:p-8 grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-8">
        {/* iOS Section */}
        <div className="bg-neutral-50/70 p-6 rounded-3xl border border-neutral-200/70 space-y-6">
          <div className="flex items-center gap-3 pb-3 border-b border-neutral-200/60">
            <div className="w-9 h-9 bg-blue-500 text-white rounded-xl flex items-center justify-center shadow-sm">
              <Smartphone size={18} />
            </div>
            <h3 className="font-black text-neutral-900">iPhone / iPad (Safari)</h3>
          </div>
          
          <div className="space-y-4">
            {steps.ios.map((step, i) => (
              <div key={i} className="flex gap-3.5 items-start">
                <div className="flex-shrink-0 w-7 h-7 bg-white border border-neutral-200 rounded-full flex items-center justify-center text-xs font-black text-neutral-700 shadow-sm">
                  {i + 1}
                </div>
                <div>
                  <h4 className="font-bold text-xs text-neutral-900">{step.title}</h4>
                  <p className="text-xs text-neutral-500 mt-0.5 leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Android Section */}
        <div className="bg-neutral-50/70 p-6 rounded-3xl border border-neutral-200/70 space-y-6">
          <div className="flex items-center gap-3 pb-3 border-b border-neutral-200/60">
            <div className="w-9 h-9 bg-emerald-600 text-white rounded-xl flex items-center justify-center shadow-sm">
              <Smartphone size={18} />
            </div>
            <h3 className="font-black text-neutral-900">Android (Chrome)</h3>
          </div>
          
          <div className="space-y-4">
            {steps.android.map((step, i) => (
              <div key={i} className="flex gap-3.5 items-start">
                <div className="flex-shrink-0 w-7 h-7 bg-white border border-neutral-200 rounded-full flex items-center justify-center text-xs font-black text-neutral-700 shadow-sm">
                  {i + 1}
                </div>
                <div>
                  <h4 className="font-bold text-xs text-neutral-900">{step.title}</h4>
                  <p className="text-xs text-neutral-500 mt-0.5 leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="p-6 bg-neutral-900 text-white flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-500 text-neutral-950 rounded-xl flex items-center justify-center shrink-0">
            <CheckCircle2 size={20} />
          </div>
          <div>
            <h4 className="font-bold text-sm">Alt klart for håndverkerne</h4>
            <p className="text-xs text-neutral-400">Åpnes i fullskjerm uten nettleserlinjer for en ekte app-opplevelse.</p>
          </div>
        </div>
        <button 
          onClick={onClose}
          className="w-full sm:w-auto px-6 py-2.5 bg-emerald-500 text-neutral-950 rounded-xl text-xs font-black hover:bg-emerald-400 transition-all shrink-0"
        >
          Forstått
        </button>
      </div>
    </div>
  );
}
