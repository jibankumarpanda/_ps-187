"use client";

import React from 'react';
import { Target, MapPin, ShieldAlert, Camera, Blocks, CheckCircle2 } from 'lucide-react';
import type { TimelineEntry } from '@/types/event';

interface EventTimelineProps {
  timeline: TimelineEntry[];
  className?: string;
}

export function EventTimeline({ timeline, className = '' }: EventTimelineProps) {
  const getIcon = (type: string) => {
    switch (type) {
      case 'detection':
        return <Target className="w-3.5 h-3.5 text-accent" />;
      case 'zone':
        return <MapPin className="w-3.5 h-3.5 text-[#F4C95D]" />;
      case 'boundary':
        return <ShieldAlert className="w-3.5 h-3.5 text-red-500" />;
      case 'alert':
        return <ShieldAlert className="w-3.5 h-3.5 text-orange-500" />;
      case 'evidence':
        return <Camera className="w-3.5 h-3.5 text-[#63A8FF]" />;
      case 'blockchain':
        return <Blocks className="w-3.5 h-3.5 text-green-500" />;
      default:
        return <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />;
    }
  };

  const getBorderColor = (type: string) => {
    switch (type) {
      case 'boundary':
      case 'alert':
        return 'border-[#FF5C67] bg-red-500/10';
      case 'blockchain':
        return 'border-[#39D98A] bg-[#39D98A]/10';
      default:
        return 'border-[#37B9FF] bg-accent/10';
    }
  };

  return (
    <div className={`bg-card border border-border rounded-none p-5 ${className}`}>
      <h3 className="text-sm font-semibold text-foreground mb-1">C2 Detection & Forensics Timeline</h3>
      <p className="text-xs text-muted-foreground mb-4">
        Deterministic sequence of telemetry events cryptographically sealed into the blockchain ledger.
      </p>

      <div className="relative border-l border-border ml-3.5 space-y-6 pl-5 py-2">
        {timeline.map((entry, index) => (
          <div key={index} className="relative group">
            {/* Timeline node icon */}
            <div
              className={`absolute -left-[31px] top-0.5 w-6 h-6 rounded-full border flex items-center justify-center ${getBorderColor(
                entry.type
              )}`}
            >
              {getIcon(entry.type)}
            </div>

            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono font-bold text-accent">{entry.time} IST</span>
                <span className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider font-mono">
                  STEP 0{index + 1}
                </span>
              </div>
              <p className="text-xs font-medium text-foreground leading-relaxed">{entry.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
