import React from 'react';

interface StructuredDataProps {
  breadcrumbs?: { name: string; path?: string }[];
  faqs?: { question: string; answer: string }[];
}

export function StructuredData({ breadcrumbs, faqs }: StructuredDataProps = {}) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://vikingmester.no';

  const organizationSchema = {
    '@type': 'Organization',
    '@id': `${baseUrl}/#organization`,
    name: 'VikingMester',
    legalName: 'AIChat Norge AS / Vikingnet',
    url: baseUrl,
    logo: `${baseUrl}/icon.svg`,
    description: 'Norges ledende autonome KS- og HMS-system for håndverkere og entreprenører.',
    email: 'hei@vikingmester.no',
    telephone: '+47 401 63 082',
    address: {
      '@type': 'PostalAddress',
      addressCountry: 'NO',
      addressLocality: 'Oslo',
    },
    areaServed: 'NO',
    sameAs: [
      'https://www.facebook.com/vikingmester',
      'https://www.linkedin.com/company/vikingmester',
      'https://www.tiktok.com/@vikingmester',
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer service',
      email: 'hei@vikingmester.no',
      availableLanguage: ['Norwegian', 'English'],
    },
  };

  const websiteSchema = {
    '@type': 'WebSite',
    '@id': `${baseUrl}/#website`,
    name: 'VikingMester',
    url: baseUrl,
    description: 'Autonom HMS, TEK17-avvik og byggedagbok for norske håndverkere',
    inLanguage: 'nb-NO',
    publisher: {
      '@id': `${baseUrl}/#organization`,
    },
    potentialAction: {
      '@type': 'SearchAction',
      target: `${baseUrl}/?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  };

  const softwareAppSchema = {
    '@type': 'SoftwareApplication',
    '@id': `${baseUrl}/#software`,
    name: 'VikingMester',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web, iOS, Android',
    description: 'Autonom KS/HMS, TEK17-avvikskontroll og usynlig byggedagbok for håndverkere.',
    url: baseUrl,
    offers: [
      {
        '@type': 'Offer',
        name: 'VikingMester Solo',
        price: '1490',
        priceCurrency: 'NOK',
        priceValidUntil: '2027-12-31',
        availability: 'https://schema.org/InStock',
        description: 'For enkeltpersonforetak (1 aktiv håndverker). 100% autonom MesterAI byggeleder.',
      },
      {
        '@type': 'Offer',
        name: 'VikingMester Team',
        price: '3490',
        priceCurrency: 'NOK',
        priceValidUntil: '2027-12-31',
        availability: 'https://schema.org/InStock',
        description: 'For bedrifter inntil 5-10 håndverkere. Inkluderer tverrfaglig lukkesperre og NS 8406.',
      },
      {
        '@type': 'Offer',
        name: 'VikingMester Totalentreprenør',
        price: '6900',
        priceCurrency: 'NOK',
        priceValidUntil: '2027-12-31',
        availability: 'https://schema.org/InStock',
        description: 'For større entreprenører. Full autonom AI-arkitektur og ubegrensede prosjekter.',
      },
    ],
    publisher: {
      '@id': `${baseUrl}/#organization`,
    },
  };

  const graphItems: any[] = [organizationSchema, websiteSchema, softwareAppSchema];

  if (breadcrumbs && breadcrumbs.length > 0) {
    graphItems.push({
      '@type': 'BreadcrumbList',
      itemListElement: breadcrumbs.map((crumb, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: crumb.name,
        ...(crumb.path ? { item: `${baseUrl}${crumb.path}` } : {}),
      })),
    });
  }

  if (faqs && faqs.length > 0) {
    graphItems.push({
      '@type': 'FAQPage',
      mainEntity: faqs.map((faq) => ({
        '@type': 'Question',
        name: faq.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: faq.answer,
        },
      })),
    });
  }

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': graphItems,
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
