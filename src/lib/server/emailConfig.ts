import { getCollectionItems, getCollectionItemById, saveCollectionItem, deleteCollectionItem } from './db';
import nodemailer from 'nodemailer';

export type EmailProviderType = 
  | 'system_default'
  | 'microsoft365' 
  | 'gmail' 
  | 'domeneshop' 
  | 'one_com' 
  | 'proisp' 
  | 'custom_smtp' 
  | 'resend_byok';

export interface CompanyEmailConfig {
  id: string; // `emailcfg-${companyId}`
  companyId: string;
  companyName: string;
  provider: EmailProviderType;
  enabled: boolean;
  fromEmail: string;
  fromName: string;
  replyTo?: string;

  // SMTP Detaljer
  smtpHost?: string;
  smtpPort?: number;
  smtpSecure?: boolean;
  smtpUser?: string;
  smtpPassword?: string;

  // BYOK Resend API-nøkkel
  resendApiKey?: string;

  // Teststatus
  verified: boolean;
  lastTestedAt?: string;
  lastTestStatus?: 'success' | 'error';
  lastTestMessage?: string;
  updatedAt: string;
  updatedBy?: string;
}

export const SMTP_PRESETS: Record<string, {
  name: string;
  host: string;
  port: number;
  secure: boolean;
  note: string;
}> = {
  microsoft365: {
    name: 'Microsoft 365 / Outlook',
    host: 'smtp.office365.com',
    port: 587,
    secure: false,
    note: 'Bruk din Microsoft 365 e-post og passord (eller et App-passord hvis totrinnskontroll er på).'
  },
  gmail: {
    name: 'Google Workspace / Gmail',
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    note: 'Bruk din Gmail/Workspace-adresse og et Google App-passord (genereres i Google-konto -> Sikkerhet -> App-passord).'
  },
  domeneshop: {
    name: 'Domeneshop',
    host: 'mail.domeneshop.no',
    port: 587,
    secure: false,
    note: 'Bruk din e-postadresse og tilhørende e-postpassord opprettet i Domeneshop-kontrollpanelet.'
  },
  one_com: {
    name: 'One.com',
    host: 'send.one.com',
    port: 465,
    secure: true,
    note: 'Bruk din One.com e-postadresse og tilhørende passord.'
  },
  proisp: {
    name: 'ProISP / Norske webhotell',
    host: 'mail.dittdomene.no',
    port: 587,
    secure: false,
    note: 'Bruk din mailserver (f.eks. mail.dittdomene.no eller cpanel-server) og e-postpassord.'
  },
  custom_smtp: {
    name: 'Egendefinert SMTP-server',
    host: '',
    port: 587,
    secure: false,
    note: 'Angi din egen SMTP-vert, port og autentiseringsdetaljer.'
  },
  resend_byok: {
    name: 'Resend (Egen API-nøkkel)',
    host: '',
    port: 0,
    secure: false,
    note: 'Send med din egen Resend API-nøkkel (krever registrert og verifisert domene hos resend.com).'
  },
  system_default: {
    name: 'VikingMester Sky-avsender (Standard)',
    host: '',
    port: 0,
    secure: false,
    note: 'Standard utsendelse via VikingMesters felles skyserver med ditt firmanavn og din e-post som Reply-To.'
  }
};

/**
 * Henter e-postoppsett for en bedrift basert på companyId
 */
export async function getCompanyEmailConfig(companyId: string): Promise<CompanyEmailConfig | null> {
  if (!companyId) return null;
  const cfgId = `emailcfg-${companyId}`;
  const config = await getCollectionItemById('company_email_configs', cfgId);
  return config || null;
}

/**
 * Henter e-postoppsett for en bedrift basert på companyName (fallback)
 */
export async function getCompanyEmailConfigByName(companyName: string): Promise<CompanyEmailConfig | null> {
  if (!companyName) return null;
  const allConfigs = await getCollectionItems('company_email_configs');
  const target = allConfigs.find((c: any) => 
    c.companyName?.toLowerCase() === companyName.toLowerCase() ||
    c.fromName?.toLowerCase() === companyName.toLowerCase()
  );
  return target || null;
}

/**
 * Lagrer eller oppdaterer e-postoppsett for en bedrift
 */
