'use client';

import { useState, useRef, useCallback } from 'react';
import { Send } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export default function ChatInput({
  onSend,
  disabled = false,
  placeholder = 'Type your response...',
}: ChatInputProps) {
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue('');
    inputRef.current?.focus();
  }, [value, disabled, onSend]);

  return (
    <div className="border-t border-slate-200 bg-white px-4 py-3">
      <div className="mx-auto flex max-w-4xl items-center gap-2">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSubmit();
            }
          }}
          disabled={disabled}
          placeholder={disabled ? 'Waiting for response...' : placeholder}
          className={cn(
            'flex-1 rounded-full border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 outline-none transition-colors',
            'placeholder:text-slate-400',
            'focus:border-indigo-300 focus:bg-white focus:ring-2 focus:ring-indigo-100',
            'disabled:cursor-not-allowed disabled:opacity-50'
          )}
          aria-label="Chat message input"
        />
        <button
          type="button"
          onClick={handleSubmit}
          disabled={disabled || !value.trim()}
          className={cn(
            'flex h-10 w-10 items-center justify-center rounded-full transition-all',
            'bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95',
            'disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400'
          )}
          aria-label="Send message"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
