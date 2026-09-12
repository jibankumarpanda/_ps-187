"use client";

import React from 'react';
import { Filter, X, RotateCcw } from 'lucide-react';

interface FilterOption {
  key: string;
  label: string;
  options: { label: string; value: string }[];
  value: string;
  onChange: (val: string) => void;
}

interface FilterBarProps {
  filters: FilterOption[];
  onReset: () => void;
  activeCount?: number;
  className?: string;
}

export function FilterBar({
  filters,
  onReset,
  activeCount = 0,
  className = '',
}: FilterBarProps) {
  return (
    <div className={`flex flex-wrap items-center gap-2.5 ${className}`}>
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium mr-1">
        <Filter className="w-3.5 h-3.5 text-accent" />
        <span>Filters</span>
        {activeCount > 0 && (
          <span className="bg-accent/20 text-accent text-[10px] font-bold px-1.5 py-0.2 rounded-full">
            {activeCount}
          </span>
        )}
      </div>

      {filters.map((filter) => (
        <select
          key={filter.key}
          value={filter.value}
          onChange={(e) => filter.onChange(e.target.value)}
          className="bg-[#0F151C] border border-border hover:border-border text-foreground rounded-none px-3 h-9 text-xs focus:outline-none focus:border-[#37B9FF] transition-colors cursor-pointer"
        >
          <option value="">All {filter.label}</option>
          {filter.options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      ))}

      {activeCount > 0 && (
        <button
          onClick={onReset}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-red-500 px-2 py-1 transition-colors"
        >
          <RotateCcw className="w-3 h-3" />
          Clear
        </button>
      )}
    </div>
  );
}
