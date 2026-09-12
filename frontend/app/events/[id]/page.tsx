"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Target,
  ShieldAlert,
  Image as ImageIcon,
  MapPin,
  Search,
  FileCheck,
  Compass,
  CheckCircle2,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { SeverityBadge } from '@/components/ui/SeverityBadge';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EventTimeline } from '@/components/events/EventTimeline';
import { getEvent, getEventTimeline } from '@/lib/api';
import { formatTimestamp } from '@/lib/utils';
import { EVENT_TYPE_LABELS } from '@/lib/constants';
import type { IBVAPEvent, TimelineEntry } from '@/types/event';

export default function EventDetailPage({ params }: { params: { id: string } }) {
  const [event, setEvent] = useState<IBVAPEvent | null>(null);
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([getEvent(params.id), getEventTimeline(params.id)]).then(([evtData, tlData]) => {
      if (evtData) setEvent(evtData);
      setTimeline(tlData);
      setIsLoading(false);
    });
  }, [params.id]);

  if (isLoading) {
    return (
      <div className="p-8 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
        <span className="w-4 h-4 border-2 border-[#37B9FF] border-t-transparent rounded-full animate-spin" />
        Retrieving forensic event telemetry and chain of custody...
      </div>
    );
  }

  if (!event) {
    return (
      <div className="p-8 text-center space-y-3">
        <h2 className="text-base font-bold text-red-500">Event Not Found</h2>
        <p className="text-xs text-muted-foreground">No recorded event exists for ID {params.id}.</p>
        <Link
          href="/events"
          className="inline-block px-4 py-2 bg-muted text-xs font-semibold rounded-none text-foreground"
        >
          Return to Events Feed
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={event.eventId}
        subtitle={`${EVENT_TYPE_LABELS[event.eventType] || event.eventType} • ${formatTimestamp(
          event.timestamp
        )}`}
        breadcrumbs={[
          { label: 'Events', href: '/events' },
          { label: event.eventId },
        ]}
        actions={
          <div className="flex items-center gap-3">
            <SeverityBadge severity={event.severity} />
            <Link
              href={`/investigation?eventId=${event.eventId}`}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-accent hover:bg-accent/90 text-[#071018] rounded-none text-xs font-bold transition-all shadow-lg"
            >
              <Search className="w-4 h-4" />
              Open Investigation
            </Link>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Forensic Snapshot Visual & Key Attributes */}
        <div className="lg:col-span-8 space-y-5">
          {/* Primary Evidence Snapshot Frame (Section 30) */}
          <div className="relative bg-[#05080B] border border-border rounded-none overflow-hidden shadow-2xl">
            <div
              className="relative w-full flex items-center justify-center bg-[#081017] overflow-hidden"
              style={{ aspectRatio: '16/9' }}
            >
              <div className="absolute inset-0 bg-[radial-gradient(#263442_1px,transparent_1px)] [background-size:20px_20px] opacity-30" />

              {/* Virtual fence line in snapshot */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100">
                <polygon
                  points="15,80 85,80 70,35 30,35"
                  fill="rgba(255, 92, 103, 0.12)"
                  stroke="#FF5C67"
                  strokeWidth="0.8"
                  strokeDasharray="2"
                />
              </svg>

              {/* Bounding Box Simulation */}
              <div
                className="absolute border-2 border-[#FF5C67] bg-red-500/20 flex flex-col justify-start"
                style={{ top: '30%', left: '42%', width: '16%', height: '45%' }}
              >
                <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 bg-red-500 text-[#071018] w-max">
                  {event.objectType} {(event.confidence * 100).toFixed(0)}% TRK-{event.trackId}
                </span>
              </div>

              {/* Watermark telemetry */}
              <div className="absolute top-3 left-3 bg-black/80 px-2.5 py-1 rounded text-[10px] font-mono text-white border border-white/10">
                PRIMARY FORENSIC KEYFRAME • {event.cameraId} ({event.bopId})
              </div>
            </div>
          </div>

          {/* Detailed Attributes Grid (Section 30) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 bg-card border border-border rounded-none">
              <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-1 flex items-center gap-1">
                <Target className="w-3.5 h-3.5 text-accent" /> Track Identity
              </div>
              <div className="text-base font-bold font-mono text-foreground">TRK-{event.trackId}</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">Confidence: {(event.confidence * 100).toFixed(0)}%</div>
            </div>

            <div className="p-3.5 bg-card border border-border rounded-none">
              <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-1 flex items-center gap-1">
                <ShieldAlert className="w-3.5 h-3.5 text-red-500" /> Threat Score
              </div>
              <div className="text-base font-bold font-mono text-red-500">{event.threatScore} / 100</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">Automated AI Assessment</div>
            </div>

            <div className="p-3.5 bg-card border border-border rounded-none">
              <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-1 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-[#F4C95D]" /> Monitored Zone
              </div>
              <div className="text-base font-bold font-mono text-foreground truncate">{event.zone}</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">BOP: {event.bopId}</div>
            </div>

            <div className="p-3.5 bg-card border border-border rounded-none">
              <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-1 flex items-center gap-1">
                <FileCheck className="w-3.5 h-3.5 text-green-500" /> Blockchain Proof
              </div>
              <Link
                href={`/evidence/${event.evidenceId}`}
                className="text-base font-bold font-mono text-accent hover:underline block truncate"
              >
                {event.evidenceId}
              </Link>
              <div className="text-[10px] text-green-500 mt-0.5 font-mono">Verify Hash →</div>
            </div>
          </div>
        </div>

        {/* Right Column: Deterministic Forensic Detection Timeline (Section 30) */}
        <div className="lg:col-span-4">
          <EventTimeline timeline={timeline} className="h-full" />
        </div>
      </div>
    </div>
  );
}
