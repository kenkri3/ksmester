import { NextRequest, NextResponse } from 'next/server';
import { 
  getOrGenerateProjectDocumentation, 
  buildConsolidatedFdvHtml, 
  GeneratedDocItem 
} from '@/src/lib/server/projectDocumentationEngine';
import { sendSystemEmail } from '@/src/lib/server/emailSender';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId') || '';
    const projectName = searchParams.get('projectName') || 'Prosjekt';
    const category = searchParams.get('category') || 'Tømrer';
    const clientName = searchParams.get('clientName') || 'Byggherre';

    if (!projectId) {
      return NextResponse.json({ error: 'Mangler projectId' }, { status: 400 });
    }

    const result = await getOrGenerateProjectDocumentation(projectId, {
      name: projectName,
      category,
      clientName
    });

    return NextResponse.json({
      success: true,
      projectId,
      isNewlyGenerated: result.isNewlyGenerated,
      documents: result.documents,
      count: result.documents.length
    });
  } catch (error: any) {
    console.error('Error in GET /api/documentation:', error);
    return NextResponse.json({ error: error.message || 'Kunne ikke hente dokumentasjon' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, projectId, projectInfo, recipientEmail, companyName } = body;

    if (!projectId) {
      return NextResponse.json({ error: 'Mangler projectId' }, { status: 400 });
    }

    if (action === 'generate_project_fdv') {
      const result = await getOrGenerateProjectDocumentation(projectId, projectInfo);
      return NextResponse.json({
        success: true,
        message: `Genererte ${result.documents.length} dokumenter for prosjektet`,
        documents: result.documents,
        isNewlyGenerated: result.isNewlyGenerated
      });
    }

    if (action === 'get_combined_fdv') {
      const result = await getOrGenerateProjectDocumentation(projectId, projectInfo);
      const html = buildConsolidatedFdvHtml(
        projectInfo?.name || 'Prosjekt',
        projectInfo?.clientName || 'Byggherre',
        projectInfo?.address || 'Byggeplass',
        companyName || 'Mesterbedrift AS',
        result.documents
      );

      return NextResponse.json({
        success: true,
        html,
        docCount: result.documents.length
      });
    }

    if (action === 'email_documentation') {
      if (!recipientEmail) {
        return NextResponse.json({ error: 'Mangler recipientEmail' }, { status: 400 });
      }

      const result = await getOrGenerateProjectDocumentation(projectId, projectInfo);
      const htmlPerm = buildConsolidatedFdvHtml(
        projectInfo?.name || 'Prosjekt',
        projectInfo?.clientName || 'Byggherre',
        projectInfo?.address || 'Byggeplass',
        companyName || 'Mesterbedrift AS',
        result.documents
      );

      const emailSubject = `📁 FDV & Sluttdokumentasjon - ${projectInfo?.name || 'Prosjekt'}`;
      const emailHtml = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1e293b;">
          <h2 style="color: #0f172a; margin-bottom: 8px;">FDV & Sluttdokumentasjon oversendt</h2>
          <p style="color: #475569; font-size: 14px;">
            Hei ${projectInfo?.clientName || 'kunde'}, her er komplett FDV-perm og sluttdokumentasjon for prosjektet <strong>${projectInfo?.name || 'prosjekt'}</strong>.
          </p>
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin: 20px 0;">
            <p style="margin: 0 0 8px 0; font-size: 13px; font-weight: bold; color: #0f172a;">Inkludert i denne permen:</p>
            <ul style="margin: 0; padding-left: 20px; font-size: 13px; color: #334155;">
              ${result.documents.map(d => `<li>${d.title} (${d.category})</li>`).join('')}
            </ul>
          </div>
          <p style="font-size: 13px; color: #64748b;">
            All dokumentasjon er arkivert i VikingMester og oppfyller TEK17 og krav til Boligmappa.
          </p>
        </div>
      `;

      const sendRes = await sendSystemEmail({
        to: recipientEmail,
        subject: emailSubject,
        html: emailHtml
      });

      const isSent = sendRes.success && sendRes.status === 'sent';
      return NextResponse.json({
        success: isSent,
        id: sendRes.id,
        resendId: sendRes.resendId,
        status: sendRes.status,
        message: isSent
          ? `FDV-dokumentasjon oversendt til ${recipientEmail} via Resend`
          : `Kunne ikke levere via Resend: ${sendRes.message}`
      }, { status: isSent ? 200 : 502 });
    }

    return NextResponse.json({ error: `Ukjent action '${action}'` }, { status: 400 });
  } catch (error: any) {
    console.error('Error in POST /api/documentation:', error);
    return NextResponse.json({ error: error.message || 'Feil ved dokumentasjonsbehandling' }, { status: 500 });
  }
}
