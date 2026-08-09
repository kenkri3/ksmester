import { GoogleGenAI } from "@google/genai";
import { Project, Deviation } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export const summaryService = {
  async generateProjectSummary(project: Project, activities: any[], deviations: Deviation[]) {
    const prompt = `
      Som en prosjektlederassistent, gi en kortfattet statusoppdatering for prosjektet:
      Prosjekt: ${project.name}
      Fremdrift: ${project.progress}%
      Status: ${project.status}
      
      Siste aktiviteter:
      ${activities.map(a => `- ${a.title}: ${a.description}`).join('\n')}
      
      Åpne avvik:
      ${deviations.filter(d => d.status === 'open').map(d => `- ${d.title} (${d.severity})`).join('\n')}
      
      OPPGAVE:
      Lag en oppsummering på 2-3 setninger som forklarer nåværende status, eventuelle kritiske punkter, og hva som er neste fokusområde.
      Svar på norsk.
    `;

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt
      });
      return response.text;
    } catch (error) {
      console.error("Summary generation error:", error);
      return "Kunne ikke generere oppsummering for øyeblikket.";
    }
  }
};
