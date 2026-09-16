import { NextRequest, NextResponse } from 'next/server';
import { getCollectionItems, saveCollectionItem } from '@/src/lib/server/db';
import { getUserFromRequest, isUserAdmin } from '@/src/lib/server/auth';

const ALLOWED_COLLECTIONS = [
  'users', 'projects', 'deviations', 'sja_reports',
  'offers', 'system_offers', 'invites', 'invitations', 'contracts', 'change_orders',
  'crew', 'safety_inspections', 'checklists', 'hms_documents', 'hms_signatures',
  'inventory', 'apprentice_goals', 'apprentice_profiles', 'building_applications',
  'materials', 'project_documents', 'project_photos', 'notifications',
  'time_registrations', 'vehicles', 'agent_activities',
  'companies', 'leads', 'daily_logs', 'templates',
  'project_materials', 'project_checklists', 'contact_messages'
];

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ collection: string }> }
) {
  try {
    const { collection } = await params;

    if (!ALLOWED_COLLECTIONS.includes(collection)) {
      return NextResponse.json({ error: 'Ugyldig samling' }, { status: 400 });
    }

    const user = getUserFromRequest(req);
    const url = new URL(req.url);
    const token = url.searchParams.get('token');
    const portalToken = url.searchParams.get('portalToken');
    const targetCollection = collection === 'system_offers' ? 'offers' : collection;

    // 1. Handle secure token lookups (for both public and authenticated users holding a valid capability token)
    if (token && (targetCollection === 'offers' || targetCollection === 'invites' || targetCollection === 'invitations' || targetCollection === 'contracts' || targetCollection === 'change_orders')) {
      const items = await getCollectionItems(targetCollection);
      const match = items.find((i: any) => i.token === token || i.id === token);
      if (match) {
        return NextResponse.json([match]);
      }
      return NextResponse.json({ error: 'Ugyldig eller utløpt token' }, { status: 404 });
    }

    if ((portalToken || token) && targetCollection === 'projects') {
      const items = await getCollectionItems(targetCollection);
      const match = items.find((p: any) => p.portalToken === portalToken || p.portalToken === token || p.token === token);
      if (match) {
        return NextResponse.json([match]);
      }
      return NextResponse.json({ error: 'Ugyldig portallenke' }, { status: 404 });
    }

    if (!user) {
      return NextResponse.json({ error: 'Uautorisert tilgang. Vennligst logg inn.' }, { status: 401 });
    }

    // 2. Authenticated requests: Enforce strict multi-tenant isolation
    let items = await getCollectionItems(targetCollection);

    const isAdmin = isUserAdmin(user);
    if (!isAdmin) {
      items = items.filter((item: any) => 
        (item.companyId && (item.companyId === user.companyId || item.companyId === 'system')) ||
        (item.company && (item.company === user.companyId || (user.company && item.company === user.company) || item.company === 'system')) ||
        (item.userId && item.userId === user.id) ||
        (item.authorId && item.authorId === user.id) ||
        (targetCollection === 'invitations' && item.inviteeEmail && item.inviteeEmail.toLowerCase() === user.email?.toLowerCase()) ||
        (targetCollection === 'hms_documents' && (!item.companyId || item.companyId === 'system')) ||
        (targetCollection === 'checklists' && (!item.companyId || item.companyId === 'system'))
      );
    }

    // 3. Strip sensitive internal fields from users collection
    if (collection === 'users') {
      items = items.map((u: any) => {
        const { password, ...safeUser } = u;
        return safeUser;
      });
    }

    return NextResponse.json(items);
  } catch (err: any) {
    console.error('Data GET error:', err);
    return NextResponse.json([], { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ collection: string }> }
) {
  try {
    const { collection } = await params;

    // Also allow leads and contact_messages strictly for public POST
    const EXTENDED_ALLOWED_COLLECTIONS = [...ALLOWED_COLLECTIONS, 'leads', 'contact_messages'];
    if (!EXTENDED_ALLOWED_COLLECTIONS.includes(collection)) {
       return NextResponse.json({ error: 'Ugyldig samling' }, { status: 400 });
    }

    const body = await req.json();
    const user = getUserFromRequest(req);

    // Allow public lead registration or contact messages
    if (!user && (collection === 'leads' || collection === 'contact_messages')) {
      const publicItemData = {
        ...body,
        id: 'msg-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
        createdAt: new Date().toISOString()
      };
      const saved = await saveCollectionItem(collection, publicItemData);
      return NextResponse.json(saved);
    }

    if (!user) {
      return NextResponse.json({ error: 'Uautorisert tilgang. Vennligst logg inn.' }, { status: 401 });
    }

    const targetCollection = collection === 'system_offers' ? 'offers' : collection;
    const isAdmin = isUserAdmin(user);

    // Enforce tenant boundary from verified JWT session
    const itemData = {
      ...body,
      authorId: user.id,
      companyId: isAdmin ? (body.companyId || user.companyId) : user.companyId,
      createdAt: body.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const item = await saveCollectionItem(targetCollection, itemData);
    return NextResponse.json(item);
  } catch (err: any) {
    console.error('Data POST error:', err);
    return NextResponse.json({ error: 'Kunne ikke lagre element' }, { status: 500 });
  }
}
