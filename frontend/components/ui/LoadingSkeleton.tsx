"use client";

import React from 'react';

export function SkeletonBox({ className = '' }: { className?: string }) {
  return (
    <div
      className={`bg-muted animate-pulse rounded-none ${className}`}
    />
  );
}

export function TableSkeleton({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="bg-card border border-border rounded-none overflow-hidden p-4 space-y-3">
      <div className="flex gap-4 pb-3 border-b border-[#25313C]">
        {Array.from({ length: cols }).map((_, i) => (
          <SkeletonBox key={i} className="h-4 flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-4 py-2 border-b border-[#25313C]/40 last:border-b-0">
          {Array.from({ length: cols }).map((_, c) => (
            <SkeletonBox key={c} className="h-5 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function CardSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-card border border-border rounded-none p-5 space-y-3">
          <div className="flex justify-between items-center">
            <SkeletonBox className="h-3 w-24" />
            <SkeletonBox className="h-7 w-7 rounded-none" />
          </div>
          <SkeletonBox className="h-8 w-16" />
          <SkeletonBox className="h-3 w-32" />
        </div>
      ))}
    </div>
  );
}
