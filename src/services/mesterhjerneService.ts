import { Offer, Contract, Project, SJAReport, ProjectMaterial, AppNotification, ProjectChecklist } from '../types';
import { api } from './api';
import { checklistGenerator } from './checklistGenerator';

export interface SignaturePayload {
  signatureData: string;
  signerName: string;
  signerIp?: string;
}

export const mesterhjerneService = {
  /**
   * 1. Genererer automatisk en juridisk gyldig norsk byggekontrakt basert på et tilbud.
   * Bygger på standarder etter Håndverkertjenesteloven og NS 8406.
   */
  generateContractFromOffer(
    offer: Offer, 
    companyInfo?: { name?: string; orgNumber?: string }
  ): Contract {
    const token = offer.token || `c-${Math.random().toString(36).substring(2, 11)}`;
    const companyName = offer.companyName || offer.company || companyInfo?.name || 'Mester Entreprenør AS';
    const companyOrg = offer.companyOrgNumber || companyInfo?.orgNumber || '999 888 777 MVA';

    const completionDate = new Date();
    completionDate.setDate(completionDate.getDate() + 45); // Standard 45 dager

    const standardTerms = `
1. PARTER OG RETTSLIG GRUNNLAG
Avtalen er inngått mellom oppdragstaker (${companyName}) og oppdragsgiver (${offer.clientName}). 
Arbeidene utføres i samsvar med Håndverkertjenesteloven, Plan- og bygningsloven (PBL) og gjeldende byggteknisk forskrift (TEK17).

2. ARBEIDETS OMFANG OG LEVERANSE
Oppdragstaker forplikter seg til å levere arbeidene spesifisert i vedlagte tilbud (${offer.title}) av ${new Date(offer.createdAt || Date.now()).toLocaleDateString('no-NO')}. 
Eventuelle tilleggsarbeider skal avtales skriftlig før igangsettelse.

3. KONTRAKTSSUM OG BETALINGSBETINGELSER
Avtalt vederlag er NOK ${offer.totalAmount.toLocaleString('no-NO')} ekskl. mva (NOK ${Math.round(offer.totalAmount * 1.25).toLocaleString('no-NO')} inkl. 25% mva).
Fakturering skjer etter avtalt fremdriftsplan / milepæler med forfall netto 14 dager.

4. KVALITETSSIKRING, HMS OG SLUTTDOKUMENTASJON (FDV)
Oppdragstaker plikter å føre lovpålagt internkontroll, KS-sjekklister og HMS på byggeplassen.
Ved ferdigstillelse skal oppdragstaker levere komplett FDV-dokumentasjon, samsvarserklæring og overtakelsesprotokoll.

5. REKLAMASJON OG GARANTI
Oppdragsgiver har 5 års reklamasjonsrett i henhold til norsk lov fra dato for signert overtakelsesprotokoll.
`.trim();

    return {
      id: `contract-${Date.now()}`,
      projectCode: offer.projectCode || `P-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
      projectId: offer.projectId,
      offerId: offer.id,
      clientName: offer.clientName,
      clientEmail: offer.clientEmail,
      title: `Kontrakt: ${offer.title}`,
      status: 'pending_signature',
      createdAt: new Date().toISOString(),
      authorId: offer.authorId,
      company: companyName,
      companyName: companyName,
      companyOrgNumber: companyOrg,
      totalAmount: offer.totalAmount,
      paymentTerms: 'Netto 14 dager iht. milepælsplan',
      startDate: new Date().toISOString().split('T')[0],
      completionDate: completionDate.toISOString().split('T')[0],
      terms: standardTerms,
      token,
      shareUrl: typeof window !== 'undefined' ? `${window.location.origin}/?contractToken=${token}` : `/?contractToken=${token}`,
      contractStandard: 'haandverker'
    };
  },

  /**
   * 2. Mesterhjernens kjerneeksekvering:
   * Når kunden signerer kontrakten:
   *  a) Kontrakt signeres og låses med tidsstempel og signatur
   *  b) Prosjektet opprettes 100% automatisk i systemet
   *  c) Skreddersydde, faseinndelte sjekklister genereres automatisk basert på arbeidets art
   *  d) Innledende SJA opprettes
   *  e) Materiell og avfallsplan etableres
   *  f) Systemnotifikasjon og aktivitetslogg oppdateres
   */
  async executeFullProjectInitialization(
    contract: Contract,
    offer?: Offer,
    signature?: SignaturePayload
  ): Promise<{
    project: Project;
    contract: Contract;
    checklists: ProjectChecklist[];
  }> {
    const now = new Date().toISOString();

    // A. Oppdater kontrakt med signatur
    const signedContract: Contract = {
      ...contract,
      status: 'signed',
      signedAt: now,
      signatureData: signature?.signatureData,
      signerName: signature?.signerName || contract.clientName,
      signerIp: signature?.signerIp || '127.0.0.1'
    };

    try {
      await api.saveDoc('contracts', signedContract);
    } catch (err) {
      console.warn('Could not save contract to DB:', err);
    }

    // Hvis tilbud foreligger, sett som akseptert
    if (offer) {
      try {
        const updatedOffer: Offer = {
          ...offer,
          status: 'accepted',
          acceptedAt: now,
          contractId: signedContract.id
        };
        await api.saveDoc('offers', updatedOffer);
      } catch (err) {
        console.warn('Could not update offer status:', err);
      }
    }

    // B. Opprett Prosjekt 100% Automatisk
    const projectId = contract.projectId || `proj-${Date.now()}`;
    const projectCode = contract.projectCode || `P-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;
    const projectName = (offer?.title || contract.title).replace('Kontrakt: ', '').replace('Tilbud: ', '');

    const newProject: Project = {
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
      companyId: 'comp-001',
      companyName: contract.companyName || contract.company || 'Mester Entreprenør AS',
      projectManager: 'Ansvarlig Byggmester',
      budget: contract.totalAmount || offer?.totalAmount || 0,
      spent: 0,
      createdAt: now
    };

    try {
      await api.saveDoc('projects', newProject);
    } catch (err) {
      console.warn('Could not save project to DB:', err);
    }

    // C. Generer 100% automatiske sjekklister for fag og oppgave
    const generatedChecklists = await checklistGenerator.generateChecklistsForScope(projectId, {
      trade: 'general',
      title: projectName,
      description: offer?.description,
      items: offer?.items
    });

    for (const chk of generatedChecklists) {
      try {
        await api.saveDoc('project_checklists', chk);
      } catch (err) {
        console.warn('Could not save checklist:', err);
      }
    }

    // D. Opprett innledende Sikker Jobb Analyse (SJA) for trygg oppstart
    const initialSJA: SJAReport = {
      id: `sja-init-${Date.now()}`,
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

    try {
      await api.saveDoc('sja_reports', initialSJA);
    } catch (err) {
      console.warn('Could not save initial SJA:', err);
    }

    // E. Opprett materialer og materiellbudsjett fra tilbudet dersom poster finnes
    if (offer?.items && offer.items.length > 0) {
      for (let i = 0; i < offer.items.length; i++) {
        const item = offer.items[i];
        const mat: ProjectMaterial = {
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
        try {
          await api.saveDoc('project_materials', mat);
        } catch (err) {
          console.warn('Could not save material:', err);
        }
      }
    }

    // F. Initialiser prosjektets FDV- og sluttdokumentasjonsarkiv fra dag 1
    try {
      if (typeof window !== 'undefined') {
        fetch('/api/documentation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'generate_project_fdv',
            projectId,
            projectInfo: newProject,
            companyName: newProject.companyName
          })
        }).catch(e => console.warn('Background FDV init warning:', e));
      }
    } catch (err) {
      console.warn('Could not trigger initial FDV generation:', err);
    }

    // G. Logg aktivitet og send notifikasjon
    const notif: AppNotification = {
      id: `notif-${Date.now()}`,
      userId: 'all',
      title: '🎉 Kontrakt signert & Prosjekt opprettet!',
      message: `Kunden ${contract.clientName} har signert kontrakten for "${projectName}". Mesterhjernen har aktivert prosjektet med flerfaglige sjekklister, SJA og FDV-perm.`,
      type: 'success',
      category: 'project',
      read: false,
      createdAt: now
    };

    try {
      await api.saveDoc('notifications', notif);
      await api.saveDoc('activity_logs', {
        id: `act-${Date.now()}`,
        projectId,
        title: 'Kontrakt digitalt signert av kunde',
        description: `Kontrakt ${contract.projectCode} signert av ${contract.clientName}. Flerfaglige KS-sjekklister og FDV-arkiv etablert.`,
        author: 'Mesterhjernen',
        timestamp: now
      });
    } catch (err) {
      console.warn('Could not save notification/activity:', err);
    }

    return {
      project: newProject,
      contract: signedContract,
      checklists: generatedChecklists
    };
  }
};
