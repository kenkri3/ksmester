import { generateAiContent } from "./aiClient";
import { Project, Deviation } from "../types";

export interface ExecutiveSummary {
  summary: string;
  criticalIssues: string[];
  financialStatus: string;
  recommendations: string[];
  nextWeekFocus: string[];
}

export const reportService = {
  /**
   * Generates a weekly executive summary for management based on project and deviation data.
   */
  async generateWeeklyReport(projects: Project[], deviations: Deviation[]): Promise<ExecutiveSummary> {
    const prompt = `
      Som en AI-rådgiver for en daglig leder i en norsk byggmesterbedrift, 
      generer en profesjonell ukentlig leder-rapport basert på følgende data:
      
      PROSJEKTER:
      ${JSON.stringify(projects.map(p => ({ name: p.name, stage: p.stage, progress: p.progress, docLevel: p.documentationLevel })))}
      
      AVVIK:
      ${JSON.stringify(deviations.map(d => ({ title: d.title, severity: d.severity, status: d.status, project: d.project })))}
      
      Rapporten skal være konsis, profesjonell og fokusert på risiko og fremdrift.
      
      Returner et JSON-objekt med følgende struktur:
      {
        "summary": "En overordnet oppsummering av uken (2-3 setninger)",
        "criticalIssues": ["Liste over", "viktigste", "kritiske avvik"],
        "financialStatus": "En kort vurdering av økonomisk risiko basert på fremdrift og avvik",
        "recommendations": ["Anbefalte", "strakstiltak", "for ledelsen"],
        "nextWeekFocus": ["Hva bør", "være i fokus", "neste uke"]
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
            criticalIssues: { type: "ARRAY", items: { type: "STRING" } },
            financialStatus: { type: "STRING" },
            recommendations: { type: "ARRAY", items: { type: "STRING" } },
            nextWeekFocus: { type: "ARRAY", items: { type: "STRING" } }
          },
          required: ["summary", "criticalIssues", "financialStatus", "recommendations", "nextWeekFocus"]
        }
      });

      return JSON.parse(response.text || '{}');
    } catch (error) {
      console.error("Report Generation error:", error);
      return {
        summary: "Feil ved generering av rapport.",
        criticalIssues: [],
        financialStatus: "Ukjent",
        recommendations: [],
        nextWeekFocus: []
      };
    }
  }
};
