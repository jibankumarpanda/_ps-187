"use client";

import React from 'react';
import Link from 'next/link';
import { ShieldAlert, CheckCircle2, ArrowUpRight, Search, ShieldCheck } from 'lucide-react';
import { SeverityBadge } from '@/components/ui/SeverityBadge';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatTime } from '@/lib/utils';
import type { Alert, AlertStatus } from '@/types/alert';

interface AlertTableProps {
  alerts: Alert[];
  onUpdateStatus?: (alertId: string, status: AlertStatus) => void;
  className?: string;
}

export function AlertTable({ alerts, onUpdateStatus, className = '' }: AlertTableProps) {
  return (
    <div className={`bg-card border border-border rounded-none overflow-hidden ${className}`}>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-[#101820] border-b border-[#25313C] text-[10px] font-semibold uppercase tracking-[0.04em] text-[#8E9AA6]">
              <th className="px-4 py-3.5">Alert ID</th>
              <th className="px-4 py-3.5">Event Type</th>
              <th className="px-4 py-3.5">Camera & BOP</th>
              <th className="px-4 py-3.5">Timestamp</th>
              <th className="px-4 py-3.5">Threat Score</th>
              <th className="px-4 py-3.5">Severity</th>
              <th className="px-4 py-3.5">Status</th>
              <th className="px-4 py-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#25313C]">
            {alerts.map((alert) => (
              <tr key={alert.alertId} className="hover:bg-[#17212A] transition-colors">
                <td className="px-4 py-3.5 font-mono font-bold text-foreground">
                  <Link href={`/events/${alert.eventId}`} className="hover:text-accent transition-colors">
                    {alert.alertId}
                  </Link>
                </td>
                <td className="px-4 py-3.5">
                  <div className="font-semibold text-foreground">{alert.eventType}</div>
                  <div className="text-[11px] text-muted-foreground truncate max-w-xs">{alert.description}</div>
                </td>
                <td className="px-4 py-3.5">
                  <div className="font-mono text-foreground">{alert.cameraId}</div>
                  <div className="text-[11px] text-muted-foreground">{alert.bopId}</div>
                </td>
                <td className="px-4 py-3.5 font-mono text-muted-foreground">{formatTime(alert.timestamp)}</td>
                <td className="px-4 py-3.5 font-mono font-bold text-red-500">
                  {alert.threatScore} / 100
                </td>
                <td className="px-4 py-3.5">
                  <SeverityBadge severity={alert.severity} />
                </td>
                <td className="px-4 py-3.5">
                  <StatusBadge status={alert.status} />
                </td>
                <td className="px-4 py-3.5 text-right">
                  <div className="flex items-center justify-end gap-1.5 flex-wrap">
                    {alert.status === 'NEW' && onUpdateStatus && (
                      <button
                        onClick={() => onUpdateStatus(alert.alertId, 'ACKNOWLEDGED')}
                        className="px-2.5 py-1 text-[11px] font-semibold text-accent bg-accent/10 hover:bg-accent/20 border border-[#37B9FF]/30 rounded-none transition-colors"
                      >
                        Acknowledge
                      </button>
                    )}
                    <Link
                      href={`/investigation?eventId=${alert.eventId}`}
                      className="px-2.5 py-1 text-[11px] font-semibold text-foreground bg-muted hover:bg-muted border border-border rounded-none transition-colors flex items-center gap-1"
                    >
                      <Search className="w-3 h-3 text-accent" />
                      Investigate
                    </Link>
                    {alert.status !== 'RESOLVED' && onUpdateStatus && (
                      <button
                        onClick={() => onUpdateStatus(alert.alertId, 'RESOLVED')}
                        className="px-2.5 py-1 text-[11px] font-semibold text-green-500 bg-[#39D98A]/10 hover:bg-[#39D98A]/20 border border-[#39D98A]/30 rounded-none transition-colors flex items-center gap-1"
                      >
                        <ShieldCheck className="w-3 h-3" />
                        Resolve
                      </button>
                    )}
                    {alert.status !== 'ESCALATED' && onUpdateStatus && (
                      <button
                        onClick={() => onUpdateStatus(alert.alertId, 'ESCALATED')}
                        className="px-2 py-1 text-[11px] font-semibold text-orange-500 hover:text-red-500 hover:bg-red-500/10 rounded-none transition-colors"
                        title="Escalate Alert to Command Post"
                      >
                        Escalate
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
