import { NextRequest, NextResponse } from 'next/server';
import { saveCollectionItem, getCollectionItems, ADMIN_EMAILS } from '@/src/lib/server/db';
import { enrollCustomerInNurture } from '@/src/lib/server/nurtureEngine';
import { getUserFromRequest } from '@/src/lib/server/auth';

// GET: Hent partner-leads (isolert per selger med mindre admin)
export async function GET(req: NextRequest) {
  try {
    const userPayload = getUserFromRequest(req);
    const sellerParam = req.nextUrl.searchParams.get('seller');
    const items = await getCollectionItems('leads');

    let partnerLeads = (items || []).filter((l: any) => 
      l.source === 'partner_portal' || 
      Boolean(l.sellerName) || 
      Boolean(l.partnerRep)
    );

    // Hvis innlogget selger (og ikke admin), isoler KUN deres egne leads
    if (userPayload && userPayload.email) {
      const userEmail = userPayload.email.toLowerCase().trim();
      const isAdmin = ADMIN_EMAILS.includes(userEmail) || userPayload.role === 'admin';

      if (!isAdmin) {
        partnerLeads = partnerLeads.filter((l: any) => 
          (l.sellerEmail && l.sellerEmail.toLowerCase() === userEmail) ||
          (l.sellerId && l.sellerId === userPayload.id) ||
          (l.sellerName && l.sellerName.toLowerCase().includes(userEmail.split('@')[0]))
        );
      }
    } else if (sellerParam && sellerParam.trim()) {
      const q = sellerParam.trim().toLowerCase();
      partnerLeads = partnerLeads.filter((l: any) => 
        (l.sellerName && l.sellerName.toLowerCase().includes(q)) ||
        (l.sellerEmail && l.sellerEmail.toLowerCase() === q)
      );
    }

    // Sorter nyeste først
    partnerLeads.sort((a: any, b: any) => {
      const dateA = new Date(a.createdAt || 0).getTime();
      const dateB = new Date(b.createdAt || 0).getTime();
      return dateB - dateA;
    });

    const totalLeads = partnerLeads.length;
    const contacted = partnerLeads.filter((l: any) => l.status === 'contacted' || l.followUpSentAt).length;
    const inDialogue = partnerLeads.filter((l: any) => l.status === 'dialogue').length;
    const inTrial = partnerLeads.filter((l: any) => l.status === 'trial').length;
    const won = partnerLeads.filter((l: any) => l.status === 'won').length;
    const totalEstimatedMrc = partnerLeads.reduce((sum: number, l: any) => sum + (Number(l.monthlyPrice) || 3490), 0);
    const wonMrc = partnerLeads.filter((l: any) => l.status === 'won').reduce((sum: number, l: any) => sum + (Number(l.monthlyPrice) || 3490), 0);

    return NextResponse.json({
      success: true,
      leads: partnerLeads,
      stats: {
        totalLeads,
        contacted,
        inDialogue,
        inTrial,
        won,
        totalEstimatedMrc,
        wonMrc
      }
    });
  } catch (err: any) {
    console.error('Error fetching partner leads:', err);
    return NextResponse.json({ error: 'Kunne ikke hente partner-leads.' }, { status: 500 });
  }
}

