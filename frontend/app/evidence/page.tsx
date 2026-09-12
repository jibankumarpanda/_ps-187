"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { FileCheck, Search, Filter, Copy, Check, ExternalLink, ShieldCheck, RefreshCw } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { FilterBar } from '@/components/ui/FilterBar';
import { TableSkeleton } from '@/components/ui/LoadingSkeleton';
import { useEvidence } from '@/hooks/useEvidence';
import { useToast } from '@/components/ui/Toast';
import { formatTimestamp, truncateHash } from '@/lib/utils';
import type { Evidence } from '@/types/evidence';

export default function EvidencePage() {
  const { evidenceList, isLoading, refetch } = useEvidence();
  const { showToast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopyHash = (hash: string, id: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedId(id);
    showToast({
      title: 'Evidence SHA-256 Copied',
      message: hash,
      type: 'info',
    });
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredEvidence = evidenceList.filter((ev) => {
    const matchesSearch =
      ev.evidenceId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ev.eventId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ev.cameraId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ev.blockchainTxId.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = !typeFilter || ev.evidenceType === typeFilter;
    const matchesStatus = !statusFilter || ev.verificationStatus === statusFilter;
    return matchesSearch && matchesType && matchesStatus;
  });

  const activeFilterCount = (typeFilter ? 1 : 0) + (statusFilter ? 1 : 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Evidence Ledger"
        subtitle="Tamper-proof surveillance snapshots, video clips, and metadata sealed on Hyperledger Fabric."
        actions={
          <button
            onClick={refetch}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-none bg-muted hover:bg-muted border border-border text-xs font-semibold text-foreground transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5 text-accent" />
            Sync Ledger
          </button>
        }
      />

      {/* Filter and Search Bar */}
      <div className="bg-card border border-border rounded-none p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Evidence ID, Event ID, Tx ID..."
            className="w-full bg-input border border-border rounded-none pl-9 pr-4 h-12 text-base text-foreground placeholder:text-muted-foreground focus:border-accent focus:outline-none transition-colors"
          />
        </div>

        <FilterBar
          filters={[
            {
              key: 'type',
              label: 'Evidence Types',
              options: [
                { label: 'Snapshot', value: 'SNAPSHOT' },
                { label: 'Video Clip', value: 'VIDEO_CLIP' },
                { label: 'Key Frame', value: 'FRAME' },
                { label: 'Metadata', value: 'METADATA' },
              ],
              value: typeFilter,
              onChange: setTypeFilter,
            },
            {
              key: 'status',
              label: 'Verification Statuses',
              options: [
                { label: 'Verified', value: 'VERIFIED' },
                { label: 'Pending', value: 'PENDING' },
                { label: 'Failed', value: 'FAILED' },
              ],
              value: statusFilter,
              onChange: setStatusFilter,
            },
          ]}
          activeCount={activeFilterCount}
          onReset={() => {
            setTypeFilter('');
            setStatusFilter('');
          }}
        />
      </div>

      {/* Main Evidence Table (Section 32) */}
      {isLoading ? (
        <TableSkeleton rows={8} cols={8} />
      ) : (
        <div className="bg-card border border-border rounded-none overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-muted border-b border-border text-xs font-bold uppercase tracking-widest text-muted-foreground font-mono">
                  <th className="px-4 py-3.5">Evidence ID</th>
                  <th className="px-4 py-3.5">Event ID</th>
                  <th className="px-4 py-3.5">Camera / BOP</th>
                  <th className="px-4 py-3.5">Type</th>
                  <th className="px-4 py-3.5">Timestamp</th>
                  <th className="px-4 py-3.5">SHA-256 Digest</th>
                  <th className="px-4 py-3.5">Blockchain Tx</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredEvidence.map((ev) => (
                  <tr key={ev.evidenceId} className="hover:bg-muted transition-colors">
                    <td className="px-4 py-3.5 font-mono font-bold text-accent">
                      <Link href={`/evidence/${ev.evidenceId}`} className="hover:underline">
                        {ev.evidenceId}
                      </Link>
                    </td>
                    <td className="px-4 py-3.5 font-mono text-foreground">
                      <Link href={`/events/${ev.eventId}`} className="hover:text-accent hover:underline">
                        {ev.eventId}
                      </Link>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="font-mono text-foreground">{ev.cameraId}</div>
                      <div className="text-[11px] text-muted-foreground font-mono">{ev.bopId}</div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="px-2 py-0.5 bg-muted border border-border font-mono text-xs text-muted-foreground uppercase tracking-widest">
                        {ev.evidenceType}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 font-mono text-muted-foreground">
                      {formatTimestamp(ev.timestamp)}
                    </td>
                    <td className="px-4 py-3.5 font-mono text-xs">
                      <button
                        onClick={() => handleCopyHash(ev.hash, ev.evidenceId)}
                        className="flex items-center gap-1 text-muted-foreground hover:text-accent transition-colors"
                        title="Click to copy full SHA-256"
                      >
                        <span>{truncateHash(ev.hash)}</span>
                        {copiedId === ev.evidenceId ? (
                          <Check className="w-3 h-3 text-green-500" />
                        ) : (
                          <Copy className="w-3 h-3 opacity-60" />
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-3.5 font-mono text-green-500">
                      {ev.blockchainTxId}
                    </td>
                    <td className="px-4 py-3.5">
                      <StatusBadge status={ev.verificationStatus} />
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <Link
                        href={`/evidence/${ev.evidenceId}`}
                        className="px-4 py-2 text-xs font-bold text-accent-foreground bg-accent hover:bg-foreground hover:text-background rounded-none transition-colors inline-flex items-center gap-2 uppercase tracking-wider"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        Verify
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
