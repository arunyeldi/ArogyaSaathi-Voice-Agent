'use client';

import React from 'react';
import { HeartPulse, Mic, Volume2, Brain, Loader2 } from 'lucide-react';
import { cn } from '@/lib/shadcn/utils';

interface VoiceOrbProps {
  state?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function ArogyaSaathiVoiceOrb({ state = 'ready', className, size = 'md' }: VoiceOrbProps) {
  const sizeClasses = {
    sm: 'size-16',
    md: 'size-28 md:size-32',
    lg: 'size-36 md:size-44',
  }[size];

  const iconSizes = {
    sm: 'size-7',
    md: 'size-12',
    lg: 'size-16',
  }[size];

  const getStateConfig = () => {
    switch (state) {
      case 'connecting':
      case 'initializing':
        return {
          glowColor: 'from-amber-400/30 to-teal-400/30',
          borderColor: 'border-amber-400/60',
          bgGradient: 'from-teal-600 via-amber-500 to-emerald-600',
          Icon: Loader2,
          iconClass: 'animate-spin text-white',
          pulseRingClass: 'animate-ping duration-1000 bg-amber-400/20',
          subtext: 'Connecting securely...',
        };
      case 'listening':
        return {
          glowColor: 'from-emerald-400/40 via-teal-300/30 to-emerald-500/40',
          borderColor: 'border-emerald-400/70',
          bgGradient: 'from-emerald-600 via-teal-600 to-emerald-500',
          Icon: Mic,
          iconClass: 'animate-pulse text-white',
          pulseRingClass: 'animate-ping duration-750 bg-emerald-400/30',
          subtext: "Listening — speak naturally",
        };
      case 'thinking':
        return {
          glowColor: 'from-indigo-400/40 via-teal-300/30 to-indigo-500/40',
          borderColor: 'border-indigo-400/70',
          bgGradient: 'from-indigo-600 via-teal-600 to-indigo-500',
          Icon: Brain,
          iconClass: 'animate-pulse text-white',
          pulseRingClass: 'animate-pulse duration-500 bg-indigo-400/25',
          subtext: 'ArogyaSaathi is processing...',
        };
      case 'speaking':
        return {
          glowColor: 'from-teal-400/50 via-emerald-300/40 to-teal-500/50',
          borderColor: 'border-teal-400/80',
          bgGradient: 'from-teal-500 via-emerald-600 to-teal-600',
          Icon: Volume2,
          iconClass: 'animate-bounce text-white',
          pulseRingClass: 'animate-ping duration-500 bg-teal-400/40',
          subtext: 'ArogyaSaathi is speaking...',
        };
      case 'ended':
        return {
          glowColor: 'from-slate-400/20 to-slate-500/20',
          borderColor: 'border-slate-400/40',
          bgGradient: 'from-slate-600 to-slate-700',
          Icon: HeartPulse,
          iconClass: 'text-slate-200',
          pulseRingClass: 'hidden',
          subtext: 'Session complete',
        };
      default:
        return {
          glowColor: 'from-teal-500/30 to-emerald-500/30',
          borderColor: 'border-teal-400/50',
          bgGradient: 'from-teal-600 via-emerald-600 to-teal-700',
          Icon: HeartPulse,
          iconClass: 'text-white animate-pulse',
          pulseRingClass: 'animate-pulse duration-1000 bg-teal-400/15',
          subtext: 'Ready to listen',
        };
    }
  };

  const { glowColor, borderColor, bgGradient, Icon, iconClass, pulseRingClass, subtext } = getStateConfig();

  return (
    <div className={cn('flex flex-col items-center justify-center text-center', className)}>
      {/* Outer Container with Multi-layer Glow & Ripples */}
      <div className="relative flex items-center justify-center">
        {/* Outer Ripple 1 */}
        <div
          className={cn(
            'absolute inset-0 rounded-full blur-xl opacity-75 transition-all duration-700 bg-gradient-to-r',
            glowColor
          )}
        />

        {/* Outer Ripple 2 (Pulsing ring) */}
        <div
          className={cn(
            'absolute -inset-3 rounded-full blur-md transition-all duration-500',
            pulseRingClass
          )}
        />

        {/* Outer Ring Border */}
        <div
          className={cn(
            'absolute -inset-1.5 rounded-full border-2 transition-all duration-500 shadow-lg',
            borderColor
          )}
        />

        {/* Core Orb Container */}
        <div
          className={cn(
            'relative flex items-center justify-center rounded-full bg-gradient-to-tr shadow-2xl transition-all duration-500 hover:scale-105 active:scale-95',
            bgGradient,
            sizeClasses
          )}
        >
          {/* Inner Shimmer Layer */}
          <div className="absolute inset-1 rounded-full bg-white/10 blur-xs" />

          {/* Icon */}
          <Icon className={cn('relative z-10 transition-all duration-300 drop-shadow-md', iconSizes, iconClass)} />
        </div>
      </div>

      {/* Subtext */}
      <span className="mt-3 text-xs md:text-sm font-semibold tracking-wide text-foreground/80 transition-all">
        {subtext}
      </span>
    </div>
  );
}
