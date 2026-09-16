import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Rens rå tekst for markdown-formatering (stjerner, hashes, backticks, emojis)
 * slik at det blir ren, profesjonell tekst i rene input/textarea-felter.
 */
export function sanitizePlainText(text: string): string {
  if (!text) return '';
  return text
    // Fjern markdown bold/kursiv
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/__(.*?)__/g, '$1')
    .replace(/_(.*?)_/g, '$1')
    // Fjern markdown-overskrifter (#, ##, ###)
    .replace(/^#{1,6}\s+/gm, '')
    // Fjern inline backticks
    .replace(/`([^`]+)`/g, '$1')
    // Fjern chat-assistent hilsener/emojis i starten
    .replace(/^[👷‍♂️👨‍🔧🛠️📝📄🛡️⚠️🧪💡✅⏳🔴🟠🔵✨]+\s*/u, '')
    // Fjern typiske samtaleåpninger hvis de har sneket seg inn
    .replace(/^(?:Faglig rådgivning for [^:\n]+:\s*|Jeg har analysert henvendelsen[^:\n]+:\s*)/i, '')
    // Standardiser kulepunkter
    .replace(/^\s*[\*\-]\s+/gm, '• ')
    .trim();
}
