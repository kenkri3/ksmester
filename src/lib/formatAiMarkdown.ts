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

  // Rydd opp mellomrom INNE i fet skrift (f.eks. ** tekst ** -> **tekst**).
  //
  // ⚠️ VIKTIG: Ett og ett komplett **...**-par behandles om gangen.
  // En tidligere variant brukte `\*\*([^*]+?)\s+\*\*` og lignende. Den kunne starte på en
  // AVSLUTTENDE ** og slutte på neste ÅPNENDE **, og spiste derfor mellomrommene rundt hver
  // fet-markering: «**Fremdrift:** 15% - **Status:** Aktiv» ble til
  // «**Fremdrift:**15% -**Status:**Aktiv». CommonMark nekter å parse en avsluttende ** som står
  // rett etter skilletegn og rett foran tekst, så stjernene ble vist rått i chatten.
  // `[^*\n]+?` kan ikke krysse en * eller et linjeskift, og trim() rører bare teksten INNE i paret.
  formatted = formatted.replace(/\*\*([^*\n]+?)\*\*/g, (_match: string, inner: string) => `**${inner.trim()}**`);

  // Normaliser uformelle kulepunkter (en-dash –, em-dash —, bullet •, ●) til standard markdown '- '
  formatted = formatted
    .replace(/^[ \t]*[•●–—][ \t]*/gm, '- ')
    .replace(/\n[ \t]*[•●–—][ \t]*/g, '\n- ');

  const lines = formatted.split('\n');
  const resultLines: string[] = [];
  let inOrderedList = false;
  let inList = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (!line) {
      if (resultLines.length > 0 && resultLines[resultLines.length - 1] !== '') {
        resultLines.push('');
      }
      inOrderedList = false;
      inList = false;
      continue;
    }

    // Sjekk om linjen er en markdown-overskrift (#, ##, ###, ####, etc.)
    if (/^#{1,6}\s/.test(line)) {
      if (resultLines.length > 0 && resultLines[resultLines.length - 1] !== '') {
        resultLines.push('');
      }
      resultLines.push(line);
      resultLines.push('');
      inOrderedList = false;
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
      if (resultLines.length > 0 && resultLines[resultLines.length - 1] !== '') {
        resultLines.push('');
      }
      resultLines.push(`### ${icon} ${cleanHeader}`);
      resultLines.push('');
      inOrderedList = false;
      inList = false;
      continue;
    }

    if (isCalloutAction) {
      if (resultLines.length > 0 && resultLines[resultLines.length - 1] !== '') {
        resultLines.push('');
      }
      resultLines.push(`> 💡 **Neste steg:** ${line}`);
      resultLines.push('');
      inOrderedList = false;
      inList = false;
      continue;
    }

    // Hvis linjen er et nummerert element (f.eks. 1. **Lekting**:)
    if (/^\d+[\.\)]\s/.test(line)) {
      if (resultLines.length > 0 && resultLines[resultLines.length - 1] !== '' && !inList && !inOrderedList) {
        resultLines.push('');
      }
      resultLines.push(line);
      inOrderedList = true;
      inList = true;
      continue;
    }

    // Hvis linjen er en kulepunkt-liste (- punkt eller * punkt)
    if (/^[\*\-\+]\s/.test(line)) {
      if (inOrderedList) {
        // Rykk inn 3 mellomrom så markdown forstår at dette er et underpunkt under det nummererte elementet
        resultLines.push(`   ${line}`);
      } else {
        resultLines.push(line);
      }
      inList = true;
      continue;
    }

    // Hvis linjen er et sitat (> sitat)
    if (/^>\s/.test(line)) {
      resultLines.push(line);
      inOrderedList = false;
      inList = false;
      continue;
    }

    // Vanlig avsnittslinje
    resultLines.push(line);
    inOrderedList = false;
    inList = false;

    // Legg til luft dersom linjen ser ut som en avsluttende setning og neste linje ikke er tom
    const nextLine = lines[i + 1]?.trim();
    if (line.endsWith('.') || line.endsWith('!') || line.endsWith(':')) {
      if (nextLine && !nextLine.startsWith('-') && !nextLine.startsWith('*') && !nextLine.startsWith('#') && !/^\d+[\.\)]/.test(nextLine)) {
        resultLines.push('');
      }
    }
  }

  // Rydd opp doble/triple linjeskift
  let finalResult = resultLines.join('\n');
  finalResult = finalResult.replace(/\n{3,}/g, '\n\n');

  return finalResult;
}

/**
 * 🧹 Fjerner rå markdown-stjerner (**), hashtags (####) og koder
 * Gjør teksten ren, ryddig og 100% lesevennlig som ren tekst uten koder.
 */
export function stripMarkdownFormatting(text: string): string {
  if (!text || typeof text !== 'string') return '';
  return text
    // Rydd opp ujevne mellomrom INNE i fet skrift (aldri på tvers av to markeringer)
    .replace(/\*\*([^*\n]+?)\*\*/g, (_match: string, inner: string) => inner.trim())
    // Gjør overskrifter om til vanlige linjer (#### Tittel -> Tittel)
    .replace(/^#{1,6}\s+/gm, '')
    // Fjern doble stjerner for fet skrift (**tekst** -> tekst)
    .replace(/\*\*([^*]+?)\*\*/g, '$1')
    // Fjern enkle stjerner for kursiv (*tekst* -> tekst)
    .replace(/\*([^*]+?)\*/g, '$1')
    // Fjern eventuelle gjenværende stjerner som henger igjen
    .replace(/\*{1,2}/g, '')
    // Fjern understrek for kursiv/fet (_tekst_ -> tekst)
    .replace(/_([^_]+?)_/g, '$1')
    // Fjern sitatmarkører (> Sitat -> Sitat)
    .replace(/^>\s*/gm, '')
    // Fjern kodeblokker og inline backticks (`kode` -> kode)
    .replace(/```[a-z]*\n([\s\S]*?)\n```/g, '$1')
    .replace(/`([^`]+?)`/g, '$1')
    // Normaliser kulepunkter
    .replace(/^[ \t]*[•●–—][ \t]*/gm, '- ')
    .trim();
}

