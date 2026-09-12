"use client";

import React from 'react';
import * as LucideIcons from 'lucide-react';

interface EmptyStateProps {
  icon?: keyof typeof LucideIcons;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({
  icon = 'Inbox',
  title,
  description,
  actionLabel,
  onAction,
  className = '',
}: EmptyStateProps) {
  const IconComponent = (LucideIcons[icon] || LucideIcons.Inbox) as any;

  return (
    <div
      className={`flex flex-col items-center justify-center text-center p-8 sm:p-12 bg-card border border-border rounded-none ${className}`}
    >
      <div className="w-12 h-12 rounded-full bg-muted border border-border flex items-center justify-center text-muted-foreground mb-3.5">
        <IconComponent className="w-6 h-6" />
      </div>
      <h4 className="text-sm font-semibold text-foreground mb-1">{title}</h4>
      <p className="text-xs text-muted-foreground max-w-sm mb-4 leading-relaxed">{description}</p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="px-3.5 py-1.5 bg-accent text-[#071018] rounded-none text-xs font-semibold hover:bg-accent/90 transition-colors"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
