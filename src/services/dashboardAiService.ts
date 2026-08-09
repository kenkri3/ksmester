import { generateAiContent } from "./aiClient";
import { Project, Deviation, ProjectMaterial, InventoryItem } from "../types";
import { WeatherData } from "./weatherService";

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
    inventory: InventoryItem[] = [],
    lang: string = 'no'
  ): Promise<DashboardInsight[]> {
    if (projects.length === 0) return [];

    const langName = lang === 'en' ? 'English' : lang === 'pl' ? 'Polish' : lang === 'lt' ? 'Lithuanian' : 'Norwegian';

    const weatherContext = weatherData ? `
      VÆRDATA PR PROSJEKT:
      ${JSON.stringify(Object.entries(weatherData).map(([id, w]) => ({ projectId: id, temp: w.temp, condition: w.condition, wind: w.windSpeed })))}
    ` : '';

    const inventoryContext = inventory.length > 0 ? `
      LAGERSTATUS:
      ${JSON.stringify(inventory.map(i => ({ name: i.name, quantity: i.quantity, min: i.minQuantity })))}
    ` : '';

    const prompt = `
      Du er en AI-rådgiver for en byggmester. 
      Analyser følgende prosjektdata, avvik, værforhold og lagerstatus for å gi 4 smarte, handlingsorienterte innsikter.
      Inkluder minst én PREDIKTIV analyse (hva som kan skje fremover basert på trender, vær eller lagerbeholdning).
      
      VIKTIG: Alt av tittel (title), beskrivelse (description) og knappetekst (action) SKAL genereres på språket: ${langName}.

      PROSJEKTER:
      ${JSON.stringify(projects.map(p => ({ id: p.id, name: p.name, stage: p.stage, progress: p.progress, docLevel: p.documentationLevel, location: p.location })))}
      
      AVVIK:
      ${JSON.stringify(deviations.map(d => ({ title: d.title, severity: d.severity, status: d.status, project: d.project })))}
      
      ${weatherContext}
      ${inventoryContext}
      
      OPPGAVE:
      Identifiser kritiske risikoer, trender, eller muligheter for effektivisering. 
      Fokuser på HMS, TEK17-overholdelse, prosjektfremdrift og lagerstyring.
      Bruk værdata for å forutse utfordringer.
      Bruk lagerdata for å varsle om lav beholdning.
      
      Returner et JSON-array med objekter:
      {
        "id": "string",
        "title": "Kort tittel på ${langName}",
        "description": "Innsikt og forklaring på ${langName}",
        "action": "Tekst på handlingsknapp på ${langName}",
        "actionId": "ID for handlingen (velg fra: 'new_project', 'offers', 'contracts', 'hms', 'log_deviation', 'take_photo', 'library', 'time_registration', 'inventory')",
        "type": "warning" | "info" | "success" | "predictive",
        "icon": "alert" | "zap" | "camera" | "check" | "trending" | "cloud"
      }
      Svar KUN med JSON.
    `;

    try {
      const response = await generateAiContent({
        prompt: prompt,
        responseMimeType: "application/json",
        responseSchema: {
          type: "ARRAY",
          items: {
            type: "OBJECT",
            properties: {
              id: { type: "STRING" },
              title: { type: "STRING" },
              description: { type: "STRING" },
              action: { type: "STRING" },
              actionId: { type: "STRING" },
              type: { type: "STRING", enum: ["warning", "info", "success", "predictive"] },
              icon: { type: "STRING", enum: ["alert", "zap", "camera", "check", "trending", "cloud"] }
            },
            required: ["id", "title", "description", "action", "actionId", "type", "icon"]
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
      const response = await generateAiContent({
        prompt: prompt,
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            overallStatus: { type: "STRING", enum: ["On Track", "At Risk", "Critical"] },
            summary: { type: "STRING" },
            metrics: {
              type: "OBJECT",
              properties: {
                budgetHealth: { type: "STRING" },
                documentationHealth: { type: "NUMBER" },
                safetyScore: { type: "NUMBER" }
              },
              required: ["budgetHealth", "documentationHealth", "safetyScore"]
            },
            identifiedRisks: {
              type: "ARRAY",
              items: {
                type: "OBJECT",
                properties: {
                  risk: { type: "STRING" },
                  impact: { type: "STRING" },
                  mitigation: { type: "STRING" }
                },
                required: ["risk", "impact", "mitigation"]
              }
            },
            recommendations: { type: "ARRAY", items: { type: "STRING" } }
          },
          required: ["overallStatus", "summary", "metrics", "identifiedRisks", "recommendations"]
        }
      });

      return JSON.parse(response.text || '{}');
    } catch (error) {
      console.error("Project analysis error:", error);
      return null;
    }
  }
};
