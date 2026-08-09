import { generateAiContent } from "./aiClient";
import { Project, ProjectMaterial } from "../types";
import { nobbService } from "./nobbService";

export interface FDVDocument {
  section: string;
  description: string;
  maintenanceInterval: string;
  instructions: string[];
  supplierCategory: string;
  source?: 'ai' | 'nobb';
  url?: string;
}

export const fdvService = {
  /**
   * Generates a structured FDV (Forvaltning, Drift og Vedlikehold) documentation 
   * based on the project type, description, and optionally project materials.
   */
  async generateFDV(project: Project, materials: ProjectMaterial[] = []): Promise<FDVDocument[]> {
    // 1. Get FDV documents from NOBB materials
    const nobbDocs: FDVDocument[] = materials
      .filter(m => m.fdvUrl)
      .map(m => ({
        section: m.name,
        description: m.description || `Produkt levert av ${m.supplier}`,
        maintenanceInterval: 'Se produsentens anvisning',
        instructions: ['Følg vedlagte FDV-dokument fra NOBB'],
        supplierCategory: m.category || 'Byggevare',
        source: 'nobb',
        url: m.fdvUrl!
      }));

    // 2. Use AI to generate FDV for the rest of the project (e.g. work performed)
    const prompt = `
      Som en ekspert på FDV-dokumentasjon (Forvaltning, Drift og Vedlikehold) i Norge, 
      generer en strukturert FDV-plan for følgende prosjekt:
      Navn: ${project.name}
      Beskrivelse: ${project.description || 'Byggeprosjekt'}
      Lokasjon: ${project.location}
      Tags: ${project.tags?.join(', ') || 'Ingen'}
      
      Vi har allerede hentet dokumentasjon for følgende materialer:
      ${materials.map(m => `- ${m.name} (${m.supplier || 'Ukjent leverandør'}, ${m.category || 'Ukjent kategori'})`).join('\n')}
      
      OPPGAVE:
      1. Generer FDV for selve utførelsen (arbeidsprosesser som tømring, rørlegging, etc. basert på prosjekttype).
      2. Generer FDV for komponenter som IKKE er i listen over, men som er naturlige i et slikt prosjekt.
      3. For materialene i listen over, lag en kortfattet vedlikeholdsinstruks som utfyller produsentens FDV.
      
      Planen skal følge norske standarder og inkludere spesifikke vedlikeholdsoppgaver og intervaller.
      
      VIKTIG: Uansett hvilket språk prosjektbeskrivelsen eller materialnavnene er skrevet på, SKAL all FDV-dokumentasjon og instruksjoner ALLTID genereres på profesjonelt NORSK (Bokmål).

      Returner et JSON-array med objekter:
      {
        "section": "Navn på bygningsdel/system (f.eks. Tak, Ventilasjon, Våtrom)",
        "description": "Kort beskrivelse av hva som er levert/utført",
        "maintenanceInterval": "Anbefalt vedlikeholdsintervall (f.eks. 'Årlig', 'Hvert 5. år')",
        "instructions": ["Liste over", "spesifikke", "vedlikeholdsoppgaver"],
        "supplierCategory": "Hvilken faggruppe som har ansvaret (f.eks. Tømrer, Rørlegger)"
      }
      Svar KUN med JSON.
    `;

    try {
      const response = await generateAiContent({
        prompt: prompt,
        responseMimeType: "application/json",
        responseSchema: {
          type: "ARRAY",
          items: {
            type: "OBJECT",
            properties: {
              section: { type: "STRING" },
              description: { type: "STRING" },
              maintenanceInterval: { type: "STRING" },
              instructions: { type: "ARRAY", items: { type: "STRING" } },
              supplierCategory: { type: "STRING" }
            },
            required: ["section", "description", "maintenanceInterval", "instructions", "supplierCategory"]
          }
        }
      });

      const aiDocs = JSON.parse(response.text || '[]').map((doc: any) => ({
        ...doc,
        source: 'ai'
      }));

      return [...nobbDocs, ...aiDocs];
    } catch (error) {
      console.error("FDV Generation error:", error);
      return nobbDocs;
    }
  }
};
