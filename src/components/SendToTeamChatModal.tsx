'use client';

import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import {
  Send,
  X,
  Sparkles,
  Building2,
  HardHat,
  AlertTriangle,
  User,
  CheckCircle2,
  ChevronDown,
  Edit3,
  Eye,
  Eraser,
  Wand2
} from 'lucide-react';
import { Project, TeamChatConsultContext } from '@/src/types';
import { TeamChatMessage, ChatChannel } from '@/src/components/ProjectTeamChat';
import { toast } from 'sonner';
import { cn } from '@/src/lib/utils';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { formatAiMarkdown, stripMarkdownFormatting } from '@/src/lib/formatAiMarkdown';

interface SendToTeamChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialText: string;
  consultContext?: TeamChatConsultContext | null;
  projects: Project[];
  user: any;
  onSuccess: (channelId: string, channelName: string) => void;
}

export default function SendToTeamChatModal({
  isOpen,
  onClose,
  initialText,
  consultContext,
  projects = [],
  user,
  onSuccess
}: SendToTeamChatModalProps) {
  // Liste over alle mulige kanaler
  const availableChannels = useMemo(() => {
    const list: Array<{ id: string; name: string; type: 'company' | 'project' | 'hms'; description?: string }> = [
      {
        id: 'company_general',
        name: 'Hele firmaet (Felles)',
        type: 'company',
        description: `Internkanal for alle ansatte i ${user?.company || 'bedriften'}`
      },
      {
        id: 'hms_alerts',
        name: 'HMS, Sikkerhet & Varsler',
        type: 'hms',
        description: 'Viktige sikkerhetsmeldinger, farevarsler og verneutstyr'
      }
    ];

    projects.forEach(p => {
      list.push({
        id: `proj_${p.id}`,
        name: p.name,
        type: 'project',
        description: p.address || p.clientName || 'Aktiv byggeplass'
      });
    });

    return list;
  }, [projects, user]);

  // Standardkanal: bruk kanalen fra privat rådgivning hvis tilgjengelig, ellers felles
  const defaultChannelId = consultContext?.channelId || 'company_general';
  const [selectedChannelId, setSelectedChannelId] = useState<string>(defaultChannelId);
  const [messageText, setMessageText] = useState<string>(initialText || '');
  const [tagAsAiAssisted, setTagAsAiAssisted] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');
  const [isSending, setIsSending] = useState<boolean>(false);

  // Synkroniser tekst og kanal hvis modalen gjenåpnes med ny tekst
  React.useEffect(() => {
    if (isOpen) {
      setMessageText(initialText || '');
      setActiveTab('edit');
      if (consultContext?.channelId) {
        setSelectedChannelId(consultContext.channelId);
      }
    }
  }, [isOpen, initialText, consultContext]);

  if (!isOpen) return null;

  const currentChannel = availableChannels.find(c => c.id === selectedChannelId) || {
    id: selectedChannelId,
    name: consultContext?.channelName || 'Valgt kanal',
    type: 'company'
  };

  const handleSend = () => {
    const textToSend = messageText.trim();
    if (!textToSend) {
      toast.error('Meldingen kan ikke være tom.');
      return;
    }

    setIsSending(true);

    try {
      const currentTenantScope = user?.impersonatedCompanyId 
        ? user.impersonatedCompanyId 
        : (user?.company ? user.company.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase() : 'tenant_default');
      
      const targetKey = `mester_teamchat_${currentTenantScope}_${selectedChannelId}`;
      const now = new Date();
      const formattedTime = now.toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' });

      const newMsg: TeamChatMessage = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        channelId: selectedChannelId,
        senderId: user?.id || 'current_user',
        senderName: user?.displayName || 'Byggmester',
        senderRole: user?.role === 'admin' ? 'Prosjektleder / Admin' : 'Håndverker',
        senderCompany: user?.company || 'Firma',
        senderCategory: user?.role === 'admin' ? 'admin' : 'team',
        content: textToSend,
        timestamp: now.toISOString(),
        formattedTime: formattedTime,
        isAiAssisted: tagAsAiAssisted,
        aiConsultReference: {
          channelName: currentChannel.name,
          timestamp: now.toISOString()
        }
      };

      let existing: TeamChatMessage[] = [];
      try {
        const raw = localStorage.getItem(targetKey);
        if (raw) existing = JSON.parse(raw);
      } catch {}

      const updated = [...existing, newMsg];
      localStorage.setItem(targetKey, JSON.stringify(updated));

      // Varsle andre lyttere
      window.dispatchEvent(new CustomEvent('mester_teamchat_updated', {
        detail: { channelId: selectedChannelId }
      }));

      // Varsle at prosjektchatten skal åpnes med denne kanalen
      const projectId = selectedChannelId.startsWith('proj_') ? selectedChannelId.replace('proj_', '') : undefined;
      window.dispatchEvent(new CustomEvent('open_project_chat', {
        detail: { channelId: selectedChannelId, projectId }
      }));

      toast.success(`Løsningen er sendt direkte inn i ${currentChannel.name}! 🚀`);
      onSuccess(selectedChannelId, currentChannel.name);
      onClose();
    } catch (err: any) {
      console.error('Feil ved sending til team-chat:', err);
      toast.error('Kunne ikke sende meldingen til team-chatten.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-[#0B0F17] border border-slate-800 text-white rounded-3xl sm:rounded-[2rem] shadow-2xl w-full max-w-xl max-h-[92vh] flex flex-col overflow-hidden my-auto"
      >
        {/* Header */}
        <div className="px-5 py-4 sm:px-6 sm:py-4.5 border-b border-slate-800 bg-[#131722] flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-500/20 border border-purple-500/30 text-purple-400 flex items-center justify-center shrink-0">
              <Send size={18} />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-white leading-tight">Send svar til team-chat</h2>
              <p className="text-[11px] text-slate-400">Del den utarbeidede løsningen fra MesterAI med kollegene</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 hover:bg-slate-800 rounded-xl transition-colors cursor-pointer text-slate-400 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        {/* Innhold */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 bg-[#0B0F17] custom-scrollbar">
          {/* Kanalvelger */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-black uppercase tracking-wider text-slate-400 ml-0.5 flex items-center gap-1.5">
              <span>Mottakerkanal</span>
              {consultContext?.channelId && (
                <span className="text-[10px] text-purple-400 font-normal">
                  (Koblet til privat rådgivning)
                </span>
              )}
            </label>
            <div className="relative">
              <select
                value={selectedChannelId}
                onChange={(e) => setSelectedChannelId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs sm:text-sm font-medium focus:ring-2 focus:ring-purple-500 outline-none transition-all appearance-none cursor-pointer pr-10"
              >
                {availableChannels.map(ch => (
                  <option key={ch.id} value={ch.id}>
                    {ch.type === 'company' ? '🏢 ' : ch.type === 'hms' ? '🛡️ ' : '🏗️ '}
                    {ch.name}
                  </option>
                ))}
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                <ChevronDown size={16} />
              </div>
            </div>
          </div>

          {/* Meldingstekst med fane for redigering og forhåndsvisning samt rense-verktøy */}
          <div className="space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2 ml-0.5">
              <div className="flex items-center gap-1.5 bg-slate-900/90 p-0.5 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => setActiveTab('edit')}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                    activeTab === 'edit'
                      ? "bg-purple-600 text-white shadow-xs"
                      : "text-slate-400 hover:text-white"
                  )}
                >
                  <Edit3 size={12} />
                  <span>Rediger</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('preview')}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                    activeTab === 'preview'
                      ? "bg-purple-600 text-white shadow-xs"
                      : "text-slate-400 hover:text-white"
                  )}
                >
                  <Eye size={12} />
                  <span>Forhåndsvisning</span>
                </button>
              </div>

              {/* Rense- og formateringsknapper */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    const cleaned = stripMarkdownFormatting(messageText);
                    setMessageText(cleaned);
                    toast.success('Renset bort rå stjerner og markdown-koder! ✨');
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-amber-500/40 hover:bg-slate-800/80 text-amber-300 hover:text-amber-200 text-[11px] font-semibold transition-all cursor-pointer"
                  title="Fjerner ** og rå tegn for 100% ren og lesevennlig tekst"
                >
                  <Eraser size={12} />
                  <span>Fjern stjerner (**)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const formatted = formatAiMarkdown(messageText);
                    setMessageText(formatted);
                    toast.success('Optimaliserte linjeskift og punktlister!');
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-purple-500/40 hover:bg-slate-800/80 text-purple-300 hover:text-purple-200 text-[11px] font-semibold transition-all cursor-pointer"
                  title="Gjør om til luftig, pen struktur"
                >
                  <Wand2 size={12} />
                  <span>Autorydd</span>
                </button>
              </div>
            </div>

            {activeTab === 'edit' ? (
              <textarea
                rows={7}
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder="Skriv eller tilpass svaret som skal deles..."
                className="w-full p-3.5 bg-slate-950 border border-slate-800 rounded-2xl text-white text-xs sm:text-sm leading-relaxed placeholder:text-slate-600 focus:ring-2 focus:ring-purple-500 outline-none transition-all resize-y custom-scrollbar font-sans"
                onKeyDown={(e) => {
                  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                    e.preventDefault();
                    handleSend();
                  }
                }}
              />
            ) : (
              <div className="w-full p-4 bg-[#131b2e] border border-purple-500/30 rounded-2xl text-slate-100 text-xs sm:text-sm leading-relaxed max-h-60 min-h-[140px] overflow-y-auto custom-scrollbar font-sans">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    h1: ({ node, ...props }) => (
                      <h3 className="text-sm font-black text-white mt-2.5 mb-1.5 border-b border-purple-500/20 pb-0.5" {...props} />
                    ),
                    h2: ({ node, ...props }) => (
                      <h4 className="text-xs sm:text-sm font-black text-purple-300 mt-2 mb-1" {...props} />
                    ),
                    h3: ({ node, ...props }) => (
                      <h5 className="text-xs font-bold text-teal-300 mt-1.5 mb-1 uppercase tracking-wider" {...props} />
                    ),
                    h4: ({ node, ...props }) => (
                      <h6 className="text-xs font-bold text-purple-200 mt-1.5 mb-0.5" {...props} />
                    ),
                    p: ({ node, ...props }) => (
                      <p className="text-xs sm:text-sm text-slate-200 leading-relaxed mb-2 last:mb-0" {...props} />
                    ),
                    ul: ({ node, ...props }) => (
                      <ul className="my-1.5 space-y-1 pl-4 list-disc text-slate-200 text-xs sm:text-sm" {...props} />
                    ),
                    ol: ({ node, ...props }) => (
                      <ol className="my-1.5 space-y-1 pl-5 list-decimal text-slate-200 text-xs sm:text-sm" {...props} />
                    ),
                    li: ({ node, ...props }) => (
                      <li className="leading-relaxed text-slate-200 text-xs sm:text-sm" {...props} />
                    ),
                    strong: ({ node, ...props }) => (
                      <strong className="font-extrabold text-white" {...props} />
                    ),
                    blockquote: ({ node, ...props }) => (
                      <blockquote className="my-2 p-2 bg-purple-950/40 border-l-3 border-purple-500 rounded-r-xl text-xs text-purple-200" {...props} />
                    ),
                    code: ({ node, inline, ...props }: any) => (
                      inline ? (
                        <code className="px-1.5 py-0.5 rounded bg-black/40 text-purple-300 font-mono text-xs" {...props} />
                      ) : (
                        <code className="block p-2 rounded-xl bg-black/50 text-slate-200 font-mono text-xs overflow-x-auto my-2" {...props} />
                      )
                    )
                  }}
                >
                  {formatAiMarkdown(messageText)}
                </ReactMarkdown>
              </div>
            )}
          </div>

          {/* Innstillinger & merking */}
          <div className="p-3.5 rounded-2xl bg-purple-950/20 border border-purple-500/20 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-300 flex items-center justify-center shrink-0">
                <Sparkles size={16} className="text-amber-300" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-200">Merk som fagavklart med MesterAI</p>
                <p className="text-[11px] text-slate-400">
                  Viser et synlig merke som gir teamet trygghet på at forskrifter er sjekket.
                </p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0">
              <input
                type="checkbox"
                checked={tagAsAiAssisted}
                onChange={(e) => setTagAsAiAssisted(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-800 bg-[#0E131F] flex items-center justify-between gap-3 shrink-0">
          <p className="text-[11px] text-slate-500 hidden sm:block">
            Tips: Trykk <kbd className="px-1.5 py-0.5 bg-slate-900 border border-slate-700 rounded text-[10px] font-mono">Ctrl+Enter</kbd> for å sende raskt
          </p>
          <div className="flex items-center gap-2.5 ml-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors cursor-pointer"
            >
              Avbryt
            </button>
            <button
              type="button"
              disabled={isSending || !messageText.trim()}
              onClick={handleSend}
              className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl font-bold text-xs sm:text-sm transition-all shadow-md shadow-purple-950/40 disabled:opacity-50 cursor-pointer flex items-center gap-2"
            >
              <Send size={14} />
              <span>{isSending ? 'Sender...' : 'Send til chatten nå'}</span>
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
