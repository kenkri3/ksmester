import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/src/lib/server/auth';
import { 
  getCompanyEmailConfig, 
  saveCompanyEmailConfig,
  testEmailConnection, 
  CompanyEmailConfig 
} from '@/src/lib/server/emailConfig';

/**
 * POST /api/settings/email/test
 * Tester SMTP-tilkoblingen og sender eventuelt en test-e-post til brukerens adresse.
 */
export async function POST(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: 'Uautorisert tilgang. Vennligst logg inn.' }, { status: 401 });
    }

    const body = await req.json();
    const companyId = user.companyId || 'comp-001';
    const existing = await getCompanyEmailConfig(companyId);

    // Hvis passordet sendes som '••••••••' eller tomt, bruk det eksisterende lagrede passordet
    let passwordToTest = body.smtpPassword;
    if (!passwordToTest || passwordToTest === '••••••••') {
      passwordToTest = existing?.smtpPassword || '';
    }

    let resendKeyToTest = body.resendApiKey;
    if (resendKeyToTest && resendKeyToTest.includes('...')) {
      resendKeyToTest = existing?.resendApiKey || '';
    }

    const testConfig: Partial<CompanyEmailConfig> = {
      provider: body.provider || existing?.provider || 'custom_smtp',
      fromEmail: body.fromEmail || existing?.fromEmail || user.email,
      fromName: body.fromName || existing?.fromName || (user as any)?.company || 'VikingMester',
      replyTo: body.replyTo || existing?.replyTo || user.email,
      smtpHost: body.smtpHost || existing?.smtpHost,
      smtpPort: body.smtpPort || existing?.smtpPort || 587,
      smtpSecure: body.smtpSecure ?? existing?.smtpSecure ?? (Number(body.smtpPort) === 465),
      smtpUser: body.smtpUser || existing?.smtpUser,
      smtpPassword: passwordToTest,
      resendApiKey: resendKeyToTest
    };

    const targetRecipient = body.sendTestEmail ? (body.testRecipientEmail || user.email) : undefined;
    const testResult = await testEmailConnection(testConfig, targetRecipient);

    // Oppdater verifiseringsstatus på eksisterende konfigurasjon dersom den allerede er lagret
    if (existing) {
      await saveCompanyEmailConfig({
        companyId,
        verified: testResult.success,
        lastTestedAt: new Date().toISOString(),
        lastTestStatus: testResult.success ? 'success' : 'error',
        lastTestMessage: testResult.message
      });
    }

    return NextResponse.json({
      success: testResult.success,
      message: testResult.message,
      details: testResult.details
    }, { status: testResult.success ? 200 : 400 });
  } catch (err: any) {
    console.error('Email test error:', err);
    return NextResponse.json({
      success: false,
      message: err.message || 'Teknisk feil under tilkoblingstest'
    }, { status: 500 });
  }
}
