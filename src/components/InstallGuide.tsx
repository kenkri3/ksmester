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
  ArrowRight
} from 'lucide-react';

interface InstallGuideProps {
  onClose?: () => void;
}

export default function InstallGuide({ onClose }: InstallGuideProps) {
  const { t } = useTranslation();

  const steps = {
    ios: [
      {
        icon: <Smartphone className="text-blue-500" />,
        title: t('install_ios_step1_title', 'Åpne i Safari'),
        desc: t('install_ios_step1_desc', 'Åpne denne nettsiden i Safari-nettleseren på din iPhone.')
      },
      {
        icon: <Share className="text-blue-500" />,
        title: t('install_ios_step2_title', 'Trykk på "Del"'),
        desc: t('install_ios_step2_desc', 'Trykk på delingsikonet (firkant med pil opp) nederst på skjermen.')
      },
      {
        icon: <PlusSquare className="text-blue-500" />,
        title: t('install_ios_step3_title', 'Legg til på hjem-skjerm'),
        desc: t('install_ios_step3_desc', 'Rull ned og velg "Legg til på hjem-skjerm".')
      }
    ],
    android: [
      {
        icon: <Smartphone className="text-emerald-500" />,
        title: t('install_android_step1_title', 'Åpne i Chrome'),
        desc: t('install_android_step1_desc', 'Åpne denne nettsiden i Chrome-nettleseren på din Android-enhet.')
      },
      {
        icon: <MoreVertical className="text-emerald-500" />,
        title: t('install_android_step2_title', 'Trykk på menyen'),
        desc: t('install_android_step2_desc', 'Trykk på de tre prikkene øverst til høyre i nettleseren.')
      },
      {
        icon: <Download className="text-emerald-500" />,
        title: t('install_android_step3_title', 'Installer app'),
        desc: t('install_android_step3_desc', 'Velg "Installer app" eller "Legg til på startsiden".')
      }
    ]
  };

  return (
    <div className="bg-white rounded-[2.5rem] shadow-2xl border border-neutral-200 overflow-hidden max-w-2xl w-full mx-auto">
      <div className="p-8 border-b border-neutral-100 flex justify-between items-center bg-neutral-50">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{t('install_app_title', 'Installer Mobilappen')}</h2>
          <p className="text-sm text-neutral-500">{t('install_app_desc', 'Få full tilgang til AI-verktøy direkte på byggeplassen.')}</p>
        </div>
        {onClose && (
          <button 
            onClick={onClose}
            className="p-2 hover:bg-neutral-200 rounded-full transition-colors"
          >
            <X size={24} className="text-neutral-400" />
          </button>
        )}
      </div>

      <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-12">
        {/* iOS Section */}
        <div className="space-y-8">
          <div className="flex items-center gap-3 pb-4 border-b border-neutral-100">
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
              <Smartphone className="text-blue-600" />
            </div>
            <h3 className="font-bold text-lg">iPhone / iOS</h3>
          </div>
          
          <div className="space-y-6">
            {steps.ios.map((step, i) => (
              <div key={i} className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-neutral-100 rounded-full flex items-center justify-center text-xs font-bold text-neutral-500">
                  {i + 1}
                </div>
                <div>
                  <h4 className="font-bold text-sm mb-1">{step.title}</h4>
                  <p className="text-xs text-neutral-500 leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Android Section */}
        <div className="space-y-8">
          <div className="flex items-center gap-3 pb-4 border-b border-neutral-100">
            <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
              <Smartphone className="text-emerald-600" />
            </div>
            <h3 className="font-bold text-lg">Android</h3>
          </div>
          
          <div className="space-y-6">
            {steps.android.map((step, i) => (
              <div key={i} className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-neutral-100 rounded-full flex items-center justify-center text-xs font-bold text-neutral-500">
                  {i + 1}
                </div>
                <div>
                  <h4 className="font-bold text-sm mb-1">{step.title}</h4>
                  <p className="text-xs text-neutral-500 leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="p-8 bg-emerald-900 text-white">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <h4 className="font-bold">{t('install_ready_title', 'Klar til bruk!')}</h4>
            <p className="text-xs text-emerald-200">{t('install_ready_desc', 'Appen vil nå ligge på din hjemskjerm og fungere som en vanlig app.')}</p>
          </div>
          <button 
            onClick={onClose}
            className="ml-auto flex items-center gap-2 px-4 py-2 bg-white text-emerald-900 rounded-xl text-xs font-bold hover:bg-emerald-50 transition-all"
          >
            {t('got_it', 'Skjønner')}
            <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
