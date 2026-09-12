import React from 'react';
import { 
  Eye, 
  Clock, 
  Network, 
  ShieldCheck, 
  Camera, 
  ScanSearch, 
  Cpu, 
  Bell, 
  Save, 
  CheckCircle,
  Users,
  Car,
  Crosshair,
  CreditCard,
  UserCheck,
  Ban,
  MoveDiagonal,
  AlertTriangle,
  Moon,
  BarChart,
  Lock,
  Key,
  Shield,
  FileSearch,
  Database,
  ArrowRight,
  Activity,
  Layers
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

export function ProblemSection() {
  return (
    <section className="relative z-10 w-full max-w-5xl mx-auto px-6 py-24 flex flex-col items-center">
      <div className="text-accent text-xs font-bold tracking-[0.15em] uppercase mb-4">THE CHALLENGE</div>
      <h2 className="text-4xl md:text-[56px] font-[family-name:var(--font-display)] text-white text-center mb-6 leading-[1.15] tracking-tight">
        CCTV Can Watch.<br />Intelligence Can Understand.
      </h2>
      <p className="text-[#d0d0d0] text-center max-w-2xl mb-16 text-[17px] leading-relaxed opacity-85">
        Traditional CCTV depends heavily on continuous human monitoring. IBVAP adds an intelligence layer that automatically detects, analyzes, prioritizes, and records suspicious activity.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
        {[
          { icon: <Eye className="text-accent" />, title: 'Continuous Monitoring', desc: 'Multiple camera feeds require constant attention, making it difficult for operators to identify every critical event.' },
          { icon: <Clock className="text-red-500" />, title: 'Delayed Response', desc: 'Suspicious movement or unauthorized activity may go unnoticed until after an incident occurs.' },
          { icon: <Network className="text-green-500" />, title: 'Limited Intelligence', desc: 'Existing CCTV infrastructure often lacks integrated AI analytics, threat scoring, and centralized investigation.' },
          { icon: <ShieldCheck className="text-[#F5A623]" />, title: 'Evidence Integrity', desc: 'Digital evidence needs a reliable way to prove that it has not been altered after an incident.' },
        ].map((item, i) => (
          <div key={i} className="bg-card/80 backdrop-blur-md border border-border p-8 rounded-none flex flex-col items-start hover:border-[#37B9FF]/50 transition-colors">
            <div className="w-12 h-12 rounded-full bg-[#1A2633] flex items-center justify-center mb-6 border border-border">
              {item.icon}
            </div>
            <h3 className="text-white font-bold text-xl mb-3">{item.title}</h3>
            <p className="text-muted-foreground leading-relaxed text-sm">{item.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function SolutionSection() {
  return (
    <section className="relative z-10 w-full max-w-6xl mx-auto px-6 py-24 flex flex-col items-center">
      <div className="text-green-500 text-xs font-bold tracking-[0.15em] uppercase mb-4">THE IBVAP APPROACH</div>
      <h2 className="text-4xl md:text-[56px] font-[family-name:var(--font-display)] text-white text-center mb-6 leading-[1.15] tracking-tight">
        One Intelligence Layer for<br />Existing CCTV.
      </h2>
      <p className="text-[#d0d0d0] text-center max-w-2xl mb-16 text-[17px] leading-relaxed opacity-85">
        No need to replace your entire surveillance infrastructure. IBVAP connects with existing IP cameras and adds AI-powered intelligence on top.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
        {[
          { num: '01', icon: <Camera />, title: 'Connect', desc: 'Connect existing IP CCTV cameras through secure RTSP streams.' },
          { num: '02', icon: <ScanSearch />, title: 'Detect', desc: 'AI identifies people, vehicles, objects, and unusual activity.' },
          { num: '03', icon: <Cpu />, title: 'Analyze', desc: 'Events are evaluated using location, confidence, behavior, and threat rules.' },
          { num: '04', icon: <Bell />, title: 'Alert', desc: 'Authorized operators receive real-time security alerts.' },
          { num: '05', icon: <Save />, title: 'Preserve', desc: 'Relevant digital evidence is captured and securely stored.' },
          { num: '06', icon: <CheckCircle />, title: 'Verify', desc: 'SHA-256 hashing and Hyperledger Fabric provide an auditable evidence-integrity layer.' },
        ].map((item, i) => (
          <div key={i} className="group relative bg-[#0B1116]/80 backdrop-blur-md border border-[#1A2633] p-8 rounded-none hover:bg-card transition-all overflow-hidden">
            <div className="absolute -right-4 -top-4 text-[120px] font-bold text-[#1A2633] opacity-20 font-[family-name:var(--font-display)] leading-none select-none">
              {item.num}
            </div>
            <div className="relative z-10">
              <div className="w-10 h-10 text-accent mb-5">
                {item.icon}
              </div>
              <h3 className="text-white font-bold text-xl mb-3 flex items-center gap-3">
                <span className="text-muted-foreground text-sm font-normal">{item.num} —</span>
                {item.title}
              </h3>
              <p className="text-muted-foreground leading-relaxed text-sm">{item.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function AiCapabilitiesSection() {
  const capabilities = [
    { icon: <Users />, title: 'Person Detection', desc: 'Automatically detect people across monitored camera feeds.' },
    { icon: <Car />, title: 'Vehicle Detection', desc: 'Identify and track vehicles moving through monitored areas.' },
    { icon: <Crosshair />, title: 'Object Tracking', desc: 'Maintain movement identity across video frames for continuous tracking.' },
    { icon: <CreditCard />, title: 'ANPR', desc: 'Detect and recognize vehicle registration plates for automated vehicle intelligence.' },
    { icon: <UserCheck />, title: 'Face Verification', desc: 'Perform controlled identity verification for authorized personnel.' },
    { icon: <Ban />, title: 'Intrusion Detection', desc: 'Identify unauthorized entry into restricted or sensitive areas.' },
    { icon: <MoveDiagonal />, title: 'Virtual Fence', desc: 'Create digital surveillance boundaries and trigger alerts when boundaries are crossed.' },
    { icon: <AlertTriangle />, title: 'Suspicious Behavior', desc: 'Identify potentially abnormal or suspicious movement patterns.' },
    { icon: <Moon />, title: 'Night Detection', desc: 'Detect movement and activity in low-light surveillance environments.' },
    { icon: <BarChart />, title: 'Threat Scoring', desc: 'Prioritize incidents using an intelligent threat score.' },
  ];

  return (
    <section className="relative z-10 w-full max-w-6xl mx-auto px-6 py-24 flex flex-col items-center">
      <div className="text-[#F5A623] text-xs font-bold tracking-[0.15em] uppercase mb-4">AI INTELLIGENCE</div>
      <h2 className="text-4xl md:text-[56px] font-[family-name:var(--font-display)] text-white text-center mb-16 leading-[1.15] tracking-tight">
        From Video Streams to<br />Security Intelligence.
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 w-full">
        {capabilities.map((item, i) => (
          <div key={i} className="bg-gradient-to-b from-[#141C24] to-[#0B1116] border border-border p-6 rounded-none hover:border-[#F5A623]/50 transition-colors">
            <div className="text-[#F5A623] mb-4">
              {item.icon}
            </div>
            <h3 className="text-white font-bold text-sm mb-2">{item.title}</h3>
            <p className="text-[#8e8e8e] text-xs leading-relaxed">{item.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function ResponseSection() {
  return (
    <section className="relative z-10 w-full max-w-5xl mx-auto px-6 py-24 flex flex-col items-center">
      <div className="text-red-500 text-xs font-bold tracking-[0.15em] uppercase mb-4">REAL-TIME RESPONSE</div>
      <h2 className="text-4xl md:text-[56px] font-[family-name:var(--font-display)] text-white text-center mb-6 leading-[1.15] tracking-tight">
        Detect. Decide. Respond.
      </h2>
      <p className="text-[#d0d0d0] text-center max-w-2xl mb-16 text-[17px] leading-relaxed opacity-85">
        IBVAP converts AI detections into actionable security alerts, allowing operators to focus on incidents that require attention.
      </p>

      {/* Alert Card Mockup */}
      <div className="w-full max-w-2xl bg-[#0F151C] border border-[#FF5C67]/30 rounded-none overflow-hidden shadow-2xl shadow-[#FF5C67]/10">
        <div className="bg-red-500/10 px-6 py-4 flex items-center justify-between border-b border-[#FF5C67]/20">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
            <span className="text-red-500 font-bold text-sm tracking-wider">CRITICAL ALERT DISPATCH</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-white font-mono text-xs opacity-75">LIVE SECTOR INTERCEPT</span>
          </div>
        </div>

        {/* Tactical Image Preview with AI Bounding Box */}
        <div className="relative h-56 sm:h-64 w-full bg-black overflow-hidden border-b border-border">
          <Image
            src="/hero-images/border-fencing.jpeg"
            alt="Intrusion Detection Feed"
            fill
            className="object-cover opacity-90"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0F151C] via-transparent to-black/30 pointer-events-none" />

          {/* AI Bounding Box Overlay */}
          <div className="absolute top-[28%] left-[32%] w-36 h-28 border-2 border-red-500 bg-red-500/15 pointer-events-none animate-pulse">
            <div className="absolute -top-5 left-0 bg-red-500 text-black px-1.5 py-0.5 text-[9px] font-mono font-bold tracking-wider">
              TARGET: INTRUDER [96.2%]
            </div>
            <div className="absolute -bottom-4 right-0 text-[9px] font-mono text-white bg-black/80 px-1">
              BOP-012 LINE
            </div>
          </div>

          {/* HUD Telemetry in Feed */}
          <div className="absolute top-3 left-3 flex items-center gap-2 text-[10px] font-mono text-white bg-black/60 backdrop-blur px-2.5 py-1 border border-white/15">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
            <span>CAM-004 • LIVE STREAM 30 FPS</span>
          </div>
          <div className="absolute top-3 right-3 text-[10px] font-mono text-accent bg-black/60 backdrop-blur px-2.5 py-1 border border-white/15">
            LAT 32.418° N • LONG 74.892° E
          </div>
        </div>

        <div className="p-6 md:p-8">
          <h3 className="text-white text-2xl font-bold mb-6">RESTRICTED ZONE INTRUSION</h3>
          
          <div className="grid grid-cols-2 gap-y-6 gap-x-8 mb-8">
            <div>
              <div className="text-[#8e8e8e] text-xs uppercase tracking-wider mb-1">Camera</div>
              <div className="text-white font-mono text-sm">CAM-004</div>
            </div>
            <div>
              <div className="text-[#8e8e8e] text-xs uppercase tracking-wider mb-1">Location</div>
              <div className="text-white font-mono text-sm">BOP-012 / NORTH SECTOR</div>
            </div>
            <div>
              <div className="text-[#8e8e8e] text-xs uppercase tracking-wider mb-1">Detected</div>
              <div className="text-white font-mono text-sm text-accent">02:41:38</div>
            </div>
            <div>
              <div className="text-[#8e8e8e] text-xs uppercase tracking-wider mb-1">Object</div>
              <div className="text-white text-sm font-semibold">PERSON</div>
            </div>
            <div>
              <div className="text-[#8e8e8e] text-xs uppercase tracking-wider mb-1">Confidence</div>
              <div className="text-green-500 font-mono text-sm">96.2%</div>
            </div>
            <div>
              <div className="text-[#8e8e8e] text-xs uppercase tracking-wider mb-1">Threat Score</div>
              <div className="text-red-500 font-mono text-sm font-bold flex items-center gap-2">
                87 <span className="text-[#8e8e8e] font-normal text-xs">/ 100</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 pt-6 border-t border-border">
            <button className="px-5 py-2.5 bg-red-500 text-black font-bold text-xs rounded-none hover:bg-[#ff757e] transition-colors">
              ACKNOWLEDGE
            </button>
            <button className="px-5 py-2.5 bg-[#263442] text-white font-bold text-xs rounded-none hover:bg-[#324558] transition-colors">
              INVESTIGATE
            </button>
            <button className="px-5 py-2.5 bg-transparent border border-border text-muted-foreground font-bold text-xs rounded-none hover:text-white transition-colors">
              VIEW CAMERA
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

export function EvidenceSection() {
  return (
    <section className="relative z-10 w-full max-w-5xl mx-auto px-6 py-24 flex flex-col md:flex-row items-center gap-16">
      <div className="flex-1">
        <div className="text-[#8b5cf6] text-xs font-bold tracking-[0.15em] uppercase mb-4">DIGITAL EVIDENCE</div>
        <h2 className="text-4xl md:text-[52px] font-[family-name:var(--font-display)] text-white mb-6 leading-[1.15] tracking-tight">
          Every Incident Leaves a Verifiable Trail.
        </h2>
        <p className="text-[#d0d0d0] max-w-md mb-8 text-[17px] leading-relaxed opacity-85">
          IBVAP automatically associates digital evidence with detected events and generates a cryptographic fingerprint for integrity verification.
        </p>
        <div className="inline-flex border-l-2 border-[#8b5cf6] pl-4 py-2">
          <p className="text-[#8b5cf6] font-medium text-sm italic">
            Media stays off-chain.<br />Integrity metadata goes on-chain.
          </p>
        </div>
      </div>

      <div className="flex-1 w-full">
        <div className="bg-card border border-border rounded-none p-6 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#8b5cf6] to-[#37B9FF]"></div>
          
          <div className="flex justify-between items-start mb-6">
            <div>
              <div className="text-[#8e8e8e] text-xs uppercase tracking-wider mb-1">Evidence ID</div>
              <div className="text-white font-mono text-lg">EVD-10021</div>
            </div>
            <div className="px-3 py-1 bg-[#39D98A]/10 border border-[#39D98A]/30 rounded text-green-500 text-[10px] font-bold tracking-widest flex items-center gap-1.5">
              <CheckCircle className="w-3 h-3" /> VERIFIED
            </div>
          </div>

          {/* Cryptographically Sealed Captured Frame */}
          <div className="relative h-44 w-full rounded-none overflow-hidden mb-6 border border-border bg-black">
            <Image
              src="/hero-images/patrol-combat.jpeg"
              alt="Cryptographically Verified Incident Capture"
              fill
              className="object-cover opacity-85"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-black/30 pointer-events-none" />
            <div className="absolute top-2.5 left-2.5 px-2 py-0.5 bg-black/75 backdrop-blur border border-white/10 text-[9px] font-mono font-bold text-accent">
              SECURE INCIDENT CAPTURE FRAME #08492
            </div>
            <div className="absolute bottom-2.5 inset-x-2.5 flex items-center justify-between text-[10px] font-mono text-gray-300">
              <span className="flex items-center gap-1.5 text-green-500 font-semibold">
                <ShieldCheck className="w-3.5 h-3.5" /> FABRIC AUDIT SEALED
              </span>
              <span className="text-white/70">CAM-004 • 02:41:39 IST</span>
            </div>
          </div>

          <div className="space-y-4 mb-8">
            <div className="flex justify-between border-b border-border pb-3">
              <span className="text-[#8e8e8e] text-xs">Event</span>
              <span className="text-white font-mono text-xs">EVT-10021</span>
            </div>
            <div className="flex justify-between border-b border-border pb-3">
              <span className="text-[#8e8e8e] text-xs">Camera</span>
              <span className="text-white font-mono text-xs">CAM-004</span>
            </div>
            <div className="flex justify-between border-b border-border pb-3">
              <span className="text-[#8e8e8e] text-xs">Location</span>
              <span className="text-white font-mono text-xs">BOP-012</span>
            </div>
            <div className="flex justify-between border-b border-border pb-3">
              <span className="text-[#8e8e8e] text-xs">Captured</span>
              <span className="text-white font-mono text-xs">08 SEP 2026 • 02:41:39</span>
            </div>
          </div>

          <div className="bg-[#0B1116] rounded-none p-4 border border-border">
            <div className="text-[#8b5cf6] text-xs uppercase tracking-wider mb-2 font-bold flex items-center gap-2">
              <Lock className="w-3 h-3" /> SHA-256 FINGERPRINT
            </div>
            <div className="text-muted-foreground font-mono text-[11px] break-all">
              29397518dfcc45b637537b0299f0e1320cf972bbff28d7d9a3b9340248c82305
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function BlockchainSection() {
  return (
    <section className="relative z-10 w-full max-w-6xl mx-auto px-6 py-24 flex flex-col items-center border-t border-border/50">
      <div className="text-green-500 text-xs font-bold tracking-[0.15em] uppercase mb-4">TRUST & INTEGRITY</div>
      <h2 className="text-4xl md:text-[56px] font-[family-name:var(--font-display)] text-white text-center mb-6 leading-[1.15] tracking-tight">
        Tamper-Evident Evidence<br />With Permissioned Blockchain.
      </h2>
      <p className="text-[#d0d0d0] text-center max-w-2xl mb-16 text-[17px] leading-relaxed opacity-85">
        Hyperledger Fabric provides a permissioned ledger for recording evidence integrity information and maintaining an auditable history of verification events.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full mb-16">
        {[
          { icon: <Key />, title: 'Permissioned', desc: 'Only authorized participants can interact with the blockchain network.' },
          { icon: <Shield />, title: 'Tamper-Evident', desc: 'Evidence hashes provide a trusted reference for detecting changes to stored evidence.' },
          { icon: <FileSearch />, title: 'Auditable', desc: 'Evidence registration and verification activities can be tracked through an immutable ledger.' },
        ].map((item, i) => (
          <div key={i} className="bg-card/50 border border-border p-8 rounded-none flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-full bg-[#1A2633] flex items-center justify-center mb-5 text-green-500">
              {item.icon}
            </div>
            <h3 className="text-white font-bold text-lg mb-3">{item.title}</h3>
            <p className="text-muted-foreground leading-relaxed text-sm">{item.desc}</p>
          </div>
        ))}
      </div>

      <div className="w-full flex items-center justify-between overflow-x-auto pb-4 gap-4 px-4 text-muted-foreground font-mono text-xs opacity-70">
        <div className="flex flex-col items-center gap-3 shrink-0"><Database className="w-6 h-6" /> EVIDENCE</div>
        <ArrowRight className="shrink-0" />
        <div className="flex flex-col items-center gap-3 shrink-0"><Lock className="w-6 h-6" /> SHA-256 HASH</div>
        <ArrowRight className="shrink-0" />
        <div className="flex flex-col items-center gap-3 shrink-0 text-green-500"><Layers className="w-6 h-6" /> HYPERLEDGER FABRIC</div>
        <ArrowRight className="shrink-0" />
        <div className="flex flex-col items-center gap-3 shrink-0"><FileSearch className="w-6 h-6" /> AUDIT TRAIL</div>
        <ArrowRight className="shrink-0" />
        <div className="flex flex-col items-center gap-3 shrink-0"><CheckCircle className="w-6 h-6" /> VERIFY</div>
      </div>
    </section>
  );
}

export function CommandCenterSection() {
  return (
    <section className="relative z-10 w-full max-w-5xl mx-auto px-6 py-24 border-t border-border/50">
      <div className="flex flex-col items-start mb-12">
        <div className="text-accent text-xs font-bold tracking-[0.15em] uppercase mb-4">COMMAND CENTER</div>
        <h2 className="text-4xl md:text-[56px] font-[family-name:var(--font-display)] text-white mb-6 leading-[1.15] tracking-tight">
          One View of the<br />Entire Border.
        </h2>
        <p className="text-[#d0d0d0] max-w-xl text-[17px] leading-relaxed opacity-85">
          Monitor cameras, investigate events, respond to alerts, analyze threats, and verify evidence from one centralized operational interface.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-12">
        {[
          { label: 'Active Cameras', value: '128' },
          { label: 'Online', value: '124', color: 'text-green-500' },
          { label: 'Active Alerts', value: '06', color: 'text-red-500' },
          { label: 'AI Events Today', value: '1,284' },
          { label: 'Evidence Records', value: '342' },
          { label: 'System Health', value: '98.7%' },
        ].map((stat, i) => (
          <div key={i} className="bg-card border border-border p-5 rounded-none">
            <div className="text-[#8e8e8e] text-xs uppercase tracking-wider mb-2">{stat.label}</div>
            <div className={`font-mono text-2xl ${stat.color || 'text-white'}`}>{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Live Sector Camera Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10 w-full">
        {[
          { image: '/hero-images/siachen-flag.jpeg', sector: 'Sector 01', name: 'High-Altitude Glacier Outpost', cam: 'CAM-012', status: 'ONLINE', fps: '30 FPS' },
          { image: '/hero-images/border-fencing.jpeg', sector: 'Sector 04', name: 'International Border Fencing', cam: 'CAM-044', status: 'PATROL ACTIVE', fps: '25 FPS' },
          { image: '/hero-images/special-forces.jpeg', sector: 'Sector 09', name: 'Rapid Reaction Force Wing', cam: 'CAM-081', status: 'STANDBY', fps: '30 FPS' },
          { image: '/hero-images/wire-patrol.jpeg', sector: 'Sector 12', name: 'Perimeter Barbed Wire Grid', cam: 'CAM-105', status: 'SECURE', fps: '25 FPS' },
        ].map((item, i) => (
          <div key={i} className="group bg-[#0A0E13] border border-border overflow-hidden rounded-none hover:border-accent transition-all">
            <div className="relative h-36 w-full overflow-hidden">
              <Image src={item.image} alt={item.name} fill className="object-cover group-hover:scale-105 transition-transform duration-500" />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
              <div className="absolute top-2 left-2 px-1.5 py-0.5 bg-black/75 border border-white/15 text-[9px] font-mono text-accent font-bold">
                {item.sector}
              </div>
              <div className="absolute top-2 right-2 flex items-center gap-1 bg-black/75 px-1.5 py-0.5 text-[9px] font-mono text-green-500 border border-white/15">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                {item.status}
              </div>
              <div className="absolute bottom-1.5 left-2 text-[10px] font-mono text-white/80">
                {item.cam} • {item.fps}
              </div>
            </div>
            <div className="p-3">
              <h4 className="text-white text-xs font-bold truncate">{item.name}</h4>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        {['Live Surveillance', 'Camera Management', 'Alerts', 'Events', 'Investigation', 'Evidence', 'Border Map', 'Watchlist', 'Analytics', 'System Health'].map((module, i) => (
          <div key={i} className="px-4 py-2 border border-border rounded-full text-muted-foreground text-sm bg-[#0B1116]">
            {module}
          </div>
        ))}
      </div>
    </section>
  );
}

export function AdditionalSections() {
  return (
    <>
      {/* 9. Camera Management */}
      <section className="relative z-10 w-full max-w-5xl mx-auto px-6 py-24 flex flex-col md:flex-row items-center gap-16 border-t border-border/50">
        <div className="flex-1 w-full order-2 md:order-1">
          <div className="bg-card border border-border rounded-none p-6 max-w-md mx-auto relative overflow-hidden">
             <div className="flex justify-between items-start mb-6">
               <div>
                 <div className="text-white font-mono text-xl mb-1">CAM-004</div>
                 <div className="text-[#8e8e8e] text-xs tracking-wider">NORTH GATE • BOP-012</div>
               </div>
               <div className="text-green-500 text-xs font-bold tracking-widest flex items-center gap-2">
                 <div className="w-2 h-2 rounded-full bg-[#39D98A]"></div> ONLINE
               </div>
             </div>
             <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
               <div><span className="text-[#8e8e8e]">Resolution:</span> <span className="text-white font-mono">1080p</span></div>
               <div><span className="text-[#8e8e8e]">FPS:</span> <span className="text-white font-mono">24</span></div>
               <div><span className="text-[#8e8e8e]">Latency:</span> <span className="text-white font-mono">42ms</span></div>
               <div><span className="text-[#8e8e8e]">AI:</span> <span className="text-accent font-bold">ENABLED</span></div>
             </div>
             <div className="flex gap-3 border-t border-border pt-5">
               <button className="flex-1 py-2 bg-[#263442] text-white text-xs font-bold rounded">VIEW CAMERA</button>
               <button className="flex-1 py-2 border border-border text-muted-foreground text-xs font-bold rounded hover:text-white">EVENTS</button>
             </div>
          </div>
        </div>
        <div className="flex-1 order-1 md:order-2">
          <div className="text-accent text-xs font-bold tracking-[0.15em] uppercase mb-4">CAMERA INTELLIGENCE</div>
          <h2 className="text-4xl md:text-[48px] font-[family-name:var(--font-display)] text-white mb-6 leading-[1.15] tracking-tight">
            Your Existing Cameras.<br />Now Intelligent.
          </h2>
          <p className="text-[#d0d0d0] text-[17px] leading-relaxed opacity-85">
            Connect existing IP CCTV infrastructure to IBVAP and centrally monitor camera availability, AI processing, events, and health.
          </p>
        </div>
      </section>

      {/* 10. Border Map */}
      <section className="relative z-10 w-full max-w-5xl mx-auto px-6 py-24 flex flex-col md:flex-row items-center gap-16 border-t border-border/50">
        <div className="flex-1">
          <div className="text-[#F5A623] text-xs font-bold tracking-[0.15em] uppercase mb-4">BORDER INTELLIGENCE</div>
          <h2 className="text-4xl md:text-[48px] font-[family-name:var(--font-display)] text-white mb-6 leading-[1.15] tracking-tight">
            See the Border as a<br />Live Intelligence Network.
          </h2>
          <p className="text-[#d0d0d0] text-[17px] leading-relaxed opacity-85">
            Visualize BOPs, cameras, restricted zones, alerts, and security events across the operational area.
          </p>
        </div>
        <div className="flex-1 w-full">
           <div className="bg-card border border-[#F5A623]/30 rounded-none p-6 max-w-md mx-auto shadow-2xl">
             <div className="text-white font-bold text-lg mb-6 tracking-wide">SECTOR NORTH-04</div>
             <div className="space-y-4 text-sm font-mono text-muted-foreground">
               <div className="flex justify-between border-b border-border pb-2"><span>BOPs:</span> <span className="text-white">08</span></div>
               <div className="flex justify-between border-b border-border pb-2"><span>Cameras:</span> <span className="text-white">24</span></div>
               <div className="flex justify-between border-b border-border pb-2"><span>Online:</span> <span className="text-green-500">23</span></div>
               <div className="flex justify-between border-b border-border pb-2"><span>Active Alerts:</span> <span className="text-red-500">02</span></div>
               <div className="flex justify-between pb-2"><span>Threat Level:</span> <span className="text-[#F5A623] font-bold">MODERATE</span></div>
             </div>
           </div>
        </div>
      </section>

      {/* 11. Investigation */}
      <section className="relative z-10 w-full max-w-6xl mx-auto px-6 py-24 flex flex-col md:flex-row items-center gap-16 border-t border-border/50">
        <div className="flex-1">
          <div className="text-accent text-xs font-bold tracking-[0.15em] uppercase mb-4">SECURITY INVESTIGATION</div>
          <h2 className="text-4xl md:text-[48px] font-[family-name:var(--font-display)] text-white mb-12 leading-[1.15] tracking-tight">
            Follow Every Event<br />From Detection to Evidence.
          </h2>
          <div className="grid grid-cols-2 gap-3 text-sm text-muted-foreground">
            {[
              'Camera footage', 'Detection information', 'Event details', 'Threat score',
              'Alert history', 'Evidence', 'SHA-256 hash', 'Blockchain record', 'Audit history'
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-accent/50"></div> {item}
              </div>
            ))}
          </div>
        </div>
        <div className="flex-1 w-full bg-[#0B1116] border border-border rounded-none p-8">
           <div className="space-y-6 relative before:absolute before:inset-0 before:ml-[11px] before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-[#37B9FF]/30 before:to-transparent">
             {[
               { time: '02:41:32', text: 'Person detected.' },
               { time: '02:41:34', text: 'Restricted zone entered.' },
               { time: '02:41:36', text: 'Threat score increased.', color: 'text-[#F5A623]' },
               { time: '02:41:38', text: 'Security alert generated.', color: 'text-red-500' },
               { time: '02:41:39', text: 'Evidence captured.', color: 'text-[#8b5cf6]' },
               { time: '02:41:40', text: 'Evidence hash registered.', color: 'text-green-500' },
             ].map((step, i) => (
               <div key={i} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-card border border-[#37B9FF] text-accent shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                    <div className="w-2 h-2 bg-accent rounded-full"></div>
                  </div>
                  <div className="w-[calc(100%-3rem)] md:w-[calc(50%-2rem)] bg-[#1A2633] p-4 rounded border border-border shadow">
                    <div className="text-white font-mono text-xs mb-1">{step.time}</div>
                    <div className={`text-sm ${step.color || 'text-muted-foreground'}`}>{step.text}</div>
                  </div>
               </div>
             ))}
           </div>
        </div>
      </section>

      {/* 12. Security Section */}
      <section className="relative z-10 w-full max-w-5xl mx-auto px-6 py-24 flex flex-col items-center border-t border-border/50">
        <div className="text-green-500 text-xs font-bold tracking-[0.15em] uppercase mb-4">SECURITY BY DESIGN</div>
        <h2 className="text-4xl md:text-[48px] font-[family-name:var(--font-display)] text-white text-center mb-16 leading-[1.15] tracking-tight">
          Built for Sensitive Operations.
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
          {[
            { title: 'Role-Based Access', desc: 'Users only access the resources and operations permitted by their role.' },
            { title: 'Encrypted Credentials', desc: 'Camera credentials are protected and never exposed to the frontend.' },
            { title: 'Secure Authentication', desc: 'Protected authentication and session management for authorized operators.' },
            { title: 'Evidence Integrity', desc: 'SHA-256 fingerprints help verify that evidence has not been modified.' },
            { title: 'Permissioned Blockchain', desc: 'Evidence integrity records are maintained within an authorized blockchain network.' },
            { title: 'Audit Logging', desc: 'Important system and evidence operations are recorded for accountability.' },
          ].map((item, i) => (
             <div key={i} className="bg-card/50 border border-border p-6 rounded-none hover:border-[#39D98A]/40 transition-colors">
               <h3 className="text-white font-bold text-[15px] mb-2">{item.title}</h3>
               <p className="text-[#8e8e8e] text-sm leading-relaxed">{item.desc}</p>
             </div>
          ))}
        </div>
      </section>

      {/* 13. Architecture Section & 14. Workflow & 15. Use Cases */}
      <section className="relative z-10 w-full max-w-5xl mx-auto px-6 py-24 border-t border-border/50">
         <div className="text-accent text-xs font-bold tracking-[0.15em] uppercase mb-4 text-center">OPERATIONAL USE CASES</div>
         <h2 className="text-4xl md:text-[48px] font-[family-name:var(--font-display)] text-white text-center mb-16 leading-[1.15] tracking-tight">
           Built for Critical Border Operations.
         </h2>
         <div className="grid grid-cols-2 md:grid-cols-3 gap-4 w-full">
           {[
             { title: 'Border Outposts', desc: 'AI-assisted monitoring around sensitive BOP areas.' },
             { title: 'Check Posts', desc: 'Intelligent analysis of people and vehicles.' },
             { title: 'Border Roads', desc: 'Continuous monitoring of strategic movement corridors.' },
             { title: 'Restricted Zones', desc: 'Automatic detection of unauthorized entry.' },
             { title: 'Strategic Installations', desc: 'Centralized surveillance and threat intelligence.' },
             { title: 'Night Operations', desc: 'AI-assisted detection in low-light environments.' },
           ].map((item, i) => (
             <div key={i} className="bg-card border border-border p-6 rounded-none text-center">
               <h3 className="text-white font-bold text-sm mb-2">{item.title}</h3>
               <p className="text-[#8e8e8e] text-xs leading-relaxed">{item.desc}</p>
             </div>
           ))}
         </div>
      </section>

      {/* 16. Final CTA */}
      <section className="relative z-10 w-full max-w-4xl mx-auto px-6 py-32 flex flex-col items-center text-center">
         <div className="text-accent text-xs font-bold tracking-[0.15em] uppercase mb-4">INTELLIGENT SURVEILLANCE • SECURE EVIDENCE</div>
         <h2 className="text-5xl md:text-[64px] font-[family-name:var(--font-display)] text-white mb-8 leading-[1.1]">
           See What Your Cameras<br />Are Missing.
         </h2>
         <p className="text-[#d0d0d0] max-w-2xl mb-12 text-lg leading-relaxed opacity-85">
           Upgrade existing CCTV infrastructure with AI-powered surveillance intelligence, real-time threat detection, secure evidence management, and verifiable evidence integrity.
         </p>
         <div className="flex flex-col sm:flex-row items-center gap-4">
           <Link href="/login" className="px-8 py-4 bg-white text-black font-bold text-sm rounded-full flex items-center gap-2 hover:bg-accent hover:scale-105 transition-all shadow-[0_0_30px_rgba(255,255,255,0.2)] hover:shadow-[0_0_40px_rgba(55,185,255,0.4)]">
             ENTER COMMAND CENTER <ArrowRight className="w-4 h-4" />
           </Link>
           <button className="px-8 py-4 bg-transparent text-white font-bold text-sm rounded-full border border-white/20 hover:bg-white/5 transition-all">
             EXPLORE ARCHITECTURE
           </button>
         </div>
      </section>
    </>
  );
}

export function LandingFooter() {
  return (
    <footer className="relative z-10 w-full bg-[#070B0F] border-t border-[#1A2633] pt-20 pb-8 px-6 text-sm">
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
        <div className="md:col-span-1">
          <div className="font-[family-name:var(--font-display)] text-white text-2xl mb-2">IBVAP</div>
          <div className="text-[#8e8e8e] text-[10px] font-bold tracking-widest uppercase mb-4">
            INTELLIGENT BORDER VIDEO ANALYTICS PLATFORM
          </div>
          <p className="text-muted-foreground text-xs leading-relaxed mb-6 pl-3 border-l-2 border-border">
            Transforming existing CCTV infrastructure into intelligent, secure, and auditable surveillance.
          </p>
          <div className="flex items-center gap-2 text-green-500 text-xs font-mono font-bold">
            <div className="w-2 h-2 rounded-full bg-[#39D98A]"></div> SYSTEM OPERATIONAL
          </div>
        </div>
        
        <div>
          <div className="text-white font-bold mb-4">Platform</div>
          <ul className="space-y-2 text-[#8e8e8e] text-xs">
            <li>Dashboard</li>
            <li>Live Surveillance</li>
            <li>Cameras</li>
            <li>Alerts</li>
            <li>Events</li>
            <li>Investigation</li>
            <li>Evidence</li>
          </ul>
        </div>

        <div>
          <div className="text-white font-bold mb-4">Intelligence</div>
          <ul className="space-y-2 text-[#8e8e8e] text-xs">
            <li>AI Analytics</li>
            <li>ANPR</li>
            <li>Face Verification</li>
            <li>Intrusion Detection</li>
            <li>Threat Detection</li>
            <li>Border Map</li>
          </ul>
        </div>

        <div>
          <div className="text-white font-bold mb-4">Security</div>
          <ul className="space-y-2 text-[#8e8e8e] text-xs">
            <li>Evidence Integrity</li>
            <li>SHA-256 Verification</li>
            <li>Hyperledger Fabric</li>
            <li>Audit Trail</li>
            <li>Access Control</li>
            <li>System Health</li>
          </ul>
        </div>
      </div>

      <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center pt-8 border-t border-[#1A2633] text-[#8e8e8e] text-xs gap-4">
        <div>© 2026 IBVAP. All rights reserved.</div>
        <div className="flex gap-4 font-mono font-bold tracking-widest text-[10px]">
          <span>SECURE</span>
          <span className="text-[#263442]">•</span>
          <span>INTELLIGENT</span>
          <span className="text-[#263442]">•</span>
          <span>AUDITABLE</span>
        </div>
        <div className="font-mono">v1.0.0</div>
      </div>
    </footer>
  );
}
