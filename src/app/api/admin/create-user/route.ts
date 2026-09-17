import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import { getUserFromRequest, isUserAdmin } from '@/src/lib/server/auth';
import { saveCollectionItem, getCollectionItemById, dbQuery, inMemoryStore } from '@/src/lib/server/db';
import { sanitize, sanitizeEmail, sanitizeHeader } from '@/src/lib/sanitize';

export async function POST(req: NextRequest) {
  try {
    // 🛡️ SECURITY: Kun systemadministratorer (SuperAdmin) har lov til å opprette partnere/brukere
    const requestingUser = getUserFromRequest(req);
    if (!requestingUser || !isUserAdmin(requestingUser)) {
      return NextResponse.json(
        { error: 'Uautorisert: Kun systemadministratorer har tilgang til denne funksjonen.' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const accountType = body.accountType || 'partner'; // 'partner' | 'internal' | 'customer'
    const companyMode = body.companyMode || 'new';     // 'new' | 'existing'
    let companyId = sanitize(body.companyId || '').trim();
    let companyName = sanitize(body.companyName || '').trim();
    const orgNumber = sanitizeHeader((body.orgNumber || body.orgnr || '').toString().replace(/\s+/g, '').trim());
    const name = sanitize(body.name || body.displayName || '').trim();
    const email = sanitizeEmail(body.email || '');
    const phone = sanitize(body.phone || '').trim();
    const password = String(body.password || '').trim();
    const role = sanitize(body.role || 'admin');
    const trade = sanitize(body.trade || 'Byggmester / Tømrer');
    const sendWelcomeEmail = Boolean(body.sendWelcomeEmail);
    const customMessage = body.customMessage ? String(body.customMessage) : null;

    if (!email) {
      return NextResponse.json({ error: 'E-postadresse er påkrevd.' }, { status: 400 });
    }

    if (!password || password.length < 8) {
      return NextResponse.json({ error: 'Passord må være på minst 8 tegn.' }, { status: 400 });
    }

    const emailLower = email.toLowerCase().trim();

    // 1. Sjekk om e-posten allerede er registrert
    let existingUser: any = null;
    const existingRows = await dbQuery('SELECT * FROM users WHERE LOWER(email) = $1', [emailLower]).catch(() => []);
    if (existingRows && existingRows.length > 0) {
      existingUser = existingRows[0];
    } else if (inMemoryStore.users) {
      existingUser = inMemoryStore.users.find(u => u.email?.toLowerCase() === emailLower);
    }

    if (existingUser) {
      return NextResponse.json(
        { error: `En bruker med e-postadressen "${emailLower}" er allerede registrert i systemet.` },
        { status: 409 }
      );
    }

    const now = new Date();
    const isPartner = accountType === 'partner' || accountType === 'internal';
    const isInternal = accountType === 'internal';

    // 2. Håndter bedrift (enten opprette ny eller knytte til eksisterende)
    let finalCompany: any = null;

    if (companyMode === 'new' || !companyId) {
      companyId = 'comp-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 7);
      if (!companyName) {
        companyName = isInternal 
          ? 'VikingMester Internt' 
          : (name ? `${name} (Partner)` : 'Samarbeidspartner AS');
      }

      const plan = isPartner ? 'partner' : (body.plan || 'team');
      const monthlyPrice = isPartner ? 0 : (plan === 'solo' ? 1490 : plan === 'entreprenor' ? 6900 : 3490);

      finalCompany = {
        id: companyId,
        name: companyName,
        orgNumber: orgNumber || '',
        orgnr: orgNumber || '',
        contactName: name || companyName,
        email: emailLower,
        phone: phone || '',
        trade,
        plan,
        monthlyPrice,
        status: 'active',
        subscriptionStatus: 'active', // Alltid aktiv uten tidsbegrensning for partnere/kollegaer
        isPartner,
        isInternal,
        modules: body.modules || [
          'projects', 'checklists', 'deviations', 'ai', 'economy',
          'fdv', 'inventory', 'vehicle', 'time', 'apprentice', 'building_app'
        ],
        userCount: 1,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString()
      };

      await saveCollectionItem('companies', finalCompany);
    } else {
      // Knytter til eksisterende bedrift
      const existingComp = await getCollectionItemById('companies', companyId);
      if (existingComp) {
        companyName = existingComp.name || companyName;
        existingComp.userCount = (existingComp.userCount || 0) + 1;
        existingComp.updatedAt = now.toISOString();
        if (isPartner && !existingComp.isPartner) {
          existingComp.isPartner = true;
          existingComp.plan = 'partner';
          existingComp.monthlyPrice = 0;
        }
        await saveCollectionItem('companies', existingComp);
        finalCompany = existingComp;
      }
    }

    // 3. Krypter passord og opprett bruker
    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = 'u-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 7);

    const userObj = {
      id: userId,
      uid: userId,
      email: emailLower,
      displayName: name || emailLower.split('@')[0],
      role: role || 'admin',
      trade: trade || 'Byggmester',
      company: companyName,
      companyId: companyId,
      subscriptionStatus: 'active', // Ingen prøvetidslås
      orgnr: orgNumber || null,
      phone: phone || null,
      isPartner,
      isInternal,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString()
    };

    // Lagre bruker i PostgreSQL og inMemoryStore
    await dbQuery(
      `INSERT INTO users (id, email, password, display_name, role, trade, company, company_id, subscription_status, orgnr)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (email) DO UPDATE SET
         display_name = EXCLUDED.display_name,
         company = EXCLUDED.company,
         company_id = EXCLUDED.company_id,
         subscription_status = EXCLUDED.subscription_status,
         role = EXCLUDED.role`,
      [
        userObj.id,
        userObj.email,
        hashedPassword,
        userObj.displayName,
        userObj.role,
        userObj.trade,
        userObj.company,
        userObj.companyId,
        userObj.subscriptionStatus,
        userObj.orgnr
      ]
    ).catch((err) => {
      console.warn('Admin user direct insert warning:', err);
    });

    if (!inMemoryStore.users) inMemoryStore.users = [];
    const existingMemIdx = inMemoryStore.users.findIndex(u => u.email?.toLowerCase() === userObj.email);
    if (existingMemIdx !== -1) {
      inMemoryStore.users[existingMemIdx] = { ...userObj, password: hashedPassword };
    } else {
      inMemoryStore.users.push({ ...userObj, password: hashedPassword });
    }

    await saveCollectionItem('users', {
      ...userObj,
      password: hashedPassword
    });

    // 4. Send eventuell velkomst-epost
    let emailSent = false;
    const resendKey = process.env.RESEND_API_KEY || process.env.RESEND_API || process.env.RESEND_KEY;
    if (sendWelcomeEmail && resendKey) {
      try {
        const fromEmail = process.env.EMAIL_FROM || process.env.RESEND_FROM || 'VikingMester <hei@vikingmester.no>';
        const subject = isInternal 
          ? `Din interne brukerkonto i VikingMester` 
          : `Velkommen som samarbeidspartner i VikingMester`;

        const greetingText = customMessage || (isInternal
          ? `Hei ${name || 'kollega'}!\n\nDet er opprettet en intern brukerkonto for deg i VikingMester for ${companyName}.\n\nBruk innloggingsopplysningene nedenfor for å logge inn.`
          : `Hei ${name || 'samarbeidspartner'}!\n\nVi har gleden av å ønske deg velkommen til VikingMester. Du har fått tildelt en partnerkonto med full tilgang til plattformen.\n\nBruk innloggingsopplysningene nedenfor for å logge inn.`);

        const emailHtml = `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1e293b; background: #ffffff;">
            <div style="text-align: center; margin-bottom: 24px;">
              <h1 style="color: #4f46e5; margin: 0; font-size: 26px; font-weight: 800;">VikingMester</h1>
              <p style="color: #64748b; font-size: 13px; margin-top: 4px;">KS, HMS & Prosjektstyring for Bygg og Anlegg</p>
            </div>

            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; padding: 20px; margin-bottom: 24px;">
              <p style="font-size: 15px; line-height: 1.6; margin-top: 0;">${greetingText.replace(/\n/g, '<br/>')}</p>
              
              <div style="background: #ffffff; border: 1px solid #cbd5e1; border-radius: 12px; padding: 16px; margin: 20px 0;">
                <p style="margin: 0 0 8px 0; font-size: 12px; font-weight: bold; text-transform: uppercase; color: #64748b;">Dine innloggingsopplysninger:</p>
                <p style="margin: 4px 0; font-size: 14px;"><strong>Brukernavn (E-post):</strong> <span style="color: #4f46e5;">${emailLower}</span></p>
                <p style="margin: 4px 0; font-size: 14px;"><strong>Midlertidig passord:</strong> <code style="background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-weight: bold; color: #0f172a;">${password}</code></p>
                <p style="margin: 4px 0; font-size: 14px;"><strong>Firma / Konto:</strong> ${companyName}</p>
                <p style="margin: 4px 0; font-size: 14px;"><strong>Rolle:</strong> ${role === 'admin' ? 'Administrator' : role === 'manager' ? 'Prosjektleder' : 'Håndverker'}</p>
              </div>

              <div style="text-align: center; margin: 24px 0 12px 0;">
                <a href="https://vikingmester.no" style="display: inline-block; background: #4f46e5; color: #ffffff; text-decoration: none; font-weight: bold; font-size: 14px; padding: 12px 28px; border-radius: 10px; box-shadow: 0 4px 12px rgba(79, 70, 229, 0.25);">
                  Logg inn på VikingMester →
                </a>
              </div>
            </div>

            <p style="font-size: 12px; color: #94a3b8; text-align: center; margin: 0;">
              Denne e-posten ble sendt fra administrator i VikingMester (AIChat Norge AS / Vikingnet).
            </p>
          </div>
        `;

        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${resendKey}`
          },
          body: JSON.stringify({
            from: fromEmail,
            to: [emailLower],
            subject,
            html: emailHtml
          })
        });

        emailSent = res.ok;
      } catch (emailErr) {
        console.warn('Welcome email error:', emailErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: `${isInternal ? 'Kollega' : isPartner ? 'Samarbeidspartner' : 'Bruker'} "${userObj.displayName}" ble opprettet!`,
      user: {
        id: userObj.id,
        email: userObj.email,
        displayName: userObj.displayName,
        role: userObj.role,
        company: userObj.company,
        companyId: userObj.companyId,
        subscriptionStatus: userObj.subscriptionStatus,
        isPartner: userObj.isPartner,
        isInternal: userObj.isInternal
      },
      company: finalCompany,
      credentials: {
        email: emailLower,
        password: password,
        loginUrl: 'https://vikingmester.no'
      },
      emailSent
    });
  } catch (err: any) {
    console.error('Create User Error:', err);
    return NextResponse.json(
      { error: 'Kunne ikke opprette bruker: ' + (err.message || 'Ukjent serverfeil') },
      { status: 500 }
    );
  }
}
