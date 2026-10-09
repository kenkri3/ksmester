import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/src/lib/server/auth';
import { transcribeAudioEu, getOpperKey, OPPER_STT_MAX_BYTES } from '@/src/lib/server/aiEngine';
import { checkRateLimit } from '@/src/lib/server/rateLimit';
import { apiError } from '@/src/lib/server/apiError';

/**
 * TALE-TIL-TEKST I EU
 *
 * Håndverkere snakker inn i mobilen og får teksten tilbake. All behandling skjer
 * i EU via Opper:
 *
 *   - Nasjonalbibliotekets norsk-trente Whisper (berget/NbAiLab/nb-whisper-large,
 *     Sverige) er primær, med flerspråklig Whisper og Mistral Voxtral som
 *     reserve. Alle har opphold i EU og lagrer ikke innholdet.
 *
 * Dette erstatter nettleserens innebygde tale-til-tekst. `webkitSpeechRecognition`
 * sender lyden til Google utenfor EU, og det er i strid med løftet i
 * personvernerklæringen om at data holders innenfor EØS/Norge. Denne ruten er
 * derfor ikke bare billigere og bedre på norsk fagspråk — den er den eneste
 * varianten som faktisk holder det løftet.
 *
 * Lyden sendes videre som data-URI og lagres ikke hos Opper. `file_id` er
 * bevisst ikke brukt: filer teller mot lagringskvoten og kan ikke brukes i et
 * prosjekt med null-lagring.
 */

/** Litt slakk over Oppers grense, siden base64 vokser med ca. 4/3. */
const MAKS_BASE64_TEGN = Math.ceil((OPPER_STT_MAX_BYTES * 4) / 3) + 1024;

const TILLATTE_TYPER = [
  'audio/webm',
  'audio/ogg',
  'audio/mpeg',
  'audio/mp3',
  'audio/mp4',
  'audio/m4a',
  'audio/x-m4a',
  'audio/wav',
  'audio/wave',
  'audio/x-wav',
  'audio/flac',
  'audio/aac'
];

export async function POST(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: 'Uautorisert' }, { status: 401 });
  }

  if (!getOpperKey()) {
    // Feil lukket: uten EU-nøkkelen finnes ingen lovlig vei for lyden.
    return NextResponse.json(
      {
        error: 'Tale-til-tekst er ikke konfigurert. DEEPSEEK_EU_API (Opper) mangler.',
        code: 'stt_not_configured'
      },
      { status: 503 }
    );
  }

  // Transkribering er den dyreste enkeltoperasjonen i systemet. Grensen er per
  // bruker, ikke per IP, siden lyd bare kommer fra innloggede håndverkere.
  const rl = checkRateLimit(`stt:${user.id}`, { limit: 15, windowMs: 60_000 });
  if (!rl.success) {
    return NextResponse.json(
      { error: 'For mange lydopptak på kort tid. Vent litt og prøv igjen.' },
      { status: 429 }
    );
  }

  try {
    const body = await req.json();
    const { audio, mimeType, language, prompt } = body || {};

    if (!audio || typeof audio !== 'string') {
      return NextResponse.json({ error: 'Mangler lydopptak' }, { status: 400 });
    }

    if (audio.length > MAKS_BASE64_TEGN) {
      return NextResponse.json(
        {
          error:
            'Lydopptaket er for stort. Opptak over ca. 25 MB må deles opp — send én del om gangen.',
          code: 'audio_too_large'
        },
        { status: 413 }
      );
    }

    const type = typeof mimeType === 'string' && mimeType ? mimeType.split(';')[0].trim().toLowerCase() : 'audio/webm';
    if (!TILLATTE_TYPER.includes(type)) {
      return NextResponse.json(
        { error: `Lydformatet støttes ikke: ${type}`, code: 'unsupported_audio_type' },
        { status: 415 }
      );
    }

    const resultat = await transcribeAudioEu(audio, type, {
      // Norsk som standard. En engelsk eller polsk håndverker kan overstyre.
      language: typeof language === 'string' && language.trim() ? language.trim().slice(0, 5) : 'no',
      // Ordlistehint bedrer treffsikkerheten på faguttrykk og egennavn.
      prompt: typeof prompt === 'string' ? prompt.slice(0, 400) : undefined
    });

    return NextResponse.json({
      text: resultat.text,
      model: resultat.model,
      language: resultat.language || null,
      durationSeconds: resultat.durationSeconds ?? null,
      // Sier eksplisitt hvor behandlingen skjedde, så klienten kan vise det.
      processedIn: 'EU',
      storedByProvider: false
    });
  } catch (error: any) {
    return apiError(error, 'Kunne ikke transkribere lydopptaket.');
  }
}
