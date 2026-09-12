"use client";

import React from 'react';
import { User, ShieldAlert, Eye } from 'lucide-react';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatTimestamp } from '@/lib/utils';
import type { WatchlistPerson } from '@/types/watchlist';

interface WatchlistPersonTableProps {
  persons: WatchlistPerson[];
  className?: string;
}

export function WatchlistPersonTable({ persons, className = '' }: WatchlistPersonTableProps) {
  return (
    <div className={`bg-card border border-border rounded-none overflow-hidden ${className}`}>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-[#101820] border-b border-[#25313C] text-[10px] font-semibold uppercase tracking-[0.04em] text-[#8E9AA6]">
              <th className="px-4 py-3.5">Reference ID</th>
              <th className="px-4 py-3.5">Target Name / Alias</th>
              <th className="px-4 py-3.5">Priority Category</th>
              <th className="px-4 py-3.5">Status</th>
              <th className="px-4 py-3.5">Last Match</th>
              <th className="px-4 py-3.5">Added Date</th>
              <th className="px-4 py-3.5">Enlisted By</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#25313C]">
            {persons.map((person) => (
              <tr key={person.referenceId} className="hover:bg-[#17212A] transition-colors">
                <td className="px-4 py-3.5 font-mono font-bold text-accent">
                  {person.referenceId}
                </td>
                <td className="px-4 py-3.5 font-semibold text-foreground">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-muted border border-border flex items-center justify-center text-muted-foreground">
                      <User className="w-3.5 h-3.5" />
                    </div>
                    <span>{person.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3.5">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-red-500/15 text-red-500 border border-[#FF5C67]/30">
                    {person.category}
                  </span>
                </td>
                <td className="px-4 py-3.5">
                  <StatusBadge status={person.status} />
                </td>
                <td className="px-4 py-3.5 font-mono text-foreground">
                  {person.lastMatch ? formatTimestamp(person.lastMatch) : '— No Match Yet —'}
                </td>
                <td className="px-4 py-3.5 font-mono text-muted-foreground">
                  {formatTimestamp(person.addedAt)}
                </td>
                <td className="px-4 py-3.5 text-muted-foreground font-medium">{person.addedBy}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
