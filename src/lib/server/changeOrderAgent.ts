/**
 * Autonomous Change Order & Notice Agent (Tale-til-Endringsordre & Varseplikt)
 * 
 * Automatically parses voice notes / chat messages from tradesmen on site,
 * calculates cost and schedule impact, applies Norwegian contract law
 * (NS 8406 / NS 8405 / Håndverkertjenesteloven / Bustadoppføringslova),
 * and generates a 1-click approval link for the building owner / client.
 */

import { GoogleGenAI } from '@google/genai';
import { saveCollectionItem, getCollectionItems } from './db';

export interface ParsedVoiceChangeOrder {
  title: string;
  description: string;
  cause: 'kundetillegg' | 'uforutsett_forhold' | 'prosjektering' | 'myndighetskrav' | 'annet';
  amountExVat: number;
  vatAmount: number;
  totalAmount: number;
  impactDays: number;
  legalHjemmel: string;
  smsMessageToClient: string;
}

const DEFAULT_HOURLY_RATES: Record<string, number> = {
  carpenter: 890,
  plumber: 980,
  electrician: 950,
  painter: 790,
  mason: 890,
  general: 850
};

export async function parseVoiceToChangeOrder(
  spokenText: string,
  projectContext?: { projectName?: string; clientName?: string; contractType?: 'NS8406' | 'HVT' | 'BOLIG' }
): Promise<ParsedVoiceChangeOrder> {
  const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

  if (geminiKey) {
    try {
      const ai = new GoogleGenAI({ apiKey: geminiKey });
      const prompt = `Du er en norsk juridisk rådgiver og byggelederassistent.
Analyser følgende muntlige beskjed fra en håndverker på byggeplass og trekk ut en formell endringsmelding/tilleggsordre:
"${spokenText}"

Prosjektkontekst:
Prosjekt: ${projectContext?.projectName || 'Byggeprosjekt'}
Kunde: ${projectContext?.clientName || 'Byggherre'}
Kontraktsformål: ${projectContext?.contractType || 'NS8406'}

Returner KUN et gyldig JSON-objekt med følgende felter:
- title: Kort, presis tittel på endringen (maks 8 ord)
- description: Fullstendig profesjonell beskrivelse av hva som skal utføres, materialer og forutsetninger.
- cause: En av: 'kundetillegg' | 'uforutsett_forhold' | 'prosjektering' | 'myndighetskrav' | 'annet'
- amountExVat: Beregnet eller oppgitt beløp eksklusive mva i kroner (heltall). Hvis timer er oppgitt, regn ca 890 kr/time.
- impactDays: Antall dager fristforlengelse entreprenøren krever for å utføre endringen (heltall, 0 hvis ikke nevnt).
- legalHjemmel: Juridisk henvisning (f.eks. "NS 8406 punkt 19.2 (Varsel om vederlagsjustering og fristforlengelse)" eller "Bustadoppføringslova § 9 (Tilleggsarbeid)").
- smsMessageToClient: En kort, høflig SMS-tekst til kunden med forklaring av tillegget og varsel om godkjenning.`;

      const aiResponse = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json'
        }
      });

      const text = aiResponse.text || '{}';
      const parsed = JSON.parse(text);

      const amountExVat = Number(parsed.amountExVat) || 3500;
      const vatAmount = Math.round(amountExVat * 0.25);
      const totalAmount = amountExVat + vatAmount;

      return {
        title: parsed.title || 'Tilleggsarbeid iht. avtale',
        description: parsed.description || spokenText,
        cause: parsed.cause || 'kundetillegg',
        amountExVat,
        vatAmount,
        totalAmount,
        impactDays: Number(parsed.impactDays) || 0,
        legalHjemmel: parsed.legalHjemmel || 'NS 8406 pkt. 19.2 / Håndverkertjenesteloven § 9',
        smsMessageToClient: parsed.smsMessageToClient || `Hei! Vi har registrert et tilleggsønske: ${parsed.title}. Se spesifikasjon og godkjenn i VikingMester.`
      };
    } catch (err) {
      console.warn('Gemini change order parser fallback to heuristic:', err);
    }
  }

  // Fallback: Deterministic / Heuristic parser (0 tokens)
  const lower = spokenText.toLowerCase();
  let cause: ParsedVoiceChangeOrder['cause'] = 'kundetillegg';
  if (lower.includes('uforutsett') || lower.includes('skade') || lower.includes('råte')) {
    cause = 'uforutsett_forhold';
  } else if (lower.includes('arkitekt') || lower.includes('tegning')) {
    cause = 'prosjektering';
  } else if (lower.includes('kommune') || lower.includes('brann') || lower.includes('tilsyn')) {
    cause = 'myndighetskrav';
  }

  // Simple number extraction heuristic
  const hoursMatch = spokenText.match(/(\d+)\s*(?:timer|t)/i);
  const costMatch = spokenText.match(/(\d[\d\s\.]*)\s*(?:kr|kroner)/i);
  
  let hours = hoursMatch ? parseInt(hoursMatch[1], 10) : 3;
  let rawCost = costMatch ? parseInt(costMatch[1].replace(/[\s\.]/g, ''), 10) : 0;
  let amountExVat = rawCost > 0 ? rawCost : hours * DEFAULT_HOURLY_RATES.carpenter;

  const daysMatch = spokenText.match(/(\d+)\s*(?:dager|dag)/i);
  const impactDays = daysMatch ? parseInt(daysMatch[1], 10) : 1;

  const vatAmount = Math.round(amountExVat * 0.25);
  const totalAmount = amountExVat + vatAmount;

  return {
    title: 'Tilleggsordre: ' + spokenText.slice(0, 45) + '...',
    description: spokenText,
    cause,
    amountExVat,
    vatAmount,
    totalAmount,
    impactDays,
    legalHjemmel: 'NS 8406 pkt. 19.2 (Krav om justering av vederlag og fristforlengelse)',
    smsMessageToClient: `Hei! Vi har registrert en endringsmelding på kr ${totalAmount.toLocaleString('no-NO')} inkl. mva. Vennligst godkjenn før arbeid igangsettes.`
  };
}

