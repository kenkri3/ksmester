import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/src/lib/server/auth';
import { 
  getCompanyEmailConfig, 
  saveCompanyEmailConfig, 
  deleteCompanyEmailConfig,
  CompanyEmailConfig,
  SMTP_PRESETS
} from '@/src/lib/server/emailConfig';

/**
 * GET /api/settings/email
 * Henter e-postkonfigurasjon for den innloggede brukerens bedrift.
 * Passord og hemmeligheter maskeres for å ivareta sikkerhet.
 */
export async function GET(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: 'Uautorisert tilgang. Vennligst logg inn.' }, { status: 401 });
    }

    const companyId = user.companyId || 'comp-001';
    const config = await getCompanyEmailConfig(companyId);

    if (!config) {
      // Returner standardforslag basert på brukerens firma
      return NextResponse.json({
        configured: false,
        config: {
          companyId,
          companyName: (user as any)?.company || 'Mitt Firma AS',
          provider: 'system_default',
          enabled: false,
          fromEmail: user.email || '',
          fromName: (user as any)?.company || user.displayName || 'VikingMester',
          replyTo: user.email || '',
          smtpHost: '',
          smtpPort: 587,
          smtpSecure: false,
          smtpUser: user.email || '',
          smtpPasswordMasked: '',
          verified: false
        },
        presets: SMTP_PRESETS
      });
    }

    return NextResponse.json({
      configured: config.enabled && config.provider !== 'system_default',
      config: {
        ...config,
        smtpPassword: '', // Aldri send ekte passord til nettleser
        smtpPasswordMasked: config.smtpPassword ? '••••••••' : '',
        resendApiKeyMasked: config.resendApiKey 
          ? `${config.resendApiKey.substring(0, 4)}...${config.resendApiKey.substring(config.resendApiKey.length - 4)}` 
          : ''
      },
      presets: SMTP_PRESETS
    });
  } catch (err: any) {
    console.error('Error fetching email settings:', err);
    return NextResponse.json({ error: err.message || 'Kunne ikke hente e-postinnstillinger' }, { status: 500 });
  }
}

/**
 * POST /api/settings/email
 * Lagrer eller oppdaterer bedriftens e-postkonfigurasjon.
 */
export async function POST(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: 'Uautorisert tilgang. Vennligst logg inn.' }, { status: 401 });
    }

    const body = await req.json();
    const companyId = user.companyId || body.companyId || 'comp-001';
    const companyName = (user as any)?.company || body.companyName || 'Bedriftskunde';

    const saved = await saveCompanyEmailConfig({
      companyId,
      companyName,
      provider: body.provider,
      enabled: body.enabled ?? true,
      fromEmail: body.fromEmail,
      fromName: body.fromName,
      replyTo: body.replyTo,
      smtpHost: body.smtpHost,
      smtpPort: body.smtpPort,
      smtpSecure: body.smtpSecure,
      smtpUser: body.smtpUser,
      smtpPassword: body.smtpPassword, // Behandles smart i saveCompanyEmailConfig hvis den er '••••••••'
      resendApiKey: body.resendApiKey,
      updatedBy: user.email
    });

    return NextResponse.json({
      success: true,
      message: 'E-postinnstillinger er lagret!',
      config: {
        ...saved,
        smtpPassword: '',
        smtpPasswordMasked: saved.smtpPassword ? '••••••••' : '',
        resendApiKeyMasked: saved.resendApiKey ? `${saved.resendApiKey.substring(0, 4)}...` : ''
      }
    });
  } catch (err: any) {
    console.error('Error saving email settings:', err);
    return NextResponse.json({ error: err.message || 'Kunne ikke lagre e-postinnstillinger' }, { status: 500 });
  }
}

/**
 * DELETE /api/settings/email
 * Deaktiverer og fjerner bedriftens tilpassede e-postoppsett.
 */
export async function DELETE(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: 'Uautorisert tilgang' }, { status: 401 });
    }

    const companyId = user.companyId || 'comp-001';
    await deleteCompanyEmailConfig(companyId);

    return NextResponse.json({
      success: true,
      message: 'Egen e-postserver er koblet fra. Systemet benytter nå standard skyavsender.'
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Kunne ikke nullstille e-postoppsett' }, { status: 500 });
  }
}