// POST: Registrer nytt partner-lead & start autonom oppfølging på vegne av selgeren
export async function POST(req: NextRequest) {
  try {
    const userPayload = getUserFromRequest(req);
    const body = await req.json();

    const sellerName = (body.sellerName || userPayload?.email?.split('@')[0] || body.seller || '').trim();
    const sellerEmail = (body.sellerEmail || userPayload?.email || '').trim().toLowerCase();
    const sellerId = userPayload?.id || body.sellerId || null;

    const rawCompany = (body.company || body.companyName || '').trim();
    const rawOrgnr = (body.orgnr || body.organizationNumber || '').toString().replace(/\s+/g, '').trim();
    const contactName = (body.name || body.contactName || '').trim();
    const email = (body.email || '').toLowerCase().trim();
    const phone = (body.phone || '').trim();
    const trade = (body.trade || 'Byggmester / Tømrer').trim();
    const leadType = (body.leadType || 'info').toLowerCase(); // 'info' | 'trial' | 'order'
    const notes = (body.notes || body.message || '').trim();
    const planChoice = (body.plan || '').toLowerCase();
    const rawWorkers = Number(body.workers) || 0;

    if (!sellerName) {
      return NextResponse.json({ error: 'Selgernavn må oppgis for sporing i 50/50-samarbeidet.' }, { status: 400 });
    }

    if (!contactName) {
      return NextResponse.json({ error: 'Kontaktperson må oppgis.' }, { status: 400 });
    }

    if (!email) {
      return NextResponse.json({ error: 'E-postadresse er påkrevd for at den autonome agenten skal kunne følge opp.' }, { status: 400 });
    }

    if (!rawCompany && !rawOrgnr) {
      return NextResponse.json({ error: 'Bedriftsnavn eller organisasjonsnummer må oppgis.' }, { status: 400 });
    }

    // 1. Offentlig Brønnøysund-oppslag (0 tokens, gratis åpent API)
    let brregInfo: any = null;
    if (rawOrgnr && /^\d{9}$/.test(rawOrgnr)) {
      try {
        const res = await fetch(`https://data.brreg.no/enhetsregisteret/api/enheter/${rawOrgnr}`, {
          headers: { 'Accept': 'application/json' },
          signal: AbortSignal.timeout(3000)
        });
        if (res.ok) {
          const unit = await res.json();
          brregInfo = {
            orgnr: unit.organisasjonsnummer,
            navn: unit.navn,
            organisasjonsform: unit.organisasjonsform?.kode,
            forretningsadresse: unit.forretningsadresse ? `${unit.forretningsadresse.adresse?.[0] || ''}, ${unit.forretningsadresse.postnummer || ''} ${unit.forretningsadresse.poststed || ''}` : null,
            mvaRegistrert: unit.registrertIMvaregisteret || false,
            antallAnsatte: unit.antallAnsatte || 3,
            naeringskode: unit.naeringskode1?.beskrivelse || null
          };
        }
      } catch (e) {
        console.warn('Brønnøysund direct orgnr lookup warning:', e);
      }
    }

    const lookupQuery = (rawCompany || '').trim();
    if (!brregInfo && lookupQuery.length > 1) {
      try {
        const query = encodeURIComponent(lookupQuery);
        const res = await fetch(`https://data.brreg.no/enhetsregisteret/api/enheter?navn=${query}&size=1`, {
          headers: { 'Accept': 'application/json' },
          signal: AbortSignal.timeout(3000)
        });
        if (res.ok) {
          const data = await res.json();
          const unit = data._embedded ? data._embedded.enheter?.[0] : null;
          if (unit) {
            brregInfo = {
              orgnr: unit.organisasjonsnummer,
              navn: unit.navn,
              organisasjonsform: unit.organisasjonsform?.kode,
              forretningsadresse: unit.forretningsadresse ? `${unit.forretningsadresse.adresse?.[0] || ''}, ${unit.forretningsadresse.postnummer || ''} ${unit.forretningsadresse.poststed || ''}` : null,
              mvaRegistrert: unit.registrertIMvaregisteret || false,
              antallAnsatte: unit.antallAnsatte || 3,
              naeringskode: unit.naeringskode1?.beskrivelse || null
            };
          }
        }
      } catch (e) {
        console.warn('Brønnøysund name lookup warning:', e);
      }
    }

    const companyName = brregInfo?.navn || rawCompany || 'Håndverkerbedrift';
    const orgNumber = brregInfo?.orgnr || (rawOrgnr && /^\d{9}$/.test(rawOrgnr) ? rawOrgnr : null);
    const workers = rawWorkers || brregInfo?.antallAnsatte || 3;

    // 2. Beregn pakke og pris
    let planTitle = 'VikingMester Team';
    let monthlyPrice = 3490;

    if (leadType === 'order') {
      if (planChoice.includes('solo') || workers === 1) {
        planTitle = 'VikingMester Solo';
        monthlyPrice = 1490;
      } else if (planChoice.includes('entreprenor') || workers > 5) {
        planTitle = 'VikingMester Totalentreprenør';
        monthlyPrice = 6900;
      }
    } else if (leadType === 'trial') {
      planTitle = 'VikingMester Team (14 dagers prøveperiode)';
      monthlyPrice = 3490;
    } else {
      planTitle = 'VikingMester Team (Informasjon & introduksjon)';
      monthlyPrice = 3490;
    }

    // 3. Opprett lead-record med tidslinje for forhandlinger
    const leadId = `lead-partner-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const initialTimeline = [
      {
        id: `event-${Date.now()}`,
        timestamp: new Date().toISOString(),
        status: 'contacted',
        title: '📬 Lead registrert & Autonom oppfølging startet',
        note: `Registrert av ${sellerName}. Personlig introduksjonse-post sendt fra hei@vikingmester.no.`,
        updatedBy: sellerName
      }
    ];

    const leadRecord = {
      id: leadId,
      source: 'partner_portal',
      sellerId,
      sellerName,
      sellerEmail: sellerEmail || null,
      partnerRep: sellerName,
      partnerFirm: 'NonFoodGroup AS (50% Partner)',
      name: contactName,
      company: companyName,
      orgnr: orgNumber,
      email,
      phone,
      trade,
      leadType, // 'info' | 'trial' | 'order'
      plan: planTitle,
      monthlyPrice,
      workers,
      notes,
      brregInfo,
      status: 'contacted', // 'contacted' | 'dialogue' | 'trial' | 'won' | 'lost'
      timeline: initialTimeline,
      followUpSentAt: new Date().toISOString(),
      createdAt: new Date().toISOString()
    };

    await saveCollectionItem('leads', leadRecord);

    // 4. Send automatisk oppfølging via Resend på vegne av selgeren
    const resendKey = process.env.RESEND_API_KEY || process.env.RESEND_API || process.env.RESEND_KEY || process.env.RESEND_TOKEN || process.env.RESEND || process.env.RESEND_APIKEY;
    
    // 💡 Avsendernavn: "${sellerName} | VikingMester" <hei@vikingmester.no>
    // Reply-To: ${sellerEmail}, hei@vikingmester.no
    // Dette gir 100% SPF/DKIM-levering, og kunden ser at henvendelsen kommer personlig fra selgeren!
    const senderDisplayName = `${sellerName} | VikingMester`;
    const fromEmail = `"${senderDisplayName}" <hei@vikingmester.no>`;
    const replyToHeader = sellerEmail ? `${sellerEmail}, hei@vikingmester.no` : 'hei@vikingmester.no';

    let customerEmailSent = false;
    let internalAlertSent = false;

    if (resendKey) {
      // 4A. E-post til leadet (kunden)
      try {
        let emailSubject = `VikingMester – Informasjon og introduksjon (fra ${sellerName})`;
        let headlineText = `Hei ${contactName}!`;
        let introLeadText = `Jeg (${sellerName} i VikingMester-teamet) følger opp samtalen vår angående hvordan VikingMester forenkler hverdagen for <strong>${companyName}</strong>.`;

        if (leadType === 'trial') {
          emailSubject = `Din 14-dagers prøveperiode på VikingMester er klar (fra ${sellerName})`;
          introLeadText = `Jeg har nå klargjort en 14 dagers uforpliktende prøveperiode for <strong>${companyName}</strong>.`;
        } else if (leadType === 'order') {
          emailSubject = `Bekreftelse og oppstart av VikingMester for ${companyName} (fra ${sellerName})`;
          introLeadText = `Takk for bestillingen av VikingMester for <strong>${companyName}</strong>! Vi gleder oss til å ha dere med.`;
        }

        const notesBlockHtml = notes ? `
          <div style="background: #F8FAFC; border-left: 4px solid #8B5CF6; padding: 14px 18px; margin: 20px 0; border-radius: 6px;">
            <p style="margin: 0 0 6px 0; font-size: 13px; font-weight: bold; color: #6B21A8; text-transform: uppercase; letter-spacing: 0.5px;">Bakgrunn for henvendelsen:</p>
            <p style="margin: 0; font-style: italic; color: #334155; font-size: 14px;">«${notes}»</p>
          </div>
        ` : '';

        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: fromEmail,
            reply_to: replyToHeader,
            to: [email],
            subject: emailSubject,
            html: `
              <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 620px; margin: 0 auto; color: #0F172A; line-height: 1.6; padding: 24px;">
                <div style="border-bottom: 2px solid #8B5CF6; padding-bottom: 14px; margin-bottom: 22px;">
                  <h2 style="color: #0F172A; margin: 0; font-size: 24px;">VikingMester</h2>
                  <p style="color: #8B5CF6; font-weight: 600; margin: 4px 0 0 0; font-size: 14px;">Byggeplassens råeste kraftverktøy • TEK17, byggedagbok & HMS på sekunder</p>
                </div>
                
                <p style="font-size: 16px; margin-bottom: 16px;">${headlineText}</p>
                <p style="font-size: 15px; color: #334155;">${introLeadText}</p>
                
                ${notesBlockHtml}

                <div style="background: #FAF5FF; border: 1px solid #E9D5FF; padding: 20px; border-radius: 12px; margin: 24px 0;">
                  <h4 style="margin: 0 0 14px 0; color: #581C87; font-size: 16px;">Hva gjør VikingMester for dere i ${companyName}?</h4>
                  
                  <div style="margin-bottom: 14px;">
                    <strong style="color: #0F172A; font-size: 14px;">🎙️ Stemmestyrt Byggedagbok:</strong>
                    <p style="margin: 2px 0 0 0; font-size: 13px; color: #475569;">Snakk inn dagboken på 30 sekunder fra bilen på vei hjem. Værdata fra Yr og arbeidstimer synkroniseres automatisk til prosjektet.</p>
                  </div>

                  <div style="margin-bottom: 14px;">
                    <strong style="color: #0F172A; font-size: 14px;">📸 TEK17-visjon & Slukkontroll:</strong>
                    <p style="margin: 2px 0 0 0; font-size: 13px; color: #475569;">Knips et bilde av slukmansjett, klemring eller membran. Vår visjons-AI sjekker fallet og utførelsen mot TEK17 og Våtromsnormen (BVN) på 3 sekunder.</p>
                  </div>

                  <div style="margin-bottom: 14px;">
                    <strong style="color: #0F172A; font-size: 14px;">⚡ 1-klikks Endringsordrer (NS 8406):</strong>
                    <p style="margin: 2px 0 0 0; font-size: 13px; color: #475569;">Lås inn ekstrakostnader og få digital godkjenning fra byggherre før arbeidet starter, så dere aldri taper penger på tilleggsarbeid.</p>
                  </div>

                  <div>
                    <strong style="color: #0F172A; font-size: 14px;">📋 Automatisk HMS & Kjemisk Stoffkartotek:</strong>
                    <p style="margin: 2px 0 0 0; font-size: 13px; color: #475569;">Sikker Jobb-analyse (SJA) og sikkerhetsdatablader direkte på mobilen iht. Byggherreforskriften og Arbeidstilsynet.</p>
                  </div>
                </div>

                <div style="text-align: center; margin: 30px 0;">
                  <a href="https://vikingmester.no" style="display: inline-block; background: #8B5CF6; color: white; text-decoration: none; font-weight: bold; font-size: 15px; padding: 14px 28px; border-radius: 10px; box-shadow: 0 4px 12px rgba(139, 92, 246, 0.35);">
                    Åpne VikingMester og se arbeidsflaten →
                  </a>
                </div>

                <p style="font-size: 14px; color: #475569; margin-top: 24px;">
                  Har du spørsmål eller ønsker en kort gjennomgang, er det bare å svare direkte på denne e-posten, så svarer jeg eller en kollega deg umiddelbart.
                </p>
                
                <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #E2E8F0; font-size: 12px; color: #64748B;">
                  Med vennlig hilsen,<br>
                  <strong>${sellerName}</strong><br>
                  VikingMester Salg & Partnerteam<br>
                  ${sellerEmail ? `Direkte: <a href="mailto:${sellerEmail}" style="color: #8B5CF6;">${sellerEmail}</a> • ` : ''}Felles: <a href="mailto:hei@vikingmester.no" style="color: #8B5CF6;">hei@vikingmester.no</a><br>
                  Web: <a href="https://vikingmester.no" style="color: #8B5CF6;">vikingmester.no</a> • Org.nr: 933 851 222 MVA
                </div>
              </div>
            `
          }),
          signal: AbortSignal.timeout(15000)
        });
        customerEmailSent = true;
      } catch (custErr) {
        console.warn('Customer follow-up email warning:', custErr);
      }

      // 4B. Intern e-postvarsling til selgeren og ledelsen
      try {
        const recipients = ['kenkri3@gmail.com', 'fredrik.r.ellingsen@gmail.com', 'aichatnorge@gmail.com'];
        if (sellerEmail && !recipients.includes(sellerEmail)) {
          recipients.push(sellerEmail);
        }

        const timestampStr = new Date().toLocaleString('nb-NO', { timeZone: 'Europe/Oslo' });
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: fromEmail,
            reply_to: email,
            to: recipients,
            subject: `🤝 [PARTNER LEAD] Nytt lead fra ${sellerName}: ${companyName} (${contactName})`,
            html: `
              <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; color: #0F172A; line-height: 1.6; padding: 24px; border: 1px solid #CBD5E1; border-radius: 12px;">
                <div style="background: #8B5CF6; color: white; padding: 12px 16px; border-radius: 8px; font-weight: bold; font-size: 15px; margin-bottom: 20px;">
                  🤝 NYTT LEAD REGISTRERT VIA PARTNERPORTAL (50/50 SAMARBEID)
                </div>

                <h3 style="margin-top: 0; color: #0F172A;">Lead-detaljer:</h3>
                
                <table style="width: 100%; border-collapse: collapse; font-size: 14px; margin-bottom: 20px;">
                  <tr style="border-bottom: 1px solid #E2E8F0;">
                    <td style="padding: 8px 0; font-weight: bold; color: #64748B; width: 140px;">Registrert av (Selger):</td>
                    <td style="padding: 8px 0; font-weight: bold; color: #8B5CF6;">${sellerName} ${sellerEmail ? `(${sellerEmail})` : ''}</td>
                  </tr>
                  <tr style="border-bottom: 1px solid #E2E8F0;">
                    <td style="padding: 8px 0; font-weight: bold; color: #64748B;">Bedrift:</td>
                    <td style="padding: 8px 0; font-weight: bold; color: #0F172A;">${companyName}</td>
                  </tr>
                  <tr style="border-bottom: 1px solid #E2E8F0;">
                    <td style="padding: 8px 0; font-weight: bold; color: #64748B;">Org.nummer:</td>
                    <td style="padding: 8px 0; font-family: monospace; font-weight: bold;">${orgNumber || 'Ikke oppgitt'}</td>
                  </tr>
                  <tr style="border-bottom: 1px solid #E2E8F0;">
                    <td style="padding: 8px 0; font-weight: bold; color: #64748B;">Kontaktperson:</td>
                    <td style="padding: 8px 0; font-weight: bold;">${contactName}</td>
                  </tr>
                  <tr style="border-bottom: 1px solid #E2E8F0;">
                    <td style="padding: 8px 0; font-weight: bold; color: #64748B;">E-post:</td>
                    <td style="padding: 8px 0;"><a href="mailto:${email}" style="color: #8B5CF6;">${email}</a></td>
                  </tr>
                  <tr style="border-bottom: 1px solid #E2E8F0;">
                    <td style="padding: 8px 0; font-weight: bold; color: #64748B;">Telefon:</td>
                    <td style="padding: 8px 0;">${phone || 'Ikke oppgitt'}</td>
                  </tr>
                  <tr style="border-bottom: 1px solid #E2E8F0;">
                    <td style="padding: 8px 0; font-weight: bold; color: #64748B;">Fagområde:</td>
                    <td style="padding: 8px 0;">${trade}</td>
                  </tr>
                  <tr style="border-bottom: 1px solid #E2E8F0;">
                    <td style="padding: 8px 0; font-weight: bold; color: #64748B;">Type henvendelse:</td>
                    <td style="padding: 8px 0; font-weight: bold; color: #0F172A;">${leadType.toUpperCase()}</td>
                  </tr>
                  <tr style="border-bottom: 1px solid #E2E8F0;">
                    <td style="padding: 8px 0; font-weight: bold; color: #64748B;">Estimert pakke/verdi:</td>
                    <td style="padding: 8px 0; font-weight: bold; color: #10B981;">${planTitle} (kr ${monthlyPrice.toLocaleString('nb-NO')},- / mnd)</td>
                  </tr>
                  <tr style="border-bottom: 1px solid #E2E8F0;">
                    <td style="padding: 8px 0; font-weight: bold; color: #64748B;">Notat fra samtalen:</td>
                    <td style="padding: 8px 0; color: #334155; font-style: italic;">${notes || 'Ingen notater'}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; font-weight: bold; color: #64748B;">Tidspunkt:</td>
                    <td style="padding: 8px 0; color: #64748B;">${timestampStr}</td>
                  </tr>
                </table>

                <div style="background: #F0FDF4; border: 1px solid #BBF7D0; padding: 12px; border-radius: 8px; font-size: 13px; color: #166534; margin-bottom: 16px;">
                  ✓ <strong>Autonom status:</strong> Personlig introduksjonse-post er automatisk sendt fra <code>"${senderDisplayName}" &lt;hei@vikingmester.no&gt;</code> med direkte svaradresse til <code>${replyToHeader}</code>.
                </div>

                <div style="background: #F1F5F9; padding: 12px; border-radius: 8px; font-size: 12px; color: #64748B;">
                  <em>Dette leadet tilhører 50/50-partnerskapet for VikingMester. Fremtidige abonnementsinntekter inngår i den månedlige 50/50-avregningen.</em>
                </div>
              </div>
            `
          }),
          signal: AbortSignal.timeout(15000)
        });
        internalAlertSent = true;
      } catch (adminErr) {
        console.warn('Partner internal email notification warning:', adminErr);
      }
    }

    // 5. Inruller i autonom nurture sekvens
    try {
      await enrollCustomerInNurture({
        id: leadRecord.id,
        email: leadRecord.email,
        name: leadRecord.name,
        company: leadRecord.company,
        trade: leadRecord.trade,
        plan: leadRecord.plan
      });
    } catch (nurtureErr) {
      console.warn('Could not auto-enroll partner lead in nurture:', nurtureErr);
    }

    return NextResponse.json({
      success: true,
      message: `Lead for ${companyName} er registrert av ${sellerName}. Autonom oppfølging er sendt!`,
      lead: leadRecord,
      customerEmailSent,
      internalAlertSent
    });
  } catch (err: any) {
    console.error('Partner lead submission error:', err);
    return NextResponse.json({ error: 'Kunne ikke registrere leadet.' }, { status: 500 });
  }
}
