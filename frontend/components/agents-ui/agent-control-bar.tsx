'use client';

import { type ComponentProps, useEffect, useRef, useState } from 'react';
import { Track } from 'livekit-client';
import {
  ChevronDown,
  Loader,
  MessageSquareTextIcon,
  Mic,
  MicOff,
  PhoneOff,
  SendHorizontal,
} from 'lucide-react';
import { type MotionProps, motion } from 'motion/react';
import { useChat, useMediaDeviceSelect } from '@livekit/components-react';
import { AgentDisconnectButton } from '@/components/agents-ui/agent-disconnect-button';
import { AgentTrackControl } from '@/components/agents-ui/agent-track-control';
import {
  AgentTrackToggle,
  agentTrackToggleVariants,
} from '@/components/agents-ui/agent-track-toggle';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Toggle } from '@/components/ui/toggle';
import {
  type UseInputControlsProps,
  useInputControls,
  usePublishPermissions,
} from '@/hooks/agents-ui/use-agent-control-bar';
import { cn } from '@/lib/shadcn/utils';

const LK_TOGGLE_VARIANT_1 = [
  'data-[state=off]:bg-accent data-[state=off]:hover:bg-foreground/10',
  'data-[state=off]:[&_~_button]:bg-accent data-[state=off]:[&_~_button]:hover:bg-foreground/10',
  'data-[state=off]:border-border data-[state=off]:hover:border-foreground/12',
  'data-[state=off]:[&_~_button]:border-border data-[state=off]:[&_~_button]:hover:border-foreground/12',
  'data-[state=off]:text-destructive data-[state=off]:hover:text-destructive data-[state=off]:focus:text-destructive',
  'data-[state=off]:focus-visible:ring-foreground/12 data-[state=off]:focus-visible:border-ring',
  'dark:data-[state=off]:[&_~_button]:bg-accent dark:data-[state=off]:[&_~_button]:hover:bg-foreground/10',
];

const LK_TOGGLE_VARIANT_2 = [
  'data-[state=off]:bg-accent data-[state=off]:hover:bg-foreground/10',
  'data-[state=off]:border-border data-[state=off]:hover:border-foreground/12',
  'data-[state=off]:focus-visible:border-ring data-[state=off]:focus-visible:ring-foreground/12',
  'data-[state=off]:text-foreground data-[state=off]:hover:text-foreground data-[state=off]:focus:text-foreground',
  'data-[state=on]:bg-blue-500/20 data-[state=on]:hover:bg-blue-500/30',
  'data-[state=on]:border-blue-700/10 data-[state=on]:text-blue-700 data-[state=on]:ring-blue-700/30',
  'data-[state=on]:focus-visible:border-blue-700/50',
  'dark:data-[state=on]:bg-blue-500/20 dark:data-[state=on]:text-blue-300',
];

const MOTION_PROPS: MotionProps = {
  variants: {
    hidden: {
      height: 0,
      opacity: 0,
      marginBottom: 0,
    },
    visible: {
      height: 'auto',
      opacity: 1,
      marginBottom: 12,
    },
  },
  initial: 'hidden',
  transition: {
    duration: 0.3,
    ease: 'easeOut',
  },
};

interface AgentChatInputProps {
  chatOpen: boolean;
  onSend?: (message: string) => void;
  className?: string;
}

