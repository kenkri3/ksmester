import { NextRequest, NextResponse } from 'next/server';
import { sendSystemEmail } from '@/src/lib/server/emailSender';
import { saveCollectionItem } from '@/src/lib/server/db';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = (body.email || '').trim().toLowerCase();

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Ugyldig e-postadresse.' }, { status: 400 });
    }

    const resetToken = 'rst-' + Date.now() + '-' + Math.random().toString(36).substring(2, 10);
    const resetUrl = `${process.env.NEXTAUTH_URL || 'https://vikingmester.no'}/auth/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`;

    await saveCollectionItem('password_resets', {
      email,
      token: resetToken,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      createdAt: new Date().toISOString(),
      status: 'pending'
    });

    await sendSystemEmail({
      to: email,
      subject: 'Tilbakestill passord for VikingMester',
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; border: 1px solid #E2E8F0; border-radius: 16px; background-color: #FFFFFF;">
          <div style="margin-bottom: 20px;">
            <span style="font-size: 20px; font-weight: 800; color: #059669; letter-spacing: -0.5px;">VikingMester</span>
          </div>
          <h2 style="font-size: 18px; font-weight: 700; color: #0F172A; margin-bottom: 8px;">Tilbakestill ditt passord</h2>
          <p style="font-size: 14px; color: #475569; line-height: 1.5; margin-bottom: 24px;">
            Vi har mottatt en forespørsel om å tilbakestille passordet for din VikingMester-konto (${email}). Klikk på knappen under for å opprette et nytt passord.
          </p>
          <div style="margin-bottom: 24px;">
            <a href="${resetUrl}" style="display: inline-block; background: linear-gradient(135deg, #059669 0%, #10B981 100%); color: #FFFFFF; font-size: 14px; font-weight: 700; text-decoration: none; padding: 12px 28px; border-radius: 12px; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.25);">
              Opprett nytt passord
            </a>
          </div>
          <p style="font-size: 12px; color: #94A3B8; line-height: 1.5; margin-top: 32px; border-top: 1px solid #F1F5F9; padding-top: 16px;">
            Lenken er gyldig i 1 time. Hvis du ikke har bedt om denne e-posten, kan du trygt ignorere den.
          </p>
        </div>
      `,
      text: `Tilbakestill passord for VikingMester: ${resetUrl}`,
      type: 'notice'
    }).catch(err => {
      console.warn('Password reset email error (handled):', err);
    });

    return NextResponse.json({
      success: true,
      message: 'Instruksjoner for å tilbakestille passord er sendt til din e-postadresse.'
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Kunne ikke sende tilbakestillingslenke.' }, { status: 500 });
  }
}
