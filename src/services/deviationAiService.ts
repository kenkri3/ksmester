import { generateAiContent } from "./aiClient";

export interface DeviationAnalysis {
  rootCause: string;
  trends: string[];
  recommendations: string[];
  riskLevel: 'low' | 'medium' | 'high';
}

export interface DeviationRemedySuggestion {
  tek17Ref?: string;
  recommendedAction: string;
  preventiveAction: string;
  requiredMaterials?: string[];
  estimatedTime?: string;
}

class DeviationAiService {
  async analyzeDeviations(deviations: any[]): Promise<DeviationAnalysis> {
    const deviationText = deviations.map(d => `- ${d.title}: ${d.description} (Alvorlighet: ${d.severity})`).join('\n');

    try {
      const response = await generateAiContent({
        prompt: `Du er en HMS-ekspert i den norske byggebransjen. Analyser følgende liste over avvik fra byggeplasser og identifiser rotårsaker, trender og gi konkrete anbefalinger for å forhindre gjentakelse.
        
        AVVIK:
        ${deviationText}
        
        Svar i JSON-format med følgende struktur:
        {
          "rootCause": "En overordnet analyse av hvorfor disse avvikene oppstår",
          "trends": ["Trend 1", "Trend 2"],
          "recommendations": ["Anbefaling 1", "Anbefaling 2"],
          "riskLevel": "low" | "medium" | "high"
        }
        Svar KUN med JSON.`,
        responseMimeType: "application/json"
      });

      return JSON.parse(response.text);
    } catch (error) {
      console.error("Deviation analysis failed:", error);
      throw error;
    }
  }

  async suggestDeviationRemedy(deviation: { title: string; description: string; severity?: string; location?: string }): Promise<DeviationRemedySuggestion> {
    try {
      const response = await generateAiContent({
        prompt: `Du er en erfaren norsk byggmester, takstmann og HMS/KS-rådgiver.
Analyser følgende avvik som er registrert på en byggeplass og gi konkrete, fagmessige råd for utbedring i henhold til TEK17, relevante Norske Standarder (NS) og Byggforskserien (SINTEF).

AVVIK:
Tittel: ${deviation.title}
Beskrivelse: ${deviation.description}
Alvorlighet: ${deviation.severity || 'ukjent'}
Lokasjon: ${deviation.location || 'Byggeplass'}

Gi et strukturert svar i JSON-format med følgende felter:
{
  "tek17Ref": "Relevant TEK17-paragraf eller NS/Sintef henvisning (f.eks. 'TEK17 § 11-10')",
  "recommendedAction": "Konkret, steg-for-steg anbefaling for hvordan avviket skal utbedres fagmessig",
  "preventiveAction": "Hvordan man unngår at dette avviket gjentar seg",
  "requiredMaterials": ["Materiale 1", "Materiale 2"],
  "estimatedTime": "Estimert tidsbruk (f.eks. '1-2 timer')"
}
Svar KUN med gyldig JSON.`,
        responseMimeType: "application/json"
      });

      return JSON.parse(response.text);
    } catch (error) {
      console.error("Failed to suggest deviation remedy:", error);
      throw error;
    }
  }
}

export const deviationAiService = new DeviationAiService();
