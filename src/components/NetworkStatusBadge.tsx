import { useState, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { api } from '../services/api';
import { cn } from '../lib/utils';

export default function NetworkStatusBadge() {
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      handleManualSync();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    const updateQueueCount = () => {
      setPendingCount(api.getPendingSyncCount());
    };

    updateQueueCount();

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('ks_queue_updated', updateQueueCount);
    window.addEventListener('ks_offline_synced', updateQueueCount);

    const interval = setInterval(updateQueueCount, 10000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('ks_queue_updated', updateQueueCount);
      window.removeEventListener('ks_offline_synced', updateQueueCount);
      clearInterval(interval);
    };
  }, []);

  const handleManualSync = async () => {
    if (isSyncing || !isOnline) return;
    setIsSyncing(true);
    await api.syncOfflineQueue();
    setPendingCount(api.getPendingSyncCount());
    setIsSyncing(false);
  };

  if (!isOnline) {
    return (
      <div 
        className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 rounded-full text-xs font-bold transition-all animate-pulse"
        title="Du jobber frakoblet. Alt du lagrer blir lagret lokalt på enheten og synkroniseres automatisk når du kobler til nett."
      >
        <WifiOff size={13} className="shrink-0 text-amber-600" />
        <span className="text-[11px] font-extrabold tracking-wide">Frakoblet ({pendingCount} i kø)</span>
      </div>
    );
  }

  if (pendingCount > 0) {
    return (
      <button 
        onClick={handleManualSync}
        disabled={isSyncing}
        className={cn(
          "flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 border border-blue-200 text-blue-700 rounded-full text-xs font-bold transition-all hover:bg-blue-100",
          isSyncing && "opacity-75"
        )}
        title="Klikk for å synkronisere ventende endringer til skyen"
      >
        <RefreshCw size={12} className={cn("shrink-0 text-blue-600", isSyncing && "animate-spin")} />
        <span className="text-[11px] font-extrabold">Synkroniserer ({pendingCount})</span>
      </button>
    );
  }

  return (
    <div 
      className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50/80 border border-emerald-200/60 text-emerald-700 rounded-full text-xs font-bold"
      title="Tilkoblet skyen – alle data er synkronisert i sanntid"
    >
      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
      <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800">Sky-synk OK</span>
    </div>
  );
}
