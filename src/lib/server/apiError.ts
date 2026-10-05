import { NextResponse } from 'next/server';
import { randomBytes } from 'crypto';

/**
 * SIKKERHETSFIKS (E-29): felles feilsvar for API-rutene.
 *
 * Bakgrunnen: 50 steder i src/app/api returnerte rå `error.message` til
 * klienten. Det lekker interne detaljer — databasemeldinger, leverandørfeil,
 * filstier og stacknære strenger — til den som kaller, og det gir en angriper
 * gratis informasjon om hvordan systemet er bygget.
 *
 * Riktig mønster er: logg hele feilen server-side, og returner en fast,
 * generisk melding pluss en korrelasjons-ID. Da kan en utvikler finne den
 * eksakte feilen i loggen ut fra ID-en brukeren oppgir, uten at noe internt
 * forlater serveren.
 *
 * Bruk:
 *   } catch (err) {
 *     return apiError(err, 'Kunne ikke lagre element.');
 *   }
 */
export function apiError(
  err: unknown,
  publicMessage: string,
  status = 500
): NextResponse {
  const correlationId = randomBytes(4).toString('hex');
  const detail = err instanceof Error ? err.message : String(err);
  const stack = err instanceof Error ? err.stack : undefined;

  // Full detalj server-side, med korrelasjons-ID slik at loggen kan kobles til
  // det brukeren så.
  console.error(`[API ${correlationId}] ${publicMessage} :: ${detail}`);
  if (stack) console.error(`[API ${correlationId}] stack:`, stack);

  return NextResponse.json(
    {
      error: publicMessage,
      // Bevisst ingen `message`, `detail` eller `stack` her.
      correlationId,
    },
    { status }
  );
}
