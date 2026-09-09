import { NextRequest, NextResponse } from 'next/server';
import { generateSJAAction } from '@/src/app/actions/aiActions';
import { evaluatePreCloseWall } from '@/src/lib/server/crossTradeEngine';
import { createAutonomousChangeOrder } from '@/src/lib/server/changeOrderAgent';
import { saveCollectionItem, getCollectionItems } from '@/src/lib/server/db';
import { GoogleGenAI } from '@google/genai';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { 
      action, 
      text, 
      projectId, 
      projectName, 
      roomOrZone, 
      trade = 'general', 
      authorName = 'Håndverker', 
      language = 'no' 
    } = body;

    if (!text && action !== 'pre_close_check') {
      return NextResponse.json({ error: 'Mangler tekstbeskrivelse' }, { status: 400 });
    }

    // 1. Tale-til-Endringsordre
    if (action === 'change_order') {
      const result = await createAutonomousChangeOrder({
        projectId: projectId || 'default_proj',
        projectName: projectName || 'Byggeprosjekt',
        spokenText: text,
        authorId: 'agent_user',
        authorName: authorName
      });

      let reply = `Mottatt! Endringsmelding #${result.changeOrder.changeNumber} er opprettet på kr ${result.changeOrder.totalAmount?.toLocaleString('no-NO')} ink. mva (${result.changeOrder.impactDays} dager fristforlengelse). Godkjenningslenke er klargjort for kunden.`;

      if (language && language !== 'no') {
        reply = await translateAgentReply(reply, language);
      }

      return NextResponse.json({
        success: true,
        action: 'change_order',
        reply,
        data: result
      });
    }

    // 2. Tverrfaglig Lukkesperre-sjekk (Pre-close wall / room)
    if (action === 'pre_close_check') {
      const room = roomOrZone || 'Aktuelt rom/sone';
      
      // Look up existing checklist & test items in DB for this project
      const allChecklists = await getCollectionItems('checklists');
      const projectChecks = allChecklists.filter((c: any) => c.projectId === projectId);

      const hasPlumberSignoff = projectChecks.some((c: any) => 
        (c.trade === 'plumber' || (c.title && c.title.toLowerCase().includes('rør'))) && 
        c.status === 'completed'
      );

      const hasElectricianPhotos = projectChecks.some((c: any) => 
        (c.trade === 'electrician' || (c.title && c.title.toLowerCase().includes('elektro'))) &&
        c.status === 'completed'
      );

      const hasVaporBarrierChecked = projectChecks.some((c: any) => 
        c.title && c.title.toLowerCase().includes('dampsperre') && c.status === 'completed'
      );

      const evaluation = evaluatePreCloseWall({
        roomName: room,
        hasPlumberSignoff,
        hasElectricianPhotos,
        hasVaporBarrierChecked,
        hasInsulationChecked: true
      });

      let reply = evaluation.canClose
        ? `GRØNT LYS for ${room}! Alle tverrfaglige forutsetninger (rør-i-rør trykktest, el-skjultanlegg og dampsperre) er verifisert. Du kan trygt plate/lukke veggen.`
        : `RØDT LYS / STOPP for ${room}! Du kan ikke lukke veggen ennå: ${evaluation.blockers.join(' ')}`;

      if (language && language !== 'no') {
        reply = await translateAgentReply(reply, language);
      }

      return NextResponse.json({
        success: true,
        action: 'pre_close_check',
        reply,
        evaluation
      });
    }

    // 3. Sikker Jobb Analyse (SJA)
    if (action === 'sja') {
      const sjaResult = await generateSJAAction(text);
      let reply = `SJA opprettet for "${sjaResult.data.title}". Hovedrisikoer og vernetiltak er registrert i henhold til ${sjaResult.data.tek17Reference}.`;

      if (language && language !== 'no') {
        reply = await translateAgentReply(reply, language);
      }

      return NextResponse.json({
        success: true,
        action: 'sja',
        reply,
        sja: sjaResult.data
      });
    }

    // 4. Byggedagbok og timeføring
    if (action === 'daily_log') {
      const logEntry = {
        projectId: projectId || 'default_proj',
        authorName,
        note: text,
        trade,
        createdAt: new Date().toISOString(),
        verified: true
      };

      const saved = await saveCollectionItem('daily_logs', logEntry);
      let reply = `Byggedagbok oppdatert! Notat arkivert på prosjektet for ${trade}.`;

      if (language && language !== 'no') {
        reply = await translateAgentReply(reply, language);
      }

      return NextResponse.json({
        success: true,
        action: 'daily_log',
        reply,
        entry: saved
      });
    }

    return NextResponse.json({ error: 'Ukjent handling' }, { status: 400 });
  } catch (error: any) {
    console.error('Agent dispatch error:', error);
    return NextResponse.json({ error: error.message || 'Internt agentfeil' }, { status: 500 });
  }
}

async function translateAgentReply(reply: string, targetLanguage: string): Promise<string> {
  const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!geminiKey) return reply;

  try {
    const ai = new GoogleGenAI({ apiKey: geminiKey });
    const res = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: `Oversett følgende melding til språkkode '${targetLanguage}' slik at en utenlandsk håndverker forstår det presist: "${reply}"`
    });
    return res.text?.trim() || reply;
  } catch {
    return reply;
  }
}
