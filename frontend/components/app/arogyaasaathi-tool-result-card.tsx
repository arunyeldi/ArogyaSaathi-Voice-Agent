'use client';

import React, { useEffect, useState } from 'react';
import { useRoomContext } from '@livekit/components-react';
import { RoomEvent } from 'livekit-client';
import { AnimatePresence, motion } from 'motion/react';
import { Activity, AlertTriangle, CheckCircle2, ShieldAlert, X } from 'lucide-react';

export interface ToolDataPayload {
  status?: string;
  triage_level?: 'ROUTINE' | 'SOON' | 'URGENT' | 'EMERGENCY' | 'UNAVAILABLE' | string;
  reason?: string;
  recommended_action?: string;
  source?: string;
  data_status?: string;
  data_as_of?: string;
  symptoms?: string;
}

export function ArogyaSaathiToolResultCard() {
  const room = useRoomContext();
  const [toolState, setToolState] = useState<'IDLE' | 'CHECKING' | 'SUCCESS' | 'UNAVAILABLE' | 'ERROR'>('IDLE');
  const [toolData, setToolData] = useState<ToolDataPayload | null>(null);

  useEffect(() => {
    if (!room) return;

    const handleDataReceived = (
      payload: Uint8Array,
      _participant?: any,
      _kind?: any,
      topic?: string
    ) => {
      if (topic !== 'arogya_tool') return;

      try {
        const text = new TextDecoder().decode(payload);
        const json = JSON.parse(text);

        if (json.type === 'tool_start') {
          setToolState('CHECKING');
          setToolData({ symptoms: json.data?.symptoms });
        } else if (json.type === 'tool_result') {
          setToolState('SUCCESS');
          setToolData(json.data);
        } else if (json.type === 'tool_error') {
          setToolState('UNAVAILABLE');
          setToolData(json.data);
        }
      } catch (err) {
        console.error('Failed to parse tool data event:', err);
      }
    };

    room.on(RoomEvent.DataReceived, handleDataReceived);
    return () => {
      room.off(RoomEvent.DataReceived, handleDataReceived);
    };
  }, [room]);

  if (toolState === 'IDLE') return null;

  const level = toolData?.triage_level || 'ROUTINE';

  const badgeConfig = (() => {
    switch (level) {
      case 'EMERGENCY':
        return {
          label: 'EMERGENCY CARE REQUIRED',
          Icon: ShieldAlert,
          bg: 'bg-rose-600 text-white border-rose-700',
          cardBg: 'bg-rose-50/95 border-rose-300 dark:bg-rose-950/90 dark:border-rose-800 text-rose-950 dark:text-rose-100',
        };
      case 'URGENT':
        return {
          label: 'URGENT MEDICAL ASSESSMENT',
          Icon: AlertTriangle,
          bg: 'bg-orange-500 text-white border-orange-600',
          cardBg: 'bg-orange-50/95 border-orange-300 dark:bg-orange-950/90 dark:border-orange-800 text-orange-950 dark:text-orange-100',
        };
      case 'SOON':
        return {
          label: 'MEDICAL CONSULTATION SOON',
          Icon: Activity,
          bg: 'bg-amber-500 text-white border-amber-600',
          cardBg: 'bg-amber-50/95 border-amber-300 dark:bg-amber-950/90 dark:border-amber-800 text-amber-950 dark:text-amber-100',
        };
      case 'UNAVAILABLE':
        return {
          label: 'SERVICE TEMPORARILY UNAVAILABLE',
          Icon: AlertTriangle,
          bg: 'bg-slate-600 text-white border-slate-700',
          cardBg: 'bg-slate-50/95 border-slate-300 dark:bg-slate-900/90 dark:border-slate-800 text-slate-900 dark:text-slate-100',
        };
      default:
        return {
          label: 'ROUTINE CARE / SELF CARE',
          Icon: CheckCircle2,
          bg: 'bg-emerald-600 text-white border-emerald-700',
          cardBg: 'bg-emerald-50/95 border-emerald-300 dark:bg-emerald-950/90 dark:border-emerald-800 text-emerald-950 dark:text-emerald-100',
        };
    }
  })();

  const { Icon, label: badgeLabel, bg: badgeBg, cardBg } = badgeConfig;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="w-full max-w-md mx-auto my-3 z-30"
      >
        <div className={`relative rounded-2xl border p-4 shadow-xl backdrop-blur-md transition-all ${cardBg}`}>
          <button
            onClick={() => setToolState('IDLE')}
            className="absolute top-3 right-3 p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
            aria-label="Dismiss guidance card"
          >
            <X className="size-4" />
          </button>

          {toolState === 'CHECKING' ? (
            <div className="flex items-center gap-3 py-2">
              <Activity className="size-5 text-teal-600 dark:text-teal-400 animate-spin" />
              <div>
                <p className="text-sm font-semibold text-teal-950 dark:text-teal-100">
                  Checking health guidance...
                </p>
                <p className="text-xs text-teal-800/80 dark:text-teal-300/80">
                  Evaluating reported symptoms against safety rules
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between pr-6">
                <span className="text-[11px] font-bold tracking-wider uppercase opacity-75">
                  HEALTH GUIDANCE
                </span>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase border shadow-xs ${badgeBg}`}>
                  <Icon className="size-3" />
                  {badgeLabel}
                </span>
              </div>

              {toolData?.reason && (
                <div>
                  <h4 className="text-xs font-semibold uppercase opacity-70">Reason</h4>
                  <p className="text-xs md:text-sm font-medium mt-0.5 leading-snug">
                    {toolData.reason}
                  </p>
                </div>
              )}

              {toolData?.recommended_action && (
                <div className="rounded-lg bg-white/60 dark:bg-black/40 p-2.5 border border-black/5 dark:border-white/10">
                  <h4 className="text-xs font-bold uppercase opacity-80 text-teal-700 dark:text-teal-300">
                    Recommended Next Step
                  </h4>
                  <p className="text-xs md:text-sm font-semibold mt-0.5 leading-snug">
                    {toolData.recommended_action}
                  </p>
                </div>
              )}

              <div className="flex items-center justify-between text-[10px] opacity-60 border-t border-black/5 dark:border-white/10 pt-2">
                <span>Source: {toolData?.source || 'ArogyaSaathi local rules'}</span>
                <span>
                  {toolData?.data_as_of
                    ? new Date(toolData.data_as_of).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    : 'Just now'}
                </span>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
