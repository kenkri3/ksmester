import { GoogleGenAI, Type } from "@google/genai";
import { TimeEntry, Deviation } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export interface DailyLog {
  summary: string;
  activities: string[];
  deviationsReported: string[];
  weatherImpact: string;
  nextDayPlan: string;
}

export const logAiService = {
  /**
   * Generates a daily log (Dagsrapport) based on time entries, deviations and weather.
   */
  async generateDailyLog(timeEntries: TimeEntry[], deviations: Deviation[], weather: string): Promise<DailyLog> {
    const prompt = `
      Som en AI-assistent for en byggeleder, generer en profesjonell dagsrapport (Dagsrapport) 
      basert på dagens aktiviteter:
      
      TIME-REGISTRERINGER:
      ${JSON.stringify(timeEntries.map(e => ({ user: e.userName, hours: e.hours, desc: e.description })))}
      
      AVVIK RAPPORTERT:
      ${JSON.stringify(deviations.map(d => ({ title: d.title, severity: d.severity })))}
      
      VÆRFORHOLD:
      ${weather}
      
      Returner et JSON-objekt:
      {
        "summary": "En kort oppsummering av dagen (2-3 setninger)",
        "activities": ["Liste over", "viktigste", "fullførte oppgaver"],
        "deviationsReported": ["Liste over", "håndterte", "avvik"],
        "weatherImpact": "Hvordan været påvirket arbeidet",
        "nextDayPlan": "Hva er planen for morgendagen"
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
              summary: { type: Type.STRING },
              activities: { type: Type.ARRAY, items: { type: Type.STRING } },
              deviationsReported: { type: Type.ARRAY, items: { type: Type.STRING } },
              weatherImpact: { type: Type.STRING },
              nextDayPlan: { type: Type.STRING }
            },
            required: ["summary", "activities", "deviationsReported", "weatherImpact", "nextDayPlan"]
          }
        }
      });

      return JSON.parse(response.text || '{}');
    } catch (error) {
      console.error("Log generation error:", error);
      return {
        summary: "Feil ved generering av dagsrapport.",
        activities: [],
        deviationsReported: [],
        weatherImpact: "Ukjent",
        nextDayPlan: "Ukjent"
      };
    }
  }
};
