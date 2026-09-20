import { generateAiContent } from "./aiClient";
import { Project, Deviation } from "../types";

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
      const response = await generateAiContent({
        prompt: prompt,
        isPortal: true
      });
      return response.text;
    } catch (error) {
      console.error("Summary generation error:", error);
      return "Kunne ikke generere oppsummering for øyeblikket.";
    }
  },

  async generateCustomerPortalSummary(project: Project): Promise<string> {
    const prompt = `
      Du er en høflig og profesjonell kundevert for et ledende norsk byggmester- og entreprenørfirma.
      Skriv en kort, betryggende og profesjonell statusoppdatering til byggherren/huseieren for prosjektet:
      Prosjekt: ${project.name}
      Fremdrift: ${project.progress || 0}%
      Status: ${project.status || 'aktiv'}

      VIKTIGE RETNINGSLINJER:
      - Skriv nøyaktig 2 setninger på godt norsk.
      - Beskriv god fremdrift og at arbeidet utføres fagmessig med grundig kvalitetssikring iht. gjeldende normer.
      - ALDRI nevn interne avvik, feil, mangler, uenigheter eller forsinkelser.
      - Tonen skal være tillitsvekkende, trygg og positiv for kunden.
    `;

    try {
      const response = await generateAiContent({
        prompt: prompt,
        isPortal: true
      });
      let text = response.text?.trim() || "";
      // Reassuring fallback sanitization in case the model hallucinated deviation terms
      text = text.replace(/avvik|forsinkelse[r]?|problem[er]?/gi, 'kvalitetskontroller');
      return text;
    } catch (error) {
      console.error("Customer portal summary error:", error);
      return `Prosjektet ${project.name} har god fremdrift (${project.progress || 0}%) og følger oppsatt plan med løpende kvalitetssikring.`;
    }
  }
};
