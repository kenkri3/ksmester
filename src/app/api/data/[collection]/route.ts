import { NextRequest, NextResponse } from 'next/server';
import { getCollectionItems, saveCollectionItem } from '@/src/lib/server/db';
import { getUserFromRequest } from '@/src/lib/server/auth';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ collection: string }> }
) {
  try {
    const { collection } = await params;
    const user = getUserFromRequest(req);
    const url = new URL(req.url);
    const token = url.searchParams.get('token');
    const portalToken = url.searchParams.get('portalToken');

    // 1. Handle secure public token lookups (e.g. for customer portal or signed offer view)
    if (!user) {
      if (token && (collection === 'offers' || collection === 'invites' || collection === 'contracts')) {
        const items = await getCollectionItems(collection);
        const match = items.find((i: any) => i.token === token || i.id === token);
        if (match) {
          return NextResponse.json([match]);
        }
        return NextResponse.json({ error: 'Ugyldig eller utløpt token' }, { status: 404 });
      }

      if (portalToken && collection === 'projects') {
        const items = await getCollectionItems(collection);
        const match = items.find((p: any) => p.portalToken === portalToken || p.id === portalToken);
        if (match) {
          return NextResponse.json([match]);
        }
        return NextResponse.json({ error: 'Ugyldig portallenke' }, { status: 404 });
      }

      return NextResponse.json({ error: 'Uautorisert tilgang. Vennligst logg inn.' }, { status: 401 });
    }

    // 2. Authenticated requests: Enforce strict multi-tenant isolation
    let items = await getCollectionItems(collection);

    if (user.role !== 'admin') {
      items = items.filter((item: any) => 
        item.companyId === user.companyId || 
        item.company === user.companyId ||
        item.userId === user.id ||
        item.authorId === user.id
      );
    }

    // 3. Strip sensitive internal fields (passwords, audit hashes) from users collection
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

    // Enforce tenant boundary from verified JWT session
    const itemData = {
      ...body,
      authorId: user.id,
      companyId: user.role === 'admin' ? (body.companyId || user.companyId) : user.companyId,
      createdAt: body.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const item = await saveCollectionItem(collection, itemData);
    return NextResponse.json(item);
  } catch (err: any) {
    console.error('Data POST error:', err);
    return NextResponse.json({ error: 'Kunne ikke lagre element' }, { status: 500 });
  }
}
