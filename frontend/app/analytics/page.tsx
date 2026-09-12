"use client";

import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, AlertTriangle, Shield, RefreshCw } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { AnalyticsMetrics } from '@/components/analytics/AnalyticsMetrics';
import { ThreatOverviewChart } from '@/components/dashboard/ThreatOverviewChart';
import { StatsCard } from '@/components/ui/StatsCard';
import { CardSkeleton } from '@/components/ui/LoadingSkeleton';
import { getAnalytics } from '@/lib/api';

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    setIsLoading(true);
    const data = await getAnalytics();
    setAnalytics(data);
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Intelligence Analytics"
        subtitle="Aggregated temporal patterns, AI inference telemetry, and multi-sector threat distribution analytics."
        actions={
          <button
            onClick={loadData}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-none bg-muted hover:bg-muted border border-border text-xs font-semibold text-foreground transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-accent ${isLoading ? 'animate-spin' : ''}`} />
            Recalculate Models
          </button>
        }
      />

      {/* Summary KPI metrics */}
      {isLoading || !analytics ? (
        <CardSkeleton count={4} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            title="Total Breaches Prevented"
            value="142"
            icon="Shield"
            trend={{ value: "+8 this week", isPositive: true }}
            indicatorColor="#39D98A"
          />
          <StatsCard
            title="Avg Intrusion Triage Time"
            value="3.4s"
            icon="TrendingUp"
            trend={{ value: "-0.8s vs baseline", isPositive: true }}
            indicatorColor="#37B9FF"
          />
          <StatsCard
            title="Peak Risk Period"
            value="02:00–04:00"
            icon="AlertTriangle"
            subtitle="Night vision sector active"
            indicatorColor="#FF8A4C"
          />
          <StatsCard
            title="AI Confidence Index"
            value="98.2%"
            icon="BarChart3"
            trend={{ value: "YOLOv8 + ByteTrack", isPositive: true }}
            indicatorColor="#63A8FF"
          />
        </div>
      )}

      {/* 24-Hour Severity Breakdown */}
      {analytics && (
        <ThreatOverviewChart
          data={analytics.alertsByHour}
          className="shadow-lg"
        />
      )}

      {/* Multi-metric visualizations (Section 37) */}
      {analytics && (
        <AnalyticsMetrics
          eventsByDay={analytics.eventsByDay}
          threatDistribution={analytics.threatDistribution}
          bopEvents={analytics.bopEvents}
        />
      )}
    </div>
  );
}
