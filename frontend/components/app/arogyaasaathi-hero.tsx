'use client';

import React from 'react';
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  Globe,
  HeartPulse,
  Loader2,
  Mic,
  ShieldCheck,
  Stethoscope,
  Zap,
} from 'lucide-react';
import { motion } from 'motion/react';
import { ArogyaSaathiAnalyticsDashboard } from '@/components/app/arogyaasaathi-analytics-dashboard';
import { ArogyaSaathiHumanHelpDashboard } from '@/components/app/arogyaasaathi-human-help-dashboard';
import { ArogyaSaathiOutboundCard } from '@/components/app/arogyaasaathi-outbound-card';
import { ArogyaSaathiVoiceOrb } from '@/components/app/arogyaasaathi-voice-orb';
import { Button } from '@/components/ui/button';

interface HeroProps {
  startButtonText?: string;
  isConnecting?: boolean;
  wasEnded?: boolean;
  onStartCall: () => void;
}

export function ArogyaSaathiHero({
  startButtonText = 'Start Voice Consultation',
  isConnecting = false,
  wasEnded = false,
  onStartCall,
}: HeroProps) {
  const orbState = isConnecting ? 'connecting' : wasEnded ? 'ended' : 'ready';
  const [activeTab, setActiveTab] = React.useState<'outbound' | 'support' | 'analytics'>(
    'analytics'
  );

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col items-center gap-6 px-4 pt-14 pb-6 md:pt-16 md:pb-8">
      {/* Central State-of-the-Art Hero Card (Crystal 10% Translucent Glass - Fits 100% Above Fold) */}
      <section className="relative flex w-full flex-col items-center overflow-hidden rounded-[32px] border border-white/25 bg-black/10 px-5 py-6 text-center shadow-[0_0_80px_rgba(13,148,136,0.25)] backdrop-blur-sm transition-all duration-500 hover:bg-black/20 md:px-10 md:py-8 dark:bg-black/15">
        {/* Ambient Vibrant Glow Orbs */}
        <div className="pointer-events-none absolute -top-32 size-[450px] rounded-full bg-gradient-to-r from-teal-500/20 via-emerald-500/15 to-cyan-500/20 blur-[100px]" />
        <div className="pointer-events-none absolute -bottom-32 size-[350px] rounded-full bg-gradient-to-r from-emerald-500/15 via-teal-600/15 to-indigo-500/15 blur-[90px]" />

        {/* Background Dual Counter-Scrolling Marquee Cards (Subtle Ambient Motion at Edges) */}
        <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden select-none">
          {/* Row 1: Top Edge (Left to Right) */}
          <div className="absolute top-2.5 right-0 left-0 opacity-20">
            <div className="animate-marquee-reverse flex w-max space-x-6 text-[10px] font-medium text-teal-200">
              {[
                '🩺 AI Symptom Assessment',
                '💊 Dosage & Medicine Info',
                '🌐 Regional Language Dialects',
                '⚡ <200ms Murf Falcon TTS',
                '🔒 256-bit Encrypted Stream',
                '🇮🇳 VoiceForBharat Assistant',
                '🩺 AI Symptom Assessment',
                '💊 Dosage & Medicine Info',
                '🌐 Regional Language Dialects',
                '⚡ <200ms Murf Falcon TTS',
                '🔒 256-bit Encrypted Stream',
                '🇮🇳 VoiceForBharat Assistant',
              ].map((item, idx) => (
                <span
                  key={idx}
                  className="rounded-full border border-teal-500/30 bg-black/40 px-3 py-0.5 whitespace-nowrap backdrop-blur-xs"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>

          {/* Row 2: Bottom Edge (Right to Left) */}
          <div className="absolute right-0 bottom-2.5 left-0 opacity-20">
            <div className="animate-marquee flex w-max space-x-6 text-[10px] font-medium text-emerald-200">
              {[
                '🚑 Emergency Health Guidance',
                '👵 Senior Citizen Assistant',
                '👩‍⚕️ ASHA Worker Support',
                '❤️ Heart & Pulse Wellness',
                '🌿 Ayurvedic & Diet Tips',
                '🗣️ Natural Speech Recognition',
                '🚑 Emergency Health Guidance',
                '👵 Senior Citizen Assistant',
                '👩‍⚕️ ASHA Worker Support',
                '❤️ Heart & Pulse Wellness',
                '🌿 Ayurvedic & Diet Tips',
                '🗣️ Natural Speech Recognition',
              ].map((item, idx) => (
                <span
                  key={idx}
                  className="rounded-full border border-emerald-500/30 bg-black/40 px-3 py-0.5 whitespace-nowrap backdrop-blur-xs"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* ArogyaSaathi Floating / Levitating & Popping Heart Symbol Orb */}
        <motion.div
          initial={{ scale: 0.6, y: -20, opacity: 0 }}
          animate={{ scale: 1, y: [0, -12, 0], opacity: 1 }}
          transition={{
            scale: { duration: 0.7, ease: [0.175, 0.885, 0.32, 1.275] },
            opacity: { duration: 0.4 },
            y: { duration: 2.8, repeat: Infinity, ease: 'easeInOut' },
          }}
          onClick={onStartCall}
          className="group relative z-10 mb-2 cursor-pointer transition-all duration-300 hover:scale-110 active:scale-95"
          title="Click to start voice consultation"
          role="button"
          tabIndex={0}
          onKeyDown={(e: React.KeyboardEvent) => {
            if (e.key === 'Enter' || e.key === ' ') {
              onStartCall();
            }
          }}
        >
          <div className="relative flex items-center justify-center">
            <div className="absolute size-24 animate-pulse rounded-full bg-gradient-to-r from-teal-400/50 to-emerald-400/50 blur-xl transition-transform group-hover:scale-125 md:size-30" />
            <ArogyaSaathiVoiceOrb state={orbState} size="lg" />
          </div>
          <div className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-teal-300/60 bg-teal-500/30 px-3 py-1 text-[11px] font-black text-teal-200 shadow-md backdrop-blur-md transition-all group-hover:bg-teal-500/40">
            <span className="size-2 animate-ping rounded-full bg-emerald-400" />
            <span>
              {isConnecting
                ? 'Connecting securely...'
                : wasEnded
                  ? 'Click Orb to Start Again'
                  : 'Tap Orb to Start Voice Session'}
            </span>
          </div>
        </motion.div>

        {/* Status Badge */}
        {wasEnded ? (
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-emerald-400/50 bg-emerald-500/25 px-3.5 py-1 text-[11px] font-bold text-emerald-200 shadow-md backdrop-blur-md">
            <CheckCircle2 className="size-3.5 text-emerald-400" />
            <span>Consultation Complete — Thank you for using ArogyaSaathi</span>
          </div>
        ) : (
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-teal-400/50 bg-teal-500/25 px-3.5 py-1 text-[11px] font-extrabold text-teal-100 shadow-md backdrop-blur-md">
            <HeartPulse className="size-3.5 animate-pulse text-teal-400" />
            <span>VoiceForBharat • AI Health Companion for Bharat 🇮🇳</span>
          </div>
        )}

        {/* Brand Headline */}
        <h1 className="bg-gradient-to-r from-white via-teal-100 to-emerald-200 bg-clip-text text-3xl leading-tight font-black tracking-tight text-transparent drop-shadow-[0_4px_24px_rgba(20,184,166,0.4)] sm:text-4xl md:text-5xl">
          ArogyaSaathi
        </h1>
        <p className="mt-1 bg-gradient-to-r from-teal-200 via-emerald-200 to-cyan-200 bg-clip-text text-sm font-bold tracking-wide text-transparent md:text-lg">
          Your Intelligent AI Voice Health Companion
        </p>

        <p className="mx-auto mt-2 max-w-lg text-xs leading-relaxed font-semibold text-white/95 drop-shadow-sm md:text-sm">
          Instant, empathetic health guidance through natural voice conversations. Speak
          effortlessly in your natural language—no complex typing or hospital navigation required.
        </p>

        {/* Primary CTA Button - 100% Completely Visible Above the Fold */}
        <div className="relative z-10 mt-4 flex flex-col items-center justify-center gap-4 sm:mt-5 sm:flex-row">
          <Button
            size="lg"
            disabled={isConnecting}
            onClick={onStartCall}
            className="group relative h-13 w-68 cursor-pointer overflow-hidden rounded-full border-2 border-white/60 bg-gradient-to-r from-teal-400 via-emerald-400 to-cyan-400 text-sm font-black text-slate-950 shadow-[0_0_40px_rgba(20,184,166,0.6)] transition-all duration-300 hover:scale-[1.05] hover:shadow-[0_0_60px_rgba(20,184,166,0.9)] active:scale-95 sm:w-80 md:text-base"
            aria-label={
              isConnecting
                ? 'Connecting to ArogyaSaathi'
                : wasEnded
                  ? 'Start new consultation with ArogyaSaathi'
                  : 'Start voice consultation with ArogyaSaathi'
            }
          >
            {isConnecting ? (
              <>
                <Loader2 className="mr-2.5 size-5 animate-spin text-slate-950" />
                Connecting securely...
              </>
            ) : (
              <>
                <Mic className="mr-2.5 size-5 text-slate-950 transition-transform duration-300 group-hover:scale-125 group-hover:animate-pulse" />
                <span>{wasEnded ? 'Start Again' : startButtonText}</span>
              </>
            )}
          </Button>
        </div>

        {/* Module Switcher Tabs: Outbound Calls vs Day 7 Human Support Center vs Day 8 Call Analytics */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2 rounded-2xl border border-white/20 bg-black/40 p-1 backdrop-blur-md">
          <button
            type="button"
            onClick={() => setActiveTab('analytics')}
            className={`flex cursor-pointer items-center gap-2 rounded-xl px-4 py-2 text-xs font-extrabold transition-all ${
              activeTab === 'analytics'
                ? 'bg-gradient-to-r from-teal-500 to-emerald-500 text-white shadow-md'
                : 'text-white/70 hover:bg-white/10 hover:text-white'
            }`}
          >
            <span>📊 Call Analytics Dashboard (Day 8)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('outbound')}
            className={`flex cursor-pointer items-center gap-2 rounded-xl px-4 py-2 text-xs font-extrabold transition-all ${
              activeTab === 'outbound'
                ? 'bg-gradient-to-r from-teal-500 to-emerald-500 text-white shadow-md'
                : 'text-white/70 hover:bg-white/10 hover:text-white'
            }`}
          >
            <span>📞 Outbound Reminders (Day 6)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('support')}
            className={`flex cursor-pointer items-center gap-2 rounded-xl px-4 py-2 text-xs font-extrabold transition-all ${
              activeTab === 'support'
                ? 'bg-gradient-to-r from-teal-500 to-emerald-500 text-white shadow-md'
                : 'text-white/70 hover:bg-white/10 hover:text-white'
            }`}
          >
            <span>🛡️ Human Support Center (Day 7)</span>
          </button>
        </div>

        {/* Dynamic Card Display */}
        {activeTab === 'analytics' ? (
          <ArogyaSaathiAnalyticsDashboard />
        ) : activeTab === 'outbound' ? (
          <ArogyaSaathiOutboundCard />
        ) : (
          <ArogyaSaathiHumanHelpDashboard />
        )}

        {/* High-Impact Stat Highlights */}
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2.5 text-[11px] font-bold text-white">
          <span className="flex items-center gap-1.5 rounded-full border border-white/25 bg-black/30 px-3 py-1 shadow-sm backdrop-blur-md">
            <Zap className="size-3 text-teal-400" />
            <span>&lt; 200ms Voice Latency</span>
          </span>
          <span className="flex items-center gap-1.5 rounded-full border border-white/25 bg-black/30 px-3 py-1 shadow-sm backdrop-blur-md">
            <ShieldCheck className="size-3 text-emerald-400" />
            <span>256-bit Encrypted Audio</span>
          </span>
          <span className="flex items-center gap-1.5 rounded-full border border-white/25 bg-black/30 px-3 py-1 shadow-sm backdrop-blur-md">
            <Globe className="size-3 text-cyan-400" />
            <span>Multilingual Voice AI</span>
          </span>
        </div>

        {/* Interactive Sample Voice Query Prompts (Click to Try Immediately) */}
        <div className="mt-4 flex flex-col items-center gap-1.5">
          <span className="text-[11px] font-bold tracking-wider text-teal-300/90 uppercase">
            Try asking ArogyaSaathi:
          </span>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {[
              '💡 "What are natural remedies for fever?"',
              '💡 "How do I take blood pressure medication?"',
              '💡 "Explain diabetes symptoms in simple language"',
            ].map((query, idx) => (
              <button
                key={idx}
                onClick={onStartCall}
                className="cursor-pointer rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-left text-xs font-medium text-white/90 backdrop-blur-md transition-all hover:scale-105 hover:border-teal-400/50 hover:bg-teal-500/20 active:scale-95"
              >
                {query}
              </button>
            ))}
          </div>
        </div>

        {/* Bouncing Scroll Down Indicator Pill */}
        <div className="mt-8 flex animate-bounce cursor-pointer items-center justify-center opacity-80 transition-opacity hover:opacity-100">
          <span className="flex items-center gap-1 rounded-full border border-white/15 bg-black/40 px-3 py-1 text-[11px] font-bold tracking-widest text-teal-300 uppercase backdrop-blur-md">
            <span>Scroll for Features</span>
            <ChevronDown className="size-3.5 text-teal-400" />
          </span>
        </div>
      </section>

      {/* Feature Showcase Grid (Lightened 20% Translucent Glass) */}
      <section className="grid w-full grid-cols-1 gap-6 md:grid-cols-3">
        {/* Card 1 */}
        <div className="group relative overflow-hidden rounded-[28px] border border-white/25 bg-black/25 p-7 shadow-xl backdrop-blur-md transition-all duration-300 hover:-translate-y-1.5 hover:border-emerald-400/60 hover:bg-black/40 hover:shadow-[0_20px_40px_rgba(16,185,129,0.25)]">
          <div className="absolute top-0 right-0 rounded-bl-xl border-b border-l border-emerald-400/40 bg-emerald-500/25 px-3 py-1 text-[10px] font-black tracking-wider text-emerald-200 uppercase">
            Hands-Free
          </div>
          <div className="mb-5 flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 text-slate-950 shadow-lg shadow-emerald-500/40 transition-transform group-hover:scale-110">
            <Stethoscope className="size-7 stroke-[2.5]" />
          </div>
          <h3 className="text-xl font-black text-white transition-colors group-hover:text-emerald-300">
            Hands-Free Voice AI
          </h3>
          <p className="mt-2.5 text-xs leading-relaxed font-medium text-white/90 md:text-sm">
            Designed for rural families, senior citizens, and ASHA health workers. Simply speak
            naturally to receive empathetic health guidance.
          </p>
        </div>

        {/* Card 2 */}
        <div className="group relative overflow-hidden rounded-[28px] border border-white/25 bg-black/25 p-7 shadow-xl backdrop-blur-md transition-all duration-300 hover:-translate-y-1.5 hover:border-cyan-400/60 hover:bg-black/40 hover:shadow-[0_20px_40px_rgba(6,182,212,0.25)]">
          <div className="absolute top-0 right-0 rounded-bl-xl border-b border-l border-cyan-400/40 bg-cyan-500/25 px-3 py-1 text-[10px] font-black tracking-wider text-cyan-200 uppercase">
            Real-Time
          </div>
          <div className="mb-5 flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 to-teal-600 text-slate-950 shadow-lg shadow-cyan-500/40 transition-transform group-hover:scale-110">
            <Zap className="size-7 stroke-[2.5]" />
          </div>
          <h3 className="text-xl font-black text-white transition-colors group-hover:text-cyan-300">
            Murf Falcon Engine
          </h3>
          <p className="mt-2.5 text-xs leading-relaxed font-medium text-white/90 md:text-sm">
            Ultra-low latency streaming voice pipeline powered by Murf Falcon TTS & LiveKit for
            human-like conversational speed.
          </p>
        </div>

        {/* Card 3 */}
        <div className="group relative overflow-hidden rounded-[28px] border border-white/25 bg-black/25 p-7 shadow-xl backdrop-blur-md transition-all duration-300 hover:-translate-y-1.5 hover:border-teal-400/60 hover:bg-black/40 hover:shadow-[0_20px_40px_rgba(20,184,166,0.25)]">
          <div className="absolute top-0 right-0 rounded-bl-xl border-b border-l border-teal-400/40 bg-teal-500/25 px-3 py-1 text-[10px] font-black tracking-wider text-teal-200 uppercase">
            Bharat Dialects
          </div>
          <div className="mb-5 flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-400 to-emerald-600 text-slate-950 shadow-lg shadow-teal-500/40 transition-transform group-hover:scale-110">
            <Globe className="size-7 stroke-[2.5]" />
          </div>
          <h3 className="text-xl font-black text-white transition-colors group-hover:text-teal-300">
            Multilingual Voice AI
          </h3>
          <p className="mt-2.5 text-xs leading-relaxed font-medium text-white/90 md:text-sm">
            Fluently understands Indian accents, regional dialects, and code-mixed speech without
            requiring complex text input.
          </p>
        </div>
      </section>

      {/* How It Works Visual Process Grid (Lightened 20% Translucent Glass) */}
      <section className="relative w-full overflow-hidden rounded-[32px] border border-white/25 bg-black/25 p-8 text-center shadow-xl backdrop-blur-md md:p-10">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-teal-500/40 bg-teal-500/20 px-4 py-1.5 text-xs font-bold text-teal-300">
          <Activity className="size-4 text-teal-400" />
          <span>Simple 3-Step Process</span>
        </div>
        <h2 className="text-2xl font-black tracking-tight text-white md:text-3xl">
          How ArogyaSaathi Works
        </h2>
        <p className="mt-1 text-xs text-white/70 md:text-sm">
          Empathetic health guidance in 3 easy steps
        </p>

        <div className="relative mt-8 grid grid-cols-1 gap-6 sm:grid-cols-3">
          <div className="flex flex-col items-center rounded-2xl border border-white/10 bg-white/5 p-6 transition-all duration-300 hover:border-teal-400/50 hover:bg-white/10">
            <div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-400 to-emerald-500 text-lg font-black text-slate-950 shadow-lg">
              1
            </div>
            <h4 className="text-base font-extrabold text-white">Tap Start Consultation</h4>
            <p className="mt-2 text-xs leading-relaxed text-white/75">
              Click the primary CTA button or Orb to open your encrypted voice room instantly.
            </p>
          </div>

          <div className="flex flex-col items-center rounded-2xl border border-white/10 bg-white/5 p-6 transition-all duration-300 hover:border-teal-400/50 hover:bg-white/10">
            <div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-400 to-emerald-500 text-lg font-black text-slate-950 shadow-lg">
              2
            </div>
            <h4 className="text-base font-extrabold text-white">Speak Your Query</h4>
            <p className="mt-2 text-xs leading-relaxed text-white/75">
              Describe symptoms, medicine questions, diet, or wellness concerns naturally.
            </p>
          </div>

          <div className="flex flex-col items-center rounded-2xl border border-white/10 bg-white/5 p-6 transition-all duration-300 hover:border-teal-400/50 hover:bg-white/10">
            <div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-400 to-emerald-500 text-lg font-black text-slate-950 shadow-lg">
              3
            </div>
            <h4 className="text-base font-extrabold text-white">Receive Voice Guidance</h4>
            <p className="mt-2 text-xs leading-relaxed text-white/75">
              Listen to clear, spoken voice answers with an instant live written transcript.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
