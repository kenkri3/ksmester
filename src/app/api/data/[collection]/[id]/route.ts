import { NextRequest, NextResponse } from 'next/server';
import { getCollectionItemById, updateCollectionItem, deleteCollectionItem, saveCollectionItem } from '@/src/lib/server/db';
import { getUserFromRequest } from '@/src/lib/server/auth';

const ALLOWED_COLLECTIONS = [
  'users', 'projects', 'deviations', 'sja_reports',
  'offers', 'invites', 'invitations', 'contracts', 'change_orders',
  'crew', 'safety_inspections', 'checklists', 'hms_documents', 'hms_signatures',
  'inventory', 'apprentice_goals', 'apprentice_profiles', 'building_applications',
  'materials', 'project_documents', 'project_photos', 'notifications',
  'time_registrations', 'vehicles', 'agent_activities',
  'companies', 'leads', 'daily_logs', 'templates',
  'project_materials', 'project_checklists', 'contact_messages'
];

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ collection: string; id: string }> }
) {
  try {
    const { collection, id } = await params;

    if (!ALLOWED_COLLECTIONS.includes(collection)) {
      return NextResponse.json({ error: 'Ugyldig samling' }, { status: 400 });
    }

    const user = getUserFromRequest(req);
    const url = new URL(req.url);
    const token = url.searchParams.get('token');

    const item = await getCollectionItemById(collection, id);

    if (!item) {
      return NextResponse.json({ error: 'Elementet ble ikke funnet' }, { status: 404 });
    }

    if (!user && token && (item.token === token || item.portalToken === token)) {
      return NextResponse.json(item);
    }

    if (!user) {
      return NextResponse.json({ error: 'Uautorisert tilgang. Vennligst logg inn.' }, { status: 401 });
    }

    if (user.role !== 'admin') {
      const isOwner = 
        (item.companyId && (item.companyId === user.companyId || item.companyId === 'system')) ||
        (item.company && (item.company === user.companyId || (user.company && item.company === user.company) || item.company === 'system')) ||
        (item.userId && item.userId === user.id) ||
        (item.authorId && item.authorId === user.id) ||
        (collection === 'hms_documents' && (!item.companyId || item.companyId === 'system')) ||
        (collection === 'checklists' && (!item.companyId || item.companyId === 'system'));

      if (!isOwner) {
        return NextResponse.json({ error: 'Ingen tilgang til dette objektet (IDOR-beskyttelse)' }, { status: 403 });
      }
    }

    if (collection === 'users') {
      const { password, ...safeUser } = item;
      return NextResponse.json(safeUser);
    }

    return NextResponse.json(item);
  } catch (err: any) {
    console.error('Data GET ID error:', err);
    return NextResponse.json({ error: 'Kunne ikke hente element' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ collection: string; id: string }> }
) {
  try {
    const { collection, id } = await params;

    if (!ALLOWED_COLLECTIONS.includes(collection)) {
      return NextResponse.json({ error: 'Ugyldig samling' }, { status: 400 });
    }

    const body = await req.json();
    const user = getUserFromRequest(req);

    const url = new URL(req.url);
    const queryToken = url.searchParams.get('token');
    const headerToken = req.headers.get('x-token');
    const providedToken = queryToken || headerToken || body.token;

    const existing = await getCollectionItemById(collection, id);

    if (!user) {
      const allowedPublicCollections = ['change_orders', 'contracts', 'offers', 'invitations'];
      if (!allowedPublicCollections.includes(collection) || !existing || !providedToken) {
        return NextResponse.json({ error: 'Uautorisert' }, { status: 401 });
      }

      if (existing.token !== providedToken && existing.portalToken !== providedToken) {
        return NextResponse.json({ error: 'Ugyldig sikkerhetstoken' }, { status: 403 });
      }

      const safePublicUpdate: any = {
        updatedAt: new Date().toISOString()
      };

      if (collection === 'change_orders') {
        if (body.status) safePublicUpdate.status = body.status;
        if (body.clientSignatureUrl) safePublicUpdate.clientSignatureUrl = body.clientSignatureUrl;
        if (body.signedByClientAt) safePublicUpdate.signedByClientAt = body.signedByClientAt;
        if (body.clientName) safePublicUpdate.clientName = body.clientName;
        if (body.rejectionReason) safePublicUpdate.rejectionReason = body.rejectionReason;
      } else if (collection === 'contracts') {
        if (body.status) safePublicUpdate.status = body.status;
        if (body.signedAt) safePublicUpdate.signedAt = body.signedAt;
        if (body.signatureData) safePublicUpdate.signatureData = body.signatureData;
        if (body.signerName) safePublicUpdate.signerName = body.signerName;
        if (body.signerIp) safePublicUpdate.signerIp = body.signerIp;
      } else if (collection === 'offers') {
        if (body.status) safePublicUpdate.status = body.status;
        if (body.acceptedAt) safePublicUpdate.acceptedAt = body.acceptedAt;
        if (body.contractId) safePublicUpdate.contractId = body.contractId;
      } else if (collection === 'invitations') {
        if (body.status) safePublicUpdate.status = body.status;
        if (body.acceptedAt) safePublicUpdate.acceptedAt = body.acceptedAt;
        if (body.acceptedBy) safePublicUpdate.acceptedBy = body.acceptedBy;
      }

      const updated = await updateCollectionItem(collection, id, safePublicUpdate);
      return NextResponse.json(updated);
    }

    if (!existing) {
      if (collection === 'users' && user.role !== 'admin') {
        delete body.role;
        delete body.is_admin;
      }

      const newItem = {
        ...body,
        id,
        authorId: user.id,
        companyId: user.role === 'admin' ? (body.companyId || user.companyId) : user.companyId,
        createdAt: body.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      const saved = await saveCollectionItem(collection, newItem);
      return NextResponse.json(saved);
    }

    if (user.role !== 'admin') {
      const isOwner =
        (collection === 'users' && (id === user.id || existing.id === user.id)) ||
        (collection === 'invitations' && (
          existing.token === providedToken ||
          (existing.inviteeEmail && existing.inviteeEmail.toLowerCase() === user.email?.toLowerCase()) ||
          existing.companyId === user.companyId ||
          body.status === 'accepted'
        )) ||
        (existing.companyId && existing.companyId === user.companyId) ||
        (existing.company && (existing.company === user.companyId || (user.company && existing.company === user.company))) ||
        (existing.userId && existing.userId === user.id) ||
        (existing.authorId && existing.authorId === user.id);

      if (!isOwner) {
        return NextResponse.json({ error: 'Ingen tilgang til å oppdatere dette objektet (IDOR-beskyttelse)' }, { status: 403 });
      }

      if (collection === 'users') {
        delete body.role;
        delete body.is_admin;
      }
    }

    const updatedData = {
      ...body,
      updatedAt: new Date().toISOString()
    };

    const item = await updateCollectionItem(collection, id, updatedData);
    return NextResponse.json(item);
  } catch (err: any) {
    console.error('Data PUT error:', err);
    return NextResponse.json({ error: 'Kunne ikke oppdatere element' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ collection: string; id: string }> }
) {
  try {
    const { collection, id } = await params;

    if (!ALLOWED_COLLECTIONS.includes(collection)) {
      return NextResponse.json({ error: 'Ugyldig samling' }, { status: 400 });
    }

    const user = getUserFromRequest(req);

    if (!user) {
      return NextResponse.json({ error: 'Uautorisert' }, { status: 401 });
    }

    if (user.role !== 'admin') {
      const existing = await getCollectionItemById(collection, id);
      if (existing) {
        const isOwner =
          (existing.companyId && existing.companyId === user.companyId) ||
          (existing.company && existing.company === user.companyId) ||
          (existing.userId && existing.userId === user.id) ||
          (existing.authorId && existing.authorId === user.id);

        if (!isOwner) {
          return NextResponse.json({ error: 'Ingen tilgang til å slette dette objektet (IDOR-beskyttelse)' }, { status: 403 });
        }
      } else {
         return NextResponse.json({ error: 'Elementet ble ikke funnet' }, { status: 404 });
      }
    }

    await deleteCollectionItem(collection, id);
    return NextResponse.json({ success: true, id });
  } catch (err: any) {
    console.error('Data DELETE error:', err);
    return NextResponse.json({ error: 'Kunne ikke slette element' }, { status: 500 });
  }
}
