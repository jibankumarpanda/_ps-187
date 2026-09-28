m\l "use client";

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
  User,
  Car,
  Eye,
  EyeOff,
} from 'lucide-react';

export default function MobileStreamPage() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
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
  const [unitId, setUnitId] = useState<string>('CAM_MOB_01');
  const [unitName, setUnitName] = useState<string>('Mobile Patrol Alpha');
  const isEncodingRef = useRef(false);

  // ──── Real-Time AI Detection State on Mobile ────
  const detectionsRef = useRef<Array<any>>([]);
  const origDimsRef = useRef<{ w: number; h: number }>({ w: 640, h: 360 });
  const isDetectingRef = useRef(false);
  const [personCount, setPersonCount] = useState(0);
  const [vehicleCount, setVehicleCount] = useState(0);
  const [showAiOverlay, setShowAiOverlay] = useState(true);
  const [isGathering, setIsGathering] = useState(false);
  const [aiStatus, setAiStatus] = useState<'standby' | 'active'>('active');

  // Initialize Unit ID and Name from URL or storage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const qId = params.get('camId');
    const qName = params.get('name');
    let savedId = '';
    try {
      savedId = localStorage.getItem('ibvap_mobile_cam_id') || '';
    } catch {}

    const resolvedId = qId || savedId || 'CAM_MOB_01';
    setUnitId(resolvedId);
    if (qName) {
      setUnitName(qName);
    } else if (resolvedId === 'CAM_MOB_02') {
      setUnitName('Mobile Recon Bravo');
    } else if (resolvedId === 'CAM_MOB_03') {
      setUnitName('Perimeter Mobile Charlie');
    }
  }, []);

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
        let deviceType: 'iphone' | 'android' = 'android';
        let deviceName = unitName;
        if (/iPhone/i.test(ua)) {
          deviceType = 'iphone';
          if (!deviceName.toLowerCase().includes('iphone')) deviceName = `iPhone - ${unitName}`;
        } else if (/Android/i.test(ua)) {
          deviceType = 'android';
          if (!deviceName.toLowerCase().includes('android')) deviceName = `Android - ${unitName}`;
        }

        // Register as camera sender with explicit unit ID
        ws.send(
          JSON.stringify({
            type: 'register',
            role: 'sender',
            deviceId: unitId,
            device: {
              id: unitId,
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
      ultra: { width: 640, height: 360, quality: 0.72, interval: 33 }, // ~30 FPS, native 640x360 YOLO input
      balanced: { width: 854, height: 480, quality: 0.78, interval: 40 }, // ~25 FPS
      hd: { width: 1280, height: 720, quality: 0.85, interval: 50 }, // ~20 FPS
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
  }, [streamActive, resolution, facingMode, batteryLevel, speedMode, unitId, unitName]);

  // ──── Decoupled Real-Time AI Inference Loop on Mobile ────
  useEffect(() => {
    if (!streamActive) return;

    let isMounted = true;
    const offscreen = document.createElement('canvas');
    const offCtx = offscreen.getContext('2d', { alpha: false });

    const detectInterval = setInterval(async () => {
      const video = videoRef.current;
      if (!video || video.readyState < 2 || !offCtx) return;
      if (isDetectingRef.current) return;

      isDetectingRef.current = true;
      try {
        const vW = video.videoWidth || 1280;
        const vH = video.videoHeight || 720;
        const targetW = 640;
        const targetH = Math.round((vH / vW) * targetW) || 360;

        offscreen.width = targetW;
        offscreen.height = targetH;
        offCtx.drawImage(video, 0, 0, targetW, targetH);

        const blob = await new Promise<Blob | null>((resolve) =>
          offscreen.toBlob(resolve, 'image/jpeg', 0.75)
        );
        if (!blob || !isMounted) return;

        const formData = new FormData();
        formData.append('file', blob, 'frame.jpg');

        const res = await fetch(`/api/ml/analyze-frame?camera_id=${encodeURIComponent(unitId)}`, {
          method: 'POST',
          body: formData,
        });

        if (res.ok && isMounted) {
          const data = await res.json();
          if (data && Array.isArray(data.detections)) {
            const vehicleClasses = new Set(['car', 'truck', 'bus', 'motorcycle', 'motorbike', 'bicycle', 'van', 'automobile', 'vehicle']);
            const personDets = data.detections.filter(
              (d: any) => String(d.class_name).toLowerCase() === 'person'
            );
            const vehicleDets = data.detections.filter(
              (d: any) => vehicleClasses.has(String(d.class_name).toLowerCase())
            );

            const pCount = personDets.length;
            const vCount = data.vehicle_count !== undefined ? data.vehicle_count : vehicleDets.length;
            const gathering = !!(data.is_gathering || pCount >= 2);

            const validTargets = data.detections.filter((d: any) => {
              const c = String(d.class_name).toLowerCase();
              return c === 'person' || vehicleClasses.has(c);
            });

            // Haptic feedback when a target is first detected
            if (validTargets.length > 0 && detectionsRef.current.length === 0) {
              try {
                if (typeof navigator !== 'undefined' && navigator.vibrate) {
                  navigator.vibrate(80);
                }
              } catch {}
            }

            origDimsRef.current = {
              w: data.frame_width || targetW,
              h: data.frame_height || targetH,
            };
            detectionsRef.current = validTargets;
            setPersonCount(pCount);
            setVehicleCount(vCount);
            setIsGathering(gathering);
            setAiStatus('active');

            // Send detection telemetry over WebSocket
            if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
              wsRef.current.send(
                JSON.stringify({
                  type: 'telemetry',
                  deviceId: unitId,
                  detections: {
                    personCount: pCount,
                    vehicleCount: vCount,
                    total: validTargets.length,
                    isGathering: gathering,
                  },
                })
              );
            }
          }
        }
      } catch (err) {
        console.warn('Mobile AI detection cycle notice:', err);
      } finally {
        isDetectingRef.current = false;
      }
    }, 220);

    return () => {
      isMounted = false;
      clearInterval(detectInterval);
    };
  }, [streamActive, unitId]);

  // ──── 60 FPS Tactical HUD Render Loop on Mobile Screen ────
  useEffect(() => {
    if (!streamActive) return;

    let animId: number;

    const render = () => {
      animId = requestAnimationFrame(render);
      const canvas = canvasRef.current;
      const video = videoRef.current;
      if (!canvas || !video || video.readyState < 2) return;

      if (canvas.width !== canvas.clientWidth || canvas.height !== canvas.clientHeight) {
        canvas.width = canvas.clientWidth;
        canvas.height = canvas.clientHeight;
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (!showAiOverlay) return;

      const vW = video.videoWidth || 1280;
      const vH = video.videoHeight || 720;
      const cW = canvas.width;
      const cH = canvas.height;

      // Exact object-cover alignment
      const scale = Math.max(cW / vW, cH / vH);
      const offsetX = (cW - vW * scale) / 2;
      const offsetY = (cH - vH * scale) / 2;

      const origW = origDimsRef.current.w || 640;
      const origH = origDimsRef.current.h || 360;

      const targets = detectionsRef.current;
      const vehicleClasses = new Set(['car', 'truck', 'bus', 'motorcycle', 'motorbike', 'bicycle', 'van', 'automobile', 'vehicle']);

      targets.forEach((tgt, index) => {
        const [bx1, by1, bx2, by2] = tgt.bbox;
        const normX1 = bx1 / origW;
        const normY1 = by1 / origH;
        const normX2 = bx2 / origW;
        const normY2 = by2 / origH;

        const x = normX1 * vW * scale + offsetX;
        const y = normY1 * vH * scale + offsetY;
        const w = (normX2 - normX1) * vW * scale;
        const h = (normY2 - normY1) * vH * scale;

        const cName = String(tgt.class_name).toLowerCase();
        const isPerson = cName === 'person';
        const confPercent = Math.round((tgt.confidence || 0.85) * 100);

        let color = '#37B9FF'; // Vibrant cyan for vehicles/cars
        let label = `VEHICLE • ${confPercent}%`;
        if (isPerson) {
          color = isGathering ? '#F59E0B' : '#39D98A'; // Amber if gathering, else green
          label = isGathering ? `GATHERING • ${confPercent}%` : `PERSON • ${confPercent}%`;
        } else if (cName === 'car') {
          label = `CAR • ${confPercent}%`;
        } else if (cName === 'truck') {
          label = `TRUCK • ${confPercent}%`;
        } else if (cName === 'bus') {
          label = `BUS • ${confPercent}%`;
        } else if (cName === 'motorcycle' || cName === 'motorbike') {
          label = `MOTORCYCLE • ${confPercent}%`;
        }

        // Bounding box fill
        ctx.fillStyle = isPerson
          ? 'rgba(57, 217, 138, 0.12)'
          : 'rgba(55, 185, 255, 0.12)';
        ctx.fillRect(x, y, w, h);

        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        ctx.strokeRect(x, y, w, h);

        // Tactical corner brackets
        const cLen = Math.min(16, w * 0.25, h * 0.25);
        ctx.lineWidth = 3;
        ctx.strokeStyle = color;

        // Top-left
        ctx.beginPath();
        ctx.moveTo(x, y + cLen);
        ctx.lineTo(x, y);
        ctx.lineTo(x + cLen, y);
        ctx.stroke();

        // Top-right
        ctx.beginPath();
        ctx.moveTo(x + w - cLen, y);
        ctx.lineTo(x + w, y);
        ctx.lineTo(x + w, y + cLen);
        ctx.stroke();

        // Bottom-left
        ctx.beginPath();
        ctx.moveTo(x, y + h - cLen);
        ctx.lineTo(x, y + h);
        ctx.lineTo(x + cLen, y + h);
        ctx.stroke();

        // Bottom-right
        ctx.beginPath();
        ctx.moveTo(x + w - cLen, y + h);
        ctx.lineTo(x + w, y + h);
        ctx.lineTo(x + w, y + h - cLen);
        ctx.stroke();

        // Center reticle dot
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x + w / 2, y + h / 2, 2.5, 0, Math.PI * 2);
        ctx.fill();

        // Top label badge
        ctx.font = 'bold 11px monospace';
        const textW = ctx.measureText(label).width;
        ctx.fillStyle = color;
        ctx.fillRect(x, Math.max(0, y - 18), textW + 8, 18);
        ctx.fillStyle = '#05080B';
        ctx.fillText(label, x + 4, Math.max(13, y - 5));

        // Bottom target ID
        const subId = `TGT-${String(index + 1).padStart(2, '0')}`;
        ctx.font = '9px monospace';
        const subW = ctx.measureText(subId).width;
        ctx.fillStyle = 'rgba(5, 8, 11, 0.85)';
        ctx.fillRect(x, y + h, subW + 6, 14);
        ctx.fillStyle = color;
        ctx.fillText(subId, x + 3, y + h + 10);
      });
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [streamActive, showAiOverlay, isGathering]);

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

      {/* Real-time AI HUD Overlay Canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none z-20"
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
              {unitId}
            </span>
            <span className="text-[10px] font-mono text-accent hidden sm:inline">
              {'//'} {unitName}
            </span>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap justify-end">
            {/* Real-time Detection class counts on phone screen */}
            <div className="flex items-center gap-1.5 bg-black/60 border border-white/10 px-2 py-0.5">
              <span className="text-[10px] font-mono text-[#39D98A] font-bold flex items-center gap-1" title="Humans Detected">
                <User className="w-3 h-3" />
                {personCount}
              </span>
              <span className="text-white/30">•</span>
              <span className="text-[10px] font-mono text-[#37B9FF] font-bold flex items-center gap-1" title="Vehicles Detected">
                <Car className="w-3 h-3" />
                {vehicleCount}
              </span>
            </div>

            {/* Toggle AI HUD */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowAiOverlay((prev) => !prev);
              }}
              className={`text-[10px] font-mono px-2 py-0.5 border font-bold flex items-center gap-1 transition-all ${
                showAiOverlay
                  ? 'bg-[#37B9FF]/25 text-[#37B9FF] border-[#37B9FF]'
                  : 'bg-black/60 text-muted-foreground border-white/10'
              }`}
              title="Toggle AI HUD detection boxes"
            >
              {showAiOverlay ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
              <span className="hidden sm:inline">AI HUD</span>
            </button>

            {/* Unit ID Selector */}
            <div className="bg-black/60 border border-accent/40 px-1.5 py-0.5 flex items-center gap-1">
              <span className="text-[9px] font-mono text-muted-foreground uppercase">NODE:</span>
              <select
                value={unitId}
                onChange={(e) => {
                  const newId = e.target.value;
                  setUnitId(newId);
                  const newName =
                    newId === 'CAM_MOB_01'
                      ? 'Mobile Patrol Alpha'
                      : newId === 'CAM_MOB_02'
                      ? 'Mobile Recon Bravo'
                      : 'Perimeter Mobile Charlie';
                  setUnitName(newName);
                  try {
                    localStorage.setItem('ibvap_mobile_cam_id', newId);
                  } catch {}
                  if (wsRef.current) wsRef.current.close();
                }}
                className="bg-transparent text-[10px] font-mono text-accent font-bold outline-none cursor-pointer"
              >
                <option value="CAM_MOB_01" className="bg-[#0C141D] text-white">Unit 1 (CAM_MOB_01)</option>
                <option value="CAM_MOB_02" className="bg-[#0C141D] text-white">Unit 2 (CAM_MOB_02)</option>
                <option value="CAM_MOB_03" className="bg-[#0C141D] text-white">Unit 3 (CAM_MOB_03)</option>
              </select>
            </div>
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
              {speedMode === 'ultra' ? '⚡ ULTRA' : speedMode === 'balanced' ? 'BALANCED' : 'HD'}
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
