"use client";

import React from 'react';
import Link from 'next/link';
import { Camera, ArrowRight } from 'lucide-react';

interface CameraHealthProps {
  total: number;
  online: number;
  offline: number;
  degraded: number;
  className?: string;
}

export function CameraHealthSummary({
  total,
  online,
  offline,
  degraded,
  className = '',
}: CameraHealthProps) {
  const onlinePct = Math.round((online / (total || 1)) * 100);

  return (
    <div className={`bg-card border border-border rounded-none p-5 flex flex-col justify-between ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Camera className="w-4 h-4 text-accent" />
          <h3 className="text-sm font-semibold text-foreground">Camera Grid Health</h3>
        </div>
        <Link
          href="/cameras"
          className="text-xs text-accent hover:underline flex items-center gap-1 font-medium"
        >
          Manage <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      <div className="space-y-3">
        <div className="flex items-baseline justify-between">
          <span className="text-2xl font-bold text-foreground font-mono">{online} / {total}</span>
          <span className="text-xs font-semibold text-green-500">{onlinePct}% Online</span>
        </div>

        {/* Multi-segment progress bar */}
        <div className="w-full h-2.5 bg-[#0F151C] rounded-full overflow-hidden flex border border-border">
          <div
            style={{ width: `${(online / (total || 1)) * 100}%` }}
            className="bg-[#39D98A] h-full"
            title={`Online: ${online}`}
          />
          <div
            style={{ width: `${(degraded / (total || 1)) * 100}%` }}
            className="bg-[#F4C95D] h-full"
            title={`Degraded: ${degraded}`}
          />
          <div
            style={{ width: `${(offline / (total || 1)) * 100}%` }}
            className="bg-red-500 h-full"
            title={`Offline: ${offline}`}
          />
        </div>

        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border text-center">
          <div>
            <div className="text-[10px] uppercase font-bold text-muted-foreground">Online</div>
            <div className="text-sm font-bold text-green-500 font-mono">{online}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-muted-foreground">Degraded</div>
            <div className="text-sm font-bold text-[#F4C95D] font-mono">{degraded}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-muted-foreground">Offline</div>
            <div className="text-sm font-bold text-red-500 font-mono">{offline}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
