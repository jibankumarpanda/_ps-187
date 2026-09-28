"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  QrCode,
  Copy,
  Check,
  ExternalLink,
  Shield,
  Zap,
  Battery,
  AlertTriangle,
  PenTool
} from 'lucide-react';
import Link from 'next/link';
import { PageHeader } from '@/components/layout/PageHeader';
import { VideoPlayer } from '@/components/cameras/VideoPlayer';
import {
  LiveWebcamCCTV,
  PolygonPoint,
  DEFAULT_CAMERA_POLYGON,
} from '@/components/cameras/LiveWebcamCCTV';
import { TelemetrySidecar } from '@/components/surveillance/TelemetrySidecar';
import { useCameras } from '@/hooks/useCameras';
import { useAlerts } from '@/hooks/useAlerts';
import { useToast } from '@/components/ui/Toast';

// Connected mobile transmitter node
export interface MobileNode {
  id: string; // e.g. 'CAM_MOB_01'
  name: string; // e.g. 'iPhone 15 Pro • Alpha'
  type: 'iphone' | 'android' | 'mobile';
  battery: number;
  resolution: string;
  facingMode: string;
  connectedAt: string;
  frameUrl: string | null;
  lastFrameTime: number;
  active: boolean;
}

// Additional local hardware webcam (e.g. external USB cameras)
export interface HardwareWebcamSlot {
  id: string;
  cameraCode: string;
  name: string;
  location: string;
  deviceId: string;
  active: boolean;
}

// Polygon presets for security zones
const POLYGON_PRESETS = [
  {
    name: 'Perimeter Corridor',
    points: [
      { x: 15, y: 35 },
      { x: 85, y: 35 },
      { x: 90, y: 88 },
      { x: 10, y: 88 },
    ],
    desc: 'Lower perimeter corridor monitored for suspicious crossings',
  },
  {
    name: 'Central Road Gateway',
    points: [
      { x: 28, y: 25 },
      { x: 72, y: 25 },
      { x: 78, y: 82 },
      { x: 22, y: 82 },
    ],
    desc: 'Center transit avenue monitored for vehicular & human intrusion',
  },
  {
    name: 'Restricted Trench Buffer',
    points: [
      { x: 8, y: 50 },
      { x: 92, y: 50 },
      { x: 96, y: 92 },
      { x: 4, y: 92 },
    ],
    desc: 'Zero-tolerance border fence proximity buffer line',
  },
  {
    name: 'Tactical Flank Flank',
    points: [
      { x: 5, y: 20 },
      { x: 55, y: 20 },
      { x: 60, y: 90 },
      { x: 5, y: 90 },
    ],
    desc: 'Lateral flank sector watching stealth infiltration paths',
  },
];

