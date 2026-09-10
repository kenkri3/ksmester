import { NextRequest, NextResponse } from 'next/server';
import { saveCollectionItem } from '@/src/lib/server/db';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rawCompany = body.company || body.companyName || '';
    const rawName = body.name || body.contactName || '';
    const email = (body.email || '').toLowerCase().trim();
    const phone = body.phone || '';
    const trade = body.trade || 'Byggmester / Tømrer';
    const workers = Number(body.workers) || (body.plan === 'solo' ? 1 : body.plan === 'entreprenor' ? 10 : 3);
    const planRaw = (body.plan || (workers <= 1 ? 'solo' : workers <= 5 ? 'team' : 'entreprenor')).toLowerCase();
    const channel = body.channel || 'Microsoft Teams / Web';
    const message = body.message || '';

    if (!email && !phone) {
      return NextResponse.json({ error: 'Minst e-post eller telefonnummer må oppgis.' }, { status: 400 });
    }

    // 1. Offentlig Brønnøysund-oppslag (0 tokens, gratis åpent API)
    let brregInfo: any = null;
    const lookupQuery = rawCompany.trim();
    if (lookupQuery.length > 1) {
      try {
        const query = encodeURIComponent(lookupQuery);
        const res = await fetch(`https://data.brreg.no/enhetsregisteret/api/enheter?navn=${query}&size=1`, {
          headers: { 'Accept': 'application/json' },
          signal: AbortSignal.timeout(3000)
        });
        if (res.ok) {
          const data = await res.json();
          const unit = data._embedded?.enheter?.[0];
          if (unit) {
            brregInfo = {
              orgnr: unit.organisasjonsnummer,
              navn: unit.navn,
              organisasjonsform: unit.organisasjonsform?.kode,
              forretningsadresse: unit.forretningsadresse ? `${unit.forretningsadresse.adresse?.[0] || ''}, ${unit.forretningsadresse.postnummer || ''} ${unit.forretningsadresse.poststed || ''}` : null,
              mvaRegistrert: unit.registrertIMvaregisteret || false,
              antallAnsatte: unit.antallAnsatte || workers,
              naeringskode: unit.naeringskode1?.beskrivelse || null
            };
          }
        }
      } catch (e) {
        console.warn('Brønnøysund lookup warning:', e);
      }
    }

    // Plan & Pricing calculation
    let planTitle = 'VikingMester Team';
    let monthlyPrice = 3490;
    if (planRaw.includes('solo') || workers === 1) {
      planTitle = 'VikingMester Solo';
      monthlyPrice = 1490;
    } else if (planRaw.includes('entreprenor') || workers > 5) {
      planTitle = 'VikingMester Totalentreprenør';
      monthlyPrice = 6900;
    }

    // 2. Lagre lead i databasen
    const leadRecord = {
      id: `lead-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      name: rawName || brregInfo?.navn || rawCompany || 'Interessert håndverker',
      company: brregInfo?.navn || rawCompany || 'Ukjent firma',
      orgnr: brregInfo?.orgnr || null,
      email,
      phone,
      trade,
      channel,
      plan: planTitle,
      monthlyPrice,
      workers,
      message,
      brregInfo,
      status: 'active_lead',
      source: 'VikingMester.no',
      createdAt: new Date().toISOString()
    };

    await saveCollectionItem('leads', leadRecord);

    // 3. Synkroniser til VikingCRM via Webhook hvis konfigurert
    const crmWebhook = process.env.VIKINGCRM_WEBHOOK_URL;
    if (crmWebhook) {
      try {
        await fetch(crmWebhook, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event: 'lead.created',
            contactName: leadRecord.name,
            companyName: leadRecord.company,
            orgNumber: leadRecord.orgnr,
            email: leadRecord.email,
            phone: leadRecord.phone,
            trade: leadRecord.trade,
            product: `${leadRecord.plan} (${leadRecord.channel})`,
            price: monthlyPrice,
            status: 'warm_lead',
            source: 'vikingmester.no-bestilling',
            notes: `Bestilling fra nettside. Foretrukket kanal: ${leadRecord.channel}. Antall brukere: ${workers}. Brreg: ${brregInfo?.antallAnsatte || workers} ansatte, adresse: ${brregInfo?.forretningsadresse || 'Ukjent'}.`
          }),
          signal: AbortSignal.timeout(4000)
        });
      } catch (crmErr) {
        console.warn('VikingCRM sync error:', crmErr);
      }
    }

    // 4. Send automatisk onboarding og FAKTURAGRUNNLAG via Resend
    const resendKey = process.env.RESEND_API_KEY || process.env.RESEND_API || process.env.RESEND_KEY;
    const fromEmail = process.env.EMAIL_FROM || process.env.RESEND_FROM || 'VikingMester <hei@vikingnet.no>';

    if (resendKey) {
      // 4A. Send velkomst- og onboarding-epost til kunden
      if (leadRecord.email) {
        try {
          await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${resendKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              from: fromEmail,
              reply_to: 'hei@vikingnet.no',
              to: [leadRecord.email],
              subject: `Velkommen til VikingMester – Din autonome byggeleder i lomma`,
              html: `
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; color: #171717; line-height: 1.6; padding: 24px;">
                  <div style="border-bottom: 2px solid #8B5CF6; padding-bottom: 12px; margin-bottom: 20px;">
                    <h2 style="color: #0F172A; margin: 0; font-size: 24px;">Velkommen til VikingMester!</h2>
                    <p style="color: #8B5CF6; font-weight: bold; margin: 4px 0 0 0; font-size: 14px;">Autonom byggeleder & kvalitetssikring (TEK17 / HMS / NS 8406)</p>
                  </div>
                  
                  <p>Hei ${leadRecord.name}!</p>
                  <p>Takk for din bestilling av <strong>${leadRecord.plan}</strong> for <strong>${leadRecord.company}</strong>.</p>
                  
                  <div style="background: #F8FAFC; border: 1px solid #E2E8F0; padding: 18px; border-radius: 12px; margin: 20px 0;">
                    <h4 style="margin: 0 0 10px 0; color: #0F172A; font-size: 15px;">Din abonnementsavtale:</h4>
                    <ul style="margin: 0; padding-left: 20px; font-size: 14px; color: #334155;">
                      <li><strong>Pakke:</strong> ${leadRecord.plan}</li>
                      <li><strong>Pris:</strong> kr ${monthlyPrice.toLocaleString('nb-NO')},- / mnd eks. mva</li>
                      <li><strong>Antall brukere/lisenser:</strong> ${workers}</li>
                      <li><strong>Fagområde:</strong> ${leadRecord.trade}</li>
                      <li><strong>Fakturering:</strong> Månedlig bedriftsfaktura / EHF (14 dagers forfall)</li>
                    </ul>
                  </div>

                  <div style="background: #FAF5FF; border: 1px solid #E9D5FF; padding: 18px; border-radius: 12px; margin: 20px 0;">
                    <h4 style="margin: 0 0 10px 0; color: #6B21A8; font-size: 15px;">🚀 Slik kommer du i gang på 2 minutter:</h4>
                    <ol style="margin: 0; padding-left: 20px; font-size: 14px; color: #374151;">
                      <li style="margin-bottom: 8px;">Gå direkte til arbeidsflaten på <a href="https://vikingmester.no" style="color: #8B5CF6; font-weight: bold;">vikingmester.no</a>.</li>
                      <li style="margin-bottom: 8px;">Test stemmestyrt byggedagbok eller ta et bilde av et våtrom / sluk for TEK17-sjekk.</li>
                      <li style="margin-bottom: 0;">Du kan koble til fagsystemer (f.eks. Tripletex, Boligmappa) under <em>Innstillinger → Integrasjoner</em> når du vil.</li>
                    </ol>
                  </div>

                  <p style="font-size: 14px; color: #475569;">Har du spørsmål, kan du svare direkte på denne e-posten til <a href="mailto:hei@vikingnet.no" style="color: #8B5CF6;">hei@vikingnet.no</a>.</p>
                  
                  <div style="margin-top: 30px; padding-top: 16px; border-top: 1px solid #E2E8F0; font-size: 12px; color: #64748B;">
                    Med vennlig hilsen,<br>
                    <strong>VikingMester Teamet</strong><br>
                    AIChat Norge AS / Vikingnet • Org.nr: 933 649 768 MVA
                  </div>
                </div>
              `
            }),
            signal: AbortSignal.timeout(4000)
          });
        } catch (mailErr) {
          console.warn('Customer onboarding email notice:', mailErr);
        }
      }

      // 4B. Send autoritativt FAKTURAGRUNNLAG til Kenneth og Fredrik
      try {
        const timestampStr = new Date().toLocaleString('nb-NO', { timeZone: 'Europe/Oslo' });
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: fromEmail,
            reply_to: leadRecord.email || 'hei@vikingnet.no',
            to: ['kenkri3@gmail.com', 'fredrik.r.ellingsen@gmail.com'],
            subject: `🔥 FAKTURAGRUNNLAG: ${leadRecord.company} – ${leadRecord.plan}`,
            html: `
              <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; color: #0F172A; line-height: 1.6; padding: 24px; border: 1px solid #CBD5E1; border-radius: 12px;">
                <div style="background: #10B981; color: white; padding: 12px 16px; border-radius: 8px; font-weight: bold; font-size: 16px; margin-bottom: 20px;">
                  ✓ NY BEDRIFTSBESTILLING – VIKINGMESTER
                </div>

                <h3 style="margin-top: 0; color: #0F172A;">FAKTURAGRUNNLAG (EHF / E-POST)</h3>
                
                <table style="width: 100%; border-collapse: collapse; font-size: 14px; margin-bottom: 20px;">
                  <tr style="border-bottom: 1px solid #E2E8F0;">
                    <td style="padding: 8px 0; font-weight: bold; color: #64748B; width: 140px;">Kunde / Bedrift:</td>
                    <td style="padding: 8px 0; font-weight: bold; color: #0F172A;">${leadRecord.company}</td>
                  </tr>
                  <tr style="border-bottom: 1px solid #E2E8F0;">
                    <td style="padding: 8px 0; font-weight: bold; color: #64748B;">Organisasjonsnr:</td>
                    <td style="padding: 8px 0; font-family: monospace;">${leadRecord.orgnr || 'Må verifiseres / enkeltpersonforetak'}</td>
                  </tr>
                  <tr style="border-bottom: 1px solid #E2E8F0;">
                    <td style="padding: 8px 0; font-weight: bold; color: #64748B;">Forretningsadr.:</td>
                    <td style="padding: 8px 0;">${brregInfo?.forretningsadresse || 'Ikke oppgitt i Brreg'}</td>
                  </tr>
                  <tr style="border-bottom: 1px solid #E2E8F0;">
                    <td style="padding: 8px 0; font-weight: bold; color: #64748B;">Faktura-e-post:</td>
                    <td style="padding: 8px 0;"><a href="mailto:${leadRecord.email}">${leadRecord.email}</a></td>
                  </tr>
                  <tr style="border-bottom: 1px solid #E2E8F0;">
                    <td style="padding: 8px 0; font-weight: bold; color: #64748B;">Telefon:</td>
                    <td style="padding: 8px 0;">${leadRecord.phone || 'Ikke oppgitt'}</td>
                  </tr>
                  <tr style="border-bottom: 1px solid #E2E8F0;">
                    <td style="padding: 8px 0; font-weight: bold; color: #64748B;">Produkt / Plan:</td>
                    <td style="padding: 8px 0; font-weight: bold; color: #8B5CF6;">${leadRecord.plan}</td>
                  </tr>
                  <tr style="border-bottom: 1px solid #E2E8F0;">
                    <td style="padding: 8px 0; font-weight: bold; color: #64748B;">Pris per mnd:</td>
                    <td style="padding: 8px 0; font-weight: bold; color: #0F172A;">kr ${monthlyPrice.toLocaleString('nb-NO')},- eks. mva</td>
                  </tr>
                  <tr style="border-bottom: 1px solid #E2E8F0;">
                    <td style="padding: 8px 0; font-weight: bold; color: #64748B;">Antall brukere:</td>
                    <td style="padding: 8px 0;">${workers}</td>
                  </tr>
                  <tr style="border-bottom: 1px solid #E2E8F0;">
                    <td style="padding: 8px 0; font-weight: bold; color: #64748B;">Fagområde:</td>
                    <td style="padding: 8px 0;">${leadRecord.trade}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; font-weight: bold; color: #64748B;">Tidspunkt:</td>
                    <td style="padding: 8px 0; color: #64748B;">${timestampStr}</td>
                  </tr>
                </table>

                <div style="background: #F1F5F9; padding: 12px; border-radius: 8px; font-size: 13px; color: #334155;">
                  <strong>Neste steg:</strong> Send EHF / bedriftsfaktura på <strong>kr ${monthlyPrice.toLocaleString('nb-NO')},- eks. mva</strong> for første måned med 14 dagers forfall.
                </div>
              </div>
            `
          }),
          signal: AbortSignal.timeout(4000)
        });
      } catch (adminMailErr) {
        console.warn('Admin invoice basis email notice:', adminMailErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Bestilling registrert. Fakturagrunnlag og velkomstepost er sendt.',
      lead: leadRecord
    });
  } catch (err: any) {
    console.error('Lead route error:', err);
    return NextResponse.json({ error: 'Kunne ikke registrere henvendelsen.' }, { status: 500 });
  }
}
