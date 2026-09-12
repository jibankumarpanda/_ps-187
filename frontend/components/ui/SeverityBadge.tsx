"use client";

import React from 'react';
import { SEVERITY_COLORS } from '@/lib/constants';
import type { Severity } from '@/types/event';

interface SeverityBadgeProps {
  severity: Severity | string;
  className?: string;
  showDot?: boolean;
}

export function SeverityBadge({ severity, className = '', showDot = true }: SeverityBadgeProps) {
  const upper = (severity || '').toUpperCase() as keyof typeof SEVERITY_COLORS;
  const config = SEVERITY_COLORS[upper] || {
    bg: 'bg-[#6E7B87]/15',
    text: 'text-muted-foreground',
    border: 'border-[#6E7B87]/40',
    dot: 'bg-[#6E7B87]',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 h-6 px-2.5 rounded-none text-[11px] font-bold tracking-wide border ${config.bg} ${config.text} ${config.border} ${className} whitespace-nowrap`}
    >
      {showDot && (
        <span
          className={`w-1.5 h-1.5 rounded-full ${config.dot} ${upper === 'CRITICAL' ? 'animate-pulse' : ''}`}
        />
      )}
      {severity}
    </span>
  );
}
