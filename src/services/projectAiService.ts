import { generateAiContent } from "./aiClient";
import { Project, Deviation, SafetyInspection, CrewMember, ProjectMaterial } from "../types";

export interface ProjectHealthReport {
  score: number; // 0-100
  status: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
  summary: string;
  metrics: {
    progress: { status: string; detail: string };
    budget: { status: string; detail: string };
    hms: { status: string; detail: string };
    quality: { status: string; detail: string };
  };
  risks: { title: string; severity: 'low' | 'medium' | 'high'; description: string }[];
  recommendations: string[];
  nextSteps: string[];
}

export const projectAiService = {
  analyzeProjectHealth: async (
    project: Project,
    deviations: Deviation[],
    inspections: SafetyInspection[],
    crew: CrewMember[],
    materials: ProjectMaterial[] = []
  ): Promise<ProjectHealthReport> => {
    const prompt = `
      Du er en erfaren prosjektleder og rådgiver i den norske bygg- og anleggsbransjen.
      Din oppgave er å analysere helsen til et byggeprosjekt basert på dataene nedenfor og gi en detaljert rapport med anbefalinger.
      
      PROSJEKTDATA:
      Navn: ${project.name}
      Beskrivelse: ${project.description || 'Ingen beskrivelse'}
      Fremdrift: ${project.progress}%
      Status: ${project.status}
      Budsjett: ${project.budget || 'Ikke oppgitt'}
      Brukt: ${project.spent || 'Ikke oppgitt'}
      Startdato: ${project.startDate || 'Ikke oppgitt'}
      Sluttdato: ${project.endDate || 'Ikke oppgitt'}
      
      MATERIELL OG DOKUMENTASJON (FDV):
      Totalt antall materialer: ${materials.length}
      Materialer med FDV klar: ${materials.filter(m => m.fdvUrl).length}
      Mangler FDV: ${materials.filter(m => !m.fdvUrl).length}
      Materialer: ${materials.map(m => `${m.name} (${m.supplier || 'Ukjent leverandør'})`).join(', ')}
      
      AVVIK:
      Totalt antall avvik: ${deviations.length}
      Alvorlighetsgrader: ${deviations.map(d => d.severity).join(', ')}
      Status på avvik: ${deviations.map(d => d.status).join(', ')}
      
      HMS-DATA:
      Antall vernerunder: ${inspections.length}
      Siste funn fra vernerunder: ${inspections.flatMap(i => i.findings.map(f => f.description)).join('; ')}
      Antall personell på plass: ${crew.length}
      
      Vennligst analyser disse dataene og returner en JSON-rapport som følger dette skjemaet:
      {
        "score": tall mellom 0 og 100 som representerer total prosjekthelse,
        "status": en av "excellent", "good", "fair", "poor", "critical",
        "summary": en kortfattet oppsummering av prosjektets tilstand på norsk,
        "metrics": {
          "progress": { "status": "kort status", "detail": "utdypende detalj" },
          "budget": { "status": "kort status", "detail": "utdypende detalj" },
          "hms": { "status": "kort status", "detail": "utdypende detalj" },
          "quality": { "status": "kort status", "detail": "utdypende detalj basert på avvik" }
        },
        "risks": [
          { "title": "risikotittel", "severity": "low/medium/high", "description": "beskrivelse av risikoen" }
        ],
        "recommendations": ["liste over konkrete anbefalinger for prosjektlederen"],
        "nextSteps": ["liste over de neste 3-5 viktigste stegene"]
      }
      
      Svar KUN med JSON-objektet. Bruk norsk språk i alle tekster.
    `;

    try {
      const response = await generateAiContent({
        prompt: prompt,
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            score: { type: "NUMBER" },
            status: { type: "STRING" },
            summary: { type: "STRING" },
            metrics: {
              type: "OBJECT",
              properties: {
                progress: {
                  type: "OBJECT",
                  properties: {
                    status: { type: "STRING" },
                    detail: { type: "STRING" }
                  }
                },
                budget: {
                  type: "OBJECT",
                  properties: {
                    status: { type: "STRING" },
                    detail: { type: "STRING" }
                  }
                },
                hms: {
                  type: "OBJECT",
                  properties: {
                    status: { type: "STRING" },
                    detail: { type: "STRING" }
                  }
                },
                quality: {
                  type: "OBJECT",
                  properties: {
                    status: { type: "STRING" },
                    detail: { type: "STRING" }
                  }
                }
              }
            },
            risks: {
              type: "ARRAY",
              items: {
                type: "OBJECT",
                properties: {
                  title: { type: "STRING" },
                  severity: { type: "STRING" },
                  description: { type: "STRING" }
                }
              }
            },
            recommendations: {
              type: "ARRAY",
              items: { type: "STRING" }
            },
            nextSteps: {
              type: "ARRAY",
              items: { type: "STRING" }
            }
          },
          required: ["score", "status", "summary", "metrics", "risks", "recommendations", "nextSteps"]
        }
      });

      return JSON.parse(response.text);
    } catch (error) {
      console.error("Error generating project health report:", error);
      throw error;
    }
  }
};
