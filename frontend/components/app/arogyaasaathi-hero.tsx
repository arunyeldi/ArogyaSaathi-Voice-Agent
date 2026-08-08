'use client';

import React from 'react';
import { Loader2, Mic, CheckCircle2, HeartPulse, ShieldCheck, Zap, Globe, Stethoscope, ArrowRight, Activity, ChevronDown } from 'lucide-react';
import { motion } from 'motion/react';
import { Button } from '@/components/ui/button';
import { ArogyaSaathiVoiceOrb } from '@/components/app/arogyaasaathi-voice-orb';

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

  return (
    <div className="w-full max-w-5xl mx-auto px-4 pt-14 pb-6 md:pt-16 md:pb-8 flex flex-col items-center gap-6">
      {/* Central State-of-the-Art Hero Card (Crystal 10% Translucent Glass - Fits 100% Above Fold) */}
      <section className="flex w-full flex-col items-center text-center py-6 md:py-8 px-5 md:px-10 rounded-[32px] border border-white/25 bg-black/10 dark:bg-black/15 backdrop-blur-sm shadow-[0_0_80px_rgba(13,148,136,0.25)] relative overflow-hidden transition-all duration-500 hover:bg-black/20">
        {/* Ambient Vibrant Glow Orbs */}
        <div className="absolute -top-32 size-[450px] rounded-full bg-gradient-to-r from-teal-500/20 via-emerald-500/15 to-cyan-500/20 blur-[100px] pointer-events-none" />
        <div className="absolute -bottom-32 size-[350px] rounded-full bg-gradient-to-r from-emerald-500/15 via-teal-600/15 to-indigo-500/15 blur-[90px] pointer-events-none" />

        {/* Background Dual Counter-Scrolling Marquee Cards (Subtle Ambient Motion at Edges) */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-0 select-none">
          {/* Row 1: Top Edge (Left to Right) */}
          <div className="absolute top-2.5 left-0 right-0 opacity-20">
            <div className="flex w-max animate-marquee-reverse space-x-6 text-[10px] font-medium text-teal-200">
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
                <span key={idx} className="bg-black/40 border border-teal-500/30 px-3 py-0.5 rounded-full backdrop-blur-xs whitespace-nowrap">
                  {item}
                </span>
              ))}
            </div>
          </div>

          {/* Row 2: Bottom Edge (Right to Left) */}
          <div className="absolute bottom-2.5 left-0 right-0 opacity-20">
            <div className="flex w-max animate-marquee space-x-6 text-[10px] font-medium text-emerald-200">
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
                <span key={idx} className="bg-black/40 border border-emerald-500/30 px-3 py-0.5 rounded-full backdrop-blur-xs whitespace-nowrap">
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
          className="mb-2 relative z-10 cursor-pointer hover:scale-110 active:scale-95 transition-all duration-300 group"
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
            <div className="absolute size-24 md:size-30 rounded-full bg-gradient-to-r from-teal-400/50 to-emerald-400/50 blur-xl animate-pulse group-hover:scale-125 transition-transform" />
            <ArogyaSaathiVoiceOrb state={orbState} size="lg" />
          </div>
          <div className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-black text-teal-200 bg-teal-500/30 border border-teal-300/60 px-3 py-1 rounded-full backdrop-blur-md group-hover:bg-teal-500/40 transition-all shadow-md">
            <span className="size-2 rounded-full bg-emerald-400 animate-ping" />
            <span>{isConnecting ? 'Connecting securely...' : wasEnded ? 'Click Orb to Start Again' : 'Tap Orb to Start Voice Session'}</span>
          </div>
        </motion.div>

        {/* Status Badge */}
        {wasEnded ? (
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-emerald-500/25 px-3.5 py-1 text-[11px] font-bold text-emerald-200 border border-emerald-400/50 shadow-md backdrop-blur-md">
            <CheckCircle2 className="size-3.5 text-emerald-400" />
            <span>Consultation Complete — Thank you for using ArogyaSaathi</span>
          </div>
        ) : (
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-teal-500/25 px-3.5 py-1 text-[11px] font-extrabold text-teal-100 border border-teal-400/50 shadow-md backdrop-blur-md">
            <HeartPulse className="size-3.5 text-teal-400 animate-pulse" />
            <span>VoiceForBharat • AI Health Companion for Bharat 🇮🇳</span>
          </div>
        )}

        {/* Brand Headline */}
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-black leading-tight tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-teal-100 to-emerald-200 drop-shadow-[0_4px_24px_rgba(20,184,166,0.4)]">
          ArogyaSaathi
        </h1>
        <p className="mt-1 text-sm md:text-lg font-bold bg-gradient-to-r from-teal-200 via-emerald-200 to-cyan-200 bg-clip-text text-transparent tracking-wide">
          Your Intelligent AI Voice Health Companion
        </p>

        <p className="mt-2 text-xs md:text-sm text-white/95 max-w-lg mx-auto leading-relaxed font-semibold drop-shadow-sm">
          Instant, empathetic health guidance through natural voice conversations. Speak effortlessly in your natural language—no complex typing or hospital navigation required.
        </p>

        {/* Primary CTA Button - 100% Completely Visible Above the Fold */}
        <div className="mt-4 sm:mt-5 flex flex-col sm:flex-row items-center justify-center gap-4 relative z-10">
          <Button
            size="lg"
            disabled={isConnecting}
            onClick={onStartCall}
            className="group relative overflow-hidden w-68 sm:w-80 h-13 text-sm md:text-base font-black rounded-full bg-gradient-to-r from-teal-400 via-emerald-400 to-cyan-400 text-slate-950 shadow-[0_0_40px_rgba(20,184,166,0.6)] hover:shadow-[0_0_60px_rgba(20,184,166,0.9)] hover:scale-[1.05] active:scale-95 transition-all duration-300 cursor-pointer border-2 border-white/60"
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
                <Mic className="mr-2.5 size-5 text-slate-950 group-hover:scale-125 group-hover:animate-pulse transition-transform duration-300" />
                <span>{wasEnded ? 'Start Again' : startButtonText}</span>
              </>
            )}
          </Button>
        </div>

        {/* High-Impact Stat Highlights */}
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2.5 text-[11px] font-bold text-white">
          <span className="flex items-center gap-1.5 bg-black/30 border border-white/25 px-3 py-1 rounded-full backdrop-blur-md shadow-sm">
            <Zap className="size-3 text-teal-400" />
            <span>&lt; 200ms Voice Latency</span>
          </span>
          <span className="flex items-center gap-1.5 bg-black/30 border border-white/25 px-3 py-1 rounded-full backdrop-blur-md shadow-sm">
            <ShieldCheck className="size-3 text-emerald-400" />
            <span>256-bit Encrypted Audio</span>
          </span>
          <span className="flex items-center gap-1.5 bg-black/30 border border-white/25 px-3 py-1 rounded-full backdrop-blur-md shadow-sm">
            <Globe className="size-3 text-cyan-400" />
            <span>Multilingual Voice AI</span>
          </span>
        </div>

        {/* Interactive Sample Voice Query Prompts (Click to Try Immediately) */}
        <div className="mt-4 flex flex-col items-center gap-1.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-teal-300/90">Try asking ArogyaSaathi:</span>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {[
              '💡 "What are natural remedies for fever?"',
              '💡 "How do I take blood pressure medication?"',
              '💡 "Explain diabetes symptoms in simple language"',
            ].map((query, idx) => (
              <button
                key={idx}
                onClick={onStartCall}
                className="text-xs font-medium text-white/90 bg-white/10 hover:bg-teal-500/20 border border-white/20 hover:border-teal-400/50 px-3 py-1.5 rounded-full backdrop-blur-md transition-all cursor-pointer hover:scale-105 active:scale-95 text-left"
              >
                {query}
              </button>
            ))}
          </div>
        </div>

        {/* Bouncing Scroll Down Indicator Pill */}
        <div className="mt-8 flex items-center justify-center animate-bounce cursor-pointer opacity-80 hover:opacity-100 transition-opacity">
          <span className="text-[11px] font-bold text-teal-300 uppercase tracking-widest flex items-center gap-1 bg-black/40 border border-white/15 px-3 py-1 rounded-full backdrop-blur-md">
            <span>Scroll for Features</span>
            <ChevronDown className="size-3.5 text-teal-400" />
          </span>
        </div>
      </section>

      {/* Feature Showcase Grid (Lightened 20% Translucent Glass) */}
      <section className="w-full grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1 */}
        <div className="group rounded-[28px] border border-white/25 bg-black/25 p-7 backdrop-blur-md shadow-xl transition-all duration-300 hover:border-emerald-400/60 hover:bg-black/40 hover:-translate-y-1.5 hover:shadow-[0_20px_40px_rgba(16,185,129,0.25)] relative overflow-hidden">
          <div className="absolute top-0 right-0 px-3 py-1 bg-emerald-500/25 border-b border-l border-emerald-400/40 rounded-bl-xl text-[10px] font-black uppercase text-emerald-200 tracking-wider">
            Hands-Free
          </div>
          <div className="size-14 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 text-slate-950 flex items-center justify-center mb-5 shadow-lg shadow-emerald-500/40 group-hover:scale-110 transition-transform">
            <Stethoscope className="size-7 stroke-[2.5]" />
          </div>
          <h3 className="text-xl font-black text-white group-hover:text-emerald-300 transition-colors">Hands-Free Voice AI</h3>
          <p className="mt-2.5 text-xs md:text-sm text-white/90 leading-relaxed font-medium">
            Designed for rural families, senior citizens, and ASHA health workers. Simply speak naturally to receive empathetic health guidance.
          </p>
        </div>

        {/* Card 2 */}
        <div className="group rounded-[28px] border border-white/25 bg-black/25 p-7 backdrop-blur-md shadow-xl transition-all duration-300 hover:border-cyan-400/60 hover:bg-black/40 hover:-translate-y-1.5 hover:shadow-[0_20px_40px_rgba(6,182,212,0.25)] relative overflow-hidden">
          <div className="absolute top-0 right-0 px-3 py-1 bg-cyan-500/25 border-b border-l border-cyan-400/40 rounded-bl-xl text-[10px] font-black uppercase text-cyan-200 tracking-wider">
            Real-Time
          </div>
          <div className="size-14 rounded-2xl bg-gradient-to-br from-cyan-400 to-teal-600 text-slate-950 flex items-center justify-center mb-5 shadow-lg shadow-cyan-500/40 group-hover:scale-110 transition-transform">
            <Zap className="size-7 stroke-[2.5]" />
          </div>
          <h3 className="text-xl font-black text-white group-hover:text-cyan-300 transition-colors">Murf Falcon Engine</h3>
          <p className="mt-2.5 text-xs md:text-sm text-white/90 leading-relaxed font-medium">
            Ultra-low latency streaming voice pipeline powered by Murf Falcon TTS & LiveKit for human-like conversational speed.
          </p>
        </div>

        {/* Card 3 */}
        <div className="group rounded-[28px] border border-white/25 bg-black/25 p-7 backdrop-blur-md shadow-xl transition-all duration-300 hover:border-teal-400/60 hover:bg-black/40 hover:-translate-y-1.5 hover:shadow-[0_20px_40px_rgba(20,184,166,0.25)] relative overflow-hidden">
          <div className="absolute top-0 right-0 px-3 py-1 bg-teal-500/25 border-b border-l border-teal-400/40 rounded-bl-xl text-[10px] font-black uppercase text-teal-200 tracking-wider">
            Bharat Dialects
          </div>
          <div className="size-14 rounded-2xl bg-gradient-to-br from-teal-400 to-emerald-600 text-slate-950 flex items-center justify-center mb-5 shadow-lg shadow-teal-500/40 group-hover:scale-110 transition-transform">
            <Globe className="size-7 stroke-[2.5]" />
          </div>
          <h3 className="text-xl font-black text-white group-hover:text-teal-300 transition-colors">Multilingual Voice AI</h3>
          <p className="mt-2.5 text-xs md:text-sm text-white/90 leading-relaxed font-medium">
            Fluently understands Indian accents, regional dialects, and code-mixed speech without requiring complex text input.
          </p>
        </div>
      </section>

      {/* How It Works Visual Process Grid (Lightened 20% Translucent Glass) */}
      <section className="w-full rounded-[32px] border border-white/25 bg-black/25 p-8 md:p-10 text-center backdrop-blur-md shadow-xl relative overflow-hidden">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-teal-500/20 border border-teal-500/40 text-teal-300 text-xs font-bold mb-3">
          <Activity className="size-4 text-teal-400" />
          <span>Simple 3-Step Process</span>
        </div>
        <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight">How ArogyaSaathi Works</h2>
        <p className="mt-1 text-xs md:text-sm text-white/70">Empathetic health guidance in 3 easy steps</p>

        <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-6 relative">
          <div className="flex flex-col items-center p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-teal-400/50 hover:bg-white/10 transition-all duration-300">
            <div className="size-12 rounded-2xl bg-gradient-to-br from-teal-400 to-emerald-500 text-slate-950 font-black flex items-center justify-center text-lg shadow-lg mb-4">1</div>
            <h4 className="font-extrabold text-base text-white">Tap Start Consultation</h4>
            <p className="text-xs text-white/75 mt-2 leading-relaxed">Click the primary CTA button or Orb to open your encrypted voice room instantly.</p>
          </div>

          <div className="flex flex-col items-center p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-teal-400/50 hover:bg-white/10 transition-all duration-300">
            <div className="size-12 rounded-2xl bg-gradient-to-br from-teal-400 to-emerald-500 text-slate-950 font-black flex items-center justify-center text-lg shadow-lg mb-4">2</div>
            <h4 className="font-extrabold text-base text-white">Speak Your Query</h4>
            <p className="text-xs text-white/75 mt-2 leading-relaxed">Describe symptoms, medicine questions, diet, or wellness concerns naturally.</p>
          </div>

          <div className="flex flex-col items-center p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-teal-400/50 hover:bg-white/10 transition-all duration-300">
            <div className="size-12 rounded-2xl bg-gradient-to-br from-teal-400 to-emerald-500 text-slate-950 font-black flex items-center justify-center text-lg shadow-lg mb-4">3</div>
            <h4 className="font-extrabold text-base text-white">Receive Voice Guidance</h4>
            <p className="text-xs text-white/75 mt-2 leading-relaxed">Listen to clear, spoken voice answers with an instant live written transcript.</p>
          </div>
        </div>
      </section>
    </div>
  );
}


