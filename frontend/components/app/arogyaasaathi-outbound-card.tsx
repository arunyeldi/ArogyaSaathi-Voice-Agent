'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Loader2,
  PhoneCall,
  PhoneOff,
  ShieldAlert,
  Square,
} from 'lucide-react';
import { toast as sonnerToast } from 'sonner';

export function ArogyaSaathiOutboundCard() {
  const [phoneNumber, setPhoneNumber] = useState('arunyeldi');
  const [purpose, setPurpose] = useState('vaccination_reminder');
  const [callerName, setCallerName] = useState('Meera');
  const [isCalling, setIsCalling] = useState(false);
  const [activeCallId, setActiveCallId] = useState<string | null>(null);
  const [callStatus, setCallStatus] = useState<
    | 'ready'
    | 'calling'
    | 'ringing'
    | 'connected'
    | 'completed'
    | 'no_answer'
    | 'busy'
    | 'opted_out'
    | 'failed'
  >('ready');
  const [statusMessage, setStatusMessage] = useState('');
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Clear polling interval on unmount
  useEffect(() => {
    return () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
      }
    };
  }, []);

  const stopPolling = () => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  };

  const startStatusPolling = (callId: string) => {
    stopPolling();
    pollTimerRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/outbound?call_id=${callId}`);
        if (!res.ok) return;

        const data = await res.json();
        if (data.success && data.call) {
          const backendStatus = data.call.status;
          if (backendStatus === 'opted_out') {
            setCallStatus('opted_out');
            setStatusMessage('BLOCKED: Phone number or user has opted out of reminder calls.');
            setIsCalling(false);
            stopPolling();
          } else if (backendStatus === 'completed') {
            setCallStatus('completed');
            setStatusMessage('Call Completed — Interaction recorded safely in database.');
            setIsCalling(false);
            stopPolling();
          } else if (backendStatus === 'answered' || backendStatus === 'connected') {
            setCallStatus('connected');
            setStatusMessage('Connected — ArogyaSaathi AI Agent speaking live...');
          } else if (backendStatus === 'ringing') {
            setCallStatus('ringing');
            setStatusMessage('Ringing phone / SIP client...');
          }
        }
      } catch (err) {
        console.warn('Status poll error:', err);
      }
    }, 2500);
  };

  const handleStartCall = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const cleanPhone = phoneNumber.trim();
    if (!cleanPhone) {
      sonnerToast.error('Please enter a valid phone number or Linphone username.');
      return;
    }

    setIsCalling(true);
    setCallStatus('calling');
    setStatusMessage('Initiating secure outbound telephony dispatch...');

    try {
      const res = await fetch('/api/outbound', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone_number: cleanPhone,
          purpose,
          caller_name: callerName,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        if (data.status === 'opted_out') {
          setCallStatus('opted_out');
          setStatusMessage(data.message || 'Call blocked: User has opted out of reminder calls.');
          sonnerToast.error('Call Blocked: Number has opted out.');
        } else if (data.status === 'demo_restricted') {
          setCallStatus('failed');
          setStatusMessage(data.message || 'Demo Mode Restricted.');
          sonnerToast.error(data.message);
        } else {
          setCallStatus('failed');
          setStatusMessage(data.message || 'Failed to initiate outbound call.');
          sonnerToast.error(data.message || 'Outbound call failed.');
        }
        setIsCalling(false);
        return;
      }

      const callId = data.call_id;
      setActiveCallId(callId);
      setCallStatus('ringing');
      setStatusMessage(data.message || 'Outbound call dispatched. Ringing...');
      sonnerToast.success(`Outbound call dispatched to ${cleanPhone}`);

      // Start real backend status polling
      if (callId) {
        startStatusPolling(callId);
      }
    } catch (err: any) {
      setCallStatus('failed');
      setStatusMessage(err?.message || 'Network error initiating call.');
      sonnerToast.error('Failed to connect outbound call API.');
      setIsCalling(false);
    }
  };

  const handleEndCall = async () => {
    stopPolling();
    if (activeCallId) {
      try {
        await fetch('/api/outbound', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'end', call_id: activeCallId }),
        });
      } catch (err) {
        console.warn('End call notify error:', err);
      }
    }
    setCallStatus('completed');
    setStatusMessage('Call ended by user — Interaction recorded safely.');
    setIsCalling(false);
    sonnerToast.info('Outbound call ended.');
  };

  const fillDemoNumber = (num: string) => {
    stopPolling();
    setPhoneNumber(num);
    setCallStatus('ready');
    setStatusMessage('');
    setIsCalling(false);
  };

  const getStatusBadge = () => {
    switch (callStatus) {
      case 'calling':
        return {
          label: 'Initiating Call...',
          Icon: Loader2,
          spin: true,
          bg: 'bg-amber-500/10 text-amber-600 border-amber-500/30 dark:bg-amber-950/40 dark:text-amber-300',
        };
      case 'ringing':
        return {
          label: 'Ringing...',
          Icon: PhoneCall,
          spin: true,
          bg: 'bg-blue-500/10 text-blue-600 border-blue-500/30 dark:bg-blue-950/40 dark:text-blue-300',
        };
      case 'connected':
        return {
          label: 'Call Connected & Speaking',
          Icon: PhoneCall,
          spin: false,
          bg: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30 dark:bg-emerald-950/40 dark:text-emerald-300',
        };
      case 'completed':
        return {
          label: 'Call Completed',
          Icon: CheckCircle2,
          spin: false,
          bg: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30 dark:bg-emerald-950/40 dark:text-emerald-300',
        };
      case 'opted_out':
        return {
          label: 'BLOCKED: Opted Out',
          Icon: ShieldAlert,
          spin: false,
          bg: 'bg-purple-500/10 text-purple-700 border-purple-500/30 dark:bg-purple-950/40 dark:text-purple-300',
        };
      case 'no_answer':
        return {
          label: 'No Answer (Retry 1/1)',
          Icon: Clock,
          spin: false,
          bg: 'bg-orange-500/10 text-orange-600 border-orange-500/30 dark:bg-orange-950/40 dark:text-orange-300',
        };
      case 'busy':
        return {
          label: 'Number Busy',
          Icon: PhoneOff,
          spin: false,
          bg: 'bg-amber-500/10 text-amber-700 border-amber-500/30 dark:bg-amber-950/40 dark:text-amber-300',
        };
      case 'failed':
        return {
          label: 'Call Failed',
          Icon: AlertCircle,
          spin: false,
          bg: 'bg-rose-500/10 text-rose-600 border-rose-500/30 dark:bg-rose-950/40 dark:text-rose-300',
        };
      default:
        return {
          label: 'Ready to Call',
          Icon: CheckCircle2,
          spin: false,
          bg: 'bg-slate-500/10 text-slate-600 border-slate-500/30 dark:bg-slate-900/40 dark:text-slate-300',
        };
    }
  };

  const { Icon, label: badgeLabel, bg: badgeBg, spin } = getStatusBadge();

  return (
    <div className="bg-card/70 mx-auto my-4 w-full max-w-md rounded-2xl border border-teal-500/25 p-5 shadow-xl backdrop-blur-xl transition-all">
      <div className="border-border/40 mb-4 flex items-center justify-between border-b pb-3">
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-teal-500/15 text-teal-600 dark:text-teal-400">
            <PhoneCall className="size-4.5" />
          </div>
          <div>
            <h3 className="text-foreground text-sm font-bold">Proactive Outbound Call</h3>
            <p className="text-muted-foreground text-[11px]">Vaccination Follow-up Reminder</p>
          </div>
        </div>

        <span
          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase ${badgeBg}`}
        >
          <Icon className={`size-3 ${spin ? 'animate-spin' : ''}`} />
          {badgeLabel}
        </span>
      </div>

      <form onSubmit={handleStartCall} className="space-y-3.5">
        <div>
          <label className="text-foreground mb-1 block text-xs font-semibold">
            Recipient Target (Phone E.164 or Linphone Username)
          </label>
          <input
            type="text"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            placeholder="+919876543210 or Linphone username"
            disabled={isCalling}
            className="border-input bg-background text-foreground w-full rounded-xl border px-3.5 py-2 font-mono text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none disabled:opacity-60"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-muted-foreground mb-1 block text-[11px] font-medium">
              Recipient Name (Optional)
            </label>
            <input
              type="text"
              value={callerName}
              onChange={(e) => setCallerName(e.target.value)}
              placeholder="e.g. Meera"
              disabled={isCalling}
              className="border-input bg-background text-foreground w-full rounded-lg border px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-teal-500 focus:outline-none disabled:opacity-60"
            />
          </div>
          <div>
            <label className="text-muted-foreground mb-1 block text-[11px] font-medium">
              Reminder Purpose
            </label>
            <select
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              disabled={isCalling}
              className="border-input bg-background text-foreground w-full rounded-lg border px-2 py-1.5 text-xs focus:ring-1 focus:ring-teal-500 focus:outline-none disabled:opacity-60"
            >
              <option value="vaccination_reminder">Vaccination Follow-up</option>
              <option value="triage_followup">Care Navigation Follow-up</option>
              <option value="general_health_check">General Health Check</option>
            </select>
          </div>
        </div>

        {isCalling ? (
          <button
            type="button"
            onClick={handleEndCall}
            className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-rose-600 py-2.5 text-xs font-semibold text-white shadow-md transition-colors hover:bg-rose-700"
          >
            <Square className="size-3.5 fill-current" />
            <span>End Call</span>
          </button>
        ) : (
          <button
            type="submit"
            className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-teal-600 py-2.5 text-xs font-semibold text-white shadow-md transition-colors hover:bg-teal-700"
          >
            <PhoneCall className="size-4" />
            <span>Start Outbound Call</span>
          </button>
        )}
      </form>

      {statusMessage && (
        <div className="bg-muted/50 border-border/40 text-muted-foreground mt-3 rounded-lg border p-2.5 text-xs leading-snug">
          {statusMessage}
        </div>
      )}

      <div className="border-border/30 mt-3 flex items-center gap-2 border-t pt-2 text-[10px]">
        <span className="text-muted-foreground font-semibold">Test Shortcuts:</span>
        <button
          type="button"
          onClick={() => fillDemoNumber('arunyeldi')}
          disabled={isCalling}
          className="font-bold text-teal-600 underline hover:opacity-80 disabled:opacity-40 dark:text-teal-400"
        >
          Linphone SIP
        </button>
        <button
          type="button"
          onClick={() => fillDemoNumber('+919347897885')}
          disabled={isCalling}
          className="text-cyan-600 underline hover:opacity-80 disabled:opacity-40 dark:text-cyan-400"
        >
          Mobile PSTN
        </button>
        <button
          type="button"
          onClick={() => fillDemoNumber('+919999988888')}
          disabled={isCalling}
          className="text-purple-600 underline hover:opacity-80 disabled:opacity-40 dark:text-purple-400"
        >
          Opt-Out Demo
        </button>
      </div>
    </div>
  );
}
