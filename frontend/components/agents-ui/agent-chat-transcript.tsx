'use client';

import { type ComponentProps } from 'react';
import { AnimatePresence } from 'motion/react';
import { type AgentState, type ReceivedMessage } from '@livekit/components-react';
import { AgentChatIndicator } from '@/components/agents-ui/agent-chat-indicator';
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from '@/components/ai-elements/conversation';
import { Message, MessageContent, MessageResponse } from '@/components/ai-elements/message';

/**
 * Props for the AgentChatTranscript component.
 */
export interface AgentChatTranscriptProps extends ComponentProps<'div'> {
  /**
   * The current state of the agent. When 'thinking', displays a loading indicator.
   */
  agentState?: AgentState;
  /**
   * Array of messages to display in the transcript.
   * @defaultValue []
   */
  messages?: ReceivedMessage[];
  /**
   * Additional CSS class names to apply to the conversation container.
   */
  className?: string;
}

/**
 * A chat transcript component that displays a conversation between the user and agent.
 * Shows messages with timestamps and origin indicators, plus a thinking indicator
 * when the agent is processing.
 *
 * @extends ComponentProps<'div'>
 *
 * @example
 * ```tsx
 * <AgentChatTranscript
 *   agentState={agentState}
 *   messages={chatMessages}
 * />
 * ```
 */
export function AgentChatTranscript({
  agentState,
  messages = [],
  className,
  ...props
}: AgentChatTranscriptProps) {
  return (
    <Conversation className={className} {...props}>
      <ConversationContent>
        {messages.map((receivedMessage) => {
          const { id, timestamp, from, message } = receivedMessage;
          const locale = navigator?.language ?? 'en-US';
          const isUser = from?.isLocal;
          const messageOrigin = isUser ? 'user' : 'assistant';
          const time = new Date(timestamp);
          const timeString = time.toLocaleTimeString(locale, { timeStyle: 'short' });

          return (
            <Message key={id} title={timeString} from={messageOrigin} className="my-2">
              <div className={`mb-1 text-xs font-bold tracking-wide flex items-center gap-1.5 ${isUser ? 'justify-end text-teal-600 dark:text-teal-400' : 'justify-start text-emerald-600 dark:text-emerald-400'}`}>
                {!isUser && <span className="size-2 rounded-full bg-emerald-500 inline-block animate-pulse" />}
                <span>{isUser ? 'You' : 'ArogyaSaathi'}</span>
                <span className="text-[10px] font-normal text-muted-foreground">({timeString})</span>
              </div>
              <MessageContent className={isUser ? 'bg-muted/60 dark:bg-muted/40 border-0 rounded-2xl px-4 py-2.5 text-foreground max-w-[85%]' : 'bg-transparent border-0 p-0 text-foreground/95 leading-relaxed text-sm md:text-base max-w-full font-normal'}>
                <MessageResponse>{message}</MessageResponse>
              </MessageContent>
            </Message>
          );
        })}
        <AnimatePresence>
          {agentState === 'thinking' && <AgentChatIndicator size="sm" />}
        </AnimatePresence>
      </ConversationContent>
      <ConversationScrollButton />
    </Conversation>
  );
}
