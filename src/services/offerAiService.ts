import { generateAiContent } from "./aiClient";

export interface GeneratedOfferItem {
  description: string;
  quantity: number;
  unit: string;
  pricePerUnit: number;
}

export const offerAiService = {
  /**
   * Generates a list of offer items based on project description and trade.
   */
  async generateOfferItems(description: string, projectName: string, trade?: string): Promise<GeneratedOfferItem[]> {
    const prompt = `
      Som en erfaren kalkulatør i den norske byggebransjen${trade ? ` spesialisert innen ${trade}` : ''}, 
      generer en liste over nødvendige poster/linjer for et tilbud basert på:
      Prosjekt: ${projectName}
      Beskrivelse: ${description}
      
      Vennligst inkluder:
      1. Materialkostnader
      2. Arbeidstimer (estimer realistisk tidsbruk)
      3. Rigging og drift hvis relevant
      
      Prisene skal være realistiske markedspriser i NOK for 2024/2025.
      Sørg for at enhetene er standardiserte (m2, lm, stk, timer, kg).
      
      VIKTIG: Uansett hvilket språk beskrivelsen er på (polsk, engelsk, litauisk osv.), SKAL alle tilbudsposter og beskrivelser ALLTID skrives/genereres på profesjonelt NORSK (Bokmål).

      Returner et JSON-array med objekter:
      {
        "description": "Beskrivelse av posten (f.eks. 'Oppsetting av stenderverk')",
        "quantity": number,
        "unit": "Enhet (f.eks. 'm2', 'timer', 'stk')",
        "pricePerUnit": number (pris i NOK eks. mva)
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
              description: { type: "STRING" },
              quantity: { type: "NUMBER" },
              unit: { type: "STRING" },
              pricePerUnit: { type: "NUMBER" }
            },
            required: ["description", "quantity", "unit", "pricePerUnit"]
          }
        }
      });

      return JSON.parse(response.text || '[]');
    } catch (error) {
      console.error("Offer generation error:", error);
      return [];
    }
  }
};
