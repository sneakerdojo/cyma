import { useCallback, useState } from 'react';

const SESSION_KEY = 'octio-chat-session';
const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

interface StoredSession {
  sessionId: string;
  createdAt: number;
}

export interface ChatSessionResult {
  sessionId: string;
  clearSession: () => void;
}

/**
 * Provides a stable session UUID that persists across page reloads via
 * localStorage. Sessions expire after 24 hours; a new one is created on expiry.
 *
 * Single Responsibility: only manages session identity — nothing else.
 */
export function useChatSession(): ChatSessionResult {
  const [sessionId] = useState<string>(() => {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (raw) {
        const stored: StoredSession = JSON.parse(raw);
        if (Date.now() - stored.createdAt < SESSION_TTL_MS) {
          return stored.sessionId;
        }
      }
    } catch {
      // Corrupted localStorage entry — fall through to create a fresh session.
    }
    const newSession: StoredSession = {
      sessionId: crypto.randomUUID(),
      createdAt: Date.now(),
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(newSession));
    return newSession.sessionId;
  });

  const clearSession = useCallback(() => {
    localStorage.removeItem(SESSION_KEY);
  }, []);

  return { sessionId, clearSession };
}
