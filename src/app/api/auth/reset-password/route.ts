import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import { sendSystemEmail, renderBrandedEmailTemplate } from '@/src/lib/server/emailSender';
import { dbQuery, inMemoryStore, saveCollectionItem, getCollectionItems } from '@/src/lib/server/db';
import { signToken } from '@/src/lib/server/auth';
import { apiError } from '@/src/lib/server/apiError';

/**
 * POST /api/auth/reset-password
 * Ber om tilbakestilling av passord. Sender e-post med sikker aktiveringslenke.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = (body.email || '').trim().toLowerCase();

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Ugyldig e-postadresse.' }, { status: 400 });
    }

    const resetToken = 'rst-' + Date.now() + '-' + Math.random().toString(36).substring(2, 12);
    const origin = req.headers.get('origin') || process.env.NEXTAUTH_URL || 'https://vikingmester.no';
    const resetUrl = `${origin}/auth/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`;

    await saveCollectionItem('password_resets', {
      email,
      token: resetToken,
      expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 timer gyldighet
      createdAt: new Date().toISOString(),
      status: 'pending'
    });

    // Finn eventuell eksisterende bruker for å tilpasse e-postens branding og rolle
    const userRows = await dbQuery('SELECT * FROM users WHERE LOWER(email) = $1', [email]).catch(() => []);
    const userRecord = userRows?.[0] || inMemoryStore?.users?.find(u => u.email?.toLowerCase() === email);

    const isFredrik = email === 'fredrik@aichatnorge.no' || email === 'fredrik.r.ellingsen@gmail.com';
    const isSuperAdmin = isFredrik || userRecord?.role === 'superadmin' || email === 'kenkri3@gmail.com' || email === 'aichatnorge@gmail.com' || email === 'kenneth@aichatnorge.no' || email === 'admin@vikingmester.no' || email === 'post@vikingent.no';
    const isBetaTester = Boolean(userRecord?.is_beta_tester);

    const theme = isSuperAdmin ? 'superadmin' : isBetaTester ? 'betatester' : 'standard';
    const subject = isSuperAdmin 
      ? '👑 Velg ditt SuperAdmin-passord for VikingMester'
      : isBetaTester
      ? '🧪 Velg passord for VikingMester Betatest'
      : 'Tilbakestill passord for VikingMester';

    const title = isSuperAdmin 
      ? 'Velg ditt personlige SuperAdmin-passord' 
      : isBetaTester 
      ? 'Velg ditt passord for betatesting' 
      : 'Tilbakestill ditt passord';

    const bodyHtml = `
      <p style="margin-top: 0; font-size: 15px; color: #334155; line-height: 1.6;">
        Vi har mottatt en forespørsel om å sette eller endre passordet for din konto (<strong>${email}</strong>).
      </p>

      ${isSuperAdmin ? `
        <div style="background-color: #fffbeb; border: 1px solid #fde68a; border-radius: 12px; padding: 16px 18px; margin: 18px 0;">
          <div style="font-weight: 800; color: #b45309; font-size: 13px; text-transform: uppercase; margin-bottom: 4px;">
            👑 Plattformeier & SuperAdmin
          </div>
          <p style="margin: 0; font-size: 13px; color: #78350f; line-height: 1.5;">
            Kontoen din har full tilgang til SuperAdmin-portalen, ubegrenset brukstid, 500M systemtokens og full kontroll over alle fagmoduler.
          </p>
        </div>
      ` : isBetaTester ? `
        <div style="background-color: #f0fdfa; border: 1px solid #99f6e4; border-radius: 12px; padding: 16px 18px; margin: 18px 0;">
          <div style="font-weight: 800; color: #0f766e; font-size: 13px; text-transform: uppercase; margin-bottom: 4px;">
            🧪 Betatester-konto
          </div>
          <p style="margin: 0; font-size: 13px; color: #115e59; line-height: 1.5;">
            Du har gratis prøvetilgang som betatester med tilgang til alle systemmoduler. Takk for at du tester systemet og melder inn dine erfaringer!
          </p>
        </div>
      ` : ''}

      <p style="font-size: 14px; color: #475569; line-height: 1.5; margin-bottom: 4px;">
        Klikk på knappen under for å velge ditt nye passord og logge inn:
      </p>
    `;

    const emailHtml = renderBrandedEmailTemplate({
      subject,
      title,
      subtitle: `Forespørsel om innlogging for ${email}`,
      theme,
      bodyHtml,
      button: {
        url: resetUrl,
        label: isSuperAdmin ? 'Velg nytt SuperAdmin-passord nå →' : 'Velg nytt passord nå →',
        bgColor: isSuperAdmin ? '#d97706' : isBetaTester ? '#0284c7' : '#059669',
        borderColor: isSuperAdmin ? '#b45309' : isBetaTester ? '#0369a1' : '#047857',
        icon: isSuperAdmin ? '👑' : isBetaTester ? '🧪' : '🔑'
      },
      secondaryUrl: resetUrl,
      secondaryText: 'Hvis knappen over ikke fungerer i ditt e-postprogram, klikk eller lim inn denne lenken i nettleseren:',
      footerDetails: 'Lenken er gyldig i 2 timer av sikkerhetshensyn. Hvis du ikke har bedt om å sette passord, kan du trygt se bort fra denne e-posten.',
      companyName: 'VikingMester'
    });

    await sendSystemEmail({
      to: email,
      subject,
      html: emailHtml,
      text: `Tilbakestill passord for VikingMester (${email}): ${resetUrl}`,
      type: 'notice'
    }).catch(err => {
      console.warn('Password reset email error (handled):', err);
    });

    return NextResponse.json({
      success: true,
      message: 'Instruksjoner for å velge nytt passord er sendt til din e-postadresse.'
    });
  } catch (err: any) {
    return apiError(err, 'Kunne ikke sende tilbakestillingslenke.');
  }
}

/**
 * GET /api/auth/reset-password?token=...&email=...
 * Verifiserer om tilbakestillingstokenet er gyldig og ikke utløpt.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const token = (searchParams.get('token') || '').trim();
    const email = (searchParams.get('email') || '').trim().toLowerCase();

    if (!token || !email) {
      return NextResponse.json({ valid: false, error: 'Mangler token eller e-post.' }, { status: 400 });
    }

    const resets = await getCollectionItems('password_resets');
    const match = resets.find(
      r => r && r.token === token && (r.email || '').toLowerCase() === email
    );

    if (!match) {
      return NextResponse.json({ valid: false, error: 'Ugyldig eller ikke-eksisterende tilbakestillingslenke.' }, { status: 404 });
    }

    if (match.status === 'used') {
      return NextResponse.json({ valid: false, error: 'Denne lenken har allerede blitt brukt. Be om en ny tilbakestilling hvis du trenger det.' }, { status: 410 });
    }

    if (match.expiresAt && new Date(match.expiresAt) < new Date()) {
      return NextResponse.json({ valid: false, error: 'Denne lenken er utløpt. Vennligst be om en ny tilbakestillingslenke.' }, { status: 410 });
    }

    const isFredrik = email === 'fredrik@aichatnorge.no' || email === 'fredrik.r.ellingsen@gmail.com';
    const isSuperAdmin = isFredrik || ['kenkri3@gmail.com', 'aichatnorge@gmail.com', 'kenneth@aichatnorge.no', 'admin@vikingmester.no', 'post@vikingent.no'].includes(email);

    return NextResponse.json({
      valid: true,
      email,
      isSuperAdmin
    });
  } catch (err: any) {
    // SIKKERHETSFIKS (E-29): denne ruten svarer med { valid, ... } til klienten,
    // ikke { error } alene, så apiError() passer ikke på formen. Vi logger derfor
    // selv og returnerer en generisk melding uten rå error.message.
    console.error('[reset-password] Validering av token feilet:', err);
    return NextResponse.json({ valid: false, error: 'Kunne ikke validere lenken.' }, { status: 500 });
  }
}

/**
 * PUT /api/auth/reset-password
 * Utfører selve passordendringen når brukeren har skrevet inn sitt nye passord.
 */
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const token = (body.token || '').trim();
    const email = (body.email || '').trim().toLowerCase();
    const newPassword = String(body.newPassword || body.password || '').trim();

    if (!token || !email) {
      return NextResponse.json({ error: 'Mangler token eller e-postadresse.' }, { status: 400 });
    }

    if (!newPassword || newPassword.length < 8) {
      return NextResponse.json({ error: 'Passordet må være på minst 8 tegn av sikkerhetshensyn.' }, { status: 400 });
    }

    // 1. Verifiser token
    const resets = await getCollectionItems('password_resets');
    const resetEntry = resets.find(
      r => r && r.token === token && (r.email || '').toLowerCase() === email
    );

    if (!resetEntry) {
      return NextResponse.json({ error: 'Ugyldig tilbakestillingslenke. Vennligst be om en ny.' }, { status: 404 });
    }

    if (resetEntry.status === 'used') {
      return NextResponse.json({ error: 'Denne lenken har allerede blitt brukt. Be om en ny tilbakestilling.' }, { status: 410 });
    }

    if (resetEntry.expiresAt && new Date(resetEntry.expiresAt) < new Date()) {
      return NextResponse.json({ error: 'Tilbakestillingslenken er utløpt. Vennligst be om en ny.' }, { status: 410 });
    }

    // 2. Hash nytt passord
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    const isFredrik = email === 'fredrik@aichatnorge.no' || email === 'fredrik.r.ellingsen@gmail.com';
    const isSuperAdmin = isFredrik || ['kenkri3@gmail.com', 'aichatnorge@gmail.com', 'kenneth@aichatnorge.no', 'admin@vikingmester.no', 'post@vikingent.no'].includes(email);

    // 3. Oppdater eller opprett bruker i PostgreSQL / users table
    let existingUser: any = null;
    const userRows = await dbQuery('SELECT * FROM users WHERE LOWER(email) = $1', [email]);
    if (userRows && userRows.length > 0) {
      existingUser = userRows[0];
    } else if (inMemoryStore.users) {
      existingUser = inMemoryStore.users.find(u => u.email?.toLowerCase() === email);
    }

    const now = new Date().toISOString();
    const assignedRole = isSuperAdmin ? 'superadmin' : (existingUser?.role || 'admin');
    const assignedCompanyId = isSuperAdmin ? 'comp-001' : (existingUser?.company_id || existingUser?.companyId || 'comp-001');
    const assignedCompanyName = isSuperAdmin ? 'AIChat Norge AS / Vikingnet' : (existingUser?.company || 'Bedrift');
    const displayName = existingUser?.display_name || existingUser?.displayName || (isFredrik ? 'Fredrik R. Ellingsen' : email.split('@')[0]);

    if (existingUser) {
      await dbQuery(
        `UPDATE users 
         SET password = $1, 
             role = $2, 
             company_id = $3, 
             company = $4, 
             subscription_status = 'active', 
             updated_at = NOW() 
         WHERE LOWER(email) = $5`,
        [hashedPassword, assignedRole, assignedCompanyId, assignedCompanyName, email]
      );
    } else {
      const newUserId = isFredrik ? 'u-admin-fredrik' : ('u-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 6));
      await dbQuery(
        `INSERT INTO users (id, email, password, display_name, role, trade, company, company_id, subscription_status)
         VALUES ($1, $2, $3, $4, $5, 'Byggmester', $6, $7, 'active')
         ON CONFLICT (email) DO UPDATE SET 
           password = EXCLUDED.password, 
           role = EXCLUDED.role, 
           company_id = EXCLUDED.company_id, 
           company = EXCLUDED.company, 
           subscription_status = 'active'`,
        [newUserId, email, hashedPassword, displayName, assignedRole, assignedCompanyName, assignedCompanyId]
      );
    }

    // Oppdater inMemoryStore
    if (!inMemoryStore.users) inMemoryStore.users = [];
    const memIdx = inMemoryStore.users.findIndex(u => u.email?.toLowerCase() === email);
    const updatedUserObj = {
      id: existingUser?.id || (isFredrik ? 'u-admin-fredrik' : 'u-' + Date.now()),
      email,
      displayName,
      role: assignedRole,
      company: assignedCompanyName,
      companyId: assignedCompanyId,
      subscriptionStatus: 'active',
      password: hashedPassword,
      updatedAt: now
    };

    if (memIdx !== -1) {
      inMemoryStore.users[memIdx] = { ...inMemoryStore.users[memIdx], ...updatedUserObj };
    } else {
      inMemoryStore.users.push(updatedUserObj);
    }

    // 4. Merk token som brukt
    await saveCollectionItem('password_resets', {
      ...resetEntry,
      status: 'used',
      usedAt: now
    });

    // 5. Generer JWT token slik at brukeren logges inn umiddelbart!
    const jwtToken = signToken({
      id: updatedUserObj.id,
      email,
      role: assignedRole,
      companyId: assignedCompanyId,
      company: assignedCompanyName,
      displayName,
      trade: 'Byggmester'
    });

    // 6. Send sikkerhetsbekreftelse på e-post
    const confirmEmailHtml = renderBrandedEmailTemplate({
      subject: 'Ditt passord i VikingMester er nå oppdatert',
      title: 'Passordet ditt er oppdatert',
      subtitle: `Sikkerhetsbekreftelse for ${email}`,
      bodyHtml: `
        <p style="margin-top: 0; font-size: 15px; color: #334155; line-height: 1.6;">
          Hei <strong>${displayName}</strong>! Passordet for din konto (<strong>${email}</strong>) ble nettopp endret og aktivert.
        </p>
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin: 18px 0; font-size: 13px; color: #475569; line-height: 1.5;">
          Dersom det var du som gjorde denne endringen, trenger du ikke å foreta deg noe mer. Hvis du <strong>IKKE</strong> gjorde denne endringen, vennligst kontakt oss på <a href="mailto:support@vikingmester.no" style="color: #0284c7; font-weight: bold;">support@vikingmester.no</a> umiddelbart.
        </div>
      `,
      button: {
        url: 'https://vikingmester.no',
        label: 'Gå til VikingMester →',
        bgColor: '#0f172a',
        borderColor: '#1e293b'
      },
      companyName: assignedCompanyName || 'VikingMester'
    });

    await sendSystemEmail({
      to: email,
      subject: 'Ditt passord i VikingMester er nå oppdatert',
      html: confirmEmailHtml,
      text: `Passordet ditt for VikingMester (${email}) er nå oppdatert. Hvis du ikke gjorde dette, kontakt oss umiddelbart.`,
      type: 'notice'
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      message: 'Passordet er oppdatert! Logger deg inn...',
      token: jwtToken,
      user: {
        id: updatedUserObj.id,
        email: updatedUserObj.email,
        name: updatedUserObj.displayName,
        displayName: updatedUserObj.displayName,
        role: updatedUserObj.role,
        company: updatedUserObj.company,
        companyId: updatedUserObj.companyId,
        subscriptionStatus: 'active'
      }
    });
  } catch (err: any) {
    return apiError(err, 'Kunne ikke oppdatere passordet.');
  }
}
