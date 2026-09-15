'use client';

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import InviteAcceptancePage from '@/src/components/InviteAcceptancePage';

function InviteContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || searchParams.get('t') || '';
  return <InviteAcceptancePage token={token} />;
}

export default function InvitePage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Laster invitasjon...</div>}>
      <InviteContent />
    </Suspense>
  );
}