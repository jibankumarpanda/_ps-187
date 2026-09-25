"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Camera,
  RefreshCw,
  FlipHorizontal,
  Wifi,
  WifiOff,
  Battery,
  Maximize,
  AlertTriangle,
  Radio,
  CheckCircle2,
  Shield,
  Zap,
} from 'lucide-react';

export default function MobileStreamPage() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const frameIntervalRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [streamActive, setStreamActive] = useState(false);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [fps, setFps] = useState(0);
  const [resolution, setResolution] = useState('--');
  const [timeString, setTimeString] = useState('');
  const [transmissionStatus, setTransmissionStatus] = useState<'connecting' | 'transmitting' | 'disconnected'>('connecting');
  const [batteryLevel, setBatteryLevel] = useState<number | null>(null);
  const [framesSent, setFramesSent] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [torchOn, setTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [speedMode, setSpeedMode] = useState<'ultra' | 'balanced' | 'hd'>('ultra');
  const isEncodingRef = useRef(false);

  // Military UTC clock
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const h = String(now.getHours()).padStart(2, '0');
      const m = String(now.getMinutes()).padStart(2, '0');
      const s = String(now.getSeconds()).padStart(2, '0');
      const ms = String(now.getMilliseconds()).padStart(3, '0');
      setTimeString(`${h}:${m}:${s}.${ms}`);
    }, 50);
    return () => clearInterval(interval);
  }, []);

  // Battery API
  useEffect(() => {
    if (typeof navigator !== 'undefined' && 'getBattery' in navigator) {
      (navigator as any).getBattery().then((battery: any) => {
        setBatteryLevel(Math.round(battery.level * 100));
        battery.addEventListener('levelchange', () => {
          setBatteryLevel(Math.round(battery.level * 100));
          // Send updated battery to server
          if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(
              JSON.stringify({
                type: 'telemetry',
                device: { battery: Math.round(battery.level * 100) },
              })
            );
          }
        });
      }).catch(() => {});
    }
  }, []);

  // Auto-hide controls
  useEffect(() => {
    const timer = setTimeout(() => {
      if (streamActive) setShowControls(false);
    }, 4000);
    return () => clearTimeout(timer);
  }, [streamActive, showControls]);

  // Keep screen awake (WakeLock)
  useEffect(() => {
    let wakeLock: any = null;
    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLock = await (navigator as any).wakeLock.request('screen');
        }
      } catch {}
    };
    if (streamActive) requestWakeLock();
    return () => {
      if (wakeLock) wakeLock.release().catch(() => {});
    };
  }, [streamActive]);

  // Start Camera
  const startCamera = useCallback(async () => {
    setStreamError(null);
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setStreamError('Camera API unsupported or requires HTTPS.');
      return;
    }

    if (videoRef.current?.srcObject) {
      const old = videoRef.current.srcObject as MediaStream;
      old.getTracks().forEach((t) => t.stop());
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 },
        },
        audio: false,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().catch(console.error);
          const w = videoRef.current?.videoWidth || 1280;
          const h = videoRef.current?.videoHeight || 720;
          setResolution(`${w}x${h}`);
          setStreamActive(true);
        };
      }

      // Check for torch/flashlight support
      const track = stream.getVideoTracks()[0];
      const capabilities = track.getCapabilities?.() as any;
      if (capabilities?.torch) {
        setHasTorch(true);
      }
    } catch (err: any) {
      console.error('Camera access error:', err);
      if (err.name === 'NotAllowedError') {
        setStreamError('Camera permission denied. Tap the lock/info icon in Safari/Chrome address bar to allow.');
      } else {
        setStreamError(err.message || 'Could not access mobile camera.');
      }
      setStreamActive(false);
    }
  }, [facingMode]);

  useEffect(() => {
    startCamera();
    return () => {
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [startCamera]);

  // Connect WebSocket and Stream Frames to Desktop
  useEffect(() => {
    if (!streamActive) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/api/camera-stream`;

    let ws: WebSocket;
    let isCancelled = false;

    function connect() {
      ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        if (isCancelled) return;
        setTransmissionStatus('transmitting');

        // Detect device name
        const ua = navigator.userAgent;
        let deviceName = 'Mobile Device';
        let deviceType: 'iphone' | 'android' = 'android';
        if (/iPhone/i.test(ua)) {
          deviceName = 'iPhone CCTV Node';
          deviceType = 'iphone';
        } else if (/Android/i.test(ua)) {
          deviceName = 'Android CCTV Node';
          deviceType = 'android';
        }

        // Register as camera sender
        ws.send(
          JSON.stringify({
            type: 'register',
            role: 'sender',
            device: {
              name: deviceName,
              type: deviceType,
              battery: batteryLevel ?? 95,
              resolution,
              facingMode,
            },
          })
        );
      };

      ws.onclose = () => {
        if (isCancelled) return;
        setTransmissionStatus('disconnected');
        // Reconnect after 2 seconds
        setTimeout(connect, 2000);
      };

      ws.onerror = () => {
        if (isCancelled) return;
        setTransmissionStatus('disconnected');
      };
    }

    connect();

    // Frame capture & stream loop: Dynamic according to speedMode
    const config = {
      ultra: { width: 480, height: 270, quality: 0.42, interval: 32 }, // ~31 FPS, sub-50ms latency
      balanced: { width: 640, height: 360, quality: 0.50, interval: 38 }, // ~26 FPS
      hd: { width: 854, height: 480, quality: 0.65, interval: 50 }, // ~20 FPS
    }[speedMode];

    const canvas = document.createElement('canvas');
    canvas.width = config.width;
    canvas.height = config.height;
    const ctx = canvas.getContext('2d', { alpha: false });

    let count = 0;
    let lastFpsTime = performance.now();
    let sentInSec = 0;

    frameIntervalRef.current = setInterval(() => {
      const video = videoRef.current;
      if (!video || video.readyState < 2 || !ctx) return;
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

      // CRITICAL FOR ZERO LATENCY / REAL-TIME SPEED:
      // Drop frame if previous frame is still encoding OR network buffer is not empty!
      // This eliminates stale frame queues that cause slow camera movement.
      if (isEncodingRef.current) return;
      if (wsRef.current.bufferedAmount > 0) return;

      isEncodingRef.current = true;

      // Draw downscaled frame
      ctx.drawImage(video, 0, 0, config.width, config.height);

      // Convert to JPEG blob and send directly over WebSocket
      canvas.toBlob(
        (blob) => {
          isEncodingRef.current = false;
          if (blob && wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(blob);
            count++;
            sentInSec++;
            setFramesSent(count);

            const now = performance.now();
            if (now - lastFpsTime >= 1000) {
              setFps(sentInSec);
              sentInSec = 0;
              lastFpsTime = now;
            }
          }
        },
        'image/jpeg',
        config.quality
      );
    }, config.interval);

    return () => {
      isCancelled = true;
      if (frameIntervalRef.current) clearInterval(frameIntervalRef.current);
      if (ws) ws.close();
    };
  }, [streamActive, resolution, facingMode, batteryLevel, speedMode]);

  // Flip Camera
  const switchCamera = () => {
    setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
  };

  // Toggle Torch/Flashlight
  const toggleTorch = async () => {
    if (!videoRef.current?.srcObject) return;
    const stream = videoRef.current.srcObject as MediaStream;
    const track = stream.getVideoTracks()[0];
    try {
      const nextTorch = !torchOn;
      await (track as any).applyConstraints({
        advanced: [{ torch: nextTorch }],
      });
      setTorchOn(nextTorch);
    } catch (err) {
      console.warn('Torch not supported:', err);
    }
  };

  // Fullscreen
  const toggleFullscreen = () => {
    if (!document.fullscreenElement && containerRef.current) {
      containerRef.current.requestFullscreen().catch(() => {});
    } else if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
  };

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 bg-[#05080B] select-none touch-none overflow-hidden"
      onClick={() => setShowControls((prev) => !prev)}
    >
      {/* Live Video Viewport */}
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover"
        playsInline
        muted
        autoPlay
      />

      {/* Cyberpunk Scanlines */}
      <div
        className="absolute inset-0 pointer-events-none z-10"
        style={{
          background: `repeating-linear-gradient(
            0deg,
            transparent,
            transparent 3px,
            rgba(55, 185, 255, 0.03) 3px,
            rgba(55, 185, 255, 0.03) 4px
          )`,
        }}
      />

      {/* Camera Error State */}
      {!streamActive && (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-40 bg-[#070D14]">
          <div className="w-16 h-16 rounded-full bg-[#0C141D] border border-accent/40 flex items-center justify-center mb-4">
            {streamError ? (
              <AlertTriangle className="w-8 h-8 text-[#FF5C67]" />
            ) : (
              <Camera className="w-8 h-8 text-accent animate-pulse" />
            )}
          </div>
          <h2 className="text-base font-bold text-white font-mono mb-2">
            {streamError ? 'Camera Access Required' : 'Starting Camera Sensor...'}
          </h2>
          <p className="text-xs text-muted-foreground max-w-xs mb-6 font-mono">
            {streamError || 'Please allow camera permission when your browser prompts you.'}
          </p>
          <button
            onClick={(e) => {
              e.stopPropagation();
              startCamera();
            }}
            className="px-5 py-2.5 bg-accent text-[#071018] font-bold text-xs font-mono uppercase tracking-wider flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Allow Camera
          </button>
        </div>
      )}

      {/* TOP HUD BAR */}
      <div
        className={`absolute top-0 left-0 right-0 z-30 transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="bg-gradient-to-b from-black/85 via-black/50 to-transparent p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
            <span className="text-[11px] font-mono font-bold text-white uppercase tracking-wider">
              TRANSMITTING TO COMMAND
            </span>
          </div>

          <div className="flex items-center gap-2">
            {batteryLevel !== null && (
              <span className="text-[10px] font-mono bg-black/60 px-2 py-0.5 border border-white/10 text-green-400">
                {batteryLevel}%
              </span>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setSpeedMode((prev) => (prev === 'ultra' ? 'balanced' : prev === 'balanced' ? 'hd' : 'ultra'));
              }}
              className={`text-[10px] font-mono px-2 py-0.5 border font-bold flex items-center gap-1 transition-all ${
                speedMode === 'ultra'
                  ? 'bg-accent/25 text-accent border-accent animate-pulse'
                  : speedMode === 'balanced'
                  ? 'bg-blue-500/20 text-blue-400 border-blue-500/40'
                  : 'bg-purple-500/20 text-purple-400 border-purple-500/40'
              }`}
              title="Tap to change streaming speed/quality"
            >
              <Zap className="w-3 h-3" />
              {speedMode === 'ultra' ? '⚡ ULTRA FAST' : speedMode === 'balanced' ? 'BALANCED' : 'HD'}
            </button>
            <span className="text-[10px] font-mono bg-black/60 px-2 py-0.5 border border-white/10 text-accent font-bold">
              {fps} FPS
            </span>
            <span
              className={`text-[10px] font-mono px-2 py-0.5 border flex items-center gap-1 ${
                transmissionStatus === 'transmitting'
                  ? 'bg-green-500/20 text-green-400 border-green-500/40'
                  : 'bg-amber-500/20 text-amber-400 border-amber-500/40'
              }`}
            >
              <Radio className="w-3 h-3" />
              {transmissionStatus === 'transmitting' ? 'LINK LIVE' : 'SYNCING'}
            </span>
          </div>
        </div>
      </div>

      {/* Tactical Center Reticle */}
      {streamActive && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-20">
          <div className="relative w-48 h-48 border border-accent/20">
            <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-accent" />
            <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-accent" />
            <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-accent" />
            <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-accent" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-1.5 h-1.5 bg-accent/60 rounded-full" />
            </div>
          </div>
        </div>
      )}

      {/* BOTTOM CONTROLS BAR */}
      <div
        className={`absolute bottom-0 left-0 right-0 z-30 transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="bg-gradient-to-t from-black/85 via-black/50 to-transparent p-5 space-y-4">
          <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground">
            <span>{timeString}</span>
            <span className="text-white">
              {facingMode === 'environment' ? 'REAR SENSOR' : 'FRONT SENSOR'} • {resolution}
            </span>
            <span className="text-accent">{framesSent} FRAMES</span>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center justify-center gap-5">
            {/* Flip Camera */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                switchCamera();
              }}
              className="w-12 h-12 rounded-full bg-[#0C141D]/90 border border-border hover:border-accent text-white flex items-center justify-center active:scale-95 transition-all shadow-lg"
              title="Switch Front/Rear Camera"
            >
              <FlipHorizontal className="w-5 h-5 text-accent" />
            </button>

            {/* Flashlight/Torch if supported */}
            {hasTorch && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleTorch();
                }}
                className={`w-12 h-12 rounded-full border flex items-center justify-center active:scale-95 transition-all shadow-lg ${
                  torchOn
                    ? 'bg-amber-400 border-amber-400 text-black'
                    : 'bg-[#0C141D]/90 border-border text-white'
                }`}
                title="Toggle Flashlight"
              >
                <Zap className="w-5 h-5" />
              </button>
            )}

            {/* Reconnect */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                startCamera();
              }}
              className="w-14 h-14 rounded-full bg-accent text-[#071018] flex items-center justify-center active:scale-90 transition-all shadow-xl shadow-accent/20"
              title="Refresh Camera"
            >
              <RefreshCw className="w-6 h-6" />
            </button>

            {/* Fullscreen */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleFullscreen();
              }}
              className="w-12 h-12 rounded-full bg-[#0C141D]/90 border border-border hover:border-accent text-white flex items-center justify-center active:scale-95 transition-all shadow-lg"
              title="Fullscreen"
            >
              <Maximize className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
