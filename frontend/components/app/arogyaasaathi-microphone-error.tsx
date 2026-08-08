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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs px-4 animate-in fade-in duration-200"
    >
      <div className="w-full max-w-md rounded-2xl bg-card border border-border p-6 text-center shadow-2xl">
        <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-rose-100 dark:bg-rose-950/70 text-rose-600 dark:text-rose-400">
          <MicOff className="size-6" />
        </div>

        <h3 id="mic-error-title" className="text-xl font-bold text-foreground">
          Microphone access is blocked
        </h3>

        <p id="mic-error-desc" className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {message ?? 'ArogyaSaathi requires microphone permissions to talk with you. Please allow microphone access in your browser settings.'}
        </p>

        <div className="mt-6 flex justify-center gap-3">
          <Button
            size="default"
            onClick={onRetry}
            className="w-full max-w-xs rounded-full bg-teal-600 font-semibold text-white hover:bg-teal-700 shadow-md transition-all active:scale-98"
          >
            <RefreshCw className="mr-2 size-4" />
            Try again
          </Button>
        </div>

        <div className="mt-5 rounded-lg bg-muted/50 p-3 text-left">
          <p className="text-xs font-semibold text-foreground/80">How to enable your microphone:</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Click the lock 🔒 or camera/mic icon near your browser address bar, set Microphone to <span className="font-semibold text-teal-600 dark:text-teal-400">Allow</span>, and click "Try again".
          </p>
        </div>
      </div>
    </div>
  );
}

