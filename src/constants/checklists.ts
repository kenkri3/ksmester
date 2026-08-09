import { Trade } from '../types';

export interface ChecklistCategory {
  id: string;
  title: string;
  items: string[];
}

export interface TradeChecklist {
  title: string;
  categories: ChecklistCategory[];
}

export const TRADE_CHECKLISTS: Record<Trade, TradeChecklist> = {
  carpenter: {
    title: 'Tømrer',
    categories: [
      {
        id: 'hms',
        title: 'HMS & Sikkerhet',
        items: [
          'Er fallsikring montert ved arbeid over 2 meter?',
          'Er sagblader og verktøy kontrollert for skader?',
          'Er støvmaske og hørselvern tilgjengelig?',
          'Er tunge løft planlagt med hjelpemidler?'
        ]
      },
      {
        id: 'ks',
        title: 'Kvalitetssikring (KS)',
        items: [
          'Er fuktmåling i treverk utført (< 15%)?',
          'Er isolasjon lagt uten glipper eller sammenpressing?',
          'Er dampsperre montert med klemte skjøter?',
          'Er vindtetting utført i henhold til detaljtegning?'
        ]
      },
      {
        id: 'environment',
        title: 'Miljø & Avfall',
        items: [
          'Er trevirke sortert separat?',
          'Er kapp og svinn minimert?',
          'Er farlig avfall (f.eks. lim/fug) håndtert korrekt?'
        ]
      }
    ]
  },
  plumber: {
    title: 'Rørlegger',
    categories: [
      {
        id: 'hms',
        title: 'HMS & Sikkerhet',
        items: [
          'Er gassflasker lagret og sikret korrekt?',
          'Er verneutstyr for sveising/lodding tilgjengelig?',
          'Er fare for vannskade vurdert ved arbeid på rør?',
          'Er hulltaking kontrollert mot bærende konstruksjoner?'
        ]
      },
      {
        id: 'ks',
        title: 'Kvalitetssikring (KS)',
        items: [
          'Er trykktesting utført og dokumentert?',
          'Er rør-i-rør system montert med fall til skap?',
          'Er sluk montert i riktig høyde og faststøpt?',
          'Er lekkasjesikring installert i rom uten sluk?'
        ]
      },
      {
        id: 'environment',
        title: 'Miljø & Avfall',
        items: [
          'Er kobber og metaller sortert for gjenvinning?',
          'Er kjemikalier for rensing håndtert forsvarlig?',
          'Er vannforbruk minimert under testing?'
        ]
      }
    ]
  },
  electrician: {
    title: 'Elektriker',
    categories: [
      {
        id: 'hms',
        title: 'HMS & Sikkerhet',
        items: [
          'Er spenningsløs tilstand bekreftet før arbeid?',
          'Er sikring mot gjeninnkobling iverksatt?',
          'Er isolert verktøy benyttet?',
          'Er lysforhold tilstrekkelig for sikkert arbeid?'
        ]
      },
      {
        id: 'ks',
        title: 'Kvalitetssikring (KS)',
        items: [
          'Er sluttkontroll (kontinuitet, isolasjon) utført?',
          'Er vern og kabeldimensjonering i henhold til NEK 400?',
          'Er merking av kurser og utstyr fullført?',
          'Er samsvarserklæring klargjort?'
        ]
      },
      {
        id: 'environment',
        title: 'Miljø & Avfall',
        items: [
          'Er EE-avfall sortert i egne bokser?',
          'Er kabelrester samlet inn for gjenvinning?',
          'Er emballasje kildesortert?'
        ]
      }
    ]
  },
  mason: {
    title: 'Murer',
    categories: [
      {
        id: 'hms',
        title: 'HMS & Sikkerhet',
        items: [
          'Er støvmaske benyttet ved blanding av tørrmørtel?',
          'Er ergonomi vurdert ved tunge løft av stein/blokk?',
          'Er stillas dimensjonert for vekten av materialer?',
          'Er øyevern tilgjengelig ved kapping av stein?'
        ]
      },
      {
        id: 'ks',
        title: 'Kvalitetssikring (KS)',
        items: [
          'Er temperatur og fuktighet innenfor krav ved støping?',
          'Er armering plassert med riktig overdekning?',
          'Er membran på våtrom kontrollert for tykkelse?',
          'Er fall til sluk kontrollert før flislegging?'
        ]
      },
      {
        id: 'environment',
        title: 'Miljø & Avfall',
        items: [
          'Er betong- og murrester håndtert som inert avfall?',
          'Er vaskevann fra verktøy håndtert uten utslipp?',
          'Er tomme sekker kildesortert?'
        ]
      }
    ]
  },
  painter: {
    title: 'Maler',
    categories: [
      {
        id: 'hms',
        title: 'HMS & Sikkerhet',
        items: [
          'Er god ventilasjon sikret ved bruk av løsemidler?',
          'Er brannfare ved oljefiller håndtert (selvantennelse)?',
          'Er verneutstyr mot sprøytetåke tilgjengelig?',
          'Er stiger og trapper sikret mot utglidning?'
        ]
      },
      {
        id: 'ks',
        title: 'Kvalitetssikring (KS)',
        items: [
          'Er underlag tørt og rent før behandling?',
          'Er glansgrad og fargekode i henhold til bestilling?',
          'Er antall strøk og tørketider overholdt?',
          'Er vedheft kontrollert på kritiske flater?'
        ]
      },
      {
        id: 'environment',
        title: 'Miljø & Avfall',
        items: [
          'Er malingsrester levert som farlig avfall?',
          'Er pensler og ruller rengjort i lukket system?',
          'Er vannbasert maling foretrukket der mulig?'
        ]
      }
    ]
  },
  general: {
    title: 'Generell',
    categories: [
      {
        id: 'hms',
        title: 'HMS & Sikkerhet',
        items: [
          'Er verneutstyr tilgjengelig og i bruk?',
          'Er rømningsveier frie for hindringer?',
          'Er stillas godkjent og kontrollert?',
          'Er førstehjelpsutstyr lett tilgjengelig?'
        ]
      },
      {
        id: 'ks',
        title: 'Kvalitetssikring (KS)',
        items: [
          'Er materialer i henhold til spesifikasjon?',
          'Er utførelse i henhold til tegning?',
          'Er fuktmåling utført og dokumentert?',
          'Er toleransekrav overholdt?'
        ]
      },
      {
        id: 'environment',
        title: 'Miljø & Avfall',
        items: [
          'Er avfall sortert i riktige containere?',
          'Er kjemikalier lagret forsvarlig?',
          'Er støvbegrensende tiltak iverksatt?',
          'Er støyende arbeid varslet?'
        ]
      }
    ]
  }
};
