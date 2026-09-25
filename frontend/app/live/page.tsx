"use client";

import React, { useState, useCallback } from 'react';
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
  Sparkles,
  Plus,
  X,
  Wifi,
  Globe,
  MonitorSmartphone,
  User,
  Car,
  Signal,
} from 'lucide-react';
import Link from 'next/link';
import { PageHeader } from '@/components/layout/PageHeader';
import { VideoPlayer } from '@/components/cameras/VideoPlayer';
import { LiveWebcamCCTV } from '@/components/cameras/LiveWebcamCCTV';
import { TelemetrySidecar } from '@/components/surveillance/TelemetrySidecar';
import { useCameras } from '@/hooks/useCameras';
import { useAlerts } from '@/hooks/useAlerts';
import { useToast } from '@/components/ui/Toast';

// Additional camera slot types
interface ExtraCameraSlot {
  id: string;
  name: string;
  type: 'mobile' | 'webcam' | 'rtsp';
  cameraCode: string;
  location: string;
  facingMode?: 'user' | 'environment';
  active: boolean;
}

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

  // ──── Multi-Camera Connection State ────
  const [showAddCameraPanel, setShowAddCameraPanel] = useState(false);
  const [extraCameraSlots, setExtraCameraSlots] = useState<ExtraCameraSlot[]>([]);
  const [showMultiCamManager, setShowMultiCamManager] = useState(false);

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

  // Total active live cam slots: webcam + extra cameras
  const liveCamCount = (isWebcamCCTVActive ? 1 : 0) + extraCameraSlots.filter(s => s.active).length;

  // If webcam CCTV is active, reserve slots for live cameras
  const camerasToDisplay = filteredCameras.slice(0, Math.max(1, densityCount - liveCamCount));

  // ──── Add new camera slot ────
  const addCameraSlot = useCallback((type: 'mobile' | 'webcam') => {
    const slotNum = extraCameraSlots.length + 5; // Start from CAM_05
    const newSlot: ExtraCameraSlot = {
      id: `extra-${Date.now()}`,
      name: type === 'mobile'
        ? `iPhone Camera ${extraCameraSlots.filter(s => s.type === 'mobile').length + 1}`
        : `Webcam ${extraCameraSlots.filter(s => s.type === 'webcam').length + 2}`,
      type,
      cameraCode: `CAM_${String(slotNum).padStart(2, '0')}`,
      location: type === 'mobile'
        ? `Mobile Patrol Unit ${extraCameraSlots.filter(s => s.type === 'mobile').length + 1}`
        : `Stationary Post ${extraCameraSlots.filter(s => s.type === 'webcam').length + 2}`,
      facingMode: type === 'mobile' ? 'environment' : 'user',
      active: true,
    };

    setExtraCameraSlots((prev) => [...prev, newSlot]);
    setShowAddCameraPanel(false);

    showToast({
      title: `${type === 'mobile' ? 'Mobile' : 'Webcam'} Camera Added`,
      message: `${newSlot.name} (${newSlot.cameraCode}) added to surveillance grid.`,
      type: 'success',
    });
  }, [extraCameraSlots, showToast]);

  const removeCameraSlot = useCallback((id: string) => {
    setExtraCameraSlots((prev) => prev.filter((s) => s.id !== id));
    showToast({
      title: 'Camera Removed',
      message: 'Camera slot removed from surveillance grid.',
      type: 'info',
    });
  }, [showToast]);

  const toggleCameraSlot = useCallback((id: string) => {
    setExtraCameraSlots((prev) =>
      prev.map((s) => (s.id === id ? { ...s, active: !s.active } : s))
    );
  }, []);

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

          {/* ──── ADD CAMERA BUTTON ──── */}
          <button
            onClick={() => setShowAddCameraPanel(!showAddCameraPanel)}
            className={`px-3 py-1.5 h-8 text-xs font-mono font-bold border transition-all flex items-center gap-2 ${
              showAddCameraPanel
                ? 'bg-[#39D98A]/20 border-[#39D98A]/50 text-[#39D98A]'
                : 'bg-muted border-border text-muted-foreground hover:text-foreground hover:border-[#39D98A]/50'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>ADD CAMERA</span>
          </button>

          {/* Multi-Camera Manager Toggle */}
          {extraCameraSlots.length > 0 && (
            <button
              onClick={() => setShowMultiCamManager(!showMultiCamManager)}
              className={`px-2.5 h-8 text-xs font-mono font-bold border transition-colors flex items-center gap-1.5 ${
                showMultiCamManager
                  ? 'bg-[#A78BFA]/15 border-[#A78BFA]/50 text-[#A78BFA]'
                  : 'bg-muted border-border text-muted-foreground hover:text-white'
              }`}
            >
              <MonitorSmartphone className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{extraCameraSlots.length} EXTRA</span>
            </button>
          )}
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

      {/* ──── ADD CAMERA PANEL (Dropdown) ──── */}
      {showAddCameraPanel && (
        <div className="bg-card border border-[#39D98A]/30 rounded-none p-4 animate-fade-in">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold font-mono text-white uppercase tracking-wider flex items-center gap-2">
              <Plus className="w-3.5 h-3.5 text-[#39D98A]" />
              Connect New Camera to Surveillance Grid
            </h3>
            <button
              onClick={() => setShowAddCameraPanel(false)}
              className="p-1 text-muted-foreground hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* iPhone Camera */}
            <button
              onClick={() => addCameraSlot('mobile')}
              className="p-4 bg-[#0C141D] border border-border hover:border-accent text-left transition-all group"
            >
              <Smartphone className="w-8 h-8 text-accent mb-2 group-hover:scale-110 transition-transform" />
              <div className="text-xs font-bold text-white font-mono">iPhone Camera</div>
              <p className="text-[10px] text-muted-foreground mt-1">
                Connect your iPhone rear camera over WiFi as a live CCTV node with AI detection.
              </p>
              <div className="mt-2 flex items-center gap-1.5">
                <Wifi className="w-3 h-3 text-green-400" />
                <span className="text-[9px] text-green-400 font-mono">Same WiFi Network</span>
              </div>
            </button>

            {/* Laptop Webcam */}
            <button
              onClick={() => addCameraSlot('webcam')}
              className="p-4 bg-[#0C141D] border border-border hover:border-[#37B9FF] text-left transition-all group"
            >
              <Laptop className="w-8 h-8 text-[#37B9FF] mb-2 group-hover:scale-110 transition-transform" />
              <div className="text-xs font-bold text-white font-mono">Laptop / USB Webcam</div>
              <p className="text-[10px] text-muted-foreground mt-1">
                Use your built-in laptop webcam or external USB camera as an additional CCTV feed.
              </p>
              <div className="mt-2 flex items-center gap-1.5">
                <Signal className="w-3 h-3 text-[#37B9FF]" />
                <span className="text-[9px] text-[#37B9FF] font-mono">Direct Hardware Access</span>
              </div>
            </button>

            {/* Mobile Camera Page */}
            <Link
              href="/cameras/mobile"
              className="p-4 bg-[#0C141D] border border-border hover:border-[#F4C95D] text-left transition-all group block"
            >
              <MonitorSmartphone className="w-8 h-8 text-[#F4C95D] mb-2 group-hover:scale-110 transition-transform" />
              <div className="text-xs font-bold text-white font-mono">Full Mobile Setup</div>
              <p className="text-[10px] text-muted-foreground mt-1">
                Open dedicated mobile camera setup page with QR code pairing and detailed controls.
              </p>
              <div className="mt-2 flex items-center gap-1.5">
                <Globe className="w-3 h-3 text-[#F4C95D]" />
                <span className="text-[9px] text-[#F4C95D] font-mono">QR Code + URL Pairing</span>
              </div>
            </Link>

            {/* Add RTSP Camera */}
            <Link
              href="/cameras"
              className="p-4 bg-[#0C141D] border border-border hover:border-[#A78BFA] text-left transition-all group block"
            >
              <CameraIcon className="w-8 h-8 text-[#A78BFA] mb-2 group-hover:scale-110 transition-transform" />
              <div className="text-xs font-bold text-white font-mono">RTSP / IP Camera</div>
              <p className="text-[10px] text-muted-foreground mt-1">
                Register a standard RTSP/IP surveillance camera from the camera management page.
              </p>
              <div className="mt-2 flex items-center gap-1.5">
                <Radio className="w-3 h-3 text-[#A78BFA]" />
                <span className="text-[9px] text-[#A78BFA] font-mono">RTSP Stream</span>
              </div>
            </Link>
          </div>
        </div>
      )}

      {/* ──── Multi-Camera Manager Panel ──── */}
      {showMultiCamManager && extraCameraSlots.length > 0 && (
        <div className="bg-card border border-[#A78BFA]/30 rounded-none p-3 animate-fade-in">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-bold font-mono text-white uppercase tracking-wider flex items-center gap-2">
              <MonitorSmartphone className="w-3.5 h-3.5 text-[#A78BFA]" />
              Connected Extra Cameras ({extraCameraSlots.length})
            </h4>
            <button
              onClick={() => setShowMultiCamManager(false)}
              className="p-1 text-muted-foreground hover:text-white transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {extraCameraSlots.map((slot) => (
              <div
                key={slot.id}
                className={`px-3 py-1.5 border text-[10px] font-mono font-bold flex items-center gap-2 transition-all ${
                  slot.active
                    ? 'bg-accent/10 border-accent/40 text-accent'
                    : 'bg-muted border-border text-muted-foreground'
                }`}
              >
                {slot.type === 'mobile' ? (
                  <Smartphone className="w-3 h-3" />
                ) : (
                  <Laptop className="w-3 h-3" />
                )}
                <span>{slot.cameraCode} - {slot.name}</span>
                <button
                  onClick={() => toggleCameraSlot(slot.id)}
                  className={`px-1.5 py-0.5 text-[8px] border ${
                    slot.active
                      ? 'bg-green-500/20 border-green-500/30 text-green-400'
                      : 'bg-red-500/20 border-red-500/30 text-red-400'
                  }`}
                >
                  {slot.active ? 'ON' : 'OFF'}
                </button>
                <button
                  onClick={() => removeCameraSlot(slot.id)}
                  className="text-muted-foreground hover:text-red-400 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

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

          {/* ──── EXTRA CONNECTED CAMERA SLOTS ──── */}
          {extraCameraSlots
            .filter((slot) => slot.active)
            .map((slot) => (
              <div
                key={slot.id}
                onClick={() => {
                  setActiveCameraId(slot.cameraCode);
                  setActiveCameraName(slot.name);
                }}
                className={`relative group cursor-pointer transition-all ${
                  activeCameraId === slot.cameraCode ? 'ring-1 ring-accent' : ''
                }`}
              >
                <LiveWebcamCCTV
                  cameraCode={slot.cameraCode}
                  cameraName={slot.name}
                  location={slot.location}
                  defaultFacingMode={slot.facingMode || 'environment'}
                  onTargetDetected={(targets) => {
                    if (activeCameraId === slot.cameraCode) {
                      setTrackedTargets(targets);
                    }
                  }}
                  className="w-full shadow-lg"
                />
                {/* Remove button overlay */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeCameraSlot(slot.id);
                  }}
                  className="absolute top-2 right-2 z-40 p-1 bg-black/70 border border-white/20 text-white/70 hover:text-red-400 hover:border-red-400/50 transition-colors opacity-0 group-hover:opacity-100"
                  title="Remove camera"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}

          {/* Empty placeholder slots for remaining tiles */}
          {Array.from({
            length: Math.max(
              0,
              densityCount - (camerasToDisplay.length + liveCamCount)
            ),
          }).map((_, i) => (
            <div
              key={`placeholder-${i}`}
              className="bg-[#05080B] border border-border border-dashed rounded-none flex flex-col items-center justify-center text-[#4E5A64] group cursor-pointer hover:border-accent/30 transition-all"
              style={{ aspectRatio: '16/9' }}
              onClick={() => setShowAddCameraPanel(true)}
            >
              <MonitorPlay className="w-8 h-8 mb-2 opacity-40 group-hover:opacity-60 transition-opacity" />
              <span className="text-xs font-mono">
                CHANNEL {camerasToDisplay.length + liveCamCount + i + 1} — NO SIGNAL
              </span>
              <span className="text-[9px] font-mono text-accent/50 mt-1 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                <Plus className="w-3 h-3" /> Click to connect camera
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
          <span className="text-[#39D98A] flex items-center gap-1.5">
            <User className="w-3 h-3" />
            PERSON DETECT: COCO-SSD
          </span>
          <span className="text-[#37B9FF] flex items-center gap-1.5">
            <Car className="w-3 h-3" />
            VEHICLE DETECT: ACTIVE
          </span>
          <span>SYNC MASTER {camerasToDisplay.length + liveCamCount}/{densityCount}</span>
        </div>
      </div>
    </div>
  );
}
