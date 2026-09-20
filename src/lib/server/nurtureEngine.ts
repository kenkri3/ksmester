import { getCollectionItems, saveCollectionItem, updateCollectionItem } from './db';

export interface CustomerNurtureRecord {
  id: string;
  leadId: string;
  email: string;
  name: string;
  company: string;
  trade: string;
  plan: string;
  registeredAt: string;
  currentStep: number; // 0 = newly enrolled, 1 = day 3 sent, 2 = day 7 sent, 3 = day 14 sent, 4 = day 21 sent
  lastSentAt: string;
  status: 'active' | 'completed' | 'unsubscribed' | 'paused';
  unsubscribed?: boolean;
  unsubscribedAt?: string;
  history: Array<{
    step: number;
    title: string;
    sentAt: string;
    product: string;
  }>;
}

/**
 * Enrolls a newly registered customer into the autonomous nurture & upsell sequence.
 */
export async function enrollCustomerInNurture(lead: {
  id: string;
  email: string;
  name: string;
  company: string;
  trade: string;
  plan: string;
}): Promise<CustomerNurtureRecord> {
  const nurtureId = `nurture-${lead.id}`;
  const now = new Date().toISOString();

  // Sjekk om kunden allerede er meldt inn
  const allNurtures = await getCollectionItems('customer_nurtures');
  const existing = allNurtures.find(
    (n: any) => n.id === nurtureId || n.email?.toLowerCase() === lead.email.toLowerCase().trim()
  );
  if (existing) {
    return existing;
  }

  // Eksklusjonsliste: Kunder unntatt fra mersalg iht. instruks
  const isNoUpsellCustomer = 
    lead.email?.toLowerCase().includes("nonfoodgroup.no") ||
    lead.company?.toLowerCase().includes("nonfood");

  const record: CustomerNurtureRecord = {
    id: nurtureId,
    leadId: lead.id,
    email: lead.email.toLowerCase().trim(),
    name: lead.name || 'Håndverker',
    company: lead.company || 'Bedriften',
    trade: lead.trade || 'Byggmester',
    plan: lead.plan || 'VikingMester',
    registeredAt: now,
    currentStep: 0, // Dag 0: Velkomstepost sendes umiddelbart via /api/lead
    lastSentAt: now,
    status: 'active',
    unsubscribed: false,
    history: [
      {
        step: 0,
        title: 'Velkommen & Onboarding VikingMester',
        sentAt: now,
        product: 'VikingMester'
      }
    ]
  };

  await saveCollectionItem('customer_nurtures', record);
  return record;
}

/**
 * Kjører den daglige autonome evalueringen for mersalg og oppfølging.
 * Triggere: Dag 3 (B2B Salgsagent), Dag 7 (Samspill & HMS), Dag 14 (Doffin), Dag 21 (Qognito).
 */
