import React from 'react';
import { PLANS } from '../config/plans';

interface StructuredDataProps {
  breadcrumbs?: { name: string; path?: string }[];
  faqs?: { question: string; answer: string }[];
  article?: {
    title: string;
    description: string;
    slug: string;
    author: string;
    createdAt: string;
    updatedAt?: string;
    category?: string;
  };
}

export function StructuredData({ breadcrumbs, faqs, article }: StructuredDataProps = {}) {
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
    areaServed: {
      '@type': 'Country',
      name: 'Norge',
      identifier: 'NO',
    },
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
    // SIKKERHETSFIKS (R-11): her sto en SearchAction mot `/?q={search_term_string}`.
    // Ingen kode leser `q` pa forsiden, sa vi kunngjorde et sok for Google som
    // ikke finnes. Fjernet i stedet for a love noe vi ikke leverer.
  };

  // SIKKERHETSFIKS (R-03): prisene her var hardkodede literaler (1490 / 3490 /
  // 6900) som ikke stemte med det /priser faktisk viser — 690/1490/2990 — og
  // 3490 og 6900 fantes ingen andre steder i planene. Google kunne dermed vise
  // feil pris i søkeresultatet. Nå hentes navn, pris og beskrivelse fra PLANS,
  // slik at strukturerte data og prissiden alltid sier det samme.
  const soloPlan = PLANS.solo;
  const teamPlan = PLANS.team;
  const entreprenorPlan = PLANS.entreprenor;

  const softwareAppSchema = {
    '@type': 'SoftwareApplication',
    '@id': `${baseUrl}/#software`,
    name: 'VikingMester',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web, iOS, Android',
    description: 'Autonom KS/HMS, TEK17-avvikskontroll og usynlig byggedagbok for håndverkere.',
    url: baseUrl,
    inLanguage: 'nb-NO',
    offers: [soloPlan, teamPlan, entreprenorPlan].map((plan) => ({
      '@type': 'Offer',
      name: plan.name,
      price: String(plan.monthlyPrice),
      priceCurrency: 'NOK',
      priceValidUntil: '2027-12-31',
      availability: 'https://schema.org/InStock',
      // PlanConfig har tagline og features, ikke description. Bruk tagline,
      // som er den korte beskrivelsen planen selv markedsfores med.
      description: plan.tagline,
    })),
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

  if (article) {
    graphItems.push({
      '@type': 'TechArticle',
      '@id': `${baseUrl}/fag/${article.slug}#article`,
      headline: article.title,
      description: article.description,
      inLanguage: 'nb-NO',
      mainEntityOfPage: `${baseUrl}/fag/${article.slug}`,
      datePublished: article.createdAt,
      dateModified: article.updatedAt || article.createdAt,
      author: {
        '@type': 'Person',
        name: article.author || 'VikingMester Fagredaksjon',
      },
      publisher: {
        '@id': `${baseUrl}/#organization`,
      },
      dependencies: 'TEK17, NS 8406, Byggherreforskriften',
      about: {
        '@type': 'Thing',
        name: article.category || 'Byggteknisk forskrift',
      },
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
