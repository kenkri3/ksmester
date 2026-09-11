import { NextRequest, NextResponse } from 'next/server';
import { getCollectionItemById, updateCollectionItem, deleteCollectionItem, saveCollectionItem } from '@/src/lib/server/db';
import { getUserFromRequest } from '@/src/lib/server/auth';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ collection: string; id: string }> }
) {
  try {
    const { collection, id } = await params;
    const user = getUserFromRequest(req);
    const url = new URL(req.url);
    const token = url.searchParams.get('token');

    // ⚡ Direct indexed lookup instead of full collection memory scan
    const item = await getCollectionItemById(collection, id);

    if (!item) {
      return NextResponse.json({ error: 'Elementet ble ikke funnet' }, { status: 404 });
    }

    // Allow access if valid public token matches
    if (!user && token && (item.token === token || item.portalToken === token)) {
      return NextResponse.json(item);
    }

    if (!user) {
      return NextResponse.json({ error: 'Uautorisert tilgang. Vennligst logg inn.' }, { status: 401 });
    }

    // IDOR verification
    if (user.role !== 'admin') {
      const isOwner = 
        (item.companyId && item.companyId === user.companyId) ||
        (item.company && item.company === user.companyId) ||
        (item.userId && item.userId === user.id) ||
        (item.authorId && item.authorId === user.id);

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
    const body = await req.json();
    const user = getUserFromRequest(req);

    const url = new URL(req.url);
    const queryToken = url.searchParams.get('token');
    const headerToken = req.headers.get('x-token');
    const providedToken = queryToken || headerToken || body.token;

    // ⚡ Direct indexed lookup
    const existing = await getCollectionItemById(collection, id);

    // 1. Handle secure public token approvals (e.g. client signing change order or contract via link)
    if (!user) {
      const allowedPublicCollections = ['change_orders', 'contracts', 'offers'];
      if (!allowedPublicCollections.includes(collection) || !existing || !providedToken) {
        return NextResponse.json({ error: 'Uautorisert' }, { status: 401 });
      }

      if (existing.token !== providedToken && existing.portalToken !== providedToken) {
        return NextResponse.json({ error: 'Ugyldig sikkerhetstoken' }, { status: 403 });
      }

      // Safe whitelisted customer fields for token signing
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
      }

      const updated = await updateCollectionItem(collection, id, safePublicUpdate);
      return NextResponse.json(updated);
    }

    // Upsert: If item doesn't exist, create it for this tenant
    if (!existing) {
      // 🛡️ SECURITY: Prevent non-admin users from escalating privileges
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

    // IDOR / Authorization Check: Verify tenant ownership for existing items
    if (user.role !== 'admin') {
      const isOwner =
        (existing.companyId && existing.companyId === user.companyId) ||
        (existing.company && existing.company === user.companyId) ||
        (existing.userId && existing.userId === user.id) ||
        (existing.authorId && existing.authorId === user.id);

      if (!isOwner) {
        return NextResponse.json({ error: 'Ingen tilgang til å oppdatere dette objektet (IDOR-beskyttelse)' }, { status: 403 });
      }

      // 🛡️ SECURITY: Prevent non-admin users from escalating privileges on update
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
    const user = getUserFromRequest(req);

    if (!user) {
      return NextResponse.json({ error: 'Uautorisert' }, { status: 401 });
    }

    // IDOR / Authorization Check: Verify permission to delete
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
