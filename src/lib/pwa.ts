export function isPWAInstalled(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true ||
    document.referrer.includes('android-app://')
  );
}

export function isIOS(): boolean {
  if (typeof window === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
}

export function isAndroid(): boolean {
  if (typeof window === 'undefined') return false;
  return /Android/.test(navigator.userAgent);
}

export function downloadMobileShortcut(type?: 'ios' | 'shortcut' | 'windows') {
  if (typeof window === 'undefined') return;
  const targetType = type || (isIOS() ? 'ios' : 'shortcut');
  const filename = targetType === 'ios' ? 'VikingMester.mobileconfig' : targetType === 'windows' ? 'VikingMester.url' : 'VikingMester-Snarvei.html';
  
  const link = document.createElement('a');
  link.href = `/api/download?type=${targetType}`;
  link.download = filename;
  link.setAttribute('target', '_blank');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export async function promptPWAInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
  if (typeof window === 'undefined') return 'unavailable';
  const promptEvent = (window as any).deferredInstallPrompt;
  if (!promptEvent) {
    return 'unavailable';
  }
  try {
    await promptEvent.prompt();
    const choice = await promptEvent.userChoice;
    if (choice?.outcome === 'accepted') {
      (window as any).deferredInstallPrompt = null;
      return 'accepted';
    }
    return 'dismissed';
  } catch (err) {
    console.warn('Error prompting PWA install:', err);
    return 'unavailable';
  }
}

export async function triggerAppDownloadOrInstall(callbacks?: {
  onInstalled?: () => void;
  onAccepted?: () => void;
  onFallback?: () => void;
}) {
  if (isPWAInstalled()) {
    callbacks?.onInstalled?.();
    return 'already_installed';
  }

  // First try native PWA 1-click install prompt
  const outcome = await promptPWAInstall();
  if (outcome === 'accepted') {
    callbacks?.onAccepted?.();
    return 'accepted';
  }

  // If native prompt is not available, immediately trigger direct file download
  const isApple = isIOS();
  downloadMobileShortcut(isApple ? 'ios' : 'shortcut');
  callbacks?.onFallback?.();
  return 'downloaded';
}
