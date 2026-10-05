import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/src/lib/server/auth';
import { get1MinAiKey } from '@/src/lib/server/aiEngine';
import { apiError } from '@/src/lib/server/apiError';

/**
 * Normaliserer norsk håndverkstekst for optimal og flytende taleuttale
 */
function prepareTextForNorwegianSpeech(text: string): string {
  let cleaned = text
    .replace(/[*_#`~>]/g, '')
    .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
    .replace(/\n+/g, ' ');

  // Valuta og tall: "kr 33 340" -> "33 340 kroner"
  cleaned = cleaned.replace(/\bkr\.?\s*([\d\s]+)/gi, (_match, p1) => {
    const num = p1.replace(/\s+/g, ' ').trim();
    return `${num} kroner`;
  });

  // Standarder og forskrifter
  cleaned = cleaned.replace(/\bNS\s*8406\b/gi, 'Norsk Standard 84 null 6');
  cleaned = cleaned.replace(/\bNS\s*8405\b/gi, 'Norsk Standard 84 null 5');
  cleaned = cleaned.replace(/\bTEK17\b/gi, 'Tek sytten');
  cleaned = cleaned.replace(/\bTEK10\b/gi, 'Tek ti');
  cleaned = cleaned.replace(/\bSJA\b/g, 'S-J-A');
  cleaned = cleaned.replace(/\bFDV\b/g, 'F-D-V');
  cleaned = cleaned.replace(/\bHMS\b/g, 'H-M-S');
  cleaned = cleaned.replace(/\bRUH\b/g, 'R-U-H');
  cleaned = cleaned.replace(/\bNOBB\b/g, 'Nobb');
  cleaned = cleaned.replace(/\bBVN\b/g, 'Byggebransjens våtromsnorm');
  cleaned = cleaned.replace(/\beks\.\s*mva\b/gi, 'eksklusiv merverdiavgift');
  cleaned = cleaned.replace(/\bink\.\s*mva\b/gi, 'inkludert merverdiavgift');
  cleaned = cleaned.replace(/\bmva\b/gi, 'moms');

  return cleaned.trim().slice(0, 2000);
}

export async function POST(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: 'Uautorisert' }, { status: 401 });
  }

  const oneMinKey = get1MinAiKey();
  const directOpenAiKey = process.env.OPENAI_API_KEY;

  try {
    const body = await req.json();
    const { text, voice = 'onyx', model = 'tts-1' } = body;

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Mangler tekst for opplesning' }, { status: 400 });
    }

    const speechText = prepareTextForNorwegianSpeech(text);

    // 1. Primærmotor: 1min.AI med OpenAI TTS (tts-1) - stemme 'onyx' gir dyp autoritær mesterstemme
    if (oneMinKey) {
      try {
        const payload = {
          type: 'TEXT_TO_SPEECH',
          model: model || 'tts-1',
          conversationId: 'TEXT_TO_SPEECH',
          promptObject: {
            text: speechText,
            voice: voice || 'onyx',
            response_format: 'mp3',
            speed: 1.0
          }
        };

        const res1Min = await fetch('https://api.1min.ai/api/features', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'API-KEY': oneMinKey
          },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(12000)
        });

        if (res1Min.ok) {
          const json1Min = await res1Min.json();
          const audioUrl = 
            json1Min.aiRecord?.temporaryUrl || 
            (json1Min.aiRecord?.aiRecordDetail?.resultObject?.[0] 
              ? (json1Min.aiRecord.aiRecordDetail.resultObject[0].startsWith('http') 
                  ? json1Min.aiRecord.aiRecordDetail.resultObject[0] 
                  : `https://asset.1min.ai/${json1Min.aiRecord.aiRecordDetail.resultObject[0]}`)
              : null);

          if (audioUrl) {
            return NextResponse.json({
              success: true,
              source: '1min.ai',
              model: model || 'tts-1',
              voice: voice || 'onyx',
              audioUrl,
              cleanText: speechText
            });
          }
        } else {
          console.warn('[TTS 1min.ai status]:', res1Min.status);
        }
      } catch (err1Min: any) {
        console.warn('[TTS 1min.ai feilet]:', err1Min.message);
      }
    }

    // 2. Sekundærmotor: Direkte OpenAI API hvis tilgjengelig
    if (directOpenAiKey) {
      try {
        const openAiRes = await fetch('https://api.openai.com/v1/audio/speech', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${directOpenAiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'tts-1',
            voice: voice || 'onyx',
            input: speechText
          }),
          signal: AbortSignal.timeout(10000)
        });

        if (openAiRes.ok) {
          const arrayBuffer = await openAiRes.arrayBuffer();
          const base64Audio = Buffer.from(arrayBuffer).toString('base64');
          return NextResponse.json({
            success: true,
            source: 'openai_direct',
            audioUrl: `data:audio/mp3;base64,${base64Audio}`,
            cleanText: speechText
          });
        }
      } catch (errOpenAi: any) {
        console.warn('[TTS OpenAI direkte feilet]:', errOpenAi.message);
      }
    }

    // 3. Fallback: Returner ferdig preppet norsk tekst slik at nettleseren kan lese feilfritt
    return NextResponse.json({
      success: false,
      fallback: true,
      cleanText: speechText,
      message: 'AI TTS utilgjengelig, faller tilbake til forbedret nettleser-stemme'
    });
  } catch (error: any) {
    // SIKKERHETSFIKS (E-29): logg detaljene server-side, ikke til klienten.
    return apiError(error, 'Kunne ikke generere tale.');
  }
}
