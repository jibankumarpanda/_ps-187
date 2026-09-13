"use client";

import React, { useState } from 'react';
import Image from 'next/image';
import { Shield, Eye, ChevronRight, ChevronLeft, MapPin, Radio, Crosshair, Layers } from 'lucide-react';

export interface TacticalCard {
  id: string;
  image: string;
  sector: string;
  location: string;
  status: string;
  statusColor: string;
  threatLevel: string;
  threatColor: string;
  aiConfidence: string;
  timestamp: string;
  description: string;
}

const TACTICAL_CARDS: TacticalCard[] = [
  {
    id: '1',
    image: '/hero-images/border-fencing.jpeg',
    sector: 'SECTOR-09 • PUNJAB FRONTIER',
    location: 'BOP-142 International Border Line',
    status: 'ACTIVE PATROL',
    statusColor: 'text-green-500 bg-green-500/10 border-green-500/30',
    threatLevel: 'ELEVATED',
    threatColor: 'text-[#F5A623] bg-[#F5A623]/10 border-[#F5A623]/30',
    aiConfidence: '98.8%',
    timestamp: 'LIVE FEED • 08:32:14 IST',
    description: 'Autonomous virtual-fence line monitoring with integrated CCTV and high-gain thermal sensors.',
  },
  {
    id: '2',
    image: '/hero-images/special-forces.jpeg',
    sector: 'SPECIAL COMMANDO WING',
    location: 'Forward Tactical Rapid Response Unit',
    status: 'DEPLOYED & READY',
    statusColor: 'text-accent bg-accent/10 border-accent/30',
    threatLevel: 'SECURE',
    threatColor: 'text-green-500 bg-green-500/10 border-green-500/30',
    aiConfidence: '99.4%',
    timestamp: 'STANDBY • 08:30:45 IST',
    description: 'Immediate tactical intercept team linked with real-time C2 alerting and helmet-mounted feeds.',
  },
  {
    id: '3',
    image: '/hero-images/wire-patrol.jpeg',
    sector: 'WESTERN CORRIDOR PATROL',
    location: 'High-Density Barbed Wire Perimeter',
    status: 'VIRTUAL FENCE ACTIVE',
    statusColor: 'text-green-500 bg-green-500/10 border-green-500/30',
    threatLevel: 'WATCH',
    threatColor: 'text-accent bg-accent/10 border-accent/30',
    aiConfidence: '97.6%',
    timestamp: 'SYNCHRONIZED • 08:29:10 IST',
    description: 'Multi-camera tracking automatically identifying intrusion vector and speed of approach.',
  },
  {
    id: '4',
    image: '/hero-images/siachen-flag.jpeg',
    sector: 'GLACIER HIGHLANDS OUTPOST',
    location: 'Siachen Sector • Elevation 18,800 FT',
    status: 'CONTINUOUS WATCH',
    statusColor: 'text-green-500 bg-green-500/10 border-green-500/30',
    threatLevel: 'NORMAL',
    threatColor: 'text-green-500 bg-green-500/10 border-green-500/30',
    aiConfidence: '99.1%',
    timestamp: 'MONITORED • 08:28:02 IST',
    description: 'Extreme-environment perimeter surveillance with cryptographic proof of tamper-evident log records.',
  },
  {
    id: '5',
    image: '/hero-images/tactical-guard.jpeg',
    sector: 'NORTHERN RIDGE SENTRY',
    location: 'Mountain Pass Forward Observation Post',
    status: 'TARGET ACQUISITION',
    statusColor: 'text-accent bg-accent/10 border-accent/30',
    threatLevel: 'DEFCON 3',
    threatColor: 'text-[#F5A623] bg-[#F5A623]/10 border-[#F5A623]/30',
    aiConfidence: '98.2%',
    timestamp: 'TRACKING • 08:27:18 IST',
    description: 'AI optical zoom and optical flow tracking detecting human presence under heavy foliage.',
  },
];