function AgentChatInput({ chatOpen, onSend = async () => {}, className }: AgentChatInputProps) {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [isSending, setIsSending] = useState(false);
  const [message, setMessage] = useState<string>('');
  const isDisabled = isSending || message.trim().length === 0;

  const handleSend = async () => {
    if (isDisabled) {
      return;
    }

    try {
      setIsSending(true);
      await onSend(message.trim());
      setMessage('');
    } catch (error) {
      console.error(error);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = async (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleButtonClick = async () => {
    if (isDisabled) return;
    await handleSend();
  };

  useEffect(() => {
    if (chatOpen) return;
    // when not disabled refocus on input
    inputRef.current?.focus();
  }, [chatOpen]);

  return (
    <div className={cn('mb-3 flex grow items-end gap-2 rounded-md pl-1 text-sm', className)}>
      <textarea
        autoFocus
        ref={inputRef}
        value={message}
        disabled={!chatOpen || isSending}
        placeholder="Type something..."
        onKeyDown={handleKeyDown}
        onChange={(e) => setMessage(e.target.value)}
        className="field-sizing-content max-h-16 min-h-8 flex-1 resize-none py-2 [scrollbar-width:thin] focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
      />
      <Button
        size="icon"
        type="button"
        disabled={isDisabled}
        variant={isDisabled ? 'secondary' : 'default'}
        title={isSending ? 'Sending...' : 'Send'}
        onClick={handleButtonClick}
        className="self-end disabled:cursor-not-allowed"
      >
        {isSending ? <Loader className="animate-spin" /> : <SendHorizontal />}
      </Button>
    </div>
  );
}

/** Configuration for which controls to display in the AgentControlBar. */
export interface AgentControlBarControls {
  /**
   * Whether to show the leave/disconnect button.
   *
   * @defaultValue true
   */
  leave?: boolean;
  /**
   * Whether to show the camera toggle control.
   *
   * @defaultValue true (if camera publish permission is granted)
   */
  camera?: boolean;
  /**
   * Whether to show the microphone toggle control.
   *
   * @defaultValue true (if microphone publish permission is granted)
   */
  microphone?: boolean;
  /**
   * Whether to show the screen share toggle control.
   *
   * @defaultValue true (if screen share publish permission is granted)
   */
  screenShare?: boolean;
  /**
   * Whether to show the chat toggle control.
   *
   * @defaultValue true (if data publish permission is granted)
   */
  chat?: boolean;
}

export interface AgentControlBarProps extends UseInputControlsProps {
  /**
   * The visual style of the control bar.
   *
   * @default 'default'
   */
  variant?: 'default' | 'outline' | 'livekit';
  /**
   * This takes an object with the following keys: `leave`, `microphone`, `screenShare`, `camera`,
   * `chat`. Each key maps to a boolean value that determines whether the control is displayed.
   *
   * @default
   * {
   *   leave: true,
   *   microphone: true,
   *   screenShare: true,
   *   camera: true,
   *   chat: true,
   * }
   */
  controls?: AgentControlBarControls;
  /**
   * Whether to save user choices.
   *
   * @default true
   */
  saveUserChoices?: boolean;
  /**
   * Whether the agent is connected to a session.
   *
   * @default false
   */
  isConnected?: boolean;
  /**
   * Whether the chat input interface is open.
   *
   * @default false
   */
  isChatOpen?: boolean;
  /** The callback for when the user disconnects. */
  onDisconnect?: () => void;
  /** The callback for when the chat is opened or closed. */
  onIsChatOpenChange?: (open: boolean) => void;
  /** The callback for when a device error occurs. */
  onDeviceError?: (error: { source: Track.Source; error: Error }) => void;
}

/**
 * A control bar specifically designed for voice assistant interfaces. Provides controls for
 * microphone, camera, screen share, chat, and disconnect. Includes an expandable chat input for
 * text-based interaction with the agent.
 *
 * @example
 *
 * ```tsx
 * <AgentControlBar
 *   variant="livekit"
 *   isConnected={true}
 *   onDisconnect={() => handleDisconnect()}
 *   controls={{
 *     microphone: true,
 *     camera: true,
 *     screenShare: false,
 *     chat: true,
 *     leave: true,
 *   }}
 * />;
 * ```
 *
 * @extends ComponentProps<'div'>
 */
export function AgentControlBar({
  variant = 'default',
  controls,
  isChatOpen = false,
  isConnected = false,
  saveUserChoices = true,
  onDisconnect,
  onDeviceError,
  onIsChatOpenChange,
  className,
  ...props
}: AgentControlBarProps & ComponentProps<'div'>) {
  const { send } = useChat();
  const publishPermissions = usePublishPermissions();
  const [isChatOpenUncontrolled, setIsChatOpenUncontrolled] = useState(isChatOpen);
  const {
    microphoneTrack,
    cameraToggle,
    microphoneToggle,
    screenShareToggle,
    handleAudioDeviceChange,
    handleVideoDeviceChange,
    handleMicrophoneDeviceSelectError,
    handleCameraDeviceSelectError,
  } = useInputControls({ onDeviceError, saveUserChoices });

  const handleSendMessage = async (message: string) => {
    await send(message);
  };

  const visibleControls = {
    leave: controls?.leave ?? true,
    microphone: controls?.microphone ?? publishPermissions.microphone,
    screenShare: controls?.screenShare ?? publishPermissions.screenShare,
    camera: controls?.camera ?? publishPermissions.camera,
    chat: controls?.chat ?? publishPermissions.data,
  };

  const isEmpty = Object.values(visibleControls).every((value) => !value);

  if (isEmpty) {
    console.warn('AgentControlBar: `visibleControls` contains only false values.');
    return null;
  }

  const {
    devices: audioDevices,
    activeDeviceId: activeAudioDeviceId,
    setActiveMediaDevice: setActiveAudioDevice,
  } = useMediaDeviceSelect({ kind: 'audioinput' });

  return (
    <div
      aria-label="Voice assistant controls"
      className={cn(
        'bg-card/95 border-border/80 flex w-full items-center justify-between gap-3 rounded-full border p-2 shadow-2xl backdrop-blur-2xl md:px-4',
        className
      )}
      {...props}
    >
      {/* Sleek Inline Text Input for Type or Voice */}
      <div className="bg-muted/50 dark:bg-muted/30 border-border/50 flex flex-1 items-center gap-2 rounded-full border px-3.5 py-1.5 transition-all focus-within:border-teal-500/60 focus-within:ring-2 focus-within:ring-teal-500/20">
        <input
          type="text"
          placeholder="Ask ArogyaSaathi anything..."
          onKeyDown={(e) => {
            if (e.key === 'Enter' && e.currentTarget.value.trim()) {
              handleSendMessage(e.currentTarget.value.trim());
              e.currentTarget.value = '';
            }
          }}
          className="text-foreground placeholder:text-muted-foreground/70 w-full bg-transparent text-xs font-medium focus:outline-none md:text-sm"
        />
        <Button
          size="icon-xs"
          variant="ghost"
          onClick={(e) => {
            const input = e.currentTarget.previousElementSibling as HTMLInputElement;
            if (input && input.value.trim()) {
              handleSendMessage(input.value.trim());
              input.value = '';
            }
          }}
          className="group cursor-pointer rounded-full text-teal-600 transition-all hover:scale-110 hover:bg-teal-500/20 active:scale-95 dark:text-teal-400"
          aria-label="Send message"
        >
          <SendHorizontal className="size-4 transition-transform group-hover:translate-x-0.5" />
        </Button>
      </div>

      {/* Action Controls Side-by-Side */}
      <div className="flex items-center gap-2">
        {/* Toggle Microphone + Device Selector Group - Executive Dual Pill */}
        {visibleControls.microphone && (
          <div className="flex items-center rounded-full border border-teal-500/40 bg-teal-500/15 p-0.5 shadow-sm transition-all hover:border-teal-500/60">
            <Button
              size="icon"
              variant="ghost"
              onClick={() => microphoneToggle.toggle()}
              disabled={microphoneToggle.pending}
              className={cn(
                'flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full transition-all hover:scale-105 active:scale-95',
                microphoneToggle.enabled
                  ? 'bg-teal-500/30 text-teal-300 hover:bg-teal-500/45'
                  : 'bg-rose-500/30 text-rose-300 hover:bg-rose-500/45'
              )}
              aria-label={microphoneToggle.enabled ? 'Mute microphone' : 'Unmute microphone'}
            >
              {microphoneToggle.enabled ? (
                <Mic className="size-4" />
              ) : (
                <MicOff className="size-4" />
              )}
            </Button>

            {/* Microphone Device Selection Dropdown Trigger - Exactly ONE Arrow */}
            {audioDevices.length > 0 && (
              <Select
                value={activeAudioDeviceId}
                onValueChange={(deviceId) => setActiveAudioDevice(deviceId)}
              >
                <SelectTrigger className="flex h-9 w-6 cursor-pointer items-center justify-center rounded-r-full border-0 bg-transparent p-0 text-teal-300 shadow-none hover:bg-teal-500/30 hover:text-white focus:ring-0">
                  <SelectValue placeholder="" />
                </SelectTrigger>
                <SelectContent
                  position="popper"
                  align="end"
                  className="bg-popover/95 border-border z-50 min-w-[14rem] rounded-2xl border p-1.5 shadow-2xl backdrop-blur-xl"
                >
                  {audioDevices.map((device) => (
                    <SelectItem
                      key={device.deviceId}
                      value={device.deviceId}
                      className="cursor-pointer rounded-xl py-2 text-xs font-medium hover:bg-teal-500/10 focus:bg-teal-500/15"
                    >
                      {device.label || `Microphone (${device.deviceId.slice(0, 5)})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        )}

        {/* Toggle Transcript */}
        {visibleControls.chat && (
          <Toggle
            variant="default"
            pressed={isChatOpen || isChatOpenUncontrolled}
            aria-label="Toggle transcript"
            onPressedChange={(state) => {
              if (!onIsChatOpenChange) setIsChatOpenUncontrolled(state);
              else onIsChatOpenChange(state);
            }}
            className="bg-muted/60 hover:bg-muted text-foreground cursor-pointer rounded-full p-2.5 transition-all hover:scale-105 active:scale-95"
          >
            <MessageSquareTextIcon className="size-4" />
          </Toggle>
        )}

        {/* Premium Animated END CONVERSATION Button */}
        {visibleControls.leave && (
          <Button
            onClick={onDisconnect}
            disabled={!isConnected}
            className="group relative flex cursor-pointer items-center gap-2 overflow-hidden rounded-full border border-rose-400/40 bg-gradient-to-r from-rose-600 via-red-600 to-rose-700 px-4 py-2.5 text-xs font-extrabold tracking-wider text-white uppercase shadow-lg shadow-rose-600/30 transition-all duration-300 hover:scale-[1.04] hover:shadow-rose-600/50 active:scale-95 md:px-5"
            aria-label="End conversation"
          >
            <span className="pointer-events-none absolute inset-0 rounded-full bg-white/20 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
            <PhoneOff className="size-4 text-white transition-transform duration-300 group-hover:scale-110 group-hover:rotate-12" />
            <span className="relative z-10 hidden sm:inline">END CONVERSATION</span>
            <span className="relative z-10 inline sm:hidden">END</span>
          </Button>
        )}
      </div>
    </div>
  );
}
