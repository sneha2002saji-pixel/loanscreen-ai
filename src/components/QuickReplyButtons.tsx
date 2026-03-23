'use client';

import type { QuickReply } from '@/types/chat';

interface QuickReplyButtonsProps {
  options: QuickReply[];
  onSelect: (value: string) => void;
  disabled?: boolean;
}

export default function QuickReplyButtons({
  options,
  onSelect,
  disabled = false,
}: QuickReplyButtonsProps) {
  if (options.length === 0) return null;

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          disabled={disabled}
          onClick={() => onSelect(option.value)}
          className="rounded-full border border-indigo-200 bg-white px-4 py-1.5 text-sm font-medium text-indigo-600 transition-all hover:border-indigo-400 hover:bg-indigo-50 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
