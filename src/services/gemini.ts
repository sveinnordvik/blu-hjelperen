import { callGoogleAIProxy } from './geminiService';

/**
 * Sender en melding direkte til Google Gemini via @google/genai i nettleseren.
 * Ingen lokal server eller /api/gemini-endepunkter benyttes, noe som sikrer
 * at appen fungerer perfekt på statisk hosting som Firebase Hosting.
 * 
 * @param history - Tidligere chat-historikk
 * @param newMessage - Den nye meldingen fra brukeren
 * @param fileContext - Eventuell opplastet dokumentkontekst
 * @param fileName - Navn på opplastet fil
 * @returns - Tekstsvar fra BLU-hjelperen
 */
export const sendChatMessage = async (
  history: Array<{ role: string; parts?: Array<{ text: string }> | string; text?: string; content?: string }>, 
  newMessage: string,
  fileContext?: string,
  fileName?: string
): Promise<string> => {
  try {
    const formattedContents = (history || []).map(h => ({
      role: h.role === 'model' || h.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: h.text || h.content || (Array.isArray(h.parts) ? (h.parts[0] as any)?.text : '') || '' }]
    })).filter(c => c.parts[0].text);

    let userPrompt = newMessage;
    if (fileContext) {
      userPrompt = `Her er innholdet i et opplastet dokument (${fileName || 'Dokument'}):\n"""\n${fileContext}\n"""\n\nSpørsmål: ${newMessage}`;
    }
    formattedContents.push({ role: 'user', parts: [{ text: userPrompt }] });

    const modelName = import.meta.env.VITE_GEMINI_MODEL || 'gemini-3.8-flash';
    const result = await callGoogleAIProxy({
      model: modelName,
      contents: formattedContents,
      config: {
        systemInstruction: "Du er BLU-hjelperen, en pedagogisk ekspert og veileder for barnehagelærerstudenter i Norge. Gi faglige, reflekterte og støttende svar med god forankring i Rammeplanen for barnehagen.",
        temperature: 0.7
      }
    });

    if (result && typeof result.text === 'string' && result.text.trim()) {
      return result.text;
    }

    throw new Error("Mottok tomt svar fra veilederen. Prøv igjen om et øyeblikk.");
  } catch (error: any) {
    console.error("Feil ved kommunikasjon med BLU-hjelperen:", error);
    throw new Error(error?.message || "Klarte ikke å hente svar. Vennligst prøv igjen om et lite øyeblikk.");
  }
};
