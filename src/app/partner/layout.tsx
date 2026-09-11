import type { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
  title: 'Partnerportal 50/50 | VikingMester',
  description: 'Intern partnerportal for salgsagenter og samarbeidspartnere.',
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      'max-video-preview': -1,
      'max-image-preview': 'none',
      'max-snippet': -1,
    },
  },
};

export default function PartnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
