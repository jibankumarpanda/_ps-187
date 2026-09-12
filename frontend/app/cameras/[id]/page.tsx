"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, Video, Cpu, Activity, ShieldAlert, Settings, User, Car, ScanFace, CheckCircle2 } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { VideoPlayer } from '@/components/cameras/VideoPlayer';
import { VirtualFenceEditor } from '@/components/cameras/VirtualFenceEditor';
import { VideoAnalysis } from '@/components/cameras/VideoAnalysis';
import { getCamera, replaceCameraZones } from '@/lib/api';
import { formatTimestamp } from '@/lib/utils';
import type { Camera } from '@/types/camera';

export default function CameraDetailPage({ params }: { params: { id: string } }) {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') === 'VIDEO' ? 'VIDEO' : 'LIVE';
  const [camera, setCamera] = useState<Camera | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'LIVE' | 'VIDEO'>(initialTab);

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'VIDEO') {
      setActiveTab('VIDEO');
    }
  }, [searchParams]);

  useEffect(() => {
    getCamera(params.id).then((data) => {
      if (data) setCamera(data);
      setIsLoading(false);
    });
  }, [params.id]);


  if (isLoading) {
    return (
      <div className="p-8 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
        <span className="w-4 h-4 border-2 border-[#37B9FF] border-t-transparent rounded-full animate-spin" />
        Connecting to camera feed telemetry...
      </div>
    );
  }

  if (!camera) {
    return (
      <div className="p-8 text-center space-y-3">
        <h2 className="text-base font-bold text-red-500">Camera Feed Not Found</h2>
        <p className="text-xs text-muted-foreground">No registered hardware node found for ID {params.id}.</p>
        <Link
          href="/cameras"
          className="inline-block px-4 py-2 bg-muted text-xs font-semibold rounded-none text-foreground"
        >
          Return to Cameras
        </Link>
      </div>
    );
  }

  const initialFence = camera.zones?.[0]?.coordinates.map(([x, y]) => ({ x, y }));

  const saveFence = async (points: Array<{ x: number; y: number }>) => {
    const result = await replaceCameraZones(camera.id, [{
      name: `${camera.location} Restricted Zone`,
      zoneType: 'RESTRICTED',
      coordinates: points.map((point): [number, number] => [point.x, point.y]),
    }]);
    setCamera((current) => current ? { ...current, zones: result.zones } : current);
  };

  return (
    <div className="space-y-6">
      {/* Header with Breadcrumb */}
      <PageHeader
        title={camera.name}
        subtitle={`${camera.id} • ${camera.bopId} • ${camera.location}`}
        breadcrumbs={[
          { label: 'Cameras', href: '/cameras' },
          { label: camera.id },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <StatusBadge status={camera.status} />
            <Link
              href="/live"
              className="px-3 py-1.5 rounded-none bg-muted border border-border text-xs font-semibold text-foreground hover:bg-muted transition-colors"
            >
              Control Room Feed
            </Link>
          </div>
        }
      />

      {/* Tabs */}
      <div className="flex space-x-2 bg-card p-1 rounded-none w-fit">
        <button
          onClick={() => setActiveTab('LIVE')}
          className={`px-4 py-2 text-xs font-bold rounded-none transition-colors ${
            activeTab === 'LIVE' ? 'bg-accent text-[#0A0F14]' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          LIVE
        </button>
        <button
          onClick={() => setActiveTab('VIDEO')}
          className={`px-4 py-2 text-xs font-bold rounded-none transition-colors ${
            activeTab === 'VIDEO' ? 'bg-accent text-[#0A0F14]' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          VIDEO ANALYSIS
        </button>
      </div>

      {/* ─── SECTION: VIDEO PLAYER (LEFT) & INFO PANEL (RIGHT) (Section 26) ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Large Video Player */}
        <div className="lg:col-span-8 space-y-4">
          {activeTab === 'LIVE' ? (
            <>
              <VideoPlayer
                camera={camera}
                isLive={camera.status === 'ONLINE'}
                className="w-full shadow-2xl"
              />

              {/* Current Detections Pill List (Section 26) */}
              <div className="bg-card border border-border rounded-none p-4 space-y-3">
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Active Edge AI Sensor Detections
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 bg-[#0F151C] border border-border rounded-none flex items-center gap-2.5">
                    <div className="p-2 rounded bg-accent/15 text-accent">
                      <User className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-[10px] uppercase font-bold text-muted-foreground">Person Model</div>
                      <div className="text-xs font-bold text-foreground">1 Detected</div>
                    </div>
                  </div>

                  <div className="p-3 bg-[#0F151C] border border-border rounded-none flex items-center gap-2.5">
                    <div className="p-2 rounded bg-[#F4C95D]/15 text-[#F4C95D]">
                      <Car className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-[10px] uppercase font-bold text-muted-foreground">Vehicle Model</div>
                      <div className="text-xs font-bold text-foreground">0 In View</div>
                    </div>
                  </div>

                  <div className="p-3 bg-[#0F151C] border border-border rounded-none flex items-center gap-2.5">
                    <div className="p-2 rounded bg-[#39D98A]/15 text-green-500">
                      <ScanFace className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-[10px] uppercase font-bold text-muted-foreground">Face Recognizer</div>
                      <div className="text-xs font-bold text-green-500">Standby</div>
                    </div>
                  </div>

                  <div className="p-3 bg-[#0F151C] border border-border rounded-none flex items-center gap-2.5">
                    <div className="p-2 rounded bg-[#63A8FF]/15 text-[#63A8FF]">
                      <Activity className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-[10px] uppercase font-bold text-muted-foreground">ANPR OCR</div>
                      <div className="text-xs font-bold text-accent">Active (98%)</div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <VideoAnalysis cameraId={camera.id} />
          )}
        </div>

        {/* Information Panel (Right) */}
        <div className="lg:col-span-4 space-y-5">
          <div className="bg-card border border-border rounded-none p-5 space-y-4">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 border-b border-border pb-3">
              <Cpu className="w-4 h-4 text-accent" />
              Telemetry & Node Specifications
            </h3>

            <div className="space-y-3 text-xs font-mono">
              <div className="flex justify-between py-1 border-b border-border/50">
                <span className="text-muted-foreground">Camera ID:</span>
                <span className="font-bold text-foreground">{camera.id}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/50">
                <span className="text-muted-foreground">Sector BOP:</span>
                <span className="text-accent font-bold">{camera.bopId}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/50">
                <span className="text-muted-foreground">Physical Location:</span>
                <span className="text-foreground">{camera.location}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/50">
                <span className="text-muted-foreground">Sensor Resolution:</span>
                <span className="text-foreground">{camera.resolution}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/50">
                <span className="text-muted-foreground">Stream FPS:</span>
                <span className="text-foreground">{camera.fps} frames/sec</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/50">
                <span className="text-muted-foreground">Network Latency:</span>
                <span className="text-green-500">18 ms</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/50">
                <span className="text-muted-foreground">AI Engine State:</span>
                <span className="text-green-500 font-bold">{camera.aiStatus}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/50">
                <span className="text-muted-foreground">GPS Latitude:</span>
                <span className="text-foreground">{camera.latitude.toFixed(4)}° N</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/50">
                <span className="text-muted-foreground">GPS Longitude:</span>
                <span className="text-foreground">{camera.longitude.toFixed(4)}° E</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-muted-foreground">Last Seen:</span>
                <span className="text-muted-foreground">{formatTimestamp(camera.lastSeen)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── SECTION: VIRTUAL FENCE EDITOR (Section 26) ─── */}
      <VirtualFenceEditor cameraId={camera.id} initialPoints={initialFence} onSave={saveFence} />
    </div>
  );
}
