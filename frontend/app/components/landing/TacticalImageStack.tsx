"use client";

import React, { useState } from 'react';
import Image from 'next/image';
import { Shield, Eye, ChevronRight, ChevronLeft, MapPin, Radio, Crosshair } from 'lucide-react';

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

  return (
    <div className="w-full max-w-5xl mx-auto my-12 px-4">
      {/* Section Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-accent/10 border border-accent/30 text-accent text-xs font-mono font-bold tracking-widest uppercase mb-3">
            <Radio className="w-3.5 h-3.5 animate-pulse" />
            LIVE OPERATIONAL RECONNAISSANCE
          </div>
          <h2 className="text-3xl md:text-4xl font-[family-name:var(--font-display)] text-white tracking-tight">
            Tactical Border Intelligence Stack
          </h2>
          <p className="text-muted-foreground text-sm max-w-xl mt-2">
            Real surveillance feeds processed through edge computer vision, synchronized across command sectors with cryptographic evidence generation.
          </p>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={prevCard}
            aria-label="Previous Reconnaissance Photo"
            className="w-10 h-10 rounded-none bg-[#111822] border border-border flex items-center justify-center text-white hover:border-accent hover:text-accent transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="px-3 py-2 bg-[#111822] border border-border text-xs font-mono text-muted-foreground">
            <span className="text-accent font-bold">{activeIndex + 1}</span> / {TACTICAL_CARDS.length}
          </div>
          <button
            onClick={nextCard}
            aria-label="Next Reconnaissance Photo"
            className="w-10 h-10 rounded-none bg-[#111822] border border-border flex items-center justify-center text-white hover:border-accent hover:text-accent transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Stack Container */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* Visual Stack Area (7 columns) */}
        <div className="lg:col-span-7 relative h-[380px] sm:h-[420px] w-full flex items-center justify-center select-none">
          {TACTICAL_CARDS.map((card, idx) => {
            // Calculate relative offset from active card
            const offset = (idx - activeIndex + TACTICAL_CARDS.length) % TACTICAL_CARDS.length;
            
            // Only render top 3 cards for clean performance & visual stack
            if (offset > 2) return null;

            const isTop = offset === 0;
            const rotation = isTop ? 0 : offset === 1 ? 3 : -3;
            const translateY = offset * 14;
            const scale = 1 - offset * 0.05;
            const zIndex = 30 - offset * 10;
            const opacity = 1 - offset * 0.25;

            return (
              <div
                key={card.id}
                onClick={nextCard}
                style={{
                  transform: `translateY(${translateY}px) scale(${scale}) rotate(${rotation}deg)`,
                  zIndex,
                  opacity,
                }}
                className={`absolute inset-x-0 mx-auto max-w-[540px] h-[340px] sm:h-[370px] rounded-none border border-[#2B3947] bg-[#0A0E13] overflow-hidden shadow-2xl cursor-pointer transition-all duration-500 ease-out hover:border-accent group`}
              >
                {/* Image */}
                <Image
                  src={card.image}
                  alt={card.sector}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-700"
                  priority={idx === 0}
                />

                {/* Dark Vignette & Tactical Gradients */}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent pointer-events-none" />
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,transparent_60%,rgba(0,0,0,0.85)_100%)] pointer-events-none" />

                {/* Tactical HUD Crosshairs & Grid Corner Badges */}
                <div className="absolute top-3 left-3 flex items-center gap-2 z-10 pointer-events-none">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold tracking-wider border ${card.statusColor}`}>
                    {card.status}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold tracking-wider border ${card.threatColor}`}>
                    {card.threatLevel}
                  </span>
                </div>

                <div className="absolute top-3 right-3 text-[10px] font-mono font-semibold text-white/80 bg-black/60 backdrop-blur-md px-2.5 py-1 border border-white/10 flex items-center gap-1.5 z-10 pointer-events-none">
                  <Crosshair className="w-3 h-3 text-accent" />
                  <span>AI: {card.aiConfidence}</span>
                </div>

                {/* Corner Targeting marks */}
                <div className="absolute top-2 left-2 w-3 h-3 border-t-2 border-l-2 border-accent pointer-events-none" />
                <div className="absolute top-2 right-2 w-3 h-3 border-t-2 border-r-2 border-accent pointer-events-none" />
                <div className="absolute bottom-2 left-2 w-3 h-3 border-b-2 border-l-2 border-accent pointer-events-none" />
                <div className="absolute bottom-2 right-2 w-3 h-3 border-b-2 border-r-2 border-accent pointer-events-none" />

                {/* Bottom Overlay Info */}
                <div className="absolute bottom-0 inset-x-0 p-4 sm:p-5 z-10 pointer-events-none">
                  <div className="text-accent text-[11px] font-mono font-bold tracking-widest flex items-center gap-1.5 mb-1">
                    <MapPin className="w-3 h-3" />
                    {card.sector}
                  </div>
                  <h3 className="text-white font-bold text-lg sm:text-xl drop-shadow-md">
                    {card.location}
                  </h3>
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/15 text-[11px] font-mono text-gray-300">
                    <span>{card.timestamp}</span>
                    <span className="text-accent group-hover:translate-x-1 transition-transform flex items-center gap-1">
                      Click to cycle stack <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Tactical Info Panel (5 columns) */}
        <div className="lg:col-span-5 bg-card/80 backdrop-blur-md border border-border p-6 sm:p-7 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 rounded-full blur-2xl pointer-events-none" />

          <div className="flex items-center justify-between pb-4 mb-4 border-b border-border">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-accent" />
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-foreground">
                TELEMETRY INSPECTOR
              </span>
            </div>
            <span className="text-[11px] font-mono text-green-500 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-ping" />
              ONLINE
            </span>
          </div>

          <div className="space-y-4 text-sm">
            <div>
              <div className="text-[10px] font-mono uppercase text-muted-foreground tracking-wider mb-1">
                SECTOR DISPATCH
              </div>
              <div className="text-foreground font-bold text-base">
                {current.sector}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {current.location}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="bg-[#0B1116] p-3 border border-border">
                <div className="text-[10px] font-mono text-muted-foreground uppercase">AI Confidence</div>
                <div className="text-accent font-mono font-bold text-base mt-0.5">{current.aiConfidence}</div>
              </div>
              <div className="bg-[#0B1116] p-3 border border-border">
                <div className="text-[10px] font-mono text-muted-foreground uppercase">Threat Status</div>
                <div className="text-white font-mono font-bold text-base mt-0.5">{current.threatLevel}</div>
              </div>
            </div>

            <div className="pt-2">
              <div className="text-[10px] font-mono uppercase text-muted-foreground tracking-wider mb-1">
                OPERATIONAL SUMMARY
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {current.description}
              </p>
            </div>

            <div className="pt-3 border-t border-border flex items-center justify-between">
              <div className="flex gap-1.5">
                {TACTICAL_CARDS.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveIndex(i)}
                    aria-label={`View card ${i + 1}`}
                    className={`h-1.5 rounded-none transition-all ${
                      i === activeIndex ? 'w-6 bg-accent' : 'w-2 bg-border hover:bg-muted-foreground'
                    }`}
                  />
                ))}
              </div>
              <button
                onClick={nextCard}
                className="text-xs font-mono text-accent hover:text-white flex items-center gap-1 transition-colors"
              >
                Next Sector <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
