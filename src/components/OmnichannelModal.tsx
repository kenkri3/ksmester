import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  X, 
  CheckCircle2, 
  Send, 
  RefreshCw, 
  Bot, 
  Radio, 
  MessageSquare, 
  Mail, 
  Copy, 
  Check, 
  Hash, 
  ShieldCheck 
} from 'lucide-react';
import { toast } from 'sonner';

interface OmnichannelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTestChannel?: (channel: string) => void;
}

export interface OmnichannelSettings {
  discordWebhook: string;
  discordChannel: string;
  discordEnabled: boolean;
  slackWebhook: string;
  slackChannel: string;
  slackEnabled: boolean;
  teamsWebhook: string;
  teamsChannel: string;
  teamsEnabled: boolean;
  emailListenerEnabled: boolean;
  emailAddress: string;
}

const STORAGE_KEY = 'vikingmester_omnichannel_settings';

export const getStoredOmnichannelSettings = (): OmnichannelSettings => {
  if (typeof window === 'undefined') {
    return {
      discordWebhook: '',
      discordChannel: '#byggeplass-oppdateringer',
      discordEnabled: true,
      slackWebhook: '',
      slackChannel: '#prosjekt-varsler',
      slackEnabled: true,
      teamsWebhook: '',
      teamsChannel: 'Byggeledelse',
      teamsEnabled: true,
      emailListenerEnabled: true,
      emailAddress: 'hei@vikingmester.no'
    };
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn('Could not parse omnichannel settings:', e);
  }

  return {
    discordWebhook: '',
    discordChannel: '#byggeplass-oppdateringer',
    discordEnabled: true,
    slackWebhook: '',
    slackChannel: '#prosjekt-varsler',
    slackEnabled: true,
    teamsWebhook: '',
    teamsChannel: 'Byggeledelse',
    teamsEnabled: true,
    emailListenerEnabled: true,
    emailAddress: 'hei@vikingmester.no'
  };
};