export async function processAutonomousNurtureSequence(): Promise<{
  processedCount: number;
  emailsSentCount: number;
  details: string[];
}> {
  const resendKey = process.env.RESEND_API_KEY || process.env.RESEND_API || process.env.RESEND_KEY;
  const fromEmail = process.env.EMAIL_FROM || process.env.RESEND_FROM || 'VikingMester <hei@vikingmester.no>';
  const appUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://vikingmester.no';

  if (!resendKey) {
    console.warn('[Nurture Engine] Ingen Resend API-nøkkel funnet i miljøet. E-poster hoppes over inntil Resend er konfigurert.');
    return {
      processedCount: 0,
      emailsSentCount: 0,
      details: ['Ingen Resend API-nøkkel']
    };
  }

  const allNurtures = await getCollectionItems('customer_nurtures');
  const activeNurtures: CustomerNurtureRecord[] = allNurtures.filter(
    (n: any) => n.status === 'active' && !n.unsubscribed && n.email
  );

  let emailsSentCount = 0;
  const details: string[] = [];
  const now = new Date();

  for (const item of activeNurtures) {
    try {
      // Sikkerhetssperre: Blokker automatisk mersalg til unntatte kunder (f.eks. NonFoodGroup / Lars Erik)
      if (
        item.email?.toLowerCase().includes("nonfoodgroup.no") ||
        item.company?.toLowerCase().includes("nonfood") ||
        item.status === "completed" ||
        item.unsubscribed
      ) {
        continue;
      }
      const regDate = new Date(item.registeredAt);
      const diffMs = now.getTime() - regDate.getTime();
      const daysSinceRegistration = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      // Beskyttelse mot dobbeltsending samme dag (18 timers cooldown)
      if (item.lastSentAt) {
        const lastSentMs = now.getTime() - new Date(item.lastSentAt).getTime();
        if (lastSentMs < 18 * 60 * 60 * 1000) {
          continue;
        }
      }

      // Steg 1: Dag 3 (Mersalg: Autonom B2B Salgs- & Møtebookingsagent for håndverkere)
      if (daysSinceRegistration >= 3 && item.currentStep === 0) {
        await sendEmailViaResend({
          resendKey,
          from: fromEmail,
          to: item.email,
          subject: `Kapasitet neste måned? Slik fyller du ordreboken for ${item.company}`,
          html: getNurtureEmailHtmlStep1(item, appUrl)
        });

        const updatedHistory = [
          ...(item.history || []),
          {
            step: 1,
            title: 'Mersalg Spydspiss #1: Autonom B2B Salgsagent',
            sentAt: new Date().toISOString(),
            product: 'B2B Salgsagent Vikingnet'
          }
        ];

        await updateCollectionItem('customer_nurtures', item.id, {
          currentStep: 1,
          lastSentAt: new Date().toISOString(),
          history: updatedHistory
        });

        emailsSentCount++;
        details.push(`[Steg 1 - Dag 3] Salgsagent pitch sendt til ${item.email} (${item.company})`);
      }

      // Steg 2: Dag 7 (Mersalg: Samspill Varslingskanal AML § 2A & Kursmarkedet HMS-kurs)
      else if (daysSinceRegistration >= 7 && item.currentStep === 1) {
        await sendEmailViaResend({
          resendKey,
          from: fromEmail,
          to: item.email,
          subject: `Lovpålagt varslingskanal (AML § 2A-3) og HMS-kurs for ${item.company}`,
          html: getNurtureEmailHtmlStep2(item, appUrl)
        });

        const updatedHistory = [
          ...(item.history || []),
          {
            step: 2,
            title: 'Mersalg Samspill & Lovpålagt HMS',
            sentAt: new Date().toISOString(),
            product: 'Samspill & Kursmarkedet'
          }
        ];

        await updateCollectionItem('customer_nurtures', item.id, {
          currentStep: 2,
          lastSentAt: new Date().toISOString(),
          history: updatedHistory
        });

        emailsSentCount++;
        details.push(`[Steg 2 - Dag 7] Samspill & HMS pitch sendt til ${item.email} (${item.company})`);
      }

      // Steg 3: Dag 14 (Mersalg: Doffin Anbudsovervåking for håndverkere)
      else if (daysSinceRegistration >= 14 && item.currentStep === 2) {
        await sendEmailViaResend({
          resendKey,
          from: fromEmail,
          to: item.email,
          subject: `Offentlige byggeanbud i ditt fylke (Doffin vakt for ${item.company})`,
          html: getNurtureEmailHtmlStep3(item, appUrl)
        });

        const updatedHistory = [
          ...(item.history || []),
          {
            step: 3,
            title: 'Mersalg Doffin Anbudsvakt',
            sentAt: new Date().toISOString(),
            product: 'Doffin Anbudsvakt Vikingnet'
          }
        ];

        await updateCollectionItem('customer_nurtures', item.id, {
          currentStep: 3,
          lastSentAt: new Date().toISOString(),
          history: updatedHistory
        });

        emailsSentCount++;
        details.push(`[Steg 3 - Dag 14] Doffin pitch sendt til ${item.email} (${item.company})`);
      }

      // Steg 4: Dag 21 (Mersalg: Qognito LinkedIn Møtebooking mot Borettslag & Næring)
      else if (daysSinceRegistration >= 21 && item.currentStep === 3) {
        await sendEmailViaResend({
          resendKey,
          from: fromEmail,
          to: item.email,
          subject: `Direkte kontakt med styreledere og eiendomsbesittere (Qognito pilot kr 500,-)`,
          html: getNurtureEmailHtmlStep4(item, appUrl)
        });

        const updatedHistory = [
          ...(item.history || []),
          {
            step: 4,
            title: 'Mersalg Qognito LinkedIn',
            sentAt: new Date().toISOString(),
            product: 'Qognito Pilot'
          }
        ];

        await updateCollectionItem('customer_nurtures', item.id, {
          currentStep: 4,
          status: 'completed',
          lastSentAt: new Date().toISOString(),
          history: updatedHistory
        });

        emailsSentCount++;
        details.push(`[Steg 4 - Dag 21] Qognito pilot pitch sendt til ${item.email} (${item.company})`);
      }
    } catch (err: any) {
      console.warn(`Feil under nurture for ${item.email}:`, err.message);
    }
  }

  return {
    processedCount: activeNurtures.length,
    emailsSentCount,
    details
  };
}

