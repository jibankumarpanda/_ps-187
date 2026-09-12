"use client";

import React, { useState } from 'react';
import { ShieldAlert, AlertTriangle, Filter, Search, CheckCircle2, RefreshCw } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { AlertTable } from '@/components/alerts/AlertTable';
import { FilterBar } from '@/components/ui/FilterBar';
import { useAlerts } from '@/hooks/useAlerts';
import { useToast } from '@/components/ui/Toast';
import { TableSkeleton } from '@/components/ui/LoadingSkeleton';
import type { AlertStatus } from '@/types/alert';

export default function AlertsPage() {
  const { alerts, isLoading, refetch, updateStatus } = useAlerts();
  const { showToast } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [bopFilter, setBopFilter] = useState('');

  const criticalCount = alerts.filter((a) => a.severity === 'CRITICAL' && a.status !== 'RESOLVED').length;
  const highCount = alerts.filter((a) => a.severity === 'HIGH' && a.status !== 'RESOLVED').length;
  const mediumCount = alerts.filter((a) => a.severity === 'MEDIUM' && a.status !== 'RESOLVED').length;
  const lowCount = alerts.filter((a) => a.severity === 'LOW' && a.status !== 'RESOLVED').length;

  const filteredAlerts = alerts.filter((a) => {
    const matchesSearch =
      a.alertId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.eventType.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.cameraId.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSeverity = !severityFilter || a.severity === severityFilter;
    const matchesStatus = !statusFilter || a.status === statusFilter;
    const matchesBop = !bopFilter || a.bopId === bopFilter;
    return matchesSearch && matchesSeverity && matchesStatus && matchesBop;
  });

  const handleUpdateStatus = async (alertId: string, status: AlertStatus) => {
    await updateStatus(alertId, status);
    const messages: Record<AlertStatus, string> = {
      NEW: 'Alert reset to new.',
      ACKNOWLEDGED: 'Alert acknowledged and logged to duty log.',
      INVESTIGATING: 'Case file opened for investigation.',
      RESOLVED: 'Alert verified and resolved by operator.',
      ESCALATED: 'Alert escalated to Border Sector Commander.',
    };
    showToast({
      title: `Status: ${status}`,
      message: messages[status],
      type: status === 'ESCALATED' ? 'error' : status === 'RESOLVED' ? 'success' : 'info',
    });
  };

  const activeFilterCount =
    (severityFilter ? 1 : 0) + (statusFilter ? 1 : 0) + (bopFilter ? 1 : 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Alert Center"
        subtitle="Real-time security events requiring immediate border operator attention."
        actions={
          <button
            onClick={refetch}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-none bg-muted hover:bg-muted border border-border text-xs font-semibold text-foreground transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5 text-accent" />
            Refresh
          </button>
        }
      />

      {/* ─── TOP SUMMARY COUNTERS (Section 27) ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div
          onClick={() => setSeverityFilter(severityFilter === 'CRITICAL' ? '' : 'CRITICAL')}
          className={`p-4 rounded-none bg-card border cursor-pointer transition-all ${
            severityFilter === 'CRITICAL' ? 'border-[#FF5C67] ring-1 ring-[#FF5C67]' : 'border-border hover:border-border'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-red-500">Critical</span>
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
          </div>
          <div className="text-2xl font-bold font-mono text-foreground mt-2">{criticalCount}</div>
          <span className="text-[11px] text-muted-foreground">Requires immediate action</span>
        </div>

        <div
          onClick={() => setSeverityFilter(severityFilter === 'HIGH' ? '' : 'HIGH')}
          className={`p-4 rounded-none bg-card border cursor-pointer transition-all ${
            severityFilter === 'HIGH' ? 'border-[#FF8A4C] ring-1 ring-[#FF8A4C]' : 'border-border hover:border-border'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-orange-500">High</span>
            <span className="w-2.5 h-2.5 rounded-full bg-[#FF8A4C]" />
          </div>
          <div className="text-2xl font-bold font-mono text-foreground mt-2">{highCount}</div>
          <span className="text-[11px] text-muted-foreground">Priority watch alerts</span>
        </div>

        <div
          onClick={() => setSeverityFilter(severityFilter === 'MEDIUM' ? '' : 'MEDIUM')}
          className={`p-4 rounded-none bg-card border cursor-pointer transition-all ${
            severityFilter === 'MEDIUM' ? 'border-[#F4C95D] ring-1 ring-[#F4C95D]' : 'border-border hover:border-border'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#F4C95D]">Medium</span>
            <span className="w-2.5 h-2.5 rounded-full bg-[#F4C95D]" />
          </div>
          <div className="text-2xl font-bold font-mono text-foreground mt-2">{mediumCount}</div>
          <span className="text-[11px] text-muted-foreground">Standard perimeter events</span>
        </div>

        <div
          onClick={() => setSeverityFilter(severityFilter === 'LOW' ? '' : 'LOW')}
          className={`p-4 rounded-none bg-card border cursor-pointer transition-all ${
            severityFilter === 'LOW' ? 'border-[#63A8FF] ring-1 ring-[#63A8FF]' : 'border-border hover:border-border'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#63A8FF]">Low</span>
            <span className="w-2.5 h-2.5 rounded-full bg-[#63A8FF]" />
          </div>
          <div className="text-2xl font-bold font-mono text-foreground mt-2">{lowCount}</div>
          <span className="text-[11px] text-muted-foreground">Informational detections</span>
        </div>
      </div>

      {/* ─── FILTERS & SEARCH (Section 27) ─── */}
      <div className="bg-card border border-border rounded-none p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search alerts by description, camera, BOP..."
            className="w-full bg-[#0F151C] border border-border rounded-none pl-9 pr-4 h-9 text-xs text-foreground placeholder:text-[#677480] focus:border-[#37B9FF] focus:outline-none"
          />
        </div>

        <FilterBar
          filters={[
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
              key: 'status',
              label: 'Statuses',
              options: [
                { label: 'New', value: 'NEW' },
                { label: 'Acknowledged', value: 'ACKNOWLEDGED' },
                { label: 'Investigating', value: 'INVESTIGATING' },
                { label: 'Resolved', value: 'RESOLVED' },
                { label: 'Escalated', value: 'ESCALATED' },
              ],
              value: statusFilter,
              onChange: setStatusFilter,
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
            setSeverityFilter('');
            setStatusFilter('');
            setBopFilter('');
          }}
        />
      </div>

      {/* Main Alert Table */}
      {isLoading ? (
        <TableSkeleton rows={8} cols={8} />
      ) : (
        <AlertTable alerts={filteredAlerts} onUpdateStatus={handleUpdateStatus} />
      )}
    </div>
  );
}
