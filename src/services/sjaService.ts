import { GoogleGenAI, Type } from "@google/genai";
import { WeatherData } from "./weatherService";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export interface SJADraft {
  title: string;
  task: string;
  risikoer: { aktivitet: string; risiko: string; tiltak: string }[];
  utstyr: string[];
  tek17Reference: string;
  weatherImpact?: string;
}

export const sjaService = {
  /**
   * Generates a draft SJA based on project context, task description, and weather.
   */
  async generateDraft(
    projectContext: { name: string; description?: string; location: string }, 
    taskDescription: string,
    weather?: WeatherData
  ): Promise<SJADraft> {
    const weatherPrompt = weather ? `
      VÆRFORHOLD:
      Temperatur: ${weather.temp}°C
      Tilstand: ${weather.condition}
      Vindstyrke: ${weather.windSpeed} m/s
      Nedbør: ${weather.precipitation} mm
      Beskrivelse: ${weather.description}
      
      Vurder spesielt hvordan disse værforholdene påvirker sikkerheten for oppgaven (f.eks. vind ved kranløft, glatte flater ved takarbeid, kulde ved støping).
    ` : '';

    const prompt = `
      Som en ekspert på HMS og Sikker Jobb Analyse (SJA) i den norske byggebransjen, generer et utkast til SJA.
      Prosjekt: ${projectContext.name}
      Beskrivelse: ${projectContext.description || 'Ikke oppgitt'}
      Lokasjon: ${projectContext.location}
      Arbeidsoppgave: ${taskDescription}
      ${weatherPrompt}

      Vurder relevante TEK17 og SAK10 krav.
      Foreslå spesifikke risikoelementer knyttet til aktiviteten, og konkrete tiltak for å minimere risiko.
      Inkluder også nødvendig verneutstyr og verktøy.

      Returner et JSON-objekt med følgende struktur:
      {
        "title": "En passende tittel for SJAen",
        "task": "En detaljert beskrivelse av oppgaven",
        "risikoer": [
          { "aktivitet": "Spesifikk deloppgave", "risiko": "Hva kan gå galt?", "tiltak": "Hvordan forhindre det?" }
        ],
        "utstyr": ["Liste", "over", "utstyr"],
        "tek17Reference": "Relevante paragrafer fra TEK17/SAK10",
        "weatherImpact": "En kort oppsummering av hvordan været påvirker denne spesifikke oppgaven"
      }
    `;

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              task: { type: Type.STRING },
              risikoer: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    aktivitet: { type: Type.STRING },
                    risiko: { type: Type.STRING },
                    tiltak: { type: Type.STRING }
                  },
                  required: ["aktivitet", "risiko", "tiltak"]
                }
              },
              utstyr: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              },
              tek17Reference: { type: Type.STRING },
              weatherImpact: { type: Type.STRING }
            },
            required: ["title", "task", "risikoer", "utstyr", "tek17Reference", "weatherImpact"]
          }
        }
      });

      return JSON.parse(response.text || '{}') as SJADraft;
    } catch (error) {
      console.error("SJA Generation error:", error);
      throw error;
    }
  }
};