async function sendEmailViaResend({
  resendKey,
  from,
  to,
  subject,
  html
}: {
  resendKey: string;
  from: string;
  to: string;
  subject: string;
  html: string;
}) {
  let activeFrom = from;
  let res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${resendKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: activeFrom,
      reply_to: 'hei@vikingmester.no',
      to: [to],
      subject,
      html
    }),
    signal: AbortSignal.timeout(6000)
  });

  if (!res.ok) {
    const errText = await res.text();
    const lowerErr = errText.toLowerCase();
    const isDomainError = 
      res.status === 403 || 
      res.status === 422 || 
      lowerErr.includes('not verified') || 
      lowerErr.includes('domain') || 
      lowerErr.includes('onboarding@resend.dev');

    if (isDomainError && !activeFrom.includes('onboarding@resend.dev')) {
      activeFrom = 'VikingMester <onboarding@resend.dev>';
      res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: activeFrom,
          reply_to: 'hei@vikingmester.no',
          to: [to],
          subject,
          html
        }),
        signal: AbortSignal.timeout(6000)
      });
      if (!res.ok) {
        const retryErr = await res.text();
        throw new Error(`Resend API error (${res.status}): ${retryErr}`);
      }
      return;
    }

    throw new Error(`Resend API error (${res.status}): ${errText}`);
  }
}

// EMAIL TEMPLATES MED UNMSUBSCRIBE LENKE

function getFooterHtml(item: CustomerNurtureRecord, appUrl: string): string {
  const unsubUrl = `${appUrl}/api/unsubscribe?id=${item.id}&email=${encodeURIComponent(item.email)}`;
  return `
    <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #E2E8F0; font-size: 12px; color: #64748B;">
      Med vennlig hilsen,<br>
      <strong>Kenneth & Teamet i VikingMester</strong><br>
      <a href="mailto:hei@vikingmester.no" style="color: #8B5CF6; text-decoration: none;">hei@vikingmester.no</a> • <a href="https://vikingnet.no" style="color: #64748B; text-decoration: none;">vikingnet.no</a>
      <p style="font-size: 11px; color: #94A3B8; margin-top: 16px;">
        Du mottar dette tipset som registrert kunde av VikingMester. Ønsker du ikke å motta tips om våre andre B2B-løsninger? <a href="${unsubUrl}" style="color: #94A3B8; text-decoration: underline;">Meld deg av her</a>.
      </p>
    </div>
  `;
}

