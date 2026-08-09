import { GoogleGenAI, Type } from "@google/genai";
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
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    
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
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              score: { type: Type.NUMBER },
              status: { type: Type.STRING },
              summary: { type: Type.STRING },
              metrics: {
                type: Type.OBJECT,
                properties: {
                  progress: {
                    type: Type.OBJECT,
                    properties: {
                      status: { type: Type.STRING },
                      detail: { type: Type.STRING }
                    }
                  },
                  budget: {
                    type: Type.OBJECT,
                    properties: {
                      status: { type: Type.STRING },
                      detail: { type: Type.STRING }
                    }
                  },
                  hms: {
                    type: Type.OBJECT,
                    properties: {
                      status: { type: Type.STRING },
                      detail: { type: Type.STRING }
                    }
                  },
                  quality: {
                    type: Type.OBJECT,
                    properties: {
                      status: { type: Type.STRING },
                      detail: { type: Type.STRING }
                    }
                  }
                }
              },
              risks: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    severity: { type: Type.STRING },
                    description: { type: Type.STRING }
                  }
                }
              },
              recommendations: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              },
              nextSteps: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              }
            },
            required: ["score", "status", "summary", "metrics", "risks", "recommendations", "nextSteps"]
          }
        }
      });

      return JSON.parse(response.text);
    } catch (error) {
      console.error("Error generating project health report:", error);
      throw error;
    }
  }
};
