import { generateAiContent } from "./aiClient";
import { InventoryItem } from "../types";

export interface InventoryInsight {
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  action?: string;
}

export const inventoryAiService = {
  analyzeInventory: async (items: InventoryItem[]): Promise<InventoryInsight[]> => {
    const prompt = `
      Du er en smart lagerassistent for et byggefirma. 
      Analyser følgende lagerbeholdning og gi 2-3 smarte innsikter eller prediksjoner.
      Se spesielt etter:
      1. Lav beholdning som bør bestilles.
      2. Verktøy som kanskje trenger vedlikehold (basert på navn eller kategori).
      3. Optimalisering av lagerplass eller innkjøp.
      
      LAGERDATA:
      ${JSON.stringify(items.map(i => ({ name: i.name, quantity: i.quantity, minQuantity: i.minQuantity, category: i.category, unit: i.unit })))}
      
      Returner svaret som et JSON-objekt med følgende struktur:
      {
        "insights": [
          {
            "title": "Kort tittel",
            "description": "Utdypende forklaring på norsk",
            "severity": "low" | "medium" | "high",
            "action": "Valgfri konkret handling"
          }
        ]
      }
    `;

    try {
      const response = await generateAiContent({
        prompt: prompt,
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            insights: {
              type: "ARRAY",
              items: {
                type: "OBJECT",
                properties: {
                  title: { type: "STRING" },
                  description: { type: "STRING" },
                  severity: { type: "STRING", enum: ["low", "medium", "high"] },
                  action: { type: "STRING" }
                },
                required: ["title", "description", "severity"]
              }
            }
          }
        }
      });

      const data = JSON.parse(response.text);
      return data.insights;
    } catch (error) {
      console.error("Error analyzing inventory:", error);
      return [];
    }
  }
};
