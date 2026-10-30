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
    let idToken = '';
    try {
      const { getAuth } = await import('firebase/auth');
      const user = getAuth().currentUser;
      if (user) {
        idToken = await user.getIdToken();
      }
    } catch {}

    if (!idToken) {
      idToken = 'dev-guest-token';
    }

    const response = await fetch('/api/chat/message', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`
      },
      body: JSON.stringify({ 
        history, 
        newMessage,
        fileContext: fileContext || '',
        fileName: fileName || ''
      }),
    });

    if (response.ok) {
      const data = await response.json();
      if (data && typeof data.text === 'string' && data.text.trim()) {
        return data.text;
      }
    }

    let errMessage = '';
    try {
      const errData = await response.json();
      errMessage = errData?.error || errData?.message || '';
    } catch {
      try {
        errMessage = await response.text();
      } catch {}
    }

    // Hvis /api/chat/message feilet, prøv fallback via /api/gemini/generate
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

      const fallbackResp = await fetch('/api/gemini/generate', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({
          model: 'gemini-3.8-flash',
          contents: formattedContents,
          config: {
            systemInstruction: "Du er BLU-hjelperen, en pedagogisk ekspert og veileder for barnehagelærerstudenter i Norge. Gi faglige, reflekterte og støttende svar.",
            temperature: 0.7
          }
        })
      });

      if (fallbackResp.ok) {
        const fallbackData = await fallbackResp.json();
        if (fallbackData?.text) return fallbackData.text;
      }
    } catch (fbErr) {
      console.warn("Fallback til /api/gemini/generate feilet også:", fbErr);
    }

    if (!errMessage) {
      errMessage = `Klarte ikke å fullføre forespørselen (${response.status}: ${response.statusText || 'Serverfeil'}). Prøv igjen om noen sekunder.`;
    }
    throw new Error(errMessage);
  } catch (error: any) {
    console.error("Feil ved kommunikasjon med BLU-hjelperen chat-tjeneste:", error);
    throw new Error(error?.message || "Klarte ikke å hente svar. Vennligst prøv igjen om et lite øyeblikk.");
  }
};