export async function saveCompanyEmailConfig(config: Partial<CompanyEmailConfig> & { companyId: string }): Promise<CompanyEmailConfig> {
  const existing = await getCompanyEmailConfig(config.companyId);
  
  // Bevar eksisterende passord hvis det ikke er endret (f.eks. sendt som maskert '••••••••')
  let finalPassword = config.smtpPassword;
  if (!finalPassword || finalPassword === '••••••••') {
    finalPassword = existing?.smtpPassword || '';
  }

  let finalResendKey = config.resendApiKey;
  if (finalResendKey && finalResendKey.includes('...')) {
    finalResendKey = existing?.resendApiKey || '';
  }

  const id = `emailcfg-${config.companyId}`;
  const record: CompanyEmailConfig = {
    id,
    companyId: config.companyId,
    companyName: config.companyName || existing?.companyName || 'Bedriftskunde',
    provider: config.provider || existing?.provider || 'system_default',
    enabled: config.enabled ?? existing?.enabled ?? true,
    fromEmail: (config.fromEmail || existing?.fromEmail || '').trim(),
    fromName: (config.fromName || existing?.fromName || config.companyName || '').trim(),
    replyTo: (config.replyTo || existing?.replyTo || config.fromEmail || '').trim(),
    smtpHost: (config.smtpHost || existing?.smtpHost || '').trim(),
    smtpPort: Number(config.smtpPort || existing?.smtpPort || 587),
    smtpSecure: config.smtpSecure ?? existing?.smtpSecure ?? (Number(config.smtpPort) === 465),
    smtpUser: (config.smtpUser || existing?.smtpUser || '').trim(),
    smtpPassword: finalPassword,
    resendApiKey: finalResendKey ? finalResendKey.trim() : undefined,
    verified: config.verified ?? existing?.verified ?? false,
    lastTestedAt: config.lastTestedAt || existing?.lastTestedAt,
    lastTestStatus: config.lastTestStatus || existing?.lastTestStatus,
    lastTestMessage: config.lastTestMessage || existing?.lastTestMessage,
    updatedAt: new Date().toISOString(),
    updatedBy: config.updatedBy || existing?.updatedBy
  };

  await saveCollectionItem('company_email_configs', record);
  return record;
}

/**
 * Sletter/nullstiller e-postoppsett for en bedrift
 */
export async function deleteCompanyEmailConfig(companyId: string): Promise<boolean> {
  const cfgId = `emailcfg-${companyId}`;
  await deleteCollectionItem('company_email_configs', cfgId);
  return true;
}

/**
 * Tester SMTP-tilkobling eller Resend API-nøkkel
 */
