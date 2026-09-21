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

      const customSubject = body.customSubject;
      const customMessage = body.customMessage;
      const selectedDoc: GeneratedDocItem | undefined = body.selectedDoc;

      const safeProjectName = projectInfo?.name || 'Byggeprosjekt';
      const safeClientName = projectInfo?.clientName || 'Byggherre';
      const safeAddress = projectInfo?.address || (projectInfo as any)?.location || 'Byggeplass';
      const safeCompanyName = companyName || 'Viking Entreprenør AS';
      const cleanFileName = safeProjectName.replace(/[^a-zA-Z0-9_-]/g, '_');

      // TILFELLE 1: Utsendelse av et enkelt, spesifikt dokument
      if (selectedDoc) {
        const docSubject = customSubject || `📄 FDV: ${selectedDoc.title} – ${safeProjectName}`;
        const singleDocHtml = `
          <!DOCTYPE html>
          <html lang="no">
          <head><meta charset="utf-8"><title>${selectedDoc.title}</title></head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #fff; padding: 30px; color: #0f172a;">
            <div style="border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 20px;">
              <h1 style="font-size: 22px; margin: 0 0 6px 0;">${selectedDoc.title}</h1>
              <p style="margin: 0; color: #64748b; font-size: 13px;">Kategori: ${selectedDoc.category} | Prosjekt: ${safeProjectName}</p>
            </div>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 14px;">
              <tr style="border-bottom: 1px solid #e2e8f0;"><td style="padding: 8px; font-weight: bold; width: 30%;">Leverandør:</td><td style="padding: 8px;">${selectedDoc.supplier || 'N/A'}</td></tr>
              <tr style="border-bottom: 1px solid #e2e8f0;"><td style="padding: 8px; font-weight: bold;">NOBB-nummer:</td><td style="padding: 8px;">${selectedDoc.nobbNumber || 'Ikke oppgitt'}</td></tr>
              <tr style="border-bottom: 1px solid #e2e8f0;"><td style="padding: 8px; font-weight: bold;">SINTEF / Godkjenning:</td><td style="padding: 8px;">${selectedDoc.sintefApproval || 'Sintef Byggforsk / CE'}</td></tr>
              <tr style="border-bottom: 1px solid #e2e8f0;"><td style="padding: 8px; font-weight: bold;">Lovhjemmel:</td><td style="padding: 8px;">${selectedDoc.tek17Clause || 'TEK17 § 4-1'}</td></tr>
              <tr style="border-bottom: 1px solid #e2e8f0;"><td style="padding: 8px; font-weight: bold;">Drift & Vedlikehold:</td><td style="padding: 8px;">${selectedDoc.maintenanceInterval || 'Se produsentens anvisning'}</td></tr>
            </table>
            ${selectedDoc.description ? `<div style="background: #f8fafc; border-left: 4px solid #0284c7; padding: 12px; margin-bottom: 20px; font-size: 13px;">${selectedDoc.description}</div>` : ''}
            <p style="font-size: 12px; color: #64748b;">Dokumentet er verifisert og arkivert via VikingMester for ${safeProjectName}.</p>
          </body>
          </html>
        `;

        const emailHtml = `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 650px; margin: 0 auto; background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
            <div style="background: #0f172a; padding: 24px; color: white;">
              <h2 style="margin: 0; font-size: 20px;">📄 FDV-dokumentasjon oversendt</h2>
              <p style="margin: 6px 0 0 0; color: #94a3b8; font-size: 13px;">Prosjekt: <strong>${safeProjectName}</strong> • ${safeAddress}</p>
            </div>
            <div style="padding: 24px; color: #334155; line-height: 1.6;">
              <p style="margin-top: 0;">Hei <strong>${safeClientName}</strong>,</p>
              ${customMessage ? `<div style="background: #f8fafc; padding: 14px; border-radius: 8px; margin-bottom: 20px; font-size: 14px; white-space: pre-wrap;">${customMessage}</div>` : `<p>Her er FDV-dokumentet <strong>${selectedDoc.title}</strong> for ${safeProjectName}.</p>`}
              
              <div style="background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 10px; padding: 16px; margin: 20px 0;">
                <h3 style="margin: 0 0 10px 0; font-size: 15px; color: #0f172a;">${selectedDoc.title}</h3>
                <ul style="margin: 0; padding-left: 18px; font-size: 13px; color: #475569;">
                  <li><strong>Kategori:</strong> ${selectedDoc.category}</li>
                  <li><strong>Leverandør:</strong> ${selectedDoc.supplier || 'N/A'}</li>
                  ${selectedDoc.nobbNumber ? `<li><strong>NOBB-nummer:</strong> ${selectedDoc.nobbNumber}</li>` : ''}
                  ${selectedDoc.sintefApproval ? `<li><strong>Godkjenning:</strong> ${selectedDoc.sintefApproval}</li>` : ''}
                  <li><strong>Hjemmel:</strong> ${selectedDoc.tek17Clause || 'TEK17 § 4-1'}</li>
                  <li><strong>Vedlikehold:</strong> ${selectedDoc.maintenanceInterval || 'Se veiledning.'}</li>
                </ul>
              </div>

              <div style="background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 12px; margin-top: 20px; font-size: 13px; color: #065f46;">
                📎 <strong>Dokumentet er vedlagt:</strong> Fullstendig HTML-dokumentasjon er vedlagt denne e-posten.
              </div>

              <p style="margin-top: 24px; margin-bottom: 0; font-size: 13px; color: #64748b;">
                Med vennlig hilsen,<br>
                <strong>${safeCompanyName}</strong><br>
                Kvalitetssikret via VikingMester
              </p>
            </div>
          </div>
        `;

        const sendRes = await sendSystemEmail({
          to: recipientEmail,
          subject: docSubject,
          html: emailHtml,
          text: `FDV-dokumentasjon for ${safeProjectName}: ${selectedDoc.title}\n\nLeverandør: ${selectedDoc.supplier || 'N/A'}\nNOBB: ${selectedDoc.nobbNumber || 'N/A'}\nHjemmel: ${selectedDoc.tek17Clause || 'TEK17'}\n\nMed vennlig hilsen,\n${safeCompanyName}`,
          companyName: safeCompanyName,
          attachments: [
            {
              filename: `FDV_${cleanFileName}_${(selectedDoc.nobbNumber || 'dok')}.html`,
              content: Buffer.from(singleDocHtml, 'utf-8').toString('base64'),
              contentType: 'text/html; charset=utf-8'
            }
          ]
        });

        const isSent = sendRes.success && sendRes.status === 'sent';
        return NextResponse.json({
          success: isSent,
          id: sendRes.id,
          resendId: sendRes.resendId,
          status: sendRes.status,
          message: isSent
            ? `Dokumentet «${selectedDoc.title}» er sendt til ${recipientEmail} med vedlegg via Resend`
            : `Kunne ikke levere via Resend: ${sendRes.message}`
        }, { status: isSent ? 200 : 502 });
      }

      // TILFELLE 2: Komplett samlet FDV-perm for hele prosjektet
      const result = await getOrGenerateProjectDocumentation(projectId, projectInfo);
      const htmlPerm = buildConsolidatedFdvHtml(
        safeProjectName,
        safeClientName,
        safeAddress,
        safeCompanyName,
        result.documents
      );

      const permFileName = `FDV_Sluttdokumentasjon_${cleanFileName}.html`;
      const emailSubject = customSubject || `📁 Komplett FDV-perm & Sluttdokumentasjon – ${safeProjectName}`;

      const documentsTableRows = result.documents.map((d, idx) => `
        <tr style="border-bottom: 1px solid #e2e8f0; font-size: 13px;">
          <td style="padding: 10px 8px; font-weight: bold; color: #1e293b; text-align: center; width: 30px;">${idx + 1}</td>
          <td style="padding: 10px 8px;">
            <div style="font-weight: 700; color: #0f172a;">${d.title}</div>
            <div style="font-size: 11px; color: #64748b; margin-top: 2px;">
              ${d.supplier ? `Lev: ${d.supplier}` : ''} ${d.nobbNumber ? `| NOBB: ${d.nobbNumber}` : ''} ${d.sintefApproval ? `| ✓ ${d.sintefApproval}` : ''}
            </div>
          </td>
          <td style="padding: 10px 8px; color: #334155; font-size: 12px;">
            <div><strong>Hjemmel:</strong> ${d.tek17Clause || 'TEK17 § 4-1'}</div>
            <div style="color: #64748b; font-size: 11px; margin-top: 2px;">${d.maintenanceInterval || 'Se produsentanvisning'}</div>
          </td>
        </tr>
      `).join('');

      const emailHtml = `
        <!DOCTYPE html>
        <html lang="no">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 20px 10px; color: #1e293b;">
          <div style="max-width: 680px; margin: 0 auto; background: #ffffff; border-radius: 14px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
            
            <!-- HEADER -->
            <div style="background: #0f172a; padding: 26px 24px; color: white;">
              <span style="display: inline-block; background: #10b981; color: white; font-size: 11px; font-weight: 800; padding: 4px 10px; border-radius: 999px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">
                Offisiell Overlevering
              </span>
              <h1 style="margin: 0; font-size: 22px; font-weight: 800; line-height: 1.3;">FDV-PERM & SLUTTDOKUMENTASJON</h1>
              <p style="margin: 6px 0 0 0; color: #94a3b8; font-size: 13px;">
                Prosjekt: <strong>${safeProjectName}</strong> • ${safeAddress}
              </p>
            </div>

            <!-- INNHOLD -->
            <div style="padding: 26px 24px; color: #334155; line-height: 1.6;">
              <p style="font-size: 15px; margin-top: 0;">Hei <strong>${safeClientName}</strong>,</p>
              <p>
                Arbeidene på <strong>${safeProjectName}</strong> er nå ferdigstilt og kvalitetssikret. 
                Herved overleveres komplett <strong>FDV-dokumentasjon (Forvaltning, Drift og Vedlikehold)</strong> 
                og teknisk sluttdokumentasjon iht. <strong>Plan- og bygningsloven</strong> og <strong>TEK17 § 4-1</strong>.
              </p>

              <!-- VEDLEGG BOKS -->
              <div style="background: #f0fdf4; border: 2px solid #86efac; border-radius: 10px; padding: 16px; margin: 22px 0;">
                <div style="display: flex; align-items: center; gap: 10px;">
                  <span style="font-size: 24px;">📎</span>
                  <div>
                    <strong style="color: #166534; font-size: 15px; display: block;">Komplett FDV-perm er vedlagt som fil:</strong>
                    <span style="font-size: 13px; color: #15803d;">
                      <code>${permFileName}</code> er vedlagt denne e-posten. Dobbeltklikk på vedlegget for å åpne, skrive ut eller lagre som PDF.
                    </span>
                  </div>
                </div>
              </div>

              <!-- DOKUMENTOVERSIKT TABELL -->
              <h3 style="font-size: 16px; color: #0f172a; margin: 24px 0 12px 0; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px;">
                Dokumentfortegnelse (${result.documents.length} registrerte poster):
              </h3>
              
              <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
                <thead>
                  <tr style="background: #f8fafc; border-bottom: 2px solid #cbd5e1; text-align: left; font-size: 12px; text-transform: uppercase;">
                    <th style="padding: 8px; color: #64748b; width: 30px; text-align: center;">#</th>
                    <th style="padding: 8px; color: #64748b;">Dokument & Produkt</th>
                    <th style="padding: 8px; color: #64748b;">Hjemmel & Vedlikehold</th>
                  </tr>
                </thead>
                <tbody>
                  ${documentsTableRows}
                </tbody>
              </table>

              <!-- SAMSVARSGARANTI -->
              <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 10px; padding: 16px; margin-bottom: 24px; font-size: 13px; color: #475569;">
                <strong style="color: #0f172a; display: block; margin-bottom: 4px;">⚖️ Lovpålagt garanti og reklamasjonsrett:</strong>
                Entreprenøren bekrefter at arbeidene er utført i samsvar med Byggeteknisk forskrift (TEK17), Byggebransjens Våtromsnorm (BVN) og relevante Norske Standarder (NS). Byggherre gis 5 års lovfestet reklamasjonsrett fra overtakelsesdato.
              </div>

              <!-- AVSENDER -->
              <p style="margin-bottom: 0; font-size: 14px;">
                Med vennlig hilsen,<br>
                <strong>${safeCompanyName}</strong><br>
                Kvalitetssikret via <a href="https://vikingmester.no" style="color: #059669; text-decoration: none; font-weight: 600;">VikingMester KS</a>
              </p>
            </div>

            <!-- FOOTER -->
            <div style="padding: 16px 24px; background: #f8fafc; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b; text-align: center;">
              Dokumentasjonen er arkivert og klargjort for overføring til Boligmappa.no.
            </div>
          </div>
        </body>
        </html>
      `;

      const sendRes = await sendSystemEmail({
        to: recipientEmail,
        subject: emailSubject,
        html: emailHtml,
        text: `Hei ${safeClientName}!\n\nKomplett FDV-perm og sluttdokumentasjon for prosjektet ${safeProjectName} er oversendt.\n\nKomplett perm er vedlagt som fil (${permFileName}).\n\nInkluderte dokumenter (${result.documents.length} stk):\n${result.documents.map((d, i) => `${i + 1}. ${d.title} (Lev: ${d.supplier || 'N/A'}, NOBB: ${d.nobbNumber || 'N/A'})`).join('\n')}\n\nMed vennlig hilsen,\n${safeCompanyName}`,
        companyName: safeCompanyName,
        attachments: [
          {
            filename: permFileName,
            content: Buffer.from(htmlPerm, 'utf-8').toString('base64'),
            contentType: 'text/html; charset=utf-8'
          }
        ]
      });

      const isSent = sendRes.success && sendRes.status === 'sent';
      return NextResponse.json({
        success: isSent,
        id: sendRes.id,
        resendId: sendRes.resendId,
        status: sendRes.status,
        message: isSent
          ? `Komplett FDV-perm (${result.documents.length} dokumenter) oversendt til ${recipientEmail} med vedlagt HTML-fil via Resend`
          : `Kunne ikke levere via Resend: ${sendRes.message}`
      }, { status: isSent ? 200 : 502 });
    }

    return NextResponse.json({ error: `Ukjent action '${action}'` }, { status: 400 });
  } catch (error: any) {
    console.error('Error in POST /api/documentation:', error);
    return NextResponse.json({ error: error.message || 'Feil ved dokumentasjonsbehandling' }, { status: 500 });
  }
}
