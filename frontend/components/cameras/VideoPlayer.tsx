"use client";

import React, { useState, useEffect } from 'react';
import { Video, Maximize2, ShieldAlert, Activity, Volume2, VolumeX, Trash2, Shield } from 'lucide-react';
import type { Camera } from '@/types/camera';

interface DetectionOverlay {
  label: string;
  confidence: number;
  trackId: number;
  top: string;
  left: string;
  width: string;
  height: string;
  color?: string;
}

interface VideoPlayerProps {
  camera: Camera;
  isLive?: boolean;
  hasIntrusion?: boolean;
  detections?: DetectionOverlay[];
  showVirtualFence?: boolean;
  fencePolygon?: { x: number; y: number }[];
  onPolygonChange?: (points: { x: number; y: number }[]) => void;
  onRemovePolygon?: () => void;
  className?: string;
  onFullscreen?: () => void;
}

export function VideoPlayer({
  camera,
  isLive = true,
  hasIntrusion = false,
  detections = [],
  showVirtualFence = true,
  fencePolygon,
  onPolygonChange,
  onRemovePolygon,
  className = '',
  onFullscreen,
}: VideoPlayerProps) {
  const [timeString, setTimeString] = useState('');
  const [isMuted, setIsMuted] = useState(true);
  const [previewFailed, setPreviewFailed] = useState(false);
  const hasBrowserPreview = Boolean(camera.previewUrl && isLive && !previewFailed);

  // Default fence polygon points if none passed
  const defaultFence = [
    { x: 15, y: 75 },
    { x: 85, y: 75 },
    { x: 70, y: 35 },
    { x: 30, y: 35 },
  ];

  const [activePolygon, setActivePolygon] = useState<{ x: number; y: number }[]>(
    fencePolygon !== undefined ? fencePolygon : defaultFence
  );
  const [polygonActive, setPolygonActive] = useState<boolean>(
    fencePolygon !== undefined ? fencePolygon.length >= 3 : showVirtualFence
  );

  useEffect(() => {
    if (fencePolygon !== undefined) {
      setActivePolygon(fencePolygon);
      setPolygonActive(fencePolygon.length >= 3);
    }
  }, [fencePolygon]);

  const handleRemovePolygon = () => {
    setActivePolygon([]);
    setPolygonActive(false);
    if (onRemovePolygon) onRemovePolygon();
    if (onPolygonChange) onPolygonChange([]);
  };

  const handleRestorePolygon = () => {
    setActivePolygon(defaultFence);
    setPolygonActive(true);
    if (onPolygonChange) onPolygonChange(defaultFence);
  };

  useEffect(() => {
    const updateClock = () => {
      const d = new Date();
      setTimeString(
        d.toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        })
      );
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  const polyPointsString = activePolygon.map((p) => `${p.x},${p.y}`).join(' ');

  return (
    <div
      className={`relative bg-[#05080B] rounded-none overflow-hidden border transition-all ${
        hasIntrusion ? 'border-[#FF5C67] ring-1 ring-[#FF5C67]/50' : 'border-border'
      } ${className}`}
      style={{ aspectRatio: '16/9' }}
    >
      {hasBrowserPreview ? (
        <video
          className="absolute inset-0 h-full w-full object-cover"
          src={camera.previewUrl}
          autoPlay
          muted={isMuted}
          playsInline
          onError={() => setPreviewFailed(true)}
        />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[#070D12] text-muted-foreground">
          <Video className="h-8 w-8" />
          <span className="font-mono text-[11px]">BROWSER PREVIEW UNAVAILABLE</span>
        </div>
      )}

      {/* Virtual fence SVG overlay */}
      {showVirtualFence && polygonActive && activePolygon.length >= 3 && (
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none z-10"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          <polygon
            points={polyPointsString}
            fill={hasIntrusion ? 'rgba(255, 92, 103, 0.15)' : 'rgba(57, 217, 138, 0.08)'}
            stroke={hasIntrusion ? '#FF5C67' : '#39D98A'}
            strokeWidth="0.75"
            strokeDasharray={hasIntrusion ? '0' : '2,1'}
          />
          {activePolygon.map((pt, i) => (
            <circle
              key={i}
              cx={pt.x}
              cy={pt.y}
              r="1.2"
              fill={hasIntrusion ? '#FF5C67' : '#39D98A'}
            />
          ))}
          <text
            x={activePolygon[0].x + 2}
            y={activePolygon[0].y - 2}
            fill={hasIntrusion ? '#FF5C67' : '#39D98A'}
            fontSize="3"
            fontFamily="monospace"
            fontWeight="bold"
          >
            VIRTUAL FENCE ZONE: {camera.location?.toUpperCase() || 'SECTOR'}
          </text>
        </svg>
      )}

      {/* AI Bounding Box Overlays */}
      {detections.map((det, idx) => (
        <div
          key={idx}
          className="absolute border-2 z-20 pointer-events-none flex flex-col justify-start transition-all"
          style={{
            top: det.top,
            left: det.left,
            width: det.width,
            height: det.height,
            borderColor: det.color || (hasIntrusion ? '#FF5C67' : '#39D98A'),
            backgroundColor: `${det.color || (hasIntrusion ? '#FF5C67' : '#39D98A')}15`,
          }}
        >
          <span
            className="text-[9px] font-mono font-bold px-1 py-0.5 w-max tracking-wider text-[#071018]"
            style={{ backgroundColor: det.color || (hasIntrusion ? '#FF5C67' : '#39D98A') }}
          >
            {det.label} {det.confidence}% TRACK {det.trackId}
          </span>
        </div>
      ))}

      {/* Header Overlay (Section 24: 36px–40px) */}
      <div className="absolute top-0 inset-x-0 h-9 bg-gradient-to-b from-black/85 via-black/50 to-transparent px-3 flex items-center justify-between z-30 pointer-events-none">
        <div className="flex items-center gap-2 pointer-events-auto">
          <span className="text-xs font-bold text-foreground font-mono tracking-wider">
            {camera.id}
          </span>
          <span className="text-[10px] text-muted-foreground font-medium hidden sm:inline">
            {camera.name}
          </span>
        </div>

        <div className="flex items-center gap-3 pointer-events-auto">
          {hasBrowserPreview && (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-black/60 border border-white/10">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-[10px] font-bold text-white tracking-widest font-mono">
                LIVE
              </span>
            </div>
          )}
          <span className="text-[10px] font-mono text-white/80">{timeString}</span>
          {/* Real-time Remove / Add Polygon Button */}
          {polygonActive && activePolygon.length >= 3 ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleRemovePolygon();
              }}
              className="px-2 py-0.5 bg-red-600/30 hover:bg-red-600/70 border border-red-500/50 text-red-300 hover:text-white transition-colors flex items-center gap-1 text-[10px] font-mono font-bold"
              title="Remove polygon from this camera in real time"
            >
              <Trash2 className="w-3.5 h-3.5 text-red-400" />
              <span className="hidden sm:inline">REMOVE POLYGON</span>
            </button>
          ) : (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleRestorePolygon();
              }}
              className="px-2 py-0.5 bg-[#37B9FF]/20 hover:bg-[#37B9FF]/40 border border-[#37B9FF]/40 text-[#37B9FF] hover:text-white transition-colors flex items-center gap-1 text-[10px] font-mono font-bold"
              title="Add polygon to this camera in real time"
            >
              <Shield className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">+ POLYGON</span>
            </button>
          )}

          <button
            onClick={() => setIsMuted(!isMuted)}
            className="p-1 text-white/70 hover:text-white transition-colors"
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>
          {onFullscreen && (
            <button
              onClick={onFullscreen}
              className="p-1 text-white/70 hover:text-white transition-colors"
              title="Fullscreen"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Real-time floating polygon badge & action */}
      {showVirtualFence && (
        <div className="absolute top-10 left-3 z-30 pointer-events-auto flex items-center gap-1.5 animate-fade-in">
          {polygonActive && activePolygon.length >= 3 ? (
            <div className="flex items-center bg-[#070D12]/95 border border-[#37B9FF]/60 backdrop-blur-md text-[10px] font-mono font-bold shadow-xl">
              <span className="px-2 py-0.5 text-[#37B9FF] border-r border-[#37B9FF]/30 flex items-center gap-1">
                <Shield className="w-3 h-3" />
                ZONE ({activePolygon.length} PTS)
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemovePolygon();
                }}
                className="px-2 py-0.5 bg-red-600/30 hover:bg-red-600/70 text-red-200 hover:text-white transition-colors flex items-center gap-1 cursor-pointer active:scale-95"
                title="Remove polygon in real time"
              >
                <Trash2 className="w-3 h-3 text-red-400" />
                REMOVE POLYGON
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleRestorePolygon();
              }}
              className="px-2 py-0.5 bg-[#37B9FF]/20 hover:bg-[#37B9FF]/50 border border-[#37B9FF]/50 text-[#37B9FF] hover:text-white text-[10px] font-mono font-bold transition-all backdrop-blur-md flex items-center gap-1 cursor-pointer active:scale-95"
              title="Add polygon"
            >
              <Shield className="w-3 h-3" />
              + ADD POLYGON
            </button>
          )}
        </div>
      )}

      {/* Footer Overlay (Section 24) */}
      <div className="absolute bottom-0 inset-x-0 h-9 bg-gradient-to-t from-black/90 via-black/50 to-transparent px-3 flex items-center justify-between z-30 pointer-events-none">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono font-semibold text-white/90">
            {camera.bopId} | {camera.location?.toUpperCase()}
          </span>
          {hasIntrusion && (
            <span className="text-[10px] font-bold font-mono px-1.5 py-0.5 rounded bg-red-500 text-[#071018] animate-pulse">
              ACTIVE CRITICAL ALERT
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 text-[10px] font-mono text-white/70">
          <span className="flex items-center gap-1">
            <Activity className="w-3 h-3 text-accent" />
            {camera.fps} FPS
          </span>
          <span>•</span>
          <span>{camera.resolution}</span>
        </div>
      </div>
    </div>
  );
}
