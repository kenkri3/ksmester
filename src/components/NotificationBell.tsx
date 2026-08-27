import React, { useState } from 'react';
import { Bell, CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNotifications } from '../hooks/useNotifications';
import { cn } from '@/src/lib/utils';
import { useTranslation } from 'react-i18next';

export const NotificationBell: React.FC = () => {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const { t } = useTranslation();

  const getIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle2 className="text-emerald-500" size={16} />;
      case 'warning': return <AlertTriangle className="text-amber-500" size={16} />;
      case 'error': return <AlertTriangle className="text-rose-500" size={16} />;
      default: return <Info className="text-blue-500" size={16} />;
    }
  };

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-label={t('notifications', 'Varslinger')}
        title={t('notifications', 'Varslinger')}
        className="relative p-2 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 rounded-xl transition-all active:scale-95"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-rose-500 text-white text-[10px] font-black flex items-center justify-center rounded-full border-2 border-white">
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
              className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-neutral-200 z-50 overflow-hidden"
            >
              <div className="p-4 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/50">
                <h3 className="text-sm font-bold text-neutral-900">{t('notifications', 'Varslinger')}</h3>
                {unreadCount > 0 && (
                  <button 
                    onClick={markAllAsRead}
                    className="text-[10px] font-black uppercase tracking-widest text-emerald-600 hover:underline"
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
                        className={cn(
                          "p-4 transition-colors hover:bg-neutral-50 relative group",
                          !notification.read && "bg-emerald-50/30"
                        )}
                      >
                        <div className="flex gap-3">
                          <div className="mt-0.5 shrink-0">
                            {getIcon(notification.type)}
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
                            <p className="text-[11px] text-neutral-500 leading-relaxed line-clamp-2">
                              {notification.message}
                            </p>
                          </div>
                        </div>
                        {!notification.read && (
                          <button 
                            onClick={() => markAsRead(notification.id)}
                            className="absolute top-4 right-4 w-2 h-2 bg-emerald-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
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
                  <button className="text-[10px] font-black uppercase tracking-widest text-neutral-500 hover:text-neutral-700 transition-colors">
                    {t('view_all_notifications', 'Se alle varslinger')}
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
