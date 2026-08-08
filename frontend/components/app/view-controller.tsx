'use client';

import { useEffect, useRef, useState } from 'react';
import { ConnectionState } from 'livekit-client';
import { useTheme } from 'next-themes';
import { AnimatePresence, motion } from 'motion/react';
import { useSessionContext } from '@livekit/components-react';
import type { AppConfig } from '@/app-config';
import { AgentSessionView_01 } from '@/components/agents-ui/blocks/agent-session-view-01';
import { WelcomeView } from '@/components/app/welcome-view';

const MotionWelcomeView = motion.create(WelcomeView);
const MotionSessionView = motion.create(AgentSessionView_01);

const VIEW_MOTION_PROPS = {
  variants: {
    visible: {
      opacity: 1,
    },
    hidden: {
      opacity: 0,
    },
  },
  initial: 'hidden',
  animate: 'visible',
  exit: 'hidden',
  transition: {
    duration: 0.15,
    ease: 'easeOut',
  },
};

interface ViewControllerProps {
  appConfig: AppConfig;
}

export function ViewController({ appConfig }: ViewControllerProps) {
  const session = useSessionContext();
  const { isConnected, start, connectionState } = session;
  const isConnecting = connectionState === ConnectionState.Connecting;
  const [isStarting, setIsStarting] = useState(false);
  const showSessionView = isConnected || isConnecting || isStarting;
  const { resolvedTheme } = useTheme();

  const wasConnectedRef = useRef(false);
  const [wasEnded, setWasEnded] = useState(false);

  useEffect(() => {
    if (isConnected) {
      wasConnectedRef.current = true;
      setWasEnded(false);
      setIsStarting(false);
    } else if (wasConnectedRef.current && !isConnected && !isConnecting) {
      setWasEnded(true);
      setIsStarting(false);
    }
  }, [isConnected, isConnecting]);

  const handleStartCall = () => {
    setIsStarting(true);
    setWasEnded(false);
    start();
  };

  return (
    <AnimatePresence mode="popLayout">
      {/* Welcome view (Ready or Call Ended) */}
      {!showSessionView && (
        <MotionWelcomeView
          key="welcome"
          {...VIEW_MOTION_PROPS}
          startButtonText={appConfig.startButtonText}
          isConnecting={isConnecting}
          wasEnded={wasEnded}
          onStartCall={handleStartCall}
        />
      )}
      {/* Active Session view (Connecting, Listening, Speaking, Active conversation) */}
      {showSessionView && (
        <MotionSessionView
          key="session-view"
          {...VIEW_MOTION_PROPS}
          supportsChatInput={appConfig.supportsChatInput}
          supportsVideoInput={appConfig.supportsVideoInput}
          supportsScreenShare={appConfig.supportsScreenShare}
          isPreConnectBufferEnabled={appConfig.isPreConnectBufferEnabled}
          audioVisualizerType={appConfig.audioVisualizerType}
          audioVisualizerColor={
            resolvedTheme === 'dark'
              ? appConfig.audioVisualizerColorDark
              : appConfig.audioVisualizerColor
          }
          audioVisualizerColorShift={appConfig.audioVisualizerColorShift}
          audioVisualizerBarCount={appConfig.audioVisualizerBarCount}
          audioVisualizerGridRowCount={appConfig.audioVisualizerGridRowCount}
          audioVisualizerGridColumnCount={appConfig.audioVisualizerGridColumnCount}
          audioVisualizerRadialBarCount={appConfig.audioVisualizerRadialBarCount}
          audioVisualizerRadialRadius={appConfig.audioVisualizerRadialRadius}
          audioVisualizerWaveLineWidth={appConfig.audioVisualizerWaveLineWidth}
          className="fixed inset-0"
        />
      )}
    </AnimatePresence>
  );
}

