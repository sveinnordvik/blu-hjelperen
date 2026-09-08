import { useState, useCallback, useEffect } from 'react';
import { sendChatMessage } from '../../../services/gemini';
import { saveMessage, getChatHistory, ChatMessageData } from '../services/chatService';

export interface UseChatMessage {
  id: string;
  role: 'user' | 'model' | 'assistant';
  text: string;
  timestamp: string;
}

export const useChat = (userId?: string, chatId?: string) => {
  const [messages, setMessages] = useState<UseChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Hent eksisterende chat-historikk fra Firestore når komponenten lastes inn
  useEffect(() => {
    if (!userId || !chatId) return;
    
    let isMounted = true;
    const loadHistory = async () => {
      try {
        const history = await getChatHistory(userId, chatId);
        if (isMounted && history && history.length > 0) {
          setMessages(history.map(item => ({
            id: item.id || Date.now().toString(),
            role: item.role || 'user',
            text: item.text || '',
            timestamp: item.timestamp || item.createdAt || new Date().toISOString()
          })));
        }
      } catch (err) {
        console.error('Feil ved lasting av historikk:', err);
      }
    };
    
    loadHistory();
    return () => { isMounted = false; };
  }, [userId, chatId]);

  const sendMessage = useCallback(async (text: string, fileContext?: string, fileName?: string) => {
    if (!text.trim()) return;

    // 1. Legg til brukerens melding i UI umiddelbart
    const userMessage: UseChatMessage = { 
      id: Date.now().toString(), 
      role: 'user', 
      text: text, 
      timestamp: new Date().toISOString() 
    };
    
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);
    setError(null);

    // Lagre brukerens melding til Firestore i bakgrunnen
    if (userId && chatId) {
      saveMessage(userId, chatId, userMessage).catch(console.error);
    }

    try {
      // Gemini API format for historikk: { role, parts: [{ text }] }
      const formattedHistory = messages.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.text }]
      }));

      // Hent svar fra backend API-tjenesten med eventuell dokumentkontekst
      const aiResponseText = await sendChatMessage(formattedHistory, text, fileContext, fileName);

      const aiMessage: UseChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: aiResponseText,
        timestamp: new Date().toISOString()
      };

      setMessages((prev) => [...prev, aiMessage]);

      // Lagre KI-svaret til Firestore i bakgrunnen
      if (userId && chatId) {
        saveMessage(userId, chatId, aiMessage).catch(console.error);
      }
    } catch (err: any) {
      console.error('Feil i useChat:', err);
      setError(err?.message || 'Beklager, jeg klarte ikke å koble til serveren. Prøv igjen senere.');
    } finally {
      setIsLoading(false);
    }
  }, [messages, userId, chatId]);

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    setMessages
  };
};
