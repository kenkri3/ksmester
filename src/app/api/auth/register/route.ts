import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import { dbQuery, inMemoryStore, saveCollectionItem, ADMIN_EMAILS } from '@/src/lib/server/db';
import { signToken } from '@/src/lib/server/auth';
import { sendSystemEmail, renderBrandedEmailTemplate } from '@/src/lib/server/emailSender';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password, name, company, orgnr, trade, gdprConsent, companyId: inputCompanyId, role: inputRole } = body || {};
    const cleanOrgnr = (orgnr || '').toString().replace(/\s+/g, '').trim();

    if (!email || !password) {
      return NextResponse.json({ error: 'Både e-post og passord må fylles ut.' }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'Passordet må være på minst 8 tegn av sikkerhetshensyn.' }, { status: 400 });
    }

    if (!gdprConsent) {
      return NextResponse.json({ error: 'Du må godta personvernerklæringen og brukervilkårene iht. GDPR for å opprette konto.' }, { status: 400 });
    }

    const clientIp = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '127.0.0.1';
    const emailLower = email.toLowerCase().trim();

    const isSuperAdminEmail = 
      ADMIN_EMAILS.includes(emailLower) || 
      ['kenkri3@gmail.com', 'aichatnorge@gmail.com', 'kenneth@aichatnorge.no', 'fredrik.r.ellingsen@gmail.com', 'fredrik@aichatnorge.no', 'admin@vikingmester.no', 'post@vikingent.no'].includes(emailLower);

    let existingUser: any = null;
    const rows = await dbQuery('SELECT * FROM users WHERE LOWER(email) = $1', [emailLower]);
    if (rows && rows.length > 0) {
      existingUser = rows[0];
    } else {
      existingUser = inMemoryStore.users?.find(u => u.email.toLowerCase() === emailLower);
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Sikkerhet: Hvis bruker allerede eksisterer, tillat kun aktivering dersom det foreligger en gyldig invitasjon
    if (existingUser) {

      // Sjekk om brukeren har en aktiv invitasjon (håndverker, leder, etc.)
      const inviteRows = await dbQuery(
        `SELECT * FROM items_store WHERE collection_name = 'invitations' AND LOWER(data->>'inviteeEmail') = $1 AND data->>'status' = 'pending'`,
        [emailLower]
      ).catch(() => []);
      const hasInvite = (inviteRows && inviteRows.length > 0) || (inMemoryStore.invitations || []).some(
        inv => inv && inv.inviteeEmail?.toLowerCase() === emailLower && inv.status === 'pending'
      );

      if (hasInvite) {
        await dbQuery(
          `UPDATE users SET password = $1, display_name = COALESCE($2, display_name), subscription_status = 'active', updated_at = NOW() WHERE LOWER(email) = $3`,
          [hashedPassword, name?.trim() || null, emailLower]
        ).catch(() => {});
        if (inMemoryStore.users) {
          const mem = inMemoryStore.users.find(u => u.email.toLowerCase() === emailLower);
          if (mem) {
            mem.password = hashedPassword;
            mem.subscriptionStatus = 'active';
            if (name?.trim()) mem.displayName = name.trim();
          }
        }
        const updatedUser = {
          id: existingUser.id,
          uid: existingUser.id,
          email: emailLower,
          displayName: name?.trim() || existingUser.display_name || existingUser.displayName || emailLower.split('@')[0],
          role: existingUser.role || 'worker',
          company: existingUser.company || company,
          companyId: existingUser.company_id || existingUser.companyId || 'comp-001',
          subscriptionStatus: 'active'
        };
        const token = signToken({ id: updatedUser.id, email: updatedUser.email, role: updatedUser.role, companyId: updatedUser.companyId, company: updatedUser.company });
        return NextResponse.json({ token, user: updatedUser, message: 'Konto aktivert med ditt personlige passord!' });
      }

      return NextResponse.json({ error: 'En bruker med denne e-posten er allerede registrert. Logg inn eller benytt Glemt passord.' }, { status: 409 });
    }

    const isJoiningExistingCompany = Boolean(inputCompanyId && inputCompanyId !== 'new' && inputCompanyId !== 'comp-default');
    const userId = isSuperAdminEmail && emailLower.includes('fredrik') ? 'u-admin-fredrik' : ('u-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 7));
    const companyId = isSuperAdminEmail ? 'comp-001' : (isJoiningExistingCompany ? inputCompanyId : ('comp-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 7)));
    const finalRole = isSuperAdminEmail ? 'superadmin' : (inputRole || (isJoiningExistingCompany ? 'worker' : 'leader'));
    const finalCompany = isSuperAdminEmail ? 'AIChat Norge AS / Vikingnet' : (company?.trim() || 'Ny Bedrift AS');
    const finalStatus = isSuperAdminEmail || isJoiningExistingCompany ? 'active' : 'trial';

    const userObj = {
      id: userId,
      uid: userId,
      email: emailLower,
      displayName: name?.trim() || (isSuperAdminEmail ? (emailLower.includes('fredrik') ? 'Fredrik R. Ellingsen' : 'Kenneth Kristiansen') : email.split('@')[0]),
      role: finalRole,
      trade: trade || 'Byggmester',
      company: finalCompany,
      orgnr: isSuperAdminEmail ? '933 607 779' : (cleanOrgnr || null),
      companyId: companyId,
      subscriptionStatus: finalStatus,
      gdprConsent: true,
      gdprConsentAt: new Date().toISOString(),
      gdprConsentIp: clientIp,
      createdAt: new Date().toISOString()
    };

    await dbQuery(
      `INSERT INTO users (id, email, password, display_name, role, trade, company, company_id, subscription_status, orgnr)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (email) DO UPDATE SET password = EXCLUDED.password, role = EXCLUDED.role, company = EXCLUDED.company, company_id = EXCLUDED.company_id, subscription_status = EXCLUDED.subscription_status`,
      [userObj.id, userObj.email, hashedPassword, userObj.displayName, userObj.role, userObj.trade, userObj.company, userObj.companyId, userObj.subscriptionStatus, userObj.orgnr]
    ).catch(() => {});

    if (!inMemoryStore.users) inMemoryStore.users = [];
    inMemoryStore.users.push({ ...userObj, password: hashedPassword });

    // Kun opprett ny bedrift i companies dersom brukeren ikke ble invitert inn i et eksisterende selskap
    if (!isJoiningExistingCompany) {
      const companyData = {
        id: companyId,
        name: userObj.company,
        orgnr: isSuperAdminEmail ? '933 607 779' : (cleanOrgnr || ''),
        contactName: userObj.displayName,
        email: emailLower,
        phone: '401 63 082',
        plan: isSuperAdminEmail ? 'internal' : 'pro',
        status: 'active',
        subscriptionStatus: finalStatus,
        isInternal: isSuperAdminEmail,
        monthlyPrice: isSuperAdminEmail ? 0 : 3490,
        modules: ['all_modules', 'projects', 'checklists', 'deviations', 'ai', 'economy', 'fdv', 'inventory', 'vehicle', 'time', 'apprentice', 'building_app'],
        createdAt: new Date().toISOString()
      };
      await saveCollectionItem('companies', companyData).catch(() => {});
    }

    const token = signToken({ id: userObj.id, email: userObj.email, role: userObj.role, companyId: userObj.companyId, company: userObj.company });

    // Send automatisk velkomst- og bekreftelsesepost til kunden
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || 'https://vikingmester.no';
    if (emailLower && !isSuperAdminEmail) {
      try {
        const emailBodyHtml = `
          <div style="font-size: 15px; color: #1e293b; line-height: 1.65;">
            <p>Hei <strong>${userObj.displayName}</strong>!</p>
            <p>
              Takk for din registrering! Din konto for <strong>${userObj.company}</strong> er nå opprettet og klar til bruk.
            </p>
            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px 20px; margin: 20px 0;">
              <h4 style="margin: 0 0 10px 0; color: #0f172a; font-size: 15px;">Din innloggingsinformasjon:</h4>
              <p style="margin: 0 0 6px 0; font-size: 14px; color: #334155;"><strong>Brukernavn / E-post:</strong> ${emailLower}</p>
              <p style="margin: 0 0 6px 0; font-size: 14px; color: #334155;"><strong>Bedrift:</strong> ${userObj.company}</p>
              <p style="margin: 0; font-size: 14px; color: #059669; font-weight: bold;">Status: 14 dagers gratis prøveperiode aktivert (0,- kr)</p>
            </div>
            <p style="font-size: 14px; color: #475569;">
              Du kan logge inn på din arbeidsflate fra både PC og mobil når som helst via lenken nedenfor.
            </p>
          </div>
        `;

        const emailHtml = renderBrandedEmailTemplate({
          subject: `Velkommen til VikingMester – Din konto for ${userObj.company} er klar`,
          title: `Velkommen til VikingMester!`,
          subtitle: `14 dagers gratis prøveperiode aktivert for ${userObj.company}`,
          badgeText: `14 DAGERS GRATIS PRØVE`,
          badgeColor: `#059669`,
          accentColor: `#7c3aed`,
          companyName: 'VikingMester',
          bodyHtml: emailBodyHtml,
          button: {
            url: baseUrl,
            label: 'Åpne VikingMester og start nå',
            bgColor: '#059669',
            textColor: '#ffffff',
            icon: '🚀'
          },
          secondaryUrl: baseUrl,
          secondaryText: 'Du kan også logge inn direkte via denne lenken:',
          footerDetails: `AIChat Norge AS / Vikingnet · Org.nr: 933 851 222 MVA`
        });

        await sendSystemEmail({
          to: emailLower,
          replyTo: 'hei@vikingmester.no',
          subject: `Velkommen til VikingMester – Din konto for ${userObj.company} er klar`,
          html: emailHtml,
          text: `Hei ${userObj.displayName}!\n\nTakk for din registrering. Din konto for ${userObj.company} er nå opprettet.\n\nInnlogging: ${baseUrl}\nBrukernavn: ${emailLower}\n\nMed vennlig hilsen,\nVikingMester Teamet`,
          type: 'general',
          companyName: 'VikingMester'
        });
      } catch (custMailErr: any) {
        console.warn('Customer register welcome mail notice:', custMailErr.message);
      }

      // Varsle admin
      try {
        await sendSystemEmail({
          to: ['kenkri3@gmail.com', 'fredrik.r.ellingsen@gmail.com', 'aichatnorge@gmail.com'],
          replyTo: emailLower,
          subject: `🔥 NY BRUKERREGISTRERING: ${userObj.company} (${userObj.displayName})`,
          text: `Ny bruker registrert:\nBedrift: ${userObj.company}\nNavn: ${userObj.displayName}\nE-post: ${emailLower}\nOrg.nr: ${cleanOrgnr || 'Ikke oppgitt'}`,
          type: 'general',
          companyName: 'VikingMester Admin'
        });
      } catch (adminErr: any) {
        console.warn('Admin register notification notice:', adminErr.message);
      }
    }

    return NextResponse.json({ token, user: userObj });
  } catch (err: any) {
    console.error('Register Error:', err);
    return NextResponse.json({ error: 'Kunne ikke fullføre registreringen.' }, { status: 500 });
  }
}
