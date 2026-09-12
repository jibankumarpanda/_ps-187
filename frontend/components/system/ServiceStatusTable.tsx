"use client";

import React from 'react';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatTime } from '@/lib/utils';
import type { ServiceHealth } from '@/types/system';

interface ServiceStatusTableProps {
  services: ServiceHealth[];
  className?: string;
}

export function ServiceStatusTable({ services, className = '' }: ServiceStatusTableProps) {
  return (
    <div className={`bg-card border border-border rounded-none overflow-hidden ${className}`}>
      <div className="p-4 border-b border-border bg-muted/60 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Mission-Critical Platform Microservices</h3>
        <span className="text-xs font-mono text-green-500 bg-[#39D98A]/10 px-2 py-0.5 rounded border border-[#39D98A]/20">
          ALL SERVICES OPERATIONAL
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-[#101820] border-b border-[#25313C] text-[10px] font-semibold uppercase tracking-[0.04em] text-[#8E9AA6]">
              <th className="px-4 py-3.5">Service Name</th>
              <th className="px-4 py-3.5">Status</th>
              <th className="px-4 py-3.5">Roundtrip Latency</th>
              <th className="px-4 py-3.5">Uptime SLA</th>
              <th className="px-4 py-3.5">Last Health Heartbeat</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#25313C]">
            {services.map((svc) => (
              <tr key={svc.name} className="hover:bg-[#17212A] transition-colors">
                <td className="px-4 py-3.5 font-semibold text-foreground">{svc.name}</td>
                <td className="px-4 py-3.5">
                  <StatusBadge status={svc.status} />
                </td>
                <td className="px-4 py-3.5 font-mono text-foreground">
                  <span className={svc.latency < 50 ? 'text-green-500' : 'text-[#F4C95D]'}>
                    {svc.latency}ms
                  </span>
                </td>
                <td className="px-4 py-3.5 font-mono text-green-500 font-medium">
                  {svc.uptime}%
                </td>
                <td className="px-4 py-3.5 font-mono text-muted-foreground">
                  {formatTime(svc.lastCheck)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
