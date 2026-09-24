"use client";

import React, { useState } from 'react';
import {
  MonitorPlay,
  Search,
  Filter,
  Maximize2,
  RefreshCw,
  Volume2,
  VolumeX,
  Radio,
  SlidersHorizontal,
  Camera as CameraIcon,
  Smartphone,
  Laptop,
  Activity,
  Layers,
  Sparkles
} from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { VideoPlayer } from '@/components/cameras/VideoPlayer';
import { LiveWebcamCCTV } from '@/components/cameras/LiveWebcamCCTV';
import { TelemetrySidecar } from '@/components/surveillance/TelemetrySidecar';
import { useCameras } from '@/hooks/useCameras';
import { useAlerts } from '@/hooks/useAlerts';
import { useToast } from '@/components/ui/Toast';

export default function LiveSurveillancePage() {
  const { cameras, isLoading, refetch } = useCameras();
  const { alerts } = useAlerts();
  const { showToast } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [bopFilter, setBopFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [gridDensity, setGridDensity] = useState<'2x2' | '3x3' | '4x4'>('2x2');
  const [isAlertsMuted, setIsAlertsMuted] = useState(false);
  
  // Real-time mobile/laptop webcam CCTV toggle
  const [isWebcamCCTVActive, setIsWebcamCCTVActive] = useState(true);
  const [showSidecar, setShowSidecar] = useState(true);
  const [activeCameraId, setActiveCameraId] = useState('CAM_04');
  const [activeCameraName, setActiveCameraName] = useState('Mobile/Webcam Field Unit');
  const [trackedTargets, setTrackedTargets] = useState<any[]>([]);

  const filteredCameras = cameras.filter((cam) => {
    const matchesSearch =
      cam.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cam.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cam.location.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesBop = !bopFilter || cam.bopId === bopFilter;
    const matchesStatus = !statusFilter || cam.status === statusFilter;
    return matchesSearch && matchesBop && matchesStatus;
  });

  const densityCount = {
    '2x2': 4,
    '3x3': 9,
    '4x4': 16,
  }[gridDensity];

  const gridColsClass = {
    '2x2': 'grid-cols-1 md:grid-cols-2',
    '3x3': 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    '4x4': 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4',
  }[gridDensity];

  // If webcam CCTV is active, reserve Slot 4 (or last slot) for the live camera
  const camerasToDisplay = isWebcamCCTVActive
    ? filteredCameras.slice(0, Math.max(1, densityCount - 1))
    : filteredCameras.slice(0, densityCount);

  return (
    <div className="space-y-3 flex flex-col min-h-full">
      {/* Surveillance Control Room Toolbar */}
      <div className="bg-card border border-border rounded-none p-3.5 flex flex-wrap items-center justify-between gap-3">
        {/* Left filters */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search camera..."
              className="bg-[#0F151C] border border-border rounded-none pl-8 pr-3 h-8 text-xs text-foreground placeholder:text-[#677480] focus:border-[#37B9FF] focus:outline-none"
            />
          </div>

          <select
            value={bopFilter}
            onChange={(e) => setBopFilter(e.target.value)}
            className="bg-[#0F151C] border border-border rounded-none px-2.5 h-8 text-xs text-foreground focus:border-[#37B9FF] focus:outline-none cursor-pointer"
          >
            <option value="">All Sector BOPs</option>
            <option value="BOP-12">BOP-12</option>
            <option value="BOP-18">BOP-18</option>
            <option value="BOP-21">BOP-21</option>
            <option value="BOP-07">BOP-07</option>
            <option value="BOP-33">BOP-33</option>
          </select>

          {/* Connect Mobile / Laptop Webcam CCTV Toggle Button */}
          <button
            onClick={() => {
              const nextState = !isWebcamCCTVActive;
              setIsWebcamCCTVActive(nextState);
              showToast({
                title: nextState ? 'Webcam/Mobile CCTV Engaged' : 'Webcam CCTV Disengaged',
                message: nextState
                  ? 'Hardware camera streaming live as CCTV unit CAM_04.'
                  : 'Returned to standard stream matrix.',
                type: nextState ? 'success' : 'info',
              });
            }}
            className={`px-3 py-1.5 h-8 text-xs font-mono font-bold border transition-all flex items-center gap-2 ${
              isWebcamCCTVActive
                ? 'bg-accent/20 border-accent text-accent shadow-sm shadow-accent/20'
                : 'bg-muted border-border text-muted-foreground hover:text-foreground'
            }`}
          >
            <CameraIcon className={`w-3.5 h-3.5 ${isWebcamCCTVActive ? 'animate-pulse text-accent' : ''}`} />
            <span>{isWebcamCCTVActive ? '● WEBCAM / MOBILE CCTV ACTIVE' : 'CONNECT WEBCAM / MOBILE AS CCTV'}</span>
          </button>
        </div>

        {/* Right Density & Actions */}
        <div className="flex items-center gap-2">
          {/* Telemetry Side-Car Toggle */}
          <button
            onClick={() => setShowSidecar(!showSidecar)}
            className={`px-2.5 h-8 text-xs font-mono font-bold border transition-colors flex items-center gap-1.5 ${
              showSidecar
                ? 'bg-[#37B9FF]/15 border-[#37B9FF]/50 text-[#37B9FF]'
                : 'bg-muted border-border text-muted-foreground hover:text-white'
            }`}
            title="Toggle Telemetry Side-Car"
          >
            <Activity className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">TELEMETRY</span>
          </button>

          {/* Grid Density Switcher */}
          <div className="flex items-center bg-[#0F151C] border border-border rounded-none p-0.5">
            {(['2x2', '3x3', '4x4'] as const).map((density) => (
              <button
                key={density}
                onClick={() => setGridDensity(density)}
                className={`px-2.5 py-1 text-xs font-mono font-bold rounded-none transition-colors ${
                  gridDensity === density
                    ? 'bg-accent text-[#071018]'
                    : 'text-[#8D99A5] hover:text-foreground'
                }`}
              >
                {density}
              </button>
            ))}
          </div>

          <button
            onClick={() => {
              setIsAlertsMuted(!isAlertsMuted);
              showToast({
                title: isAlertsMuted ? 'Alarms Unmuted' : 'Alarms Muted',
                message: isAlertsMuted ? 'Audio alarms enabled for intrusions.' : 'Silent watch mode active.',
                type: 'info',
              });
            }}
            className={`p-2 rounded-none border transition-colors ${
              isAlertsMuted
                ? 'bg-red-500/15 border-[#FF5C67]/30 text-red-500'
                : 'bg-muted border-border text-muted-foreground hover:text-foreground'
            }`}
            title={isAlertsMuted ? 'Unmute Alarms' : 'Mute Alarms'}
          >
            {isAlertsMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          <button
            onClick={refetch}
            className="p-2 rounded-none bg-muted hover:bg-muted border border-border text-muted-foreground hover:text-foreground transition-colors"
            title="Refresh Camera Streams"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Workspace: CCTV Grid + Telemetry Side-Car */}
      <div className="flex flex-col lg:flex-row gap-3 flex-1 items-stretch">
        {/* Main CCTV Feed Grid */}
        <div className={`grid ${gridColsClass} gap-3 flex-1`}>
          {/* Static / RTSP cameras */}
          {camerasToDisplay.map((cam, idx) => {
            const camAlert = alerts.find(
              (a) => a.cameraId === cam.id && a.severity === 'CRITICAL' && a.status !== 'RESOLVED'
            );
            const hasIntrusion = !!camAlert;

            return (
              <div
                key={cam.id}
                onClick={() => {
                  setActiveCameraId(`CAM_0${idx + 1}`);
                  setActiveCameraName(cam.name);
                }}
                className={`relative group cursor-pointer transition-all ${
                  activeCameraId === `CAM_0${idx + 1}` ? 'ring-1 ring-accent' : ''
                }`}
              >
                <VideoPlayer
                  camera={cam}
                  isLive={cam.status === 'ONLINE'}
                  hasIntrusion={hasIntrusion}
                  className="w-full shadow-lg"
                />
              </div>
            );
          })}

          {/* DEDICATED LIVE WEBCAM / MOBILE CCTV TILE (CAM_04) */}
          {isWebcamCCTVActive && (
            <div
              onClick={() => {
                setActiveCameraId('CAM_04');
                setActiveCameraName('Mobile / Laptop Field Webcam');
              }}
              className={`relative group cursor-pointer transition-all ${
                activeCameraId === 'CAM_04' ? 'ring-1 ring-accent' : ''
              }`}
            >
              <LiveWebcamCCTV
                cameraCode="CAM_04"
                cameraName="Mobile Field / Laptop Webcam"
                location="Tactical Unit 01 • Sector West"
                onTargetDetected={(targets) => setTrackedTargets(targets)}
                className="w-full shadow-lg"
              />
            </div>
          )}

          {/* Empty placeholder slots for remaining tiles */}
          {Array.from({
            length: Math.max(
              0,
              densityCount - (camerasToDisplay.length + (isWebcamCCTVActive ? 1 : 0))
            ),
          }).map((_, i) => (
            <div
              key={`placeholder-${i}`}
              className="bg-[#05080B] border border-border border-dashed rounded-none flex flex-col items-center justify-center text-[#4E5A64]"
              style={{ aspectRatio: '16/9' }}
            >
              <MonitorPlay className="w-8 h-8 mb-2 opacity-40" />
              <span className="text-xs font-mono">
                CHANNEL {camerasToDisplay.length + (isWebcamCCTVActive ? 2 : 1) + i} — NO SIGNAL
              </span>
            </div>
          ))}
        </div>

        {/* Telemetry Side-Car (Matching Video Screenshot) */}
        {showSidecar && (
          <TelemetrySidecar
            activeCameraCode={activeCameraId}
            activeCameraName={activeCameraName}
            targets={trackedTargets}
            isOpen={showSidecar}
            onClose={() => setShowSidecar(false)}
          />
        )}
      </div>

      {/* Bottom C2 Tactical Status Bar */}
      <div className="bg-[#070D14] border border-border p-2.5 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-green-400 font-bold">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-ping" />
            CONNECTED | NODE-01
          </span>
          <span className="text-muted-foreground hidden sm:inline">•</span>
          <span className="text-gray-300">
            Operator: <span className="text-white font-bold">Saikat Bera (Authority)</span>
          </span>
          <span className="text-muted-foreground hidden md:inline">•</span>
          <span className="text-accent text-[11px] hidden md:inline">
            ROLE: SUPER_ADMIN
          </span>
        </div>

        <div className="flex items-center gap-3 text-muted-foreground text-[11px]">
          <span className="text-[#39D98A]">AI OVERLAYS: YOLOv11 + BYTETRACK ACTIVE</span>
          <span>SYNC MASTER 4/4</span>
        </div>
      </div>
    </div>
  );
}
