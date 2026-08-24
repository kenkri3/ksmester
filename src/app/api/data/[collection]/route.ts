import { NextRequest, NextResponse } from 'next/server';
import { getCollectionItems, saveCollectionItem } from '@/src/lib/server/db';
import { getUserFromRequest } from '@/src/lib/server/auth';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ collection: string }> }
) {
  try {
    const user = getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: 'Uautorisert' }, { status: 401 });
    }

    const { collection } = await params;
    let items = await getCollectionItems(collection);

    if (user.role !== 'admin') {
      items = items.filter((item: any) => item.companyId === user.companyId);
    }

    // Security: Never leak password hashes or sensitive auth secrets
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
    const body = await req.json();
    const user = getUserFromRequest(req);

    if (!user) {
      return NextResponse.json({ error: 'Uautorisert' }, { status: 401 });
    }

    // Enforce creator/tenant metadata from verified session if authenticated
    const itemData = {
      ...body,
      authorId: body.authorId || user.id,
      companyId: user.role === 'admin' ? (body.companyId || user.companyId) : user.companyId
    };

    const item = await saveCollectionItem(collection, itemData);
    return NextResponse.json(item);
  } catch (err: any) {
    console.error('Data POST error:', err);
    return NextResponse.json({ error: 'Kunne ikke lagre element' }, { status: 500 });
  }
}
