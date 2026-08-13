'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Filter,
  HeartPulse,
  HelpCircle,
  Monitor,
  Phone,
  PhoneCall,
  RefreshCw,
  ShieldCheck,
  TrendingUp,
  XCircle,
  Zap,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { Button } from '@/components/ui/button';

interface AnalyticsSummary {
  total_calls: number;
  successful_calls: number;
  failed_calls: number;
  success_rate: number;
  failure_categories: Record<string, number>;
  channels: Record<string, number>;
  triage_breakdown: Record<string, number>;
  avg_duration_seconds: number;
}

interface CallRecord {
  call_id: string;
  room_name: string;
  channel: string;
  start_time: string;
  end_time: string;
  duration_seconds: number;
  outcome: 'success' | 'failed';
  failure_category: string;
  outcome_reason: string;
  tools_used: string[];
  triage_level: string;
  created_at: string;
}

export function ArogyaSaathiAnalyticsDashboard() {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Filters
  const [channelFilter, setChannelFilter] = useState<string>('all');
  const [outcomeFilter, setOutcomeFilter] = useState<string>('all');

  const fetchAnalytics = useCallback(async () => {
    try {
      setRefreshing(true);
      // 1. Fetch summary
      const sumRes = await fetch('/api/analytics?action=summary', { cache: 'no-store' });
      if (sumRes.ok) {
        const sumData = await sumRes.json();
        if (sumData.success) {
          setSummary(sumData.summary);
        }
      }

      // 2. Fetch calls
      const callsUrl = `/api/analytics?action=calls&channel=${channelFilter}&outcome=${outcomeFilter}&limit=25`;
      const callsRes = await fetch(callsUrl, { cache: 'no-store' });
      if (callsRes.ok) {
        const callsData = await callsRes.json();
        if (callsData.success) {
          setCalls(callsData.calls || []);
        }
      }
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [channelFilter, outcomeFilter]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  // Auto-refresh interval
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchAnalytics();
    }, 5000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchAnalytics]);

  const formatTime = (isoStr: string) => {
    if (!isoStr) return 'N/A';
    try {
      const d = new Date(isoStr);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return isoStr;
    }
  };

  const getTriageBadge = (level: string) => {
    switch (level?.toUpperCase()) {
      case 'EMERGENCY':
        return 'bg-red-500/30 text-red-200 border-red-500/50';
      case 'URGENT':
        return 'bg-amber-500/30 text-amber-200 border-amber-500/50';
      case 'SOON':
        return 'bg-yellow-500/30 text-yellow-200 border-yellow-500/50';
      case 'ROUTINE':
        return 'bg-emerald-500/30 text-emerald-200 border-emerald-500/50';
      default:
        return 'bg-slate-500/30 text-slate-300 border-slate-500/40';
    }
  };

  const getFailureLabel = (cat: string) => {
    switch (cat) {
      case 'user_hangup_early':
        return 'User Ended Early';
      case 'quick_disconnect':
        return 'Quick Disconnect (< 5s)';
      case 'user_opt_out':
        return 'User Opt-Out';
      case 'tool_failure':
        return 'Tool Error';
      case 'permission_denied':
        return 'Permission Denied';
      default:
        return cat || 'Incomplete';
    }
  };

  return (
    <div className="relative mx-auto my-6 w-full max-w-5xl overflow-hidden rounded-[32px] border border-white/20 bg-black/30 p-6 shadow-[0_0_60px_rgba(20,184,166,0.15)] backdrop-blur-xl">
      {/* Header bar */}
      <div className="flex flex-col items-start justify-between gap-4 border-b border-white/10 pb-6 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <Activity className="size-6 animate-pulse text-teal-400" />
            <h2 className="text-2xl font-black tracking-tight text-white">
              Call Analytics Dashboard
            </h2>
            <span className="rounded-full border border-teal-400/40 bg-teal-500/20 px-2.5 py-0.5 text-[10px] font-extrabold tracking-wider text-teal-300 uppercase">
              Day 8 • LiveKit & Murf Falcon
            </span>
          </div>
          <p className="mt-1 text-xs text-white/70">
            Real-time call performance & Health Access success condition metrics (ArogyaSaathi)
          </p>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`rounded-full border px-3 py-1.5 text-xs font-bold transition-all ${
              autoRefresh
                ? 'border-teal-400/40 bg-teal-500/20 text-teal-200'
                : 'border-white/10 bg-white/5 text-white/60'
            }`}
          >
            {autoRefresh ? '🟢 Live Auto-Refresh ON' : '⚪ Auto-Refresh OFF'}
          </button>

          <Button
            size="sm"
            onClick={fetchAnalytics}
            disabled={refreshing}
            className="gap-1.5 rounded-full border border-teal-400/50 bg-teal-500/30 text-xs font-extrabold text-teal-100 hover:bg-teal-500/40"
          >
            <RefreshCw className={`size-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Step 6 Privacy Banner */}
      <div className="mt-4 flex items-center gap-2.5 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-xs font-semibold text-emerald-200">
        <ShieldCheck className="size-4 shrink-0 text-emerald-400" />
        <span>
          <strong>Privacy Compliant (Step 6):</strong> Zero conversation transcripts, medical
          records, PINs, or credentials are stored or displayed on this public dashboard.
        </span>
      </div>

      {/* Step 3: Primary 3 Numbers Cards */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Card 1: Total Calls */}
        <motion.div
          whileHover={{ scale: 1.02 }}
          className="relative overflow-hidden rounded-2xl border border-teal-500/30 bg-gradient-to-br from-teal-500/15 via-black/20 to-cyan-500/10 p-5 backdrop-blur-md"
        >
          <div className="mb-2 flex items-center justify-between text-teal-300">
            <span className="text-xs font-bold tracking-wider uppercase">Total Calls</span>
            <PhoneCall className="size-5 text-teal-400" />
          </div>
          <div className="text-3xl font-black text-white sm:text-4xl">
            {loading ? '...' : (summary?.total_calls ?? 0)}
          </div>
          <div className="mt-2 flex items-center gap-1 text-[11px] font-medium text-teal-200/80">
            <Clock className="size-3" />
            <span>Avg Duration: {summary?.avg_duration_seconds ?? 0}s</span>
          </div>
        </motion.div>

        {/* Card 2: Successful Calls */}
        <motion.div
          whileHover={{ scale: 1.02 }}
          className="relative overflow-hidden rounded-2xl border border-emerald-500/40 bg-gradient-to-br from-emerald-500/20 via-black/20 to-teal-500/10 p-5 backdrop-blur-md"
        >
          <div className="mb-2 flex items-center justify-between text-emerald-300">
            <span className="text-xs font-bold tracking-wider uppercase">Successful Calls</span>
            <CheckCircle2 className="size-5 text-emerald-400" />
          </div>
          <div className="text-3xl font-black text-emerald-300 sm:text-4xl">
            {loading ? '...' : (summary?.successful_calls ?? 0)}
          </div>
          <div className="mt-2 text-[11px] font-medium text-emerald-200/80">
            Guidance delivered or triage completed
          </div>
        </motion.div>

        {/* Card 3: Failed Calls */}
        <motion.div
          whileHover={{ scale: 1.02 }}
          className="relative overflow-hidden rounded-2xl border border-rose-500/40 bg-gradient-to-br from-rose-500/15 via-black/20 to-red-500/10 p-5 backdrop-blur-md"
        >
          <div className="mb-2 flex items-center justify-between text-rose-300">
            <span className="text-xs font-bold tracking-wider uppercase">Failed Calls</span>
            <XCircle className="size-5 text-rose-400" />
          </div>
          <div className="text-3xl font-black text-rose-300 sm:text-4xl">
            {loading ? '...' : (summary?.failed_calls ?? 0)}
          </div>
          <div className="mt-2 text-[11px] font-medium text-rose-200/80">
            Caller hung up early or incomplete
          </div>
        </motion.div>
      </div>

      {/* Advanced Performance & Distribution Section */}
      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        {/* Success Rate Gauge */}
        <div className="flex flex-col justify-between rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-white/80">Success Rate</span>
            <TrendingUp className="size-4 text-emerald-400" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-white">{summary?.success_rate ?? 0}%</span>
            <span className="text-xs font-semibold text-emerald-300">Target &gt; 80%</span>
          </div>
          <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-teal-400 to-emerald-400 transition-all duration-500"
              style={{ width: `${Math.min(100, summary?.success_rate ?? 0)}%` }}
            />
          </div>
        </div>

        {/* Failure Categories Breakdown */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-md">
          <div className="mb-2 flex items-center gap-1.5 text-xs font-bold text-white/80">
            <AlertTriangle className="size-4 text-amber-400" />
            <span>Failure Reasons</span>
          </div>
          <div className="space-y-1.5 text-xs">
            {summary && Object.keys(summary.failure_categories).length > 0 ? (
              Object.entries(summary.failure_categories).map(([cat, count]) => (
                <div key={cat} className="flex items-center justify-between text-white/80">
                  <span className="truncate">{getFailureLabel(cat)}</span>
                  <span className="rounded border border-rose-500/30 bg-rose-500/20 px-2 py-0.5 font-bold text-rose-300">
                    {count}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-[11px] text-white/40 italic">No call failures logged yet</p>
            )}
          </div>
        </div>

        {/* Triage Urgency Distribution */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-md">
          <div className="mb-2 flex items-center gap-1.5 text-xs font-bold text-white/80">
            <HeartPulse className="size-4 text-teal-400" />
            <span>Triage Urgency Levels</span>
          </div>
          <div className="flex flex-wrap gap-1.5 text-xs">
            {summary && Object.keys(summary.triage_breakdown).length > 0 ? (
              Object.entries(summary.triage_breakdown).map(([lvl, count]) => (
                <span
                  key={lvl}
                  className={`rounded-md border px-2.5 py-1 text-[11px] font-extrabold ${getTriageBadge(
                    lvl
                  )}`}
                >
                  {lvl}: {count}
                </span>
              ))
            ) : (
              <p className="text-[11px] text-white/40 italic">No triage sessions recorded yet</p>
            )}
          </div>
        </div>
      </div>

      {/* Call History Table with Filters */}
      <div className="mt-6 border-t border-white/10 pt-6">
        <div className="mb-4 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2">
            <Filter className="size-4 text-teal-400" />
            <h3 className="text-base font-bold text-white">Call Log History</h3>
            <span className="text-xs text-white/60">({calls.length} calls shown)</span>
          </div>

          {/* Filter selectors */}
          <div className="flex items-center gap-2">
            {/* Channel filter */}
            <select
              value={channelFilter}
              onChange={(e) => setChannelFilter(e.target.value)}
              className="rounded-xl border border-white/20 bg-black/50 px-3 py-1.5 text-xs font-bold text-white focus:border-teal-400 focus:outline-none"
            >
              <option value="all">All Channels</option>
              <option value="browser">🌐 Browser</option>
              <option value="sip">📞 SIP / Phone</option>
            </select>

            {/* Outcome filter */}
            <select
              value={outcomeFilter}
              onChange={(e) => setOutcomeFilter(e.target.value)}
              className="rounded-xl border border-white/20 bg-black/50 px-3 py-1.5 text-xs font-bold text-white focus:border-teal-400 focus:outline-none"
            >
              <option value="all">All Outcomes</option>
              <option value="success">✅ Successful</option>
              <option value="failed">❌ Failed</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="w-full overflow-x-auto rounded-2xl border border-white/10 bg-black/40">
          <table className="w-full text-left text-xs text-white/90">
            <thead className="border-b border-white/10 bg-white/10 text-[10px] font-bold tracking-wider text-white/80 uppercase">
              <tr>
                <th className="p-3">Time</th>
                <th className="p-3">Channel</th>
                <th className="p-3">Duration</th>
                <th className="p-3">Outcome</th>
                <th className="p-3">Triage Level</th>
                <th className="p-3">Tools Used</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-medium">
              {calls.length > 0 ? (
                calls.map((c) => (
                  <tr key={c.call_id} className="transition-colors hover:bg-white/5">
                    <td className="p-3 font-mono whitespace-nowrap text-white/70">
                      {formatTime(c.start_time)}
                    </td>
                    <td className="p-3">
                      <span className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-white/10 px-2 py-0.5 text-[10px] font-bold text-white">
                        {c.channel === 'sip' ? (
                          <>
                            <Phone className="size-3 text-cyan-400" /> SIP
                          </>
                        ) : (
                          <>
                            <Monitor className="size-3 text-teal-400" /> Browser
                          </>
                        )}
                      </span>
                    </td>
                    <td className="p-3 font-semibold text-white/90">{c.duration_seconds}s</td>
                    <td className="p-3">
                      <div className="flex flex-col gap-0.5">
                        {c.outcome === 'success' ? (
                          <span className="inline-flex items-center gap-1 font-bold text-emerald-300">
                            <CheckCircle2 className="size-3.5 text-emerald-400" />
                            Success
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 font-bold text-rose-300">
                            <XCircle className="size-3.5 text-rose-400" />
                            Failed ({getFailureLabel(c.failure_category)})
                          </span>
                        )}
                        <span className="max-w-xs truncate text-[10px] text-white/50">
                          {c.outcome_reason}
                        </span>
                      </div>
                    </td>
                    <td className="p-3">
                      <span
                        className={`rounded border px-2 py-0.5 text-[10px] font-black ${getTriageBadge(
                          c.triage_level
                        )}`}
                      >
                        {c.triage_level || 'NONE'}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-1">
                        {c.tools_used && c.tools_used.length > 0 ? (
                          c.tools_used.map((t, idx) => (
                            <span
                              key={idx}
                              className="rounded border border-teal-500/40 bg-teal-500/20 px-1.5 py-0.5 font-mono text-[9px] text-teal-200"
                            >
                              {t}
                            </span>
                          ))
                        ) : (
                          <span className="text-[10px] text-white/40 italic">None</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-white/50 italic">
                    No calls recorded matching selected filters. Make a voice call above to see
                    results live!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
