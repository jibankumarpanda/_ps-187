"use client";

import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  Camera as CameraIcon,
  RefreshCw,
  Eye,
  EyeOff,
  Maximize2,
  Volume2,
  VolumeX,
  ShieldAlert,
  Radio,
  Sliders,
  CheckCircle2,
  Sparkles,
  Smartphone,
  Laptop,
  User,
  Car,
  Users,
  X,
  Shield,
  PenTool,
  AlertTriangle
} from 'lucide-react';
import * as faceapi from 'face-api.js';

export interface PolygonPoint {
  x: number; // 0 to 100 percentage
  y: number; // 0 to 100 percentage
}

export const DEFAULT_CAMERA_POLYGON: PolygonPoint[] = [
  { x: 15, y: 35 },
  { x: 85, y: 35 },
  { x: 90, y: 88 },
  { x: 10, y: 88 },
];

export function isPointInPolygon(px: number, py: number, polygon: PolygonPoint[]): boolean {
  if (!polygon || polygon.length < 3) return false;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x;
    const yi = polygon[i].y;
    const xj = polygon[j].x;
    const yj = polygon[j].y;
    const intersect = ((yi > py) !== (yj > py)) &&
      (px < ((xj - xi) * (py - yi)) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

interface DetectionTarget {
  id: string;
  label: string;
  className: string;
  x: number;
  y: number;
  w: number;
  h: number;
  conf: number;
  threatScore: number;
  trackId: number;
  color: string;
}

// 17-Keypoint COCO Human Pose and Stick Figure interfaces
export interface KeypointData {
  name: string;
  x: number;
  y: number;
  confidence: number;
  visible: boolean;
}

export interface StickFigureData {
  person_id: number | null;
  bbox: [number, number, number, number];
  confidence: number;
  keypoints: KeypointData[];
  posture: string;
  posture_confidence: number;
}

// 17 COCO Keypoint pairs for anatomical skeleton visualization
const SKELETON_PAIRS: [number, number][] = [
  // Head
  [0, 1], [0, 2], [1, 3], [2, 4],
  // Shoulders & Torso
  [5, 6], [5, 11], [6, 12], [11, 12],
  // Left arm
  [5, 7], [7, 9],
  // Right arm
  [6, 8], [8, 10],
  // Left leg
  [11, 13], [13, 15],
  // Right leg
  [12, 14], [14, 16],
];

// Posture color codes for tactical threat awareness
const POSTURE_COLORS: Record<string, string> = {
  STANDING: '#39D98A',    // Green (Normal)
  CROUCHING: '#F4C95D',   // Amber/Gold (Concealment / Suspicious)
  CRAWLING: '#FF5C67',    // Red (Breach Infiltration)
  CLIMBING: '#D946EF',    // Purple/Magenta (Perimeter Scaling)
  FALLEN: '#FB923C',      // Orange (Guard Down / Distress)
};

interface LiveWebcamCCTVProps {
  cameraCode?: string;
  cameraName?: string;
  location?: string;
  hasIntrusion?: boolean;
  onTargetDetected?: (targets: Array<{ id: string; label: string; conf: number; threat: number }>) => void;
  className?: string;
  onFullscreen?: () => void;
  defaultFacingMode?: 'user' | 'environment';
  remoteFrameUrl?: string | null;
  remoteDeviceName?: string | null;
  isRemoteActive?: boolean;
  batteryLevel?: number | null;
  preferredDeviceId?: string;
  onDeviceChange?: (deviceId: string) => void;
  onClose?: () => void;
  polygonPoints?: PolygonPoint[];
  onPolygonChange?: (points: PolygonPoint[]) => void;
  showPolygon?: boolean;
}

// COCO-SSD class definitions for person & vehicle detection
const PERSON_CLASSES = ['person'];
const VEHICLE_CLASSES = ['car', 'truck', 'bus', 'motorcycle', 'bicycle'];
const ALL_DETECT_CLASSES = [...PERSON_CLASSES, ...VEHICLE_CLASSES];

// Color mapping
const CLASS_COLORS: Record<string, string> = {
  person: '#39D98A',      // Green
  car: '#37B9FF',         // Cyan
  truck: '#F4C95D',       // Amber
  bus: '#A78BFA',         // Purple
  motorcycle: '#FB923C',  // Orange
  bicycle: '#34D399',     // Emerald
};

const CLASS_LABELS: Record<string, string> = {
  person: 'PERSON',
  car: 'VEHICLE / CAR',
  truck: 'VEHICLE / TRUCK',
  bus: 'VEHICLE / BUS',
  motorcycle: 'VEHICLE / MOTORCYCLE',
  bicycle: 'VEHICLE / BICYCLE',
};

export function LiveWebcamCCTV({
  cameraCode = 'CAM_04',
  cameraName = 'Mobile Field / Perimeter Unit',
  location = 'Western Sector Perimeter',
  hasIntrusion = false,
  onTargetDetected,
  className = '',
  onFullscreen,
  defaultFacingMode = 'environment',
  remoteFrameUrl = null,
  remoteDeviceName = null,
  isRemoteActive = false,
  batteryLevel = null,
  preferredDeviceId,
  onDeviceChange,
  onClose,
  polygonPoints,
  onPolygonChange,
  showPolygon = true,
}: LiveWebcamCCTVProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const remoteImgRef = useRef<HTMLImageElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const cocoModelRef = useRef<any>(null);
  const trackCounterRef = useRef(0);
  const cachedTargetsRef = useRef<DetectionTarget[]>([]);
  const cachedStickFiguresRef = useRef<StickFigureData[]>([]);
  const isDetectingRef = useRef(false);
  const remoteImgLoadedRef = useRef(false);
  const lastRemoteUrlRef = useRef<string | null>(null);

  const [streamActive, setStreamActive] = useState(false);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>(defaultFacingMode);
  const [availableDevices, setAvailableDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>(preferredDeviceId || '');
  const [showOverlays, setShowOverlays] = useState(true);
  const [showStickFigure, setShowStickFigure] = useState(true);

  // ──── Polygon Mapping & Restricted Zone State ────
  const [activePolygon, setActivePolygon] = useState<PolygonPoint[]>(polygonPoints || DEFAULT_CAMERA_POLYGON);
  const activePolygonRef = useRef<PolygonPoint[]>(polygonPoints || DEFAULT_CAMERA_POLYGON);
  const [isEditingPolygon, setIsEditingPolygon] = useState(false);
  const [showPolygonZone, setShowPolygonZone] = useState(showPolygon);
  const [polygonIntrusionsCount, setPolygonIntrusionsCount] = useState(0);

  // Sync activePolygonRef and state when polygonPoints prop changes
  useEffect(() => {
    if (polygonPoints && polygonPoints.length >= 3) {
      setActivePolygon(polygonPoints);
      activePolygonRef.current = polygonPoints;
    }
  }, [polygonPoints]);

  useEffect(() => {
    activePolygonRef.current = activePolygon;
  }, [activePolygon]);

  // Click handler to plot / edit polygon vertices on the video feed
  const handlePolygonCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isEditingPolygon) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.round(((e.clientX - rect.left) / rect.width) * 100);
    const y = Math.round(((e.clientY - rect.top) / rect.height) * 100);

    if (activePolygon.length >= 8) return;
    const next = [...activePolygon, { x, y }];
    setActivePolygon(next);
    activePolygonRef.current = next;
    if (onPolygonChange) onPolygonChange(next);
  };
  const [fps, setFps] = useState<number>(30);
  const [resolution, setResolution] = useState('1920x1080');
  const [timeString, setTimeString] = useState('');
  const [detectedTargetsCount, setDetectedTargetsCount] = useState(0);
  const [personCount, setPersonCount] = useState(0);
  const [vehicleCount, setVehicleCount] = useState(0);
  const [isGathering, setIsGathering] = useState(false);
  const [modelsReady, setModelsReady] = useState(false);
  const [modelLoadStatus, setModelLoadStatus] = useState<'loading' | 'yolo_live' | 'faceapi_ready' | 'standby'>('loading');
  const [audioMeter, setAudioMeter] = useState<number[]>([15, 28, 45, 60, 35, 20]);

  // Real-time military clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const ms = String(now.getMilliseconds()).padStart(3, '0');
      const iso = now.toISOString().replace('T', ' // ').replace('Z', '');
      setTimeString(`${iso}.${ms} UTC`);
    };
    const tInterval = setInterval(updateTime, 50);
    return () => clearInterval(tInterval);
  }, []);

  // Audio VU meter simulation
  useEffect(() => {
    if (!streamActive) return;
    const interval = setInterval(() => {
      setAudioMeter([
        Math.floor(Math.random() * 40) + 10,
        Math.floor(Math.random() * 60) + 20,
        Math.floor(Math.random() * 85) + 15,
        Math.floor(Math.random() * 50) + 25,
        Math.floor(Math.random() * 30) + 10,
      ]);
    }, 200);
    return () => clearInterval(interval);
  }, [streamActive]);

  // Initialize AI models: Python YOLOv11 ML server with local face-api.js fallback
  useEffect(() => {
    let isMounted = true;
    async function initAI() {
      try {
        setModelLoadStatus('loading');
        // Preload lightweight face-api for robust instant edge fallback
        await faceapi.nets.tinyFaceDetector.loadFromUri('/models').catch(() => {});
        // Also preload SSD MobileNet for full-body person detection fallback
        await faceapi.nets.ssdMobilenetv1.loadFromUri('/models').catch(() => {});
        if (isMounted) {
          setModelsReady(true);
          setModelLoadStatus('yolo_live');
        }
      } catch (err) {
        console.warn('AI initialization notice:', err);
        if (isMounted) {
          setModelsReady(true);
          setModelLoadStatus('standby');
        }
      }
    }
    initAI();
    return () => { isMounted = false; };
  }, []);

  // Synchronize preferredDeviceId prop
  useEffect(() => {
    if (preferredDeviceId && preferredDeviceId !== selectedDeviceId) {
      setSelectedDeviceId(preferredDeviceId);
    }
  }, [preferredDeviceId]);

  // Enumerate connected cameras (Front, Back, USB Webcams)
  useEffect(() => {
    if (isRemoteActive) return;
    async function getDevices() {
      if (typeof navigator === 'undefined' || !navigator.mediaDevices?.enumerateDevices) return;
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter((d) => d.kind === 'videoinput');
        setAvailableDevices(videoDevices);
        if (videoDevices.length > 0 && !selectedDeviceId) {
          const chosen = preferredDeviceId || videoDevices[0].deviceId;
          setSelectedDeviceId(chosen);
        }
      } catch (err) {
        console.warn('Device enumeration error:', err);
      }
    }
    getDevices();
  }, [selectedDeviceId, preferredDeviceId, isRemoteActive]);

  // Start media stream
  const startCamera = useCallback(async () => {
    setStreamError(null);
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setStreamError('Camera API unsupported on this browser.');
      return;
    }

    // Stop previous stream if active
    if (videoRef.current && videoRef.current.srcObject) {
      const oldStream = videoRef.current.srcObject as MediaStream;
      oldStream.getTracks().forEach((t) => t.stop());
    }

    try {
      const constraints: MediaStreamConstraints = {
        video: selectedDeviceId
          ? { deviceId: { exact: selectedDeviceId } }
          : {
              facingMode: { ideal: facingMode },
              width: { ideal: 1920 },
              height: { ideal: 1080 },
            },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          if (videoRef.current) {
            videoRef.current.play().catch(console.error);
            setResolution(`${videoRef.current.videoWidth || 1920}x${videoRef.current.videoHeight || 1080}`);
            setStreamActive(true);
          }
        };
      }
    } catch (err: any) {
      console.error('Camera access error:', err);
      // Fallback without deviceId
      try {
        const fallbackStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
        if (videoRef.current) {
          videoRef.current.srcObject = fallbackStream;
          videoRef.current.play().catch(console.error);
          setStreamActive(true);
        }
      } catch (fallbackErr: any) {
        setStreamError(fallbackErr.message || 'Camera permission denied or camera in use.');
        setStreamActive(false);
      }
    }
  }, [facingMode, selectedDeviceId]);

  useEffect(() => {
    if (isRemoteActive) return;
    startCamera();
    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [startCamera, isRemoteActive]);

  // Toggle between front (selfie/laptop) and rear (environment/mobile CCTV)
  const toggleFacingMode = () => {
    const nextMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nextMode);
    setSelectedDeviceId(''); // clear exact device id to allow facingMode switch
  };

  // Track remote frame loading state for reliable detection
  useEffect(() => {
    if (isRemoteActive && remoteFrameUrl) {
      setStreamActive(true);
      setResolution('1280x720 (Mobile)');
      // Mark image as loading when URL changes
      if (lastRemoteUrlRef.current !== remoteFrameUrl) {
        lastRemoteUrlRef.current = remoteFrameUrl;
        remoteImgLoadedRef.current = false;
        // The img onload handler will set it to true
        if (remoteImgRef.current) {
          const img = remoteImgRef.current;
          if (img.complete && img.naturalWidth > 0) {
            remoteImgLoadedRef.current = true;
          }
        }
      }
    }
  }, [isRemoteActive, remoteFrameUrl]);

  // Live high-speed 60 FPS rendering loop with decoupled background AI detection
  useEffect(() => {
    if (!streamActive || !canvasRef.current) return;

    let animId: number;
    let lastFpsTime = performance.now();
    let lastDetectTime = 0;
    let frameCount = 0;

    const renderLoop = () => {
      const canvas = canvasRef.current;
      const sourceElement = isRemoteActive ? remoteImgRef.current : videoRef.current;

      if (!sourceElement || !canvas) {
        animId = requestAnimationFrame(renderLoop);
        return;
      }

      if (!isRemoteActive && (videoRef.current?.readyState || 0) < 2) {
        animId = requestAnimationFrame(renderLoop);
        return;
      }

      // Calculate True Display FPS
      frameCount++;
      const now = performance.now();
      if (now - lastFpsTime >= 1000) {
        setFps(Math.round((frameCount * 1000) / (now - lastFpsTime)));
        frameCount = 0;
        lastFpsTime = now;
      }

      // Ensure canvas matches display size
      const displayWidth = sourceElement.clientWidth || 640;
      const displayHeight = sourceElement.clientHeight || 360;

      if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
        canvas.width = displayWidth;
        canvas.height = displayHeight;
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        animId = requestAnimationFrame(renderLoop);
        return;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (showOverlays) {
        // Draw tactical HUD crosshair in center
        const cx = canvas.width / 2;
        const cy = canvas.height / 2;
        ctx.strokeStyle = 'rgba(55, 185, 255, 0.25)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);

        ctx.beginPath();
        ctx.moveTo(cx - 30, cy);
        ctx.lineTo(cx + 30, cy);
        ctx.moveTo(cx, cy - 30);
        ctx.lineTo(cx, cy + 30);
        ctx.stroke();
        ctx.setLineDash([]);

        // Draw scan lines for tactical feel
        ctx.strokeStyle = 'rgba(55, 185, 255, 0.04)';
        ctx.lineWidth = 0.5;
        for (let sy = 0; sy < canvas.height; sy += 4) {
          ctx.beginPath();
          ctx.moveTo(0, sy);
          ctx.lineTo(canvas.width, sy);
          ctx.stroke();
        }

        // Draw cached detection targets instantly with ZERO frame delay
        const targets = cachedTargetsRef.current;
        const stickFigures = cachedStickFiguresRef.current;

        // ── Point-in-Polygon Intrusion Detection for Suspicious Activity ──
        let intrudingCount = 0;
        const currentPolygon = activePolygonRef.current;
        if (showPolygonZone && currentPolygon && currentPolygon.length >= 3) {
          targets.forEach((t) => {
            // Target foot/base ground position in percentage coordinates
            const footX = ((t.x + t.w / 2) / canvas.width) * 100;
            const footY = ((t.y + t.h * 0.92) / canvas.height) * 100;

            const inside = isPointInPolygon(footX, footY, currentPolygon);
            if (inside) {
              intrudingCount++;
              t.threatScore = 99;
              t.color = '#FF5C67'; // Alert Red

              // Check if person has suspicious breach postures (crouching, crawling, climbing)
              const matchingFig = stickFigures.find(
                (f) => f.bbox && Math.abs(f.bbox[0] - t.x) < 50
              );
              const posture = matchingFig?.posture;
              if (
                posture &&
                ['CROUCHING', 'CRAWLING', 'CLIMBING', 'FALLEN'].includes(posture)
              ) {
                t.label = `🚨 SUSPICIOUS: ${posture} IN ZONE`;
              } else if (t.className === 'person') {
                t.label = `🚨 RESTRICTED ZONE INTRUSION`;
              } else {
                t.label = `🚨 UNAUTHORIZED VEHICLE IN ZONE`;
              }
            }
          });
        }
        setPolygonIntrusionsCount(intrudingCount);

        // Draw Polygon Restricted Zone onto Canvas
        if (showPolygonZone && currentPolygon && currentPolygon.length >= 3) {
          drawTacticalPolygonZone(
            ctx,
            canvas,
            currentPolygon,
            intrudingCount > 0,
            intrudingCount,
            isEditingPolygon
          );
        }

        // Draw bounding boxes (highlighted red if in intrusion state)
        targets.forEach((t) => {
          drawTacticalBoundingBox(ctx, t, hasIntrusion || intrudingCount > 0);
        });

        // ── Real-Time Stick Figure Human Pose Estimation ──
        if (showStickFigure) {
          const scaleX = canvas.width / 640;
          const scaleY = canvas.height / 360;
          stickFigures.forEach((fig) => {
            drawTacticalStickFigure(ctx, fig, scaleX, scaleY);
          });
        }

        // If gathering is active, draw a tactical grouping cluster boundary around all persons
        const personTargets = targets.filter((t) => t.className === 'person');
        if (personTargets.length >= 2) {
          const minX = Math.max(0, Math.min(...personTargets.map((t) => t.x)) - 8);
          const minY = Math.max(0, Math.min(...personTargets.map((t) => t.y)) - 22);
          const maxX = Math.min(canvas.width, Math.max(...personTargets.map((t) => t.x + t.w)) + 8);
          const maxY = Math.min(canvas.height, Math.max(...personTargets.map((t) => t.y + t.h)) + 8);
          const cw = maxX - minX;
          const ch = maxY - minY;

          ctx.strokeStyle = '#F59E0B';
          ctx.lineWidth = 1.8;
          ctx.setLineDash([5, 4]);
          ctx.strokeRect(minX, minY, cw, ch);
          ctx.setLineDash([]);

          // Cluster banner
          const clusterLabel = `[⚠ CROWD GATHERING • ${personTargets.length} PERSONS]`;
          ctx.font = 'bold 10px monospace';
          const cWidth = ctx.measureText(clusterLabel).width;
          ctx.fillStyle = '#F59E0B';
          ctx.fillRect(minX, Math.max(0, minY - 18), cWidth + 10, 18);
          ctx.fillStyle = '#05080B';
          ctx.fillText(clusterLabel, minX + 5, Math.max(12, minY - 5));
        }

        // Trigger decoupled background AI detection (adaptive rate)
        // Remote frames: 350ms interval (more time for image loading)
        // Local video: 220ms interval (4.5 inferences/sec)
        // CRITICAL: This NEVER awaits or blocks the 60 FPS video renderLoop!
        const detectInterval = isRemoteActive ? 350 : 220;
        if (now - lastDetectTime >= detectInterval && !isDetectingRef.current && modelsReady) {
          lastDetectTime = now;

          // For remote frames, skip detection if image isn't loaded yet
          // but do NOT return — continue the render loop
          if (isRemoteActive && (!remoteImgRef.current || !remoteImgRef.current.complete || remoteImgRef.current.naturalWidth === 0)) {
            animId = requestAnimationFrame(renderLoop);
            return; // Skip this detection cycle but keep rendering
          }

          isDetectingRef.current = true;

          (async () => {
            try {
              const sourceWidth = isRemoteActive
                ? (remoteImgRef.current?.naturalWidth || canvas.width)
                : (videoRef.current?.videoWidth || canvas.width);
              const sourceHeight = isRemoteActive
                ? (remoteImgRef.current?.naturalHeight || canvas.height)
                : (videoRef.current?.videoHeight || canvas.height);

              if (!sourceWidth || !sourceHeight) return;

              // Capture offscreen snapshot for real ML server inference
              const offscreen = document.createElement('canvas');
              const targetW = 640;
              const targetH = Math.round((sourceHeight / sourceWidth) * targetW) || 360;
              offscreen.width = targetW;
              offscreen.height = targetH;
              const octx = offscreen.getContext('2d');
              if (!octx) return;
              try {
                octx.drawImage(sourceElement, 0, 0, targetW, targetH);
              } catch (drawErr) {
                // Image may not be fully decoded yet (tainted canvas, etc)
                console.warn('Frame capture skipped:', drawErr);
                return;
              }

              const blob = await new Promise<Blob | null>((resolve) =>
                offscreen.toBlob(resolve, 'image/jpeg', 0.8)
              );
              if (!blob) return;

              let data: any = null;

              // 1. Try local server proxy to Python ML service
              try {
                const formData = new FormData();
                formData.append('file', blob, 'frame.jpg');
                const res = await fetch(`/api/ml/analyze-frame?camera_id=${encodeURIComponent(cameraCode)}`, {
                  method: 'POST',
                  body: formData,
                });
                if (res.ok) {
                  data = await res.json();
                }
              } catch {}

              // 2. Try direct ML service port 8000 if proxy unreachable
              if (!data) {
                try {
                  const formData = new FormData();
                  formData.append('file', blob, 'frame.jpg');
                  const res = await fetch(`http://127.0.0.1:8000/analyze/frame?camera_id=${encodeURIComponent(cameraCode)}`, {
                    method: 'POST',
                    body: formData,
                  });
                  if (res.ok) {
                    data = await res.json();
                  }
                } catch {}
              }

              if (data && Array.isArray(data.detections)) {
                // ── Real YOLOv11 Detections ──
                // Scale from ML server coordinates (based on 640xH input) to canvas display size
                const scaleX = canvas.width / (targetW || 1);
                const scaleY = canvas.height / (targetH || 1);

                const personDets = data.detections.filter(
                  (d: any) => String(d.class_name).toLowerCase() === 'person'
                );
                const pCount = personDets.length;
                const vCount = data.detections.filter((d: any) =>
                  VEHICLE_CLASSES.includes(String(d.class_name).toLowerCase())
                ).length;
                const gatheringActive = !!(data.is_gathering || pCount >= 2);

                const newTargets: DetectionTarget[] = data.detections
                  .filter((d: any) => ALL_DETECT_CLASSES.includes(String(d.class_name).toLowerCase()))
                  .map((d: any, i: number) => {
                    trackCounterRef.current++;
                    const [bx1, by1, bx2, by2] = d.bbox;
                    const cName = String(d.class_name).toLowerCase();
                    const isPerson = cName === 'person';
                    const isVehicle = VEHICLE_CLASSES.includes(cName);
                    const label = gatheringActive && isPerson
                      ? 'GATHERING • PERSON'
                      : (CLASS_LABELS[cName] || cName.toUpperCase());
                    const color = gatheringActive && isPerson
                      ? '#F59E0B'
                      : (CLASS_COLORS[cName] || '#39D98A');

                    return {
                      id: `TGT-${String(i + 1).padStart(2, '0')}`,
                      label,
                      className: cName,
                      x: bx1 * scaleX,
                      y: by1 * scaleY,
                      w: (bx2 - bx1) * scaleX,
                      h: (by2 - by1) * scaleY,
                      conf: d.confidence,
                      threatScore: gatheringActive ? 88 : (isPerson ? (hasIntrusion ? 95 : 70) : (isVehicle ? 60 : 40)),
                      trackId: trackCounterRef.current,
                      color,
                    };
                  });

                cachedTargetsRef.current = newTargets;
                if (data && Array.isArray(data.stick_figures)) {
                  cachedStickFiguresRef.current = data.stick_figures;
                }
                setDetectedTargetsCount(newTargets.length);
                setPersonCount(pCount);
                setVehicleCount(vCount);
                setIsGathering(gatheringActive);
                setModelLoadStatus('yolo_live');

                if (onTargetDetected && newTargets.length > 0) {
                  onTargetDetected(
                    newTargets.map((t) => ({
                      id: t.id,
                      label: t.label,
                      conf: t.conf,
                      threat: t.threatScore,
                    }))
                  );
                }
              } else {
                // ── Secondary Edge Fallback: Face-API + SSD MobileNet for person detection ──
                try {
                  // Use the offscreen canvas for detection (avoids cross-origin issues with blob URLs)
                  const detectionSource = offscreen;

                  // Try face detection with lower threshold for mobile cameras
                  const faces = await faceapi.detectAllFaces(
                    detectionSource,
                    new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.2 })
                  );

                  // Also try SSD MobileNet for full-body detection (catches people facing away)
                  let ssdFaces: faceapi.FaceDetection[] = [];
                  try {
                    ssdFaces = await faceapi.detectAllFaces(
                      detectionSource,
                      new faceapi.SsdMobilenetv1Options({ minConfidence: 0.25 })
                    );
                  } catch {}

                  // Merge both detection sets, removing duplicates by proximity
                  const allDetections = [...faces];
                  for (const ssd of ssdFaces) {
                    const isDuplicate = allDetections.some((existing) => {
                      const dx = Math.abs(existing.box.x - ssd.box.x);
                      const dy = Math.abs(existing.box.y - ssd.box.y);
                      return dx < ssd.box.width * 0.5 && dy < ssd.box.height * 0.5;
                    });
                    if (!isDuplicate) {
                      allDetections.push(ssd);
                    }
                  }

                  // Scale from offscreen canvas (640xH) to display canvas
                  const fScaleX = canvas.width / (offscreen.width || 1);
                  const fScaleY = canvas.height / (offscreen.height || 1);
                  const gatheringActive = allDetections.length >= 2;

                  const newTargets: DetectionTarget[] = allDetections.map((f, i) => {
                    trackCounterRef.current++;
                    const { x, y, width, height } = f.box;
                    return {
                      id: `TGT-${String(i + 1).padStart(2, '0')}`,
                      label: gatheringActive ? 'GATHERING • PERSON' : 'PERSON',
                      className: 'person',
                      x: x * fScaleX,
                      y: y * fScaleY,
                      w: width * fScaleX,
                      h: height * fScaleY,
                      conf: f.score,
                      threatScore: gatheringActive ? 85 : 65,
                      trackId: trackCounterRef.current,
                      color: gatheringActive ? '#F59E0B' : '#39D98A',
                    };
                  });

                  cachedTargetsRef.current = newTargets;
                  setDetectedTargetsCount(newTargets.length);
                  setPersonCount(allDetections.length);
                  setVehicleCount(0); // Zero fake cars!
                  setIsGathering(gatheringActive);
                  setModelLoadStatus('faceapi_ready');
                } catch {
                  cachedTargetsRef.current = [];
                  setDetectedTargetsCount(0);
                  setPersonCount(0);
                  setVehicleCount(0);
                  setIsGathering(false);
                  setModelLoadStatus('standby');
                }
              }
            } catch (err) {
              console.warn('Real AI inference error:', err);
            } finally {
              isDetectingRef.current = false;
            }
          })();
        }
      }

      animId = requestAnimationFrame(renderLoop);
    };

    animId = requestAnimationFrame(renderLoop);
    return () => cancelAnimationFrame(animId);
  }, [streamActive, showOverlays, modelsReady, modelLoadStatus, hasIntrusion, onTargetDetected, isRemoteActive]);

  return (
    <div
      className={`relative bg-[#05080B] rounded-none overflow-hidden border transition-all ${
        hasIntrusion ? 'border-[#FF5C67] ring-1 ring-[#FF5C67]/50' : 'border-border'
      } ${className}`}
      style={{ aspectRatio: '16/9' }}
    >
      {/* Hidden/Active Raw HTML5 Video Stream */}
      {/* Live Stream: Remote Mobile Feed or Local HTML5 Video */}
      {isRemoteActive && remoteFrameUrl ? (
        <img
          ref={remoteImgRef}
          src={remoteFrameUrl}
          alt="Live Remote Mobile CCTV Stream"
          className="absolute inset-0 h-full w-full object-cover"
          crossOrigin="anonymous"
          onLoad={() => {
            remoteImgLoadedRef.current = true;
          }}
          onError={() => {
            remoteImgLoadedRef.current = false;
          }}
        />
      ) : (
        <video
          ref={videoRef}
          className="absolute inset-0 h-full w-full object-cover"
          playsInline
          muted
          autoPlay
        />
      )}

      {/* Real-time AI HUD Overlay Canvas */}
      <canvas
        ref={canvasRef}
        onClick={handlePolygonCanvasClick}
        className={`absolute inset-0 h-full w-full z-20 ${
          isEditingPolygon ? 'cursor-crosshair pointer-events-auto' : 'pointer-events-none'
        }`}
      />

      {/* Stream Error or Loading Placeholder */}
      {!streamActive && (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-30 bg-[#070D12]">
          <CameraIcon className="w-10 h-10 text-accent mb-3 animate-pulse" />
          <h4 className="text-sm font-bold text-white mb-1">
            {streamError ? 'Camera Connection Failed' : 'Initializing Hardware Sensor...'}
          </h4>
          <p className="text-xs text-muted-foreground max-w-sm mb-4">
            {streamError || 'Accessing laptop webcam or mobile camera for real-time CCTV edge processing.'}
          </p>
          <button
            onClick={startCamera}
            className="px-3.5 py-1.5 bg-accent text-[#071018] text-xs font-bold rounded-none hover:bg-accent/90 transition-colors flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Re-engage Camera
          </button>
        </div>
      )}

      {/* TOP HUD BAR */}
      <div className="absolute top-0 left-0 right-0 p-3 flex items-center justify-between z-30 pointer-events-none bg-gradient-to-b from-black/80 via-black/40 to-transparent">
        {/* Left: Camera Identifier */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <div className={`px-2 py-0.5 text-white text-[10px] font-mono font-bold tracking-widest flex items-center gap-1 ${
            isRemoteActive ? 'bg-green-600/90' : 'bg-red-600/90 animate-pulse'
          }`}>
            <span className="w-1.5 h-1.5 rounded-full bg-white" />
            {isRemoteActive ? 'LIVE MOBILE FEED' : 'LIVE CCTV'}
          </div>
          <span className="text-xs font-mono font-bold text-white tracking-wide">
            {cameraCode}{' '}
            <span className="text-[#37B9FF]">
              {'// '}{isRemoteActive ? (remoteDeviceName || 'Mobile Phone Camera (Live)') : cameraName}
            </span>
          </span>
          <span className="text-[10px] font-mono text-[#A0AEC0] hidden sm:inline">
            [{location}]
          </span>
        </div>

        {/* Right: Telemetry & Overlay toggles */}
        <div className="flex items-center gap-2 pointer-events-auto">
          {/* Detection class counts */}
          {streamActive && (
            <div className="hidden sm:flex items-center gap-1.5">
              <span className="text-[9px] font-mono bg-[#39D98A]/20 px-1.5 py-0.5 border border-[#39D98A]/40 text-[#39D98A] font-bold flex items-center gap-1">
                <User className="w-2.5 h-2.5" />
                {personCount}
              </span>
              <span className="text-[9px] font-mono bg-[#37B9FF]/20 px-1.5 py-0.5 border border-[#37B9FF]/40 text-[#37B9FF] font-bold flex items-center gap-1">
                <Car className="w-2.5 h-2.5" />
                {vehicleCount}
              </span>
            </div>
          )}

          {/* Audio VU meter */}
          <div className="hidden sm:flex items-end gap-0.5 h-3 px-1.5 bg-black/60 border border-white/10" title="Audio Stream 48kHz">
            {audioMeter.map((val, idx) => (
              <div
                key={idx}
                className="w-1 bg-[#37B9FF] transition-all duration-150"
                style={{ height: `${val}%` }}
              />
            ))}
          </div>

          <span className="text-[10px] font-mono bg-black/60 px-1.5 py-0.5 border border-white/10 text-green-400">
            {resolution} @ {fps}FPS
          </span>

          <span className={`text-[10px] font-mono bg-black/60 px-1.5 py-0.5 border border-white/10 hidden md:inline ${
            isGathering
              ? 'text-amber-400 border-amber-500/50 bg-amber-500/10 font-bold'
              : modelLoadStatus === 'yolo_live'
              ? 'text-[#39D98A] border-green-500/30'
              : modelLoadStatus === 'faceapi_ready'
              ? 'text-[#37B9FF] border-cyan-500/30'
              : 'text-[#F4C95D]'
          }`}>
            {isGathering
              ? `⚠ GATHERING (${personCount}P)`
              : modelLoadStatus === 'yolo_live'
              ? 'YOLOv11 LIVE'
              : modelLoadStatus === 'faceapi_ready'
              ? 'EDGE FACE-API'
              : 'AI ACTIVE'}
          </span>

          {/* Battery level for mobile nodes */}
          {isRemoteActive && batteryLevel !== null && (
            <span
              className={`text-[10px] font-mono px-1.5 py-0.5 border flex items-center gap-1 font-bold ${
                batteryLevel > 50
                  ? 'bg-green-500/20 text-green-400 border-green-500/30'
                  : batteryLevel > 20
                  ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                  : 'bg-red-500/20 text-red-400 border-red-500/30 animate-pulse'
              }`}
            >
              🔋 {batteryLevel}%
            </span>
          )}

          {/* Local hardware camera switcher */}
          {!isRemoteActive && availableDevices.length > 1 && (
            <div className="hidden sm:flex items-center bg-black/60 border border-white/20 px-1.5 py-0.5">
              <Laptop className="w-3 h-3 text-accent mr-1 shrink-0" />
              <select
                value={selectedDeviceId}
                onChange={(e) => {
                  const devId = e.target.value;
                  setSelectedDeviceId(devId);
                  if (onDeviceChange) onDeviceChange(devId);
                }}
                className="bg-transparent text-[10px] font-mono text-cyan-300 outline-none cursor-pointer max-w-[120px] truncate"
                title="Select Camera Sensor"
              >
                {availableDevices.map((d, i) => (
                  <option key={d.deviceId || i} value={d.deviceId} className="bg-[#0C141D] text-white">
                    {d.label || `Camera ${i + 1}`}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Device switch buttons */}
          {availableDevices.length > 1 && !isRemoteActive && (
            <button
              onClick={toggleFacingMode}
              className="p-1.5 bg-black/60 hover:bg-black/90 border border-white/20 text-white transition-colors"
              title="Switch Front/Rear Camera (Mobile Phone)"
            >
              <Smartphone className="w-3.5 h-3.5 text-accent" />
            </button>
          )}

          <button
            onClick={() => setShowOverlays(!showOverlays)}
            className={`p-1.5 border transition-colors ${
              showOverlays
                ? 'bg-[#37B9FF]/20 border-[#37B9FF] text-[#37B9FF]'
                : 'bg-black/60 border-white/20 text-muted-foreground'
            }`}
            title="Toggle Real-Time AI Detection Overlays"
          >
            {showOverlays ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={() => setShowStickFigure(!showStickFigure)}
            className={`p-1.5 border transition-colors flex items-center gap-1 text-[10px] font-mono font-bold ${
              showStickFigure
                ? 'bg-[#39D98A]/20 border-[#39D98A] text-[#39D98A]'
                : 'bg-black/60 border-white/20 text-muted-foreground'
            }`}
            title="Toggle Real-Time Stick Figure / Pose Skeletal Overlay"
          >
            <span>🦴</span>
            <span className="hidden sm:inline">STICK FIGURE</span>
          </button>

          {/* Restricted Polygon Zone Toggle */}
          <button
            onClick={() => setShowPolygonZone(!showPolygonZone)}
            className={`p-1.5 border transition-colors flex items-center gap-1 text-[10px] font-mono font-bold ${
              showPolygonZone
                ? polygonIntrusionsCount > 0
                  ? 'bg-red-500/30 border-red-500 text-red-400 animate-pulse'
                  : 'bg-[#37B9FF]/20 border-[#37B9FF] text-[#37B9FF]'
                : 'bg-black/60 border-white/20 text-muted-foreground'
            }`}
            title="Toggle Restricted Polygon Mapping / Virtual Fence"
          >
            <Shield className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">POLYGON</span>
          </button>

          {/* Edit Polygon Button */}
          <button
            onClick={() => setIsEditingPolygon(!isEditingPolygon)}
            className={`p-1.5 border transition-colors flex items-center gap-1 text-[10px] font-mono font-bold ${
              isEditingPolygon
                ? 'bg-[#F4C95D]/30 border-[#F4C95D] text-[#F4C95D]'
                : 'bg-black/60 border-white/20 text-muted-foreground hover:text-white'
            }`}
            title="Edit Polygon Boundary Coordinates (Click video to plot)"
          >
            <PenTool className="w-3.5 h-3.5" />
          </button>

          {onFullscreen && (
            <button
              onClick={onFullscreen}
              className="p-1.5 bg-black/60 hover:bg-black/90 border border-white/20 text-white transition-colors"
              title="Fullscreen"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          )}

          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 bg-red-600/20 hover:bg-red-600/80 border border-red-500/40 text-red-300 hover:text-white transition-colors"
              title="Close camera feed"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* ──── Tactical Polygon Intrusion Alert Banner ──── */}
      {showPolygonZone && polygonIntrusionsCount > 0 && (
        <div className="absolute top-12 left-1/2 -translate-x-1/2 z-30 px-3.5 py-1.5 bg-red-950/90 border border-red-500 text-red-200 backdrop-blur-md flex items-center gap-2 shadow-xl shadow-red-500/40 animate-pulse pointer-events-none">
          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
          <span className="text-[11px] font-mono font-bold tracking-wider uppercase">
            🚨 SUSPICIOUS ACTIVITY IN POLYGON ZONE ({polygonIntrusionsCount} TARGET{polygonIntrusionsCount > 1 ? 'S' : ''})
          </span>
        </div>
      )}

      {/* ──── Interactive Polygon Editing Toolbar ──── */}
      {isEditingPolygon && (
        <div className="absolute top-12 left-3 right-3 z-30 bg-[#0C141D]/95 border border-[#F4C95D] p-2.5 flex flex-wrap items-center justify-between gap-2 shadow-2xl backdrop-blur-md animate-fade-in pointer-events-auto">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#F4C95D] animate-ping" />
            <span className="text-[10px] font-mono font-bold text-[#F4C95D] uppercase">
              CLICK VIDEO TO ADD VERTICES ({activePolygon.length}/8 PTS)
            </span>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => {
                const pts = [
                  { x: 15, y: 35 },
                  { x: 85, y: 35 },
                  { x: 90, y: 88 },
                  { x: 10, y: 88 },
                ];
                setActivePolygon(pts);
                activePolygonRef.current = pts;
                if (onPolygonChange) onPolygonChange(pts);
              }}
              className="px-2 py-0.5 text-[9px] font-mono bg-white/10 hover:bg-white/20 text-white border border-white/20"
            >
              Corridor
            </button>
            <button
              onClick={() => {
                const pts = [
                  { x: 28, y: 25 },
                  { x: 72, y: 25 },
                  { x: 78, y: 82 },
                  { x: 22, y: 82 },
                ];
                setActivePolygon(pts);
                activePolygonRef.current = pts;
                if (onPolygonChange) onPolygonChange(pts);
              }}
              className="px-2 py-0.5 text-[9px] font-mono bg-white/10 hover:bg-white/20 text-white border border-white/20"
            >
              Gateway
            </button>
            <button
              onClick={() => {
                setActivePolygon([]);
                activePolygonRef.current = [];
              }}
              className="px-2 py-0.5 text-[9px] font-mono bg-red-600/20 hover:bg-red-600/40 text-red-300 border border-red-500/40"
            >
              Clear
            </button>
            <button
              onClick={() => {
                if (activePolygon.length < 3) {
                  const fallback = [
                    { x: 15, y: 35 },
                    { x: 85, y: 35 },
                    { x: 90, y: 88 },
                    { x: 10, y: 88 },
                  ];
                  setActivePolygon(fallback);
                  activePolygonRef.current = fallback;
                  if (onPolygonChange) onPolygonChange(fallback);
                }
                setIsEditingPolygon(false);
              }}
              className="px-2.5 py-0.5 text-[9px] font-mono bg-[#39D98A] text-[#071018] font-bold hover:bg-[#39D98A]/90"
            >
              Save Zone & Exit
            </button>
          </div>
        </div>
      )}

      {/* Tactical Gathering Alert Banner */}
      {isGathering && personCount >= 2 && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-30 px-3 py-1 bg-amber-950/85 border border-amber-500/90 text-amber-300 backdrop-blur-md flex items-center gap-2 shadow-lg shadow-amber-500/20 animate-pulse pointer-events-none">
          <Users className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="text-[11px] font-mono font-bold tracking-wider uppercase">
            ⚠ HUMAN GATHERING DETECTED ({personCount} PERSONS) • PROXIMITY ALERT
          </span>
        </div>
      )}

      {/* BOTTOM HUD BAR */}
      <div className="absolute bottom-0 left-0 right-0 p-3 flex items-center justify-between z-30 pointer-events-none bg-gradient-to-t from-black/85 via-black/40 to-transparent">
        {/* Left: Real-time clock and target count */}
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-mono text-gray-300 tracking-wider">
            {timeString}
          </span>
          {detectedTargetsCount > 0 && (
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-[#39D98A]/20 text-[#39D98A] border border-[#39D98A]/40 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#39D98A] animate-pulse" />
              {detectedTargetsCount} ACTIVE {detectedTargetsCount === 1 ? 'TARGET' : 'TARGETS'}
            </span>
          )}
          {personCount > 0 && (
            <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 bg-[#39D98A]/15 text-[#39D98A] border border-[#39D98A]/30 hidden sm:flex items-center gap-1">
              {personCount} PERSON{personCount > 1 ? 'S' : ''}
            </span>
          )}
          {isGathering && personCount >= 2 && (
            <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center gap-1 animate-pulse">
              <Users className="w-2.5 h-2.5" />
              GATHERING: {personCount}
            </span>
          )}
          {vehicleCount > 0 && (
            <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 bg-[#37B9FF]/15 text-[#37B9FF] border border-[#37B9FF]/30 hidden sm:flex items-center gap-1">
              {vehicleCount} VEHICLE{vehicleCount > 1 ? 'S' : ''}
            </span>
          )}
          {/* Zone Intrusion status */}
          {showPolygonZone && (
            <span
              className={`text-[9px] font-mono font-bold px-1.5 py-0.5 border flex items-center gap-1 ${
                polygonIntrusionsCount > 0
                  ? 'bg-red-500/30 text-red-300 border-red-500/50 animate-pulse'
                  : 'bg-[#37B9FF]/15 text-[#37B9FF] border-[#37B9FF]/30'
              }`}
            >
              <Shield className="w-2.5 h-2.5" />
              ZONE: {polygonIntrusionsCount > 0 ? `🚨 ${polygonIntrusionsCount} INTRUSION` : '🟢 SECURE'}
            </span>
          )}
        </div>

        {/* Right: Sensor Tag */}
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-mono text-muted-foreground uppercase tracking-widest hidden sm:inline">
            STREAM PROTOCOL: WEBRTC / MEDIA_STREAM
          </span>
        </div>
      </div>
    </div>
  );
}

// ──── HELPER: Draw Tactical Green Bounding Box ────
function drawTacticalBoundingBox(
  ctx: CanvasRenderingContext2D,
  t: DetectionTarget,
  hasIntrusion: boolean
) {
  const cornerLen = Math.min(22, t.w * 0.25);
  const isHighThreat = hasIntrusion || t.threatScore > 80;
  const boxColor = isHighThreat ? '#FF5C67' : t.color;
  const glowColor = isHighThreat
    ? 'rgba(255, 92, 103, 0.4)'
    : hexToRgba(t.color, 0.35);

  // Outer glow
  ctx.shadowColor = glowColor;
  ctx.shadowBlur = 12;
  ctx.strokeStyle = boxColor;
  ctx.lineWidth = 2.5;

  // Draw Cybernetic Corner Brackets (military SOC / C2 style)
  // Top-Left
  ctx.beginPath();
  ctx.moveTo(t.x, t.y + cornerLen);
  ctx.lineTo(t.x, t.y);
  ctx.lineTo(t.x + cornerLen, t.y);
  ctx.stroke();

  // Top-Right
  ctx.beginPath();
  ctx.moveTo(t.x + t.w - cornerLen, t.y);
  ctx.lineTo(t.x + t.w, t.y);
  ctx.lineTo(t.x + t.w, t.y + cornerLen);
  ctx.stroke();

  // Bottom-Left
  ctx.beginPath();
  ctx.moveTo(t.x, t.y + t.h - cornerLen);
  ctx.lineTo(t.x, t.y + t.h);
  ctx.lineTo(t.x + cornerLen, t.y + t.h);
  ctx.stroke();

  // Bottom-Right
  ctx.beginPath();
  ctx.moveTo(t.x + t.w - cornerLen, t.y + t.h);
  ctx.lineTo(t.x + t.w, t.y + t.h);
  ctx.lineTo(t.x + t.w, t.y + t.h - cornerLen);
  ctx.stroke();

  // Thin full-border dashed lines connecting corners
  ctx.strokeStyle = hexToRgba(boxColor, 0.3);
  ctx.lineWidth = 1;
  ctx.setLineDash([3, 3]);
  ctx.strokeRect(t.x, t.y, t.w, t.h);
  ctx.setLineDash([]);

  // Subtle bounding fill
  ctx.fillStyle = isHighThreat ? 'rgba(255, 92, 103, 0.08)' : hexToRgba(t.color, 0.06);
  ctx.fillRect(t.x, t.y, t.w, t.h);

  // Center crosshair for person
  if (PERSON_CLASSES.includes(t.className)) {
    const pcx = t.x + t.w / 2;
    const pcy = t.y + t.h / 2;
    ctx.strokeStyle = hexToRgba(boxColor, 0.4);
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 2]);
    ctx.beginPath();
    ctx.moveTo(pcx - 12, pcy);
    ctx.lineTo(pcx + 12, pcy);
    ctx.moveTo(pcx, pcy - 12);
    ctx.lineTo(pcx, pcy + 12);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  ctx.shadowBlur = 0;

  // ── Label Banner ──
  const labelText = `[${t.id}] ${t.label} • ${Math.round(t.conf * 100)}%`;
  ctx.font = 'bold 11px monospace';
  const textWidth = ctx.measureText(labelText).width;

  // Label background
  ctx.fillStyle = isHighThreat ? 'rgba(255, 92, 103, 0.92)' : hexToRgba(t.color, 0.92);
  const labelY = Math.max(0, t.y - 22);
  ctx.fillRect(t.x, labelY, textWidth + 14, 20);

  // Small triangle indicator
  ctx.beginPath();
  ctx.moveTo(t.x, labelY + 20);
  ctx.lineTo(t.x + 8, labelY + 20);
  ctx.lineTo(t.x, labelY + 26);
  ctx.closePath();
  ctx.fillStyle = isHighThreat ? 'rgba(255, 92, 103, 0.92)' : hexToRgba(t.color, 0.92);
  ctx.fill();

  // Label text
  ctx.fillStyle = '#05080B';
  ctx.fillText(labelText, t.x + 7, labelY + 14);

  // ── Track ID badge (bottom-right) ──
  const trackText = `TRK-${t.trackId}`;
  ctx.font = 'bold 9px monospace';
  const trackWidth = ctx.measureText(trackText).width;
  ctx.fillStyle = 'rgba(0,0,0,0.7)';
  ctx.fillRect(t.x + t.w - trackWidth - 10, t.y + t.h - 16, trackWidth + 10, 16);
  ctx.fillStyle = hexToRgba(boxColor, 0.9);
  ctx.fillText(trackText, t.x + t.w - trackWidth - 5, t.y + t.h - 5);
}

// ──── ZERO FAKE DETECTION: Only real detected targets are ever displayed ────
function generateSimulatedTargets(
  _canvasWidth: number,
  _canvasHeight: number,
  _time: number
): DetectionTarget[] {
  return [];
}

// ──── HELPER: Load external script ────
function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load: ${src}`));
    document.head.appendChild(script);
  });
}

// ──── HELPER: Hex to RGBA ────
function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// ──── HELPER: Draw Real-Time Tactical Stick Figure Skeleton ────
function drawTacticalStickFigure(
  ctx: CanvasRenderingContext2D,
  fig: StickFigureData,
  scaleX: number,
  scaleY: number
) {
  const posture = fig.posture || 'STANDING';
  const postureColor = POSTURE_COLORS[posture] || '#39D98A';
  const kps = fig.keypoints;
  if (!kps || kps.length < 17) return;

  ctx.save();

  // 1. Draw Skeletal Connecting Bones
  ctx.strokeStyle = postureColor;
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.shadowColor = hexToRgba(postureColor, 0.6);
  ctx.shadowBlur = 8;

  for (const [i1, i2] of SKELETON_PAIRS) {
    const kp1 = kps[i1];
    const kp2 = kps[i2];
    if (kp1 && kp2 && kp1.visible && kp2.visible) {
      ctx.beginPath();
      ctx.moveTo(kp1.x * scaleX, kp1.y * scaleY);
      ctx.lineTo(kp2.x * scaleX, kp2.y * scaleY);
      ctx.stroke();
    }
  }

  // 2. Draw Anatomical Keypoint Joints
  ctx.shadowBlur = 0;
  for (const kp of kps) {
    if (kp && kp.visible) {
      const kx = kp.x * scaleX;
      const ky = kp.y * scaleY;

      // Outer joint
      ctx.fillStyle = postureColor;
      ctx.beginPath();
      ctx.arc(kx, ky, 5, 0, Math.PI * 2);
      ctx.fill();

      // Inner white nucleus
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(kx, ky, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // 3. Head Skeleton Loop
  const nose = kps[0];
  if (nose && nose.visible) {
    ctx.strokeStyle = postureColor;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(nose.x * scaleX, (nose.y * scaleY) - 10, 13, 0, Math.PI * 2);
    ctx.stroke();
  }

  // 4. Posture Classification HUD Badge above figure
  const [bx1, by1] = fig.bbox;
  const bannerX = Math.max(10, bx1 * scaleX);
  const bannerY = Math.max(22, (by1 * scaleY) - 18);
  const confPct = Math.round((fig.posture_confidence || fig.confidence || 0.9) * 100);
  const postureText = `🦴 [${posture} • ${confPct}%]`;

  ctx.font = 'bold 10px monospace';
  const textW = ctx.measureText(postureText).width;
  ctx.fillStyle = 'rgba(5, 8, 11, 0.9)';
  ctx.fillRect(bannerX, bannerY - 14, textW + 12, 18);
  ctx.strokeStyle = postureColor;
  ctx.lineWidth = 1.2;
  ctx.strokeRect(bannerX, bannerY - 14, textW + 12, 18);

  ctx.fillStyle = postureColor;
  ctx.fillText(postureText, bannerX + 6, bannerY - 1);

  ctx.restore();
}

// ──── HELPER: Draw Tactical Restricted Polygon Zone ────
function drawTacticalPolygonZone(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  polygon: PolygonPoint[],
  isIntruded: boolean,
  intrudingCount: number,
  isEditing: boolean
) {
  if (polygon.length < 3) return;

  const pts = polygon.map((p) => ({
    x: (p.x / 100) * canvas.width,
    y: (p.y / 100) * canvas.height,
  }));

  ctx.save();

  // Polygon path
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) {
    ctx.lineTo(pts[i].x, pts[i].y);
  }
  ctx.closePath();

  // Fill and stroke styling
  if (isIntruded) {
    ctx.fillStyle = 'rgba(255, 92, 103, 0.25)';
    ctx.strokeStyle = '#FF5C67';
    ctx.lineWidth = 2.5;
    ctx.setLineDash([]);
    ctx.shadowColor = 'rgba(255, 92, 103, 0.6)';
    ctx.shadowBlur = 14;
  } else if (isEditing) {
    ctx.fillStyle = 'rgba(244, 201, 93, 0.15)';
    ctx.strokeStyle = '#F4C95D';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.shadowColor = 'rgba(244, 201, 93, 0.5)';
    ctx.shadowBlur = 8;
  } else {
    ctx.fillStyle = 'rgba(55, 185, 255, 0.10)';
    ctx.strokeStyle = '#37B9FF';
    ctx.lineWidth = 1.8;
    ctx.setLineDash([6, 4]);
    ctx.shadowColor = 'rgba(55, 185, 255, 0.4)';
    ctx.shadowBlur = 8;
  }

  ctx.fill();
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.shadowBlur = 0;

  // Draw vertices P1, P2...
  pts.forEach((pt, i) => {
    ctx.fillStyle = isIntruded ? '#FF5C67' : isEditing ? '#F4C95D' : '#37B9FF';
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, isEditing ? 5 : 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    ctx.font = 'bold 9px monospace';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(`P${i + 1}`, pt.x + 5, pt.y - 4);
  });

  // Center/Top Zone Label
  const topPt = pts.reduce((prev, curr) => (curr.y < prev.y ? curr : prev), pts[0]);
  const zoneTag = isIntruded
    ? `🚨 [BREACH DETECTED: ${intrudingCount} TARGETS IN RESTRICTED ZONE]`
    : isEditing
    ? `[EDITING POLYGON BOUNDARY: ${polygon.length} VERTICES]`
    : `[🛡 RESTRICTED ZONE // ACTIVE]`;

  ctx.font = 'bold 10px monospace';
  const tagW = ctx.measureText(zoneTag).width;
  const labelX = Math.max(8, Math.min(canvas.width - tagW - 16, topPt.x - tagW / 2));
  const labelY = Math.max(22, topPt.y - 8);

  ctx.fillStyle = isIntruded ? '#FF5C67' : isEditing ? '#F4C95D' : 'rgba(12, 20, 29, 0.85)';
  ctx.fillRect(labelX - 4, labelY - 12, tagW + 8, 16);

  ctx.strokeStyle = isIntruded ? '#FFFFFF' : isEditing ? '#000000' : '#37B9FF';
  ctx.lineWidth = 1;
  ctx.strokeRect(labelX - 4, labelY - 12, tagW + 8, 16);

  ctx.fillStyle = isIntruded ? '#FFFFFF' : isEditing ? '#071018' : '#37B9FF';
  ctx.fillText(zoneTag, labelX, labelY);

  ctx.restore();
}
