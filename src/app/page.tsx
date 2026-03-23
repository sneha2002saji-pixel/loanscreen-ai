'use client';

import { useState } from 'react';
import { DEMO_USERS } from '@/types/user';
import type { UserProfile } from '@/types/user';
import Header from '@/components/Header';
import ChatContainer from '@/components/ChatContainer';
import { cn } from '@/lib/utils';
import { User, ArrowRight } from 'lucide-react';

export default function Home() {
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [customName, setCustomName] = useState('');

  function startWithCustomName(): void {
    if (!customName.trim()) return;
    setSelectedUser({
      id: `custom-${crypto.randomUUID()}`,
      name: customName.trim(),
      email: '',
      createdAt: new Date().toISOString(),
    });
  }

  if (!selectedUser) {
    return (
      <>
        <Header />
        <main className="flex flex-1 items-center justify-center p-4">
          <div className="w-full max-w-md">
            <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
              <div className="mb-6 text-center">
                <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-indigo-100">
                  <User className="h-7 w-7 text-indigo-600" />
                </div>
                <h2 className="text-xl font-bold text-slate-900">
                  Welcome to LoanScreen AI
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Enter your name or select a demo user to begin
                </p>
              </div>

              {/* Custom name input */}
              <div className="mb-4">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') startWithCustomName();
                    }}
                    maxLength={100}
                    placeholder="Enter your name..."
                    className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                  />
                  <button
                    type="button"
                    disabled={!customName.trim()}
                    onClick={startWithCustomName}
                    className={cn(
                      'rounded-xl px-4 py-2.5 text-sm font-medium transition-all',
                      customName.trim()
                        ? 'bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95'
                        : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    )}
                  >
                    Start
                  </button>
                </div>
              </div>

              {/* Divider */}
              <div className="relative mb-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-white px-2 text-slate-400">or choose a demo user</span>
                </div>
              </div>

              {/* Demo users */}
              <div className="space-y-2">
                {DEMO_USERS.map((user) => (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => setSelectedUser(user)}
                    className={cn(
                      'flex w-full items-center justify-between rounded-xl border border-slate-200 px-4 py-3 text-left transition-all',
                      'hover:border-indigo-300 hover:bg-indigo-50/50 hover:shadow-sm',
                      'active:scale-[0.98]'
                    )}
                  >
                    <div>
                      <p className="font-medium text-slate-800">{user.name}</p>
                      <p className="text-xs text-slate-400">{user.email}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-slate-300" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </main>
      </>
    );
  }

  return (
    <div className="flex h-screen flex-col">
      <Header />
      <ChatContainer userId={selectedUser.id} userName={selectedUser.name} onBack={() => setSelectedUser(null)} />
    </div>
  );
}
