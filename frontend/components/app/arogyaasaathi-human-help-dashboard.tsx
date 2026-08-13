'use client';

import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  FileText,
  Globe,
  PhoneCall,
  RefreshCw,
  ShieldAlert,
  User,
} from 'lucide-react';
import { toast as sonnerToast } from 'sonner';

export interface EscalationRequest {
  reference_id: string;
  user_id: string;
  caller_name: string;
  phone_number: string;
  reason: string;
  summary: string;
  what_was_checked: string;
  urgency: 'LOW' | 'MEDIUM' | 'HIGH' | 'EMERGENCY' | string;
  language: string;
  preferred_follow_up: string;
  status: 'open' | 'in_progress' | 'resolved' | 'cancelled' | string;
  created_at: string;
  updated_at: string;
}

export function ArogyaSaathiHumanHelpDashboard() {
  const [escalations, setEscalations] = useState<EscalationRequest[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchEscalations = async () => {
    try {
      setLoading(true);
      const url =
        filterStatus === 'all' ? '/api/escalations' : `/api/escalations?status=${filterStatus}`;
      const res = await fetch(url, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.escalations)) {
          setEscalations(data.escalations);
        }
      }
    } catch (err: any) {
      console.warn('Failed to fetch escalations:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEscalations();
    const interval = setInterval(fetchEscalations, 5000);
    return () => clearInterval(interval);
  }, [filterStatus]);

  const handleUpdateStatus = async (refId: string, newStatus: string) => {
    try {
      setActionLoading(`${refId}-${newStatus}`);
      const res = await fetch(`/api/escalations/${refId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        sonnerToast.success(`Ticket ${refId} status updated to '${newStatus}'`);
        fetchEscalations();
      } else {
        sonnerToast.error(data.message || 'Failed to update status.');
      }
    } catch (err: any) {
      sonnerToast.error('Network error updating ticket status.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleTriggerCallback = async (refId: string, phone: string) => {
    if (!phone) {
      sonnerToast.error('No phone number recorded for this ticket.');
      return;
    }

    try {
      setActionLoading(`${refId}-callback`);
      const res = await fetch(`/api/escalations/${refId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'callback' }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        sonnerToast.success(`Resolution callback call dispatched to ${phone}!`);
      } else if (data.status === 'opted_out') {
        sonnerToast.error(`Callback Blocked: Number ${phone} has opted out.`);
      } else {
        sonnerToast.error(data.message || 'Failed to dispatch callback call.');
      }
    } catch (err: any) {
      sonnerToast.error('Network error triggering resolution callback.');
    } finally {
      setActionLoading(null);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(text);
    sonnerToast.success(`Copied Reference ID ${text}`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getUrgencyBadge = (urgency: string) => {
    const u = urgency.toUpperCase();
    switch (u) {
      case 'EMERGENCY':
        return 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30 animate-pulse';
      case 'HIGH':
        return 'bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30';
      case 'MEDIUM':
        return 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30';
      default:
        return 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30';
    }
  };

  const getStatusBadge = (status: string) => {
    const s = status.toLowerCase();
    switch (s) {
      case 'open':
        return {
          label: 'OPEN',
          bg: 'bg-rose-500/10 text-rose-600 dark:text-rose-300 border-rose-500/20',
        };
      case 'in_progress':
        return {
          label: 'IN PROGRESS',
          bg: 'bg-amber-500/10 text-amber-600 dark:text-amber-300 border-amber-500/20',
        };
      case 'resolved':
        return {
          label: 'RESOLVED',
          bg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border-emerald-500/20',
        };
      default:
        return {
          label: status.toUpperCase(),
          bg: 'bg-slate-500/10 text-slate-600 dark:text-slate-300 border-slate-500/20',
        };
    }
  };

  const openCount = escalations.filter((e) => e.status === 'open').length;
  const inProgressCount = escalations.filter((e) => e.status === 'in_progress').length;
  const resolvedCount = escalations.filter((e) => e.status === 'resolved').length;

  return (
    <div className="bg-card/75 mx-auto my-6 w-full max-w-4xl rounded-2xl border border-teal-500/20 p-6 shadow-2xl backdrop-blur-xl transition-all">
      {/* Header */}
      <div className="border-border/40 mb-5 flex flex-col justify-between gap-4 border-b pb-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-xl bg-teal-500/15 text-teal-600 dark:text-teal-400">
              <ShieldAlert className="size-5" />
            </div>
            <div>
              <h2 className="text-foreground text-base font-bold">Human Help Support Center</h2>
              <p className="text-muted-foreground text-xs">
                Healthcare Escalation Dashboard — Day 7
              </p>
            </div>
          </div>
        </div>

        {/* Stats Pills */}
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-rose-500/20 bg-rose-500/10 px-3 py-1 text-xs font-semibold text-rose-600">
            Open: {openCount}
          </span>
          <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-600">
            In Progress: {inProgressCount}
          </span>
          <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-600">
            Resolved: {resolvedCount}
          </span>
          <button
            type="button"
            onClick={fetchEscalations}
            className="border-border/40 hover:bg-accent/50 text-muted-foreground rounded-lg border p-1.5 transition-colors"
            title="Refresh List"
          >
            <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="border-border/30 mb-5 flex items-center gap-1.5 overflow-x-auto border-b pb-3">
        {['all', 'open', 'in_progress', 'resolved'].map((st) => (
          <button
            key={st}
            type="button"
            onClick={() => setFilterStatus(st)}
            className={`rounded-xl border px-3.5 py-1.5 text-xs font-semibold capitalize transition-all ${
              filterStatus === st
                ? 'border-teal-600 bg-teal-600 text-white shadow-sm'
                : 'bg-muted/40 text-muted-foreground border-border/30 hover:bg-muted/70'
            }`}
          >
            {st === 'all' ? 'All Tickets' : st.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Ticket List */}
      {escalations.length === 0 ? (
        <div className="border-border/40 bg-muted/20 rounded-2xl border border-dashed py-12 text-center">
          <CheckCircle2 className="mx-auto mb-2 size-10 text-teal-500/40" />
          <h3 className="text-foreground text-sm font-semibold">No Escalation Tickets</h3>
          <p className="text-muted-foreground mx-auto mt-1 max-w-sm text-xs">
            Normal health questions are handled directly by ArogyaSaathi. Only red-flag symptoms or
            diagnosis requests trigger human escalation.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {escalations.map((item) => {
            const statusInfo = getStatusBadge(item.status);
            const isEmergency = item.urgency?.toUpperCase() === 'EMERGENCY';

            return (
              <div
                key={item.reference_id}
                className={`rounded-xl border p-4 shadow-sm transition-all ${
                  isEmergency
                    ? 'border-rose-500/40 bg-rose-500/5 dark:bg-rose-950/20'
                    : 'border-border/50 bg-background/50 hover:border-teal-500/40'
                }`}
              >
                {/* Header Row */}
                <div className="border-border/30 mb-3 flex flex-wrap items-center justify-between gap-2 border-b pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-teal-600 dark:text-teal-400">
                      {item.reference_id}
                    </span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(item.reference_id)}
                      className="text-muted-foreground hover:text-foreground hover:bg-accent/40 rounded p-1"
                      title="Copy Reference ID"
                    >
                      {copiedId === item.reference_id ? (
                        <Check className="size-3 text-emerald-500" />
                      ) : (
                        <Copy className="size-3" />
                      )}
                    </button>
                    <span
                      className={`rounded-md border px-2 py-0.5 text-[10px] font-extrabold uppercase ${getUrgencyBadge(item.urgency)}`}
                    >
                      {item.urgency}
                    </span>
                  </div>

                  <span
                    className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase ${statusInfo.bg}`}
                  >
                    {statusInfo.label}
                  </span>
                </div>

                {/* Body Details */}
                <div className="mb-3 grid grid-cols-1 gap-3 text-xs md:grid-cols-2">
                  <div>
                    <div className="text-muted-foreground mb-1 flex items-center gap-1.5">
                      <User className="size-3.5 text-teal-500" />
                      <span className="text-foreground font-semibold">
                        {item.caller_name || 'Anonymous User'}
                      </span>
                      <span className="text-muted-foreground font-mono text-[10px]">
                        ({item.user_id})
                      </span>
                    </div>

                    <div className="text-muted-foreground mb-1 flex items-center gap-1.5">
                      <Globe className="size-3.5 text-teal-500" />
                      <span>
                        Language:{' '}
                        <strong className="text-foreground">{item.language || 'English'}</strong>
                      </span>
                      <span className="ml-2 font-mono text-[10px]">
                        Follow-up: {item.preferred_follow_up || 'phone'}
                      </span>
                    </div>

                    {item.phone_number && (
                      <div className="text-muted-foreground flex items-center gap-1.5">
                        <PhoneCall className="size-3.5 text-teal-500" />
                        <span className="text-foreground font-mono">{item.phone_number}</span>
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="text-muted-foreground mb-1 flex items-start gap-1.5">
                      <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-amber-500" />
                      <span>
                        Category:{' '}
                        <strong className="text-foreground capitalize">
                          {item.reason?.replace('_', ' ')}
                        </strong>
                      </span>
                    </div>
                    <div className="text-muted-foreground flex items-start gap-1.5">
                      <Clock className="mt-0.5 size-3.5 shrink-0 text-teal-500" />
                      <span className="text-[10px]">
                        {new Date(item.created_at).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Sanitized Summary Box */}
                <div className="bg-muted/60 border-border/40 mb-3 space-y-1 rounded-lg border p-3 text-xs">
                  <div className="text-foreground flex items-center gap-1.5 font-semibold">
                    <FileText className="size-3.5 text-teal-500" />
                    <span>Sanitized Summary:</span>
                  </div>
                  <p className="text-muted-foreground pl-5 leading-relaxed">{item.summary}</p>
                  {item.what_was_checked && (
                    <div className="text-muted-foreground/80 pt-1 pl-5 text-[11px] italic">
                      Safety Guidance Checked: {item.what_was_checked}
                    </div>
                  )}
                </div>

                {/* Actions Row */}
                <div className="border-border/30 flex flex-wrap items-center justify-end gap-2 border-t pt-2">
                  {item.status === 'open' && (
                    <button
                      type="button"
                      disabled={actionLoading === `${item.reference_id}-in_progress`}
                      onClick={() => handleUpdateStatus(item.reference_id, 'in_progress')}
                      className="cursor-pointer rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-amber-700 disabled:opacity-50"
                    >
                      Mark In Progress
                    </button>
                  )}

                  {item.status !== 'resolved' && (
                    <button
                      type="button"
                      disabled={actionLoading === `${item.reference_id}-resolved`}
                      onClick={() => handleUpdateStatus(item.reference_id, 'resolved')}
                      className="cursor-pointer rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700 disabled:opacity-50"
                    >
                      Mark Resolved
                    </button>
                  )}

                  {item.phone_number && (
                    <button
                      type="button"
                      disabled={actionLoading === `${item.reference_id}-callback`}
                      onClick={() => handleTriggerCallback(item.reference_id, item.phone_number)}
                      className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-teal-700 disabled:opacity-50"
                    >
                      <PhoneCall className="size-3.5" />
                      <span>Call User</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
