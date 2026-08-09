import { generateAiContent } from "./aiClient";

export interface ContractRisk {
  risk: string;
  severity: 'low' | 'medium' | 'high';
  recommendation: string;
}

export const contractAiService = {
  /**
   * Reviews contract terms for risks and missing clauses.
   */
  async reviewContract(contractText: string): Promise<ContractRisk[]> {
    const prompt = `
      Som en juridisk rådgiver spesialisert på norske byggestandarder (NS 8405, NS 8406, NS 8407), 
      analyser følgende kontraktsutkast for risikoer, uklare punkter eller manglende klausuler:
      
      KONTRAKTSTEKST:
      ${contractText}
      
      Returner et JSON-array med objekter:
      {
        "risk": "Beskrivelse av risikoen (f.eks. 'Manglende dagmulkt')",
        "severity": "Alvorlighetsgrad ('low', 'medium', 'high')",
        "recommendation": "Konkret anbefaling for å utbedre punktet"
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
              risk: { type: "STRING" },
              severity: { type: "STRING", enum: ["low", "medium", "high"] },
              recommendation: { type: "STRING" }
            },
            required: ["risk", "severity", "recommendation"]
          }
        }
      });

      return JSON.parse(response.text || '[]');
    } catch (error) {
      console.error("Contract review error:", error);
      return [];
    }
  },

  /**
   * Compares a contract with an offer to ensure consistency.
   */
  async compareContractWithOffer(contractText: string, offerItems: any[]): Promise<ContractRisk[]> {
    const prompt = `
      Som en juridisk rådgiver i den norske byggebransjen, 
      sammenlign følgende kontraktsutkast med det opprinnelige tilbudet.
      Sjekk om alle poster fra tilbudet er inkludert i kontrakten, og om det er endringer i priser eller omfang som ikke er dokumentert.
      
      TILBUDSPOSTER:
      ${JSON.stringify(offerItems, null, 2)}
      
      KONTRAKTSTEKST:
      ${contractText}
      
      Returner et JSON-array med objekter:
      {
        "risk": "Beskrivelse av avviket (f.eks. 'Post for grunnarbeid mangler i kontrakt')",
        "severity": "Alvorlighetsgrad ('low', 'medium', 'high')",
        "recommendation": "Konkret anbefaling for å utbedre punktet"
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
              risk: { type: "STRING" },
              severity: { type: "STRING", enum: ["low", "medium", "high"] },
              recommendation: { type: "STRING" }
            },
            required: ["risk", "severity", "recommendation"]
          }
        }
      });

      return JSON.parse(response.text || '[]');
    } catch (error) {
      console.error("Contract comparison error:", error);
      return [];
    }
  }
};
