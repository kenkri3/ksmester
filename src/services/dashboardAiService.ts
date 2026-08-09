import { GoogleGenAI, Type } from "@google/genai";
import { Project, Deviation, ProjectMaterial, InventoryItem } from "../types";
import { WeatherData } from "./weatherService";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export interface DashboardInsight {
  id: string;
  title: string;
  description: string;
  action: string;
  actionId: string;
  type: 'warning' | 'info' | 'success' | 'predictive';
  icon?: string;
}

export const dashboardAiService = {
  /**
   * Generates intelligent insights based on current projects, deviations, weather, and inventory.
   */
  async generateInsights(
    projects: Project[], 
    deviations: Deviation[], 
    weatherData?: Record<string, WeatherData>,
    inventory: InventoryItem[] = []
  ): Promise<DashboardInsight[]> {
    if (projects.length === 0) return [];

    const weatherContext = weatherData ? `
      VÆRDATA PR PROSJEKT:
      ${JSON.stringify(Object.entries(weatherData).map(([id, w]) => ({ projectId: id, temp: w.temp, condition: w.condition, wind: w.windSpeed })))}
    ` : '';

    const inventoryContext = inventory.length > 0 ? `
      LAGERSTATUS:
      ${JSON.stringify(inventory.map(i => ({ name: i.name, quantity: i.quantity, min: i.minQuantity })))}
    ` : '';

    const prompt = `
      Du er en AI-rådgiver for en norsk byggmester. 
      Analyser følgende prosjektdata, avvik, værforhold og lagerstatus for å gi 4 smarte, handlingsorienterte innsikter.
      Inkluder minst én PREDRIKTIV analyse (hva som kan skje fremover basert på trender, vær eller lagerbeholdning).
      
      PROSJEKTER:
      ${JSON.stringify(projects.map(p => ({ id: p.id, name: p.name, stage: p.stage, progress: p.progress, docLevel: p.documentationLevel, location: p.location })))}
      
      AVVIK:
      ${JSON.stringify(deviations.map(d => ({ title: d.title, severity: d.severity, status: d.status, project: d.project })))}
      
      ${weatherContext}
      ${inventoryContext}
      
      OPPGAVE:
      Identifiser kritiske risikoer, trender, eller muligheter for effektivisering. 
      Fokuser på HMS, TEK17-overholdelse, prosjektfremdrift og lagerstyring.
      Bruk værdata for å forutse utfordringer (f.eks. stopp i kranarbeid pga vind, eller behov for tildekking pga regn).
      Bruk lagerdata for å varsle om lav beholdning som kan forsinke prosjekter.
      
      Returner et JSON-array med objekter:
      {
        "id": "string",
        "title": "Kort, fengende tittel",
        "description": "Forklar innsikten og hvorfor den er viktig",
        "action": "Tekst på handlingsknapp",
        "actionId": "ID for handlingen (velg fra: 'new_project', 'offers', 'contracts', 'hms', 'log_deviation', 'take_photo', 'library', 'time_registration', 'inventory')",
        "type": "warning" | "info" | "success" | "predictive",
        "icon": "alert" | "zap" | "camera" | "check" | "trending" | "cloud"
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
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                title: { type: Type.STRING },
                description: { type: Type.STRING },
                action: { type: Type.STRING },
                actionId: { type: Type.STRING },
                type: { type: Type.STRING, enum: ["warning", "info", "success", "predictive"] },
                icon: { type: Type.STRING, enum: ["alert", "zap", "camera", "check", "trending", "cloud"] }
              },
              required: ["id", "title", "description", "action", "actionId", "type", "icon"]
            }
          }
        }
      });

      return JSON.parse(response.text || '[]');
    } catch (error) {
      console.error("Dashboard AI Insight error:", error);
      return [];
    }
  },

  /**
   * Performs a deep analysis of a project's health and status.
   */
  async analyzeProjectHealth(project: Project, deviations: Deviation[], timeEntries: any[], materials: ProjectMaterial[] = []): Promise<any> {
    const prompt = `
      Som en erfaren prosjektleder i den norske byggebransjen, 
      gjennomfør en dyp analyse av følgende prosjekt for å vurdere "helsetilstanden":
      
      PROSJEKT:
      ${JSON.stringify(project)}
      
      AVVIK:
      ${JSON.stringify(deviations)}
      
      TIMEREGISTRERINGER (Siste 30 dager):
      ${JSON.stringify(timeEntries)}
      
      MATERIALER OG DOKUMENTASJON (FDV):
      ${JSON.stringify(materials.map(m => ({ name: m.name, supplier: m.supplier, hasFdv: !!m.fdvUrl })))}
      
      Analyser fremdrift mot budsjett, HMS-risiko basert på avvik, og ressursbruk.
      Vurder også dokumentasjonsnivået basert på materiallisten og om FDV er på plass for de viktigste komponentene.
      Identifiser trender og gi konkrete anbefalinger for å sikre vellykket ferdigstillelse.
      
      Returner et JSON-objekt:
      {
        "overallStatus": "On Track" | "At Risk" | "Critical",
        "summary": "Overordnet oppsummering",
        "metrics": {
          "budgetHealth": "Prosentvis bruk mot fremdrift",
          "documentationHealth": "Vurdering av dokumentasjonsnivå (0-100)",
          "safetyScore": "Sikkerhetsskår (0-100)"
        },
        "identifiedRisks": [
          { "risk": "Beskrivelse", "impact": "Høy/Middels/Lav", "mitigation": "Tiltak" }
        ],
        "recommendations": ["Punkt 1", "Punkt 2"]
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
              overallStatus: { type: Type.STRING, enum: ["On Track", "At Risk", "Critical"] },
              summary: { type: Type.STRING },
              metrics: {
                type: Type.OBJECT,
                properties: {
                  budgetHealth: { type: Type.STRING },
                  documentationHealth: { type: Type.NUMBER },
                  safetyScore: { type: Type.NUMBER }
                },
                required: ["budgetHealth", "documentationHealth", "safetyScore"]
              },
              identifiedRisks: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    risk: { type: Type.STRING },
                    impact: { type: Type.STRING },
                    mitigation: { type: Type.STRING }
                  },
                  required: ["risk", "impact", "mitigation"]
                }
              },
              recommendations: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ["overallStatus", "summary", "metrics", "identifiedRisks", "recommendations"]
          }
        }
      });

      return JSON.parse(response.text || '{}');
    } catch (error) {
      console.error("Project analysis error:", error);
      return null;
    }
  }
};
