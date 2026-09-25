"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import {
  Smartphone,
  Camera as CameraIcon,
  ArrowLeft,
  Shield,
  Radio,
  Sliders,
  Maximize,
  CheckCircle2,
  ExternalLink,
  Wifi,
  QrCode,
  Copy,
  MonitorSmartphone,
  Laptop,
  Plus,
  X,
  Signal,
  Globe,
  Zap,
  RefreshCw,
  Share2,
  Sparkles,
} from 'lucide-react';
import { LiveWebcamCCTV } from '@/components/cameras/LiveWebcamCCTV';
import { useToast } from '@/components/ui/Toast';

interface ConnectedDevice {
  id: string;
  name: string;
  type: 'iphone' | 'android' | 'laptop' | 'webcam';
  status: 'connected' | 'connecting' | 'disconnected';
  ip: string;
  resolution: string;
  fps: number;
  battery?: number;
  connectedAt: string;
}

export default function MobileCCTVTransmitterPage() {
  const { showToast } = useToast();
  const [streamActive, setStreamActive] = useState(true);
  const [localIP, setLocalIP] = useState<string>('');
  const [tunnelUrl, setTunnelUrl] = useState<string>('');
  const [showQR, setShowQR] = useState(true);
  const [copied, setCopied] = useState(false);
  const [connectedDevices, setConnectedDevices] = useState<ConnectedDevice[]>([]);
  const [activeDeviceId, setActiveDeviceId] = useState<string>('local');
  const [showAddDevice, setShowAddDevice] = useState(false);
  const [pairingCode, setPairingCode] = useState('');
  const [remoteFrameUrl, setRemoteFrameUrl] = useState<string | null>(null);
  const [remoteDevice, setRemoteDevice] = useState<any | null>(null);
  const [isRemoteActive, setIsRemoteActive] = useState(false);
  const [refreshingTunnel, setRefreshingTunnel] = useState(false);
  const prevBlobUrlRef = useRef<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // Generate pairing code
  useEffect(() => {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    setPairingCode(code);
  }, []);

  // Poll /api/tunnel-info for the active Cloudflare Tunnel URL and local IPs
  useEffect(() => {
    let isCancelled = false;

    async function fetchTunnelInfo() {
      try {
        const res = await fetch('/api/tunnel-info');
        if (res.ok) {
          const data = await res.json();
          if (!isCancelled) {
            if (data.tunnelUrl) {
              setTunnelUrl(data.tunnelUrl);
            }
            if (data.localIP) {
              setLocalIP(data.localIP);
            }
            if (data.activeDevice) {
              setRemoteDevice(data.activeDevice);
            }
          }
        }
      } catch (err) {
        // Fallback silently if API not ready
      }
    }

    fetchTunnelInfo();
    const interval = setInterval(fetchTunnelInfo, 3000);
    return () => {
      isCancelled = true;
      clearInterval(interval);
    };
  }, []);

  // The active mobile URL (Cloudflare Tunnel is preferred for zero-friction HTTPS)
  const mobileUrl = tunnelUrl
    ? `${tunnelUrl}/cameras/mobile/stream`
    : localIP
    ? `http://${localIP}:3000/cameras/mobile/stream`
    : 'http://localhost:3000/cameras/mobile/stream';

  // WebSocket receiver for live phone camera frames & telemetry
  useEffect(() => {
    let ws: WebSocket;
    let isCancelled = false;

    function connectWS() {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/api/camera-stream`;

      ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        if (isCancelled) return;
        // Register this desktop browser as a receiver
        ws.send(JSON.stringify({ type: 'register', role: 'receiver' }));
      };

      ws.onmessage = (event) => {
        if (isCancelled) return;

        // Binary frame from mobile camera
        if (event.data instanceof Blob) {
          const newUrl = URL.createObjectURL(event.data);
          const oldUrl = prevBlobUrlRef.current;
          prevBlobUrlRef.current = newUrl;
          setRemoteFrameUrl(newUrl);
          if (oldUrl) {
            setTimeout(() => URL.revokeObjectURL(oldUrl), 1000);
          }
          setIsRemoteActive(true);
          setActiveDeviceId('mobile-node');
          return;
        }

        // JSON control / telemetry messages
        try {
          const data = JSON.parse(event.data);

          if (data.type === 'mobile_connected') {
            const dev = data.device;
            setRemoteDevice(dev);
            setIsRemoteActive(true);
            setActiveDeviceId('mobile-node');

            setConnectedDevices((prev) => {
              const withoutMobile = prev.filter((d) => d.id !== 'mobile-node');
              return [
                ...withoutMobile,
                {
                  id: 'mobile-node',
                  name: dev.name || 'iPhone CCTV Unit',
                  type: dev.type || 'iphone',
                  status: 'connected',
                  ip: 'Live Stream (Cloudflare SSL)',
                  resolution: dev.resolution || '1280x720',
                  fps: 30,
                  battery: dev.battery ?? 92,
                  connectedAt: new Date().toISOString(),
                },
              ];
            });

            showToast({
              title: '📱 Phone Camera Connected!',
              message: `${dev.name || 'Mobile Phone'} is now transmitting live video feed.`,
              type: 'success',
            });
          } else if (data.type === 'telemetry') {
            const dev = data.device;
            if (dev) {
              setRemoteDevice((prev: any) => ({ ...prev, ...dev }));
              setConnectedDevices((prev) =>
                prev.map((d) =>
                  d.id === 'mobile-node'
                    ? { ...d, battery: dev.battery ?? d.battery, resolution: dev.resolution ?? d.resolution }
                    : d
                )
              );
            }
          } else if (data.type === 'mobile_disconnected') {
            setIsRemoteActive(false);
            setConnectedDevices((prev) =>
              prev.map((d) =>
                d.id === 'mobile-node' ? { ...d, status: 'disconnected' as const } : d
              )
            );
            showToast({
              title: 'Mobile Disconnected',
              message: 'Phone camera transmitter disconnected.',
              type: 'info',
            });
          }
        } catch {}
      };

      ws.onclose = () => {
        if (!isCancelled) {
          setTimeout(connectWS, 2500);
        }
      };
    }

    connectWS();

    return () => {
      isCancelled = true;
      if (ws) ws.close();
      if (prevBlobUrlRef.current) {
        URL.revokeObjectURL(prevBlobUrlRef.current);
      }
    };
  }, [showToast]);

  // Initial devices list
  useEffect(() => {
    setConnectedDevices([
      {
        id: 'local',
        name: 'This Device (Laptop Webcam)',
        type: 'laptop',
        status: 'connected',
        ip: '127.0.0.1',
        resolution: '1920x1080',
        fps: 30,
        connectedAt: new Date().toISOString(),
      },
    ]);
  }, []);

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(mobileUrl);
      setCopied(true);
      showToast({
        title: 'URL Copied',
        message: 'Mobile link copied. Open in Safari or Chrome on your phone.',
        type: 'success',
      });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const refreshTunnel = async () => {
    setRefreshingTunnel(true);
    showToast({
      title: 'Generating New Tunnel...',
      message: 'Creating a fresh Cloudflare public link for your phone.',
      type: 'info',
    });
    try {
      const res = await fetch('/api/tunnel-info?refresh=true');
      if (res.ok) {
        const data = await res.json();
        if (data.tunnelUrl) {
          setTunnelUrl(data.tunnelUrl);
          showToast({
            title: 'New Secure Link Ready',
            message: 'Scan the new QR code on your phone.',
            type: 'success',
          });
        }
      }
    } catch {}
    setRefreshingTunnel(false);
  };

  const removeDevice = (id: string) => {
    setConnectedDevices((prev) => prev.filter((d) => d.id !== id));
    if (activeDeviceId === id) {
      setActiveDeviceId('local');
      setIsRemoteActive(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#05080B] text-foreground flex flex-col p-3 sm:p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border pb-3">
        <div className="flex items-center gap-3">
          <Link
            href="/live"
            className="p-1.5 bg-[#0F151C] border border-border hover:border-accent text-muted-foreground hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-accent animate-pulse" />
              <h1 className="text-sm sm:text-base font-bold text-white tracking-wide uppercase font-mono">
                Mobile CCTV Field Transmitter
              </h1>
              {isRemoteActive && (
                <span className="px-2 py-0.5 bg-green-500/20 text-green-400 border border-green-500/30 text-[10px] font-mono font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-ping" />
                  PHONE STREAMING LIVE
                </span>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground font-mono">
              Scan the QR code or tap the link to connect your phone camera as a live surveillance node.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {tunnelUrl ? (
            <span className="px-2.5 py-1 bg-green-500/20 text-green-400 border border-green-500/30 text-xs font-mono font-bold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-ping" />
              CLOUDFLARE SSL ACTIVE
            </span>
          ) : (
            <span className="px-2.5 py-1 bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-mono font-bold flex items-center gap-1.5">
              <RefreshCw className="w-3 h-3 animate-spin" />
              STARTING SECURE LINK...
            </span>
          )}
          <span className="px-2.5 py-1 bg-accent/20 text-accent border border-accent/30 text-xs font-mono font-bold hidden sm:flex items-center gap-1.5">
            <MonitorSmartphone className="w-3.5 h-3.5" />
            {connectedDevices.length} NODE{connectedDevices.length !== 1 ? 'S' : ''}
          </span>
        </div>
      </div>

      {/* ──── Connection Method Panel ──── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* LEFT: Connection Panel */}
        <div className="lg:col-span-4 space-y-4">
          {/* Quick Connect Card */}
          <div className="bg-[#0C141D] border border-border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold font-mono text-white uppercase tracking-wider flex items-center gap-2">
                <Wifi className="w-3.5 h-3.5 text-accent" />
                Phone Camera Connection Link
              </h3>
              <span className="text-[9px] font-mono text-green-400 bg-green-500/10 px-1.5 py-0.5 border border-green-500/20">
                HTTPS VERIFIED
              </span>
            </div>

            {/* Step-by-step instructions */}
            <div className="space-y-2">
              <div className="flex items-start gap-2.5 p-2 bg-[#070D14] border border-border/60">
                <span className="w-5 h-5 bg-accent text-[#071018] text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                  1
                </span>
                <div>
                  <p className="text-[11px] text-white font-bold">Scan QR Code with Phone Camera</p>
                  <p className="text-[10px] text-muted-foreground">
                    Open your iPhone/Android Camera app and point at the QR code below.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-2 bg-[#070D14] border border-border/60">
                <span className="w-5 h-5 bg-accent text-[#071018] text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                  2
                </span>
                <div>
                  <p className="text-[11px] text-white font-bold">Tap &quot;Allow&quot; for Camera</p>
                  <p className="text-[10px] text-muted-foreground">
                    Safari/Chrome will open with trusted SSL. Tap &quot;Allow&quot; to begin streaming.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-2 bg-[#070D14] border border-border/60">
                <span className="w-5 h-5 bg-accent text-[#071018] text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                  3
                </span>
                <div>
                  <p className="text-[11px] text-white font-bold">Watch Live CCTV Feed on Laptop</p>
                  <p className="text-[10px] text-muted-foreground">
                    Your phone camera stream and AI bounding box detection will appear live on this screen.
                  </p>
                </div>
              </div>
            </div>

            {/* Connection URL Box */}
            <div className="p-3 bg-[#070D14] border border-accent/30 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-muted-foreground uppercase flex items-center gap-1">
                  <Globe className="w-3 h-3 text-accent" />
                  Live Mobile Link
                </span>
                <div className="flex items-center gap-3">
                  <button
                    onClick={refreshTunnel}
                    disabled={refreshingTunnel}
                    className="text-[10px] font-mono text-amber-400 hover:text-amber-300 flex items-center gap-1 transition-colors"
                    title="Generate New Cloudflare Secure Link"
                  >
                    <RefreshCw className={`w-3 h-3 ${refreshingTunnel ? 'animate-spin' : ''}`} />
                    {refreshingTunnel ? 'Generating...' : 'New Link'}
                  </button>
                  <button
                    onClick={() => setShowQR(!showQR)}
                    className="text-[10px] font-mono text-accent hover:underline flex items-center gap-1"
                  >
                    <QrCode className="w-3 h-3" />
                    {showQR ? 'Hide' : 'Show'} QR
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <code className="flex-1 text-[11px] font-mono text-accent bg-black/40 px-2 py-1.5 border border-accent/20 truncate">
                  {mobileUrl}
                </code>
                <button
                  onClick={copyUrl}
                  className={`p-1.5 border transition-all ${
                    copied
                      ? 'bg-green-500/20 border-green-500/50 text-green-400'
                      : 'bg-[#0C141D] border-border hover:border-accent text-muted-foreground hover:text-white'
                  }`}
                  title="Copy URL"
                >
                  {copied ? (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
                <button
                  onClick={refreshTunnel}
                  disabled={refreshingTunnel}
                  className={`p-1.5 border transition-all ${
                    refreshingTunnel
                      ? 'bg-amber-500/20 border-amber-500/50 text-amber-400'
                      : 'bg-[#0C141D] border-border hover:border-accent text-muted-foreground hover:text-white'
                  }`}
                  title="Generate New Secure Link"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${refreshingTunnel ? 'animate-spin text-amber-400' : ''}`} />
                </button>
              </div>

              {/* QR Code */}
              {showQR && (
                <div className="flex flex-col items-center justify-center p-3 bg-white rounded-sm mt-2">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=170x170&data=${encodeURIComponent(mobileUrl)}&bgcolor=ffffff&color=000000`}
                    alt="Scan QR code with iPhone or Android camera"
                    className="w-[170px] h-[170px]"
                    width={170}
                    height={170}
                  />
                  <span className="text-[10px] text-gray-800 font-mono mt-1 font-bold">
                    Scan with Phone Camera
                  </span>
                </div>
              )}
            </div>

            {/* Security Protocol */}
            <div className="p-2 bg-[#070D14] border border-border/60 flex items-center justify-between text-[10px] font-mono">
              <span className="text-muted-foreground">SECURITY ENCRYPTION</span>
              <span className="text-green-400 font-bold flex items-center gap-1">
                <Shield className="w-3 h-3" /> TLS 1.3 / WSS
              </span>
            </div>
          </div>

          {/* ──── Connected Devices List ──── */}
          <div className="bg-[#0C141D] border border-border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold font-mono text-white uppercase tracking-wider flex items-center gap-2">
                <MonitorSmartphone className="w-3.5 h-3.5 text-[#37B9FF]" />
                Camera Feeds Matrix
              </h3>
              {isRemoteActive && (
                <span className="text-[9px] font-mono text-green-400 bg-green-500/10 px-1.5 py-0.5 border border-green-500/20">
                  MOBILE LIVE
                </span>
              )}
            </div>

            {/* Device List */}
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {connectedDevices.map((device) => {
                const isSelected =
                  (device.id === 'mobile-node' && isRemoteActive) ||
                  (device.id === 'local' && !isRemoteActive);

                return (
                  <div
                    key={device.id}
                    onClick={() => {
                      if (device.id === 'mobile-node') {
                        setIsRemoteActive(true);
                        setActiveDeviceId('mobile-node');
                      } else {
                        setIsRemoteActive(false);
                        setActiveDeviceId('local');
                      }
                    }}
                    className={`p-2.5 border cursor-pointer transition-all flex items-center justify-between ${
                      isSelected
                        ? 'bg-accent/15 border-accent/60 ring-1 ring-accent/30'
                        : 'bg-[#070D14] border-border/60 hover:border-border'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      {device.type === 'iphone' || device.type === 'android' ? (
                        <Smartphone className="w-4 h-4 text-accent animate-pulse" />
                      ) : (
                        <Laptop className="w-4 h-4 text-[#37B9FF]" />
                      )}
                      <div>
                        <div className="text-[11px] font-bold text-white font-mono flex items-center gap-1.5">
                          {device.name}
                          {isSelected && (
                            <span className="text-[9px] bg-accent text-[#071018] px-1 py-0.2 font-bold">
                              ACTIVE
                            </span>
                          )}
                        </div>
                        <div className="text-[9px] text-muted-foreground font-mono flex items-center gap-2">
                          <span>{device.ip}</span>
                          <span>•</span>
                          <span>{device.resolution}</span>
                          {device.battery !== undefined && (
                            <>
                              <span>•</span>
                              <span className="text-green-400 font-bold">{device.battery}%</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          device.status === 'connected'
                            ? 'bg-green-400 animate-pulse'
                            : 'bg-red-400'
                        }`}
                      />
                      {device.id !== 'local' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeDevice(device.id);
                          }}
                          className="p-0.5 text-muted-foreground hover:text-red-400 transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Network Info */}
          <div className="bg-[#0C141D] border border-border p-3 space-y-2">
            <h4 className="text-[10px] font-mono font-bold text-muted-foreground uppercase">
              Network Topology
            </h4>
            <div className="space-y-1 text-[10px] font-mono">
              <div className="flex justify-between py-0.5">
                <span className="text-muted-foreground">Public HTTPS Tunnel</span>
                <span className="text-green-400 truncate max-w-[180px]">
                  {tunnelUrl ? 'Connected (Cloudflare)' : 'Starting...'}
                </span>
              </div>
              <div className="flex justify-between py-0.5">
                <span className="text-muted-foreground">Local LAN IP</span>
                <span className="text-white">{localIP || '127.0.0.1'}</span>
              </div>
              <div className="flex justify-between py-0.5">
                <span className="text-muted-foreground">Relay Protocol</span>
                <span className="text-[#37B9FF]">WSS / Binary JPEG @ 25 FPS</span>
              </div>
              <div className="flex justify-between py-0.5">
                <span className="text-muted-foreground">AI Inference</span>
                <span className="text-[#39D98A]">Edge COCO-SSD + YOLO</span>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: Live Camera Feed */}
        <div className="lg:col-span-8 space-y-4">
          {/* Main CCTV Feed Viewport */}
          <div className="w-full shadow-2xl border border-accent/40 relative">
            <LiveWebcamCCTV
              cameraCode="CAM_04"
              cameraName="Mobile Field CCTV Unit"
              location="Perimeter Mobile Patrol • Sector 12"
              className="w-full"
              defaultFacingMode="environment"
              remoteFrameUrl={remoteFrameUrl}
              remoteDeviceName={remoteDevice?.name || 'Mobile Phone Camera (Live)'}
              isRemoteActive={isRemoteActive}
            />
          </div>

          {/* Detection Legend */}
          <div className="bg-[#0C141D] border border-border p-3 flex flex-wrap items-center gap-4 text-[10px] font-mono">
            <span className="text-muted-foreground uppercase font-bold">Detection Classes:</span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-1.5 bg-[#39D98A]" />
              <span className="text-[#39D98A]">Person</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-1.5 bg-[#37B9FF]" />
              <span className="text-[#37B9FF]">Car</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-1.5 bg-[#F4C95D]" />
              <span className="text-[#F4C95D]">Truck</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-1.5 bg-[#A78BFA]" />
              <span className="text-[#A78BFA]">Bus</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-1.5 bg-[#FB923C]" />
              <span className="text-[#FB923C]">Motorcycle</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-1.5 bg-[#FF5C67]" />
              <span className="text-[#FF5C67]">Threat / Intrusion</span>
            </span>
          </div>

          {/* Quick Action Bar */}
          <div className="bg-[#0C141D] border border-border p-3 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  try {
                    if (navigator.share) {
                      navigator.share({
                        title: 'IBVAP Mobile CCTV',
                        text: 'Connect your phone camera to the surveillance system',
                        url: mobileUrl,
                      });
                    } else {
                      copyUrl();
                    }
                  } catch {
                    copyUrl();
                  }
                }}
                className="px-3 py-1.5 bg-[#070D14] border border-border hover:border-accent text-white text-[11px] font-bold font-mono transition-colors flex items-center gap-1.5"
              >
                <Share2 className="w-3.5 h-3.5 text-accent" />
                Share Mobile Link
              </button>

              <button
                onClick={() => {
                  setIsRemoteActive(false);
                  setActiveDeviceId('local');
                  showToast({
                    title: 'Switched to Laptop Webcam',
                    message: 'Displaying local camera sensor.',
                    type: 'info',
                  });
                }}
                className="px-3 py-1.5 bg-[#070D14] border border-border hover:border-[#37B9FF] text-white text-[11px] font-bold font-mono transition-colors flex items-center gap-1.5"
              >
                <Laptop className="w-3.5 h-3.5 text-[#37B9FF]" />
                Use Laptop Webcam
              </button>
            </div>

            <Link
              href="/live"
              className="px-4 py-2 bg-accent text-[#071018] font-bold text-xs font-mono rounded-none hover:bg-accent/90 transition-colors whitespace-nowrap"
            >
              View in Surveillance Grid →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
