'use client';

import { Shield } from 'lucide-react';

export default function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-4xl items-center gap-3 px-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-white">
          <Shield className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-lg font-semibold text-slate-900">LoanScreen AI</h1>
          <p className="text-xs text-slate-500">Pre-Qualification Assistant</p>
        </div>
      </div>
    </header>
  );
}
