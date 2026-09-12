"use client";

import React from 'react';
import { Cpu, HardDrive, Zap, Server } from 'lucide-react';
import type { HardwareMetrics } from '@/types/system';

interface HardwareMonitorProps {
  metrics: HardwareMetrics;
  className?: string;
}

export function SystemStatusCard({ metrics, className = '' }: HardwareMonitorProps) {
  const getMeterColor = (pct: number) => {
    if (pct > 85) return 'bg-red-500';
    if (pct > 70) return 'bg-[#F4C95D]';
    return 'bg-accent';
  };

  const meters = [
    { label: 'C2 Edge Cluster CPU', value: metrics.cpu, icon: Cpu, unit: '%' },
    { label: 'System Memory (RAM)', value: metrics.ram, icon: Server, unit: '%' },
    { label: 'Neural Tensor GPU', value: metrics.gpu, icon: Zap, unit: '%' },
    { label: 'Encrypted Storage Array', value: metrics.storage, icon: HardDrive, unit: '%' },
  ];

  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 ${className}`}>
      {meters.map((meter) => {
        const Icon = meter.icon;
        return (
          <div
            key={meter.label}
            className="bg-card border border-border rounded-none p-4 flex flex-col justify-between"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
                {meter.label}
              </span>
              <Icon className="w-4 h-4 text-accent" />
            </div>

            <div className="my-2">
              <div className="text-2xl font-bold font-mono text-foreground">
                {meter.value}
                <span className="text-xs font-normal text-muted-foreground ml-0.5">{meter.unit}</span>
              </div>
            </div>

            <div className="w-full h-1.5 bg-[#0F151C] rounded-full overflow-hidden border border-border mt-1">
              <div
                className={`h-full transition-all duration-500 ${getMeterColor(meter.value)}`}
                style={{ width: `${meter.value}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
