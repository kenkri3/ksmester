import { generateAiContent } from "./aiClient";
import { CrewMember, SafetyInspection, Deviation } from "../types";

export const hmsAiService = {
  analyzeRisk: async (crew: CrewMember[], inspections: SafetyInspection[], deviations: Deviation[]) => {
    try {
      const prompt = `
        Du er en ekspert på HMS (Helse, Miljø og Sikkerhet) i byggebransjen. 
        Analyser følgende data og gi en risikovurdering og anbefalte tiltak.
        
        Mannskap: ${JSON.stringify(crew.map(c => ({ name: c.name, role: c.role, expiry: c.hmsCardExpiry })))}
        Vernerunder: ${JSON.stringify(inspections.map(i => ({ date: i.date, findings: i.findings })))}
        Avvik: ${JSON.stringify(deviations.map(d => ({ title: d.title, severity: d.severity, status: d.status })))}
        
        Gi svaret på norsk i et profesjonelt og handlingsorientert format.
        Fokuser på:
        1. Kritiske risikoer (f.eks. utløpte HMS-kort, alvorlige åpne avvik).
        2. Trender (f.eks. gjentakende problemer på vernerunder).
        3. Konkrete anbefalinger for å forbedre sikkerheten.
        
        Hold svaret konsist (maks 150 ord).
      `;

      const response = await generateAiContent({
        prompt: prompt,
      });

      return response.text || "Kunne ikke generere HMS-analyse for øyeblikket.";
    } catch (error) {
      console.error("Error generating HMS risk analysis:", error);
      return "Feil ved generering av HMS-analyse. Vennligst sjekk dataene manuelt.";
    }
  }
};
