import { NextRequest, NextResponse } from 'next/server';
import { getCollectionItems, updateCollectionItem, deleteCollectionItem, saveCollectionItem } from '@/src/lib/server/db';
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

    const allItems = await getCollectionItems(collection);
    const item = allItems.find((i: any) => i.id === id);

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

    if (!user) {
      return NextResponse.json({ error: 'Uautorisert' }, { status: 401 });
    }

    const allItems = await getCollectionItems(collection);
    const existing = allItems.find((i: any) => i.id === id);

    // Upsert: If item doesn't exist, create it for this tenant
    if (!existing) {
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
      const allItems = await getCollectionItems(collection);
      const existing = allItems.find((i: any) => i.id === id);
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