export default function LiveSurveillancePage() {
  const { cameras, isLoading, refetch } = useCameras();
  const { alerts } = useAlerts();
  const { showToast } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [bopFilter, setBopFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [gridDensity, setGridDensity] = useState<'2x2' | '3x3' | '4x4'>('2x2');
  const [isAlertsMuted, setIsAlertsMuted] = useState(false);

  // ──── Primary Hardware Laptop Webcam CCTV (CAM_04) ────
  const [isWebcamCCTVActive, setIsWebcamCCTVActive] = useState(true);
  const [laptopDeviceId, setLaptopDeviceId] = useState<string>('');
  const [hardwareDevices, setHardwareDevices] = useState<MediaDeviceInfo[]>([]);

  // ──── Mobile Camera Nodes (Over-the-Air streaming) ────
  const [mobileNodes, setMobileNodes] = useState<Record<string, MobileNode>>({});
  const [tunnelUrl, setTunnelUrl] = useState<string>('');
  const [localIP, setLocalIP] = useState<string>('');
  const [copiedLink, setCopiedLink] = useState(false);

  // ──── Additional USB Webcams ────
  const [extraWebcamSlots, setExtraWebcamSlots] = useState<HardwareWebcamSlot[]>([]);

  // ──── Camera Polygon Mappings (Virtual Fences for Suspicious Activity) ────
  const [cameraPolygons, setCameraPolygons] = useState<Record<string, PolygonPoint[]>>({
    CAM_01: [
      { x: 15, y: 75 },
      { x: 85, y: 75 },
      { x: 70, y: 35 },
      { x: 30, y: 35 },
    ],
    CAM_02: [
      { x: 15, y: 75 },
      { x: 85, y: 75 },
      { x: 70, y: 35 },
      { x: 30, y: 35 },
    ],
    CAM_03: [
      { x: 15, y: 75 },
      { x: 85, y: 75 },
      { x: 70, y: 35 },
      { x: 30, y: 35 },
    ],
    CAM_04: [
      { x: 15, y: 35 },
      { x: 85, y: 35 },
      { x: 90, y: 88 },
      { x: 10, y: 88 },
    ],
    CAM_MOB_01: [
      { x: 20, y: 35 },
      { x: 80, y: 35 },
      { x: 85, y: 85 },
      { x: 15, y: 85 },
    ],
    CAM_MOB_02: [
      { x: 25, y: 30 },
      { x: 75, y: 30 },
      { x: 80, y: 80 },
      { x: 20, y: 80 },
    ],
    CAM_MOB_03: [
      { x: 15, y: 40 },
      { x: 85, y: 40 },
      { x: 90, y: 90 },
      { x: 10, y: 90 },
    ],
  });

  // ──── Active Telemetry / Sidecar State ────
  const [showSidecar, setShowSidecar] = useState(true);
  const [activeCameraId, setActiveCameraId] = useState('CAM_04');
  const [activeCameraName, setActiveCameraName] = useState('Laptop Command Center Webcam');
  const [trackedTargets, setTrackedTargets] = useState<any[]>([]);

  // ──── Modal / Control Center ────
  const [showAddCameraModal, setShowAddCameraModal] = useState(false);
  const [modalTab, setModalTab] = useState<'mobile' | 'webcam' | 'rtsp'>('mobile');
  const [selectedMobileUnit, setSelectedMobileUnit] = useState<'CAM_MOB_01' | 'CAM_MOB_02' | 'CAM_MOB_03'>('CAM_MOB_01');

  // Ref tracking previous frame Object URLs for cleanup
  const prevBlobUrlsRef = useRef<Record<string, string>>({});

  // 1. Enumerate available hardware video devices on this computer
  useEffect(() => {
    async function getHardwareCams() {
      if (typeof navigator === 'undefined' || !navigator.mediaDevices?.enumerateDevices) return;
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const vids = devices.filter((d) => d.kind === 'videoinput');
        setHardwareDevices(vids);
        if (vids.length > 0 && !laptopDeviceId) {
          setLaptopDeviceId(vids[0].deviceId);
        }
      } catch (err) {
        console.warn('Hardware device enumeration warning:', err);
      }
    }
    getHardwareCams();
  }, [laptopDeviceId]);

  // 2. Poll Tunnel and Local Network info for mobile QR code and direct URL
  useEffect(() => {
    let isCancelled = false;
    async function fetchNetworkInfo() {
      try {
        const res = await fetch('/api/tunnel-info');
        if (res.ok) {
          const data = await res.json();
          if (!isCancelled) {
            if (data.tunnelUrl) setTunnelUrl(data.tunnelUrl);
            if (data.localIP) setLocalIP(data.localIP);
          }
        }
      } catch {}
    }

    fetchNetworkInfo();
    const interval = setInterval(fetchNetworkInfo, 3500);
    return () => {
      isCancelled = true;
      clearInterval(interval);
    };
  }, []);

  // 3. Real-Time Multi-Camera WebSocket Receiver for Mobile Frames
  useEffect(() => {
    let ws: WebSocket;
    let isCancelled = false;

    function connectWS() {
      if (typeof window === 'undefined') return;
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/api/camera-stream`;

      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        if (isCancelled) return;
        ws.send(JSON.stringify({ type: 'register', role: 'receiver', multiCam: true }));
      };

      ws.onmessage = async (event) => {
        if (isCancelled) return;

        // Binary frame from a mobile camera sender
        if (event.data instanceof Blob) {
          try {
            const headBuf = await event.data.slice(0, 64).arrayBuffer();
            const view = new Uint8Array(headBuf);
            const idLen = view[0];
            let senderId = 'CAM_MOB_01';
            let imageBlob: Blob = event.data;

            // Extract tagged sender ID if present: [1-byte length][length bytes ID][JPEG payload]
            if (idLen > 0 && idLen < 40 && event.data.size > idLen + 1) {
              const decoder = new TextDecoder();
              senderId = decoder.decode(view.subarray(1, 1 + idLen));
              imageBlob = event.data.slice(1 + idLen);
            }

            const newUrl = URL.createObjectURL(imageBlob);
            const oldUrl = prevBlobUrlsRef.current[senderId];
            prevBlobUrlsRef.current[senderId] = newUrl;
            if (oldUrl) {
              setTimeout(() => URL.revokeObjectURL(oldUrl), 800);
            }

            setMobileNodes((prev) => {
              const existing = prev[senderId];
              return {
                ...prev,
                [senderId]: {
                  id: senderId,
                  name: existing?.name || `Mobile Unit (${senderId})`,
                  type: existing?.type || 'iphone',
                  battery: existing?.battery ?? 100,
                  resolution: existing?.resolution || '1280x720',
                  facingMode: existing?.facingMode || 'environment',
                  connectedAt: existing?.connectedAt || new Date().toISOString(),
                  frameUrl: newUrl,
                  lastFrameTime: Date.now(),
                  active: existing ? existing.active : true,
                },
              };
            });
          } catch (err) {
            console.error('Frame decode error:', err);
          }
          return;
        }

        // JSON message (devices, status, telemetry, disconnects)
        try {
          const data = JSON.parse(event.data);

          if (data.type === 'mobile_connected') {
            const dev = data.device;
            const devId = dev.id || data.deviceId || 'CAM_MOB_01';
            setMobileNodes((prev) => ({
              ...prev,
              [devId]: {
                id: devId,
                name: dev.name || 'Mobile Field Unit',
                type: dev.type || 'iphone',
                battery: dev.battery ?? 100,
                resolution: dev.resolution || '1280x720',
                facingMode: dev.facingMode || 'environment',
                connectedAt: dev.connectedAt || new Date().toISOString(),
                frameUrl: prev[devId]?.frameUrl || null,
                lastFrameTime: Date.now(),
                active: true,
              },
            }));

            showToast({
              title: '📱 Mobile Camera Connected',
              message: `${dev.name || devId} has joined the surveillance grid.`,
              type: 'success',
            });
          } else if (data.type === 'status' || data.type === 'device_list_updated') {
            if (Array.isArray(data.devices)) {
              setMobileNodes((prev) => {
                const nextState = { ...prev };
                data.devices.forEach((dev: any) => {
                  const devId = dev.id || 'CAM_MOB_01';
                  nextState[devId] = {
                    id: devId,
                    name: dev.name || 'Mobile Field Unit',
                    type: dev.type || 'iphone',
                    battery: dev.battery ?? 100,
                    resolution: dev.resolution || '1280x720',
                    facingMode: dev.facingMode || 'environment',
                    connectedAt: dev.connectedAt || new Date().toISOString(),
                    frameUrl: prev[devId]?.frameUrl || null,
                    lastFrameTime: prev[devId]?.lastFrameTime || Date.now(),
                    active: prev[devId] ? prev[devId].active : true,
                  };
                });
                return nextState;
              });
            }
          } else if (data.type === 'telemetry') {
            const dev = data.device;
            const devId = data.deviceId || dev?.id;
            if (devId) {
              setMobileNodes((prev) => {
                if (!prev[devId]) return prev;
                return {
                  ...prev,
                  [devId]: {
                    ...prev[devId],
                    ...dev,
                  },
                };
              });
            }
          } else if (data.type === 'mobile_disconnected') {
            const devId = data.deviceId;
            if (devId) {
              setMobileNodes((prev) => {
                const copy = { ...prev };
                delete copy[devId];
                return copy;
              });
              showToast({
                title: 'Mobile Camera Disconnected',
                message: `Node ${devId} disconnected from grid.`,
                type: 'info',
              });
            }
          }
        } catch {}
      };

      ws.onclose = () => {
        if (isCancelled) return;
        setTimeout(connectWS, 2500);
      };
    }

    connectWS();

    return () => {
      isCancelled = true;
      if (ws) ws.close();
      Object.values(prevBlobUrlsRef.current).forEach((url) => URL.revokeObjectURL(url));
    };
  }, [showToast]);

  // Generate mobile stream link for specified unit
  const getMobileStreamUrl = useCallback(
    (unitCode: string) => {
      const base = tunnelUrl
        ? tunnelUrl
        : localIP
        ? `http://${localIP}:3000`
        : typeof window !== 'undefined'
        ? window.location.origin
        : 'http://localhost:3000';

      const unitNameParam =
        unitCode === 'CAM_MOB_01'
          ? 'Mobile Patrol Alpha'
          : unitCode === 'CAM_MOB_02'
          ? 'Mobile Recon Bravo'
          : 'Perimeter Mobile Charlie';

      return `${base}/cameras/mobile/stream?camId=${unitCode}&name=${encodeURIComponent(unitNameParam)}`;
    },
    [tunnelUrl, localIP]
  );

  const activeMobileUrl = getMobileStreamUrl(selectedMobileUnit);

  // Copy mobile link to clipboard
  const handleCopyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(activeMobileUrl);
      setCopiedLink(true);
      showToast({
        title: 'Stream URL Copied',
        message: 'Open this link on your phone to connect camera.',
        type: 'success',
      });
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      showToast({
        title: 'Copy Failed',
        message: 'Please manually copy the URL.',
        type: 'error',
      });
    }
  }, [activeMobileUrl, showToast]);

  // Add extra local USB webcam slot
  const handleAddHardwareWebcam = useCallback(
    (device: MediaDeviceInfo) => {
      const slotNum = extraWebcamSlots.length + 5;
      const slotCode = `CAM_${String(slotNum).padStart(2, '0')}`;
      const newSlot: HardwareWebcamSlot = {
        id: `webcam-${Date.now()}`,
        cameraCode: slotCode,
        name: device.label || `External USB Camera ${extraWebcamSlots.length + 1}`,
        location: `Stationary Outpost 0${extraWebcamSlots.length + 2}`,
        deviceId: device.deviceId,
        active: true,
      };

      setExtraWebcamSlots((prev) => [...prev, newSlot]);
      setShowAddCameraModal(false);

      showToast({
        title: 'Hardware Webcam Connected',
        message: `${newSlot.name} (${newSlot.cameraCode}) added with polygon intrusion monitoring.`,
        type: 'success',
      });
    },
    [extraWebcamSlots, showToast]
  );

  const removeExtraWebcam = useCallback((id: string) => {
    setExtraWebcamSlots((prev) => prev.filter((s) => s.id !== id));
    showToast({
      title: 'Webcam Removed',
      message: 'Hardware camera slot removed from grid.',
      type: 'info',
    });
  }, [showToast]);

  const removeMobileNode = useCallback((id: string) => {
    setMobileNodes((prev) => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });
    showToast({
      title: 'Mobile Node Dismissed',
      message: `Feed ${id} removed from surveillance view.`,
      type: 'info',
    });
  }, [showToast]);

  // Compute active mobile nodes
  const activeMobileList = Object.values(mobileNodes).filter((n) => n.active);

  // Filter RTSP cameras
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

  // Total active custom live streams: Laptop webcam + Mobile phones + Extra webcams
  const totalCustomLiveCount =
    (isWebcamCCTVActive ? 1 : 0) +
    activeMobileList.length +
    extraWebcamSlots.filter((s) => s.active).length;

  // Number of fixed RTSP cameras to show
  const camerasToDisplay = filteredCameras.slice(
    0,
    Math.max(1, densityCount - totalCustomLiveCount)
  );

  return (
    <div className="space-y-3 flex flex-col min-h-full">
      {/* Surveillance Control Room Top Toolbar */}
      <div className="bg-card border border-border p-3 flex flex-wrap items-center justify-between gap-3">
        {/* Left Toolbar Controls */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search cameras..."
              className="bg-[#0F151C] border border-border pl-8 pr-3 h-8 text-xs text-foreground placeholder:text-[#677480] focus:border-accent focus:outline-none"
            />
          </div>

          {/* Sector BOP Selector */}
          <select
            value={bopFilter}
            onChange={(e) => setBopFilter(e.target.value)}
            className="bg-[#0F151C] border border-border px-2.5 h-8 text-xs text-foreground focus:border-accent focus:outline-none cursor-pointer"
          >
            <option value="">All Sector BOPs</option>
            <option value="BOP-12">BOP-12 North</option>
            <option value="BOP-18">BOP-18 West</option>
            <option value="BOP-21">BOP-21 Perimeter</option>
            <option value="BOP-07">BOP-07 Outpost</option>
            <option value="BOP-33">BOP-33 South</option>
          </select>

          {/* 💻 Toggle Laptop Built-In Webcam CCTV */}
          <button
            onClick={() => {
              const nextState = !isWebcamCCTVActive;
              setIsWebcamCCTVActive(nextState);
              showToast({
                title: nextState ? '💻 Laptop Webcam CCTV Engaged' : 'Laptop Webcam Paused',
                message: nextState
                  ? 'Hardware camera streaming live as Command Center tile CAM_04.'
                  : 'Laptop webcam disengaged.',
                type: nextState ? 'success' : 'info',
              });
            }}
            className={`px-3 py-1.5 h-8 text-xs font-mono font-bold border transition-all flex items-center gap-2 ${
              isWebcamCCTVActive
                ? 'bg-accent/20 border-accent text-accent shadow-sm shadow-accent/20'
                : 'bg-muted border-border text-muted-foreground hover:text-foreground'
            }`}
          >
            <Laptop className={`w-3.5 h-3.5 ${isWebcamCCTVActive ? 'animate-pulse text-accent' : ''}`} />
            <span>{isWebcamCCTVActive ? '● LAPTOP WEBCAM: ON' : 'LAPTOP WEBCAM: OFF'}</span>
          </button>

          {/* 📱 Mobile Nodes Active Status Badge */}
          <button
            onClick={() => {
              setModalTab('mobile');
              setShowAddCameraModal(true);
            }}
            className={`px-3 py-1.5 h-8 text-xs font-mono font-bold border transition-all flex items-center gap-2 ${
              activeMobileList.length > 0
                ? 'bg-[#39D98A]/20 border-[#39D98A]/60 text-[#39D98A] shadow-sm shadow-[#39D98A]/20'
                : 'bg-muted border-border text-muted-foreground hover:text-foreground hover:border-[#39D98A]/40'
            }`}
          >
            <Smartphone className={`w-3.5 h-3.5 ${activeMobileList.length > 0 ? 'animate-pulse text-[#39D98A]' : ''}`} />
            <span>
              {activeMobileList.length > 0
                ? `● ${activeMobileList.length} MOBILE CAM${activeMobileList.length > 1 ? 'S' : ''} LIVE`
                : '+ CONNECT MOBILE CAM'}
            </span>
          </button>

          {/* ──── ADD NEW CAMERA MODAL BUTTON ──── */}
          <button
            onClick={() => setShowAddCameraModal(true)}
            className="px-3 py-1.5 h-8 text-xs font-mono font-bold border bg-accent text-[#071018] hover:bg-accent/90 transition-all flex items-center gap-1.5 shadow-md shadow-accent/20"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>ADD CAMERA FEED</span>
          </button>
        </div>

        {/* Right Toolbar Controls: Telemetry, Density, Alarms, Refresh */}
        <div className="flex items-center gap-2">
          {/* Telemetry Side-Car Toggle */}
          <button
            onClick={() => setShowSidecar(!showSidecar)}
            className={`px-2.5 h-8 text-xs font-mono font-bold border transition-colors flex items-center gap-1.5 ${
              showSidecar
                ? 'bg-[#37B9FF]/20 border-[#37B9FF] text-[#37B9FF]'
                : 'bg-muted border-border text-muted-foreground hover:text-foreground'
            }`}
            title="Toggle Telemetry Intelligence Sidecar"
          >
            <Activity className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">TELEMETRY</span>
          </button>

          {/* Grid Density Switcher (2x2, 3x3, 4x4) */}
          <div className="flex items-center bg-[#0F151C] border border-border p-0.5">
            {(['2x2', '3x3', '4x4'] as const).map((density) => (
              <button
                key={density}
                onClick={() => setGridDensity(density)}
                className={`px-2.5 py-1 text-xs font-mono font-bold transition-colors ${
                  gridDensity === density
                    ? 'bg-accent text-[#071018]'
                    : 'text-[#8D99A5] hover:text-foreground'
                }`}
              >
                {density}
              </button>
            ))}
          </div>

          {/* Mute Alarms */}
          <button
            onClick={() => {
              setIsAlertsMuted(!isAlertsMuted);
              showToast({
                title: isAlertsMuted ? 'Alarms Unmuted' : 'Alarms Muted',
                message: isAlertsMuted ? 'Audio alarms enabled for perimeter breaches.' : 'Silent watch mode active.',
                type: 'info',
              });
            }}
            className={`p-2 border transition-colors ${
              isAlertsMuted
                ? 'bg-red-500/15 border-red-500/30 text-red-500'
                : 'bg-muted border-border text-muted-foreground hover:text-foreground'
            }`}
            title={isAlertsMuted ? 'Unmute Perimeter Alarms' : 'Mute Perimeter Alarms'}
          >
            {isAlertsMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          {/* Refresh Streams */}
          <button
            onClick={refetch}
            className="p-2 bg-muted hover:bg-muted/80 border border-border text-muted-foreground hover:text-foreground transition-colors"
            title="Refresh All Stream Feeds"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ──── Tactical Multi-Camera Connection & Polygon Mapping Modal ──── */}
      {showAddCameraModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fade-in">
          <div className="bg-[#0C141D] border border-accent/40 w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="bg-card border-b border-border p-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-2.5 h-2.5 bg-accent animate-pulse" />
                <h3 className="text-sm font-bold font-mono text-white tracking-wider uppercase flex items-center gap-2">
                  <MonitorSmartphone className="w-4 h-4 text-accent" />
                  Tactical Multi-Camera Operations • Sensor &amp; Polygon Setup
                </h3>
              </div>
              <button
                onClick={() => setShowAddCameraModal(false)}
                className="p-1 text-muted-foreground hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="flex border-b border-border bg-[#080E14]">
              <button
                onClick={() => setModalTab('mobile')}
                className={`flex-1 py-3 px-4 text-xs font-mono font-bold flex items-center justify-center gap-2 transition-colors border-b-2 ${
                  modalTab === 'mobile'
                    ? 'border-accent text-accent bg-accent/10'
                    : 'border-transparent text-muted-foreground hover:text-white'
                }`}
              >
                <Smartphone className="w-4 h-4" />
                <span>1. MOBILE CAMERAS + POLYGON</span>
                {activeMobileList.length > 0 && (
                  <span className="bg-[#39D98A] text-black text-[9px] px-1.5 py-0.2 rounded-full font-bold ml-1">
                    {activeMobileList.length} LIVE
                  </span>
                )}
              </button>

              <button
                onClick={() => setModalTab('webcam')}
                className={`flex-1 py-3 px-4 text-xs font-mono font-bold flex items-center justify-center gap-2 transition-colors border-b-2 ${
                  modalTab === 'webcam'
                    ? 'border-[#37B9FF] text-[#37B9FF] bg-[#37B9FF]/10'
                    : 'border-transparent text-muted-foreground hover:text-white'
                }`}
              >
                <Laptop className="w-4 h-4" />
                <span>2. LAPTOP &amp; USB WEBCAMS</span>
                {hardwareDevices.length > 0 && (
                  <span className="bg-[#37B9FF] text-black text-[9px] px-1.5 py-0.2 rounded-full font-bold ml-1">
                    {hardwareDevices.length} DETECTED
                  </span>
                )}
              </button>

              <button
                onClick={() => setModalTab('rtsp')}
                className={`flex-1 py-3 px-4 text-xs font-mono font-bold flex items-center justify-center gap-2 transition-colors border-b-2 ${
                  modalTab === 'rtsp'
                    ? 'border-[#A78BFA] text-[#A78BFA] bg-[#A78BFA]/10'
                    : 'border-transparent text-muted-foreground hover:text-white'
                }`}
              >
                <Radio className="w-4 h-4" />
                <span>3. RTSP BORDER CAMS</span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-5">
              {/* ──── TAB 1: CONNECT MOBILE CAMERAS + POLYGON MAPPING ──── */}
              {modalTab === 'mobile' && (
                <div className="space-y-5">
                  {/* Unit Selector Pills */}
                  <div>
                    <label className="text-xs font-mono font-bold text-gray-300 block mb-2">
                      SELECT MOBILE FIELD NODE TO PAIR &amp; MAP:
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      {[
                        { id: 'CAM_MOB_01', name: 'Mobile Patrol Alpha', desc: 'Perimeter Scout 01' },
                        { id: 'CAM_MOB_02', name: 'Mobile Recon Bravo', desc: 'Forward Observation 02' },
                        { id: 'CAM_MOB_03', name: 'Perimeter Charlie', desc: 'Tactical Checkpoint 03' },
                      ].map((unit) => {
                        const isConnected = !!mobileNodes[unit.id];
                        const isSelected = selectedMobileUnit === unit.id;
                        return (
                          <button
                            key={unit.id}
                            onClick={() => setSelectedMobileUnit(unit.id as any)}
                            className={`p-3 text-left border transition-all relative ${
                              isSelected
                                ? 'bg-accent/15 border-accent text-white shadow-sm shadow-accent/20'
                                : 'bg-[#080E14] border-border text-muted-foreground hover:text-white'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-mono font-bold text-accent">{unit.id}</span>
                              {isConnected ? (
                                <span className="text-[9px] font-mono bg-green-500/20 text-green-400 border border-green-500/40 px-1.5 py-0.5 flex items-center gap-1 font-bold">
                                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-ping" />
                                  ONLINE
                                </span>
                              ) : (
                                <span className="text-[9px] font-mono text-muted-foreground">READY TO PAIR</span>
                              )}
                            </div>
                            <div className="text-xs font-bold text-white">{unit.name}</div>
                            <div className="text-[10px] text-muted-foreground mt-0.5">{unit.desc}</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* QR Code & Direct Pairing Card */}
                  <div className="bg-[#080E14] border border-border p-4 flex flex-col md:flex-row items-center gap-5">
                    {/* Left: QR Code */}
                    <div className="bg-white p-2.5 shadow-lg shrink-0 flex flex-col items-center">
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(
                          activeMobileUrl
                        )}&bgcolor=ffffff&color=000000`}
                        alt="Scan QR code with phone camera"
                        className="w-36 h-36"
                      />
                      <span className="text-[8px] font-mono text-black font-bold mt-1.5 uppercase tracking-wider">
                        PAIR AS {selectedMobileUnit}
                      </span>
                    </div>

                    {/* Right: Quick Instructions & Link */}
                    <div className="flex-1 space-y-2.5">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 text-[9px] font-mono font-bold bg-green-500/20 text-green-400 border border-green-500/40 uppercase">
                            {tunnelUrl ? 'PUBLIC SECURE CLOUDFLARE SSL' : 'LOCAL WI-FI STREAM'}
                          </span>
                          <span className="text-xs text-muted-foreground font-mono">Zero-friction camera relay</span>
                        </div>
                        <h4 className="text-sm font-bold text-white font-mono mt-1">
                          Scan with iPhone or Android Camera
                        </h4>
                        <p className="text-xs text-muted-foreground font-mono mt-0.5">
                          Point phone camera at QR code, tap the notification, and allow camera. The live feed streams into the grid alongside your laptop webcam.
                        </p>
                      </div>

                      {/* URL Box */}
                      <div className="flex items-center gap-2 bg-[#05080B] border border-border p-2">
                        <input
                          type="text"
                          readOnly
                          value={activeMobileUrl}
                          className="bg-transparent text-xs font-mono text-accent flex-1 outline-none truncate"
                        />
                        <button
                          onClick={handleCopyLink}
                          className="px-2.5 py-1 text-xs font-mono bg-accent/20 hover:bg-accent/30 text-accent border border-accent/40 flex items-center gap-1.5 shrink-0"
                        >
                          {copiedLink ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedLink ? 'COPIED' : 'COPY'}</span>
                        </button>
                      </div>

                      {/* Simulator Launch Button */}
                      <div className="pt-0.5">
                        <a
                          href={activeMobileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex px-3 py-1 bg-[#37B9FF]/20 hover:bg-[#37B9FF]/30 text-[#37B9FF] border border-[#37B9FF]/50 text-xs font-mono font-bold items-center gap-2 transition-colors"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>LAUNCH TRANSMITTER IN NEW TAB (INSTANT MAC TEST)</span>
                        </a>
                      </div>
                    </div>
                  </div>

                  {/* ──── SECTION: CONFIGURE POLYGON MAPPING & SUSPICIOUS INTRUSION ZONE ──── */}
                  <div className="bg-[#080E14] border border-[#37B9FF]/40 p-4 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-accent" />
                        <h4 className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                          Polygon Mapping &amp; Suspicious Activity Zone ({selectedMobileUnit})
                        </h4>
                      </div>
                      <span className="text-[10px] font-mono text-green-400 bg-green-500/10 border border-green-500/30 px-2 py-0.5 font-bold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-ping" />
                        RAY-CASTING DETECTION ACTIVE
                      </span>
                    </div>

                    <p className="text-[11px] font-mono text-muted-foreground">
                      Define the restricted polygon boundary for this camera. Any detected person, vehicle, or crawling/crouching movement entering this zone will automatically trigger <span className="text-red-400 font-bold">SUSPICIOUS ACTIVITY</span> alerts.
                    </p>

                    {/* Presets */}
                    <div>
                      <span className="text-[10px] font-mono text-gray-400 block mb-1.5 font-bold">
                        SELECT POLYGON PRESET:
                      </span>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {POLYGON_PRESETS.map((preset) => (
                          <button
                            key={preset.name}
                            type="button"
                            onClick={() => {
                              setCameraPolygons((prev) => ({
                                ...prev,
                                [selectedMobileUnit]: preset.points,
                              }));
                              showToast({
                                title: 'Polygon Preset Applied',
                                message: `${preset.name} applied to ${selectedMobileUnit}.`,
                                type: 'info',
                              });
                            }}
                            className="p-2 text-left bg-[#05080B] hover:bg-accent/15 border border-border hover:border-accent text-gray-300 transition-all group"
                          >
                            <div className="text-[10px] font-mono font-bold text-accent group-hover:text-white">
                              {preset.name}
                            </div>
                            <div className="text-[8px] font-mono text-muted-foreground truncate mt-0.5">
                              {preset.points.length} vertices
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Mini SVG Preview of Polygon */}
                    <div
                      className="relative bg-[#05080B] border border-border p-2 overflow-hidden flex items-center justify-center"
                      style={{ aspectRatio: '21/8' }}
                    >
                      <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#37B9FF_1px,transparent_1px)] [background-size:20px_20px]" />

                      <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                        <polygon
                          points={(cameraPolygons[selectedMobileUnit] || DEFAULT_CAMERA_POLYGON)
                            .map((p) => `${p.x},${p.y}`)
                            .join(' ')}
                          fill="rgba(55, 185, 255, 0.16)"
                          stroke="#37B9FF"
                          strokeWidth="1.2"
                          strokeDasharray="4,2"
                        />
                        {(cameraPolygons[selectedMobileUnit] || DEFAULT_CAMERA_POLYGON).map((p, i) => (
                          <g key={i}>
                            <circle cx={p.x} cy={p.y} r="2.2" fill="#37B9FF" stroke="#FFFFFF" strokeWidth="0.8" />
                            <text
                              x={p.x + 3}
                              y={p.y - 2}
                              fill="#FFFFFF"
                              fontSize="3.5"
                              fontFamily="monospace"
                              fontWeight="bold"
                            >
                              P{i + 1}
                            </text>
                          </g>
                        ))}
                        <text
                          x="50"
                          y="52"
                          fill="#37B9FF"
                          fontSize="3.5"
                          fontFamily="monospace"
                          fontWeight="bold"
                          textAnchor="middle"
                        >
                          🛡 RESTRICTED ZONE // {selectedMobileUnit}
                        </text>
                      </svg>

                      <div className="absolute bottom-2 left-2 text-[9px] font-mono text-muted-foreground bg-black/75 px-2 py-0.5 border border-white/10">
                        Boundary: {(cameraPolygons[selectedMobileUnit] || DEFAULT_CAMERA_POLYGON).length} points • Click &quot;POLYGON&quot; on the feed tile at any time to redraw
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ──── TAB 2: LAPTOP & HARDWARE WEBCAMS + POLYGON ──── */}
              {modalTab === 'webcam' && (
                <div className="space-y-4">
                  <div className="bg-[#080E14] border border-border p-4">
                    <h4 className="text-xs font-mono font-bold text-white uppercase mb-1 flex items-center gap-2">
                      <Laptop className="w-4 h-4 text-accent" />
                      Physical Hardware Cameras on this Computer ({hardwareDevices.length})
                    </h4>
                    <p className="text-xs text-muted-foreground font-mono">
                      Connect your built-in FaceTime HD camera, external USB webcams, or virtual cameras with dedicated polygon security boundaries.
                    </p>
                  </div>

                  {/* Polygon preset selector for Laptop Webcam (CAM_04) */}
                  <div className="bg-[#080E14] border border-[#37B9FF]/40 p-4 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-accent" />
                        <span className="text-xs font-mono font-bold text-white">
                          POLYGON RESTRICTED ZONE FOR PRIMARY LAPTOP WEBCAM (CAM_04)
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-accent">ACTIVE</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {POLYGON_PRESETS.map((preset) => (
                        <button
                          key={preset.name}
                          type="button"
                          onClick={() => {
                            setCameraPolygons((prev) => ({
                              ...prev,
                              CAM_04: preset.points,
                            }));
                            showToast({
                              title: 'Polygon Preset Applied',
                              message: `${preset.name} applied to CAM_04.`,
                              type: 'info',
                            });
                          }}
                          className="px-2.5 py-1 text-[10px] font-mono bg-[#05080B] hover:bg-accent/20 border border-border hover:border-accent text-gray-200 transition-colors"
                        >
                          {preset.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {hardwareDevices.map((dev, idx) => {
                      const isMainWebcam = laptopDeviceId === dev.deviceId;
                      const isExtraWebcam = extraWebcamSlots.some((s) => s.deviceId === dev.deviceId);

                      return (
                        <div
                          key={dev.deviceId || idx}
                          className={`p-4 border transition-all ${
                            isMainWebcam
                              ? 'bg-accent/10 border-accent/60'
                              : isExtraWebcam
                              ? 'bg-[#37B9FF]/10 border-[#37B9FF]/50'
                              : 'bg-[#080E14] border-border hover:border-gray-500'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <Laptop className="w-6 h-6 text-accent mb-2" />
                            {isMainWebcam ? (
                              <span className="text-[9px] font-mono bg-accent text-[#071018] px-1.5 py-0.5 font-bold">
                                PRIMARY (CAM_04)
                              </span>
                            ) : isExtraWebcam ? (
                              <span className="text-[9px] font-mono bg-[#37B9FF]/20 text-[#37B9FF] border border-[#37B9FF]/40 px-1.5 py-0.5 font-bold">
                                ACTIVE EXTRA
                              </span>
                            ) : (
                              <span className="text-[9px] font-mono text-muted-foreground">AVAILABLE</span>
                            )}
                          </div>
                          <div className="text-xs font-bold text-white font-mono truncate">
                            {dev.label || `Hardware Video Sensor ${idx + 1}`}
                          </div>
                          <div className="text-[10px] text-muted-foreground font-mono mt-1 truncate">
                            ID: {dev.deviceId.slice(0, 24)}...
                          </div>

                          <div className="mt-3 flex items-center gap-2">
                            {!isMainWebcam && (
                              <button
                                onClick={() => {
                                  setLaptopDeviceId(dev.deviceId);
                                  setIsWebcamCCTVActive(true);
                                  showToast({
                                    title: 'Primary Webcam Assigned',
                                    message: `${dev.label || 'Camera'} assigned to CAM_04.`,
                                    type: 'success',
                                  });
                                }}
                                className="px-2 py-1 text-[10px] font-mono bg-accent/20 hover:bg-accent/30 border border-accent/40 text-accent font-bold"
                              >
                                Set as CAM_04
                              </button>
                            )}

                            {!isExtraWebcam && !isMainWebcam && (
                              <button
                                onClick={() => handleAddHardwareWebcam(dev)}
                                className="px-2 py-1 text-[10px] font-mono bg-[#37B9FF]/20 hover:bg-[#37B9FF]/30 border border-[#37B9FF]/40 text-[#37B9FF] font-bold"
                              >
                                + Add as New Tile
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ──── TAB 3: RTSP / IP BORDER CAMS ──── */}
              {modalTab === 'rtsp' && (
                <div className="space-y-4">
                  <div className="bg-[#080E14] border border-border p-4">
                    <h4 className="text-xs font-mono font-bold text-white uppercase mb-1 flex items-center gap-2">
                      <Radio className="w-4 h-4 text-[#A78BFA]" />
                      Register Perimeter IP / RTSP Camera
                    </h4>
                    <p className="text-xs text-muted-foreground font-mono">
                      Connect high-resolution RTSP/HLS border surveillance cameras with automated neural detection.
                    </p>
                  </div>

                  <Link
                    href="/cameras"
                    className="p-4 bg-[#080E14] border border-border hover:border-[#A78BFA] transition-all flex items-center justify-between group block"
                  >
                    <div>
                      <div className="text-xs font-bold text-white font-mono group-hover:text-[#A78BFA] transition-colors">
                        Open Camera Management Page →
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-1 font-mono">
                        Configure fixed RTSP endpoints, virtual fence tripwires, and camera calibration parameters.
                      </p>
                    </div>
                    <Radio className="w-6 h-6 text-[#A78BFA]" />
                  </Link>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="bg-card border-t border-border p-3.5 flex items-center justify-between">
              <span className="text-[11px] font-mono text-muted-foreground">
                Current Setup: 💻 {isWebcamCCTVActive ? '1 Laptop Cam' : '0 Laptop Cam'} • 📱 {activeMobileList.length} Mobile Nodes • 📹 {extraWebcamSlots.length} Extra Webcams
              </span>
              <button
                onClick={() => setShowAddCameraModal(false)}
                className="px-4 py-1.5 bg-accent text-[#071018] text-xs font-mono font-bold hover:bg-accent/90 transition-colors"
              >
                APPLY &amp; RETURN TO GRID
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Workspace: CCTV Grid + Telemetry Side-Car */}
      <div className="flex flex-col lg:flex-row gap-3 flex-1 items-stretch">
        {/* Main CCTV Feed Grid */}
        <div className={`grid ${gridColsClass} gap-3 flex-1`}>
          {/* 1. Fixed Border RTSP Cameras */}
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
                  fencePolygon={cameraPolygons[cam.id]}
                  onRemovePolygon={() =>
                    setCameraPolygons((prev) => ({ ...prev, [cam.id]: [] }))
                  }
                  onPolygonChange={(pts) =>
                    setCameraPolygons((prev) => ({ ...prev, [cam.id]: pts }))
                  }
                  className="w-full shadow-lg"
                />
              </div>
            );
          })}

          {/* 2. DEDICATED LAPTOP HARDWARE WEBCAM TILE (CAM_04) WITH POLYGON MAPPING */}
          {isWebcamCCTVActive && (
            <div
              onClick={() => {
                setActiveCameraId('CAM_04');
                setActiveCameraName('Laptop Command Center Webcam');
              }}
              className={`relative group cursor-pointer transition-all ${
                activeCameraId === 'CAM_04' ? 'ring-1 ring-accent' : ''
              }`}
            >
              <LiveWebcamCCTV
                cameraCode="CAM_04"
                cameraName="Laptop Command Center Webcam"
                location="Command Center HQ • Station 01"
                preferredDeviceId={laptopDeviceId}
                polygonPoints={cameraPolygons['CAM_04']}
                onPolygonChange={(pts) =>
                  setCameraPolygons((prev) => ({ ...prev, CAM_04: pts }))
                }
                onDeviceChange={(devId) => setLaptopDeviceId(devId)}
                onTargetDetected={(targets) => {
                  if (activeCameraId === 'CAM_04') {
                    setTrackedTargets(targets);
                  }
                }}
                className="w-full shadow-lg"
              />
            </div>
          )}

          {/* 3. 📱 CONNECTED MOBILE PHONE CAMERAS WITH POLYGON MAPPING */}
          {activeMobileList.map((node) => (
            <div
              key={node.id}
              onClick={() => {
                setActiveCameraId(node.id);
                setActiveCameraName(node.name);
              }}
              className={`relative group cursor-pointer transition-all ${
                activeCameraId === node.id ? 'ring-1 ring-accent' : ''
              }`}
            >
              <LiveWebcamCCTV
                cameraCode={node.id}
                cameraName={node.name}
                location={`Mobile Patrol Unit • Field Wireless`}
                isRemoteActive={true}
                remoteFrameUrl={node.frameUrl}
                remoteDeviceName={node.name}
                batteryLevel={node.battery}
                polygonPoints={cameraPolygons[node.id]}
                onPolygonChange={(pts) =>
                  setCameraPolygons((prev) => ({ ...prev, [node.id]: pts }))
                }
                onClose={() => removeMobileNode(node.id)}
                onTargetDetected={(targets) => {
                  if (activeCameraId === node.id) {
                    setTrackedTargets(targets);
                  }
                }}
                className="w-full shadow-lg"
              />
            </div>
          ))}

          {/* 4. 📹 EXTRA HARDWARE USB WEBCAMS WITH POLYGON MAPPING */}
          {extraWebcamSlots
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
                  preferredDeviceId={slot.deviceId}
                  polygonPoints={cameraPolygons[slot.cameraCode]}
                  onPolygonChange={(pts) =>
                    setCameraPolygons((prev) => ({ ...prev, [slot.cameraCode]: pts }))
                  }
                  onClose={() => removeExtraWebcam(slot.id)}
                  onTargetDetected={(targets) => {
                    if (activeCameraId === slot.cameraCode) {
                      setTrackedTargets(targets);
                    }
                  }}
                  className="w-full shadow-lg"
                />
              </div>
            ))}

          {/* 5. Empty placeholder slots for remaining tiles */}
          {Array.from({
            length: Math.max(
              0,
              densityCount - (camerasToDisplay.length + totalCustomLiveCount)
            ),
          }).map((_, i) => (
            <div
              key={`placeholder-${i}`}
              className="bg-[#05080B] border border-border border-dashed flex flex-col items-center justify-center text-[#4E5A64] group cursor-pointer hover:border-accent/40 hover:bg-accent/5 transition-all"
              style={{ aspectRatio: '16/9' }}
              onClick={() => setShowAddCameraModal(true)}
            >
              <MonitorPlay className="w-8 h-8 mb-2 opacity-40 group-hover:opacity-70 group-hover:text-accent transition-all" />
              <span className="text-xs font-mono">
                CHANNEL {camerasToDisplay.length + totalCustomLiveCount + i + 1} — NO SIGNAL
              </span>
              <span className="text-[10px] font-mono text-accent/70 mt-1 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 font-bold">
                <Plus className="w-3.5 h-3.5" /> Click to connect phone or webcam + map zone
              </span>
            </div>
          ))}
        </div>

        {/* Telemetry Intelligence Sidecar */}
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
            NODE-01 COMMAND CENTER
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
            <Laptop className="w-3 h-3" />
            LAPTOP WEBCAM: {isWebcamCCTVActive ? 'ACTIVE' : 'OFF'}
          </span>
          <span className="text-[#37B9FF] flex items-center gap-1.5">
            <Smartphone className="w-3 h-3" />
            MOBILE CAMERAS: {activeMobileList.length} CONNECTED
          </span>
          <span className="text-[#F4C95D] flex items-center gap-1.5">
            <Shield className="w-3 h-3" />
            VIRTUAL FENCE: ACTIVE ON ALL CHANNELS
          </span>
          <span>
            CHANNELS: {camerasToDisplay.length + totalCustomLiveCount}/{densityCount}
          </span>
        </div>
      </div>
    </div>
  );
}
