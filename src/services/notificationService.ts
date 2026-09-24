import { db, collection, addDoc, query, where, orderBy, onSnapshot, updateDoc, doc, handleFirestoreError, OperationType, writeBatch, getDocs } from './firebase';
import { AppNotification } from '../types';
import { getHeaders } from './api';

const NOTIFICATIONS_COLLECTION = 'notifications';

export const notificationService = {
  async createNotification(notification: Omit<AppNotification, 'id' | 'createdAt' | 'read'>) {
    try {
      const newNotification = {
        ...notification,
        read: false,
        createdAt: new Date().toISOString(),
      };
      const docRef = await addDoc(collection(db, NOTIFICATIONS_COLLECTION), newNotification);
      return docRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, NOTIFICATIONS_COLLECTION);
      return null;
    }
  },

  subscribeToNotifications(userId: string, callback: (notifications: AppNotification[]) => void) {
    const q = query(
      collection(db, NOTIFICATIONS_COLLECTION),
      where('userId', 'in', [userId, 'all', 'admin', 'broadcast']),
      orderBy('createdAt', 'desc')
    );

    return onSnapshot(q, (snapshot) => {
      const notifications = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as AppNotification[];
      callback(notifications);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, NOTIFICATIONS_COLLECTION);
    });
  },

  async markAsRead(notificationId: string) {
    try {
      const docRef = doc(db, NOTIFICATIONS_COLLECTION, notificationId);
      await updateDoc(docRef, { read: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `${NOTIFICATIONS_COLLECTION}/${notificationId}`);
    }
  },

  async markAllAsRead(userId: string) {
    try {
      const q = query(
        collection(db, NOTIFICATIONS_COLLECTION),
        where('userId', '==', userId),
        where('read', '==', false)
      );
      const snapshot = await getDocs(q);
      const batch = writeBatch(db);
      snapshot.docs.forEach((d) => {
        batch.update(d.ref, { read: true });
      });
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, NOTIFICATIONS_COLLECTION);
    }
  },

  async notifyHMSCardExpiry(userId: string, crewName: string, expiryDate: string, isExpired: boolean) {
    const title = isExpired ? 'HMS-kort utløpt' : 'HMS-kort utløper snart';
    const message = isExpired 
      ? `HMS-kortet til ${crewName} utløp den ${new Date(expiryDate).toLocaleDateString()}.`
      : `HMS-kortet til ${crewName} utløper den ${new Date(expiryDate).toLocaleDateString()}.`;
    
    // Check if a similar notification already exists to avoid spamming
    try {
      const q = query(
        collection(db, NOTIFICATIONS_COLLECTION),
        where('userId', '==', userId),
        where('title', '==', title),
        where('message', '==', message),
        where('read', '==', false)
      );
      const existing = await getDocs(q);
      if (!existing.empty) {
        return null; // Already notified and unread
      }
    } catch (error) {
      console.error("Error checking for existing notifications:", error);
    }
    
    return this.createNotification({
      userId,
      title,
      message,
      type: isExpired ? 'error' : 'warning',
      category: 'hms',
    });
  },

  async sendEmail(to: string, subject: string, text: string, html?: string, type?: string) {
    try {
      const res = await fetch('/api/notify/email', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ to, subject, text, html, type })
      });
      return await res.json();
    } catch (err) {
      console.warn('Failed to dispatch email via API:', err);
      return null;
    }
  }
};
