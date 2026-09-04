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
