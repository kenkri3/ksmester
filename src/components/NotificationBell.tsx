import React, { useState } from 'react';
import { Bell, CheckCircle2, AlertTriangle, Info, X, MessageSquare, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNotifications } from '../hooks/useNotifications';
import { cn } from '@/src/lib/utils';
import { useTranslation } from 'react-i18next';
import { AppNotification } from '../types';

interface NotificationBellProps {
  className?: string;
  darkMode?: boolean;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({ className, darkMode }) => {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const { t } = useTranslation();

  const getIcon = (type: string, category?: string) => {
    if (category === 'chat') {
      return (
        <div className="relative">
          <MessageSquare className="text-purple-500" size={16} />
          <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber-400 animate-ping" />
        </div>
      );
    }
    switch (type) {
      case 'success': return <CheckCircle2 className="text-emerald-500" size={16} />;
      case 'warning': return <AlertTriangle className="text-amber-500" size={16} />;
      case 'error': return <AlertTriangle className="text-rose-500" size={16} />;
      default: return <Info className="text-blue-500" size={16} />;
    }
  };

  const handleNotificationClick = (notification: AppNotification) => {
    markAsRead(notification.id);
    setIsOpen(false);

    // Hvis dette er en chat-/kundehenvendelse eller har tilknyttet prosjekt:
    if (notification.projectId || notification.category === 'chat') {
      const channelId = notification.channelId || (notification.projectId ? `proj_${notification.projectId}` : undefined);
      window.dispatchEvent(new CustomEvent('open_project_chat', {
        detail: {
          projectId: notification.projectId,
          channelId: channelId
        }
      }));
    }
  };

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-label={t('notifications', 'Varslinger')}
        title={t('notifications', 'Varslinger')}
        className={cn(
          "relative p-2 rounded-xl transition-all active:scale-95 cursor-pointer",
          darkMode 
            ? "text-slate-300 hover:text-white hover:bg-white/10" 
            : "text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100",
          className
        )}
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-rose-500 text-white text-[10px] font-black flex items-center justify-center rounded-full border-2 border-slate-900 animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div 
              className="fixed inset-0 z-40" 
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute right-0 mt-2 w-84 sm:w-96 bg-white rounded-2xl shadow-2xl border border-neutral-200 z-50 overflow-hidden text-neutral-900"
            >
              <div className="p-4 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/50">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-neutral-900">{t('notifications', 'Varslinger')}</h3>
                  {unreadCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-700">
                      {unreadCount} nye
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button 
                    onClick={markAllAsRead}
                    className="text-[10px] font-black uppercase tracking-widest text-emerald-600 hover:underline cursor-pointer"
                  >
                    {t('mark_all_read', 'Marker alle som lest')}
                  </button>
                )}
              </div>

              <div className="max-h-96 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center">
                    <div className="w-12 h-12 bg-neutral-50 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Bell size={20} className="text-neutral-300" />
                    </div>
                    <p className="text-xs text-neutral-400 font-medium">{t('no_notifications', 'Ingen nye varslinger')}</p>
                  </div>
                ) : (
                  <div className="divide-y divide-neutral-50">
                    {notifications.map((notification) => (
                      <div 
                        key={notification.id}
                        onClick={() => handleNotificationClick(notification)}
                        className={cn(
                          "p-4 transition-colors hover:bg-neutral-50 relative group cursor-pointer text-left",
                          !notification.read && "bg-purple-50/30"
                        )}
                      >
                        <div className="flex gap-3">
                          <div className="mt-0.5 shrink-0">
                            {getIcon(notification.type, notification.category)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <span className="text-xs font-bold text-neutral-900 truncate">
                                {notification.title}
                              </span>
                              <span className="text-[10px] text-neutral-400 shrink-0">
                                {new Date(notification.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <p className="text-[11px] text-neutral-600 leading-relaxed line-clamp-2">
                              {notification.message}
                            </p>

                            {/* Tags for spesielle meldinger */}
                            <div className="mt-2 flex flex-wrap items-center gap-1.5">
                              {notification.category === 'chat' && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-bold bg-purple-100 text-purple-700">
                                  <MessageSquare size={10} />
                                  Kundeportal
                                </span>
                              )}
                              {notification.hasAiDraft && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-bold bg-amber-100 text-amber-800 border border-amber-300/40">
                                  <Sparkles size={10} className="text-amber-600" />
                                  ✨ MesterAI utkast klart til godkjenning
                                </span>
                              )}
                              {Boolean(notification.projectId || notification.category === 'chat') && (
                                <span className="text-[9px] font-semibold text-purple-600 group-hover:underline ml-auto">
                                  Åpne samtale →
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {!notification.read && (
                          <button 
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              markAsRead(notification.id);
                            }}
                            className="absolute top-4 right-4 w-2 h-2 bg-purple-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                            title={t('mark_as_read', 'Marker som lest')}
                            aria-label={t('mark_as_read', 'Marker som lest')}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {notifications.length > 0 && (
                <div className="p-3 bg-neutral-50 border-t border-neutral-100 text-center">
                  <button 
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="text-[10px] font-black uppercase tracking-widest text-neutral-500 hover:text-neutral-700 transition-colors cursor-pointer"
                  >
                    Lukk varsler
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
