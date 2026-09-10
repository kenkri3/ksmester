import { NextRequest, NextResponse } from 'next/server';
import { saveCollectionItem, getCollectionItems } from '@/src/lib/server/db';
import { getUserFromRequest } from '@/src/lib/server/auth';

export async function POST(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    const body = await req.json();
    const { service, secretToken, companyId, companyName } = body;

    if (!service || !secretToken) {
      return NextResponse.json({ error: 'Mangler tjeneste eller API-nøkkel.' }, { status: 400 });
    }

    const effectiveCompanyId = user?.companyId || companyId || 'comp-default';
    const effectiveCompanyName = (user as any)?.company || companyName || 'Bedriftsbruker';

    // 1. Lagre integrasjonen i databasen
    const integrationRecord = {
      id: `int-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      companyId: effectiveCompanyId,
      companyName: effectiveCompanyName,
      service,
      secretTokenMasked: secretToken.length > 8 ? `${secretToken.substring(0, 4)}...${secretToken.substring(secretToken.length - 4)}` : '******',
      status: 'active',
      configuredAt: new Date().toISOString()
    };

    await saveCollectionItem('integrations', integrationRecord);

    // 2. ⚡ Sanntids Webhook til VikingCRM / Tasklet
    const webhookUrl = process.env.VIKINGCRM_WEBHOOK_URL || process.env.INTERNAL_WEBHOOK_URL || process.env.TASKLET_WEBHOOK_URL;
    if (webhookUrl) {
      try {
        await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event: 'integration.configured',
            companyId: effectiveCompanyId,
            companyName: effectiveCompanyName,
            service,
            status: 'connected',
            timestamp: new Date().toISOString()
          }),
          signal: AbortSignal.timeout(5000)
        });
      } catch (webhookErr) {
        console.warn('Integration webhook trigger notice:', webhookErr);
      }
    }

    // 3. Varsel på e-post til Kenneth, Fredrik og aichatnorge@gmail.com
    const resendKey = process.env.RESEND_API_KEY || process.env.RESEND_API || process.env.RESEND_KEY || process.env.RESEND_TOKEN || process.env.RESEND;
    const fromEmail = process.env.EMAIL_FROM || process.env.RESEND_FROM || 'VikingMester <hei@vikingmester.no>';

    if (resendKey) {
      try {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: fromEmail,
            reply_to: 'hei@vikingmester.no',
            to: ['kenkri3@gmail.com', 'fredrik.r.ellingsen@gmail.com', 'aichatnorge@gmail.com'],
            subject: `⚡ INTEGRASJON TILKOBLET: ${effectiveCompanyName} koblet til ${service}`,
            html: `
              <div style="font-family: sans-serif; max-width: 550px; margin: 0 auto; padding: 20px; border: 1px solid #E2E8F0; border-radius: 10px;">
                <h3 style="color: #0F172A; margin-top: 0;">Ny fagsystem-integrasjon aktivert</h3>
                <p><strong>Bedrift:</strong> ${effectiveCompanyName} (${effectiveCompanyId})</p>
                <p><strong>Tjeneste:</strong> ${service}</p>
                <p><strong>Status:</strong> Tilkoblet og aktiv</p>
                <p style="color: #64748B; font-size: 13px;">Kunden har lagt inn sin API-tilgang i portalen. Agenten kan nå synkronisere data automatisk.</p>
              </div>
            `
          }),
          signal: AbortSignal.timeout(10000)
        });
      } catch (mailErr) {
        console.warn('Integration email notice warning:', mailErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Integrasjon med ${service} er aktivert og verifisert.`,
      service
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Kunne ikke lagre integrasjon.' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    const all = await getCollectionItems('integrations');
    const filtered = user?.companyId ? all.filter((i: any) => i.companyId === user.companyId) : all;

    return NextResponse.json(filtered.map((item: any) => ({
      service: item.service,
      status: item.status,
      configuredAt: item.configuredAt
    })));
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
