'use client';

import { Bot, User } from 'lucide-react';
import type { ChatMessage as ChatMessageType } from '@/types/chat';
import type { EligibilityResult } from '@/types/loan';
import { cn } from '@/lib/utils';
import ThinkingPanel from './ThinkingPanel';
import QuickReplyButtons from './QuickReplyButtons';
import SummaryCard from './SummaryCard';

interface ChatMessageProps {
  message: ChatMessageType;
  eligibilityResult?: EligibilityResult | null;
  onQuickReply?: (value: string) => void;
  isLatest?: boolean;
  isLoading?: boolean;
}

export default function ChatMessage({
  message,
  eligibilityResult,
  onQuickReply,
  isLatest = false,
  isLoading = false,
}: ChatMessageProps) {
  const isUser = message.role === 'user';

  return (
    <div className={cn('flex gap-3 px-4 py-3', isUser ? 'flex-row-reverse' : 'flex-row')}>
      {/* Avatar */}
      <div
        className={cn(
          'flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full',
          isUser ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'
        )}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>

      {/* Content */}
      <div className={cn('max-w-[75%] space-y-1', isUser ? 'items-end' : 'items-start')}>
        <div
          className={cn(
            'rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
            isUser
              ? 'rounded-br-md bg-indigo-600 text-white'
              : 'rounded-bl-md bg-slate-100 text-slate-800'
          )}
        >
          <p className="whitespace-pre-wrap">{message.content}</p>
        </div>

        {/* Thinking panel for assistant messages */}
        {!isUser && message.thinking && <ThinkingPanel thinking={message.thinking} />}

        {/* Eligibility result */}
        {!isUser && eligibilityResult && <SummaryCard result={eligibilityResult} />}

        {/* Quick replies — only on latest assistant message */}
        {!isUser && isLatest && !isLoading && message.quickReplies && onQuickReply && (
          <QuickReplyButtons
            options={message.quickReplies}
            onSelect={onQuickReply}
          />
        )}

        {/* Timestamp */}
        <p className={cn('text-xs text-slate-400', isUser ? 'text-right' : 'text-left')}>
          {new Date(message.timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </p>
      </div>
    </div>
  );
}
