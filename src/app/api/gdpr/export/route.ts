import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/src/lib/server/auth';
import { getCollectionItems } from '@/src/lib/server/db';

export async function GET(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: 'Uautorisert. Vennligst logg inn for å eksportere dine data.' }, { status: 401 });
    }

    const collectionsToExport = [
      'users',
      'projects',
      'deviations',
      'sja_reports',
      'offers',
      'contracts',
      'time_registrations',
      'vehicles',
      'inventory',
      'crew',
      'documents',
      'activity_logs'
    ];

    const exportData: Record<string, any> = {
      metadata: {
        exportDate: new Date().toISOString(),
        exportedBy: user.email,
        userId: user.id,
        companyId: user.companyId,
        gdprCompliance: 'Iht. EUs personvernforordning (GDPR) artikkel 15 og 20 (Rett til innsyn og dataportabilitet)',
        dataController: 'VikingMester / Bedriftskunde'
      },
      userData: null,
      companyData: {}
    };

    for (const col of collectionsToExport) {
      const items = await getCollectionItems(col);
      if (col === 'users') {
        const u = items.find((usr: any) => usr.id === user.id || usr.email === user.email);
        if (u) {
          const { password, ...safeUser } = u;
          exportData.userData = safeUser;
        }
      } else {
        const userItems = items.filter((item: any) => 
          (item.companyId && item.companyId === user.companyId) ||
          (item.userId && item.userId === user.id) ||
          (item.authorId && item.authorId === user.id)
        );
        exportData.companyData[col] = userItems;
      }
    }

    return new NextResponse(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="GDPR_dataeksport_${user.email.replace(/[@.]/g, '_')}_${new Date().toISOString().split('T')[0]}.json"`
      }
    });
  } catch (err: any) {
    console.error('GDPR Export Error:', err);
    return NextResponse.json({ error: 'Kunne ikke generere dataeksport.' }, { status: 500 });
  }
}