export function TacticalImageStack() {
  const [activeIndex, setActiveIndex] = useState(0);

  const nextCard = () => {
    setActiveIndex((prev) => (prev + 1) % TACTICAL_CARDS.length);
  };

  const prevCard = () => {
    setActiveIndex((prev) => (prev - 1 + TACTICAL_CARDS.length) % TACTICAL_CARDS.length);
  };

  const current = TACTICAL_CARDS[activeIndex];

  // Convert confidence percentage string like '98.8%' to number for gauge
  const confidenceNumber = parseFloat(current.aiConfidence.replace('%', '')) || 98;

  return (
    <div className="w-full max-w-6xl mx-auto my-16 px-4">
      {/* Section Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-accent/10 border border-accent/30 text-accent text-xs font-mono font-bold tracking-widest uppercase mb-3 shadow-[0_0_15px_rgba(55,185,255,0.2)]">
            <Radio className="w-3.5 h-3.5 animate-pulse text-accent" />
            <span>OPERATIONAL C4ISR • ACTIVE SENSORS</span>
          </div>
          <h2 className="text-3xl md:text-5xl font-[family-name:var(--font-display)] text-white tracking-tight leading-tight">
            Tactical Reconnaissance Stack
          </h2>
          <p className="text-muted-foreground text-sm md:text-base max-w-2xl mt-2 leading-relaxed">
            Multi-spectral video streams synchronized across frontier sectors with edge computer vision and automated blockchain cryptographic seals.
          </p>
        </div>

        {/* Controls & Sector Counter */}
        <div className="flex items-center gap-3 self-start md:self-auto">
          <div className="flex items-center bg-[#0d141d]/90 border border-accent/25 px-3 py-1.5 rounded-lg shadow-lg backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-ping mr-2.5" />
            <span className="text-xs font-mono text-gray-300">
              SECTOR <span className="text-accent font-bold font-mono">0{activeIndex + 1}</span> / 0{TACTICAL_CARDS.length}
            </span>
          </div>

          <div className="flex items-center gap-1.5 bg-[#0d141d]/90 border border-border p-1 rounded-lg backdrop-blur-md">
            <button
              onClick={prevCard}
              aria-label="Previous Reconnaissance Card"
              className="w-9 h-9 rounded bg-[#131b26] border border-border/80 flex items-center justify-center text-gray-300 hover:text-accent hover:border-accent hover:bg-accent/10 transition-all active:scale-95"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={nextCard}
              aria-label="Next Reconnaissance Card"
              className="w-9 h-9 rounded bg-[#131b26] border border-border/80 flex items-center justify-center text-gray-300 hover:text-accent hover:border-accent hover:bg-accent/10 transition-all active:scale-95"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Interactive Sector Quick-Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-6 scrollbar-none">
        {TACTICAL_CARDS.map((card, idx) => {
          const isActive = idx === activeIndex;
          return (
            <button
              key={card.id}
              onClick={() => setActiveIndex(idx)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-mono whitespace-nowrap transition-all duration-300 flex items-center gap-2 border ${
                isActive
                  ? 'bg-accent/15 border-accent text-accent shadow-[0_0_16px_rgba(55,185,255,0.25)] font-semibold scale-105'
                  : 'bg-[#0B1116]/80 border-border/60 text-muted-foreground hover:text-gray-200 hover:border-border'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-accent animate-pulse' : 'bg-gray-500'}`} />
              {card.sector.split('•')[0].trim()}
            </button>
          );
        })}
      </div>

      {/* Main Stack Container */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        {/* Visual Stack Area (7 columns) */}
        <div className="lg:col-span-7 relative h-[420px] sm:h-[460px] w-full flex items-center justify-center select-none" style={{ perspective: '1200px' }}>
          {TACTICAL_CARDS.map((card, idx) => {
            // Calculate relative offset from active card
            const offset = (idx - activeIndex + TACTICAL_CARDS.length) % TACTICAL_CARDS.length;
            
            // Only render top 3 cards for clean performance & 3D visual depth
            if (offset > 2) return null;

            const isTop = offset === 0;
            const rotation = isTop ? 0 : offset === 1 ? 3.5 : -3.5;
            const translateY = offset * 18;
            const translateZ = -offset * 40;
            const scale = 1 - offset * 0.04;
            const zIndex = 30 - offset * 10;
            const opacity = 1 - offset * 0.22;

            return (
              <div
                key={card.id}
                onClick={nextCard}
                style={{
                  transform: `translateY(${translateY}px) translateZ(${translateZ}px) scale(${scale}) rotate(${rotation}deg)`,
                  zIndex,
                  opacity,
                }}
                className={`absolute inset-x-0 mx-auto w-full max-w-[560px] h-[370px] sm:h-[410px] rounded-xl border ${
                  isTop
                    ? 'border-accent/50 shadow-[0_20px_50px_rgba(0,0,0,0.8),0_0_30px_rgba(55,185,255,0.18)] ring-1 ring-accent/30'
                    : 'border-[#22303f] shadow-2xl'
                } bg-[#0A0E13] overflow-hidden cursor-pointer transition-all duration-500 ease-out hover:border-accent group`}
              >
                {/* Tactical Reconnaissance Image */}
                <Image
                  src={card.image}
                  alt={card.sector}
                  fill
                  unoptimized
                  className="object-cover group-hover:scale-105 transition-transform duration-700"
                  priority={idx === 0}
                />

                {/* Tactical Scanline Sweep on Top Card */}
                {isTop && <div className="tactical-scanline-active" />}

                {/* Subtle Grid overlay */}
                <div className="absolute inset-0 tactical-grid-overlay opacity-30 pointer-events-none" />

                {/* Cinematic Vignettes & Tactical Gradients */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#060a0e] via-[#060a0e]/40 to-transparent pointer-events-none" />
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(6,10,14,0.85)_100%)] pointer-events-none" />

                {/* Futuristic Laser Reticles on top card */}
                {isTop && (
                  <>
                    <div className="absolute top-2.5 left-2.5 w-4 h-4 border-t-2 border-l-2 border-accent shadow-[0_0_8px_rgba(55,185,255,0.8)] pointer-events-none" />
                    <div className="absolute top-2.5 right-2.5 w-4 h-4 border-t-2 border-r-2 border-accent shadow-[0_0_8px_rgba(55,185,255,0.8)] pointer-events-none" />
                    <div className="absolute bottom-2.5 left-2.5 w-4 h-4 border-b-2 border-l-2 border-accent shadow-[0_0_8px_rgba(55,185,255,0.8)] pointer-events-none" />
                    <div className="absolute bottom-2.5 right-2.5 w-4 h-4 border-b-2 border-r-2 border-accent shadow-[0_0_8px_rgba(55,185,255,0.8)] pointer-events-none" />
                  </>
                )}

                {/* Tactical HUD Header Badges */}
                <div className="absolute top-4 left-4 flex flex-wrap items-center gap-2 z-10 pointer-events-none">
                  <span className={`px-2.5 py-1 rounded-md text-[11px] font-mono font-bold tracking-wider backdrop-blur-md border shadow-sm ${card.statusColor}`}>
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-current animate-ping mr-1.5" />
                    {card.status}
                  </span>
                  <span className={`px-2.5 py-1 rounded-md text-[11px] font-mono font-bold tracking-wider backdrop-blur-md border shadow-sm ${card.threatColor}`}>
                    THREAT: {card.threatLevel}
                  </span>
                </div>

                {/* AI Confidence Pill with Reticle */}
                <div className="absolute top-4 right-4 text-[11px] font-mono font-semibold text-white bg-black/75 backdrop-blur-md px-3 py-1 rounded-md border border-accent/40 flex items-center gap-2 z-10 pointer-events-none shadow-[0_0_15px_rgba(0,0,0,0.5)]">
                  <Crosshair className="w-3.5 h-3.5 text-accent animate-spin" style={{ animationDuration: '10s' }} />
                  <span>AI: <strong className="text-accent">{card.aiConfidence}</strong></span>
                </div>

                {/* Bottom Tactical Overlay Info */}
                <div className="absolute bottom-0 inset-x-0 p-5 sm:p-6 z-10 pointer-events-none bg-gradient-to-t from-[#060a0e] via-[#060a0e]/90 to-transparent">
                  <div className="text-accent text-xs font-mono font-bold tracking-widest flex items-center gap-2 mb-1.5">
                    <MapPin className="w-3.5 h-3.5 text-accent" />
                    <span>{card.sector}</span>
                  </div>
                  <h3 className="text-white font-bold text-xl sm:text-2xl drop-shadow-md tracking-tight leading-snug">
                    {card.location}
                  </h3>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/10 text-xs font-mono text-gray-300">
                    <span className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                      {card.timestamp}
                    </span>
                    <span className="text-accent group-hover:translate-x-1 transition-transform flex items-center gap-1 font-semibold">
                      Click to cycle stack <ChevronRight className="w-4 h-4" />
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Tactical Info Panel (5 columns) */}
        <div className="lg:col-span-5 bg-[#0B1116]/85 backdrop-blur-xl border border-accent/25 rounded-xl p-6 sm:p-7 relative overflow-hidden shadow-[0_15px_40px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.08)] flex flex-col justify-between">
          {/* Ambient Glows */}
          <div className="absolute -top-12 -right-12 w-48 h-48 bg-accent/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-green-500/5 rounded-full blur-3xl pointer-events-none" />

          {/* Panel Header */}
          <div>
            <div className="flex items-center justify-between pb-4 mb-5 border-b border-border/70">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded bg-accent/15 border border-accent/30 flex items-center justify-center">
                  <Shield className="w-4 h-4 text-accent" />
                </div>
                <div>
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-white">
                    TELEMETRY INSPECTOR
                  </span>
                  <div className="text-[10px] font-mono text-muted-foreground">NODE: SENSOR-EDGE-04</div>
                </div>
              </div>
              <span className="text-xs font-mono text-green-400 bg-green-500/10 border border-green-500/30 px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-[0_0_10px_rgba(57,217,138,0.2)]">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                LIVE SYNC
              </span>
            </div>

            {/* Target & Sector Details */}
            <div className="space-y-4">
              <div className="bg-[#0e1620]/90 p-3.5 rounded-lg border border-border/80">
                <div className="text-[10px] font-mono uppercase text-accent tracking-widest mb-1 flex items-center justify-between">
                  <span>ACTIVE SECTOR DISPATCH</span>
                  <span className="text-muted-foreground">CAM CLUSTER 4</span>
                </div>
                <div className="text-white font-bold text-base tracking-tight">
                  {current.sector}
                </div>
                <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
                  <MapPin className="w-3 h-3 text-accent shrink-0" />
                  <span>{current.location}</span>
                </div>
              </div>

              {/* Gauges & Telemetry Bar */}
              <div className="grid grid-cols-2 gap-3">
                {/* AI Confidence Gauge */}
                <div className="bg-[#0e1620]/90 p-3.5 rounded-lg border border-border/80 relative overflow-hidden">
                  <div className="text-[10px] font-mono text-muted-foreground uppercase flex items-center justify-between">
                    <span>AI Confidence</span>
                    <Crosshair className="w-3 h-3 text-accent" />
                  </div>
                  <div className="text-accent font-mono font-bold text-xl mt-1">{current.aiConfidence}</div>
                  {/* Progress Bar */}
                  <div className="w-full bg-[#1A2633] h-1.5 rounded-full mt-2 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-accent to-[#39D98A] h-full rounded-full transition-all duration-500"
                      style={{ width: `${confidenceNumber}%` }}
                    />
                  </div>
                </div>

                {/* Threat Status */}
                <div className="bg-[#0e1620]/90 p-3.5 rounded-lg border border-border/80">
                  <div className="text-[10px] font-mono text-muted-foreground uppercase flex items-center justify-between">
                    <span>Threat Matrix</span>
                    <Radio className="w-3 h-3 text-[#F5A623]" />
                  </div>
                  <div className="text-white font-mono font-bold text-xl mt-1">{current.threatLevel}</div>
                  <div className="text-[10px] font-mono text-green-400 mt-1.5 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400" /> VIRTUAL FENCE ARMED
                  </div>
                </div>
              </div>

              {/* Audio & Thermal Signal Spectrum Visualizer */}
              <div className="bg-[#0e1620]/90 p-3.5 rounded-lg border border-border/80">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
                    SENSOR SPECTRAL TELEMETRY
                  </span>
                  <span className="text-[10px] font-mono text-accent">5.8 GHz RF LINK</span>
                </div>
                {/* Dynamic waveform bars */}
                <div className="flex items-end gap-1.5 h-8 w-full pt-1">
                  {[40, 75, 55, 90, 65, 80, 45, 95, 70, 85, 60, 100, 50, 75, 90, 65].map((height, i) => (
                    <div
                      key={i}
                      className="flex-1 bg-accent/40 rounded-t transition-all duration-300 hover:bg-accent"
                      style={{
                        height: `${height}%`,
                        backgroundColor: i % 3 === 0 ? 'rgba(55, 185, 255, 0.85)' : 'rgba(55, 185, 255, 0.45)',
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Operational Summary */}
              <div className="bg-[#0e1620]/90 p-3.5 rounded-lg border border-border/80">
                <div className="text-[10px] font-mono uppercase text-muted-foreground tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Layers className="w-3 h-3 text-accent" />
                  <span>INTELLIGENCE BRIEFING</span>
                </div>
                <p className="text-xs text-gray-300 leading-relaxed font-sans">
                  {current.description}
                </p>
              </div>
            </div>
          </div>

          {/* Panel Footer Navigation */}
          <div className="pt-5 mt-4 border-t border-border/70 flex items-center justify-between">
            <div className="flex gap-1.5">
              {TACTICAL_CARDS.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setActiveIndex(i)}
                  aria-label={`View card ${i + 1}`}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    i === activeIndex
                      ? 'w-7 bg-accent shadow-[0_0_10px_rgba(55,185,255,0.6)]'
                      : 'w-2 bg-border hover:bg-muted-foreground'
                  }`}
                />
              ))}
            </div>
            <button
              onClick={nextCard}
              className="text-xs font-mono font-bold text-accent hover:text-white bg-accent/10 hover:bg-accent/20 border border-accent/30 px-3.5 py-2 rounded-lg flex items-center gap-1.5 transition-all active:scale-95"
            >
              <span>Next Sector</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
