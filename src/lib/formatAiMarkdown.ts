/**
 * 🎨 VIKINGMESTER AI MARKDOWN FORMATTER & ENHANCER
 * 
 * Forvandler ustrukturerte eller sammenklemte AI-svar til luftige,
 * oversiktlige og lettleste faglige meldinger tilpasset byggeplass og mobil/desktop.
 */

export function formatAiMarkdown(text: string): string {
  if (!text || typeof text !== 'string') return '';

  let formatted = text.trim();
  // Normaliser linjeskift
  formatted = formatted.replace(/\r\n/g, '\n');

  const lines = formatted.split('\n');
  const resultLines: string[] = [];
  let inList = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (!line) {
      resultLines.push('');
      inList = false;
      continue;
    }

    // Sjekk om linjen er en overskrift eller seksjonskrav (slutter på : eller lignende)
    const isSectionHeader = 
      /^(Krav|Kontrollpunkter|Kontroll|Viktig|Forhåndsregler|Fremgangsmåte|Materialer|Sjekkliste|Merknad|Konsekvens|Husk|Hjemmel|Lovkrav|Faglig vurdering|Preaksepterte ytelser|Ytelse|Anbefaling|Vurdering)/i.test(line) && 
      (line.endsWith(':') || line.endsWith(':-') || line.endsWith(';'));

    // Sjekk om linjen er en handlingsorientert oppfølging mot slutten
    const isCalloutAction = 
      /^(Vil du at jeg|Ønsker du at|Skal jeg|Vil du ha|Husk at|Tips:|Anbefaling:)/i.test(line) && 
      (line.endsWith('?') || line.endsWith('.'));

    if (isSectionHeader) {
      let icon = '📌';
      if (/krav|forskrift|tek17|lov|hjemmel/i.test(line)) icon = '🛡️';
      else if (/kontroll|sjekk|punkter/i.test(line)) icon = '📋';
      else if (/klemring|rør|vvs|verktøy|materiale/i.test(line)) icon = '🔧';
      else if (/viktig|advarsel|obs|fare/i.test(line)) icon = '⚠️';
      else if (/anbefaling|tips/i.test(line)) icon = '💡';

      const cleanHeader = line.replace(/^#+\s*/, '').replace(/[:;-]+$/, '').trim();
      resultLines.push('');
      resultLines.push(`### ${icon} ${cleanHeader}`);
      resultLines.push('');
      inList = true;
      continue;
    }

    if (isCalloutAction) {
      resultLines.push('');
      resultLines.push(`> 💡 **Neste steg:** ${line}`);
      resultLines.push('');
      inList = false;
      continue;
    }

    // Hvis linjen allerede har markdown-formatering (punkt, nummer, overskrift, sitat)
    if (/^(\*|-|\+|\d+\.|\d+\)|\#{1,6}|>)/.test(line)) {
      resultLines.push(line);
      inList = true;
      continue;
    }

    // Hvis vi er inne i en liste eller under en overskrift, gjør linjen om til en kulepunkt
    if (inList && line.length > 5 && !line.endsWith(':')) {
      resultLines.push(`- ${line}`);
      continue;
    }

    // Vanlig avsnittslinje
    resultLines.push(line);
    // Legg til luft dersom linjen ser ut som en avsluttende setning og neste linje ikke er tom
    const nextLine = lines[i + 1]?.trim();
    if (line.endsWith('.') || line.endsWith('!') || line.endsWith(':')) {
      if (nextLine && !nextLine.startsWith('-') && !nextLine.startsWith('*')) {
        resultLines.push('');
      }
    }
  }

  // Rydd opp doble/triple linjeskift
  let finalResult = resultLines.join('\n');
  finalResult = finalResult.replace(/\n{3,}/g, '\n\n');

  return finalResult;
}
