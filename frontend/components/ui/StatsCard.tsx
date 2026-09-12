"use client";

import React from 'react';
import * as LucideIcons from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: keyof typeof LucideIcons | React.ReactNode;
  subtitle?: string;
  trend?: {
    value: string;
    isPositive?: boolean;
  };
  indicatorColor?: string; // hex or tailwind color
  isCritical?: boolean;
  onClick?: () => void;
  className?: string;
}

export function StatsCard({
  title,
  value,
  icon,
  subtitle,
  trend,
  indicatorColor = '#37B9FF',
  isCritical = false,
  onClick,
  className = '',
}: StatsCardProps) {
  // Render icon
  let iconElement: React.ReactNode = null;
  if (typeof icon === 'string') {
    // @ts-ignore
    const IconComponent = LucideIcons[icon] || LucideIcons.Activity;
    iconElement = <IconComponent className="w-4 h-4" style={{ color: indicatorColor }} />;
  } else {
    iconElement = icon;
  }

  return (
    <div
      onClick={onClick}
      className={`relative bg-card border border-border rounded-none p-6 flex flex-col justify-between transition-all duration-150 ${
        isCritical ? 'border-t-2 border-t-accent' : ''
      } ${onClick ? 'cursor-pointer hover:border-accent hover:bg-muted' : ''} ${className}`}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground truncate font-mono">
          {title}
        </span>
        <div className="w-8 h-8 flex items-center justify-end text-accent">
          {iconElement}
        </div>
      </div>

      <div className="flex items-baseline gap-2 my-2 border-b border-border/50 pb-4">
        <span
          className={`text-5xl sm:text-6xl font-bold tracking-tighter text-foreground leading-none font-tight ${
            isCritical ? 'text-accent' : ''
          }`}
        >
          {value}
        </span>
      </div>

      {(trend || subtitle) && (
        <div className="flex items-center justify-between text-xs mt-2 pt-2 border-t border-border/50">
          {trend && (
            <span
              className={`font-medium ${
                trend.isPositive ? 'text-green-500' : 'text-orange-500'
              }`}
            >
              {trend.value}
            </span>
          )}
          {subtitle && (
            <span className="text-muted-foreground truncate text-[11px]">{subtitle}</span>
          )}
        </div>
      )}
    </div>
  );
}
