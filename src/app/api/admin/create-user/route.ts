import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import { getUserFromRequest, isUserAdmin } from '@/src/lib/server/auth';
import { saveCollectionItem, getCollectionItemById, dbQuery, inMemoryStore } from '@/src/lib/server/db';
import { sanitize, sanitizeEmail, sanitizeHeader } from '@/src/lib/sanitize';
import { sendSystemEmail } from '@/src/lib/server/emailSender';

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
    const accountType = body.accountType || 'trial'; // 'trial' | 'tester' | 'partner' | 'internal' | 'customer'
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

    const isTrial = accountType === 'trial' || accountType === 'tester' || Boolean(body.isTrial);
    const isBetaTester = Boolean(body.isBetaTester || accountType === 'tester');
    const trialDays = typeof body.trialDays === 'number' && body.trialDays > 0 
      ? body.trialDays 
      : (body.trialDays ? parseInt(body.trialDays) : (isBetaTester ? 60 : 14));

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
    const isPartner = accountType === 'partner' || accountType === 'internal' || accountType === 'superadmin';
    const isInternal = accountType === 'internal' || accountType === 'superadmin' || role === 'superadmin';
    const isSuperAdminAccount = role === 'superadmin' || accountType === 'superadmin' || emailLower === 'fredrik@aichatnorge.no' || emailLower === 'fredrik.r.ellingsen@gmail.com';

    // 2. Håndter bedrift (enten opprette ny eller knytte til eksisterende)
    let finalCompany: any = null;

    if (isSuperAdminAccount) {
      companyId = 'comp-001';
      companyName = 'AIChat Norge AS / Vikingnet';
      finalCompany = {
        id: 'comp-001',
        name: companyName,
        orgNumber: '933 607 779',
        orgnr: '933 607 779',
        contactName: name || 'Fredrik R. Ellingsen',
        email: emailLower,
        phone: phone || '401 63 082',
        trade: trade || 'Byggmester',
        plan: 'internal',
        monthlyPrice: 0,
        status: 'active',
        subscriptionStatus: 'active',
        isPartner: true,
        isInternal: true,
        modules: ['all_modules', 'projects', 'checklists', 'deviations', 'ai', 'economy', 'fdv', 'inventory', 'vehicle', 'time', 'apprentice', 'building_app'],
        createdAt: now.toISOString(),
        updatedAt: now.toISOString()
      };
      await saveCollectionItem('companies', finalCompany);
    } else if (companyMode === 'new' || !companyId) {
      companyId = 'comp-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 7);
      if (!companyName) {
        companyName = isInternal 
          ? 'VikingMester Internt' 
          : isPartner
          ? (name ? `${name} (Partner)` : 'Samarbeidspartner AS')
          : (name ? `${name} AS` : 'Prøvebedrift AS');
      }

      const plan = isInternal ? 'internal' : isPartner ? 'partner' : isBetaTester ? 'entreprenor' : (body.plan || 'team');
      const monthlyPrice = (isPartner || isInternal || isTrial) ? 0 : (plan === 'solo' ? 690 : plan === 'entreprenor' ? 2990 : 1490);

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
        subscriptionStatus: isTrial ? 'trial' : 'active',
        trialDays: isTrial ? trialDays : undefined,
        trialStartDate: isTrial ? now.toISOString() : undefined,
        trialDaysLeft: isTrial ? trialDays : undefined,
        isBetaTester,
        isPartner,
        isInternal,
        modules: body.modules || [
          'all_modules', 'projects', 'checklists', 'deviations', 'ai', 'economy',
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
        if (isTrial) {
          existingComp.subscriptionStatus = 'trial';
          existingComp.trialDays = trialDays;
          existingComp.trialStartDate = now.toISOString();
          existingComp.trialDaysLeft = trialDays;
          if (isBetaTester) existingComp.isBetaTester = true;
        } else if (isInternal) {
          existingComp.isInternal = true;
          existingComp.plan = 'internal';
          existingComp.monthlyPrice = 0;
          existingComp.subscriptionStatus = 'active';
        } else if (isPartner && !existingComp.isPartner) {
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
    const userId = isSuperAdminAccount && emailLower.includes('fredrik') ? 'u-admin-fredrik' : ('u-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 7));

    const userObj = {
      id: userId,
      uid: userId,
      email: emailLower,
      displayName: name || (isSuperAdminAccount && emailLower.includes('fredrik') ? 'Fredrik R. Ellingsen' : emailLower.split('@')[0]),
      role: isSuperAdminAccount ? 'superadmin' : (role || 'admin'),
      trade: trade || 'Byggmester',
      company: isSuperAdminAccount ? 'AIChat Norge AS / Vikingnet' : companyName,
      companyId: isSuperAdminAccount ? 'comp-001' : companyId,
      subscriptionStatus: isTrial ? 'trial' : 'active',
      trialDays: isTrial ? trialDays : undefined,
      trialStartDate: isTrial ? now.toISOString() : undefined,
      trialDaysLeft: isTrial ? trialDays : undefined,
      isBetaTester,
      orgnr: isSuperAdminAccount ? '933 607 779' : (orgNumber || null),
      phone: phone || null,
      isPartner: isSuperAdminAccount || isPartner,
      isInternal: isSuperAdminAccount || isInternal,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString()
    };

    // Lagre bruker i PostgreSQL og inMemoryStore
    await dbQuery(
      `INSERT INTO users (id, email, password, display_name, role, trade, company, company_id, subscription_status, orgnr, trial_days, trial_start_date, is_beta_tester)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       ON CONFLICT (email) DO UPDATE SET
         display_name = EXCLUDED.display_name,
         company = EXCLUDED.company,
         company_id = EXCLUDED.company_id,
         subscription_status = EXCLUDED.subscription_status,
         trial_days = EXCLUDED.trial_days,
         trial_start_date = EXCLUDED.trial_start_date,
         is_beta_tester = EXCLUDED.is_beta_tester,
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
        userObj.orgnr,
        isTrial ? trialDays : 14,
        isTrial ? now.toISOString() : null,
        isBetaTester
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

    // 4. Opprett alltid en sikker aktiveringslenke der brukeren kan velge sitt eget passord
    const resetToken = 'rst-' + Date.now() + '-' + Math.random().toString(36).substring(2, 12);
    const origin = req.headers.get('origin') || process.env.NEXTAUTH_URL || 'https://vikingmester.no';
    const setPasswordUrl = `${origin}/auth/reset-password?token=${resetToken}&email=${encodeURIComponent(emailLower)}`;

    await saveCollectionItem('password_resets', {
      email: emailLower,
      token: resetToken,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 dagers gyldighet for invitasjonsaktivering
      createdAt: now.toISOString(),
      status: 'pending'
    });

    let emailSent = false;
    let emailMessage = '';
    if (sendWelcomeEmail) {
      try {
        const subject = isSuperAdminAccount
          ? `👑 Velkommen som SuperAdmin & Systemeier i VikingMester`
          : isBetaTester
          ? `🧪 Velkommen som Betatester i VikingMester (${trialDays} dagers gratis tilgang)`
          : isTrial
          ? `Velkommen til VikingMester (${trialDays} dagers gratis prøveperiode)`
          : isInternal 
          ? `Din interne brukerkonto i VikingMester` 
          : `Velkommen som samarbeidspartner i VikingMester`;

        const greetingText = customMessage || (isSuperAdminAccount
          ? `Hei ${name || 'Fredrik'}!\n\nDu har blitt opprettet som SuperAdmin og Systemeier for VikingMester (AIChat Norge AS / Vikingnet).\n\nDu har 100% full plattformeiertilgang med nøyaktig samme rettigheter som Kenneth Kristiansen (SuperAdmin-portal, ubegrenset kalkyle, impersonering og full systemkontroll).\n\nDu kan velge ditt eget personlige passord med en gang ved å klikke på knappen under.`
          : isBetaTester
          ? `Hei ${name || 'Fagarbeider'}!\n\nDu har blitt invitert som betatester i VikingMester med ${trialDays} dagers full, kostnadsfri tilgang til hele systemet!\n\nVi setter stor pris på at du tester ut løsningen i din arbeidshverdag. Test gjerne byggedagbok med stemmestyring, TEK17-visjon for fotokontroll, kalkyler, endringsordrer og SJA.\n\nKlikk på knappen under for å velge ditt personlige passord og komme i gang med én gang.`
          : isTrial
          ? `Hei ${name || 'Byggmester'}!\n\nVelkommen til VikingMester! Det er opprettet en konto for deg med ${trialDays} dagers kostnadsfri og uforpliktende prøveperiode for ${companyName}.\n\nKlikk på knappen under for å velge ditt eget personlige passord og starte prøveperioden.`
          : isInternal
          ? `Hei ${name || 'kollega'}!\n\nDet er opprettet en intern brukerkonto for deg i VikingMester for ${companyName}.\n\nKlikk på knappen under for å velge ditt personlige passord og aktivere kontoen.`
          : `Hei ${name || 'samarbeidspartner'}!\n\nVi har gleden av å ønske deg velkommen til VikingMester. Du har fått tildelt en partnerkonto med full tilgang til plattformen.\n\nKlikk på knappen under for å velge ditt personlige passord og aktivere kontoen.`);

        const emailHtml = `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1e293b; background: #ffffff;">
            <div style="text-align: center; margin-bottom: 24px;">
              <h1 style="color: ${isSuperAdminAccount ? '#d97706' : isBetaTester ? '#06b6d4' : '#4f46e5'}; margin: 0; font-size: 26px; font-weight: 800;">
                ${isSuperAdminAccount ? '👑 VikingMester SuperAdmin' : isBetaTester ? '🧪 VikingMester Betatest' : 'VikingMester'}
              </h1>
              <p style="color: #64748b; font-size: 13px; margin-top: 4px;">KS, HMS & Prosjektstyring for Bygg og Anlegg</p>
            </div>

            <div style="background: #f8fafc; border: 1px solid ${isSuperAdminAccount ? '#fde68a' : isBetaTester ? '#a5f3fc' : '#e2e8f0'}; border-radius: 16px; padding: 20px; margin-bottom: 24px;">
              <p style="font-size: 15px; line-height: 1.6; margin-top: 0;">${greetingText.replace(/\n/g, '<br/>')}</p>
              
              <div style="text-align: center; margin: 24px 0 20px 0;">
                <a href="${setPasswordUrl}" style="display: inline-block; background: ${isSuperAdminAccount ? 'linear-gradient(135deg, #d97706 0%, #f59e0b 100%)' : isBetaTester ? 'linear-gradient(135deg, #0891b2 0%, #06b6d4 100%)' : 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)'}; color: #ffffff; text-decoration: none; font-weight: 800; font-size: 15px; padding: 14px 32px; border-radius: 12px; box-shadow: 0 4px 14px rgba(79, 70, 229, 0.3);">
                  ${isSuperAdminAccount ? '👑 Velg ditt passord og aktiver SuperAdmin nå →' : isBetaTester ? '🧪 Velg passord & start betatestingen →' : 'Velg ditt personlige passord & logg inn →'}
                </a>
              </div>

              <div style="background: #ffffff; border: 1px solid #cbd5e1; border-radius: 12px; padding: 16px; margin: 20px 0;">
                <p style="margin: 0 0 8px 0; font-size: 12px; font-weight: bold; text-transform: uppercase; color: #64748b;">Kontoopplysninger:</p>
                <p style="margin: 4px 0; font-size: 14px;"><strong>Brukernavn (E-post):</strong> <span style="color: #4f46e5; font-weight: bold;">${emailLower}</span></p>
                <p style="margin: 4px 0; font-size: 14px;"><strong>Midlertidig passord:</strong> <code style="background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-weight: bold; color: #0f172a;">${password}</code></p>
                <p style="margin: 4px 0; font-size: 14px;"><strong>Firma / Organisasjon:</strong> ${userObj.company}</p>
                <p style="margin: 4px 0; font-size: 14px;"><strong>Rolle:</strong> <span style="font-weight: bold; color: ${isSuperAdminAccount ? '#d97706' : '#1e293b'};">${isSuperAdminAccount ? '👑 SuperAdmin / Systemeier' : role === 'admin' ? 'Administrator' : role === 'manager' ? 'Prosjektleder' : 'Håndverker'}</span></p>
                ${isTrial ? `<p style="margin: 4px 0; font-size: 14px;"><strong>Prøveperiode:</strong> <span style="color: #059669; font-weight: bold;">${trialDays} dager kostnadsfritt${isBetaTester ? ' (🧪 Betatester)' : ''}</span></p>` : ''}
              </div>

              <p style="font-size: 12px; color: #64748b; line-height: 1.5; text-align: center; margin-bottom: 0;">
                Du kan når som helst endre passordet ditt ved å klikke på knappen over eller ved å logge inn på <a href="https://vikingmester.no" style="color: #4f46e5; font-weight: bold;">vikingmester.no</a>.
              </p>
            </div>

            <p style="font-size: 12px; color: #94a3b8; text-align: center; margin: 0;">
              Denne e-posten ble sendt fra administrator i VikingMester (AIChat Norge AS / Vikingnet).
            </p>
          </div>
        `;

        const sendRes = await sendSystemEmail({
          to: emailLower,
          subject,
          html: emailHtml,
          text: `${greetingText}\n\nVelg eget passord: ${setPasswordUrl}\n\nBrukernavn: ${emailLower}\nMidlertidig passord: ${password}\nFirma: ${userObj.company}\nInnlogging: https://vikingmester.no`,
          companyName: userObj.company || 'VikingMester',
          authorName: 'VikingMester SuperAdmin'
        });

        emailSent = sendRes.success && sendRes.status === 'sent';
        emailMessage = sendRes.message;
      } catch (emailErr: any) {
        console.warn('Welcome email error:', emailErr);
        emailMessage = emailErr.message;
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
        trialDays: isTrial ? trialDays : undefined,
        isBetaTester: Boolean(isBetaTester),
        isPartner: userObj.isPartner,
        isInternal: userObj.isInternal
      },
      company: finalCompany,
      credentials: {
        email: emailLower,
        password: password,
        loginUrl: 'https://vikingmester.no'
      },
      inviteLink: setPasswordUrl,
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
