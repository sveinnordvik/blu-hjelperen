/**
 * Sender en melding til vår egen Express-server (/api/chat/message), 
 * som igjen kommuniserer med Gemini på en sikker måte med backend API-nøkkel.
 * 
 * @param history - Tidligere chat-historikk
 * @param newMessage - Den nye meldingen fra brukeren
 * @returns - Tekstsvar fra BLU-hjelperen
 */
export const sendChatMessage = async (
  history: Array<{ role: string; parts?: Array<{ text: string }> | string; text?: string; content?: string }>, 
  newMessage: string,
  fileContext?: string,
  fileName?: string
): Promise<string> => {
  try {
    const response = await fetch('/api/chat/message', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        history, 
        newMessage,
        fileContext: fileContext || '',
        fileName: fileName || ''
      }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData?.error || `Serverfeil: ${response.statusText}`);
    }

    const data = await response.json();
    return data.text;
  } catch (error: any) {
    console.error("Feil ved kommunikasjon med BLU-hjelperen chat-tjeneste:", error);
    throw new Error(error?.message || "Klarte ikke å hente svar. Sjekk internettforbindelsen din.");
  }
};
