"use client";

import React, { useState } from 'react';
import {
  Activity,
  Cpu,
  ShieldAlert,
  Volume2,
  Download,
  AlertTriangle,
  Radio,
  Sparkles,
  Camera as CameraIcon,
  CheckCircle2,
  BellRing
} from 'lucide-react';
import { useToast } from '@/components/ui/Toast';

interface TargetItem {
  id: string;
  label: string;
  conf: number;
  threat: number;
}

interface TelemetrySidecarProps {
  activeCameraCode?: string;
  activeCameraName?: string;
  targets?: TargetItem[];
  isOpen?: boolean;
  onClose?: () => void;
  onExportEvidence?: () => void;
}

export function TelemetrySidecar({
  activeCameraCode = 'CAM_04',
  activeCameraName = 'Mobile Field / Laptop Webcam',
  targets = [],
  isOpen = true,
  onClose,
  onExportEvidence,
}: TelemetrySidecarProps) {
  const { showToast } = useToast();
  const [alarmFocus, setAlarmFocus] = useState(false);
  const [isHornActive, setIsHornActive] = useState(false);
  const [isDispatching, setIsDispatching] = useState(false);

  // Synthesize realistic tactical alarm siren using Web Audio API
  const playAudibleHorn = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();

      setIsHornActive(true);
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      // Alarm frequency modulation (440Hz -> 880Hz siren pattern)
      const now = ctx.currentTime;
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.linearRampToValueAtTime(880, now + 0.3);
      osc.frequency.linearRampToValueAtTime(440, now + 0.6);
      osc.frequency.linearRampToValueAtTime(880, now + 0.9);
      osc.frequency.linearRampToValueAtTime(440, now + 1.2);

      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 1.3);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 1.3);

      setTimeout(() => {
        setIsHornActive(false);
        showToast({
          title: 'Audible Perimeter Siren Triggered',
          message: `Acoustic deterrent horn sounded on ${activeCameraCode}.`,
          type: 'warning',
        });
      }, 1300);
    } catch (e) {
      console.warn('Audio playback error:', e);
      setIsHornActive(false);
    }
  };

  const handleDispatchPatrol = () => {
    setIsDispatching(true);
    setTimeout(() => {
      setIsDispatching(false);
      showToast({
        title: 'QRF Security Patrol Dispatched',
        message: `Quick Reaction Team alerted for sector ${activeCameraCode}. Coordinates locked.`,
        type: 'critical',
      });
    }, 800);
  };

  const handleExport = () => {
    if (onExportEvidence) {
      onExportEvidence();
    } else {
      showToast({
        title: 'Evidence Clip Exported',
        message: `Surveillance frame cryptographic archive created.`,
        type: 'success',
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="w-full lg:w-80 flex flex-col bg-[#070D14] border border-border rounded-none p-4 space-y-4 text-xs font-mono">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border pb-3">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-accent animate-pulse" />
          <span className="font-bold text-white uppercase tracking-wider text-xs">
            TELEMETRY SIDE-CAR
          </span>
        </div>
        <button
          onClick={() => setAlarmFocus(!alarmFocus)}
          className={`px-2 py-0.5 text-[10px] font-bold border transition-colors ${
            alarmFocus
              ? 'bg-red-500/20 text-red-400 border-red-500/50'
              : 'bg-muted text-muted-foreground border-border hover:text-white'
          }`}
        >
          ALARM FOCUS
        </button>
      </div>

      {/* Selected Camera Focus */}
      <div className="p-2.5 bg-[#0C141D] border border-border flex items-center justify-between">
        <div>
          <div className="text-[10px] text-muted-foreground uppercase">Selected Stream</div>
          <div className="font-bold text-white text-xs">{activeCameraCode}</div>
          <div className="text-[10px] text-accent truncate max-w-[170px]">{activeCameraName}</div>
        </div>
        <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-ping" />
      </div>

      {/* AI Inference Engine Telemetry (Matching video screenshot) */}
      <div className="space-y-2 border-b border-border pb-3">
        <div className="flex items-center justify-between text-[11px] font-bold text-gray-300 uppercase">
          <span className="flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-accent" /> AI INFERENCE ENGINE
          </span>
          <span className="text-[10px] text-[#39D98A]">NPU / GPU OPT</span>
        </div>

        <div className="space-y-1.5 text-[11px]">
          <div className="flex justify-between items-center py-1 px-2 bg-[#0C141D] border border-border/60">
            <span className="text-gray-400">YOLOv11 Detection</span>
            <span className="text-accent font-bold">3.4 ms</span>
          </div>
          <div className="flex justify-between items-center py-1 px-2 bg-[#0C141D] border border-border/60">
            <span className="text-gray-400">SFace Embed (128-D)</span>
            <span className="text-accent font-bold">1.7 ms</span>
          </div>
          <div className="flex justify-between items-center py-1 px-2 bg-[#0C141D] border border-border/60">
            <span className="text-gray-400">ANPR EasyOCR Engine</span>
            <span className="text-accent font-bold">3.4 ms</span>
          </div>
        </div>
      </div>

      {/* Active Scene Targets */}
      <div className="space-y-2 flex-1">
        <div className="flex items-center justify-between text-[11px] font-bold text-gray-300 uppercase">
          <span>ACTIVE SCENE TARGETS</span>
          <span className="px-1.5 py-0.2 bg-red-500/20 text-red-400 border border-red-500/30 text-[9px]">
            {targets.length > 0 ? `${targets.length} TRACKED` : 'SCANNING'}
          </span>
        </div>

        <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
          {targets.length === 0 ? (
            <div className="p-3 bg-[#0C141D] border border-dashed border-border/60 text-center text-muted-foreground text-[10px]">
              No hostile targets currently tracked in sector.
            </div>
          ) : (
            targets.map((tgt, i) => (
              <div
                key={i}
                className="p-2 bg-[#0C141D] border border-border/80 flex items-center justify-between"
              >
                <div>
                  <div className="font-bold text-white text-[11px]">{tgt.id}</div>
                  <div className="text-[10px] text-muted-foreground">{tgt.label}</div>
                </div>
                <span
                  className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                    tgt.threat > 70
                      ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                      : 'bg-accent/20 text-accent border border-accent/30'
                  }`}
                >
                  {tgt.threat > 70 ? 'CRITICAL' : 'INFORMATIONAL'}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Tactical Quick Action Buttons (Matching Screenshot) */}
      <div className="space-y-2 pt-2 border-t border-border">
        {/* DISPATCH SECURITY PATROL */}
        <button
          onClick={handleDispatchPatrol}
          disabled={isDispatching}
          className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs tracking-wider uppercase rounded-none transition-colors flex items-center justify-center gap-2 shadow-lg shadow-red-600/20 disabled:opacity-50"
        >
          <ShieldAlert className="w-4 h-4" />
          {isDispatching ? 'Alerting Patrol...' : 'DISPATCH SECURITY PATROL'}
        </button>

        {/* AUDIBLE HORN & EXPORT CLIP */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={playAudibleHorn}
            disabled={isHornActive}
            className={`py-2 px-2 text-[11px] font-bold border transition-colors flex items-center justify-center gap-1.5 ${
              isHornActive
                ? 'bg-amber-500 text-black border-amber-500'
                : 'bg-[#0C141D] hover:bg-[#131D2A] text-gray-200 border-border'
            }`}
          >
            <BellRing className={`w-3.5 h-3.5 ${isHornActive ? 'animate-bounce' : 'text-amber-400'}`} />
            AUDIBLE HORN
          </button>

          <button
            onClick={handleExport}
            className="py-2 px-2 bg-[#0C141D] hover:bg-[#131D2A] text-gray-200 border border-border text-[11px] font-bold transition-colors flex items-center justify-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5 text-accent" />
            EXPORT CLIP
          </button>
        </div>
      </div>
    </div>
  );
}
