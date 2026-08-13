'use client';

import React from 'react';
import { MicOff, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MicErrorProps {
  message?: string;
  onRetry?: () => void;
}

export function ArogyaSaathiMicError({ message, onRetry }: MicErrorProps) {
  return (
    <div
      role="dialog"
      aria-labelledby="mic-error-title"
      aria-describedby="mic-error-desc"
      className="animate-in fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-xs duration-200"
    >
      <div className="bg-card border-border w-full max-w-md rounded-2xl border p-6 text-center shadow-2xl">
        <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-rose-100 text-rose-600 dark:bg-rose-950/70 dark:text-rose-400">
          <MicOff className="size-6" />
        </div>

        <h3 id="mic-error-title" className="text-foreground text-xl font-bold">
          Microphone access is blocked
        </h3>

        <p id="mic-error-desc" className="text-muted-foreground mt-2 text-sm leading-relaxed">
          {message ??
            'ArogyaSaathi requires microphone permissions to talk with you. Please allow microphone access in your browser settings.'}
        </p>

        <div className="mt-6 flex justify-center gap-3">
          <Button
            size="default"
            onClick={onRetry}
            className="w-full max-w-xs rounded-full bg-teal-600 font-semibold text-white shadow-md transition-all hover:bg-teal-700 active:scale-98"
          >
            <RefreshCw className="mr-2 size-4" />
            Try again
          </Button>
        </div>

        <div className="bg-muted/50 mt-5 rounded-lg p-3 text-left">
          <p className="text-foreground/80 text-xs font-semibold">How to enable your microphone:</p>
          <p className="text-muted-foreground mt-1 text-xs">
            Click the lock 🔒 or camera/mic icon near your browser address bar, set Microphone to{' '}
            <span className="font-semibold text-teal-600 dark:text-teal-400">Allow</span>, and click
            "Try again".
          </p>
        </div>
      </div>
    </div>
  );
}
