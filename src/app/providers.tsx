'use client';

import React, { useEffect, useState } from 'react';
import { AuthProvider } from '@/src/hooks/useAuth';
import { ErrorBoundary } from '@/src/components/ErrorBoundary';
import '@/src/i18n';

export function Providers({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center">Laster KS Mester...</div>;
  }

  return (
    <ErrorBoundary>
      <AuthProvider>
        {children}
      </AuthProvider>
    </ErrorBoundary>
  );
}
