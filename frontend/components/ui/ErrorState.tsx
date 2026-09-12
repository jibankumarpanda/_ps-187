"use client";

import React from 'react';
import { AlertCircle, RotateCcw } from 'lucide-react';

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  message = 'Unable to load surveillance data. Check network connection and retry.',
  onRetry,
  className = '',
}: ErrorStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center p-8 bg-card border border-[#FF5C67]/30 rounded-none ${className}`}
    >
      <div className="w-11 h-11 rounded-full bg-red-500/10 border border-[#FF5C67]/20 flex items-center justify-center text-red-500 mb-3">
        <AlertCircle className="w-6 h-6" />
      </div>
      <h4 className="text-sm font-semibold text-foreground mb-1">Operational Request Failed</h4>
      <p className="text-xs text-muted-foreground max-w-sm mb-4 leading-relaxed">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-muted border border-border hover:bg-muted text-foreground rounded-none text-xs font-semibold transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5 text-accent" />
          Retry
        </button>
      )}
    </div>
  );
}
