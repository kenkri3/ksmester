import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export interface VisionAnalysisResult {
  elements: string[];
  status: 'approved' | 'deviation';
  description: string;
  confidence: number;
  recommendation?: string;
  title: string;
  tips?: string[];
  nextSteps?: string[];
}

export const visionService = {
  /**
   * Analyzes an image for construction deviations using Gemini Vision.
   */
  async analyzeImage(base64Image: string, mimeType: string): Promise<VisionAnalysisResult> {
    const prompt = `
      Du er en ekspert på byggeteknisk kontroll (KS) og HMS i Norge. 
      Analyser dette bildet fra en byggeplass.
      
      OPPGAVE:
      1. Identifiser hva som er på bildet (f.eks. isolasjon, rør, stenderverk, produktemballasje).
      2. Vurder om utførelsen ser korrekt ut i henhold til norske krav (TEK17) hvis mulig.
      3. Hvis det er et produkt, prøv å identifisere merke/modell.
      
      Returner et JSON-objekt:
      {
        "status": "approved" | "deviation",
        "title": "En kort tittel",
        "description": "En kortfattet forklaring på norsk om hva du ser og din vurdering.",
        "elements": ["liste", "over", "detekterte", "objekter"],
        "tips": ["3-4 praktiske tips eller triks for denne typen arbeid"],
        "nextSteps": ["2-3 forslag til videre løp eller neste steg i prosessen"],
        "confidence": 0.0 til 1.0,
        "recommendation": "Kort anbefaling for tiltak"
      }
    `;

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview", 
        contents: [
          {
            inlineData: {
              data: base64Image.split(',')[1] || base64Image,
              mimeType: mimeType
            }
          },
          { text: prompt }
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              status: { type: Type.STRING, enum: ["approved", "deviation"] },
              title: { type: Type.STRING },
              description: { type: Type.STRING },
              elements: { type: Type.ARRAY, items: { type: Type.STRING } },
              tips: { type: Type.ARRAY, items: { type: Type.STRING } },
              nextSteps: { type: Type.ARRAY, items: { type: Type.STRING } },
              confidence: { type: Type.NUMBER },
              recommendation: { type: Type.STRING }
            },
            required: ["status", "title", "description", "elements", "tips", "nextSteps", "confidence", "recommendation"]
          }
        }
      });

      return JSON.parse(response.text || '{}') as VisionAnalysisResult;
    } catch (error) {
      console.error("Vision Analysis error:", error);
      throw error;
    }
  }
};
