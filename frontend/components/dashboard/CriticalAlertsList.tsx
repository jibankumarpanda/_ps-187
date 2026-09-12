"use client";

import React from 'react';
import Link from 'next/link';
import { AlertTriangle, ChevronRight, ShieldAlert, ArrowRight } from 'lucide-react';
import { SeverityBadge } from '@/components/ui/SeverityBadge';
import { formatTime } from '@/lib/utils';
import type { Alert } from '@/types/alert';

interface CriticalAlertsListProps {
  alerts: Alert[];
  onAcknowledge?: (id: string) => void;
  className?: string;
}

export function CriticalAlertsList({
  alerts,
  onAcknowledge,
  className = '',
}: CriticalAlertsListProps) {
  const criticalAlerts = alerts.filter((a) => a.severity === 'CRITICAL' || a.severity === 'HIGH').slice(0, 4);

  return (
    <div className={`bg-card border border-border rounded-none flex flex-col ${className}`}>
      <div className="p-4 border-b border-border bg-muted/60 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-red-500" />
          <h3 className="text-sm font-semibold text-foreground">Recent Critical Alerts</h3>
        </div>
        <Link
          href="/alerts"
          className="text-xs text-accent hover:underline flex items-center gap-1 font-medium"
        >
          Alert Center <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      <div className="divide-y divide-[#263442] p-2 space-y-1.5 flex-1">
        {criticalAlerts.length === 0 ? (
          <div className="py-8 text-center text-xs text-muted-foreground">No active critical alerts.</div>
        ) : (
          criticalAlerts.map((alert) => (
            <div
              key={alert.alertId}
              className="relative p-3 rounded-none bg-[#0F151C] hover:bg-muted border-l-2 border-l-[#FF5C67] border border-border transition-colors flex items-start justify-between gap-3"
            >
              <div className="space-y-1 flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <SeverityBadge severity={alert.severity} />
                  <span className="text-xs font-mono font-medium text-muted-foreground">{alert.bopId}</span>
                  <span className="text-[11px] font-mono text-muted-foreground">{formatTime(alert.timestamp)}</span>
                </div>
                <p className="text-xs font-medium text-foreground leading-snug truncate">
                  {alert.description}
                </p>
                <div className="text-[11px] text-muted-foreground flex items-center gap-2">
                  <span>Camera: <strong className="text-foreground font-mono">{alert.cameraId}</strong></span>
                  <span>•</span>
                  <span>Threat Score: <strong className="text-red-500 font-mono">{alert.threatScore}</strong></span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 flex-shrink-0 mt-1">
                {onAcknowledge && alert.status === 'NEW' && (
                  <button
                    onClick={() => onAcknowledge(alert.alertId)}
                    className="px-2.5 py-1 text-[11px] font-semibold text-accent bg-accent/10 hover:bg-accent/20 border border-[#37B9FF]/30 rounded-none transition-colors"
                  >
                    Acknowledge
                  </button>
                )}
                <Link
                  href={`/events/${alert.eventId}`}
                  className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-card rounded-none transition-colors"
                  title="View Event Forensic Details"
                >
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
