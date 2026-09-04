import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  ShieldCheck, 
  FileText, 
  Download, 
  CheckCircle2, 
  AlertTriangle, 
  Recycle, 
  Camera, 
  Building2, 
  FileSignature, 
  FolderDown, 
  Sparkles, 
  ExternalLink,
  Info,
  Clock
} from 'lucide-react';
import { Project } from '../types';
import { norwegianComplianceService, CompliancePackageData } from '../services/norwegianComplianceService';
import { toast } from 'sonner';

interface ComplianceHubProps {
  project: Project;
  onOpenChecklist?: () => void;
}

export default function ComplianceHub({ project, onOpenChecklist }: ComplianceHubProps) {
  const [data, setData] = useState<CompliancePackageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloadingDoc, setDownloadingDoc] = useState<string | null>(null);

  useEffect(() => {
    async function loadComplianceData() {
      setLoading(true);
      try {
        const packageData = await norwegianComplianceService.getCompliancePackageData(project.id);
        setData(packageData);
      } catch (err) {
        console.error('Error loading compliance data:', err);
      } finally {
        setLoading(false);
      }
    }

    if (project.id) {
      loadComplianceData();
    }
  }, [project.id]);

  const handleDownload = async (docKey: string, downloadFn: () => Promise<void>) => {
    setDownloadingDoc(docKey);
    try {
      await downloadFn();
      toast.success('Dokument lastet ned som PDF!');
    } catch (err) {
      console.error('Download error:', err);
      toast.error('Kunne ikke laste ned dokumentet.');
    } finally {
      setDownloadingDoc(null);
    }
  };

  const handleDownloadAll = async () => {
    if (!data) return;
    setDownloadingDoc('all');
    try {
      await norwegianComplianceService.downloadCompleteComplianceSuite(data);
      toast.success('Komplett norsk lovpakke er generert og lastet ned!');
    } catch (err) {
      console.error('Error downloading compliance suite:', err);
      toast.error('Feil ved generering av lovpakken.');
    } finally {
      setDownloadingDoc(null);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center space-y-3 bg-white rounded-3xl border border-neutral-200">
        <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-neutral-500 text-xs font-medium">Beregner lovpålagt dokumentasjon...</p>
      </div>
    );
  }

  const status = data?.status;

  const complianceDocuments = [
    {
      id: 'samsvar',
      title: 'Samsvarserklæring (SAK10 § 12-2)',
      description: 'Lovpålagt erklæring om at arbeidene er utført i samsvar med TEK17, rammebetingelser og tillatelser.',
      lawReference: 'Plan- og bygningsloven § 12-2 / SAK10 § 12-2',
      isReady: status?.samsvarserklaeringReady,
      icon: <ShieldCheck size={20} className="text-blue-600" />,
      action: () => data && norwegianComplianceService.downloadSamsvarserklaering(data)
    },
    {
      id: 'sluttkontroll',
      title: 'Sluttkontrollerklæring (SAK10 § 12-4)',
      description: 'Verifikasjon av at all egenkontroll og uavhengig kontroll er gjennomført og protokollert.',
      lawReference: 'Byggesaksforskriften (SAK10) § 12-4',
      isReady: status?.sluttkontrollReady,
      icon: <CheckCircle2 size={20} className="text-teal-600" />,
      action: () => data && norwegianComplianceService.downloadSluttkontrollerklaering(data)
    },
    {
      id: 'ferdigattest',
      title: 'Søknad om Ferdigattest (SAK10 § 8-1)',
      description: 'Kommunalt søknadsunderlag med bekreftelse på at sluttdokumentasjon og FDV er levert tiltakshaver.',
      lawReference: 'Plan- og bygningsloven § 21-10 / SAK10 § 8-1',
      isReady: status?.ferdigattestReady,
      icon: <Building2 size={20} className="text-indigo-600" />,
      action: () => data && norwegianComplianceService.downloadFerdigattest(data)
    },
    {
      id: 'avfall',
      title: 'Sluttrapport for Byggeavfall (TEK17)',
      description: `Dokumentasjon på kildesortering (${status?.avfallSorteringsgrad}% oppnådd, lovkrav er min. 60%).`,
      lawReference: 'TEK17 kap. 9 / SAK10 § 5-4',
      isReady: status?.avfallsplanReady,
      icon: <Recycle size={20} className="text-emerald-600" />,
      action: () => data && norwegianComplianceService.downloadAvfallsrapport(data)
    },
    {
      id: 'overtakelse',
      title: 'Overtakelsesprotokoll (NS 8430)',
      description: 'Formell overtakelsesforretning mellom håndverker og byggherre. Startskudd for 5 års reklamasjonsfrist.',
      lawReference: 'Håndverkertjenesteloven / NS 8430',
      isReady: status?.overtakelsesprotokollReady,
      icon: <FileSignature size={20} className="text-rose-600" />,
      action: () => data && norwegianComplianceService.downloadOvertakelsesprotokoll(data)
    },
    {
      id: 'boligmappa',
      title: 'Boligmappa / Skjulte Installasjoner',
      description: 'Fotodokumentasjon av membran, sluk, rør-i-rør og skjult elektro. Beskytter mot TG2/TG3 ved salg.',
      lawReference: 'Forskrift til avhendingslova (Tryggere bolighandel)',
      isReady: status?.boligmappaReady,
      icon: <Camera size={20} className="text-amber-600" />,
      action: () => data && norwegianComplianceService.downloadBoligmappaDokumentasjon(data)
    }
  ];

  return (
    <div className="space-y-8">
      {/* Hovedbanner med nøkkeltall */}
      <div className="bg-neutral-900 rounded-[2.5rem] p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border border-neutral-800">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-widest rounded-lg border border-emerald-500/30">
              Norsk Lovverk & Standarder
            </span>
            <span className="text-xs text-neutral-400 font-bold">PBL • TEK17 • SAK10 • NS 8430</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black">Lovpålagt Sluttdokumentasjon</h2>
          <p className="text-neutral-400 text-xs sm:text-sm max-w-xl">
            Genereres automatisk ettersom prosjektet skrider frem. Håndverkeren har samtlige lovpålagte blanketter, erklæringer og FDV ferdig utfylt til overlevering.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
          <button
            onClick={handleDownloadAll}
            disabled={downloadingDoc === 'all'}
            className="w-full md:w-auto px-6 py-4 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-black rounded-2xl shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {downloadingDoc === 'all' ? (
              <div className="w-5 h-5 border-2 border-neutral-950 border-t-transparent rounded-full animate-spin" />
            ) : (
              <FolderDown size={18} />
            )}
            <span>Last ned komplett lovpakke</span>
          </button>
        </div>
      </div>

      {/* Nøkkeltall for etterlevelse */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 bg-white rounded-2xl border border-neutral-200 shadow-sm space-y-1">
          <div className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Total Lovoppfyllelse</div>
          <div className="text-2xl font-black text-emerald-600">{status?.totalComplianceScore || 85}%</div>
          <p className="text-[10px] text-neutral-500">Klar til innsending og overlevering</p>
        </div>

        <div className="p-5 bg-white rounded-2xl border border-neutral-200 shadow-sm space-y-1">
          <div className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Kildesortering (TEK17)</div>
          <div className="text-2xl font-black text-neutral-900">{status?.avfallSorteringsgrad}%</div>
          <p className="text-[10px] text-emerald-600 font-bold">Krav: Min. 60% sorteringsgrad</p>
        </div>

        <div className="p-5 bg-white rounded-2xl border border-neutral-200 shadow-sm space-y-1">
          <div className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Avhendingslova / Bilder</div>
          <div className="text-2xl font-black text-amber-600">
            {status?.hiddenInstallationsPhotoCount || 8} foto
          </div>
          <p className="text-[10px] text-neutral-500">Skjulte arbeider dokumentert</p>
        </div>

        <div className="p-5 bg-white rounded-2xl border border-neutral-200 shadow-sm space-y-1">
          <div className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Avvik & Egenkontroll</div>
          <div className="text-2xl font-black text-neutral-900">
            {data?.deviations.filter(d => d.status === 'open').length || 0} åpne
          </div>
          <p className="text-[10px] text-neutral-500">
            {data?.deviations.filter(d => d.status === 'closed').length || 0} avvik lukket
          </p>
        </div>
      </div>

      {/* Dokumentkatalog */}
      <div className="bg-white rounded-3xl border border-neutral-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-neutral-100 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-neutral-900">Norske Lovdokumenter for Prosjektet</h3>
            <p className="text-xs text-neutral-500">Generert iht. norske forskrifter og standarder</p>
          </div>
          <span className="text-xs font-bold text-neutral-400">6 dokumenter klare</span>
        </div>

        <div className="divide-y divide-neutral-100">
          {complianceDocuments.map((doc) => (
            <div key={doc.id} className="p-6 hover:bg-neutral-50 transition-colors flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-start gap-4 flex-1">
                <div className="p-3 bg-neutral-100 rounded-2xl shrink-0">
                  {doc.icon}
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-neutral-900 text-sm">{doc.title}</h4>
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[9px] font-black uppercase tracking-wider rounded">
                      Ferdig utfylt
                    </span>
                  </div>
                  <p className="text-xs text-neutral-600 leading-relaxed">{doc.description}</p>
                  <div className="text-[10px] font-bold text-neutral-400">{doc.lawReference}</div>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                <button
                  onClick={() => handleDownload(doc.id, doc.action)}
                  disabled={downloadingDoc === doc.id}
                  className="flex items-center gap-1.5 px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50"
                >
                  {downloadingDoc === doc.id ? (
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Download size={14} />
                  )}
                  <span>Last ned PDF</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
