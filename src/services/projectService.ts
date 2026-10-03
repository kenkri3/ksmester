import { db, auth, collection, addDoc, serverTimestamp, updateDoc, doc, getDoc, getDocs, query, where } from './firebase';
import { authHeaders } from '../lib/clientAuth';
import { Project, Offer, Contract, Trade } from '../types';
import { dashboardAiService } from './dashboardAiService';
import { fdvService } from './fdvService';
import { api } from './api';

export const projectService = {
  /**
   * Creates a new project automatically from a signed contract.
   */
  async createProjectFromContract(contract: Contract, offer?: Offer): Promise<string> {
    try {
      // 1. Create the project
      const projectData: Omit<Project, 'id'> = {
        name: contract.title,
        projectCode: contract.projectCode || `P-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
        description: offer?.description || `Prosjekt basert på kontrakt: ${contract.title}`,
        location: 'Ikke spesifisert', // Should ideally come from offer/contract
        progress: 0,
        status: 'active',
        stage: 'active',
        documentationLevel: 0,
        lastUpdate: new Date().toISOString(),
        startDate: new Date().toISOString(),
        clientName: contract.clientName,
        clientEmail: contract.clientEmail,
        companyId: contract.company,
        companyName: '', // Should be fetched or passed
        createdAt: serverTimestamp() as any,
      };

      const projectRef = await addDoc(collection(db, 'projects'), projectData);
      const projectId = projectRef.id;

      // 2. Generate checklists using AI based on offer/contract content
      await this.generateInitialChecklists(projectId, contract, offer);

      // 3. Update contract with projectId
      await updateDoc(doc(db, 'contracts', contract.id), {
        projectId,
        status: 'signed',
        signedAt: new Date().toISOString(),
        updatedAt: serverTimestamp()
      });

      // 4. Update offer if exists
      if (offer) {
        await updateDoc(doc(db, 'offers', offer.id), {
          projectId,
          status: 'accepted',
          updatedAt: serverTimestamp()
        });
      }

      return projectId;
    } catch (error) {
      console.error("Error creating project from contract:", error);
      throw error;
    }
  },

  /**
   * Generates initial checklists for a project using AI.
   */
  async generateInitialChecklists(projectId: string, contract: Contract, offer?: Offer) {
    try {
      const content = `
        KONTRAKT: ${contract.title}
        BESKRIVELSE: ${offer?.description || ''}
        POSTER: ${JSON.stringify(offer?.items || [])}
      `;

      // Use AI to determine which checklists are needed and if custom items should be added
      // For now, we'll use a simplified version that picks relevant trade checklists
      // and potentially adds custom ones.
      
      const trades: Trade[] = ['general'];
      if (offer?.description.toLowerCase().includes('bad') || offer?.description.toLowerCase().includes('rør')) trades.push('plumber');
      if (offer?.description.toLowerCase().includes('el') || offer?.description.toLowerCase().includes('strøm')) trades.push('electrician');
      if (offer?.description.toLowerCase().includes('tømrer') || offer?.description.toLowerCase().includes('snekker')) trades.push('carpenter');
      if (offer?.description.toLowerCase().includes('mur') || offer?.description.toLowerCase().includes('flis')) trades.push('mason');
      if (offer?.description.toLowerCase().includes('mal')) trades.push('painter');

      // Create checklist documents in Firestore
      for (const trade of trades) {
        await addDoc(collection(db, 'project_checklists'), {
          projectId,
          trade,
          status: 'pending',
          answers: {},
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }
    } catch (error) {
      console.error("Error generating initial checklists:", error);
    }
  },

  /**
   * Triggers automatic documentation generation when checklists are completed.
   */
  async finalizeProjectDocumentation(projectId: string) {
    try {
      let project: Project | null = null;
      try {
        const projectDoc = await getDoc(doc(db, 'projects', projectId));
        if (projectDoc.exists()) {
          project = { id: projectDoc.id, ...projectDoc.data() } as Project;
        }
      } catch {}

      if (!project) {
        const allProjects = await api.getCollection('projects');
        project = allProjects.find((p: any) => p.id === projectId) || null;
      }

      if (!project) return false;

      // 1. Fetch materials
      let materials: any[] = [];
      try {
        const materialsSnapshot = await getDocs(query(
          collection(db, 'project_materials'),
          where('projectId', '==', projectId)
        ));
        materials = materialsSnapshot.docs.map(doc => doc.data() as any);
      } catch {}

      // 2. Generate and save FDV package
      try {
        const fdvData = await fdvService.generateFDV(project, materials);
        await api.saveDoc('project_documents', {
          id: `doc-fdv-final-${projectId}`,
          projectId,
          title: `Komplett FDV-Perm: ${project.name}`,
          category: 'FDV Dokumentasjon',
          type: 'fdv',
          source: 'ai_engine',
          content: fdvData,
          status: 'approved',
          tek17Clause: 'TEK17 § 4-1 / Plan- og bygningsloven',
          description: `Komplett FDV-dokumentasjon og driftsinstrukser for ${project.name}, overlevert ved prosjektslutt.`,
          createdAt: new Date().toISOString().split('T')[0]
        });
      } catch (err) {
        console.warn('Could not save fdvData to project_documents:', err);
      }

      // 3. Generer formell Overtakelsesprotokoll (NS 8406)
      try {
        await api.saveDoc('project_documents', {
          id: `doc-overtakelse-${projectId}`,
          projectId,
          title: `Overtakelsesprotokoll (NS 8406) - ${project.name}`,
          category: 'Sluttdokumentasjon',
          type: 'contract',
          source: 'manual',
          tek17Clause: 'NS 8406 Forenklet norsk byggekontrakt pkt. 32',
          description: `Formell overtakelsesprotokoll for ${project.name} overlevert ${project.clientName}. 5 års reklamasjonsgaranti.`,
          createdAt: new Date().toISOString().split('T')[0]
        });
      } catch (err) {
        console.warn('Could not save overtakelse doc:', err);
      }

      // 4. Send e-post til kunde med komplett dokumentasjonspakke dersom e-post foreligger
      if (project.clientEmail) {
        try {
          await fetch('/api/documentation', {
            method: 'POST',
            headers: authHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify({
              action: 'email_documentation',
              projectId,
              projectInfo: project,
              recipientEmail: project.clientEmail,
              companyName: project.companyName || 'Mesterbedrift'
            })
          });
        } catch (emailErr) {
          console.warn('Could not send final email documentation:', emailErr);
        }
      }

      // 5. Update project stage to archived/completed and boligmappaReady
      try {
        await updateDoc(doc(db, 'projects', projectId), {
          stage: 'archived',
          status: 'completed',
          progress: 100,
          documentationLevel: 100,
          boligmappaReady: true,
          completedAt: new Date().toISOString(),
          updatedAt: serverTimestamp()
        });
      } catch {
        await api.saveDoc('projects', {
          ...project,
          stage: 'archived',
          status: 'completed',
          progress: 100,
          documentationLevel: 100,
          boligmappaReady: true,
          completedAt: new Date().toISOString()
        });
      }

      return true;
    } catch (error) {
      console.error("Error finalizing project documentation:", error);
      return false;
    }
  }
};
