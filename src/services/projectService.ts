import { db, auth, collection, addDoc, serverTimestamp, updateDoc, doc, getDoc, getDocs, query, where } from './firebase';
import { Project, Offer, Contract, Trade } from '../types';
import { dashboardAiService } from './dashboardAiService';
import { fdvService } from './fdvService';

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
      const projectDoc = await getDoc(doc(db, 'projects', projectId));
      if (!projectDoc.exists()) return;
      const project = { id: projectDoc.id, ...projectDoc.data() } as Project;

      // Fetch materials
      const materialsSnapshot = await getDocs(query(
        collection(db, 'project_materials'),
        where('projectId', '==', projectId)
      ));
      const materials = materialsSnapshot.docs.map(doc => doc.data() as any);

      // Generate FDV
      const fdvData = await fdvService.generateFDV(project, materials);
      
      // Save FDV to project documents
      await addDoc(collection(db, 'project_documents'), {
        projectId,
        title: `FDV - ${project.name}`,
        type: 'fdv',
        content: fdvData,
        status: 'ready_for_sending',
        createdAt: serverTimestamp()
      });

      // Update project stage
      await updateDoc(doc(db, 'projects', projectId), {
        stage: 'completion',
        progress: 100,
        updatedAt: serverTimestamp()
      });

      return true;
    } catch (error) {
      console.error("Error finalizing project documentation:", error);
      return false;
    }
  }
};
