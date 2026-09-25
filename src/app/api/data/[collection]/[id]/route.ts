import { NextRequest, NextResponse } from 'next/server';
import { getCollectionItemById, updateCollectionItem, deleteCollectionItem, saveCollectionItem } from '@/src/lib/server/db';
import { getUserFromRequest, isUserAdmin } from '@/src/lib/server/auth';
import { recalculateProjectProgress } from '@/src/lib/server/progressEngine';

const ALLOWED_COLLECTIONS = [
  'users', 'projects', 'tasks', 'deviations', 'sja_reports', 'sja_documents',
  'offers', 'system_offers', 'invites', 'invitations', 'contracts', 'change_orders',
  'crew', 'safety_inspections', 'checklists', 'hms_documents', 'hms_signatures',
  'inventory', 'apprentice_goals', 'apprentice_profiles', 'building_applications',
  'materials', 'project_documents', 'project_photos', 'notifications',
  'time_registrations', 'time_entries', 'vehicles', 'vehicle_logs', 'vehicle_entries', 'agent_activities',
  'companies', 'leads', 'daily_logs', 'templates',
  'project_materials', 'project_checklists', 'contact_messages',
  'safety_data_sheets', 'final_settlements', 'waste_records',
  'time_extension_claims', 'warranty_inspections', 'project_health_reports',
  'translations', 'token_costs', 'token_topups'
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
    const targetCollection = collection === 'system_offers' ? 'offers' : collection;

    const item = await getCollectionItemById(targetCollection, id);

    if (!item) {
      return NextResponse.json({ error: 'Elementet ble ikke funnet' }, { status: 404 });
    }

    if (!user && token && (item.token === token || item.portalToken === token || item.id === token)) {
      return NextResponse.json(item);
    }

    if (!user) {
      return NextResponse.json({ error: 'Uautorisert tilgang. Vennligst logg inn.' }, { status: 401 });
    }

    const isAdmin = isUserAdmin(user);
    if (!isAdmin) {
      const isOwner = 
        (item.companyId && (item.companyId === user.companyId || item.companyId === 'system')) ||
        (item.company && (item.company === user.companyId || (user.company && item.company === user.company) || item.company === 'system')) ||
        (item.userId && item.userId === user.id) ||
        (item.authorId && item.authorId === user.id) ||
        (targetCollection === 'hms_documents' && (!item.companyId || item.companyId === 'system')) ||
        (targetCollection === 'checklists' && (!item.companyId || item.companyId === 'system'));

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

    const targetCollection = collection === 'system_offers' ? 'offers' : collection;
    const body = await req.json();
    const user = getUserFromRequest(req);

    const url = new URL(req.url);
    const queryToken = url.searchParams.get('token');
    const headerToken = req.headers.get('x-token');
    const providedToken = queryToken || headerToken || body.token;

    const existing = await getCollectionItemById(targetCollection, id);

    if (!user) {
      const allowedPublicCollections = ['change_orders', 'contracts', 'offers', 'system_offers', 'invitations'];
      if (!allowedPublicCollections.includes(collection) || !existing || !providedToken) {
        return NextResponse.json({ error: 'Uautorisert' }, { status: 401 });
      }

      if (existing.token !== providedToken && existing.portalToken !== providedToken && existing.id !== providedToken) {
        return NextResponse.json({ error: 'Ugyldig sikkerhetstoken' }, { status: 403 });
      }

      const safePublicUpdate: any = {
        updatedAt: new Date().toISOString()
      };

      if (targetCollection === 'change_orders') {
        if (body.status) safePublicUpdate.status = body.status;
        if (body.clientSignatureUrl) safePublicUpdate.clientSignatureUrl = body.clientSignatureUrl;
        if (body.signedByClientAt) safePublicUpdate.signedByClientAt = body.signedByClientAt;
        if (body.clientName) safePublicUpdate.clientName = body.clientName;
        if (body.rejectionReason) safePublicUpdate.rejectionReason = body.rejectionReason;
      } else if (targetCollection === 'contracts') {
        if (body.status) safePublicUpdate.status = body.status;
        if (body.signedAt) safePublicUpdate.signedAt = body.signedAt;
        if (body.signatureData) safePublicUpdate.signatureData = body.signatureData;
        if (body.signerName) safePublicUpdate.signerName = body.signerName;
        if (body.signerIp) safePublicUpdate.signerIp = body.signerIp;
      } else if (targetCollection === 'offers') {
        if (body.status) safePublicUpdate.status = body.status;
        if (body.acceptedAt) safePublicUpdate.acceptedAt = body.acceptedAt;
        if (body.contractId) safePublicUpdate.contractId = body.contractId;
      } else if (targetCollection === 'invitations') {
        if (body.status) safePublicUpdate.status = body.status;
        if (body.acceptedAt) safePublicUpdate.acceptedAt = body.acceptedAt;
        if (body.acceptedBy) safePublicUpdate.acceptedBy = body.acceptedBy;
      }

      const updated = await updateCollectionItem(targetCollection, id, safePublicUpdate);
      return NextResponse.json(updated);
    }

    const isAdmin = isUserAdmin(user);

    if (!existing) {
      if (targetCollection === 'users' && !isAdmin) {
        delete body.role;
        delete body.is_admin;
      }

      const newItem = {
        ...body,
        id,
        authorId: user.id,
        companyId: isAdmin ? (body.companyId || user.companyId) : user.companyId,
        createdAt: body.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      const saved = await saveCollectionItem(targetCollection, newItem);
      return NextResponse.json(saved);
    }

    if (!isAdmin) {
      const isOwner =
        (targetCollection === 'users' && (id === user.id || existing.id === user.id)) ||
        (targetCollection === 'invitations' && (
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

      if (targetCollection === 'users') {
        delete body.role;
        delete body.is_admin;
      }
    }

    const updatedData = {
      ...body,
      updatedAt: new Date().toISOString()
    };

    const item = await updateCollectionItem(targetCollection, id, updatedData);

    // 🤖 Autonom fremdriftskalkulering: Oppdater prosjektfremdrift automatisk hvis oppgave endres
    if (targetCollection === 'tasks' && (item.projectId || existing?.projectId)) {
      const projId = item.projectId || existing?.projectId;
      recalculateProjectProgress(projId).catch(() => {});
    }

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

    const targetCollection = collection === 'system_offers' ? 'offers' : collection;
    const user = getUserFromRequest(req);

    if (!user) {
      return NextResponse.json({ error: 'Uautorisert' }, { status: 401 });
    }

    const isAdmin = isUserAdmin(user);

    if (!isAdmin) {
      const existing = await getCollectionItemById(targetCollection, id);
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

    const existingTask = targetCollection === 'tasks' ? await getCollectionItemById('tasks', id) : null;
    await deleteCollectionItem(targetCollection, id);
    if (existingTask?.projectId) {
      recalculateProjectProgress(existingTask.projectId).catch(() => {});
    }
    return NextResponse.json({ success: true, id });
  } catch (err: any) {
    console.error('Data DELETE error:', err);
    return NextResponse.json({ error: 'Kunne ikke slette element' }, { status: 500 });
  }
}
