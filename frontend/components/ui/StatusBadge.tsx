"use client";

import React from 'react';
import { STATUS_COLORS } from '@/lib/constants';

interface StatusBadgeProps {
  status: string;
  className?: string;
  showDot?: boolean;
}

export function StatusBadge({ status, className = '', showDot = true }: StatusBadgeProps) {
  const upper = (status || '').toUpperCase() as keyof typeof STATUS_COLORS;
  const config = STATUS_COLORS[upper] || {
    bg: 'bg-[#6E7B87]/15',
    text: 'text-muted-foreground',
    border: 'border-[#6E7B87]/30',
    dot: 'bg-[#6E7B87]',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 h-6 px-2.5 rounded-none text-[11px] font-semibold border ${config.bg} ${config.text} ${config.border} ${className} whitespace-nowrap`}
    >
      {showDot && <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />}
      {status}
    </span>
  );
}