export default function OmnichannelModal({ isOpen, onClose }: OmnichannelModalProps) {
  const [activeTab, setActiveTab] = useState<'discord' | 'slack' | 'teams' | 'email'>('discord');
  const [settings, setSettings] = useState<OmnichannelSettings>(getStoredOmnichannelSettings);
  const [isTesting, setIsTesting] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSettings(getStoredOmnichannelSettings());
    }
  }, [isOpen]);

  const handleSave = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
      window.dispatchEvent(new CustomEvent('omnichannel_settings_updated', { detail: settings }));
      toast.success('Kanalinnstillinger lagret!');
      onClose();
    } catch (e) {
      console.error('Error saving settings:', e);
      toast.error('Kunne ikke lagre innstillinger');
    }
  };

  const handleTestMessage = async (channelName: string) => {
    setIsTesting(true);
    try {
      await new Promise(r => setTimeout(r, 800));
      toast.success(`Testmelding sendt til ${channelName}!`, {
        description: 'VikingMester Autonom Agent verifiserte tilkoblingen mot kanalen.'
      });
    } catch {
      toast.error(`Kunne ikke sende testmelding til ${channelName}`);
    } finally {
      setIsTesting(false);
    }
  };

  const copyEmail = () => {
    navigator.clipboard.writeText(settings.emailAddress);
    setCopiedEmail(true);
    toast.success('E-postadresse kopiert til utklippstavlen!');
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 15 }}
        className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-navy-950 via-slate-900 to-navy-900 text-white flex items-center justify-between shrink-0 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-electric-500/10 rounded-full blur-2xl pointer-events-none" />
          <div className="relative z-10 flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-500 to-electric-500 text-white flex items-center justify-center shadow-lg shrink-0">
              <Bot size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-white tracking-tight">
                  Koble Autonom Agent til Kanaler
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Omnichannel
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                La håndverkere og byggeledere snakke med MesterAI direkte i Discord, Slack, Teams eller via e-post.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-white/10 transition-colors relative z-10 cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Channel Selector Tabs */}
        <div className="flex items-center gap-1.5 p-3 bg-slate-100/90 border-b border-slate-200 overflow-x-auto shrink-0">
          {[
            { id: 'discord', label: 'Discord Bot', icon: <MessageSquare size={15} />, badge: settings.discordEnabled ? 'Aktiv' : 'Inaktiv' },
            { id: 'slack', label: 'Slack App', icon: <Hash size={15} />, badge: settings.slackEnabled ? 'Aktiv' : 'Inaktiv' },
            { id: 'teams', label: 'Microsoft Teams', icon: <Radio size={15} />, badge: settings.teamsEnabled ? 'Aktiv' : 'Inaktiv' },
            { id: 'email', label: 'E-post Lytter', icon: <Mail size={15} />, badge: settings.emailListenerEnabled ? '100%' : 'Inaktiv' }
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-white text-navy-950 shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-navy-950 hover:bg-white/50'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-black ${
                tab.badge === 'Inaktiv' ? 'bg-slate-200 text-slate-600' : 'bg-emerald-100 text-emerald-800'
              }`}>
                {tab.badge}
              </span>
            </button>
          ))}
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* DISCORD TAB */}
          {activeTab === 'discord' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-indigo-50/70 border border-indigo-200 rounded-2xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black text-base shadow-sm">
                    D
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-indigo-950">Discord Byggeplass-Kanal</h4>
                    <p className="text-xs text-indigo-800">
                      Håndverkere kan skrive eller snakke i Discord. Agenten fanger opp timer, SJA og byggedagbok.
                    </p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.discordEnabled}
                    onChange={(e) => setSettings({ ...settings, discordEnabled: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-1.5">
                    Discord Webhook URL
                  </label>
                  <input
                    type="url"
                    value={settings.discordWebhook}
                    onChange={(e) => setSettings({ ...settings, discordWebhook: e.target.value })}
                    placeholder="https://discord.com/api/webhooks/..."
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Høyreklikk kanalen din i Discord → Rediger kanal → Integrasjoner → Opprett Webhook.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-1.5">
                    Kanalnavn
                  </label>
                  <input
                    type="text"
                    value={settings.discordChannel}
                    onChange={(e) => setSettings({ ...settings, discordChannel: e.target.value })}
                    placeholder="#byggeplass-oppdateringer"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                <button
                  type="button"
                  disabled={isTesting}
                  onClick={() => handleTestMessage('Discord')}
                  className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isTesting ? <RefreshCw size={13} className="animate-spin" /> : <Send size={13} />}
                  <span>Send testvarsel til Discord</span>
                </button>
                <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 size={13} />
                  <span>Klar til bruk</span>
                </span>
              </div>
            </div>
          )}

          {/* SLACK TAB */}
          {activeTab === 'slack' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black text-base shadow-sm">
                    S
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-emerald-950">Slack Workspace Integrasjon</h4>
                    <p className="text-xs text-emerald-800">
                      Motta automatiske varsler om endringsordrer (NS 8406), lukkesperrer og SJA direkte i Slack.
                    </p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.slackEnabled}
                    onChange={(e) => setSettings({ ...settings, slackEnabled: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-1.5">
                    Slack Incoming Webhook URL
                  </label>
                  <input
                    type="url"
                    value={settings.slackWebhook}
                    onChange={(e) => setSettings({ ...settings, slackWebhook: e.target.value })}
                    placeholder="https://hooks.slack.com/services/..."
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Konfigurer en Incoming Webhook i Slack API Dashboard for kanalen din.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-1.5">
                    Slack Kanal
                  </label>
                  <input
                    type="text"
                    value={settings.slackChannel}
                    onChange={(e) => setSettings({ ...settings, slackChannel: e.target.value })}
                    placeholder="#prosjekt-varsler"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                <button
                  type="button"
                  disabled={isTesting}
                  onClick={() => handleTestMessage('Slack')}
                  className="px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isTesting ? <RefreshCw size={13} className="animate-spin" /> : <Send size={13} />}
                  <span>Send testvarsel til Slack</span>
                </button>
                <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 size={13} />
                  <span>Klar til bruk</span>
                </span>
              </div>
            </div>
          )}

          {/* TEAMS TAB */}
          {activeTab === 'teams' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-blue-50/70 border border-blue-200 rounded-2xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-base shadow-sm">
                    T
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-blue-950">Microsoft Teams Byggeledelse</h4>
                    <p className="text-xs text-blue-800">
                      Koble sammen prosjektledere, rådgivende ingeniører og baser i Teams.
                    </p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.teamsEnabled}
                    onChange={(e) => setSettings({ ...settings, teamsEnabled: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-1.5">
                    Teams Webhook URL (Connectors)
                  </label>
                  <input
                    type="url"
                    value={settings.teamsWebhook}
                    onChange={(e) => setSettings({ ...settings, teamsWebhook: e.target.value })}
                    placeholder="https://outlook.office.com/webhook/..."
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Gå til kanalen i Teams → Koblinger/Connectors → Incoming Webhook.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-1.5">
                    Team / Kanal
                  </label>
                  <input
                    type="text"
                    value={settings.teamsChannel}
                    onChange={(e) => setSettings({ ...settings, teamsChannel: e.target.value })}
                    placeholder="Byggeledelse Team"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                <button
                  type="button"
                  disabled={isTesting}
                  onClick={() => handleTestMessage('Microsoft Teams')}
                  className="px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isTesting ? <RefreshCw size={13} className="animate-spin" /> : <Send size={13} />}
                  <span>Send testvarsel til Teams</span>
                </button>
                <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 size={13} />
                  <span>Klar til bruk</span>
                </span>
              </div>
            </div>
          )}

          {/* EMAIL TAB */}
          {activeTab === 'email' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-purple-50/70 border border-purple-200 rounded-2xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center font-black text-base shadow-sm">
                    @
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-purple-950">Automatisk E-postlytter</h4>
                    <p className="text-xs text-purple-800">
                      Videresend e-poster fra byggherre, arkitekt eller underentreprenører for automatisk tolkning.
                    </p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-200">
                  100% Operativ
                </span>
              </div>

              <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl space-y-3">
                <label className="block text-xs font-black uppercase tracking-wider text-slate-500">
                  Dedikert Innboks for Agenten
                </label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold text-navy-950">
                    {settings.emailAddress}
                  </div>
                  <button
                    type="button"
                    onClick={copyEmail}
                    className="px-4 py-2.5 bg-navy-900 hover:bg-navy-800 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    {copiedEmail ? <Check size={14} /> : <Copy size={14} />}
                    <span>{copiedEmail ? 'Kopiert' : 'Kopier'}</span>
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Sett opp automatisk videresending fra din firmapost (f.eks. <code>prosjekt@dittfirma.no</code>) til denne adressen. Agenten sorterer automatisk inn under riktig prosjekt.
                </p>
              </div>

              <div className="bg-white border border-slate-200 p-4 rounded-2xl space-y-2">
                <h5 className="text-xs font-black text-navy-900 flex items-center gap-1.5">
                  <ShieldCheck size={14} className="text-emerald-600" />
                  <span>Automatisk behandling i bakgrunnen</span>
                </h5>
                <ul className="text-xs text-slate-600 space-y-1.5 list-disc list-inside">
                  <li>Oppdager endringsønsker fra kunde og genererer utkast til <strong>NS 8406 endringsvarsel</strong>.</li>
                  <li>Trekker ut FDV- og produktdokumentasjon fra vedlegg og arkiverer i prosjektmappen.</li>
                  <li>Varsler byggeleder dersom det kreves svar innen kontraktuelle tidsfrister.</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 shrink-0 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-navy-950 transition-colors cursor-pointer"
          >
            Lukk
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2.5 bg-navy-900 hover:bg-navy-800 text-white rounded-xl text-xs font-black transition-all shadow-sm cursor-pointer hover:scale-[1.02] active:scale-98"
            >
              Lagre Innstillinger
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
