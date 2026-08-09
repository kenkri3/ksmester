import { generateAiContent } from "./aiClient";
import { TimeEntry, Deviation } from "../types";

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
      
      VIKTIG: Uansett hvilket språk tidsregistreringene eller avvikene er skrevet på, SKAL denne dagsrapporten ALLTID genereres på profesjonelt NORSK (Bokmål).

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
      const response = await generateAiContent({
        prompt: prompt,
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            summary: { type: "STRING" },
            activities: { type: "ARRAY", items: { type: "STRING" } },
            deviationsReported: { type: "ARRAY", items: { type: "STRING" } },
            weatherImpact: { type: "STRING" },
            nextDayPlan: { type: "STRING" }
          },
          required: ["summary", "activities", "deviationsReported", "weatherImpact", "nextDayPlan"]
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
