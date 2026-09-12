"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Radio, Camera, AlertTriangle, ShieldAlert, Activity, CheckCircle2, MapPin } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatsCard } from '@/components/ui/StatsCard';
import { ThreatOverviewChart } from '@/components/dashboard/ThreatOverviewChart';
import { CriticalAlertsList } from '@/components/dashboard/CriticalAlertsList';
import { RecentEventsTable } from '@/components/dashboard/RecentEventsTable';
import { CameraHealthSummary } from '@/components/dashboard/CameraHealthSummary';
import { SystemHealthMini } from '@/components/dashboard/SystemHealthMini';
import { DynamicBorderMap } from '@/components/map/DynamicBorderMap';
import { CardSkeleton } from '@/components/ui/LoadingSkeleton';
import { useToast } from '@/components/ui/Toast';
import {
  getDashboardStats,
  getAlerts,
  getEvents,
  getCameras,
  getBOPs,
  getAnalytics,
  getSystemHealth,
  updateAlertStatus,
} from '@/lib/api';
import type { Alert } from '@/types/alert';
import type { IBVAPEvent } from '@/types/event';
import type { Camera as CameraType, BOP } from '@/types/camera';
import type { SystemHealth } from '@/types/system';
import { useWebSocket } from '@/hooks/useWebSocket';

export default function DashboardPage() {
  const { showToast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [events, setEvents] = useState<IBVAPEvent[]>([]);
  const [cameras, setCameras] = useState<CameraType[]>([]);
  const [bops, setBops] = useState<BOP[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [currentTime, setCurrentTime] = useState('');

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [statsRes, alertsRes, eventsRes, camsRes, bopsRes, analyticsRes, healthRes] =
        await Promise.all([
          getDashboardStats(),
          getAlerts(),
          getEvents(),
          getCameras(),
          getBOPs(),
          getAnalytics(),
          getSystemHealth(),
        ]);
      setStats(statsRes);
      setAlerts(alertsRes);
      setEvents(eventsRes);
      setCameras(camsRes);
      setBops(bopsRes);
      setAnalytics(analyticsRes);
      setSystemHealth(healthRes);
    } catch (err) {
      showToast({
        title: 'Data Sync Interrupted',
        message: 'Could not fetch edge telemetry updates.',
        type: 'error',
      });
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadData();
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleDateString('en-IN', {
          weekday: 'short',
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        }) +
          ' • ' +
          now.toLocaleTimeString('en-IN', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false,
          }) +
          ' IST'
      );
    }, 1000);
    return () => clearInterval(timer);
  }, [loadData]);

  useWebSocket('new_alert', () => {
    loadData();
  });

  useWebSocket('new_event', () => {
    loadData();
  });

  const handleAcknowledgeAlert = async (alertId: string) => {
    await updateAlertStatus(alertId, 'ACKNOWLEDGED');
    setAlerts((prev) =>
      prev.map((a) => (a.alertId === alertId ? { ...a, status: 'ACKNOWLEDGED' } : a))
    );
    showToast({
      title: 'Alert Acknowledged',
      message: `Alert ${alertId} assigned to watch officer.`,
      type: 'info',
    });
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Command Center"
        subtitle="Real-time border surveillance overview and threat intelligence dashboard"
        actions={
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-none bg-card border border-border text-xs font-mono text-muted-foreground">
              <Radio className="w-3.5 h-3.5 text-green-500 animate-pulse" />
              <span>{currentTime}</span>
            </div>
            <button
              onClick={loadData}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-none bg-muted hover:bg-muted border border-border text-xs font-semibold text-foreground transition-colors"
              title="Refresh telemetry"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-accent ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        }
      />

      {/* ─── SECTION 1: 6 KPI CARDS IN DESKTOP GRID (Section 21) ─── */}
      {isLoading && !stats ? (
        <CardSkeleton count={6} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <StatsCard
            title="Total Cameras"
            value={stats?.totalCameras || 30}
            icon="Camera"
            trend={{ value: "+4 this week", isPositive: true }}
            indicatorColor="#37B9FF"
          />
          <StatsCard
            title="Online Cameras"
            value={stats?.onlineCameras || 26}
            icon="CheckCircle2"
            subtitle="Operational"
            indicatorColor="#39D98A"
          />
          <StatsCard
            title="Offline Cameras"
            value={stats?.offlineCameras || 3}
            icon="AlertTriangle"
            subtitle="Requires inspection"
            indicatorColor="#FF5C67"
          />
          <StatsCard
            title="Active Alerts"
            value={stats?.activeAlerts || 11}
            icon="ShieldAlert"
            trend={{ value: "4 in review", isPositive: false }}
            indicatorColor="#FF8A4C"
          />
          <StatsCard
            title="Critical Alerts"
            value={stats?.criticalAlerts || 6}
            icon="ShieldAlert"
            isCritical={stats?.criticalAlerts > 0}
            subtitle="2 unresolved"
            indicatorColor="#FF5C67"
          />
          <StatsCard
            title="Events Today"
            value={stats?.eventsToday || 20}
            icon="Activity"
            trend={{ value: "+12% vs yesterday", isPositive: true }}
            indicatorColor="#63A8FF"
          />
        </div>
      )}

      {/* ─── SECTION 2 & 3: THREAT OVERVIEW & RECENT ALERTS ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8">
          <ThreatOverviewChart
            data={analytics?.alertsByHour || []}
            className="h-full"
          />
        </div>
        <div className="lg:col-span-4">
          <CriticalAlertsList
            alerts={alerts}
            onAcknowledge={handleAcknowledgeAlert}
            className="h-full"
          />
        </div>
      </div>

      {/* ─── SECTION 4 & 5: RECENT EVENTS & CAMERA HEALTH ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8">
          <RecentEventsTable events={events} />
        </div>
        <div className="lg:col-span-4 space-y-6">
          <CameraHealthSummary
            total={stats?.totalCameras || 30}
            online={stats?.onlineCameras || 26}
            offline={stats?.offlineCameras || 3}
            degraded={1}
          />
          {systemHealth && <SystemHealthMini health={systemHealth} />}
        </div>
      </div>

      {/* ─── SECTION 6: BORDER MAP OVERVIEW ─── */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <MapPin className="w-4 h-4 text-accent" />
            Border Outpost Tactical Map & Active Incidents
          </h3>
        </div>
        <div className="h-[400px]">
          <DynamicBorderMap cameras={cameras} bops={bops} alerts={alerts} />
        </div>
      </div>
    </div>
  );
}