/**
 * Creates and stores an active Change Order on the project
 */
export async function createAutonomousChangeOrder(params: {
  projectId: string;
  projectName: string;
  spokenText: string;
  authorId: string;
  authorName: string;
  clientEmail?: string;
  clientName?: string;
}) {
  const parsed = await parseVoiceToChangeOrder(params.spokenText, {
    projectName: params.projectName,
    clientName: params.clientName
  });

  const existing = await getCollectionItems('change_orders');
  const projectOrders = existing.filter((o: any) => o.projectId === params.projectId);
  const changeNumber = projectOrders.length + 1;

  const token = 'co_' + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
  const shareUrl = `https://VikingMester.no/?view=public-change-order&token=${token}`;

  const changeOrder = {
    projectId: params.projectId,
    changeNumber,
    title: parsed.title,
    description: parsed.description,
    cause: parsed.cause,
    amountExVat: parsed.amountExVat,
    vatAmount: parsed.vatAmount,
    totalAmount: parsed.totalAmount,
    impactDays: parsed.impactDays,
    legalHjemmel: parsed.legalHjemmel,
    status: 'pending_customer',
    token,
    shareUrl,
    clientName: params.clientName || 'Kunde',
    clientEmail: params.clientEmail || '',
    authorId: params.authorId,
    authorName: params.authorName,
    createdAt: new Date().toISOString()
  };

  const saved = await saveCollectionItem('change_orders', changeOrder);

  return {
    success: true,
    changeOrder: saved,
    smsMessageToClient: parsed.smsMessageToClient,
    shareUrl
  };
}
