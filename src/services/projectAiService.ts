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
    deviations: Deviation[] = [],
    inspections: SafetyInspection[] = [],
    crew: CrewMember[] = [],
    materials: ProjectMaterial[] = []
  ): Promise<ProjectHealthReport> => {
    const safeDeviations = Array.isArray(deviations) ? deviations : [];
    const safeInspections = Array.isArray(inspections) ? inspections : [];
    const safeCrew = Array.isArray(crew) ? crew : [];
    const safeMaterials = Array.isArray(materials) ? materials : [];

    const findingsText = safeInspections
      .flatMap(i => Array.isArray(i?.findings) ? i.findings.map(f => f?.description || '').filter(Boolean) : [])
      .join('; ');

    const prompt = `
      Du er en erfaren prosjektleder og rådgiver i den norske bygg- og anleggsbransjen.
      Din oppgave er å analysere helsen til et byggeprosjekt basert på dataene nedenfor og gi en detaljert rapport med anbefalinger.
      
      PROSJEKTDATA:
      Navn: ${project?.name || 'Uten navn'}
      Beskrivelse: ${project?.description || 'Ingen beskrivelse'}
      Fremdrift: ${project?.progress ?? 0}%
      Status: ${project?.status || 'active'}
      Budsjett: ${project?.budget || 'Ikke oppgitt'}
      Brukt: ${project?.spent || 'Ikke oppgitt'}
      Startdato: ${project?.startDate || 'Ikke oppgitt'}
      Sluttdato: ${project?.endDate || 'Ikke oppgitt'}
      
      MATERIELL OG DOKUMENTASJON (FDV):
      Totalt antall materialer: ${safeMaterials.length}
      Materialer med FDV klar: ${safeMaterials.filter(m => m?.fdvUrl).length}
      Mangler FDV: ${safeMaterials.filter(m => !m?.fdvUrl).length}
      Materialer: ${safeMaterials.map(m => `${m?.name || 'Vare'} (${m?.supplier || 'Ukjent leverandør'})`).join(', ')}
      
      AVVIK:
      Totalt antall avvik: ${safeDeviations.length}
      Alvorlighetsgrader: ${safeDeviations.map(d => d?.severity || 'normal').join(', ')}
      Status på avvik: ${safeDeviations.map(d => d?.status || 'åpen').join(', ')}
      
      HMS-DATA:
      Antall vernerunder: ${safeInspections.length}
      Siste funn fra vernerunder: ${findingsText || 'Ingen avvikende funn'}
      Antall personell på plass: ${safeCrew.length}
      
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
        "recommendations": ["liste over konkrete anbefalinger for prosjektlederen som rene tekststrenger"],
        "nextSteps": ["liste over de neste 3-5 viktigste stegene som rene tekststrenger"]
      }
      
      Svar KUN med JSON-objektet. Bruk norsk språk i alle tekster.
    `;

    try {
      const response = await generateAiContent({
        prompt,
        operation: 'project_health_analysis',
        model: 'gemini-2.5-flash',
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

      let raw = (response.text || '{}').trim();
      if (raw.startsWith('```')) {
        raw = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
      }
      const firstBrace = raw.indexOf('{');
      const lastBrace = raw.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1) {
        raw = raw.substring(firstBrace, lastBrace + 1);
      }

      let parsed: any = {};
      try {
        parsed = JSON.parse(raw);
      } catch {
        try {
          parsed = JSON.parse(JSON.parse(raw));
        } catch {
          parsed = {};
        }
      }

      // Normalisering for å garantere at React 19 aldri krasjer på uventede typer/objekter
      const rawScore = Number(parsed.score);
      const score = (!isNaN(rawScore) && rawScore >= 0 && rawScore <= 100) ? Math.round(rawScore) : 75;

      let status: ProjectHealthReport['status'] = 'good';
      const parsedStatus = String(parsed.status || '').toLowerCase().trim();
      if (['excellent', 'good', 'fair', 'poor', 'critical'].includes(parsedStatus)) {
        status = parsedStatus as any;
      } else if (score >= 85) {
        status = 'good';
      } else if (score >= 60) {
        status = 'fair';
      } else {
        status = 'poor';
      }

      const normalizeMetric = (m: any, defaultStatus: string, defaultDetail: string) => {
        if (!m) return { status: defaultStatus, detail: defaultDetail };
        if (typeof m === 'string') return { status: m, detail: defaultDetail };
        return {
          status: typeof m.status === 'string' ? m.status : (typeof m === 'object' ? String(m.title || defaultStatus) : defaultStatus),
          detail: typeof m.detail === 'string' ? m.detail : (typeof m.description === 'string' ? m.description : defaultDetail)
        };
      };

      const metrics = {
        progress: normalizeMetric(parsed.metrics?.progress, 'I rute', `Fremdrift er estimert til ${project?.progress ?? 0}%.`),
        budget: normalizeMetric(parsed.metrics?.budget, 'Under kontroll', `Forbruk registrert på prosjektet.`),
        hms: normalizeMetric(parsed.metrics?.hms, safeInspections.length > 0 ? 'Gjennomført' : 'Avventer', `${safeInspections.length} vernerunder gjennomført.`),
        quality: normalizeMetric(parsed.metrics?.quality, safeDeviations.length === 0 ? 'God' : 'Avvik under oppfølging', `${safeDeviations.length} avvik loggført.`)
      };

      const risks = Array.isArray(parsed.risks)
        ? parsed.risks.map((r: any) => {
            if (typeof r === 'string') return { title: r, severity: 'medium' as const, description: r };
            return {
              title: typeof r?.title === 'string' ? r.title : (typeof r?.risk === 'string' ? r.risk : 'Vurdert risikoforhold'),
              severity: (['low', 'medium', 'high'].includes(String(r?.severity || '').toLowerCase()) ? r.severity.toLowerCase() : 'medium') as 'low' | 'medium' | 'high',
              description: typeof r?.description === 'string' ? r.description : (typeof r?.mitigation === 'string' ? r.mitigation : '')
            };
          })
        : [
            {
              title: 'Standard risikovurdering',
              severity: 'low' as const,
              description: 'Fortsett løpende kontroll av sikkerhet og fremdrift iht. HMS-plan.'
            }
          ];

      const recommendations = Array.isArray(parsed.recommendations) && parsed.recommendations.length > 0
        ? parsed.recommendations
            .map((rec: any) => typeof rec === 'string' ? rec : (rec?.text || rec?.title || rec?.recommendation || String(rec)))
            .filter(Boolean)
        : [
            'Følg opp åpne avvik og sikre at tiltak er iverksatt.',
            'Gjennomfør regelmessig vernerunde og loggfør i byggedagboken.',
            'Innhent FDV-dokumentasjon for alle nyankomne byggevarer.'
          ];

      const nextSteps = Array.isArray(parsed.nextSteps) && parsed.nextSteps.length > 0
        ? parsed.nextSteps
            .map((step: any) => typeof step === 'string' ? step : (step?.step || step?.action || step?.text || String(step)))
            .filter(Boolean)
        : [
            'Verifiser dagens bemanning og sjekklister',
            'Sjekk materialleveranser mot FDV-krav',
            'Avslutt utbedrede avvik'
          ];

      return {
        score,
        status,
        summary: typeof parsed.summary === 'string' && parsed.summary.trim().length > 0
          ? parsed.summary
          : `Prosjekthelse for ${project?.name || 'prosjektet'} er analysert til ${score}/100. Fremdriften er ${project?.progress ?? 0}% og det er registrert ${safeDeviations.length} avvik.`,
        metrics,
        risks,
        recommendations,
        nextSteps
      };
    } catch (error) {
      console.error("Error generating project health report:", error);
      throw error;
    }
  }
};
