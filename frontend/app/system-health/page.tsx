"use client";

import React from 'react';
import { Activity, Server, Cpu, HardDrive, RefreshCw, Zap, ShieldCheck } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { SystemStatusCard } from '@/components/system/SystemStatusCard';
import { ServiceStatusTable } from '@/components/system/ServiceStatusTable';
import { CameraHealthSummary } from '@/components/dashboard/CameraHealthSummary';
import { StatsCard } from '@/components/ui/StatsCard';
import { useSystemHealth } from '@/hooks/useSystemHealth';
import { CardSkeleton } from '@/components/ui/LoadingSkeleton';

export default function SystemHealthPage() {
  const { health, isLoading, refetch } = useSystemHealth();

  return (
    <div className="space-y-6">
      <PageHeader
        title="System Infrastructure Health"
        subtitle="Live telemetry for microservices, hardware clusters, AI inference latency, and blockchain consensus."
        actions={
          <button
            onClick={refetch}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-none bg-muted hover:bg-muted border border-border text-xs font-semibold text-foreground transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-accent ${isLoading ? 'animate-spin' : ''}`} />
            Run Diagnostics
          </button>
        }
      />

      {/* Hardware Utilization Cluster (Section 38) */}
      {health ? (
        <SystemStatusCard metrics={health.hardware} />
      ) : (
        <CardSkeleton count={4} />
      )}

      {/* AI & Infrastructure Metrics (Section 38) */}
      {health && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            title="Inference Throughput"
            value={`${health.aiMetrics.inferenceFps} FPS`}
            icon="Zap"
            trend={{ value: "Target: 25.0 FPS", isPositive: true }}
            indicatorColor="#39D98A"
          />
          <StatsCard
            title="Inference Latency"
            value={`${health.aiMetrics.inferenceLatency} ms`}
            icon="Activity"
            trend={{ value: "< 50ms requirement", isPositive: true }}
            indicatorColor="#37B9FF"
          />
          <StatsCard
            title="Event Ingestion Rate"
            value={`${health.infrastructure.eventProcessingRate}/sec`}
            icon="Server"
            trend={{ value: "Kafka broker active", isPositive: true }}
            indicatorColor="#63A8FF"
          />
          <StatsCard
            title="API Response Time"
            value={`${health.infrastructure.apiResponseTime} ms`}
            icon="ShieldCheck"
            trend={{ value: "FastAPI Gateway", isPositive: true }}
            indicatorColor="#39D98A"
          />
        </div>
      )}

      {/* Services Table and Camera Breakdown (Section 38) */}
      {health && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8">
            <ServiceStatusTable services={health.services} />
          </div>
          <div className="lg:col-span-4">
            <CameraHealthSummary
              total={health.cameraSummary.total}
              online={health.cameraSummary.online}
              offline={health.cameraSummary.offline}
              degraded={health.cameraSummary.warning}
              className="h-full"
            />
          </div>
        </div>
      )}
    </div>
  );
}
