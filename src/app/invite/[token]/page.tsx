'use client';

import React, { use } from 'react';
import InviteAcceptancePage from '@/src/components/InviteAcceptancePage';

export default function InviteTokenPage({
  params
}: {
  params: Promise<{ token: string }>;
}) {
  const unwrappedParams = use(params);
  const token = unwrappedParams?.token || '';

  return <InviteAcceptancePage token={token} />;
}