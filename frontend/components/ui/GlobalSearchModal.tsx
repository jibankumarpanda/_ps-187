"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X, Camera, AlertTriangle, Activity, FileCheck, Users, ChevronRight } from 'lucide-react';
import { globalSearch } from '@/lib/api';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function GlobalSearchModal({ isOpen, onClose }: GlobalSearchModalProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any>({
    cameras: [],
    alerts: [],
    events: [],
    evidence: [],
    watchlist: [],
  });
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
      setResults({ cameras: [], alerts: [], events: [], evidence: [], watchlist: [] });
    }
  }, [isOpen]);

  useEffect(() => {
    if (!query.trim()) {
      setResults({ cameras: [], alerts: [], events: [], evidence: [], watchlist: [] });
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      const res = await globalSearch(query);
      setResults(res);
      setIsSearching(false);
    }, 180);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = (url: string) => {
    router.push(url);
    onClose();
  };

  if (!isOpen) return null;

  const totalResults =
    results.cameras.length +
    results.alerts.length +
    results.events.length +
    results.evidence.length +
    results.watchlist.length;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-black/70 backdrop-blur-[2px] animate-fade-in">
      <div
        className="w-full max-w-2xl bg-card border border-border rounded-none shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-border bg-muted">
          <Search className="w-5 h-5 text-accent mr-3 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search cameras, alerts, events, evidence, watchlist..."
            className="w-full bg-transparent text-sm text-foreground placeholder:text-[#677480] focus:outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="text-muted-foreground hover:text-foreground p-1 mr-1"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-mono text-muted-foreground bg-[#0F151C] border border-border rounded">
            ESC to close
          </kbd>
        </div>

        {/* Results Body */}
        <div className="max-h-[60vh] overflow-y-auto p-3 space-y-4">
          {isSearching && (
            <div className="py-8 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
              <span className="w-3.5 h-3.5 border-2 border-[#37B9FF] border-t-transparent rounded-full animate-spin" />
              Searching surveillance records...
            </div>
          )}

          {!isSearching && query && totalResults === 0 && (
            <div className="py-8 text-center text-xs text-muted-foreground">
              No surveillance entities found matching &quot;{query}&quot;
            </div>
          )}

          {!query && (
            <div className="py-6 px-4 text-xs text-muted-foreground space-y-2">
              <div className="font-semibold uppercase tracking-wider text-muted-foreground">Quick Navigation</div>
              <div className="grid grid-cols-2 gap-2 pt-1 text-muted-foreground">
                <button
                  onClick={() => handleSelect('/live')}
                  className="flex items-center gap-2 p-2 rounded hover:bg-muted text-left"
                >
                  <Camera className="w-4 h-4 text-accent" /> Live Surveillance Grid
                </button>
                <button
                  onClick={() => handleSelect('/alerts')}
                  className="flex items-center gap-2 p-2 rounded hover:bg-muted text-left"
                >
                  <AlertTriangle className="w-4 h-4 text-red-500" /> Active Alert Center
                </button>
                <button
                  onClick={() => handleSelect('/evidence')}
                  className="flex items-center gap-2 p-2 rounded hover:bg-muted text-left"
                >
                  <FileCheck className="w-4 h-4 text-green-500" /> Blockchain Evidence Ledger
                </button>
                <button
                  onClick={() => handleSelect('/investigation')}
                  className="flex items-center gap-2 p-2 rounded hover:bg-muted text-left"
                >
                  <Activity className="w-4 h-4 text-[#63A8FF]" /> Investigation Workspace
                </button>
              </div>
            </div>
          )}

          {/* Categorized results */}
          {results.cameras.length > 0 && (
            <div>
              <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider px-2 mb-1.5 flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5 text-accent" /> Cameras ({results.cameras.length})
              </div>
              <div className="space-y-1">
                {results.cameras.map((c: any) => (
                  <div
                    key={c.id}
                    onClick={() => handleSelect(`/cameras/${c.id}`)}
                    className="flex items-center justify-between p-2.5 rounded-none bg-[#0F151C] hover:bg-muted cursor-pointer transition-colors border border-transparent hover:border-border"
                  >
                    <div>
                      <div className="text-xs font-semibold text-foreground">{c.name}</div>
                      <div className="text-[11px] text-muted-foreground font-mono">
                        {c.id} • {c.location} ({c.bopId})
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {results.alerts.length > 0 && (
            <div>
              <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider px-2 mb-1.5 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-red-500" /> Alerts ({results.alerts.length})
              </div>
              <div className="space-y-1">
                {results.alerts.map((a: any) => (
                  <div
                    key={a.alertId}
                    onClick={() => handleSelect(`/alerts`)}
                    className="flex items-center justify-between p-2.5 rounded-none bg-[#0F151C] hover:bg-muted cursor-pointer transition-colors border border-transparent hover:border-border"
                  >
                    <div>
                      <div className="text-xs font-semibold text-foreground">{a.description}</div>
                      <div className="text-[11px] text-muted-foreground font-mono">
                        {a.alertId} • {a.severity} • {a.bopId}
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {results.evidence.length > 0 && (
            <div>
              <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider px-2 mb-1.5 flex items-center gap-1.5">
                <FileCheck className="w-3.5 h-3.5 text-green-500" /> Evidence & Blockchain (
                {results.evidence.length})
              </div>
              <div className="space-y-1">
                {results.evidence.map((ev: any) => (
                  <div
                    key={ev.evidenceId}
                    onClick={() => handleSelect(`/evidence/${ev.evidenceId}`)}
                    className="flex items-center justify-between p-2.5 rounded-none bg-[#0F151C] hover:bg-muted cursor-pointer transition-colors border border-transparent hover:border-border"
                  >
                    <div>
                      <div className="text-xs font-semibold text-foreground font-mono">
                        {ev.evidenceId} ({ev.evidenceType})
                      </div>
                      <div className="text-[11px] text-muted-foreground font-mono">
                        Tx: {ev.blockchainTxId} • Block #{ev.blockNumber}
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {results.watchlist.length > 0 && (
            <div>
              <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider px-2 mb-1.5 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-[#63A8FF]" /> Watchlist Matches (
                {results.watchlist.length})
              </div>
              <div className="space-y-1">
                {results.watchlist.map((w: any, idx: number) => (
                  <div
                    key={idx}
                    onClick={() => handleSelect(`/watchlist`)}
                    className="flex items-center justify-between p-2.5 rounded-none bg-[#0F151C] hover:bg-muted cursor-pointer transition-colors border border-transparent hover:border-border"
                  >
                    <div>
                      <div className="text-xs font-semibold text-foreground">
                        {w.name || w.numberPlate}
                      </div>
                      <div className="text-[11px] text-muted-foreground font-mono">
                        {w.referenceId || w.vehicleId} • {w.category}
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
