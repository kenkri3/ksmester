import { generateAiContent } from "./aiClient";
import { WeatherData } from "./weatherService";

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

      VIKTIG PROSESS-KRAV: Uansett hvilket språk arbeidsoppgaven eller inputen er skrevet på (polsk, litauisk, engelsk osv.), SKAL alle felt i SJA-dokumentet ALLTID skrives/genereres på profesjonelt NORSK (Bokmål) i henhold til norsk HMS-lovgivning.

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
      const response = await generateAiContent({
        model: "deepseek-chat",
        prompt: prompt,
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            title: { type: "STRING" },
            task: { type: "STRING" },
            risikoer: {
              type: "ARRAY",
              items: {
                type: "OBJECT",
                properties: {
                  aktivitet: { type: "STRING" },
                  risiko: { type: "STRING" },
                  tiltak: { type: "STRING" }
                },
                required: ["aktivitet", "risiko", "tiltak"]
              }
            },
            utstyr: {
              type: "ARRAY",
              items: { type: "STRING" }
            },
            tek17Reference: { type: "STRING" },
            weatherImpact: { type: "STRING" }
          },
          required: ["title", "task", "risikoer", "utstyr", "tek17Reference", "weatherImpact"]
        }
      });

      return JSON.parse(response.text || '{}') as SJADraft;
    } catch (error) {
      console.error("SJA Generation error:", error);
      throw error;
    }
  }
};
