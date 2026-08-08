'use client';

import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, type MotionProps, motion } from 'motion/react';
import { useAgent, useSessionContext, useSessionMessages } from '@livekit/components-react';
import { Track } from 'livekit-client';
import { AgentChatTranscript } from '@/components/agents-ui/agent-chat-transcript';
import { toast as sonnerToast } from 'sonner';
import {
  AgentControlBar,
  type AgentControlBarControls,
} from '@/components/agents-ui/agent-control-bar';
import { Shimmer } from '@/components/ai-elements/shimmer';
import { cn } from '@/lib/shadcn/utils';
import { Button } from '@/components/ui/button';
import { TileLayout } from './tile-view';
import { ArogyaSaathiAgentStatus } from '@/components/app/arogyaasaathi-agent-status';
import { ArogyaSaathiMicError } from '@/components/app/arogyaasaathi-microphone-error';
import { ArogyaSaathiVoiceOrb } from '@/components/app/arogyaasaathi-voice-orb';

const MotionMessage = motion.create(Shimmer);

const BOTTOM_VIEW_MOTION_PROPS: MotionProps = {
  variants: {
    visible: {
      opacity: 1,
      translateY: '0%',
    },
    hidden: {
      opacity: 0,
      translateY: '100%',
    },
  },
  initial: 'hidden',
  animate: 'visible',
  exit: 'hidden',
  transition: {
    duration: 0.3,
    delay: 0.5,
    ease: 'easeOut',
  },
};

const CHAT_MOTION_PROPS: MotionProps = {
  variants: {
    hidden: {
      opacity: 0,
      transition: {
        ease: 'easeOut',
        duration: 0.3,
      },
    },
    visible: {
      opacity: 1,
      transition: {
        delay: 0.2,
        ease: 'easeOut',
        duration: 0.3,
      },
    },
  },
  initial: 'hidden',
  animate: 'visible',
  exit: 'hidden',
};

const SHIMMER_MOTION_PROPS: MotionProps = {
  variants: {
    visible: {
      opacity: 1,
      transition: {
        ease: 'easeIn',
        duration: 0.5,
        delay: 0.8,
      },
    },
    hidden: {
      opacity: 0,
      transition: {
        ease: 'easeIn',
        duration: 0.5,
        delay: 0,
      },
    },
  },
  initial: 'hidden',
  animate: 'visible',
  exit: 'hidden',
};

interface FadeProps {
  top?: boolean;
  bottom?: boolean;
  className?: string;
}

export function Fade({ top = false, bottom = false, className }: FadeProps) {
  return (
    <div
      className={cn(
        'from-background pointer-events-none h-4 bg-linear-to-b to-transparent',
        top && 'bg-linear-to-b',
        bottom && 'bg-linear-to-t',
        className
      )}
    />
  );
}

export interface AgentSessionView_01Props {
  /**
   * Message shown above the controls before the first chat message is sent.
   *
   * @default 'ArogyaSaathi is listening, speak naturally'
   */
  preConnectMessage?: string;
  supportsChatInput?: boolean;
  supportsVideoInput?: boolean;
  supportsScreenShare?: boolean;
  isPreConnectBufferEnabled?: boolean;

  audioVisualizerType?: 'bar' | 'wave' | 'grid' | 'radial' | 'aura';
  audioVisualizerColor?: `#${string}`;
  audioVisualizerColorShift?: number;
  audioVisualizerBarCount?: number;
  audioVisualizerGridRowCount?: number;
  audioVisualizerGridColumnCount?: number;
  audioVisualizerRadialBarCount?: number;
  audioVisualizerRadialRadius?: number;
  audioVisualizerWaveLineWidth?: number;
  className?: string;
}

