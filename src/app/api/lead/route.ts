import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import { dbQuery, inMemoryStore, saveCollectionItem, ADMIN_EMAILS } from '@/src/lib/server/db';
import { signToken } from '@/src/lib/server/auth';
import { sendSystemEmail, renderBrandedEmailTemplate } from '@/src/lib/server/emailSender';
import { enrollCustomerInNurture } from '@/src/lib/server/nurtureEngine';
import { sanitize, sanitizeEmail, sanitizePhone, sanitizeHeader } from '@/src/lib/sanitize';
import { checkRateLimit, getClientIp } from '@/src/lib/server/rateLimit';

export async function POST(req: NextRequest) {
  try {
    // 🛡️ SECURITY: Rate limiting (maks 10 leads per minutt per IP)
    const clientIp = getClientIp(req);
    const rateCheck = checkRateLimit(`lead:${clientIp}`, { limit: 10, windowMs: 60000 });
    if (!rateCheck.success) {
      return NextResponse.json(
        { error: 'For mange henvendelser på kort tid. Vennligst vent litt.' },
        { status: 429, headers: { 'Retry-After': String(rateCheck.reset) } }
      );
    }

    const body = await req.json();
    const rawCompany = sanitize(body.company || body.companyName || '').trim();
    const rawOrgnr = sanitizeHeader((body.orgnr || body.organizationNumber || '').toString().replace(/\s+/g, '').trim());
    const rawName = sanitize(body.name || body.contactName || '').trim();
    const email = sanitizeEmail(body.email || '');
    const phone = sanitizePhone(body.phone || '');
    const trade = sanitize(body.trade || 'Byggmester / Tømrer');
    const passwordInput = body.password ? String(body.password).trim() : '';
    const workers = Number(body.workers) || (body.plan === 'solo' ? 1 : body.plan === 'entreprenor' ? 10 : 3);
    const planRaw = sanitize((body.plan || (workers <= 1 ? 'solo' : workers <= 5 ? 'team' : 'entreprenor')).toLowerCase());
    const channel = sanitize(body.channel || 'Web / Mobil');
    const message = sanitize(body.message || '');
    const acceptedTerms = Boolean(body.acceptedTerms);

    if (!email && !phone) {
      return NextResponse.json({ error: 'Minst e-post eller telefonnummer må oppgis.' }, { status: 400 });
    }

    // 1. Offentlig Brønnøysund-oppslag (0 tokens, gratis åpent API)
    let brregInfo: any = null;
    if (rawOrgnr && /^\d{9}$/.test(rawOrgnr)) {
      try {
        const res = await fetch(`https://data.brreg.no/enhetsregisteret/api/enheter/${rawOrgnr}`, {
          headers: { 'Accept': 'application/json' },
          signal: AbortSignal.timeout(3500)
        });
        if (res.ok) {
          const unit = await res.json();
          brregInfo = {
            orgnr: unit.organisasjonsnummer,
            navn: unit.navn,
            organisasjonsform: unit.organisasjonsform?.kode || 'AS',
            organisasjonsformBeskrivelse: unit.organisasjonsform?.beskrivelse || 'Aksjeselskap',
            forretningsadresse: unit.forretningsadresse ? `${unit.forretningsadresse.adresse?.[0] || ''}, ${unit.forretningsadresse.postnummer || ''} ${unit.forretningsadresse.poststed || ''}`.trim() : null,
            poststed: unit.forretningsadresse?.poststed || null,
            mvaRegistrert: unit.registrertIMvaregisteret || false,
            antallAnsatte: unit.antallAnsatte || workers,
            naeringskode: unit.naeringskode1?.beskrivelse || null
          };
        }
      } catch (e) {
        console.warn('Brønnøysund direct orgnr lookup warning:', e);
      }
    }

    const lookupQuery = rawCompany;
    if (!brregInfo && lookupQuery.length > 1) {
      try {
        const query = encodeURIComponent(lookupQuery);
        const res = await fetch(`https://data.brreg.no/enhetsregisteret/api/enheter?navn=${query}&size=1`, {
          headers: { 'Accept': 'application/json' },
          signal: AbortSignal.timeout(3500)
        });
        if (res.ok) {
          const data = await res.json();
          const unit = data._embedded?.enheter?.[0];
          if (unit) {
            brregInfo = {
              orgnr: unit.organisasjonsnummer,
              navn: unit.navn,
              organisasjonsform: unit.organisasjonsform?.kode || 'AS',
              organisasjonsformBeskrivelse: unit.organisasjonsform?.beskrivelse || 'Aksjeselskap',
              forretningsadresse: unit.forretningsadresse ? `${unit.forretningsadresse.adresse?.[0] || ''}, ${unit.forretningsadresse.postnummer || ''} ${unit.forretningsadresse.poststed || ''}`.trim() : null,
              poststed: unit.forretningsadresse?.poststed || null,
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
    let monthlyPrice = 1490;
    if (planRaw.includes('solo') || workers === 1) {
      planTitle = 'VikingMester Solo';
      monthlyPrice = 690;
    } else if (planRaw.includes('entreprenor') || workers > 5) {
      planTitle = 'VikingMester Totalentreprenør';
      monthlyPrice = 2990;
    }

    const companyOfficialName = brregInfo?.navn || rawCompany || 'Ny Bedrift AS';
    const finalOrgnr = brregInfo?.orgnr || (rawOrgnr && /^\d{9}$/.test(rawOrgnr) ? rawOrgnr : null);
    const finalDisplayName = rawName || (email ? email.split('@')[0] : 'Håndverker');

    // 2. Lagre lead i databasen
    const leadId = `lead-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const leadRecord = {
      id: leadId,
      name: finalDisplayName,
      company: companyOfficialName,
      orgnr: finalOrgnr,
      email,
      phone,
      trade,
      channel,
      plan: planTitle,
      monthlyPrice,
      workers,
      message,
      brregInfo,
      acceptedTerms,
      acceptedTermsAt: body.acceptedTermsAt || new Date().toISOString(),
      status: 'active_trial_lead',
      source: 'VikingMester.no (Direkte registrering)',
      createdAt: new Date().toISOString()
    };

    await saveCollectionItem('leads', leadRecord);

    // 3. Opprett eller klargjør bruker og bedrift med 14 dagers gratis prøveperiode
    let authToken: string | null = null;
    let authUser: any = null;
    let inviteToken: string = Math.random().toString(36).substring(2, 12) + Math.random().toString(36).substring(2, 12);
    let chosenOrGeneratedPassword = passwordInput || `VikingMester${new Date().getFullYear()}!`;
    const userEnteredPassword = Boolean(passwordInput && passwordInput.length >= 8);

    if (email) {
      const emailLower = email.toLowerCase().trim();
      const isSuperAdminEmail = ADMIN_EMAILS.includes(emailLower) || ['kenkri3@gmail.com', 'aichatnorge@gmail.com'].includes(emailLower);

      // Sjekk om bruker allerede finnes
      let existingUser: any = null;
      try {
        const rows = await dbQuery('SELECT * FROM users WHERE LOWER(email) = $1', [emailLower]);
        if (rows && rows.length > 0) existingUser = rows[0];
      } catch {
        // Fallback in-memory
      }
      if (!existingUser && inMemoryStore.users) {
        existingUser = inMemoryStore.users.find(u => u.email?.toLowerCase() === emailLower);
      }

      const hashedPassword = await bcrypt.hash(chosenOrGeneratedPassword, 10);
      const companyId = existingUser?.company_id || existingUser?.companyId || ('comp-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 7));
      const userId = existingUser?.id || existingUser?.uid || ('u-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 7));

      if (existingUser) {
        // SIKKERHETSFIKS (E-02): Denne grenen overskrev tidligere passordet til en
        // eksisterende bruker og utstedte en gyldig JWT - uautentisert kontoovertakelse.
        // Leadet lagres fortsatt og admin varsles, men kontoen roeres ikke og ingen
        // sesjon utstedes. Svaret utad er identisk med foer, slik at ruten heller ikke
        // kan brukes til aa kartlegge hvilke e-postadresser som er registrert.
        authToken = null;
        authUser = null;
      } else {
        // Ny bruker opprettes med 14 dagers prøveperiode
        authUser = {
          id: userId,
          uid: userId,
          email: emailLower,
          displayName: finalDisplayName,
          role: isSuperAdminEmail ? 'superadmin' : 'leader',
          trade,
          company: companyOfficialName,
          companyId,
          orgnr: finalOrgnr,
          subscriptionStatus: 'trial',
          trialDaysLeft: 14,
          totalTrialDays: 14,
          plan: planTitle,
          modules: ['projects', 'checklists', 'deviations', 'ai', 'economy', 'fdv', 'inventory', 'vehicle', 'time', 'apprentice', 'building_app'],
          createdAt: new Date().toISOString()
        };

        await dbQuery(
          `INSERT INTO users (id, email, password, display_name, role, trade, company, company_id, subscription_status, orgnr)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
           ON CONFLICT (email) DO UPDATE SET
             password = EXCLUDED.password,
             company = EXCLUDED.company,
             company_id = EXCLUDED.company_id,
             subscription_status = 'trial'`,
          [authUser.id, authUser.email, hashedPassword, authUser.displayName, authUser.role, authUser.trade, authUser.company, authUser.companyId, authUser.subscriptionStatus, authUser.orgnr]
        ).catch(() => {});

        if (!inMemoryStore.users) inMemoryStore.users = [];
        inMemoryStore.users.push({ ...authUser, password: hashedPassword });
      }

      if (!existingUser) {
        // Klargjør bedriftsoppføring i companies
        const companyRecord = {
          id: companyId,
          name: companyOfficialName,
          orgnr: finalOrgnr || '',
          contactName: finalDisplayName,
          email: emailLower,
          phone: phone || '',
          trade,
          plan: planRaw.includes('solo') ? 'solo' : planRaw.includes('entreprenor') ? 'entreprenor' : 'team',
          planTitle,
          monthlyPrice,
          status: 'active',
          subscriptionStatus: 'trial',
          trialDaysLeft: 14,
          totalTrialDays: 14,
          trialStartDate: new Date().toISOString(),
          trialEndDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
          modules: ['projects', 'checklists', 'deviations', 'ai', 'economy', 'fdv', 'inventory', 'vehicle', 'time', 'apprentice', 'building_app'],
          convertedFromLeadId: leadId,
          createdAt: new Date().toISOString()
        };
        await saveCollectionItem('companies', companyRecord);
  
        // Klargjør invitasjonspost for sikker token-innlogging / magisk lenke
        await saveCollectionItem('invitations', {
          id: `inv-${inviteToken}`,
          token: inviteToken,
          email: emailLower,
          companyId,
          companyName: companyOfficialName,
          role: 'leader',
          status: 'pending',
          invitedBy: 'system_self_signup',
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          createdAt: new Date().toISOString()
        });
  
        // Generer autoritativ JWT-sesjonstoken så brukeren kan logges inn umiddelbart i nettleseren
        authToken = signToken({
          id: authUser.id,
          email: authUser.email,
          role: authUser.role,
          companyId: authUser.companyId,
          company: authUser.company,
          displayName: authUser.displayName,
          trade: authUser.trade
        });
      }
    }

    // 4. Synkroniser til VikingCRM via Webhook hvis konfigurert
    const crmWebhook = process.env.VIKINGCRM_WEBHOOK_URL || process.env.LEAD_WEBHOOK_URL;
    if (crmWebhook) {
      try {
        await fetch(crmWebhook, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event: 'lead.registered_trial',
            leadId: leadRecord.id,
            contactName: leadRecord.name,
            companyName: leadRecord.company,
            orgNumber: leadRecord.orgnr,
            email: leadRecord.email,
            phone: leadRecord.phone,
            trade: leadRecord.trade,
            product: `${leadRecord.plan} (14 dagers gratis prøveperiode)`,
            price: monthlyPrice,
            status: 'trial_active',
            source: 'vikingmester.no-bestilling',
            notes: `14 dagers gratis prøve startet. Brreg: ${brregInfo?.organisasjonsformBeskrivelse || 'Ukjent'}, adresse: ${brregInfo?.forretningsadresse || 'Ikke oppgitt'}.`
          }),
          signal: AbortSignal.timeout(6000)
        });
      } catch (crmErr) {
        console.warn('VikingCRM sync error:', crmErr);
      }
    }

    // 5. Send velkomst- og bekreftelses-epost til kunden via den robuste emailSender (med domene-fallback)
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || 'https://vikingmester.no';
    const directLoginLink = `${baseUrl}/?invite=${inviteToken}`;

    if (leadRecord.email) {
      try {
        const emailBodyHtml = `
          <div style="font-size: 15px; color: #1e293b; line-height: 1.65;">
            <p>Hei <strong>${leadRecord.name}</strong>!</p>
            <p>
              Takk for at du valgte VikingMester! Din <strong>14-dagers gratis prøveperiode</strong> for <strong>${companyOfficialName}</strong> er nå aktivert og klar til bruk.
            </p>

            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px 20px; margin: 22px 0;">
              <h3 style="margin: 0 0 10px 0; color: #0f172a; font-size: 15px; font-weight: 700;">
                📋 Detaljer om din prøveperiode:
              </h3>
              <table role="presentation" style="width: 100%; border-collapse: collapse; font-size: 14px;">
                <tr>
                  <td style="padding: 5px 0; color: #64748b; width: 140px;">Bedrift:</td>
                  <td style="padding: 5px 0; font-weight: 700; color: #0f172a;">${companyOfficialName}</td>
                </tr>
                ${finalOrgnr ? `
                <tr>
                  <td style="padding: 5px 0; color: #64748b;">Org.nummer:</td>
                  <td style="padding: 5px 0; font-weight: 600; color: #0f172a; font-family: monospace;">${finalOrgnr}</td>
                </tr>
                ` : ''}
                <tr>
                  <td style="padding: 5px 0; color: #64748b;">Valgt pakke:</td>
                  <td style="padding: 5px 0; font-weight: 700; color: #7c3aed;">${planTitle}</td>
                </tr>
                <tr>
                  <td style="padding: 5px 0; color: #64748b;">Prøveperiode:</td>
                  <td style="padding: 5px 0; font-weight: 700; color: #059669;">14 dager gratis (0,- kr i dag)</td>
                </tr>
                <tr>
                  <td style="padding: 5px 0; color: #64748b;">Pris etter prøve:</td>
                  <td style="padding: 5px 0; color: #334155;">kr ${monthlyPrice.toLocaleString('nb-NO')},- / mnd eks. mva (ingen bindingstid)</td>
                </tr>
              </table>
            </div>

            <div style="background-color: #f5f3ff; border: 1px solid #ddd6fe; border-radius: 12px; padding: 18px 20px; margin: 22px 0;">
              <h3 style="margin: 0 0 8px 0; color: #5b21b6; font-size: 15px; font-weight: 700;">
                🔑 Din innloggingsinformasjon:
              </h3>
              <p style="margin: 0 0 6px 0; font-size: 14px; color: #374151;">
                <strong>Brukernavn / E-post:</strong> ${leadRecord.email}
              </p>
              <p style="margin: 0 0 10px 0; font-size: 14px; color: #374151;">
                <strong>Passord:</strong> ${userEnteredPassword ? 'Passordet du valgte ved registrering.' : `Ditt midlertidige passord er: <code style="background: #ffffff; padding: 2px 6px; border-radius: 4px; font-weight: bold; border: 1px solid #c4b5fd;">${chosenOrGeneratedPassword}</code> (kan endres i systemet)`}
              </p>
              <p style="margin: 0; font-size: 13px; color: #6b21a8;">
                Klikk på knappen nedenfor for å gå direkte inn i din arbeidsflate:
              </p>
            </div>

            <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 16px 20px; margin: 22px 0;">
              <h4 style="margin: 0 0 6px 0; color: #166534; font-size: 14px; font-weight: 700;">
                📱 Tips for mobil & byggeplass:
              </h4>
              <p style="margin: 0; font-size: 13px; color: #15803d; line-height: 1.5;">
                Åpne <a href="${baseUrl}" style="color: #15803d; font-weight: bold;">${baseUrl}</a> i Safari (iPhone) eller Chrome (Android), trykk på <em>Del/Valg</em> og velg <strong>«Legg til på Hjem-skjerm»</strong> for å få VikingMester som fullverdig mobil-app med offline-støtte og stemmedagbok.
              </p>
            </div>

            <p style="font-size: 14px; color: #475569; margin-top: 24px;">
              Trenger du hjelp eller lurer på noe? Svar direkte på denne e-posten eller kontakt oss på <a href="mailto:hei@vikingmester.no" style="color: #7c3aed; font-weight: bold;">hei@vikingmester.no</a>.
            </p>
          </div>
        `;

        const emailHtml = renderBrandedEmailTemplate({
          subject: `Velkommen til VikingMester – Din 14-dagers prøveperiode er aktivert`,
          title: `Velkommen til VikingMester!`,
          subtitle: `Din 14-dagers gratis prøveperiode er klargjort for ${companyOfficialName}`,
          badgeText: `14 DAGERS GRATIS PRØVE`,
          badgeColor: `#059669`,
          accentColor: `#7c3aed`,
          companyName: 'VikingMester',
          bodyHtml: emailBodyHtml,
          button: {
            url: directLoginLink,
            label: 'Åpne VikingMester og start nå',
            bgColor: '#059669',
            textColor: '#ffffff',
            icon: '🚀'
          },
          secondaryUrl: directLoginLink,
          secondaryText: 'Du kan også åpne VikingMester direkte via denne lenken:',
          footerDetails: `AIChat Norge AS / Vikingnet · Org.nr: 933 851 222 MVA · Vidjeveien 21, 3151 Tolvsrød`
        });

        await sendSystemEmail({
          to: leadRecord.email,
          replyTo: 'hei@vikingmester.no',
          subject: `Velkommen til VikingMester – Din 14-dagers prøveperiode er aktivert`,
          html: emailHtml,
          text: `Hei ${leadRecord.name}!\n\nTakk for din bestilling. Din 14-dagers gratis prøveperiode for ${companyOfficialName} er nå aktivert.\n\nBrukernavn: ${leadRecord.email}\nPassord: ${userEnteredPassword ? 'Passordet du oppga ved registrering' : chosenOrGeneratedPassword}\n\nLogg inn direkte her: ${directLoginLink}\n\nMed vennlig hilsen,\nVikingMester Teamet`,
          type: 'general',
          companyName: 'VikingMester'
        });
        console.info(`[Lead] Velkomst-epost sendt til kunden: ${leadRecord.email}`);
      } catch (custMailErr: any) {
        console.error('[Lead] Kunne ikke sende velkomst-epost til kunden:', custMailErr.message);
      }
    }

    // 6. Send autoritativt FAKTURAGRUNNLAG og ordrevarsel til Kenneth, Fredrik og AIChat Norge
    try {
      const timestampStr = new Date().toLocaleString('nb-NO', { timeZone: 'Europe/Oslo' });
      const adminHtml = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 620px; margin: 0 auto; color: #0F172A; line-height: 1.6; padding: 24px; border: 1px solid #CBD5E1; border-radius: 12px; background: #ffffff;">
          <div style="background: #10B981; color: white; padding: 12px 16px; border-radius: 8px; font-weight: bold; font-size: 15px; margin-bottom: 20px;">
            ✓ NY PRØVEPERIODE & BESTILLING – VIKINGMESTER
          </div>

          <h3 style="margin-top: 0; color: #0F172A;">BESTILLING & FAKTURAGRUNNLAG (EHF / E-POST)</h3>
          
          <table style="width: 100%; border-collapse: collapse; font-size: 14px; margin-bottom: 20px;">
            <tr style="border-bottom: 1px solid #E2E8F0;">
              <td style="padding: 8px 0; font-weight: bold; color: #64748B; width: 140px;">Kunde / Bedrift:</td>
              <td style="padding: 8px 0; font-weight: bold; color: #0F172A;">${companyOfficialName}</td>
            </tr>
            <tr style="border-bottom: 1px solid #E2E8F0;">
              <td style="padding: 8px 0; font-weight: bold; color: #64748B;">Organisasjonsnr:</td>
              <td style="padding: 8px 0; font-family: monospace; font-weight: bold; color: #0F172A;">${finalOrgnr || 'Ikke oppgitt / ENK'}</td>
            </tr>
            <tr style="border-bottom: 1px solid #E2E8F0;">
              <td style="padding: 8px 0; font-weight: bold; color: #64748B;">Org.form:</td>
              <td style="padding: 8px 0;">${brregInfo?.organisasjonsformBeskrivelse || 'Ukjent'}</td>
            </tr>
            <tr style="border-bottom: 1px solid #E2E8F0;">
              <td style="padding: 8px 0; font-weight: bold; color: #64748B;">Kontaktperson:</td>
              <td style="padding: 8px 0; font-weight: bold; color: #0F172A;">${finalDisplayName}</td>
            </tr>
            <tr style="border-bottom: 1px solid #E2E8F0;">
              <td style="padding: 8px 0; font-weight: bold; color: #64748B;">Adresse (Brreg):</td>
              <td style="padding: 8px 0;">${brregInfo?.forretningsadresse || 'Ikke oppgitt'}</td>
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
              <td style="padding: 8px 0; font-weight: bold; color: #64748B;">Status:</td>
              <td style="padding: 8px 0; font-weight: bold; color: #059669;">14 dagers gratis prøveperiode aktivert</td>
            </tr>
            <tr style="border-bottom: 1px solid #E2E8F0;">
              <td style="padding: 8px 0; font-weight: bold; color: #64748B;">Fagområde:</td>
              <td style="padding: 8px 0;">${leadRecord.trade}</td>
            </tr>
            <tr style="border-bottom: 1px solid #E2E8F0;">
              <td style="padding: 8px 0; font-weight: bold; color: #64748B;">Lead ID / Ref:</td>
              <td style="padding: 8px 0; font-family: monospace; color: #64748B;">${leadRecord.id}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold; color: #64748B;">Tidspunkt:</td>
              <td style="padding: 8px 0; color: #64748B;">${timestampStr}</td>
            </tr>
          </table>

          <div style="background: #F1F5F9; padding: 14px; border-radius: 8px; font-size: 13px; color: #334155;">
            <strong>Aksjonsplan:</strong> Kunden har fått 14 dagers gratis prøveperiode. EHF / bedriftsfaktura på <strong>kr ${monthlyPrice.toLocaleString('nb-NO')},- eks. mva</strong> sendes etter prøveperioden dersom kunden fortsetter.
          </div>
        </div>
      `;

      await sendSystemEmail({
        to: ['kenkri3@gmail.com', 'fredrik.r.ellingsen@gmail.com', 'aichatnorge@gmail.com'],
        replyTo: leadRecord.email || 'hei@vikingmester.no',
        subject: `🔥 NY BESTILLING [${leadRecord.id}]: ${companyOfficialName} – ${leadRecord.plan}`,
        html: adminHtml,
        text: `Ny bestilling mottatt fra ${companyOfficialName} (Org.nr: ${finalOrgnr || 'Ikke oppgitt'}). Plan: ${leadRecord.plan} (kr ${monthlyPrice},-). Kontakt: ${finalDisplayName} (${leadRecord.email}, ${leadRecord.phone}).`,
        type: 'general',
        companyName: 'VikingMester Admin'
      });
      console.info(`[Lead] Admin varsel sendt for lead: ${leadRecord.id}`);
    } catch (adminMailErr: any) {
      console.warn('[Lead] Kunne ikke sende admin fakturavarsel:', adminMailErr.message);
    }

    // 7. Autonom inrullering i oppfølgings- og mersalgssekvens (Dag 3, 7, 14, 21)
    try {
      await enrollCustomerInNurture({
        id: leadRecord.id,
        email: leadRecord.email,
        name: leadRecord.name,
        company: leadRecord.company,
        trade: leadRecord.trade,
        plan: leadRecord.plan
      });
    } catch (nurtureErr) {
      console.warn('Could not auto-enroll in nurture sequence:', nurtureErr);
    }

    return NextResponse.json({
      success: true,
      // Ærlig melding: en eksisterende konto får ingen ny prøveperiode og ingen sesjon.
      message: authUser
        ? '14 dagers gratis prøveperiode er aktivert! Velkommen til VikingMester.'
        : 'Takk! Vi har registrert henvendelsen din. Har du allerede en konto, kan du logge inn eller bruke «glemt passord».',
      token: authToken,
      user: authUser,
      lead: leadRecord,
      directLoginLink
    });
  } catch (err: any) {
    console.error('Lead route error:', err);
    return NextResponse.json({ error: 'Kunne ikke registrere henvendelsen.' }, { status: 500 });
  }
}
