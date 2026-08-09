import { GoogleGenAI } from "@google/genai";

export interface DeviationAnalysis {
  rootCause: string;
  trends: string[];
  recommendations: string[];
  riskLevel: 'low' | 'medium' | 'high';
}

class DeviationAiService {
  private ai: GoogleGenAI;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
  }

  async analyzeDeviations(deviations: any[]): Promise<DeviationAnalysis> {
    const deviationText = deviations.map(d => `- ${d.title}: ${d.description} (Alvorlighet: ${d.severity})`).join('\n');

    try {
      const response = await this.ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Du er en HMS-ekspert i den norske byggebransjen. Analyser følgende liste over avvik fra byggeplasser og identifiser rotårsaker, trender og gi konkrete anbefalinger for å forhindre gjentakelse.
        
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
        config: {
          responseMimeType: "application/json"
        }
      });

      return JSON.parse(response.text);
    } catch (error) {
      console.error("Deviation analysis failed:", error);
      throw error;
    }
  }
}

export const deviationAiService = new DeviationAiService();
