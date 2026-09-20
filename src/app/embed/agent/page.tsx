'use client';

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import MesterAIAgentFrame from '@/src/components/MesterAIAgentFrame';

function EmbedAgentContent() {
  const searchParams = useSearchParams();
  const role = searchParams.get('role') || 'byggmester';
  const project = searchParams.get('project') || 'Geitekleiva';
  const trade = role === 'tomrer' ? 'carpenter' : (role === 'rorlegger' ? 'plumber' : 'general');
  const userName = role === 'tomrer' ? 'Tømrer Magne' : (role === 'rorlegger' ? 'Rørlegger Ole' : 'Byggmester Ken');

  return (
    <div className="w-full h-screen bg-slate-900 flex flex-col overflow-hidden">
      <MesterAIAgentFrame
        className="w-full h-full border-0 rounded-none shadow-none"
        selectedProjectName={project}
        userName={userName}
        userTrade={trade}
        companyName="VikingMester"
        userId={`embed_${role}`}
        storageKey={`mester_embed_${role}`}
        hasBottomNav={false}
      />
    </div>
  );
}

export default function EmbedAgentPage() {
  return (
    <Suspense fallback={
      <div className="w-full h-screen flex items-center justify-center bg-slate-900 text-white font-sans text-xs">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-electric-400 animate-ping" />
          <span>Laster MesterAI Agent...</span>
        </div>
      </div>
    }>
      <EmbedAgentContent />
    </Suspense>
  );
}
