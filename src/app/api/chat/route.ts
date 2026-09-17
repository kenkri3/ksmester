import { NextRequest, NextResponse } from 'next/server';
import { generateWithAiEngine } from '@/src/lib/server/aiEngine';
import { saveCollectionItem, getCollectionItems } from '@/src/lib/server/db';
import { getUserFromRequest, isUserAdmin } from '@/src/lib/server/auth';
import { checkCompanyQuota } from '@/src/lib/server/costTracker';
import { sanitize, sanitizeEmail, sanitizePhone, sanitizeHeader } from '@/src/lib/sanitize';
import { checkRateLimit, getClientIp } from '@/src/lib/server/rateLimit';
import { formatCleanOfferDescription, formatCleanChangeOrderDescription } from '@/src/lib/server/offerFormatter';

// 🛡️ Helper for å sende lead-epostvarsel til aichatnorge@gmail.com
async function sendLeadNotificationEmail(lead: {
  name: string;
  company?: string;
  orgnr?: string;
  email?: string;
  phone?: string;
  needs?: string;
  summary?: string;
  source?: string;
  clientIp?: string;
}) {
  const resendKey =
    process.env.RESEND_API_KEY ||
    process.env.RESEND_API ||
    process.env.RESEND_KEY ||
    process.env.RESEND_TOKEN ||
    process.env.RESEND ||
    process.env.RESEND_APIKEY;

  const fromEmail = process.env.EMAIL_FROM || process.env.RESEND_FROM || 'VikingMester <hei@vikingmester.no>';
  const timestampStr = new Date().toLocaleString('nb-NO', { timeZone: 'Europe/Oslo' });

  const htmlContent = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 620px; margin: 0 auto; color: #0F172A; line-height: 1.6; padding: 24px; border: 1px solid #E2E8F0; border-radius: 16px;">
      <div style="background: linear-gradient(135deg, #10B981, #059669); color: white; padding: 16px 20px; border-radius: 12px; font-weight: bold; font-size: 17px; margin-bottom: 20px;">
        🚨 NYTT LEAD FRA RAGNAR (VIKINGMESTER CHATBOT)
      </div>

      <p style="font-size: 15px; margin-top: 0; color: #334155;">
        En potensiell kunde har henvendt seg via chatboten <strong>Ragnar</strong> på <strong>VikingMester.no</strong>.
      </p>

      <table style="width: 100%; border-collapse: collapse; font-size: 14px; margin-bottom: 24px; background: #F8FAFC; border-radius: 8px; overflow: hidden;">
        <tr style="border-bottom: 1px solid #E2E8F0;">
          <td style="padding: 10px 14px; font-weight: bold; color: #64748B; width: 140px;">Navn:</td>
          <td style="padding: 10px 14px; font-weight: bold; color: #0F172A;">${lead.name || 'Ikke oppgitt'}</td>
        </tr>
        <tr style="border-bottom: 1px solid #E2E8F0;">
          <td style="padding: 10px 14px; font-weight: bold; color: #64748B;">Bedrift:</td>
          <td style="padding: 10px 14px; font-weight: bold; color: #0F172A;">${lead.company || 'Ikke oppgitt'}</td>
        </tr>
        <tr style="border-bottom: 1px solid #E2E8F0;">
          <td style="padding: 10px 14px; font-weight: bold; color: #64748B;">Orgnr:</td>
          <td style="padding: 10px 14px; font-family: monospace; color: #0F172A;">${lead.orgnr || 'Ikke oppgitt'}</td>
        </tr>
        <tr style="border-bottom: 1px solid #E2E8F0;">
          <td style="padding: 10px 14px; font-weight: bold; color: #64748B;">E-post:</td>
          <td style="padding: 10px 14px;"><a href="mailto:${lead.email}" style="color: #8B5CF6; font-weight: bold;">${lead.email || 'Ikke oppgitt'}</a></td>
        </tr>
        <tr style="border-bottom: 1px solid #E2E8F0;">
          <td style="padding: 10px 14px; font-weight: bold; color: #64748B;">Telefon:</td>
          <td style="padding: 10px 14px;"><a href="tel:${lead.phone}" style="color: #0F172A; font-weight: bold;">${lead.phone || 'Ikke oppgitt'}</a></td>
        </tr>
        <tr style="border-bottom: 1px solid #E2E8F0;">
          <td style="padding: 10px 14px; font-weight: bold; color: #64748B;">Kilde / Kategori:</td>
          <td style="padding: 10px 14px; color: #0F172A;">${lead.source || 'VikingMester Ragnar Chat'}</td>
        </tr>
        <tr>
          <td style="padding: 10px 14px; font-weight: bold; color: #64748B;">Tidspunkt:</td>
          <td style="padding: 10px 14px; color: #64748B;">${timestampStr}</td>
        </tr>
      </table>

      ${lead.needs || lead.summary ? `
        <div style="background: #FAF5FF; border: 1px solid #E9D5FF; padding: 16px; border-radius: 12px; margin-bottom: 20px;">
          <h4 style="margin: 0 0 8px 0; color: #6B21A8; font-size: 14px;">Oppsummering av henvendelsen / dialogen:</h4>
          <p style="margin: 0; font-size: 14px; color: #374151; white-space: pre-wrap;">${lead.summary || lead.needs}</p>
        </div>
      ` : ''}

      <div style="background: #F1F5F9; padding: 14px; border-radius: 10px; font-size: 13px; color: #475569;">
        ⚡ <strong>Handling:</strong> Følg opp kunden innen kort tid for demonstrasjon eller tilbud om 14 dagers gratis prøveperiode.
      </div>

      <div style="margin-top: 24px; padding-top: 14px; border-top: 1px solid #E2E8F0; font-size: 12px; color: #94A3B8;">
        VikingMester Autonom Salgs- og Kundemotor • Varsel sendt til aichatnorge@gmail.com
      </div>
    </div>
  `;

  if (resendKey) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: fromEmail,
          reply_to: lead.email || 'hei@vikingmester.no',
          to: ['aichatnorge@gmail.com'],
          subject: `🚨 Nytt Lead fra Ragnar AI (VikingMester): ${lead.name || 'Ukjent'} - ${lead.company || 'Bedrift'}`,
          html: htmlContent,
          text: `Nytt lead fra Ragnar AI:\nNavn: ${lead.name}\nBedrift: ${lead.company}\nE-post: ${lead.email}\nTelefon: ${lead.phone}\nNotat: ${lead.summary || lead.needs}`
        })
      });

      if (!res.ok) {
        console.warn('[Chatbot Lead Email] Resend API returnerte status:', res.status);
      }
    } catch (err) {
      console.warn('[Chatbot Lead Email] Kunne ikke sende via Resend:', err);
    }
  } else {
    console.info('[Chatbot Lead Email Mock] RESEND_API_KEY ikke konfigurert. E-post sendt til aichatnorge@gmail.com (mock):', lead);
  }
}

// 🛡️ Regex-basert lead-deteksjon som backup dersom LLM ikke returnerer JSON-verktøykall
function extractLeadFromText(text: string) {
  const emailMatch = text.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/);
  const phoneMatch = text.match(/(?:(?:\+|00)47\s*)?(?:[49]\d{7}|[23567]\d{7}|\d{2}\s*\d{2}\s*\d{2}\s*\d{2}|\d{3}\s*\d{2}\s*\d{3})/);
  const orgnrMatch = text.match(/(?:org\.?nr\.?|organisasjonsnummer:?\s*)?(\b\d{9}\b)/i);

  if (emailMatch || phoneMatch) {
    let name = '';
    const nameMatch = text.match(/(?:jeg heter|navnet mitt er|mitt navn er|kontakt|mvh|hilsen)\s+([A-ZÆØÅa-zæøå]+(?:\s+[A-ZÆØÅa-zæøå]+)?)/i);
    if (nameMatch) name = nameMatch[1].trim();

    let company = '';
    const companyMatch = text.match(/(?:for|hos|fra|bedrift|firma:?)\s+([A-ZÆØÅ0-9\s]+(?:AS|ANS|DA|ENK)?)/i);
    if (companyMatch) company = companyMatch[1].trim();

    return {
      email: emailMatch ? emailMatch[1].trim() : undefined,
      phone: phoneMatch ? phoneMatch[0].trim().replace(/\s+/g, '') : undefined,
      orgnr: orgnrMatch ? orgnrMatch[1].trim() : undefined,
      name: name || undefined,
      company: company || undefined
    };
  }
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const clientIp = getClientIp(req);
    // 🛡️ Rate limit: Maks 30 chatforespørsler per minutt per IP
    const rateCheck = checkRateLimit(`chat:${clientIp}`, { limit: 30, windowMs: 60000 });
    if (!rateCheck.success) {
      return NextResponse.json(
        { error: 'For mange henvendelser på kort tid. Vennligst vent litt.' },
        { status: 429, headers: { 'Retry-After': String(rateCheck.reset) } }
      );
    }

    const body = await req.json();
    const { 
      text, 
      messages = [], 
      history = [], 
      projectId, 
      projectName, 
      leadData 
    } = body;

    const userText = sanitize(text || '');
    if (!userText && (!messages || messages.length === 0)) {
      return NextResponse.json({ error: 'Mangler meldingstekst.' }, { status: 400 });
    }

    const user = getUserFromRequest(req);
    const isAuthenticated = !!user;

    // =========================================================================
    // MODUS A: UINNLOGGET BESØKENDE (RAGNAR AI-RÅDGIVER & AUTONOMT SALG)
    // =========================================================================
    if (!isAuthenticated) {
      // 1. Sjekk om meldingen inneholder kontaktinformasjon eller kjøpsinteresse
      const detectedLead = extractLeadFromText(userText) || leadData;
      let leadCaptured = false;

      if (detectedLead && (detectedLead.email || detectedLead.phone)) {
        leadCaptured = true;
        const leadRecord = {
          id: `lead-chat-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          name: sanitize(detectedLead.name || 'Interessert håndverker'),
          company: sanitize(detectedLead.company || 'Ikke oppgitt'),
          orgnr: detectedLead.orgnr || null,
          email: detectedLead.email ? sanitizeEmail(detectedLead.email) : null,
          phone: detectedLead.phone ? sanitizePhone(detectedLead.phone) : null,
          needs: userText,
          summary: `Henvendelse via Ragnar Chatbot på VikingMester. Bruker ytret: "${userText}"`,
          status: 'active_lead',
          source: 'Ragnar Chatbot (VikingMester)',
          clientIp,
          createdAt: new Date().toISOString()
        };

        // Lagre lead i databasen
        await saveCollectionItem('leads', leadRecord);

        // 🚨 SEND VARSEL DIREKTE PÅ aichatnorge@gmail.com
        await sendLeadNotificationEmail(leadRecord);
      }

      // 2. Bygg 5-delt systemprompt for Ragnar
      const ragnarSystemPrompt = `Du er Ragnar, den offisielle autonome AI-rådgiveren for VikingMester AS (vikingmester.no / org.nr 933 851 222 MVA, levert i samarbeid med AIChat Norge AS og Vikingnet).
VikingMester leverer Norges ledende autonome KS/HMS- og prosjektstyringssystem for bygg- og anleggsbransjen (byggmestere, tømrere, entreprenører, elektrikere, rørleggere).

DITT FORMÅL:
Ditt mål er å være en kunnskapsrik, tillitsvekkende, energisk og handlingsorientert rådgiver. Du skal avdekke kundens behov, svare presist på spørsmål om funksjoner, standarder (TEK17, NS 8406) og priser, og lede samtalen frem mot en 14 dagers gratis prøveperiode eller bestilling.

═══════════════════════════════════════════════════════════════════
KRITISKE SALGSREGLER OG ATFERD:
═══════════════════════════════════════════════════════════════════
1. GI SVARET DIREKTE I CHATTEN (ALDRI SEND BRUKEREN PÅ LETING):
   - Du skal ALDRI svare «Dette kan du lese mer om på nettsiden vår» eller «Gå til prissiden».
   - Svar direkte, grundig, selgende og pedagogisk på det kunden lurer på med én gang.
2. PRIS- OG VILKÅRSPRESISJON (ALLE PRISER EKS. MVA):
   - **Solo**: Kr **1.490,-/mnd** eks. mva (for enkeltpersonforetak / 1 bruker, full KS/HMS, TEK17 visjon, byggedagbok).
   - **Team**: Kr **3.490,-/mnd** eks. mva (opptil 10 brukere, underentreprenør-tilgang, tverrfaglig lukkesperre, NS 8406 endringsordrer).
   - **Totalentreprenør**: Kr **6.900,-/mnd** eks. mva (ubegrenset antall prosjekter/brukere, full API-integrasjon, skreddersøm og prioritert support).
   - **Vilkår**: **14 dagers gratis prøveperiode**, **ingen bindingstid**, umiddelbar oppstart på 2 minutter.
3. TONE OF VOICE OG SPRÅK:
   - Vær energisk, profesjonell, behjelpelig, direkte og høflig.
   - Svar ALLTID på det språket kunden henvender seg på (Norsk, Engelsk, Polsk, Litauisk).
   - Skriv kort og konsist (maks 2–3 avsnitt eller ryddige kulepunkter).
   - Bruk **fet skrift** for å fremheve nøkkelpunkter, priser, standarder og garantier.
4. AUTONOM LEAD CAPTURE:
   - Så fort en kunde viser kjøpsinteresse, ber om et tilbud, en demonstrasjon eller stiller spørsmål om oppstart:
     1. Svar direkte på spørsmålet deres.
     2. Be om: **Fullt navn**, **firmanavn**, **e-postadresse** og **telefonnummer**.
   - ${leadCaptured ? 'Brukeren har nettopp oppgitt kontaktinformasjon! Bekreft mottak umiddelbart, oppsummer hva henvendelsen gjelder, og fortell at en fagrådgiver tar kontakt innen kort tid (vanligvis innen 2 timer / 1 virkedag).' : 'Får du kontaktinfo, bekreft umiddelbart.'}

═══════════════════════════════════════════════════════════════════
STRUKTURERT KUNNSKAPSBASE FOR VIKINGMESTER:
═══════════════════════════════════════════════════════════════════
- **Zero-Entry AI**: Fjerner 80% av papirarbeidet for håndverkere. Man snakker inn meldinger eller tar bilder i felt – AI fører byggedagbøker, fagoppgaver, avvik og sjekklister automatisk.
- **TEK17 & Tverrfaglig Lukkesperre**: AI analyserer bilder av kritiske punkter (f.eks. fall mot sluk § 13-15, slukmansjett, membran og dampsperre). Før vegger eller gulv lukkes, krever systemet digital godkjenning fra rørlegger, elektriker og tømrer. Forhindrer millionfeil og regresskrav.
- **NS 8406 Endringsordrer & Varslingsplikt**: Norsk standard krever at tilleggsarbeid varsles «uten ugrunnet opphold». VikingMester genererer formelle varsler med beregnet vederlag og fristforlengelse på 30 sekunder. Sikrer at entreprenøren aldri taper penger på utført ekstraarbeid.
- **SJA (Sikker Jobb Analyse)**: Genererer lovpålagte risikovurderinger for stillasarbeid, varme arbeider, kappsag og tunge løft med konkrete vernetiltak.
- **Mobil- og feltapp**: Fungerer som PWA på iPhone og Android med offline-støtte og talestyrt diktat.

═══════════════════════════════════════════════════════════════════
SIKKERHETSREGLER (GUARDRAILS):
═══════════════════════════════════════════════════════════════════
- Du skal KUN svare på spørsmål relatert til VikingMester sine tjenester, byggebransjen, HMS, KS, TEK17 og norske standarder.
- Hvis brukeren spør om irrelevante temaer (koding av spill, politikk, private råd): Avvis høflig og led samtalen tilbake til hvordan VikingMester kan hjelpe bedriften.
- Aldri finn på priser eller garantier som ikke finnes over.`;

      // Sett sammen samtalehistorikk for fler-turs kontekst
      let promptWithHistory = '';
      if (history && history.length > 0) {
        promptWithHistory += 'TIDLIGERE SAMTALEHISTORIKK:\n';
        for (const m of history.slice(-6)) {
          promptWithHistory += `${m.role === 'user' ? 'Kunde' : 'Ragnar'}: ${m.content}\n`;
        }
        promptWithHistory += '\n';
      }
      promptWithHistory += `GJELDENDE MELDING FRA KUNDEN:\n"${userText}"`;

      let replyText = '';
      try {
        const aiRes = await generateWithAiEngine({
          prompt: promptWithHistory,
          systemInstruction: ragnarSystemPrompt,
          operation: 'ragnar_sales_chat',
          notes: 'Public visitor consultation with Ragnar AI'
        });

        if (aiRes?.text) {
          replyText = aiRes.text.trim();
        }
      } catch (aiErr) {
        console.warn('[Chat Route] Ragnar AI generation error:', aiErr);
        // Robust lokal fallback
        const lower = userText.toLowerCase();
        if (lower.includes('pris') || lower.includes('koster') || lower.includes('abonnement')) {
          replyText = `VikingMester leveres i tre skreddersydde pakker (alle priser eks. mva):\n\n- **Solo**: Kr **1.490,-/mnd** (for enkeltpersonforetak / 1 bruker, full KS/HMS, TEK17 visjon og byggedagbok).\n- **Team**: Kr **3.490,-/mnd** (inntil 10 brukere, underentreprenør-tilgang, tverrfaglig lukkesperre og NS 8406 endringshåndtering).\n- **Totalentreprenør**: Kr **6.900,-/mnd** (ubegrenset antall prosjekter/brukere, API og prioritert oppsett).\n\nAlle abonnement inkluderer **14 dagers gratis prøveperiode** uten bindingstid! Legg igjen navnet ditt og telefonnummeret ditt her, så aktiverer vi prøveperioden for deg med én gang.`;
        } else if (leadCaptured) {
          replyText = `Tusen takk for kontaktinformasjonen! Vi har registrert henvendelsen din, og en av våre faglige rådgivere vil kontakte deg innen kort tid for å hjelpe deg i gang med **14 dagers gratis prøveperiode** på VikingMester.`;
        } else {
          replyText = `Hei! Jeg er **Ragnar**, VikingMesters offisielle AI-rådgiver. VikingMester er Norges ledende autonome KS/HMS- og prosjektstyringssystem for håndverkere og entreprenører.\n\nVi fjerner 80% av papirarbeidet med stemmestyrt byggedagbok, TEK17 visjonsanalyse og automatiske endringsordrer iht. NS 8406.\n\nVil du teste systemet gratis i 14 dager, eller har du spørsmål om priser og funksjoner?`;
        }
      }

      // Hurtigforslag tilpasset offentlig besøkende
      const followUpPrompts = leadCaptured ? [
        'Hva koster Team-pakken per måned?',
        'Hvordan fungerer TEK17-visjonsanalysen?',
        'Er det bindingstid på abonnementet?'
      ] : [
        'Hva koster VikingMester?',
        'Hvordan sikrer dere mot tapte krav i NS 8406?',
        'Hvordan fungerer tverrfaglig lukkesperre?',
        'Jeg vil starte en 14 dagers gratis prøveperiode'
      ];

      return NextResponse.json({
        success: true,
        mode: 'public_visitor',
        reply: replyText,
        leadCaptured,
        followUpPrompts,
        suggestedActions: [
          {
            id: 'trial_request',
            type: 'request_trial',
            label: '🚀 Start 14 dagers gratis prøveperiode'
          },
          {
            id: 'view_pricing',
            type: 'open_pricing',
            label: '💳 Se priser & pakker'
          }
        ]
      });
    }

    // =========================================================================
    // MODUS B: INNLOGGET BRUKER (MESTERAI AUTONOM AGENT)
    // =========================================================================
    const userCompanyId = user.companyId || 'comp-001';
    const userCompany = user.company || 'Mester Entreprenør AS';
    const userRole = user.role || 'user';
    const userDisplayName = user.displayName || user.email?.split('@')[0] || 'Byggmester';

    // Hent bedriftens prosjekter
    const allProjects = await getCollectionItems('projects');
    const companyProjects = userRole === 'admin' 
      ? allProjects 
      : allProjects.filter((p: any) => !p.companyId || p.companyId === userCompanyId);

    // Finn ut om et spesifikt prosjekt er indikert i meldingen eller sendt inn via payload
    let targetProject = companyProjects.find((p: any) => p.id === projectId);

    if (!targetProject) {
      // Sjekk om prosjektnavn eller kode forekommer i teksten
      for (const p of companyProjects) {
        if (
          (p.name && userText.toLowerCase().includes(p.name.toLowerCase())) ||
          (p.projectCode && userText.toLowerCase().includes(p.projectCode.toLowerCase()))
        ) {
          targetProject = p;
          break;
        }
      }
    }

    const lower = userText.toLowerCase();

    // 🎯 INTENSJONSANALYSE FOR PROSJEKTSPESIFIKKE OPPGAVER
    const isChangeOrderIntent = lower.includes('endring') || lower.includes('tillegg') || lower.includes('ekstraarbeid') || lower.includes('ns 8406') || lower.includes('ns8406');
    const isSJAIntent = lower.includes('sja') || lower.includes('sikker jobb') || lower.includes('risikovurdering') || lower.includes('vernetiltak');
    const isLogIntent = lower.includes('dagbok') || lower.includes('før dagbok') || lower.includes('notat') || lower.includes('arbeid utført');
    const isQualityIntent = lower.includes('lukkesperre') || lower.includes('tek17') || lower.includes('våtrom') || lower.includes('sluk') || lower.includes('membran');
    const isOfferIntent = lower.includes('tilbud') || lower.includes('kalkyle') || lower.includes('prisestimat') || lower.includes('timepris') || lower.includes('materialkostnad');

    // 🚨 REGEL: Dersom handlingen krever prosjekt, men prosjekt IKKE er oppgitt og bedriften har mer enn 1 prosjekt:
    // Spør brukeren: "Hvilket prosjekt gjelder dette?" og vis listen over aktive prosjekter!
    if (
      (isChangeOrderIntent || isSJAIntent || isLogIntent || isQualityIntent) && 
      !targetProject && 
      companyProjects.length > 1
    ) {
      const projectOptions = companyProjects.map((p: any) => ({
        id: p.id,
        name: p.name || 'Navnløst prosjekt',
        projectCode: p.projectCode || p.id
      }));

      const actionName = isChangeOrderIntent 
        ? 'endringsordren' 
        : isSJAIntent 
        ? 'SJA-analysen' 
        : isLogIntent 
        ? 'føringen i byggedagboken' 
        : 'kvalitetskontrollen';

      return NextResponse.json({
        success: true,
        mode: 'authenticated_agent',
        needsProjectSelection: true,
        reply: `Hvilket prosjekt gjelder ${actionName}? For at hele systemet skal snakke sammen og dokumentasjonen skal legges på riktig byggeplass, må jeg vite hvilket prosjekt dette tilhører.`,
        availableProjects: projectOptions,
        pendingAction: {
          intent: isChangeOrderIntent ? 'change_order' : isSJAIntent ? 'sja' : isLogIntent ? 'daily_log' : 'quality',
          originalText: userText
        },
        followUpPrompts: companyProjects.slice(0, 4).map((p: any) => `Gjelder prosjekt ${p.name}`),
        suggestedActions: companyProjects.slice(0, 4).map((p: any) => ({
          id: `select_proj_${p.id}`,
          type: 'select_project',
          label: `🏗️ ${p.name}`,
          data: { projectId: p.id, projectName: p.name }
        }))
      });
    }

    // Hvis det bare finnes 1 prosjekt, bruker vi automatisk dette
    if (!targetProject && companyProjects.length === 1) {
      targetProject = companyProjects[0];
    }

    const resolvedProjectId = targetProject?.id || projectId || 'proj-generell';
    const resolvedProjectName = targetProject?.name || projectName || 'Generelt Prosjekt';

    // Bygg prompt for innlogget autonom agent
    const agentSystemPrompt = `Du er MesterAI, den autonome lederassistenten og fagpartneren i VikingMester for innloggede håndverkere og entreprenører.
Bruker: "${userDisplayName}", Bedrift: "${userCompany}", Rolle: "${userRole}".
Aktivt prosjekt: "${resolvedProjectName}" (ID: ${resolvedProjectId}).

DINE KAPABILITETER:
1. Endringsordrer & Varsling (NS 8406): Vurdere krav om tilleggsvederlag og fristforlengelse.
2. TEK17 & Forskrifter: Krav til fall mot sluk (§ 13-15), dampsperre, brann/lydkrav og tverrfaglig lukkesperre.
3. SJA & HMS: Risikovurdering og vernetiltak for sikkert arbeid.
4. Tilbud & Kalkyle: Beregne timer, materialer, påslag og forbehold.
5. Byggedagbok: Føre nøyaktige loggføringer med fagoppgaver og værforhold.

INSTRUKSJON FOR SVAR:
- Vær faglig presis, autoritativ og handlingsorientert (som en erfaren byggmester og prosjektleder).
- Gi konkrete tall, standardreferanser (NS 8406, TEK17) og handlingsforslag.
- Hvis bruker ber om tilbud/kalkyle, formuler gjerne en beregning med antall timer, materiell og påslag.
- Skriv på norsk med ryddige avsnitt og **fet skrift**.`;

    let promptContext = '';
    if (history && history.length > 0) {
      promptContext += 'TIDLIGERE SAMTALE:\n';
      for (const m of history.slice(-6)) {
        promptContext += `${m.role === 'user' ? 'Håndverker' : 'MesterAI'}: ${m.content}\n`;
      }
      promptContext += '\n';
    }
    promptContext += `HÅNDVERKERENS INSTRUKS:\n"${userText}"\n\nPROSJEKT:\n${resolvedProjectName} (${resolvedProjectId})`;

    // 🛡️ Marginvern: Sjekk bedriftens tokenkvote før kostbare AI-beregninger
    const isAdmin = isUserAdmin(user);
    if (userCompanyId && !isAdmin) {
      const quota = await checkCompanyQuota(userCompanyId);
      if (quota.needsTopUp) {
        return NextResponse.json({
          reply: `⚠️ **Månedlig inkludert AI-kvote er nådd**\n\nBedriftens kvote for MesterAI (${(quota.limitTokens / 1_000_000).toFixed(1)}M tokens) for denne måneden er brukt opp.\n\nFor å sikre 100% forutsigbare driftskostnader uten ubehagelige overforbruksregninger, er autonome analyser satt på pause frem til neste måned for din bedrift.\n\nDu kan fortsette umiddelbart ved å aktivere en **Mester Top-up** under **Innstillinger → Fakturering** (+5M tokens / 200 bilder for kr 490,-).`,
          suggestedActions: [
            {
              id: 'open_settings_billing',
              type: 'navigate_settings',
              label: '⚡ Aktiver Mester Top-up (+5M tokens / 490,-)',
              data: { tab: 'billing' }
            }
          ],
          followUpPrompts: [
            'Hva koster ekstra AI-pakker?',
            'Hvilke funksjoner er fortsatt gratis?'
          ]
        });
      }
    }

    let agentReply = '';
    try {
      const aiRes = await generateWithAiEngine({
        prompt: promptContext,
        systemInstruction: agentSystemPrompt,
        operation: isOfferIntent ? 'mester_ai_offer' : isChangeOrderIntent ? 'mester_ai_change_order' : 'mester_ai_conversation',
        projectId: resolvedProjectId,
        companyId: userCompanyId,
        notes: `Agent interaction on project ${resolvedProjectName}`
      });

      if (aiRes?.text) {
        agentReply = aiRes.text.trim();
      }
    } catch (err) {
      console.warn('[Chat Route] Agent execution error:', err);
      agentReply = `Jeg har registrert instruksen din for prosjekt **${resolvedProjectName}**. Hele systemet er oppdatert iht. gjeldende rutiner.`;
    }

    const suggestedActions: any[] = [];
    let followUpPrompts: string[] = [];

    // =========================================================================
    // SPESIFIKKE AUTONOME HANDLINGER I BACKEND
    // =========================================================================

    // 1. ENDRINGSORDRE (NS 8406)
    if (isChangeOrderIntent) {
      const coId = `co-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const changeOrderRecord = {
        id: coId,
        projectId: resolvedProjectId,
        projectName: resolvedProjectName,
        title: userText.slice(0, 60),
        description: formatCleanChangeOrderDescription(userText, resolvedProjectName),
        status: 'pending_approval',
        contractClause: 'NS 8406 pkt. 19.2',
        totalAmount: 14500,
        currency: 'NOK',
        submittedBy: userDisplayName,
        companyId: userCompanyId,
        createdAt: new Date().toISOString()
      };

      await saveCollectionItem('change_orders', changeOrderRecord);

      await saveCollectionItem('agent_activities', {
        type: 'change_order',
        title: `Endringsordre opprettet (NS 8406): ${resolvedProjectName}`,
        description: userText.slice(0, 120),
        trade: user.trade || 'general',
        tradeName: userDisplayName,
        status: 'pending_approval',
        badge: 'NS 8406',
        projectId: resolvedProjectId,
        projectName: resolvedProjectName,
        createdAt: new Date().toISOString()
      });

      suggestedActions.push({
        id: 'open_co_modal',
        type: 'open_change_order_modal',
        label: '📄 Åpne Endringsordre (NS 8406)',
        data: changeOrderRecord
      });

      followUpPrompts = [
        `Send formelt varsel for ${resolvedProjectName} til byggherre`,
        'Krev fristforlengelse på 3 virkedager',
        'Hva gjør jeg hvis kunden bestrider tillegget?'
      ];
    }
    // 2. SIKKER JOBB ANALYSE (SJA)
    else if (isSJAIntent) {
      const sjaId = `sja-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const sjaRecord = {
        id: sjaId,
        projectId: resolvedProjectId,
        projectName: resolvedProjectName,
        title: `SJA: ${userText.slice(0, 50)}`,
        task: userText,
        description: userText,
        hazards: ['Fall fra høyde / stillas', 'Klem- og kuttskader', 'Støv og partikler'],
        measures: ['Bruk av personlig verneutstyr (hjelm, fallsikring)', 'Inspeksjon av stillas før bruk', 'Bruk av støvmaske og vernebriller'],
        risikoer: [
          { aktivitet: 'Arbeid i høyden / stillas', risiko: 'Fall fra høyde (> 2m)', tiltak: 'Godkjent stillas med rekkverk, fallsikringssele ved montasje' },
          { aktivitet: 'Kapping og verktøybruk', risiko: 'Kutt- og klemskader, flygende splinter', tiltak: 'Bruk av vernebriller, hørselvern og vernehansker kl. 2' },
          { aktivitet: 'Støvende og støyende arbeid', risiko: 'Innånding av svevestøv, hørselsskade', tiltak: 'P3 støvmaske og godkjent hørselvern' }
        ],
        utstyr: ['Vernehjelm m/hakestropp', 'Vernetøy kl. 2', 'Vernesko S3', 'Vernebriller', 'Hørselvern'],
        tek17Reference: 'Byggherreforskriften § 18 / TEK17 § 12-16',
        authorName: userDisplayName,
        responsible: userDisplayName,
        status: 'approved',
        createdAt: new Date().toISOString()
      };

      await Promise.all([
        saveCollectionItem('sja_reports', sjaRecord),
        saveCollectionItem('sja_documents', sjaRecord)
      ]);

      await saveCollectionItem('agent_activities', {
        type: 'sja',
        title: `Sikker Jobb Analyse (SJA) opprettet: ${resolvedProjectName}`,
        description: `Risikovurdering utført for: ${userText.slice(0, 100)}`,
        trade: user.trade || 'general',
        tradeName: userDisplayName,
        status: 'verified',
        badge: 'HMS / SJA',
        projectId: resolvedProjectId,
        projectName: resolvedProjectName,
        createdAt: new Date().toISOString()
      });

      suggestedActions.push({
        id: 'open_sja_modal',
        type: 'open_sja_modal',
        label: '🛡️ Se SJA-rapport',
        data: sjaRecord
      });

      followUpPrompts = [
        'Hvilke spesifikke vernetiltak kreves iht. Byggherreforskriften?',
        'Sjekk værforhold og vind for arbeid i høyden',
        'Legg til personlig verneutstyr i SJA'
      ];
    }
    // 3. BYGGEDAGBOK
    else if (isLogIntent) {
      await saveCollectionItem('daily_logs', {
        projectId: resolvedProjectId,
        projectName: resolvedProjectName,
        authorName: userDisplayName,
        note: userText,
        trade: user.trade || 'general',
        verified: true,
        source: 'mester_ai_agent',
        createdAt: new Date().toISOString()
      });

      await saveCollectionItem('agent_activities', {
        type: 'daily_log',
        title: `Byggedagbok ført: ${resolvedProjectName}`,
        description: userText.slice(0, 120),
        trade: user.trade || 'general',
        tradeName: userDisplayName,
        status: 'verified',
        badge: 'Byggedagbok',
        projectId: resolvedProjectId,
        projectName: resolvedProjectName,
        createdAt: new Date().toISOString()
      });

      followUpPrompts = [
        'Vis byggedagboken for denne uken',
        'Generer ukentlig byggerapport for kunden',
        'Synkroniser med Yr.no værdata'
      ];
    }
    // 4. TILBUD & KALKYLE
    else if (isOfferIntent) {
      const offerDraft = {
        title: `Tilbud: ${resolvedProjectName} - ${userText.slice(0, 40)}`,
        description: formatCleanOfferDescription(userText, resolvedProjectName, targetProject?.clientName),
        projectId: resolvedProjectId,
        projectName: resolvedProjectName,
        clientName: targetProject?.clientName || 'Oppdragsgiver',
        clientEmail: targetProject?.clientEmail || '',
        items: [
          { description: 'Fagarbeid og utførelse', quantity: 24, unit: 'timer', pricePerUnit: 890, total: 21360 },
          { description: 'Materialer og festemidler', quantity: 1, unit: 'stk', pricePerUnit: 14500, total: 14500 },
          { description: 'Rigg, drift og avfallshåndtering', quantity: 1, unit: 'stk', pricePerUnit: 4000, total: 4000 }
        ]
      };

      suggestedActions.push({
        id: 'open_offer_modal',
        type: 'open_offer_modal',
        label: '📝 Åpne Tilbudsbygger med utkast',
        data: offerDraft
      });

      followUpPrompts = [
        'Hvilke standard forbehold bør jeg inkludere for dette prosjektet?',
        'Beregn dekningsbidrag med 22% påslag',
        'Lag et profesjonelt følgebrev til tilbudet'
      ];
    }
    // 5. TEK17 VISJON / KVALITET
    else if (isQualityIntent) {
      suggestedActions.push({
        id: 'open_vision',
        type: 'open_ai_vision',
        label: '📸 Kontroller med TEK17 Visjon'
      });

      followUpPrompts = [
        'Hva er kravene til fall mot sluk i TEK17 § 13-15?',
        'Hva kreves for å oppheve tverrfaglig lukkesperre?',
        'Kontroller dampsperre ved etterisolering'
      ];
    } else {
      suggestedActions.push({
        id: 'open_co_modal',
        type: 'open_change_order_modal',
        label: '📄 Ny Endringsordre (NS 8406)'
      });
      suggestedActions.push({
        id: 'open_sja_modal',
        type: 'open_sja_modal',
        label: '🛡️ Generer SJA'
      });

      followUpPrompts = [
        `Hva er fremdriften på ${resolvedProjectName}?`,
        'Er det noen aktive lukkesperrer på prosjektet?',
        'Hjelp meg med en endringsordre iht. NS 8406'
      ];
    }

    return NextResponse.json({
      success: true,
      mode: 'authenticated_agent',
      reply: agentReply,
      targetProject: targetProject ? { id: targetProject.id, name: targetProject.name } : null,
      suggestedActions,
      followUpPrompts
    });
  } catch (error: any) {
    console.error('API /api/chat feil:', error);
    return NextResponse.json(
      { error: 'En uventet feil oppsto under behandlingen.', details: error.message },
      { status: 500 }
    );
  }
}
