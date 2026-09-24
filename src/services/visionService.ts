import { generateAiContent } from "./aiClient";

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
      const response = await generateAiContent({
        model: "gemini-3.8-flash", 
        prompt: prompt,
        operation: "vision_analysis",
        images: [
          {
            inlineData: {
              data: base64Image.split(',')[1] || base64Image,
              mimeType: mimeType || 'image/jpeg'
            }
          }
        ],
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            status: { type: "STRING", enum: ["approved", "deviation"] },
            title: { type: "STRING" },
            description: { type: "STRING" },
            elements: { type: "ARRAY", items: { type: "STRING" } },
            tips: { type: "ARRAY", items: { type: "STRING" } },
            nextSteps: { type: "ARRAY", items: { type: "STRING" } },
            confidence: { type: "NUMBER" },
            recommendation: { type: "STRING" }
          },
          required: ["status", "title", "description", "elements", "tips", "nextSteps", "confidence", "recommendation"]
        }
      });

      let raw = (response.text || '{}').trim();
      if (raw.startsWith('```json')) {
        raw = raw.replace(/^```json\s*/i, '').replace(/\s*```$/, '');
      } else if (raw.startsWith('```')) {
        raw = raw.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }

      return JSON.parse(raw) as VisionAnalysisResult;
    } catch (error) {
      console.error("Vision Analysis error:", error);
      throw error;
    }
  }
};
