import { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { Send, AlertCircle, RefreshCw, Loader2 } from 'lucide-react';
import type { ContactInfo } from '../octo/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface WizardContext {
  selectedService: string | null;
  budget: string | null;
  requirements: string;
  contact: ContactInfo;
  meetLink?: string;
  calendarLink?: string;
}

export interface FreeChatWidgetProps {
  sessionId: string;
  contactId?: string;
  wizardContext: WizardContext;
}

// ---------------------------------------------------------------------------
// AssistantBubble — lightweight typewriter effect for assistant messages.
// OctoMessage is a heading-level wizard component; it is not reusable here
// because (1) it anchors to large display typography and (2) it calls
// onComplete() which wires into wizard-step state machine transitions.
// ---------------------------------------------------------------------------

interface AssistantBubbleProps {
  content: string;
  /** When true the message is still streaming — skip typewriter, show live text */
  isStreaming?: boolean;
}

function AssistantBubble({ content, isStreaming = false }: AssistantBubbleProps) {
  const [displayed, setDisplayed] = useState('');
  const [done, setDone] = useState(false);
  const prevContentRef = useRef('');

  useEffect(() => {
    // While streaming, show text as-is without the typewriter lag.
    if (isStreaming) {
      setDisplayed(content);
      setDone(false);
      prevContentRef.current = content;
      return;
    }

    // Once streaming stops, play typewriter from the last streamed position.
    const startIdx = prevContentRef.current.length;
    if (startIdx >= content.length) {
      setDone(true);
      return;
    }

    setDone(false);
    let idx = startIdx;

    const interval = setInterval(() => {
      idx++;
      setDisplayed(content.slice(0, idx));
      if (idx >= content.length) {
        clearInterval(interval);
        setDone(true);
        prevContentRef.current = content;
      }
    }, 18);

    return () => clearInterval(interval);
  }, [content, isStreaming]);

  return (
    <div className="max-w-[85%] px-4 py-3 rounded-2xl rounded-bl-md text-sm leading-relaxed bg-surface border border-border text-text">
      {isStreaming ? content : displayed}
      {!done && !isStreaming && (
        <span className="inline-block w-0.5 h-3.5 bg-orange animate-pulse ml-0.5 align-middle" />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// UserBubble — simple styled wrapper for outgoing messages.
// ---------------------------------------------------------------------------

function UserBubble({ content }: { content: string }) {
  return (
    <div className="max-w-[85%] px-4 py-3 rounded-2xl rounded-br-md text-sm leading-relaxed bg-orange text-bg">
      {content}
    </div>
  );
}

// ---------------------------------------------------------------------------
// ThinkingDots — shows while the agent response is loading/streaming.
// ---------------------------------------------------------------------------

function ThinkingDots() {
  return (
    <div className="flex justify-start">
      <div className="px-4 py-3 rounded-2xl rounded-bl-md bg-surface border border-border flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-orange animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="w-1.5 h-1.5 rounded-full bg-orange animate-bounce" style={{ animationDelay: '150ms' }} />
        <span className="w-1.5 h-1.5 rounded-full bg-orange animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// FreeChatWidget — main component
// ---------------------------------------------------------------------------

const WELCOME_MESSAGE = `Your discovery call is booked! I'm Octo — ask me anything about Octio's services before your meeting.`;

export default function FreeChatWidget({ sessionId, contactId, wizardContext }: FreeChatWidgetProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [inputValue, setInputValue] = useState('');

  // Stable transport instance — only recreated if sessionId/contactId/context change.
  // wizardContext is forwarded to the backend so the agent has access to
  // the user's selected service, budget, and contact info without relying on
  // session storage (useful for stateless or early-session requests).
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: '/chat/stream',
        headers: {
          'X-Session-Id': sessionId,
        },
        body: {
          sessionId,
          ...(contactId ? { contactId } : {}),
          wizardContext,
        },
      }),
    [sessionId, contactId, wizardContext],
  );

  const { messages, sendMessage, status, error, clearError } = useChat({
    transport,
    messages: [
      {
        id: 'welcome',
        role: 'assistant',
        content: WELCOME_MESSAGE,
        parts: [{ type: 'text', text: WELCOME_MESSAGE }],
        metadata: {},
      },
    ],
    onError: (err: Error) => {
      console.error('Freechat stream error:', err);
    },
  });

  const isLoading = status === 'streaming' || status === 'submitted';
  const isStreaming = status === 'streaming';

  // Scroll to bottom whenever messages update or loading state changes.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const text = inputValue.trim();
      if (!text || isLoading) return;

      setInputValue('');
      if (error) clearError();

      await sendMessage({ text });
    },
    [inputValue, isLoading, sendMessage, error, clearError],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // Submit on Enter (without Shift) for chat-style UX.
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSubmit(e as unknown as React.FormEvent);
      }
    },
    [handleSubmit],
  );

  const handleRetry = useCallback(() => {
    clearError();
    // Bug #11: actually re-send the last user message instead of only clearing the error
    const lastUserMessage = messages.filter((m) => m.role === 'user').at(-1);
    if (lastUserMessage) {
      const text = typeof lastUserMessage.content === 'string' ? lastUserMessage.content : '';
      if (text) {
        void sendMessage({ text });
      }
    }
  }, [clearError, messages, sendMessage]);

  return (
    <div className="mt-8 max-w-2xl mx-auto animate-fade-up flex flex-col gap-4">
      {/* Message list */}
      <div
        ref={scrollRef}
        className="max-h-[320px] overflow-y-auto space-y-4 pr-2 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-border"
        aria-label="Chat history"
        aria-live="polite"
      >
        {messages.map((msg, idx) => {
          const isLastMessage = idx === messages.length - 1;
          const content = typeof msg.content === 'string' ? msg.content : '';

          return (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'assistant' ? (
                <AssistantBubble
                  content={content}
                  isStreaming={isStreaming && isLastMessage}
                />
              ) : (
                <UserBubble content={content} />
              )}
            </div>
          );
        })}

        {/* Show dots only while submitted but not yet streaming */}
        {status === 'submitted' && <ThinkingDots />}
      </div>

      {/* Error banner */}
      {error && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 text-sm">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <span className="flex-1">Connection issue — try again.</span>
          <button
            type="button"
            onClick={handleRetry}
            className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 transition-colors shrink-0"
            aria-label="Retry connection"
          >
            <RefreshCw size={12} />
            Retry
          </button>
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSubmit} className="flex items-end gap-3">
        <textarea
          ref={inputRef}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask me anything about Octio..."
          disabled={isLoading}
          rows={1}
          className="flex-1 px-5 py-3.5 bg-surface border border-border rounded-2xl text-text placeholder:text-text-muted/50 focus:outline-none focus:border-orange/50 focus:ring-1 focus:ring-orange/20 transition-all resize-none disabled:opacity-50 leading-relaxed"
          aria-label="Message input"
        />
        <button
          type="submit"
          disabled={isLoading || !inputValue.trim()}
          className="btn-glow shrink-0 w-12 h-12 bg-orange text-bg rounded-full flex items-center justify-center transition-all duration-300 hover:bg-orange-light hover:shadow-lg hover:shadow-orange/20 disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label="Send message"
        >
          {isLoading ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Send size={16} />
          )}
        </button>
      </form>

      <p className="text-center text-xs text-text-muted/40">
        Press Enter to send · Shift+Enter for new line
      </p>
    </div>
  );
}
