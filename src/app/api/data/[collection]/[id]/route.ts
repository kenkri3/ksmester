import { NextRequest, NextResponse } from 'next/server';
import { getCollectionItems, updateCollectionItem, deleteCollectionItem } from '@/src/lib/server/db';
import { getUserFromRequest } from '@/src/lib/server/auth';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ collection: string; id: string }> }
) {
  try {
    const { collection, id } = await params;
    const body = await req.json();
    const user = getUserFromRequest(req);

    // IDOR / Authorization Check: If authenticated non-admin, verify object tenant ownership
    if (user && user.role !== 'admin') {
      const allItems = await getCollectionItems(collection);
      const existing = allItems.find((i: any) => i.id === id);
      if (existing && existing.companyId && user.companyId && existing.companyId !== user.companyId) {
        return NextResponse.json({ error: 'Ingen tilgang til dette objektet (IDOR beskyttelse)' }, { status: 403 });
      }
    }

    const item = await updateCollectionItem(collection, id, body);
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

    // IDOR / Authorization Check: Verify permission to delete
    if (user && user.role !== 'admin') {
      const allItems = await getCollectionItems(collection);
      const existing = allItems.find((i: any) => i.id === id);
      if (existing && existing.companyId && user.companyId && existing.companyId !== user.companyId) {
        return NextResponse.json({ error: 'Ingen tilgang til å slette dette objektet' }, { status: 403 });
      }
    }

    await deleteCollectionItem(collection, id);
    return NextResponse.json({ success: true, id });
  } catch (err: any) {
    console.error('Data DELETE error:', err);
    return NextResponse.json({ error: 'Kunne ikke slette element' }, { status: 500 });
  }
}
