export interface AppConfig {
  pageTitle: string;
  pageDescription: string;
  companyName: string;

  supportsChatInput: boolean;
  supportsVideoInput: boolean;
  supportsScreenShare: boolean;
  isPreConnectBufferEnabled: boolean;

  logo: string;
  startButtonText: string;
  accent?: string;
  logoDark?: string;
  accentDark?: string;

  audioVisualizerType?: 'bar' | 'wave' | 'grid' | 'radial' | 'aura';
  audioVisualizerColor?: `#${string}`;
  audioVisualizerColorDark?: `#${string}`;
  audioVisualizerColorShift?: number;
  audioVisualizerBarCount?: number;
  audioVisualizerGridRowCount?: number;
  audioVisualizerGridColumnCount?: number;
  audioVisualizerRadialBarCount?: number;
  audioVisualizerRadialRadius?: number;
  audioVisualizerWaveLineWidth?: number;

  // agent dispatch configuration
  agentName?: string;

  // LiveKit Cloud Sandbox configuration
  sandboxId?: string;
}

export const APP_CONFIG_DEFAULTS: AppConfig = {
  companyName: 'ArogyaSaathi',
  pageTitle: 'ArogyaSaathi — AI Voice Health Companion for Bharat',
  pageDescription: 'Real-time AI Voice Health Companion powered by LiveKit & Murf Falcon TTS',

  supportsChatInput: true,
  supportsVideoInput: true,
  supportsScreenShare: true,
  isPreConnectBufferEnabled: true,

  logo: '/images/arogyasaathi_logo.svg',
  accent: '#0d9488',
  logoDark: '/images/arogyasaathi_logo.svg',
  accentDark: '#14b8a6',
  startButtonText: 'Start Voice Consultation',

  // Audio visualization configuration
  audioVisualizerType: 'wave',
  audioVisualizerColor: '#0d9488',
  audioVisualizerColorDark: '#14b8a6',
  audioVisualizerColorShift: 0.4,
  audioVisualizerBarCount: 7,

  // agent dispatch configuration
  agentName: process.env.AGENT_NAME ?? undefined,

  // LiveKit Cloud Sandbox configuration
  sandboxId: undefined,
};
