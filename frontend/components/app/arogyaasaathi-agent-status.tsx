'use client';

import React from 'react';
import { CheckCircle2, Loader2, Mic, Volume2, Brain, AlertCircle, Activity } from 'lucide-react';

interface AgentStatusProps {
  state?: string;
  onStartAgain?: () => void;
}

export function ArogyaSaathiAgentStatus({ state, onStartAgain }: AgentStatusProps) {
  const config = (() => {
    switch (state) {
      case 'connecting':
      case 'initializing':
        return {
          label: 'Connecting to ArogyaSaathi...',
          Icon: Loader2,
          spin: true,
          bgClass: 'bg-amber-50 text-amber-900 border-amber-300 dark:bg-amber-950/80 dark:text-amber-200 dark:border-amber-700',
          dotClass: 'bg-amber-500 animate-ping',
        };
      case 'checking':
        return {
          label: 'Checking health guidance...',
          Icon: Activity,
          spin: true,
          bgClass: 'bg-blue-50 text-blue-900 border-blue-300 dark:bg-blue-950/80 dark:text-blue-200 dark:border-blue-700',
          dotClass: 'bg-blue-500 animate-ping',
        };
      case 'listening':
        return {
          label: "Listening — Go ahead, I'm listening",
          Icon: Mic,
          spin: false,
          bgClass: 'bg-emerald-50 text-emerald-900 border-emerald-300 dark:bg-emerald-950/80 dark:text-emerald-200 dark:border-emerald-700',
          dotClass: 'bg-emerald-500 animate-pulse',
        };
      case 'thinking':
        return {
          label: 'ArogyaSaathi is thinking...',
          Icon: Brain,
          spin: false,
          bgClass: 'bg-indigo-50 text-indigo-900 border-indigo-300 dark:bg-indigo-950/80 dark:text-indigo-200 dark:border-indigo-700',
          dotClass: 'bg-indigo-500 animate-pulse',
        };
      case 'speaking':
        return {
          label: 'ArogyaSaathi is speaking...',
          Icon: Volume2,
          spin: false,
          bgClass: 'bg-teal-50 text-teal-900 border-teal-300 dark:bg-teal-950/80 dark:text-teal-200 dark:border-teal-700',
          dotClass: 'bg-teal-500 animate-pulse',
        };
      case 'ended':
        return {
          label: 'Conversation ended',
          Icon: CheckCircle2,
          spin: false,
          bgClass: 'bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-900 dark:text-slate-200 dark:border-slate-700',
          dotClass: 'bg-slate-400',
        };
      case 'failed':
        return {
          label: "We couldn't connect",
          Icon: AlertCircle,
          spin: false,
          bgClass: 'bg-rose-50 text-rose-900 border-rose-300 dark:bg-rose-950/80 dark:text-rose-200 dark:border-rose-700',
          dotClass: 'bg-rose-500',
        };
      default:
        return {
          label: 'ArogyaSaathi Connected',
          Icon: CheckCircle2,
          spin: false,
          bgClass: 'bg-teal-50 text-teal-900 border-teal-300 dark:bg-teal-950/80 dark:text-teal-200 dark:border-teal-700',
          dotClass: 'bg-teal-500',
        };
    }
  })();

  const { label, Icon, spin, bgClass, dotClass } = config;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`inline-flex items-center gap-2.5 rounded-full border px-4 py-2 text-xs md:text-sm font-semibold shadow-md backdrop-blur-md transition-all duration-300 ${bgClass}`}
    >
      <span className="relative flex size-2.5">
        <span className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${dotClass}`} />
        <span className={`relative inline-flex size-2.5 rounded-full ${dotClass.split(' ')[0]}`} />
      </span>

      <Icon className={`size-4.5 ${spin ? 'animate-spin' : ''}`} />
      <span className="min-w-[170px] text-center font-medium">{label}</span>

      {state === 'ended' && onStartAgain && (
        <button
          onClick={onStartAgain}
          className="ml-2 rounded-full bg-teal-600 px-3 py-1 text-xs font-semibold text-white hover:bg-teal-700 transition-colors shadow-xs"
          aria-label="Start again"
        >
          Start again
        </button>
      )}
    </div>
  );
}

