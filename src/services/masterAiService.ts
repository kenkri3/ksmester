import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export interface AiTextResponse {
  text: string;
  language: string;
}

export const masterAiService = {
  /**
   * General purpose text assistant for generating, improving or translating text.
   */
  async processText(
    text: string, 
    instruction: string, 
    targetLanguage: string = 'norsk'
  ): Promise<AiTextResponse> {
    const prompt = `
      Du er "MesterAI", den sentrale hjernen i et fagsystem for håndverkere.
      Din oppgave er å hjelpe brukeren med tekstbehandling.
      
      KONTEKST/TEKST:
      ${text}
      
      INSTRUKSJON:
      ${instruction}
      
      MÅLSPRÅK:
      ${targetLanguage}
      
      KRAV:
      1. Svaret skal være profesjonelt og tilpasset byggebransjen.
      2. Hvis instruksjonen er å oversette, behold fagterminologi korrekt på målspråket.
      3. Hvis instruksjonen er å utfylle/forbedre, gjør teksten mer selgende og profesjonell.
      
      Returner et JSON-objekt:
      {
        "text": "Den bearbeidede teksten",
        "language": "${targetLanguage}"
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
              text: { type: Type.STRING },
              language: { type: Type.STRING }
            },
            required: ["text", "language"]
          }
        }
      });

      return JSON.parse(response.text || '{"text": "", "language": ""}');
    } catch (error) {
      console.error("MasterAI processText error:", error);
      return { text: text, language: targetLanguage };
    }
  },

  /**
   * Translates a whole offer or document structure.
   */
  async translateDocument(data: any, targetLanguage: string): Promise<any> {
    const prompt = `
      Oversett følgende dokumentdata til ${targetLanguage}. 
      Behold JSON-strukturen nøyaktig som den er, men oversett alle tekstverdier (beskrivelser, titler, etc.).
      Faguttrykk innen bygg og anlegg skal oversettes korrekt til profesjonell terminologi på ${targetLanguage}.
      
      DATA:
      ${JSON.stringify(data)}
      
      Svar KUN med den oversatte JSON-en.
    `;

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json"
        }
      });

      return JSON.parse(response.text || '{}');
    } catch (error) {
      console.error("MasterAI translateDocument error:", error);
      return data;
    }
  }
};
