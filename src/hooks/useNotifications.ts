import { useState, useEffect } from 'react';
import { AppNotification } from '../types';
import { notificationService } from '../services/notificationService';
import { useAuth } from './useAuth';

export function useNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) return;

    const unsubscribe = notificationService.subscribeToNotifications(user.uid, (data) => {
      setNotifications(data);
      setUnreadCount(data.filter(n => !n.read).length);
    });

    return () => unsubscribe();
  }, [user]);

  const markAsRead = async (id: string) => {
    await notificationService.markAsRead(id);
  };

  const markAllAsRead = async () => {
    if (!user) return;
    await notificationService.markAllAsRead(user.uid);
  };

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead
  };
}
