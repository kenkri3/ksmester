import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import { getUserFromRequest, isUserAdmin } from '@/src/lib/server/auth';
import { saveCollectionItem, getCollectionItemById, dbQuery, inMemoryStore } from '@/src/lib/server/db';
import { sanitize, sanitizeEmail, sanitizeHeader } from '@/src/lib/sanitize';
import { apiError } from '@/src/lib/server/apiError';

export async function POST(req: NextRequest) {
  try {
    // 🛡️ SECURITY: Kun systemadministratorer har lov til å konvertere leads til kunder
    const requestingUser = getUserFromRequest(req);
    if (!requestingUser || !isUserAdmin(requestingUser)) {
      return NextResponse.json({ error: 'Uautorisert: Kun administratorer kan opprette kunder fra henvendelser.' }, { status: 403 });
    }

    const body = await req.json();
    const leadId = sanitize(body.leadId || '');
    const companyName = sanitize(body.companyName || body.company || '').trim();
    const contactName = sanitize(body.contactName || body.name || '').trim();
    const email = sanitizeEmail(body.email || '');
    const phone = sanitize(body.phone || '');
    const orgnr = sanitizeHeader((body.orgNumber || body.orgnr || '').toString().replace(/\s+/g, '').trim());
    const trade = sanitize(body.trade || 'Byggmester / Tømrer');
    const planRaw = sanitize((body.plan || 'team').toLowerCase());
    const status = body.status === 'active' ? 'active' : 'trial';
    const trialDays = Number(body.trialDays) || 14;
    const createAdminUser = body.createAdminUser !== false;
    const customPassword = body.adminPassword ? String(body.adminPassword).trim() : null;
    const sendWelcomeEmail = Boolean(body.sendWelcomeEmail);
    const customEmailMessage = body.emailMessage ? String(body.emailMessage) : null;

    if (!companyName) {
      return NextResponse.json({ error: 'Kundenavn / Firmanavn er påkrevd.' }, { status: 400 });
    }

    // Normaliser pakkenavn
    let plan: 'solo' | 'team' | 'entreprenor' = 'team';
    let monthlyPrice = 1490;
    if (planRaw.includes('solo') || planRaw === 'solo') {
      plan = 'solo';
      monthlyPrice = 690;
    } else if (planRaw.includes('entrepren') || planRaw === 'entreprenor') {
      plan = 'entreprenor';
      monthlyPrice = 2990;
    }

    const now = new Date();
    const companyId = 'comp-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 7);

    // 1. Opprett bedriftsoppføringen
    const companyRecord = {
      id: companyId,
      name: companyName,
      orgNumber: orgnr || '',
      orgnr: orgnr || '',
      contactName: contactName || companyName,
      email: email || '',
      phone: phone || '',
      trade,
      plan,
      monthlyPrice,
      status: 'active',
      subscriptionStatus: status, // 'trial' | 'active'
      modules: ['projects', 'checklists', 'deviations', 'ai', 'economy', 'fdv', 'inventory', 'vehicle', 'time', 'apprentice', 'building_app'],
      userCount: createAdminUser ? 1 : 0,
      convertedFromLeadId: leadId || null,
      trialStartDate: status === 'trial' ? now.toISOString() : null,
      trialDaysLeft: status === 'trial' ? trialDays : null,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString()
    };

    await saveCollectionItem('companies', companyRecord);

    // 2. Opprett administratorkonto for kunden (hvis valgt)
    let createdUser: any = null;
    let tempPassword = customPassword || `VikingMester${now.getFullYear()}!`;
    const inviteToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

    if (createAdminUser && email) {
      const hashedPassword = await bcrypt.hash(tempPassword, 10);
      const userId = 'u-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 7);

      createdUser = {
        id: userId,
        uid: userId,
        email: email.toLowerCase().trim(),
        displayName: contactName || email.split('@')[0],
        role: 'admin',
        trade,
        company: companyName,
        companyId: companyId,
        subscriptionStatus: status,
        orgnr: orgnr || null,
        phone: phone || null,
        createdAt: now.toISOString()
      };

      // Lagre i database og memory-store
      await dbQuery(
        `INSERT INTO users (id, email, password, display_name, role, trade, company, company_id, subscription_status, orgnr)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         ON CONFLICT (email) DO UPDATE SET
           display_name = EXCLUDED.display_name,
           company = EXCLUDED.company,
           company_id = EXCLUDED.company_id,
           subscription_status = EXCLUDED.subscription_status,
           role = EXCLUDED.role`,
        [createdUser.id, createdUser.email, hashedPassword, createdUser.displayName, createdUser.role, createdUser.trade, createdUser.company, createdUser.companyId, createdUser.subscriptionStatus, createdUser.orgnr]
      ).catch(() => {});

      if (!inMemoryStore.users) inMemoryStore.users = [];
      const existingUserIdx = inMemoryStore.users.findIndex(u => u.email?.toLowerCase() === createdUser.email);
      if (existingUserIdx !== -1) {
        inMemoryStore.users[existingUserIdx] = { ...createdUser, password: hashedPassword };
      } else {
        inMemoryStore.users.push({ ...createdUser, password: hashedPassword });
      }

      await saveCollectionItem('users', {
        ...createdUser,
        password: hashedPassword
      });
    }

    // 3. Generer invitasjonspost (for direkte aktiveringslenke)
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://vikingmester.no';
    const inviteLink = `${baseUrl}/?invite=${inviteToken}`;
    
    await saveCollectionItem('invitations', {
      id: `inv-${inviteToken}`,
      token: inviteToken,
      email: email ? email.toLowerCase().trim() : '',
      companyId,
      companyName,
      role: 'admin',
      status: createAdminUser ? 'accepted' : 'pending',
      invitedBy: requestingUser.email,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: now.toISOString()
    });

    // 4. Oppdater lead-status hvis leadId er oppgitt
    if (leadId) {
      const existingLead = await getCollectionItemById('leads', leadId);
      const updatedLead = {
        ...(existingLead || {}),
        id: leadId,
        status: 'converted',
        convertedCompanyId: companyId,
        convertedCompanyName: companyName,
        convertedAt: now.toISOString()
      };
      await saveCollectionItem('leads', updatedLead);
    }

    // 5. Logg i agentaktivitet / systemlogg
    await saveCollectionItem('agent_activities', {
      type: 'lead_converted',
      title: `Lead konvertert til kunde: ${companyName}`,
      description: `${contactName || companyName} (${email || 'ingen e-post'}) ble opprettet som ${plan.toUpperCase()}-kunde (${status === 'trial' ? `${trialDays} dagers prøve` : 'Aktiv'}).`,
      companyId,
      createdAt: now.toISOString()
    });

    // 6. Send velkomst-e-post via Resend hvis aktivert og e-post finnes
    let emailSent = false;
    if (sendWelcomeEmail && email) {
      const resendKey = process.env.RESEND_API_KEY || process.env.RESEND_API || process.env.RESEND_KEY;
      const emailSubject = `Velkommen til VikingMester – Din konto for ${companyName} er klar!`;
      const emailBody = customEmailMessage || `Hei ${contactName || 'kunde'}!\n\nVi har gleden av å bekrefte at din konto hos VikingMester for ${companyName} er opprettet.\n\nInnloggingsdetaljer:\nNettadresse: ${baseUrl}\nBrukernavn/E-post: ${email}\nMidlertidig passord: ${tempPassword}\n\nDu kan også logge inn direkte via denne aktiveringslenken:\n${inviteLink}\n\nLykke til med et mer effektivt KS- og prosjekthverdag!\n\nMed vennlig hilsen,\nVikingMester Teamet`;

      const emailHtml = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 28px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 20px;">
          <div style="margin-bottom: 24px; text-align: center;">
            <h1 style="color: #0f172a; font-size: 24px; font-weight: 800; margin: 0;">Velkommen til VikingMester!</h1>
            <p style="color: #64748b; font-size: 14px; margin-top: 6px;">Norges ledende autonome KS- og prosjektstyringssystem for bygg og anlegg</p>
          </div>
          
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 20px; margin: 24px 0;">
            <p style="margin: 0 0 12px 0; font-size: 15px; color: #1e293b;">Hei <strong>${contactName || 'kunde'}</strong>,</p>
            <p style="margin: 0 0 16px 0; font-size: 14px; color: #475569; line-height: 1.6;">
              Kontoen for <strong>${companyName}</strong> er nå klargjort med <strong>${plan === 'solo' ? 'Solo-pakken' : plan === 'entreprenor' ? 'Totalentreprenør-pakken' : 'Team-pakken'}</strong> (${status === 'trial' ? `${trialDays} dagers fri prøveperiode` : 'Aktiv avtale'}).
            </p>
            
            <div style="background: #ffffff; border: 1px dashed #cbd5e1; border-radius: 10px; padding: 14px; margin-bottom: 18px;">
              <div style="font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 6px;">Dine innloggingsdetaljer:</div>
              <div style="font-size: 14px; color: #0f172a; margin-bottom: 4px;"><strong>Brukernavn / E-post:</strong> ${email}</div>
              <div style="font-size: 14px; color: #0f172a;"><strong>Midlertidig passord:</strong> <code style="background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-weight: bold; color: #4f46e5;">${tempPassword}</code></div>
            </div>

            <table role="presentation" border="0" cellpadding="0" cellspacing="0" align="center" style="margin: 24px auto 12px auto;">
              <tr>
                <td align="center" bgcolor="#0f172a" style="background-color: #0f172a; border-radius: 10px; border: 2px solid #1e293b;">
                  <a href="${inviteLink}" style="display: inline-block; padding: 14px 28px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; font-weight: 700; color: #ffffff !important; text-decoration: none; line-height: 1.2;">
                    <span style="color: #ffffff !important; font-weight: bold;">Åpne VikingMester og Logg Inn &rarr;</span>
                  </a>
                </td>
              </tr>
            </table>
            <div style="background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 8px; padding: 12px; margin: 16px 0; font-size: 12px; color: #64748b; word-break: break-all; text-align: left;">
              Fungerer ikke knappen? Kopier og lim inn denne lenken i nettleseren:<br/>
              <a href="${inviteLink}" style="color: #4f46e5; text-decoration: underline;">${inviteLink}</a>
            </div>
          </div>

          <p style="font-size: 12px; color: #94a3b8; text-align: center; margin-top: 24px; line-height: 1.5;">
            Trenger du hjelp med oppstart eller integrasjoner mot NOBB, Discord, Slack eller Teams? Svar direkte på denne e-posten, så hjelper vi deg omgående.
          </p>
        </div>
      `;

      if (resendKey) {
        try {
          const fromEmail = process.env.EMAIL_FROM || process.env.RESEND_FROM || 'VikingMester <hei@vikingmester.no>';
          const resendRes = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${resendKey}`
            },
            body: JSON.stringify({
              from: fromEmail,
              to: email,
              subject: emailSubject,
              text: emailBody,
              html: emailHtml
            })
          });
          if (resendRes.ok) {
            emailSent = true;
          }
        } catch (mailErr) {
          console.warn('Kunne ikke sende velkomst-e-post via Resend:', mailErr);
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Kunde "${companyName}" er nå opprettet!`,
      company: companyRecord,
      user: createdUser,
      tempPassword: createAdminUser ? tempPassword : null,
      inviteLink,
      emailSent
    });

  } catch (err: any) {
    return apiError(err, 'Kunne ikke konvertere lead til kunde.');
  }
}
