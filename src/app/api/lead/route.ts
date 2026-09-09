import { NextRequest, NextResponse } from 'next/server';
import { saveCollectionItem } from '@/src/lib/server/db';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, company, email, phone, trade, channel, plan, message } = body;

    if (!email && !phone) {
      return NextResponse.json({ error: 'Minst e-post eller telefonnummer må oppgis.' }, { status: 400 });
    }

    // 1. Offentlig Brønnøysund-oppslag (0 tokens, gratis åpent API)
    let brregInfo: any = null;
    if (company && company.trim().length > 1) {
      try {
        const query = encodeURIComponent(company.trim());
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
              antallAnsatte: unit.antallAnsatte || 0,
              naeringskode: unit.naeringskode1?.beskrivelse || null
            };
          }
        }
      } catch (e) {
        console.warn('Brønnøysund lookup warning:', e);
      }
    }

    // 2. Lagre lead i databasen
    const leadRecord = {
      id: `lead-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      name: name || 'Interessert håndverker',
      company: brregInfo?.navn || company || 'Ukjent firma',
      orgnr: brregInfo?.orgnr || null,
      email: (email || '').toLowerCase().trim(),
      phone: phone || '',
      trade: trade || 'Byggmester / Tømrer',
      channel: channel || 'Microsoft Teams',
      plan: plan || 'Mester Team',
      message: message || '',
      brregInfo,
      status: 'warm_lead',
      source: 'ksmester.no',
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
            product: `KS Mester AI - ${leadRecord.plan} (${leadRecord.channel})`,
            status: 'warm_lead',
            source: 'ksmester.no-autonom-lead',
            notes: `Foretrukket kanal: ${leadRecord.channel}. Antall ansatte ifølge Brreg: ${brregInfo?.antallAnsatte || 'Ukjent'}. Næring: ${brregInfo?.naeringskode || leadRecord.trade}`
          }),
          signal: AbortSignal.timeout(4000)
        });
      } catch (crmErr) {
        console.warn('VikingCRM sync error:', crmErr);
      }
    }

    // 4. Send automatisk onboarding-epost hvis Resend er konfigurert
    const resendKey = process.env.RESEND_API_KEY;
    if (resendKey && leadRecord.email) {
      try {
        const fromEmail = process.env.EMAIL_FROM || 'KS Mester AI <varsel@ksmester.no>';
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: fromEmail,
            to: [leadRecord.email],
            subject: `Velkommen til KS Mester AI – Din autonome byggeleder i lomma`,
            html: `
              <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #171717; line-height: 1.6;">
                <h2 style="color: #059669;">Hei ${leadRecord.name}!</h2>
                <p>Takk for at du valgte <strong>KS Mester AI</strong> for <strong>${leadRecord.company}</strong>.</p>
                <p>Du har valgt <strong>${leadRecord.plan}</strong> med foretrukket integrasjon i <strong>${leadRecord.channel}</strong>.</p>
                <div style="background: #f4f4f5; padding: 16px; border-radius: 12px; margin: 20px 0;">
                  <h4 style="margin-top: 0; color: #111;">Slik kommer du i gang på 2 minutter:</h4>
                  <ol style="margin-bottom: 0; padding-left: 20px;">
                    <li>Vi klargjør din bedriftskonto ferdig oppsatt for <strong>${leadRecord.trade}</strong> iht. TEK17 og HMS-krav.</li>
                    <li>Du mottar en invitasjonslenke for å koble til din <strong>${leadRecord.channel}</strong>.</li>
                    <li>Prøv å sende ditt første 10-sekunders taleopptak eller et bilde – se byggedagboken og SJA-en bli ført av seg selv!</li>
                  </ol>
                </div>
                <p>Har du spørsmål, kan du svare direkte på denne e-posten eller ringe oss på <a href="tel:+4740163082" style="color: #059669; font-weight: bold;">+47 401 63 082</a>.</p>
                <p style="margin-top: 30px; font-size: 13px; color: #71717a;">Med vennlig hilsen,<br><strong>KS Mester AI-teamet</strong><br>AIChat Norge AS / Vikingnet</p>
              </div>
            `
          }),
          signal: AbortSignal.timeout(4000)
        });
      } catch (mailErr) {
        console.warn('Resend email error:', mailErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Lead registrert og autonom onboarding igangsatt.',
      lead: leadRecord
    });
  } catch (err: any) {
    console.error('Lead route error:', err);
    return NextResponse.json({ error: 'Kunne ikke registrere henvendelsen.' }, { status: 500 });
  }
}