function getNurtureEmailHtmlStep1(item: CustomerNurtureRecord, appUrl: string): string {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; color: #171717; line-height: 1.6; padding: 24px;">
      <div style="border-bottom: 2px solid #8B5CF6; padding-bottom: 12px; margin-bottom: 20px;">
        <h3 style="color: #0F172A; margin: 0; font-size: 20px;">Hvordan går det med VikingMester, ${item.name}?</h3>
        <p style="color: #8B5CF6; font-weight: bold; margin: 4px 0 0 0; font-size: 13px;">Vikingnet • Autonome B2B Tjenester</p>
      </div>

      <p>Hei ${item.name},</p>
      <p>Vi håper du har kommet godt i gang med byggedagboken og prosjektstyringen i VikingMester for <strong>${item.company}</strong>!</p>
      
      <p>Mange av håndverkerne vi samarbeider med opplever at det å styre byggeplassen er én ting – men å kontinuerlig <strong>fylle opp ordreboken med lønnsomme oppdrag og befaringer</strong> uten å bruke kvelder på manuell oppsøkende kontakt, er en annen utfordring.</p>

      <div style="background: #F8FAFC; border: 1px solid #E2E8F0; padding: 18px; border-radius: 12px; margin: 20px 0;">
        <h4 style="margin: 0 0 8px 0; color: #0F172A; font-size: 15px;">🚀 Vår Autonome B2B Salgsagent (Vikingnet)</h4>
        <p style="margin: 0 0 10px 0; font-size: 13px; color: #334155;">
          Vi drifter en dedikert AI-salgsagent som jobber 24/7 for byggmestere og entreprenører:
        </p>
        <ul style="margin: 0; padding-left: 20px; font-size: 13px; color: #334155;">
          <li>Finner og kontakter eiendomsutviklere, arkitekter og boligeiere i ditt distrikt.</li>
          <li>Kvalifiserer henvendelsene og booker befaringer direkte inn i kalenderen din.</li>
          <li>Holder all dialog asynkront på e-post – du møter kun opp på ferdig bookede befaringer.</li>
        </ul>
      </div>

      <p style="font-size: 14px;">Har dere ledig kapasitet de neste 1–3 månedene som dere ønsker å fylle?</p>
      <p style="font-size: 14px;">Svar bare med et kort <strong>«Ja, vis meg en skisse»</strong> på denne e-posten, så setter vi opp et uforpliktende utkast tilpasset ${item.trade} i deres område.</p>

      ${getFooterHtml(item, appUrl)}
    </div>
  `;
}

function getNurtureEmailHtmlStep2(item: CustomerNurtureRecord, appUrl: string): string {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; color: #171717; line-height: 1.6; padding: 24px;">
      <div style="border-bottom: 2px solid #10B981; padding-bottom: 12px; margin-bottom: 20px;">
        <h3 style="color: #0F172A; margin: 0; font-size: 20px;">Er ${item.company} ajour med lovkravene i 2026?</h3>
        <p style="color: #10B981; font-weight: bold; margin: 4px 0 0 0; font-size: 13px;">Samspill & Kursmarkedet • Lovpålagt HMS</p>
      </div>

      <p>Hei ${item.name},</p>
      <p>Visste du at Arbeidstilsynet har skjerpet kontrollene for bygg- og anleggsbransjen i 2026?</p>

      <p>Det stilles nå strenge krav til to spesifikke punkter for alle håndverkerbedrifter:</p>

      <div style="background: #F0FDF4; border: 1px solid #BBF7D0; padding: 18px; border-radius: 12px; margin: 20px 0;">
        <h4 style="margin: 0 0 8px 0; color: #065F46; font-size: 15px;">1. Lovpålagt varslingskanal (Arbeidsmiljøloven § 2A-3)</h4>
        <p style="margin: 0 0 10px 0; font-size: 13px; color: #166534;">
          Alle virksomheter med minst 5 ansatte plikter å ha skriftlige rutiner og en uavhengig, konfidensiell varslingskanal.
        </p>
        <p style="margin: 0; font-size: 13px; color: #166534;">
          Gjennom vårt produkt <strong>Samspill</strong> får dere komplett varslingsportal ferdig oppsatt for kun <strong>kr 249,-/mnd</strong> (ingen etableringsgebyr for VikingMester-kunder).
        </p>
      </div>

      <div style="background: #F8FAFC; border: 1px solid #E2E8F0; padding: 18px; border-radius: 12px; margin: 20px 0;">
        <h4 style="margin: 0 0 8px 0; color: #0F172A; font-size: 15px;">2. HMS for ledere (AML § 3-5) & Verneombudskurs</h4>
        <p style="margin: 0; font-size: 13px; color: #334155;">
          Gjennom <strong>Kursmarkedet</strong> tilbyr vi fleksible, godkjente nettkurs med kursbevis på dagen.
        </p>
      </div>

      <p style="font-size: 14px;">Trenger dere å få dette på plass før neste tilsyn eller anbudsrunde?</p>
      <p style="font-size: 14px;">Svar <strong>«Samspill»</strong> på denne e-posten, så aktiverer vi varslingskanalen for ${item.company} innen 24 timer.</p>

      ${getFooterHtml(item, appUrl)}
    </div>
  `;
}

