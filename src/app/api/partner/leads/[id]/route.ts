import { NextRequest, NextResponse } from 'next/server';
import { getCollectionItems, updateCollectionItem } from '@/src/lib/server/db';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const items = await getCollectionItems('leads');
    const lead = (items || []).find((l: any) => l.id === id);

    if (!lead) {
      return NextResponse.json({ error: 'Lead ikke funnet' }, { status: 404 });
    }

    return NextResponse.json({ success: true, lead });
  } catch (err: any) {
    console.error('Error fetching single lead:', err);
    return NextResponse.json({ error: 'Kunne ikke hente lead' }, { status: 500 });
  }
}

// PATCH: Oppdater lead-status, forhandlingslogg og VARSLE SELGEREN PÅ E-POST!
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const items = await getCollectionItems('leads');
    const lead = (items || []).find((l: any) => l.id === id);

    if (!lead) {
      return NextResponse.json({ error: 'Lead ikke funnet' }, { status: 404 });
    }

    const newStatus = body.status || lead.status; // 'contacted' | 'dialogue' | 'trial' | 'won' | 'lost'
    const negotiationNote = (body.note || body.negotiationNote || body.message || '').trim();
    const updatedPrice = Number(body.monthlyPrice) || lead.monthlyPrice;
    const updatedPlan = body.plan || lead.plan;

    // Bygg opp forhandlingslogg
    const timeline = lead.timeline || [];
    if (negotiationNote || newStatus !== lead.status) {
      let eventTitle = 'Statusoppdatering';
      if (newStatus === 'dialogue') eventTitle = '💬 Forhandling & Dialog';
      else if (newStatus === 'trial') eventTitle = '🚀 Prøveperiode aktivert';
      else if (newStatus === 'won') eventTitle = '🎉 Avtale inngått (Salg lukket!)';
      else if (newStatus === 'lost') eventTitle = '❌ Ikke aktuelt / Utsatt';

      timeline.unshift({
        id: `event-${Date.now()}`,
        timestamp: new Date().toISOString(),
        status: newStatus,
        title: eventTitle,
        note: negotiationNote || `Status endret til ${newStatus}`,
        updatedBy: body.updatedBy || 'MesterAI / Salgsagent'
      });
    }

    const updatedData = {
      ...lead,
      status: newStatus,
      plan: updatedPlan,
      monthlyPrice: updatedPrice,
      timeline,
      lastUpdated: new Date().toISOString()
    };

    await updateCollectionItem('leads', id, updatedData);

    // 🔔 VARSLING TIL SELGEREN PÅ E-POST!
    const sellerEmail = lead.sellerEmail || body.sellerEmail;
    const sellerName = lead.sellerName || 'Selger';
    const resendKey = process.env.RESEND_API_KEY || process.env.RESEND_API || process.env.RESEND_KEY || process.env.RESEND_TOKEN || process.env.RESEND || process.env.RESEND_APIKEY;
    const fromEmail = process.env.EMAIL_FROM || process.env.RESEND_FROM || 'VikingMester <hei@vikingmester.no>';

    let sellerNotified = false;

    if (resendKey && sellerEmail) {
      try {
        let emailSubject = `🔔 [STATUSOPPDATERING] ${lead.company}: ${newStatus}`;
        let statusBadge = '#64748B';
        let statusTitle = 'Ny oppdatering på ditt lead';
        let statusDescription = '';

        if (newStatus === 'dialogue') {
          emailSubject = `💬 [FORHANDLING PÅGÅR] ${lead.company} (${lead.name}) – Dialog i gang!`;
          statusBadge = '#8B5CF6'; // Lilla
          statusTitle = '💬 Kunden er i aktiv forhandlingsdialog!';
          statusDescription = `Kunden du registrerte (${lead.name} fra ${lead.company}) har svart og vi er i aktiv dialog om ${lead.plan}.`;
        } else if (newStatus === 'trial') {
          emailSubject = `🚀 [PRØVEPERIODE AKTIVERT] ${lead.company} tester nå VikingMester!`;
          statusBadge = '#3B82F6'; // Blå
          statusTitle = '🚀 14-dagers prøveperiode er aktivert!';
          statusDescription = `${lead.company} har nå logget inn på VikingMester og tester byggedagbok og TEK17-visjon i felt.`;
        } else if (newStatus === 'won') {
          emailSubject = `🎉 [SALG LUKKET!] Avtale inngått med ${lead.company}!`;
          statusBadge = '#10B981'; // Grønn
          statusTitle = '🎉 GRATULERER – SALG ER LUKKET!';
          statusDescription = `Avtalen med ${lead.company} er bekreftet! De har valgt ${lead.plan} til kr ${updatedPrice.toLocaleString('nb-NO')},- / mnd eks. mva. Dette inngår i din salgsoversikt og 50/50-avregningen for VikingMester!`;
        } else if (newStatus === 'lost') {
          emailSubject = `ℹ️ [IKKE AKTUELT NÅ] Oppdatering om ${lead.company}`;
          statusBadge = '#EF4444'; // Rød
          statusTitle = 'Status: Ikke aktuelt på nåværende tidspunkt';
          statusDescription = `${lead.company} hadde ikke mulighet eller behov akkurat nå. Leadet er satt på pause.`;
        }

        const noteBlockHtml = negotiationNote ? `
          <div style="background: #F8FAFC; border-left: 4px solid ${statusBadge}; padding: 14px 18px; margin: 20px 0; border-radius: 6px;">
            <p style="margin: 0 0 6px 0; font-size: 13px; font-weight: bold; color: #0F172A; text-transform: uppercase;">Siste forhandlingsnotat / AI-status:</p>
            <p style="margin: 0; font-style: italic; color: #334155; font-size: 14px;">«${negotiationNote}»</p>
          </div>
        ` : '';

        // Send til selgeren, med kopi til ledelsen
        const recipients = [sellerEmail];
        const bccRecipients = ['aichatnorge@gmail.com', 'kenkri3@gmail.com', 'fredrik.r.ellingsen@gmail.com'];

        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: fromEmail,
            reply_to: 'hei@vikingmester.no',
            to: recipients,
            bcc: bccRecipients,
            subject: emailSubject,
            html: `
              <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; color: #0F172A; line-height: 1.6; padding: 24px; border: 1px solid #E2E8F0; border-radius: 12px;">
                <div style="background: ${statusBadge}; color: white; padding: 12px 16px; border-radius: 8px; font-weight: bold; font-size: 15px; margin-bottom: 20px;">
                  ${statusTitle}
                </div>

                <p>Hei ${sellerName}!</p>
                <p style="font-size: 15px; color: #334155;">${statusDescription}</p>
                
                ${noteBlockHtml}

                <table style="width: 100%; border-collapse: collapse; font-size: 13px; margin: 20px 0; background: #F8FAFC; border-radius: 8px; padding: 12px;">
                  <tr>
                    <td style="padding: 8px; font-weight: bold; color: #64748B;">Bedrift:</td>
                    <td style="padding: 8px; font-weight: bold; color: #0F172A;">${lead.company}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px; font-weight: bold; color: #64748B;">Kontaktperson:</td>
                    <td style="padding: 8px; color: #0F172A;">${lead.name} (${lead.email})</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px; font-weight: bold; color: #64748B;">Pakke / Verdi:</td>
                    <td style="padding: 8px; font-weight: bold; color: #10B981;">${lead.plan} – kr ${updatedPrice.toLocaleString('nb-NO')},- / mnd</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px; font-weight: bold; color: #64748B;">Ny status:</td>
                    <td style="padding: 8px; font-weight: bold; color: ${statusBadge}; text-transform: uppercase;">${newStatus}</td>
                  </tr>
                </table>

                <div style="text-align: center; margin: 24px 0;">
                  <a href="https://vikingmester.no/partner" style="display: inline-block; background: #8B5CF6; color: white; text-decoration: none; font-weight: bold; font-size: 14px; padding: 12px 24px; border-radius: 8px;">
                    Åpne partnerportalen og se dine salg →
                  </a>
                </div>

                <div style="margin-top: 24px; padding-top: 14px; border-top: 1px solid #E2E8F0; font-size: 11px; color: #64748B;">
                  VikingMester Partneroppfølging • AIChat Norge AS / Vikingnet • Org.nr: 933 851 222
                </div>
              </div>
            `
          }),
          signal: AbortSignal.timeout(15000)
        });
        sellerNotified = true;
      } catch (mailErr) {
        console.warn('Failed to send seller notification email:', mailErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Status oppdatert for ${lead.company}. Selger ${sellerName} er varslet på e-post!`,
      lead: updatedData,
      sellerNotified
    });
  } catch (err: any) {
    console.error('Error updating lead status:', err);
    return NextResponse.json({ error: 'Kunne ikke oppdatere lead.' }, { status: 500 });
  }
}