export async function testEmailConnection(
  config: Partial<CompanyEmailConfig>,
  testRecipient?: string
): Promise<{ success: boolean; message: string; details?: any }> {
  const provider = config.provider || 'custom_smtp';

  if (provider === 'system_default') {
    return {
      success: true,
      message: 'Systemstandard er aktiv. E-poster rutes via VikingMester Cloud Relay med ditt firmanavn som avsender.'
    };
  }

  if (provider === 'resend_byok') {
    const key = config.resendApiKey?.trim();
    if (!key) {
      return { success: false, message: 'Vennligst oppgi en gyldig Resend API-nøkkel (starter med re_).' };
    }
    try {
      const res = await fetch('https://api.resend.com/api-keys', {
        headers: { 'Authorization': `Bearer ${key}` }
      });
      if (!res.ok) {
        const text = await res.text();
        return { success: false, message: `Resend svarte med status ${res.status}: ${text}` };
      }
      return { success: true, message: 'Tilkobling til Resend API er verifisert og gyldig!' };
    } catch (e: any) {
      return { success: false, message: `Nettverksfeil mot Resend: ${e.message}` };
    }
  }

  // SMTP Providers (Microsoft 365, Gmail, Domeneshop, One.com, ProISP, Custom SMTP)
  const host = config.smtpHost?.trim();
  const port = Number(config.smtpPort || 587);
  const secure = config.smtpSecure ?? (port === 465);
  const user = config.smtpUser?.trim();
  const pass = config.smtpPassword;
  const fromEmail = config.fromEmail?.trim();

  if (!host) {
    return { success: false, message: 'SMTP-vert (host) mangler. F.eks. smtp.office365.com eller mail.domeneshop.no.' };
  }
  if (!user || !pass) {
    return { success: false, message: 'Brukernavn og passord er påkrevd for å autentisere mot SMTP-serveren.' };
  }
  if (!fromEmail || !fromEmail.includes('@')) {
    return { success: false, message: 'Vennligst oppgi en gyldig avsenderadresse (fromEmail).' };
  }

  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
      tls: {
        rejectUnauthorized: false
      },
      connectionTimeout: 15000,
      greetingTimeout: 15000,
      socketTimeout: 20000
    });

    // 1. Verifiser SMTP Handshake
    await transporter.verify();

    // 2. Valgfritt: Send en faktisk test-e-post dersom mottaker er oppgitt
    if (testRecipient && testRecipient.includes('@')) {
      const fromName = config.fromName || config.companyName || 'VikingMester';
      await transporter.sendMail({
        from: `"${fromName}" <${fromEmail}>`,
        to: testRecipient,
        replyTo: config.replyTo || fromEmail,
        subject: `✅ Test-e-post fra ${fromName} (VikingMester)`,
        text: `Hei!\n\nDette er en bekreftelse på at din e-postserver (${host}:${port}) er koblet til VikingMester.\n\nAlle tilbud, endringsordrer og kundevarsler vil nå sendes direkte fra ${fromEmail} via ditt eget system.\n\nTidspunkt: ${new Date().toLocaleString('no-NO')}\n\nMed vennlig hilsen,\n${fromName}`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 550px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
            <div style="border-bottom: 2px solid #10b981; padding-bottom: 12px; margin-bottom: 16px;">
              <h2 style="color: #0f172a; margin: 0 0 6px 0; font-size: 18px;">✅ Tilkobling til e-postserver vellykket!</h2>
              <p style="margin: 0; color: #64748b; font-size: 13px;">Dette er en test-e-post sendt direkte fra din mailserver.</p>
            </div>
            <p style="color: #334155; font-size: 14px; line-height: 1.6;">
              Ditt VikingMester-system er nå konfigurert til å sende alle tilbud, endringsordrer, kontrakter og meldinger direkte fra <strong>${fromEmail}</strong> via <strong>${host}</strong>.
            </p>
            <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px; margin: 16px 0; font-size: 12px; color: #475569;">
              <div><strong>Avsender:</strong> ${fromName} &lt;${fromEmail}&gt;</div>
              <div><strong>SMTP-vert:</strong> ${host}:${port} (${secure ? 'SSL' : 'STARTTLS'})</div>
              <div><strong>Mottaker:</strong> ${testRecipient}</div>
              <div><strong>Tidspunkt:</strong> ${new Date().toLocaleString('no-NO')}</div>
            </div>
            <p style="color: #10b981; font-weight: 700; font-size: 13px; margin-top: 16px;">
              Kunder og oppdragsgivere vil nå se e-postene dine som 100% sendt fra ditt eget domene!
            </p>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;">
            <p style="font-size: 11px; color: #94a3b8; margin: 0;">
              Sendt via VikingMester E-postkobling på vegne av ${fromName}.
            </p>
          </div>
        `
      });
    }

    return {
      success: true,
      message: testRecipient 
        ? `Tilkobling vellykket! Test-e-post er sendt til ${testRecipient} direkte fra ${fromEmail}.`
        : `Tilkobling til ${host}:${port} er verifisert og klar til bruk!`
    };
  } catch (err: any) {
    console.error('[SMTP Test Error]', err);
    let errorMsg = err.message || 'Ukjent feil under tilkobling til SMTP';
    if (errorMsg.includes('Invalid login') || errorMsg.includes('535') || errorMsg.includes('Authentication unsuccessful')) {
      errorMsg = 'Ugyldig brukernavn eller passord. Hvis du bruker Microsoft 365 eller Gmail, må du kanskje generere et App-passord pga. totrinnskontroll.';
    } else if (errorMsg.includes('ETIMEDOUT') || errorMsg.includes('ECONNREFUSED')) {
      errorMsg = `Kunne ikke nå SMTP-vert ${host} på port ${port}. Sjekk serveradresse og port (587 for STARTTLS eller 465 for SSL).`;
    }
    return {
      success: false,
      message: errorMsg,
      details: err.code || err.responseCode
    };
  }
}
