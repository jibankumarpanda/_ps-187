"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { Activity, Search, Filter, Download, User, Car, ScanFace, AlertTriangle } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { SeverityBadge } from '@/components/ui/SeverityBadge';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { FilterBar } from '@/components/ui/FilterBar';
import { TableSkeleton } from '@/components/ui/LoadingSkeleton';
import { useEvents } from '@/hooks/useEvents';
import { formatTimestamp } from '@/lib/utils';
import { EVENT_TYPE_LABELS } from '@/lib/constants';

export default function EventsPage() {
  const { events, isLoading } = useEvents();
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [bopFilter, setBopFilter] = useState('');

  const getEventIcon = (type: string) => {
    if (type.includes('PERSON') || type === 'INTRUSION') return <User className="w-3.5 h-3.5 text-accent" />;
    if (type.includes('VEHICLE') || type === 'ANPR_MATCH') return <Car className="w-3.5 h-3.5 text-[#F4C95D]" />;
    if (type.includes('FACE')) return <ScanFace className="w-3.5 h-3.5 text-green-500" />;
    return <AlertTriangle className="w-3.5 h-3.5 text-orange-500" />;
  };

  const filteredEvents = events.filter((evt) => {
    const matchesSearch =
      evt.eventId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      evt.zone.toLowerCase().includes(searchQuery.toLowerCase()) ||
      evt.cameraId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      evt.bopId.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = !typeFilter || evt.eventType === typeFilter;
    const matchesSeverity = !severityFilter || evt.severity === severityFilter;
    const matchesBop = !bopFilter || evt.bopId === bopFilter;
    return matchesSearch && matchesType && matchesSeverity && matchesBop;
  });

  const activeFilterCount =
    (typeFilter ? 1 : 0) + (severityFilter ? 1 : 0) + (bopFilter ? 1 : 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Events"
        subtitle="AI-detected border telemetry records, computer vision tracks, and spatial event streams."
        actions={
          <button
            onClick={() => {
              const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
                JSON.stringify(filteredEvents, null, 2)
              )}`;
              const downloadAnchor = document.createElement('a');
              downloadAnchor.setAttribute('href', jsonString);
              downloadAnchor.setAttribute('download', 'ibvap_surveillance_events.json');
              document.body.appendChild(downloadAnchor);
              downloadAnchor.click();
              downloadAnchor.remove();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-none bg-muted hover:bg-muted border border-border text-xs font-semibold text-foreground transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-accent" />
            Export Log
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
            placeholder="Search by Event ID, Zone, BOP..."
            className="w-full bg-[#0F151C] border border-border rounded-none pl-9 pr-4 h-9 text-xs text-foreground placeholder:text-[#677480] focus:border-[#37B9FF] focus:outline-none"
          />
        </div>

        <FilterBar
          filters={[
            {
              key: 'type',
              label: 'Event Types',
              options: [
                { label: 'Intrusion', value: 'INTRUSION' },
                { label: 'Person Detected', value: 'PERSON_DETECTED' },
                { label: 'Vehicle Detected', value: 'VEHICLE_DETECTED' },
                { label: 'ANPR Match', value: 'ANPR_MATCH' },
                { label: 'Face Match', value: 'FACE_MATCH' },
                { label: 'Loitering', value: 'LOITERING' },
                { label: 'Night Activity', value: 'NIGHT_ACTIVITY' },
                { label: 'Abandoned Object', value: 'ABANDONED_OBJECT' },
              ],
              value: typeFilter,
              onChange: setTypeFilter,
            },
            {
              key: 'severity',
              label: 'Severities',
              options: [
                { label: 'Critical', value: 'CRITICAL' },
                { label: 'High', value: 'HIGH' },
                { label: 'Medium', value: 'MEDIUM' },
                { label: 'Low', value: 'LOW' },
              ],
              value: severityFilter,
              onChange: setSeverityFilter,
            },
            {
              key: 'bop',
              label: 'BOPs',
              options: [
                { label: 'BOP-12', value: 'BOP-12' },
                { label: 'BOP-18', value: 'BOP-18' },
                { label: 'BOP-21', value: 'BOP-21' },
                { label: 'BOP-07', value: 'BOP-07' },
                { label: 'BOP-33', value: 'BOP-33' },
              ],
              value: bopFilter,
              onChange: setBopFilter,
            },
          ]}
          activeCount={activeFilterCount}
          onReset={() => {
            setTypeFilter('');
            setSeverityFilter('');
            setBopFilter('');
          }}
        />
      </div>

      {/* Main Events Table (Section 29) */}
      {isLoading ? (
        <TableSkeleton rows={8} cols={9} />
      ) : (
        <div className="bg-card border border-border rounded-none overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#101820] border-b border-[#25313C] text-[10px] font-semibold uppercase tracking-[0.04em] text-[#8E9AA6]">
                  <th className="px-4 py-3.5">Event ID</th>
                  <th className="px-4 py-3.5">Event Type</th>
                  <th className="px-4 py-3.5">Camera & BOP</th>
                  <th className="px-4 py-3.5">Object</th>
                  <th className="px-4 py-3.5">Confidence</th>
                  <th className="px-4 py-3.5">Threat Score</th>
                  <th className="px-4 py-3.5">Severity</th>
                  <th className="px-4 py-3.5">Timestamp</th>
                  <th className="px-4 py-3.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#25313C]">
                {filteredEvents.map((evt) => (
                  <tr
                    key={evt.eventId}
                    className="hover:bg-[#17212A] transition-colors cursor-pointer group"
                    onClick={() => (window.location.href = `/events/${evt.eventId}`)}
                  >
                    <td className="px-4 py-3.5 font-mono font-bold text-accent group-hover:underline">
                      <Link href={`/events/${evt.eventId}`}>{evt.eventId}</Link>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5 font-semibold text-foreground">
                        {getEventIcon(evt.eventType)}
                        <span>{EVENT_TYPE_LABELS[evt.eventType] || evt.eventType}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="font-mono text-foreground">{evt.cameraId}</div>
                      <div className="text-[11px] text-muted-foreground font-mono">{evt.bopId} • {evt.zone}</div>
                    </td>
                    <td className="px-4 py-3.5 font-mono font-bold text-muted-foreground">
                      {evt.objectType}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <div className="w-14 h-1.5 bg-[#0F151C] rounded-full overflow-hidden border border-border">
                          <div
                            className={`h-full ${
                              evt.confidence > 0.9 ? 'bg-[#39D98A]' : 'bg-[#F4C95D]'
                            }`}
                            style={{ width: `${evt.confidence * 100}%` }}
                          />
                        </div>
                        <span className="font-mono text-[11px] text-foreground">
                          {(evt.confidence * 100).toFixed(0)}%
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 font-mono font-bold text-red-500">
                      {evt.threatScore} / 100
                    </td>
                    <td className="px-4 py-3.5">
                      <SeverityBadge severity={evt.severity} />
                    </td>
                    <td className="px-4 py-3.5 font-mono text-muted-foreground">
                      {formatTimestamp(evt.timestamp)}
                    </td>
                    <td className="px-4 py-3.5">
                      <StatusBadge status={evt.status} />
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
