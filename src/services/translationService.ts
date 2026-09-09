import { generateAiContent } from "./aiClient";

export interface TranslationResult {
  translatedText: string;
  detectedLanguage: string;
  norwegianVersion: string;
}

export const translationService = {
  /**
   * Translates any input text to a target language, 
   * and ALWAYS generates a Norwegian version for documentation.
   */
  async translateAndNormalize(text: string, targetLang: string): Promise<TranslationResult> {
    const prompt = `
      You are a specialized construction industry translator for VikingMester.
      Input text: "${text}"
      
      Tasks:
      1. Detect the input language.
      2. Translate the text to ${targetLang} for UI display.
      3. Translate the text to Norwegian (Bokmål) for official documentation, using professional construction terminology (TEK17/SAK10 style).
      
      Return ONLY a JSON object with this structure:
      {
        "translatedText": "text in ${targetLang}",
        "detectedLanguage": "language name",
        "norwegianVersion": "professional Norwegian construction text"
      }
    `;

    try {
      const response = await generateAiContent({
        prompt: prompt,
        responseMimeType: "application/json"
      });

      const result = JSON.parse(response.text || '{}');
      return {
        translatedText: result.translatedText || text,
        detectedLanguage: result.detectedLanguage || 'Unknown',
        norwegianVersion: result.norwegianVersion || text
      };
    } catch (error) {
      console.error("Translation error:", error);
      return {
        translatedText: text,
        detectedLanguage: 'Error',
        norwegianVersion: text
      };
    }
  }
};
