'use client';

import { useState } from 'react';
import { Brain, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ThinkingPanelProps {
  thinking: string;
}

export default function ThinkingPanel({ thinking }: ThinkingPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!thinking) return null;

  return (
    <div className="mt-2 rounded-lg border border-indigo-100 bg-indigo-50/50">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center gap-2 px-3 py-2 text-xs font-medium text-indigo-600 hover:text-indigo-700"
      >
        <Brain className="h-3.5 w-3.5 animate-pulse" />
        <span>AI Thinking</span>
        {isExpanded ? (
          <ChevronUp className="ml-auto h-3.5 w-3.5" />
        ) : (
          <ChevronDown className="ml-auto h-3.5 w-3.5" />
        )}
      </button>
      <div
        className={cn(
          'overflow-hidden transition-all duration-300 ease-in-out',
          isExpanded ? 'max-h-64' : 'max-h-0'
        )}
      >
        <div className="border-t border-indigo-100 px-3 py-2">
          <p className="max-h-52 overflow-y-auto whitespace-pre-wrap text-xs leading-relaxed text-indigo-700/80">
            {thinking}
          </p>
        </div>
      </div>
    </div>
  );
}
