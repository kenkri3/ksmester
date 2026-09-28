import { NextRequest, NextResponse } from 'next/server';
import { 
  getCollectionItems, 
  getCollectionItemById, 
  saveCollectionItem, 
  updateCollectionItem 
} from '@/src/lib/server/db';
import { sendContractByEmail, sendProjectStartedEmail } from '@/src/lib/server/emailSender';
import { checklistGenerator } from '@/src/services/checklistGenerator';
import { getOrGenerateProjectDocumentation } from '@/src/lib/server/projectDocumentationEngine';
import { getClientIp } from '@/src/lib/server/rateLimit';
import { getPublicAppUrl } from '@/src/lib/server/urlHelper';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const rawToken = searchParams.get('token') || searchParams.get('contractToken') || searchParams.get('offerToken');
    const token = rawToken ? rawToken.trim() : null;
    const contractId = searchParams.get('contractId') || searchParams.get('id');
    const offerId = searchParams.get('offerId');

    if (!token && !contractId && !offerId) {
      return NextResponse.json({ error: 'Mangler token eller id' }, { status: 400 });
    }

    const allContracts = await getCollectionItems('contracts');
    const allOffers = await getCollectionItems('offers');

    let contract = null;
    let offer = null;

    if (contractId) {
      contract = allContracts.find((c: any) => c.id === contractId);
    } else if (token) {
      contract = allContracts.find((c: any) => 
        c.token === token || 
        c.id === token ||
        (c.token && c.token.toLowerCase() === token.toLowerCase()) ||
        (c.id && c.id.toLowerCase() === token.toLowerCase())
      );
    }

    if (offerId) {
      offer = allOffers.find((o: any) => o.id === offerId);
    } else if (token) {
      offer = allOffers.find((o: any) => 
        o.token === token || 
        o.id === token ||
        (o.token && o.token.toLowerCase() === token.toLowerCase()) ||
        (o.id && o.id.toLowerCase() === token.toLowerCase()) ||
        (typeof o.shareUrl === 'string' && o.shareUrl.includes(token))
      );
      if (!offer) {
        const sysOffers = await getCollectionItems('system_offers').catch(() => []);
        offer = sysOffers.find((o: any) => 
          o.token === token || 
          o.id === token ||
          (o.token && o.token.toLowerCase() === token.toLowerCase())
        );
      }
    }

    // Hvis kontrakt ble funnet men ikke tilbud, koble via offerId
    if (contract && !offer && contract.offerId) {
      offer = allOffers.find((o: any) => o.id === contract.offerId);
    }

    // Hvis tilbud ble funnet men ikke kontrakt, sjekk om det finnes eksisterende kontrakt
    if (offer && !contract) {
      contract = allContracts.find((c: any) => c.offerId === offer.id || c.token === offer.token);
    }

    return NextResponse.json({
      success: true,
      contract,
      offer
    });
  } catch (err: any) {
    console.error('Error in GET /api/contract:', err);
    return NextResponse.json({ error: err.message || 'Kunne ikke hente kontrakt' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { 
      action, 
      offerId, 
      contractId, 
      token, 
      signatureData, 
      signerName, 
      baseUrl: rawBaseUrl 
    } = body;

    const baseUrl = getPublicAppUrl(req) || rawBaseUrl || 'https://vikingmester.no';
    const clientIp = getClientIp(req) || '127.0.0.1';
    const now = new Date().toISOString();

    // 0. SYNKRONISER TILBUD (for lokal minne/persistens og sky-deling)
    if (action === 'sync_offer') {
      const offerData = body.offer;
      if (!offerData || (!offerData.token && !offerData.id)) {
        return NextResponse.json({ error: 'Mangler offer data eller token' }, { status: 400 });
      }
      const allOffers = await getCollectionItems('offers').catch(() => []);
      const existing = allOffers.find((o: any) => 
        (offerData.token && o.token === offerData.token) || 
        (offerData.id && o.id === offerData.id)
      );
      if (existing) {
        await updateCollectionItem('offers', existing.id, offerData);
      } else {
        await saveCollectionItem('offers', offerData);
      }
      return NextResponse.json({ success: true, offer: offerData });
    }

    // 1. KUNDE GODKJENNER TILBUD ➔ AUTOGENERER & SEND KONTRAKT
    if (action === 'approve_offer_and_create_contract') {
      const allOffers = await getCollectionItems('offers');
      const cleanToken = token ? token.trim() : null;
      let offer = allOffers.find((o: any) => 
        (offerId && o.id === offerId) || 
        (cleanToken && (o.token === cleanToken || o.id === cleanToken || (o.token && o.token.toLowerCase() === cleanToken.toLowerCase())))
      );

      if (!offer && offerId) {
        offer = await getCollectionItemById('offers', offerId);
      }

      if (!offer && cleanToken) {
        const sysOffers = await getCollectionItems('system_offers').catch(() => []);
        offer = sysOffers.find((o: any) => 
          o.token === cleanToken || 
          o.id === cleanToken || 
          (o.token && o.token.toLowerCase() === cleanToken.toLowerCase())
        );
      }

      if (!offer) {
        return NextResponse.json({ error: 'Fant ikke tilbudet for godkjenning.' }, { status: 404 });
      }

      // Sjekk om det allerede finnes en generert kontrakt for dette tilbudet
      const allContracts = await getCollectionItems('contracts');
      let contract = allContracts.find((c: any) => c.offerId === offer.id || c.token === offer.token);

      const contractToken = offer.token || ('c-' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6));
      const companyName = offer.companyName || offer.company || 'Mester Entreprenør AS';
      const companyOrg = offer.companyOrgNumber || '999 888 777 MVA';

      const completionDate = new Date();
      completionDate.setDate(completionDate.getDate() + 45);

      const standardTerms = `
1. PARTER OG RETTSLIG GRUNNLAG
Avtalen er inngått mellom oppdragstaker (${companyName}) og oppdragsgiver (${offer.clientName}). 
Arbeidene utføres i samsvar med Håndverkertjenesteloven, Plan- og bygningsloven (PBL) og gjeldende byggteknisk forskrift (TEK17).

2. ARBEIDETS OMFANG OG LEVERANSE
Oppdragstaker forplikter seg til å levere arbeidene spesifisert i vedlagte tilbud (${offer.title}) av ${new Date(offer.createdAt || Date.now()).toLocaleDateString('no-NO')}. 
Eventuelle tilleggsarbeider skal avtales skriftlig før igangsettelse iht. NS 8406 pkt. 19.

3. KONTRAKTSSUM OG BETALINGSBETINGELSER
Avtalt vederlag er NOK ${Number(offer.totalAmount || 0).toLocaleString('no-NO')} ekskl. mva (NOK ${Math.round(Number(offer.totalAmount || 0) * 1.25).toLocaleString('no-NO')} inkl. 25% mva).
Fakturering skjer etter avtalt fremdriftsplan / milepæler med forfall netto 14 dager.

4. KVALITETSSIKRING, HMS OG SLUTTDOKUMENTASJON (FDV)
Oppdragstaker plikter å føre lovpålagt internkontroll, KS-sjekklister for samtlige involverte fag og HMS på byggeplassen.
Ved ferdigstillelse skal oppdragstaker levere komplett FDV-dokumentasjon, samsvarserklæring og overtakelsesprotokoll for Boligmappa.

5. REKLAMASJON OG GARANTI
Oppdragsgiver har 5 års reklamasjonsrett i henhold til norsk lov fra dato for signert overtakelsesprotokoll.
`.trim();

      if (!contract) {
        contract = {
          id: 'contract-' + Date.now(),
          projectCode: offer.projectCode || ('P-' + new Date().getFullYear() + '-' + Math.floor(100 + Math.random() * 900)),
          projectId: offer.projectId || '',
          offerId: offer.id,
          clientName: offer.clientName,
          clientEmail: offer.clientEmail,
          title: 'Kontrakt: ' + offer.title,
          status: 'pending_signature',
          createdAt: now,
          authorId: offer.authorId || 'admin',
          company: companyName,
          companyName: companyName,
          companyOrgNumber: companyOrg,
          totalAmount: offer.totalAmount || 0,
          paymentTerms: 'Netto 14 dager iht. milepælsplan',
          startDate: now.split('T')[0],
          completionDate: completionDate.toISOString().split('T')[0],
          terms: standardTerms,
          token: contractToken,
          shareUrl: `${baseUrl}/?contractToken=${contractToken}`,
          contractStandard: 'haandverker'
        };

        await saveCollectionItem('contracts', contract);
      }

      // Oppdater tilbud til akseptert
      await updateCollectionItem('offers', offer.id, {
        status: 'accepted',
        acceptedAt: now,
        contractId: contract.id
      });

      // Send formell kontraktse-post til kunden dersom e-post finnes
      let emailResult = null;
      if (offer.clientEmail) {
        try {
          emailResult = await sendContractByEmail({
            contract,
            clientEmail: offer.clientEmail,
            clientName: offer.clientName,
            companyName,
            authorName: offer.authorName || 'Ansvarlig Byggmester',
            baseUrl
          });
        } catch (e: any) {
          console.warn('Kunne ikke sende kontrakt på e-post:', e.message);
        }
      }

      // Logg aktivitet
      await saveCollectionItem('agent_activities', {
        type: 'offer_accepted',
        title: `Tilbud akseptert av ${offer.clientName}`,
        description: `Tilbud «${offer.title}» er akseptert. Kontrakt ${contract.projectCode} er opprettet og oversendt for digital signering.`,
        badge: 'TILBUD AKSEPTERT',
        status: 'completed',
        createdAt: now,
        trade: 'Administrasjon',
        tradeName: 'Mesterhjernen'
      }).catch(() => {});

      return NextResponse.json({
        success: true,
        contract,
        offer: { ...offer, status: 'accepted', contractId: contract.id },
        emailSent: Boolean(emailResult?.success)
      });
    }

    // 2. KUNDE SIGNERER KONTRAKT ➔ 100% AUTOMATISK PROSJEKT, FLERFAGLIGE SJEKKLISTER & FDV
    if (action === 'sign_contract_and_init_project') {
      const allContracts = await getCollectionItems('contracts');
      let contract = allContracts.find((c: any) => c.id === contractId || c.token === token);

      if (!contract && contractId) {
        contract = await getCollectionItemById('contracts', contractId);
      }

      if (!contract) {
        return NextResponse.json({ error: 'Fant ikke kontrakt for signering.' }, { status: 404 });
      }

      const allOffers = await getCollectionItems('offers');
      let offer = contract.offerId ? allOffers.find((o: any) => o.id === contract.offerId) : null;

      // A. Lås kontrakt med signatur
      const signedContract = {
        ...contract,
        status: 'signed',
        signedAt: now,
        signatureData: signatureData || 'DIGITAL_SIGNATURE_' + Date.now(),
        signerName: signerName || contract.clientName,
        signerIp: clientIp
      };
      await updateCollectionItem('contracts', contract.id, signedContract);

      // B. Opprett Prosjekt 100% automatisk
      const projectId = contract.projectId || ('proj-' + Date.now());
      const projectCode = contract.projectCode || ('P-' + new Date().getFullYear() + '-' + Math.floor(100 + Math.random() * 900));
      const projectName = (offer?.title || contract.title).replace('Kontrakt: ', '').replace('Tilbud: ', '');

      const newProject = {
        id: projectId,
        projectCode,
        name: projectName,
        description: offer?.description || `Gjennomføring av ${projectName} iht. signert kontrakt med ${contract.clientName}.`,
        location: offer?.clientName ? `Adresse hos ${offer.clientName}` : 'Byggeplass',
        progress: 5,
        status: 'active',
        stage: 'active',
        documentationLevel: 25,
        lastUpdate: now,
        startDate: contract.startDate || now.split('T')[0],
        endDate: contract.completionDate,
        clientName: contract.clientName,
        clientEmail: contract.clientEmail,
        companyId: contract.companyId || 'comp-001',
        companyName: contract.companyName || contract.company || 'Mester Entreprenør AS',
        projectManager: 'Ansvarlig Byggmester',
        budget: contract.totalAmount || offer?.totalAmount || 0,
        spent: 0,
        createdAt: now
      };

      await saveCollectionItem('projects', newProject);

      // Oppdater kontrakt og tilbud med projectId
      await updateCollectionItem('contracts', contract.id, { projectId });
      if (offer) {
        await updateCollectionItem('offers', offer.id, { projectId, status: 'accepted' });
      }

      // C. Flerfaglig Sjekklistegenerering
      const generatedChecklists = await checklistGenerator.generateChecklistsForScope(projectId, {
        trade: 'general',
        title: projectName,
        description: offer?.description,
        items: offer?.items
      });

      for (const chk of generatedChecklists) {
        await saveCollectionItem('project_checklists', chk).catch(() => {});
      }

      // D. Innledende SJA (Sikker Jobb Analyse)
      const initialSJA = {
        id: 'sja-init-' + Date.now(),
        projectId,
        title: `Oppstart & Sikkerhetsanalyse: ${projectName}`,
        task: `Innledende etablering av byggeplass, rigg og gjennomføring av ${projectName}.`,
        date: now.split('T')[0],
        authorId: 'system',
        authorName: 'Mesterhjernen (AI Auto-KS)',
        status: 'approved',
        timestamp: new Date().toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' }),
        createdAt: now,
        createdBy: 'Mesterhjernen AI',
        tek17Reference: 'TEK17 § 7-1, Arbeidsmiljøloven § 4-1',
        risikoer: [
          {
            aktivitet: 'Rigg, materialmottak og avsperring',
            risiko: 'Trafikk, fallende gjenstander, uvedkommende på byggeplass',
            tiltak: 'Avsperre arbeidsområde, bruke påbudt verneutstyr (hjelm, vernesko, vest)'
          },
          {
            aktivitet: 'Bruk av elektrisk håndverktøy og maskiner',
            risiko: 'Kutt, støv og støyskader',
            tiltak: 'Sjekke ledninger og vernedeksler, bruke vernebriller, hørselvern og støvmaske'
          },
          {
            aktivitet: 'Avfallshåndtering og kildesortering',
            risiko: 'Feilsortering, miljøskade og brannfare',
            tiltak: 'Etablere kildesorteringsstasjon for minimum 60% gjenvinning iht. TEK17 kap. 9'
          }
        ],
        utstyr: ['Hjelm', 'Vernesko', 'Vernebriller', 'Hørselsvern', 'Støvmaske P3', 'Førstehjelpskoffert']
      };
      await saveCollectionItem('sja_reports', initialSJA).catch(() => {});

      // E. Klargjør materialer fra tilbudet
      if (offer?.items && offer.items.length > 0) {
        for (let i = 0; i < offer.items.length; i++) {
          const item = offer.items[i];
          const mat = {
            id: `mat-${Date.now()}-${i}`,
            projectId,
            name: item.description,
            nobbNumber: '',
            quantity: item.quantity,
            unit: item.unit || 'stk',
            category: 'Kontraktsmateriell',
            supplier: 'Hovedleverandør',
            status: 'pending',
            createdAt: now
          };
          await saveCollectionItem('project_materials', mat).catch(() => {});
        }
      }

      // F. Etabler Grunnleggende FDV-perm i prosjektet fra dag 1
      try {
        await getOrGenerateProjectDocumentation(projectId, {
          name: projectName,
          clientName: contract.clientName,
          description: offer?.description || projectName,
          category: 'Tømrer / Totalentreprise'
        });
      } catch (err) {
        console.warn('Feil ved etablering av innledende FDV:', err);
      }

      // G. Send bekreftelses-e-post til kunde
      if (contract.clientEmail) {
        try {
          await sendProjectStartedEmail({
            project: newProject,
            clientEmail: contract.clientEmail,
            clientName: contract.clientName,
            companyName: contract.companyName,
            baseUrl
          });
        } catch (e: any) {
          console.warn('Kunne ikke sende prosjektstart e-post:', e.message);
        }
      }

      // H. Systemnotifikasjon & logg
      await saveCollectionItem('notifications', {
        id: 'notif-' + Date.now(),
        userId: 'all',
        title: '🎉 Kontrakt signert & Prosjekt opprettet!',
        message: `Kunden ${contract.clientName} har signert kontrakten for "${projectName}". Mesterhjernen har aktivert prosjektet med full flerfaglig sjekklistepakke og FDV-perm.`,
        type: 'success',
        category: 'project',
        read: false,
        createdAt: now
      }).catch(() => {});

      await saveCollectionItem('activity_logs', {
        id: 'act-' + Date.now(),
        projectId,
        title: 'Kontrakt digitalt signert av kunde',
        description: `Kontrakt ${projectCode} signert av ${contract.clientName}. Flerfaglige KS-sjekklister og FDV-arkiv etablert.`,
        author: 'Mesterhjernen',
        timestamp: now
      }).catch(() => {});

      return NextResponse.json({
        success: true,
        project: newProject,
        contract: signedContract,
        checklistsCount: generatedChecklists.length
      });
    }

    return NextResponse.json({ error: 'Ugyldig handling (action)' }, { status: 400 });
  } catch (err: any) {
    console.error('Error in POST /api/contract:', err);
    return NextResponse.json({ error: err.message || 'Internt systemfeil ved kontraktbehandling' }, { status: 500 });
  }
}