function getNurtureEmailHtmlStep3(item: CustomerNurtureRecord, appUrl: string): string {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; color: #171717; line-height: 1.6; padding: 24px;">
      <div style="border-bottom: 2px solid #3B82F6; padding-bottom: 12px; margin-bottom: 20px;">
        <h3 style="color: #0F172A; margin: 0; font-size: 20px;">Offentlige rammeavtaler og anbud, ${item.name}?</h3>
        <p style="color: #3B82F6; font-weight: bold; margin: 4px 0 0 0; font-size: 13px;">Doffin Anbudsovervåking • Vikingnet</p>
      </div>

      <p>Hei ${item.name},</p>
      <p>Hver eneste uke lyses det ut kommunale og fylkeskommunale anbud innen ${item.trade.toLowerCase()} på Doffin (skoler, barnehager, vedlikehold og oppgraderinger).</p>

      <p>Mange håndverkere går glipp av disse fordi Doffin er uoversiktlig og tidkrevende å tråle manuelt hver morgen.</p>

      <div style="background: #EFF6FF; border: 1px solid #BFDBFE; padding: 18px; border-radius: 12px; margin: 20px 0;">
        <h4 style="margin: 0 0 8px 0; color: #1E40AF; font-size: 15px;">📋 Autonom Doffin-Vakt for ${item.company}</h4>
        <p style="margin: 0 0 10px 0; font-size: 13px; color: #1E3A8A;">
          Vår AI overvåker Doffin kontinuerlig og filtrerer ut kun de anbudene som er relevante for dere:
        </p>
        <ul style="margin: 0; padding-left: 20px; font-size: 13px; color: #1E3A8A;">
          <li>Ferdig oppsummert sammendrag av krav, frister og kvalifikasjonskrav rett i innboksen.</li>
          <li>Kriteriesjekk: Matcher kravene mot deres godkjenninger og bemanning.</li>
          <li>Ingen bortkastet tid på irrelevante gigantanbud.</li>
        </ul>
      </div>

      <p style="font-size: 14px;">Vil du at vi skal koble opp en gratis 14-dagers prøve på Doffin-vakten for deres fagfelt?</p>
      <p style="font-size: 14px;">Svar med <strong>«Doffin»</strong>, så sender vi ukens relevante utlysninger for deres fylke.</p>

      ${getFooterHtml(item, appUrl)}
    </div>
  `;
}

function getNurtureEmailHtmlStep4(item: CustomerNurtureRecord, appUrl: string): string {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; color: #171717; line-height: 1.6; padding: 24px;">
      <div style="border-bottom: 2px solid #8B5CF6; padding-bottom: 12px; margin-bottom: 20px;">
        <h3 style="color: #0F172A; margin: 0; font-size: 20px;">Direkte kontakt med styreledere og utbyggere</h3>
        <p style="color: #8B5CF6; font-weight: bold; margin: 4px 0 0 0; font-size: 13px;">Qognito B2B LinkedIn Outreach</p>
      </div>

      <p>Hei ${item.name},</p>
      <p>Visste du at over 70 % av styreledere i borettslag, næringseiendommer og eiendomsutviklere er aktive på LinkedIn ukentlig?</p>

      <p>Med vår LinkedIn-agent <strong>Qognito</strong> oppsøker vi beslutningstakere direkte på en personlig og profesjonell måte for å etablere dialog om fremtidige vedlikeholds- og rehabiliteringsprosjekter.</p>

      <div style="background: #F8FAFC; border: 1px solid #E2E8F0; padding: 18px; border-radius: 12px; margin: 20px 0;">
        <h4 style="margin: 0 0 8px 0; color: #0F172A; font-size: 15px;">🎯 Eksklusivt tilbud for VikingMester-kunder:</h4>
        <p style="margin: 0 0 8px 0; font-size: 13px; color: #334155;">
          Test Qognito i en hel måned for kun <strong>kr 500,- eks. mva.</strong> (ordinært kr 1 490,-/mnd, ingen bindingstid).
        </p>
        <p style="margin: 0; font-size: 13px; color: #64748B;">
          Vi setter opp målgruppen for ditt distrikt, skriver meldingssekvensene og kobler til agenten.
        </p>
      </div>

      <p style="font-size: 14px;">Vil du teste piloten på 500 kr for ${item.company}?</p>
      <p style="font-size: 14px;">Svar bare <strong>«Pilot»</strong> på denne e-posten, så klargjør vi oppsettet.</p>

      ${getFooterHtml(item, appUrl)}
    </div>
  `;
}
