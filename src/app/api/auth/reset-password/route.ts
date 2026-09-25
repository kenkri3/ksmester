import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import { sendSystemEmail } from '@/src/lib/server/emailSender';
import { dbQuery, inMemoryStore, saveCollectionItem, getCollectionItems } from '@/src/lib/server/db';
import { signToken } from '@/src/lib/server/auth';

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

    const isFredrik = email === 'fredrik@aichatnorge.no' || email === 'fredrik.r.ellingsen@gmail.com';
    const isSuperAdmin = isFredrik || email === 'kenkri3@gmail.com' || email === 'aichatnorge@gmail.com' || email === 'kenneth@aichatnorge.no' || email === 'admin@vikingmester.no' || email === 'post@vikingent.no';

    await sendSystemEmail({
      to: email,
      subject: isSuperAdmin 
        ? '👑 Tilbakestill ditt SuperAdmin-passord for VikingMester'
        : 'Tilbakestill passord for VikingMester',
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 540px; margin: 0 auto; padding: 28px; border: 1px solid #E2E8F0; border-radius: 20px; background-color: #FFFFFF; color: #0F172A;">
          <div style="margin-bottom: 24px; text-align: center;">
            <div style="font-size: 24px; font-weight: 900; color: ${isSuperAdmin ? '#D97706' : '#059669'}; letter-spacing: -0.5px;">
              ${isSuperAdmin ? '👑 VikingMester SuperAdmin' : 'VikingMester'}
            </div>
            <p style="font-size: 12px; color: #64748B; margin-top: 4px;">KS, HMS & Prosjektstyring for Bygg og Anlegg</p>
          </div>

          <div style="background: ${isSuperAdmin ? '#FFFBEB' : '#F8FAFC'}; border: 1px solid ${isSuperAdmin ? '#FDE68A' : '#E2E8F0'}; border-radius: 16px; padding: 24px; margin-bottom: 24px;">
            <h2 style="font-size: 18px; font-weight: 800; color: #0F172A; margin: 0 0 10px 0;">
              ${isSuperAdmin ? 'Velg ditt personlige SuperAdmin-passord' : 'Tilbakestill ditt passord'}
            </h2>
            <p style="font-size: 14px; color: #475569; line-height: 1.6; margin-bottom: 20px;">
              Vi har mottatt en forespørsel om å sette eller endre passordet for din konto (<strong>${email}</strong>).
              ${isSuperAdmin ? '<br/><br/><em>Kontoen din har full plattformeiertilgang (SuperAdmin) med ubegrenset brukstid og 500M tokens/mnd.</em>' : ''}
            </p>
            <div style="text-align: center; margin: 24px 0 16px 0;">
              <a href="${resetUrl}" style="display: inline-block; background: ${isSuperAdmin ? 'linear-gradient(135deg, #D97706 0%, #F59E0B 100%)' : 'linear-gradient(135deg, #059669 0%, #10B981 100%)'}; color: #FFFFFF; font-size: 14px; font-weight: 800; text-decoration: none; padding: 14px 32px; border-radius: 14px; box-shadow: 0 4px 14px rgba(217, 119, 6, 0.3);">
                Velg nytt passord nå →
              </a>
            </div>
            <p style="font-size: 11px; color: #94A3B8; text-align: center; margin-top: 14px; word-break: break-all;">
              Hvis knappen over ikke fungerer, kan du lime inn denne lenken i nettleseren:<br/>
              <a href="${resetUrl}" style="color: #6366F1;">${resetUrl}</a>
            </p>
          </div>

          <p style="font-size: 12px; color: #94A3B8; line-height: 1.5; border-top: 1px solid #F1F5F9; padding-top: 16px; text-align: center;">
            Lenken er gyldig i 2 timer av sikkerhetshensyn. Hvis du ikke har bedt om å tilbakestille passordet, kan du trygt se bort fra denne e-posten.
          </p>
        </div>
      `,
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
    console.error('Password reset POST error:', err);
    return NextResponse.json({ error: err.message || 'Kunne ikke sende tilbakestillingslenke.' }, { status: 500 });
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
    return NextResponse.json({ valid: false, error: err.message || 'Valideringsfeil.' }, { status: 500 });
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
    await sendSystemEmail({
      to: email,
      subject: 'Ditt passord i VikingMester er nå oppdatert',
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 500px; margin: 0 auto; padding: 24px; border: 1px solid #E2E8F0; border-radius: 16px; background-color: #FFFFFF; color: #0F172A;">
          <h2 style="color: #059669; margin-top: 0; font-size: 18px;">Passordet ditt er oppdatert</h2>
          <p style="font-size: 14px; color: #475569; line-height: 1.6;">
            Hei ${displayName}! Passordet for din konto (<strong>${email}</strong>) ble nettopp endret.
          </p>
          <p style="font-size: 13px; color: #64748B; line-height: 1.5;">
            Dersom det var du som gjorde denne endringen, trenger du ikke å gjøre noe mer. Hvis du IKKE gjorde denne endringen, vennligst kontakt oss på support@vikingmester.no umiddelbart.
          </p>
          <div style="text-align: center; margin-top: 24px;">
            <a href="https://vikingmester.no" style="display: inline-block; background: #0F172A; color: #FFFFFF; text-decoration: none; font-weight: 700; font-size: 13px; padding: 10px 24px; border-radius: 10px;">
              Gå til VikingMester
            </a>
          </div>
        </div>
      `,
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
    console.error('Password reset PUT error:', err);
    return NextResponse.json({ error: err.message || 'Kunne ikke oppdatere passord.' }, { status: 500 });
  }
}
