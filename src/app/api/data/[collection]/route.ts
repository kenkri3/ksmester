import { NextRequest, NextResponse } from 'next/server';
import { getCollectionItems, saveCollectionItem } from '@/src/lib/server/db';
import { getUserFromRequest, isUserAdmin, isUserSuperAdmin } from '@/src/lib/server/auth';
import { recalculateProjectProgress } from '@/src/lib/server/progressEngine';

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
      const cleanToken = token.trim();
      const items = await getCollectionItems(targetCollection);
      let match = items.find((i: any) => 
        i.token === cleanToken || 
        i.id === cleanToken ||
        (i.token && i.token.toLowerCase() === cleanToken.toLowerCase()) ||
        (i.id && i.id.toLowerCase() === cleanToken.toLowerCase()) ||
        (typeof i.shareUrl === 'string' && i.shareUrl.includes(cleanToken))
      );

      // Fallback: If offer not found in 'offers', check 'system_offers'
      if (!match && targetCollection === 'offers') {
        const sysOffers = await getCollectionItems('system_offers').catch(() => []);
        match = sysOffers.find((i: any) => 
          i.token === cleanToken || 
          i.id === cleanToken ||
          (i.token && i.token.toLowerCase() === cleanToken.toLowerCase()) ||
          (i.id && i.id.toLowerCase() === cleanToken.toLowerCase())
        );
      }

      // If contract requested with an offer token or ID, check if a contract exists for that offer
      if (!match && targetCollection === 'contracts') {
        match = items.find((c: any) => c.offerId === cleanToken || c.token === cleanToken || c.id === cleanToken);
        if (!match) {
          // Returning empty array instead of 404 for contracts query allows client to handle uncreated contracts gracefully
          return NextResponse.json([]);
        }
      }

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

    // 2. Authenticated requests: Enforce strict multi-tenant isolation & GDPR compliance
    let items = await getCollectionItems(targetCollection);

    const isSuper = isUserSuperAdmin(user);
    const impersonatedHeader = req.headers.get('x-impersonated-company-id');
    const effectiveCompanyId = impersonatedHeader || user.companyId;

    // SuperAdmin ONLY gets global unfiltered overview when in SuperAdmin panel (no impersonation header)
    const isGlobalSuperAdminView = isSuper && !impersonatedHeader;

    if (!isGlobalSuperAdminView && effectiveCompanyId) {
      items = items.filter((item: any) => {
        // Shared system documents (e.g. general HMS handbooks, standard industry checklists)
        if (targetCollection === 'hms_documents' && (!item.companyId || item.companyId === 'system')) return true;
        if (targetCollection === 'checklists' && (!item.companyId || item.companyId === 'system')) return true;

        const matchCompId = item.companyId && (item.companyId === effectiveCompanyId);
        const matchComp = item.company && (item.company === effectiveCompanyId || (user.company && item.company === user.company));
        const matchUser = (item.userId && item.userId === user.id) || (item.authorId && item.authorId === user.id);
        const matchInvitee = targetCollection === 'invitations' && item.inviteeEmail && item.inviteeEmail.toLowerCase() === user.email?.toLowerCase();

        return matchCompId || matchComp || (targetCollection === 'notifications' && matchUser) || matchInvitee;
      });
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

    // Allow public customer to approve/sign a change order
    if (!user && collection === 'change_orders' && body.id) {
      const items = await getCollectionItems('change_orders');
      const existing = items.find((o: any) => 
        o.id === body.id || 
        (body.token && (o.token === body.token || o.id === body.token))
      );
      if (existing) {
        const updated = {
          ...existing,
          ...body,
          status: body.status || 'approved',
          signedByClientAt: body.signedByClientAt || new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        const saved = await saveCollectionItem('change_orders', updated);
        return NextResponse.json(saved);
      }
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

    // 🤖 Autonom fremdriftskalkulering: Oppdater prosjektfremdrift automatisk hvis ny oppgave opprettes
    if (targetCollection === 'tasks' && item.projectId) {
      recalculateProjectProgress(item.projectId).catch(() => {});
    }

    return NextResponse.json(item);
  } catch (err: any) {
    console.error('Data POST error:', err);
    return NextResponse.json({ error: 'Kunne ikke lagre element' }, { status: 500 });
  }
}
