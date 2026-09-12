"use client";

import React, { useState } from 'react';
import { Shield, PenTool, Trash2, Check, AlertTriangle } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';

interface Point {
  x: number;
  y: number;
}

interface VirtualFenceEditorProps {
  cameraId: string;
  initialPoints?: Point[];
  onSave?: (polygon: Point[]) => Promise<void>;
  className?: string;
}

export function VirtualFenceEditor({ cameraId, initialPoints, onSave, className = '' }: VirtualFenceEditorProps) {
  const { showToast } = useToast();
  const [mode, setMode] = useState<'polygon' | 'line'>('polygon');
  const [points, setPoints] = useState<Point[]>(initialPoints || [
    { x: 15, y: 80 },
    { x: 85, y: 80 },
    { x: 70, y: 40 },
    { x: 30, y: 40 },
  ]);
  const [isSaving, setIsSaving] = useState(false);

  const handleCanvasClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.round(((e.clientX - rect.left) / rect.width) * 100);
    const y = Math.round(((e.clientY - rect.top) / rect.height) * 100);

    if (points.length >= 8) {
      showToast({
        title: 'Max Points Reached',
        message: 'A zone can have up to 8 vertices.',
        type: 'warning',
      });
      return;
    }

    setPoints([...points, { x, y }]);
  };

  const handleClear = () => {
    setPoints([]);
    showToast({
      title: 'Zone Cleared',
      message: 'Virtual boundary has been reset.',
      type: 'info',
    });
  };

  const handleSave = async () => {
    if (points.length < 3 && mode === 'polygon') {
      showToast({
        title: 'Incomplete Zone',
        message: 'A polygon boundary requires at least 3 points.',
        type: 'warning',
      });
      return;
    }
    try {
      setIsSaving(true);
      if (onSave) await onSave(points);
      showToast({
        title: 'Virtual Fence Configured',
        message: `Zone saved for camera ${cameraId}. Intrusion events will be dispatched on boundary breach.`,
        type: 'success',
      });
    } catch {
      showToast({
        title: 'Zone Save Failed',
        message: 'The virtual fence could not be saved to the camera configuration.',
        type: 'error',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const pointsString = points.map((p) => `${p.x},${p.y}`).join(' ');

  return (
    <div className={`bg-card border border-border rounded-none p-5 flex flex-col ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Shield className="w-4 h-4 text-accent" />
            Virtual Perimeter & Geofence Editor
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Define tripwires and restricted polygon boundaries. Click viewport to plot coordinates.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setMode('polygon')}
            className={`px-3 py-1.5 rounded-none text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              mode === 'polygon'
                ? 'bg-accent text-[#071018]'
                : 'bg-muted text-muted-foreground hover:text-foreground border border-border'
            }`}
          >
            <PenTool className="w-3.5 h-3.5" />
            Draw Polygon
          </button>
          <button
            onClick={() => setMode('line')}
            className={`px-3 py-1.5 rounded-none text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              mode === 'line'
                ? 'bg-accent text-[#071018]'
                : 'bg-muted text-muted-foreground hover:text-foreground border border-border'
            }`}
          >
            Draw Line
          </button>
          <button
            onClick={handleClear}
            className="px-3 py-1.5 rounded-none text-xs font-semibold bg-muted hover:bg-red-500/20 border border-border hover:border-[#FF5C67]/40 text-muted-foreground hover:text-[#FF7A83] transition-colors flex items-center gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-3.5 py-1.5 rounded-none text-xs font-bold bg-[#39D98A] text-[#071018] hover:bg-[#39D98A]/90 transition-colors flex items-center gap-1.5"
          >
            <Check className="w-3.5 h-3.5" />
            {isSaving ? 'Saving...' : 'Save Zone'}
          </button>
        </div>
      </div>

      {/* Editor Canvas Area */}
      <div
        className="relative bg-[#05080B] border border-border rounded-none overflow-hidden cursor-crosshair"
        style={{ aspectRatio: '16/9' }}
      >
        {/* Subtle grid backdrop */}
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#37B9FF_1px,transparent_1px)] [background-size:24px_24px]" />

        <svg
          className="absolute inset-0 w-full h-full"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          onClick={handleCanvasClick}
        >
          {points.length > 1 && mode === 'line' && (
            <polyline
              points={pointsString}
              fill="none"
              stroke="#37B9FF"
              strokeWidth="0.8"
              strokeDasharray="2"
            />
          )}

          {points.length > 2 && mode === 'polygon' && (
            <polygon
              points={pointsString}
              fill="rgba(55, 185, 255, 0.15)"
              stroke="#37B9FF"
              strokeWidth="0.8"
              strokeDasharray="2"
            />
          )}

          {points.map((pt, i) => (
            <g key={i}>
              <circle cx={pt.x} cy={pt.y} r="1.5" fill="#37B9FF" stroke="#F3F6F8" strokeWidth="0.4" />
              <text x={pt.x + 2} y={pt.y - 1.5} fill="#F3F6F8" fontSize="2.5" fontFamily="monospace">
                P{i + 1}
              </text>
            </g>
          ))}
        </svg>

        {/* Tip / instructions overlay */}
        <div className="absolute bottom-3 left-3 px-3 py-1.5 rounded bg-black/75 border border-white/10 text-[11px] font-mono text-muted-foreground pointer-events-none flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-accent animate-ping" />
          Click to add vertices ({points.length} defined) • Restricted Zone: Translucent Overlay Active
        </div>
      </div>
    </div>
  );
}
