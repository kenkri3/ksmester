import { NextRequest, NextResponse } from 'next/server';
import { 
  verifyNobbKey, 
  verifyDiscordWebhook, 
  verifySlackWebhook, 
  verifyTeamsWebhook,
  verifyFikenToken,
  verifyTripletexToken,
  verifyPowerOfficeToken,
  verifyBoligmappaKey
} from '@/src/lib/server/integrationsService';
import { getUserFromRequest } from '@/src/lib/server/auth';
import { getCollectionItems, saveCollectionItem, deleteCollectionItem } from '@/src/lib/server/db';

export async function POST(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    const body = await req.json();
    const { service, keyOrUrl, channelName, save = true } = body;

    if (!service || !keyOrUrl) {
      return NextResponse.json({ error: 'Mangler tjeneste (service) eller nøkkel/URL' }, { status: 400 });
    }

    const companyId = user?.companyId || 'comp-001';
    const companyName = (user as any)?.company || 'Bedriftsbruker';
    const sLower = service.toLowerCase();

    let result: { success: boolean; message: string; statusCode?: number; details?: any };

    // 1. Utfør EKTE verifisering mot den respektive tjenesten
    switch (sLower) {
      case 'nobb':
        result = await verifyNobbKey(keyOrUrl);
        break;
      case 'discord':
        result = await verifyDiscordWebhook(keyOrUrl, channelName);
        break;
      case 'slack':
        result = await verifySlackWebhook(keyOrUrl, channelName);
        break;
      case 'teams':
        result = await verifyTeamsWebhook(keyOrUrl, channelName);
        break;
      case 'fiken':
        result = await verifyFikenToken(keyOrUrl);
        break;
      case 'tripletex':
        result = await verifyTripletexToken(keyOrUrl);
        break;
      case 'poweroffice':
      case 'poweroffice go':
        result = await verifyPowerOfficeToken(keyOrUrl);
        break;
      case 'boligmappa':
        result = await verifyBoligmappaKey(keyOrUrl);
        break;
      default:
        return NextResponse.json({ error: `Ukjent tjeneste: ${service}` }, { status: 400 });
    }

    // 2. Hvis verifiseringen feilet, returner den EKTE feilmeldingen fra tjenesten (aldri lyv eller gjett)
    if (!result.success) {
      return NextResponse.json({
        success: false,
        verified: false,
        message: result.message,
        statusCode: result.statusCode
      }, { status: 400 });
    }

    // 3. Hvis suksess og save=true, lagre den verifiserte tilkoblingen i databasen
    if (save) {
      const allIntegrations = await getCollectionItems('integrations');
      const existing = allIntegrations.find((i: any) => 
        i.service?.toLowerCase() === sLower && 
        (i.companyId === companyId || (user?.role === 'admin' && i.companyId === 'system'))
      );

      const recordId = existing?.id || `int-${sLower}-${companyId}`;
      const isNobb = sLower === 'nobb';

      const integrationRecord = {
        id: recordId,
        companyId: user?.role === 'admin' && !user?.companyId ? 'system' : companyId,
        companyName,
        service: sLower === 'nobb' ? 'NOBB' : sLower,
        status: 'active',
        secretToken: isNobb ? keyOrUrl.trim() : undefined,
        secretTokenMasked: isNobb 
          ? (keyOrUrl.length > 8 ? `${keyOrUrl.substring(0, 4)}...${keyOrUrl.substring(keyOrUrl.length - 4)}` : '******')
          : undefined,
        webhookUrl: !isNobb ? keyOrUrl.trim() : undefined,
        channel: channelName?.trim() || (sLower === 'discord' ? '#byggeplass' : (sLower === 'slack' ? '#prosjekt-varsler' : 'Byggeledelse')),
        verifiedAt: new Date().toISOString(),
        configuredAt: existing?.configuredAt || new Date().toISOString(),
        configuredBy: user?.email || 'admin'
      };

      await saveCollectionItem('integrations', integrationRecord);
    }

    return NextResponse.json({
      success: true,
      verified: true,
      message: result.message,
      service: sLower
    });

  } catch (err: any) {
    console.error('Integrations verify error:', err);
    return NextResponse.json({ error: err.message || 'Feil ved verifisering' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    const { searchParams } = new URL(req.url);
    const service = searchParams.get('service');

    if (!service) {
      return NextResponse.json({ error: 'Mangler tjeneste (service)' }, { status: 400 });
    }

    const companyId = user?.companyId || 'comp-001';
    const sLower = service.toLowerCase();

    const allIntegrations = await getCollectionItems('integrations');
    const target = allIntegrations.find((i: any) => 
      i.service?.toLowerCase() === sLower && 
      (user?.role === 'admin' || i.companyId === companyId || i.companyId === 'system')
    );

    if (target) {
      await deleteCollectionItem('integrations', target.id);
    }

    return NextResponse.json({
      success: true,
      message: `${service} er koblet fra.`
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Kunne ikke koble fra' }, { status: 500 });
  }
}