export function AgentSessionView_01({
  preConnectMessage = '🎙️ ArogyaSaathi is listening... Speak naturally in your regional language or dialect',
  supportsChatInput = true,
  supportsVideoInput = true,
  supportsScreenShare = true,
  isPreConnectBufferEnabled = true,

  audioVisualizerType,
  audioVisualizerColor,
  audioVisualizerColorShift,
  audioVisualizerBarCount,
  audioVisualizerGridRowCount,
  audioVisualizerGridColumnCount,
  audioVisualizerRadialBarCount,
  audioVisualizerRadialRadius,
  audioVisualizerWaveLineWidth,
  ref,
  className,
  ...props
}: React.ComponentProps<'section'> & AgentSessionView_01Props) {
  const session = useSessionContext();
  const { messages } = useSessionMessages(session);
  const [chatOpen, setChatOpen] = useState(true);
  const [micError, setMicError] = useState<{ visible: boolean; message?: string }>({ visible: false });
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { state: agentState } = useAgent();

  const controls: AgentControlBarControls = {
    leave: true,
    microphone: true,
    chat: supportsChatInput,
    camera: supportsVideoInput,
    screenShare: supportsScreenShare,
  };

  // handle device errors from input controls
  const handleDeviceError = (err: { source: Track.Source; error: Error }) => {
    try {
      if (err?.source === Track.Source.Microphone) {
        const isPermissionDenied =
          err.error?.name === 'NotAllowedError' || /permission|denied/i.test(err.error?.message ?? '');
        if (isPermissionDenied) {
          setMicError({ visible: true, message: 'Microphone access is blocked. Please allow microphone access in your browser settings.' });
          // eslint-disable-next-line no-console
          console.warn('Microphone permission denied:', err.error?.message ?? err.error);
          return;
        }

        sonnerToast.error(`Microphone error: ${err.error?.message ?? String(err.error)}`, { duration: 8_000 });
        return;
      }

      sonnerToast.error(`Device error: ${err.error?.message ?? String(err.error)}`, { duration: 8_000 });
    } catch (e) {
      sonnerToast.error('An unknown device error occurred.');
    }
  };

  useEffect(() => {
    const lastMessage = messages.at(-1);
    const lastMessageIsLocal = lastMessage?.from?.isLocal === true;

    if (scrollAreaRef.current && lastMessageIsLocal) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);


  return (
    <section
      ref={ref}
      className={cn('bg-background relative z-10 h-full w-full overflow-hidden flex flex-col justify-between p-4 md:p-6 gap-4', className)}
      {...props}
    >
      {/* Top Header Bar for Active Health Consultation */}
      <header className="relative z-40 w-full max-w-5xl mx-auto flex items-center justify-between gap-2 border-b border-border/40 pb-3">
        {/* Brand Badge */}
        <div className="flex items-center gap-2 rounded-full bg-teal-500/10 border border-teal-500/20 px-3.5 py-1.5 backdrop-blur-md">
          <span className="relative flex size-2.5">
            <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
            <span className="relative inline-flex size-2.5 rounded-full bg-emerald-500" />
          </span>
          <span className="text-xs font-bold text-teal-700 dark:text-teal-300 tracking-wide">
            ArogyaSaathi Live Session
          </span>
        </div>

        {/* Center Agent Status Pill */}
        <div className="flex items-center">
          <ArogyaSaathiAgentStatus state={agentState} onStartAgain={() => session.start()} />
        </div>

        {/* Right Encrypted Security Badge */}
        <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground font-medium bg-muted/40 border border-border/50 px-3 py-1.5 rounded-full">
          <span className="size-2 rounded-full bg-emerald-500 inline-block" />
          <span>256-bit Encrypted</span>
        </div>
      </header>

      {/* ARIA live region for mic errors */}
      <div id="arogya-mic-error-announce" className="sr-only" aria-live="assertive"></div>

      {/* Microphone Error Overlay */}
      {micError.visible && (
        <ArogyaSaathiMicError
          message={micError.message}
          onRetry={async () => {
            try {
              const stream = await (navigator.mediaDevices as any).getUserMedia({ audio: true });
              stream.getTracks().forEach((t: MediaStreamTrack) => t.stop());
              setMicError({ visible: false });
              sonnerToast.success('Microphone access granted. You can try speaking now.');
            } catch (err: any) {
              setMicError({
                visible: true,
                message: 'Microphone access is still blocked. Please check your browser settings and allow microphone access.',
              });
              // eslint-disable-next-line no-console
              console.warn('Retry mic failed', err);
            }
          }}
        />
      )}

      {/* Main Content Workspace: Divided into 2 Distinct Non-Overlapping Sections */}
      <main className="relative z-20 flex-1 w-full max-w-5xl mx-auto flex flex-col md:flex-row gap-4 overflow-hidden">
        {/* SECTION 1: Voice AI Visualizer Stage Card (Left / Top) */}
        <div className="w-full md:w-5/12 h-60 md:h-full rounded-2xl border border-teal-500/30 bg-card/60 backdrop-blur-xl p-4 shadow-xl flex flex-col items-center justify-between relative overflow-hidden">
          <div className="w-full flex items-center justify-between text-xs text-muted-foreground border-b border-border/30 pb-2">
            <span className="font-semibold text-teal-500 flex items-center gap-1">
              <span className="size-2 rounded-full bg-teal-500 animate-pulse" />
              Voice Stage
            </span>
            <span className="text-[10px] font-mono text-muted-foreground">Murf Falcon + LiveKit</span>
          </div>

          {/* Reactive Visualizer Stage */}
          <div className="relative w-full flex-1 flex items-center justify-center my-2">
            <div className="relative flex items-center justify-center">
              {/* Background Glowing Aura Ring */}
              <div className="absolute size-44 md:size-52 rounded-full bg-gradient-to-r from-teal-500/25 via-emerald-500/15 to-teal-600/25 blur-2xl animate-pulse" />

              {/* Clean Unobstructed Audio Wave Visualizer Stage */}
              <div className="relative z-10 size-48 md:size-56 flex items-center justify-center">
                <TileLayout
                  chatOpen={chatOpen}
                  audioVisualizerType={audioVisualizerType ?? 'aura'}
                  audioVisualizerColor={audioVisualizerColor ?? '#0d9488'}
                  audioVisualizerColorShift={audioVisualizerColorShift}
                  audioVisualizerBarCount={audioVisualizerBarCount}
                  audioVisualizerRadialBarCount={audioVisualizerRadialBarCount}
                  audioVisualizerRadialRadius={audioVisualizerRadialRadius}
                  audioVisualizerGridRowCount={audioVisualizerGridRowCount}
                  audioVisualizerGridColumnCount={audioVisualizerGridColumnCount}
                  audioVisualizerWaveLineWidth={audioVisualizerWaveLineWidth}
                />
              </div>
            </div>
          </div>

          <p className="text-[11px] font-medium text-muted-foreground text-center">
            {agentState === 'speaking'
              ? '🔊 ArogyaSaathi is speaking...'
              : agentState === 'listening'
                ? '🎙️ Speak naturally to consult'
                : '🧠 Processing request...'}
          </p>
        </div>

        {/* SECTION 2: Live Conversation Transcript Panel (Right / Bottom) */}
        <div className="w-full md:w-7/12 flex-1 h-full min-h-[300px] rounded-2xl border border-border/80 bg-card/50 backdrop-blur-xl p-4 shadow-xl flex flex-col justify-between overflow-hidden">
          <div className="flex items-center justify-between border-b border-border/40 pb-2 mb-2">
            <h3 className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <span>💬 Live Consultation Transcript</span>
            </h3>
            <span className="text-[10px] text-muted-foreground font-mono">Real-time voice stream</span>
          </div>

          {/* Transcript Scroll Area */}
          <div className="flex-1 w-full overflow-y-auto pr-1">
            <AnimatePresence>
              {chatOpen && (
                <motion.div
                  {...CHAT_MOTION_PROPS}
                  className="flex h-full w-full flex-col gap-3 transition-opacity duration-300 ease-out"
                >
                  <AgentChatTranscript
                    agentState={agentState}
                    messages={messages}
                    className="w-full"
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>

      {/* Bottom Floating Control Dock */}
      <footer className="relative z-50 w-full max-w-3xl mx-auto pt-2">
        {/* Pre-connect guidance buffer message */}
        {isPreConnectBufferEnabled && (
          <AnimatePresence>
            {messages.length === 0 && (
              <MotionMessage
                key="pre-connect-message"
                duration={2}
                aria-hidden={messages.length > 0}
                {...SHIMMER_MOTION_PROPS}
                className="pointer-events-none mx-auto block w-full max-w-2xl pb-2 text-center text-xs font-semibold text-teal-600 dark:text-teal-400"
              >
                {preConnectMessage}
              </MotionMessage>
            )}
          </AnimatePresence>
        )}

        <div className="bg-card/90 border border-border rounded-full shadow-2xl backdrop-blur-xl p-2 md:px-4">
          <AgentControlBar
            variant="livekit"
            controls={controls}
            isChatOpen={chatOpen}
            isConnected={session.isConnected}
            onDisconnect={session.end}
            onIsChatOpenChange={setChatOpen}
            onDeviceError={handleDeviceError}
          />
        </div>
      </footer>
    </section>
  );
}


