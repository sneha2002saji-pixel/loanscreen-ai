'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { ArrowLeft, Bot } from 'lucide-react';
import type {
  ChatMessage as ChatMessageType,
  ConversationStage,
  CollectedData,
  QuickReply,
} from '@/types/chat';
import type { EligibilityResult } from '@/types/loan';
import {
  extractLoanType,
  extractCreditRange,
  extractEmploymentStatus,
  parseNumericValue,
} from '@/lib/validators';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import TypingIndicator from './TypingIndicator';
import DisclaimerBanner from './DisclaimerBanner';

interface ChatContainerProps {
  userId: string;
  userName: string;
  onBack: () => void;
}

export default function ChatContainer({ userId, userName, onBack }: ChatContainerProps) {
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [stage, setStage] = useState<ConversationStage>('greeting');
  const [collectedData, setCollectedData] = useState<Partial<CollectedData>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId] = useState(() => uuidv4());
  const [eligibilityResult, setEligibilityResult] = useState<EligibilityResult | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const greetingSent = useRef(false);

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, scrollToBottom]);

  // Send initial greeting on mount (ref guard prevents StrictMode double-fire)
  useEffect(() => {
    if (greetingSent.current) return;
    greetingSent.current = true;
    sendMessage(`Hi, I'm ${userName} and I'd like to check my loan pre-qualification options.`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  function updateCollectedDataFromMessage(
    message: string,
    currentStage: ConversationStage,
    currentData: Partial<CollectedData>
  ): Partial<CollectedData> {
    const updated = { ...currentData };

    // Non-numeric fields: always try extraction regardless of stage
    const loanType = extractLoanType(message);
    if (loanType && !updated.loanType) updated.loanType = loanType;

    const employment = extractEmploymentStatus(message);
    if (employment && !updated.employmentStatus) updated.employmentStatus = employment;

    const credit = extractCreditRange(message);
    if (credit && !updated.creditScoreRange) updated.creditScoreRange = credit;

    // Numeric fields: use stage context to disambiguate what the number means
    const numericValue = parseNumericValue(message);
    if (numericValue !== null) {
      switch (currentStage) {
        case 'income_employment':
          if (numericValue > 1000 && updated.annualIncome === undefined) {
            updated.annualIncome = numericValue;
          }
          break;
        case 'debts_expenses':
          if (updated.monthlyDebts === undefined) {
            updated.monthlyDebts = numericValue;
          }
          break;
        case 'assets':
          if (updated.totalAssets === undefined) {
            updated.totalAssets = numericValue;
          }
          break;
        default:
          // If a large number appears and income isn't set yet, treat as income
          if (numericValue > 1000 && updated.annualIncome === undefined) {
            updated.annualIncome = numericValue;
          }
          break;
      }
    }

    return updated;
  }

  async function sendMessage(userMessage: string): Promise<void> {
    const userMsg: ChatMessageType = {
      id: uuidv4(),
      role: 'user',
      content: userMessage,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    // Update collected data based on user message
    const updatedData = updateCollectedDataFromMessage(userMessage, stage, collectedData);
    setCollectedData(updatedData);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          sessionId,
          userId,
          stage,
          collectedData: updatedData,
        }),
      });

      if (!response.ok) {
        throw new Error(`Chat request failed: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response stream');

      const decoder = new TextDecoder();
      let buffer = '';
      let contentAccumulator = '';
      let thinkingAccumulator = '';
      let quickReplies: QuickReply[] = [];
      const assistantId = uuidv4();

      // Add placeholder assistant message
      const assistantMsg: ChatMessageType = {
        id: assistantId,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMsg]);

      let lastEventType = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (line.startsWith('event: ')) {
            lastEventType = line.slice(7).trim();
          } else if (line.startsWith('data: ')) {
            try {
              const payload = JSON.parse(line.slice(6));

              if (payload.text !== undefined) {
                if (lastEventType === 'thinking') {
                  thinkingAccumulator += payload.text;
                } else {
                  contentAccumulator += payload.text;
                }
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId
                      ? {
                          ...m,
                          content: contentAccumulator,
                          thinking: thinkingAccumulator || undefined,
                        }
                      : m
                  )
                );
                scrollToBottom();
              }
              if (payload.stage) {
                setStage(payload.stage);
                if (payload.stage === 'eligibility_calc') {
                  setIsCalculating(true);
                }
              }
              if (payload.options) {
                quickReplies = payload.options;
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId ? { ...m, quickReplies } : m
                  )
                );
              }
              if (payload.isPrequalified !== undefined) {
                setEligibilityResult(payload as EligibilityResult);
                setIsCalculating(false);
                setStage('summary');
              }
              if (payload.finished) {
                break;
              }
            } catch {
              // skip malformed JSON
            }
            lastEventType = '';
          }
        }
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Something went wrong';
      const errorMsg: ChatMessageType = {
        id: uuidv4(),
        role: 'assistant',
        content: `I'm sorry, I encountered an error: ${errorMessage}. Please try again.`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
      setIsCalculating(false);
    }
  }

  function handleQuickReply(value: string): void {
    sendMessage(value);
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Back button */}
      <div className="border-b border-slate-200 bg-white px-4 py-2">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to user selection</span>
        </button>
      </div>

      {/* Messages area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto bg-white">
        <div className="mx-auto max-w-4xl py-4">
          {messages.map((msg, index) => (
            <ChatMessage
              key={msg.id}
              message={msg}
              eligibilityResult={
                msg.role === 'assistant' && index === messages.length - 1
                  ? eligibilityResult
                  : null
              }
              onQuickReply={handleQuickReply}
              isLatest={index === messages.length - 1}
              isLoading={isLoading}
            />
          ))}
          {isLoading && messages[messages.length - 1]?.role === 'user' && (
            <TypingIndicator />
          )}
          {isCalculating && (
            <div className="flex gap-3 px-4 py-3">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600">
                <Bot className="h-4 w-4" />
              </div>
              <div className="rounded-2xl rounded-bl-md bg-gradient-to-r from-indigo-50 to-purple-50 px-4 py-3 text-sm text-slate-700">
                <div className="flex items-center gap-2">
                  <svg className="h-4 w-4 animate-spin text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <span>Analyzing your financial profile and calculating eligibility...</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Disclaimer */}
      <DisclaimerBanner />

      {/* Input */}
      <ChatInput
        onSend={sendMessage}
        disabled={isLoading || stage === 'completed'}
      />
    </div>
  );
}
