import { GoogleGenAI, Type } from "@google/genai";
import { Project } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export interface ResourceEstimation {
  estimatedHours: number;
  teamSize: number;
  roles: { role: string; count: number; description: string }[];
  materials: { item: string; quantity: string; estimatedCost: string }[];
  timeline: { phase: string; duration: string; dependencies: string[] }[];
}

export const resourceService = {
  /**
   * Estimates resources and timeline based on project description and type.
   */
  async estimateResources(project: Project): Promise<ResourceEstimation> {
    const prompt = `
      Som en erfaren prosjektleder i den norske byggebransjen, 
      estimer nødvendige ressurser og tidslinje for følgende prosjekt:
      Navn: ${project.name}
      Beskrivelse: ${project.description || 'Byggeprosjekt'}
      Lokasjon: ${project.location}
      Tags: ${project.tags?.join(', ') || 'Ingen'}
      
      Gi et realistisk estimat basert på norske standarder og normal produktivitet.
      
      Returner et JSON-objekt med følgende struktur:
      {
        "estimatedHours": number (totalt antall timer),
        "teamSize": number (anbefalt antall personer),
        "roles": [
          { "role": "Faggruppe (f.eks. Tømrer, Elektriker)", "count": number, "description": "Hovedoppgave" }
        ],
        "materials": [
          { "item": "Materiale/Utstyr", "quantity": "Mengde (f.eks. '500m2', '10 stk')", "estimatedCost": "Estimerte kostnader i NOK" }
        ],
        "timeline": [
          { "phase": "Navn på fase (f.eks. Grunnarbeid, Råbygg)", "duration": "Varighet (f.eks. '2 uker')", "dependencies": ["Liste over", "avhengigheter"] }
        ]
      }
      Svar KUN med JSON.
    `;

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              estimatedHours: { type: Type.NUMBER },
              teamSize: { type: Type.NUMBER },
              roles: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    role: { type: Type.STRING },
                    count: { type: Type.NUMBER },
                    description: { type: Type.STRING }
                  },
                  required: ["role", "count", "description"]
                }
              },
              materials: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    item: { type: Type.STRING },
                    quantity: { type: Type.STRING },
                    estimatedCost: { type: Type.STRING }
                  },
                  required: ["item", "quantity", "estimatedCost"]
                }
              },
              timeline: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    phase: { type: Type.STRING },
                    duration: { type: Type.STRING },
                    dependencies: { type: Type.ARRAY, items: { type: Type.STRING } }
                  },
                  required: ["phase", "duration", "dependencies"]
                }
              }
            },
            required: ["estimatedHours", "teamSize", "roles", "materials", "timeline"]
          }
        }
      });

      return JSON.parse(response.text || '{}');
    } catch (error) {
      console.error("Resource Estimation error:", error);
      return {
        estimatedHours: 0,
        teamSize: 0,
        roles: [],
        materials: [],
        timeline: []
      };
    }
  }
};
