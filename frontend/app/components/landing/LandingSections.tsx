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
  Layers,
  MapPin,
  Radio
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

export function ProblemSection() {
  return (
    <section className="relative z-10 w-full max-w-5xl mx-auto px-6 py-24 flex flex-col items-center">
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 border border-accent/30 text-accent text-xs font-mono font-bold tracking-[0.15em] uppercase mb-4 shadow-[0_0_15px_rgba(55,185,255,0.15)]">
        <Activity className="w-3.5 h-3.5" />
        <span>THE CRITICAL DEFENSE CHALLENGE</span>
      </div>
      <h2 className="text-4xl md:text-[56px] font-[family-name:var(--font-display)] text-white text-center mb-6 leading-[1.15] tracking-tight">
        CCTV Can Watch.<br />Intelligence Can Understand.
      </h2>
      <p className="text-[#d0d0d0] text-center max-w-2xl mb-16 text-[17px] leading-relaxed opacity-85">
        Traditional CCTV depends heavily on continuous human monitoring. IBVAP adds an autonomous intelligence layer that detects, classifies, prioritizes, and preserves incident evidence.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
        {[
          { icon: <Eye className="w-6 h-6 text-accent" />, color: 'border-accent/40 bg-accent/10 shadow-[0_0_20px_rgba(55,185,255,0.15)]', title: 'Continuous Sentry Fatigue', desc: 'Dozens of simultaneous camera feeds overwhelm human operators, creating blindspots during critical infiltration windows.' },
          { icon: <Clock className="w-6 h-6 text-red-500" />, color: 'border-red-500/40 bg-red-500/10 shadow-[0_0_20px_rgba(239,68,68,0.15)]', title: 'Delayed Threat Reaction', desc: 'Without automated detection, suspicious movement across perimeter fences is often identified only after an intrusion has succeeded.' },
          { icon: <Network className="w-6 h-6 text-green-400" />, color: 'border-green-500/40 bg-green-500/10 shadow-[0_0_20px_rgba(57,217,138,0.15)]', title: 'Isolated Edge Nodes', desc: 'Existing CCTV infrastructure operates in silos lacking unified cross-camera tracking, threat scoring, and command center orchestration.' },
          { icon: <ShieldCheck className="w-6 h-6 text-[#F5A623]" />, color: 'border-[#F5A623]/40 bg-[#F5A623]/10 shadow-[0_0_20px_rgba(245,166,35,0.15)]', title: 'Tamperable Evidence Chains', desc: 'Standard video files lack immutable cryptographic proofs, leaving security footage vulnerable to post-incident repudiation or modification.' },
        ].map((item, i) => (
          <div
            key={i}
            className="group relative bg-[#0B1116]/85 backdrop-blur-xl border border-border/80 hover:border-accent/50 p-8 rounded-xl flex flex-col items-start transition-all duration-300 shadow-[0_10px_30px_rgba(0,0,0,0.4)] hover:shadow-[0_15px_40px_rgba(55,185,255,0.12)] hover:-translate-y-1 overflow-hidden"
          >
            {/* Top subtle highlight line */}
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-accent/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            
            <div className={`w-14 h-14 rounded-xl flex items-center justify-center mb-6 border ${item.color} transition-transform group-hover:scale-110 duration-300`}>
              {item.icon}
            </div>
            <h3 className="text-white font-bold text-xl mb-3 tracking-tight group-hover:text-accent transition-colors">{item.title}</h3>
            <p className="text-muted-foreground leading-relaxed text-sm font-sans">{item.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function SolutionSection() {
  return (
    <section className="relative z-10 w-full max-w-6xl mx-auto px-6 py-24 flex flex-col items-center">
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/10 border border-green-500/30 text-green-400 text-xs font-mono font-bold tracking-[0.15em] uppercase mb-4 shadow-[0_0_15px_rgba(57,217,138,0.15)]">
        <Cpu className="w-3.5 h-3.5" />
        <span>THE IBVAP ARCHITECTURE</span>
      </div>
      <h2 className="text-4xl md:text-[56px] font-[family-name:var(--font-display)] text-white text-center mb-6 leading-[1.15] tracking-tight">
        One Intelligence Layer for<br />Existing CCTV.
      </h2>
      <p className="text-[#d0d0d0] text-center max-w-2xl mb-16 text-[17px] leading-relaxed opacity-85">
        No need to replace existing border surveillance hardware. IBVAP connects seamlessly to legacy RTSP streams and supercharges them with autonomous neural intelligence.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
        {[
          { num: '01', icon: <Camera className="w-6 h-6" />, title: 'Connect Streams', desc: 'Securely ingest existing IP CCTV feeds through encrypted multi-bitrate RTSP and WebRTC pipelines.' },
          { num: '02', icon: <ScanSearch className="w-6 h-6" />, title: 'Edge Neural Detection', desc: 'YOLOv11 & ByteTrack identify intruders, vehicles, drones, and boundary breaches in real-time.' },
          { num: '03', icon: <Cpu className="w-6 h-6" />, title: 'Threat Scoring Engine', desc: 'Kinematic vectors, proximity to virtual fences, and watchlist databases calculate threat indexes in under 120ms.' },
          { num: '04', icon: <Bell className="w-6 h-6" />, title: 'C2 Tactical Alerts', desc: 'Instant priority dispatch to tactical command, mobile field units, and audible alert beacons.' },
          { num: '05', icon: <Save className="w-6 h-6" />, title: 'Evidence Preservation', desc: 'High-definition incident video frames, bounding coordinates, and operator logs are securely archived.' },
          { num: '06', icon: <CheckCircle className="w-6 h-6" />, title: 'Blockchain Verification', desc: 'SHA-256 state proofs registered to Hyperledger Fabric guarantee court-admissible audit trails.' },
        ].map((item, i) => (
          <div
            key={i}
            className="group relative bg-[#0B1116]/85 backdrop-blur-xl border border-border/80 hover:border-accent/60 p-8 rounded-xl transition-all duration-300 shadow-[0_10px_30px_rgba(0,0,0,0.4)] hover:shadow-[0_15px_40px_rgba(55,185,255,0.12)] hover:-translate-y-1 overflow-hidden"
          >
            {/* Giant Watermark Number */}
            <div className="absolute -right-3 -top-3 text-[90px] font-bold text-accent/5 font-[family-name:var(--font-display)] leading-none select-none group-hover:text-accent/10 transition-colors pointer-events-none">
              {item.num}
            </div>

            {/* Top glowing edge */}
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-accent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

            <div className="relative z-10">
              <div className="w-12 h-12 rounded-lg bg-accent/10 border border-accent/25 text-accent flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-accent group-hover:text-black transition-all duration-300">
                {item.icon}
              </div>
              <h3 className="text-white font-bold text-xl mb-3 flex items-center gap-2 tracking-tight">
                <span className="text-accent font-mono text-sm font-semibold">{item.num} —</span>
                {item.title}
              </h3>
              <p className="text-muted-foreground leading-relaxed text-sm font-sans">{item.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function AiCapabilitiesSection() {
  const capabilities = [
    { icon: <Users className="w-5 h-5" />, title: 'Person Detection', desc: 'Real-time human classification under foliage, camouflage, and night conditions.' },
    { icon: <Car className="w-5 h-5" />, title: 'Vehicle Telemetry', desc: 'Track speed, direction, and categorization of off-road and convoy vehicles.' },
    { icon: <Crosshair className="w-5 h-5" />, title: 'Multi-Camera Re-ID', desc: 'Maintain persistent target identity across disparate CCTV sectors.' },
    { icon: <CreditCard className="w-5 h-5" />, title: 'ANPR Recognition', desc: 'Automatic optical character recognition for regional license plates.' },
    { icon: <UserCheck className="w-5 h-5" />, title: 'Biometric Verification', desc: 'Compare facial signatures against authorized sentry & watchlist records.' },
    { icon: <Ban className="w-5 h-5" />, title: 'Perimeter Breach', desc: 'Instant tripwire trigger upon unauthorized zone boundary crossing.' },
    { icon: <MoveDiagonal className="w-5 h-5" />, title: 'Virtual Fence Grid', desc: 'Polygon-defined virtual geofences with customizable threat tiers.' },
    { icon: <AlertTriangle className="w-5 h-5" />, title: 'Loitering Analysis', desc: 'Identify abnormal dwell time and crawling posture along fence lines.' },
    { icon: <Moon className="w-5 h-5" />, title: 'Night & Thermal CV', desc: 'Zero-lux infrared and thermal spectrum tracking under dense fog.' },
    { icon: <BarChart className="w-5 h-5" />, title: 'Threat Scoring AI', desc: 'Dynamic risk matrix evaluating target vector, velocity, and time-of-day.' },
  ];

  return (
    <section className="relative z-10 w-full max-w-6xl mx-auto px-6 py-24 flex flex-col items-center">
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#F5A623]/10 border border-[#F5A623]/30 text-[#F5A623] text-xs font-mono font-bold tracking-[0.15em] uppercase mb-4 shadow-[0_0_15px_rgba(245,166,35,0.15)]">
        <Crosshair className="w-3.5 h-3.5" />
        <span>NEURAL VISION CAPABILITIES</span>
      </div>
      <h2 className="text-4xl md:text-[56px] font-[family-name:var(--font-display)] text-white text-center mb-16 leading-[1.15] tracking-tight">
        From Video Streams to<br />Tactical Intelligence.
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 w-full">
        {capabilities.map((item, i) => (
          <div
            key={i}
            className="group relative bg-[#0B1116]/85 backdrop-blur-md border border-border/70 hover:border-[#F5A623]/50 p-5 rounded-xl transition-all duration-300 hover:-translate-y-1 shadow-lg hover:shadow-[0_10px_25px_rgba(245,166,35,0.12)] flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded-lg bg-[#141d27] border border-border/80 flex items-center justify-center text-[#F5A623] mb-3.5 group-hover:scale-110 group-hover:border-[#F5A623]/50 transition-all duration-300">
                {item.icon}
              </div>
              <h3 className="text-white font-bold text-sm mb-1.5 group-hover:text-[#F5A623] transition-colors">{item.title}</h3>
              <p className="text-muted-foreground text-xs leading-relaxed font-sans">{item.desc}</p>
            </div>
            <div className="mt-3 pt-2.5 border-t border-border/50 flex items-center justify-between text-[10px] font-mono text-muted-foreground">
              <span>MODULE #{i + 1 < 10 ? `0${i + 1}` : i + 1}</span>
              <span className="text-green-400">ONLINE</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function ResponseSection() {
  return (
    <section className="relative z-10 w-full max-w-5xl mx-auto px-6 py-24 flex flex-col items-center">
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/30 text-red-500 text-xs font-mono font-bold tracking-[0.15em] uppercase mb-4 shadow-[0_0_15px_rgba(239,68,68,0.2)]">
        <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
        <span>TACTICAL DISPATCH RESPONSE</span>
      </div>
      <h2 className="text-4xl md:text-[56px] font-[family-name:var(--font-display)] text-white text-center mb-6 leading-[1.15] tracking-tight">
        Detect. Decide. Intercept.
      </h2>
      <p className="text-[#d0d0d0] text-center max-w-2xl mb-16 text-[17px] leading-relaxed opacity-85">
        IBVAP converts raw neural detections into actionable priority alerts, empowering sentries and tactical command to neutralize intrusions instantaneously.
      </p>

      {/* Modern High-End Alert Terminal Card */}
      <div className="w-full max-w-2xl bg-[#090E14]/90 backdrop-blur-2xl border border-red-500/40 rounded-2xl overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.8),0_0_35px_rgba(239,68,68,0.18)]">
        {/* Terminal Header */}
        <div className="bg-gradient-to-r from-red-500/20 via-red-500/10 to-transparent px-6 py-4 flex items-center justify-between border-b border-red-500/30">
          <div className="flex items-center gap-3">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
            </span>
            <span className="text-red-400 font-mono font-bold text-xs sm:text-sm tracking-wider uppercase">
              DEFCON 1 • CRITICAL ALERT DISPATCH
            </span>
          </div>
          <div className="flex items-center gap-2 bg-black/60 px-2.5 py-1 rounded-md border border-white/10 text-[10px] font-mono text-white/80">
            <span className="text-red-400 font-bold">LATENCY:</span> 38 MS
          </div>
        </div>

        {/* Live Intrusion Feed with Animated Laser Reticle */}
        <div className="relative h-64 sm:h-72 w-full bg-black overflow-hidden border-b border-border/80">
          <Image
            src="/hero-images/border-fencing.jpeg"
            alt="Intrusion Detection Feed"
            fill
            unoptimized
            className="object-cover opacity-90"
          />
          {/* Scanline Sweep */}
          <div className="tactical-scanline-active" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#090E14] via-transparent to-black/40 pointer-events-none" />

          {/* High-Tech Animated Bounding Box Overlay */}
          <div className="absolute top-[26%] left-[30%] w-40 h-32 border-2 border-red-500 bg-red-500/15 pointer-events-none shadow-[0_0_20px_rgba(239,68,68,0.4)]">
            {/* Corner crosshairs */}
            <div className="absolute -top-1 -left-1 w-2.5 h-2.5 bg-red-500" />
            <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500" />
            <div className="absolute -bottom-1 -left-1 w-2.5 h-2.5 bg-red-500" />
            <div className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-red-500" />

            <div className="absolute -top-6 left-0 bg-red-500 text-black px-2 py-0.5 text-[10px] font-mono font-bold tracking-wider rounded-t shadow">
              TARGET: INTRUDER [96.8%]
            </div>
            <div className="absolute -bottom-5 right-0 text-[10px] font-mono text-white bg-black/85 backdrop-blur px-1.5 py-0.5 border border-red-500/40 rounded-b">
              VECTOR: +1.4 M/S SOUTH
            </div>
          </div>

          {/* HUD Telemetry in Feed */}
          <div className="absolute top-3.5 left-3.5 flex items-center gap-2 text-[10px] font-mono text-white bg-black/75 backdrop-blur-md px-3 py-1 rounded-md border border-white/15">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
            <span>CAM-004 • PUNJAB BOP-142 • 30 FPS</span>
          </div>
          <div className="absolute top-3.5 right-3.5 text-[10px] font-mono text-accent bg-black/75 backdrop-blur-md px-3 py-1 rounded-md border border-white/15">
            GPS: 32.4182° N, 74.8924° E
          </div>
        </div>

        {/* Telemetry Details */}
        <div className="p-6 md:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
            <div>
              <div className="text-[10px] font-mono text-red-400 uppercase tracking-widest mb-1">INCIDENT CLASSIFICATION</div>
              <h3 className="text-white text-2xl font-bold tracking-tight">RESTRICTED ZONE INTRUSION</h3>
            </div>
            <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 px-3 py-1.5 rounded-lg text-red-400 font-mono text-xs font-bold self-start">
              <span>THREAT SCORE: 87/100</span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
            {[
              { label: 'Camera Node', val: 'CAM-004' },
              { label: 'Sector Grid', val: 'BOP-012 NORTH' },
              { label: 'Timestamp', val: '02:41:38 IST', highlight: 'text-accent' },
              { label: 'Object Class', val: 'HUMAN (ADULT)' },
              { label: 'AI Confidence', val: '96.8%', highlight: 'text-green-400' },
              { label: 'Fence Trigger', val: 'ZONE-A BREACH', highlight: 'text-red-400' },
            ].map((stat, i) => (
              <div key={i} className="bg-[#0f1722]/90 p-3 rounded-lg border border-border/80">
                <div className="text-[10px] font-mono text-muted-foreground uppercase">{stat.label}</div>
                <div className={`font-mono text-sm font-bold mt-1 ${stat.highlight || 'text-white'}`}>{stat.val}</div>
              </div>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3 pt-4 border-t border-border/70">
            <button className="flex-1 min-w-[140px] px-5 py-3 bg-red-500 hover:bg-red-400 text-black font-mono font-bold text-xs rounded-lg transition-all shadow-[0_0_20px_rgba(239,68,68,0.3)] active:scale-95 flex items-center justify-center gap-2">
              <Shield className="w-4 h-4" />
              <span>ACKNOWLEDGE THREAT</span>
            </button>
            <button className="px-5 py-3 bg-[#1B2633] hover:bg-[#253547] text-white font-mono font-bold text-xs rounded-lg transition-all border border-border active:scale-95 flex items-center gap-2">
              <span>DISPATCH RAPID SQUAD</span>
            </button>
            <button className="px-4 py-3 bg-transparent hover:bg-white/5 border border-border text-gray-300 font-mono text-xs rounded-lg transition-all active:scale-95">
              <span>VIEW LOGS</span>
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
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#8b5cf6]/10 border border-[#8b5cf6]/30 text-[#8b5cf6] text-xs font-mono font-bold tracking-[0.15em] uppercase mb-4 shadow-[0_0_15px_rgba(139,92,246,0.2)]">
          <Lock className="w-3.5 h-3.5" />
          <span>CRYPTOGRAPHIC EVIDENCE CHAIN</span>
        </div>
        <h2 className="text-4xl md:text-[52px] font-[family-name:var(--font-display)] text-white mb-6 leading-[1.15] tracking-tight">
          Every Incident Leaves an Immutable Trail.
        </h2>
        <p className="text-[#d0d0d0] max-w-md mb-8 text-[17px] leading-relaxed opacity-85">
          IBVAP automatically generates cryptographic SHA-256 signatures for every captured incident frame and registers tamper-evident metadata onto Hyperledger Fabric.
        </p>
        <div className="inline-flex border-l-2 border-[#8b5cf6] pl-4 py-2 bg-[#8b5cf6]/5 rounded-r-lg">
          <p className="text-[#8b5cf6] font-medium text-sm font-mono leading-relaxed">
            High-bitrate video preserved off-chain.<br />
            Immutable cryptographic hashes anchored on-chain.
          </p>
        </div>
      </div>

      {/* Verifiable Evidence Card */}
      <div className="flex-1 w-full">
        <div className="bg-[#0B1116]/90 backdrop-blur-2xl border border-accent/25 rounded-2xl p-6 sm:p-7 shadow-[0_20px_50px_rgba(0,0,0,0.8)] relative overflow-hidden ring-1 ring-white/10">
          {/* Top Iridescent Seal Bar */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#8b5cf6] via-accent to-[#39D98A]" />
          
          <div className="flex justify-between items-start mb-6">
            <div>
              <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-1">EVIDENCE RECORD ID</div>
              <div className="text-white font-mono text-xl font-bold flex items-center gap-2">
                <span>EVD-10021</span>
                <span className="text-xs text-accent font-normal bg-accent/10 px-2 py-0.5 rounded border border-accent/30">SEALED</span>
              </div>
            </div>
            <div className="px-3 py-1.5 bg-[#39D98A]/10 border border-[#39D98A]/40 rounded-lg text-green-400 text-xs font-mono font-bold tracking-wider flex items-center gap-2 shadow-[0_0_15px_rgba(57,217,138,0.2)]">
              <CheckCircle className="w-3.5 h-3.5" /> FABRIC VERIFIED
            </div>
          </div>

          {/* Cryptographically Sealed Captured Frame */}
          <div className="relative h-48 w-full rounded-xl overflow-hidden mb-6 border border-border/80 bg-black">
            <Image
              src="/hero-images/patrol-combat.jpeg"
              alt="Cryptographically Verified Incident Capture"
              fill
              unoptimized
              className="object-cover opacity-90"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-black/30 pointer-events-none" />
            <div className="absolute top-3 left-3 px-2.5 py-1 bg-black/80 backdrop-blur-md border border-white/15 text-[10px] font-mono font-bold text-accent rounded">
              SEALED INCIDENT FRAME #08492
            </div>
            <div className="absolute bottom-3 inset-x-3 flex items-center justify-between text-[10px] font-mono text-gray-300">
              <span className="flex items-center gap-1.5 text-green-400 font-semibold bg-black/60 px-2 py-0.5 rounded">
                <ShieldCheck className="w-3.5 h-3.5" /> FABRIC BLOCK #18,492
              </span>
              <span className="text-white/80 bg-black/60 px-2 py-0.5 rounded">CAM-004 • 02:41:39 IST</span>
            </div>
          </div>

          {/* Metadata Parameters */}
          <div className="space-y-2.5 mb-6 text-xs font-mono">
            <div className="flex justify-between items-center bg-[#0e1620]/90 p-2.5 rounded-lg border border-border/70">
              <span className="text-muted-foreground">Incident Trigger</span>
              <span className="text-white font-bold">EVT-10021 (ZONE INTRUSION)</span>
            </div>
            <div className="flex justify-between items-center bg-[#0e1620]/90 p-2.5 rounded-lg border border-border/70">
              <span className="text-muted-foreground">Camera Node</span>
              <span className="text-accent font-bold">CAM-004 / BOP-012 PUNJAB</span>
            </div>
            <div className="flex justify-between items-center bg-[#0e1620]/90 p-2.5 rounded-lg border border-border/70">
              <span className="text-muted-foreground">Timestamp Anchor</span>
              <span className="text-white font-bold">08 SEP 2026 • 02:41:39.412 IST</span>
            </div>
          </div>

          {/* SHA-256 Hash Box */}
          <div className="bg-[#080d12] rounded-xl p-4 border border-[#8b5cf6]/30 shadow-inner">
            <div className="text-[#8b5cf6] text-[10px] font-mono uppercase tracking-widest mb-1.5 font-bold flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Lock className="w-3 h-3" /> SHA-256 HASH FINGERPRINT
              </span>
              <span className="text-green-400 text-[9px]">MATCH CONFIRMED</span>
            </div>
            <div className="text-gray-300 font-mono text-[11px] break-all leading-relaxed select-all">
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
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/10 border border-green-500/30 text-green-400 text-xs font-mono font-bold tracking-[0.15em] uppercase mb-4 shadow-[0_0_15px_rgba(57,217,138,0.15)]">
        <Shield className="w-3.5 h-3.5" />
        <span>PERMISSIONED INTEGRITY</span>
      </div>
      <h2 className="text-4xl md:text-[56px] font-[family-name:var(--font-display)] text-white text-center mb-6 leading-[1.15] tracking-tight">
        Tamper-Evident Evidence<br />With Permissioned Blockchain.
      </h2>
      <p className="text-[#d0d0d0] text-center max-w-2xl mb-16 text-[17px] leading-relaxed opacity-85">
        Hyperledger Fabric maintains a permissioned distributed ledger for verifying digital chain-of-custody, guaranteeing that video evidence cannot be altered after an incident.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full mb-16">
        {[
          { icon: <Key className="w-6 h-6" />, title: 'Permissioned Access', desc: 'Only certified defense nodes, command posts, and legal auditors can query or commit evidence verification blocks.' },
          { icon: <Shield className="w-6 h-6" />, title: 'Tamper-Evident Signatures', desc: 'SHA-256 cryptographic fingerprints instantly flag any frame tampering, compression loss, or metadata alteration.' },
          { icon: <FileSearch className="w-6 h-6" />, title: 'Auditable Chain of Custody', desc: 'Every operator verification, export event, and judicial validation is immutably inscribed into block history.' },
        ].map((item, i) => (
          <div
            key={i}
            className="group relative bg-[#0B1116]/85 backdrop-blur-xl border border-border/80 hover:border-green-500/50 p-8 rounded-xl flex flex-col items-center text-center transition-all duration-300 shadow-[0_10px_30px_rgba(0,0,0,0.4)] hover:shadow-[0_15px_40px_rgba(57,217,138,0.12)] hover:-translate-y-1 overflow-hidden"
          >
            <div className="w-14 h-14 rounded-xl bg-green-500/10 border border-green-500/30 flex items-center justify-center mb-6 text-green-400 group-hover:scale-110 transition-transform duration-300 shadow-[0_0_15px_rgba(57,217,138,0.15)]">
              {item.icon}
            </div>
            <h3 className="text-white font-bold text-lg mb-3 tracking-tight group-hover:text-green-400 transition-colors">{item.title}</h3>
            <p className="text-muted-foreground leading-relaxed text-sm font-sans">{item.desc}</p>
          </div>
        ))}
      </div>

      {/* Pipeline Visual Ribbon */}
      <div className="w-full flex items-center justify-between overflow-x-auto pb-4 gap-4 px-6 text-xs font-mono bg-[#0B1116]/70 border border-border/80 rounded-xl p-4 backdrop-blur-md">
        <div className="flex flex-col items-center gap-2 shrink-0 text-gray-300"><Database className="w-5 h-5 text-accent" /> <span>EVIDENCE CAPTURE</span></div>
        <ArrowRight className="shrink-0 text-muted-foreground" />
        <div className="flex flex-col items-center gap-2 shrink-0 text-gray-300"><Lock className="w-5 h-5 text-[#8b5cf6]" /> <span>SHA-256 HASH</span></div>
        <ArrowRight className="shrink-0 text-muted-foreground" />
        <div className="flex flex-col items-center gap-2 shrink-0 text-green-400 font-bold"><Layers className="w-5 h-5" /> <span>FABRIC CONSENSUS</span></div>
        <ArrowRight className="shrink-0 text-muted-foreground" />
        <div className="flex flex-col items-center gap-2 shrink-0 text-gray-300"><FileSearch className="w-5 h-5 text-[#F5A623]" /> <span>IMMUTABLE AUDIT</span></div>
        <ArrowRight className="shrink-0 text-muted-foreground" />
        <div className="flex flex-col items-center gap-2 shrink-0 text-green-400"><CheckCircle className="w-5 h-5" /> <span>LEGAL VERIFICATION</span></div>
      </div>
    </section>
  );
}

export function CommandCenterSection() {
  return (
    <section className="relative z-10 w-full max-w-5xl mx-auto px-6 py-24 border-t border-border/50">
      <div className="flex flex-col items-start mb-12">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 border border-accent/30 text-accent text-xs font-mono font-bold tracking-[0.15em] uppercase mb-4 shadow-[0_0_15px_rgba(55,185,255,0.15)]">
          <Activity className="w-3.5 h-3.5" />
          <span>COMMAND CENTER OPERATIONS</span>
        </div>
        <h2 className="text-4xl md:text-[56px] font-[family-name:var(--font-display)] text-white mb-6 leading-[1.15] tracking-tight">
          One Integrated View of the<br />Entire National Frontier.
        </h2>
        <p className="text-[#d0d0d0] max-w-xl text-[17px] leading-relaxed opacity-85">
          Orchestrate multi-sector cameras, investigate anomalies, dispatch patrols, and verify evidence integrity from a single centralized interface.
        </p>
      </div>

      {/* High-Tech Metrics Capsules */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-12">
        {[
          { label: 'Active Cameras', value: '128', sub: 'All Sectors' },
          { label: 'Online Streams', value: '124', color: 'text-green-400', sub: '96.8% Ingest Rate' },
          { label: 'Active Alerts', value: '06', color: 'text-red-500', sub: '2 High Priority' },
          { label: 'AI Events Today', value: '1,284', sub: 'Edge Inferred' },
          { label: 'Evidence Sealed', value: '342', color: 'text-accent', sub: 'Fabric Registered' },
          { label: 'System Uptime', value: '99.99%', color: 'text-green-400', sub: 'Zero Dropouts' },
        ].map((stat, i) => (
          <div
            key={i}
            className="group bg-[#0B1116]/85 backdrop-blur-md border border-border/80 hover:border-accent/50 p-5 rounded-xl transition-all duration-300 shadow-md hover:-translate-y-0.5"
          >
            <div className="text-muted-foreground text-xs font-mono uppercase tracking-wider mb-1">{stat.label}</div>
            <div className={`font-mono text-2xl font-bold ${stat.color || 'text-white'}`}>{stat.value}</div>
            <div className="text-[10px] font-mono text-muted-foreground/70 mt-1">{stat.sub}</div>
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
          <div
            key={i}
            className="group bg-[#0A0E13] border border-border/80 hover:border-accent rounded-xl overflow-hidden transition-all duration-300 shadow-lg hover:shadow-[0_10px_25px_rgba(55,185,255,0.15)] hover:-translate-y-1"
          >
            <div className="relative h-36 w-full overflow-hidden">
              <Image src={item.image} alt={item.name} fill unoptimized className="object-cover group-hover:scale-105 transition-transform duration-500" />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
              <div className="absolute top-2 left-2 px-2 py-0.5 bg-black/80 backdrop-blur border border-white/15 text-[9px] font-mono text-accent font-bold rounded">
                {item.sector}
              </div>
              <div className="absolute top-2 right-2 flex items-center gap-1.5 bg-black/80 backdrop-blur px-2 py-0.5 text-[9px] font-mono text-green-400 border border-white/15 rounded">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                {item.status}
              </div>
              <div className="absolute bottom-2 left-2 text-[10px] font-mono text-white/90 bg-black/60 px-1.5 py-0.5 rounded backdrop-blur">
                {item.cam} • {item.fps}
              </div>
            </div>
            <div className="p-3.5 bg-[#0B1116]">
              <h4 className="text-white text-xs font-bold truncate group-hover:text-accent transition-colors">{item.name}</h4>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2.5">
        {['Live Surveillance', 'Camera Management', 'Alerts Dispatch', 'AI Events', 'Tactical Investigation', 'Blockchain Evidence', 'Border Map', 'Watchlist', 'Analytics', 'System Health'].map((module, i) => (
          <div key={i} className="px-3.5 py-1.5 border border-border/70 rounded-lg text-muted-foreground text-xs font-mono bg-[#0B1116]/80 hover:text-white hover:border-accent/40 transition-colors">
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
          <div className="bg-[#0B1116]/90 backdrop-blur-2xl border border-accent/30 rounded-2xl p-6 sm:p-7 max-w-md mx-auto relative overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.8),0_0_30px_rgba(55,185,255,0.1)] ring-1 ring-white/10">
             <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-accent to-green-400" />
             <div className="flex justify-between items-start mb-6">
               <div>
                 <div className="text-white font-mono text-2xl font-bold mb-1 flex items-center gap-2">
                   <span>CAM-004</span>
                   <span className="text-[10px] text-accent bg-accent/15 px-2 py-0.5 rounded border border-accent/30 font-normal">RTSP-01</span>
                 </div>
                 <div className="text-muted-foreground text-xs font-mono tracking-wider">NORTH GATE • BOP-012 PUNJAB</div>
               </div>
               <div className="text-green-400 text-xs font-mono font-bold tracking-widest flex items-center gap-2 bg-green-500/10 px-2.5 py-1 rounded-full border border-green-500/30 shadow-[0_0_10px_rgba(57,217,138,0.2)]">
                 <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" /> ONLINE
               </div>
             </div>
             <div className="grid grid-cols-2 gap-3 mb-6 text-xs font-mono">
               <div className="bg-[#0e1620]/90 p-2.5 rounded-lg border border-border/80">
                 <span className="text-muted-foreground block text-[10px] uppercase">Stream Resolution</span>
                 <span className="text-white font-bold text-sm">1080p FHD</span>
               </div>
               <div className="bg-[#0e1620]/90 p-2.5 rounded-lg border border-border/80">
                 <span className="text-muted-foreground block text-[10px] uppercase">Frame Rate</span>
                 <span className="text-white font-bold text-sm">30 FPS</span>
               </div>
               <div className="bg-[#0e1620]/90 p-2.5 rounded-lg border border-border/80">
                 <span className="text-muted-foreground block text-[10px] uppercase">Edge Latency</span>
                 <span className="text-accent font-bold text-sm">38 ms</span>
               </div>
               <div className="bg-[#0e1620]/90 p-2.5 rounded-lg border border-border/80">
                 <span className="text-muted-foreground block text-[10px] uppercase">AI Detection</span>
                 <span className="text-green-400 font-bold text-sm flex items-center gap-1">
                   <span className="w-1.5 h-1.5 rounded-full bg-green-400" /> ACTIVE
                 </span>
               </div>
             </div>
             <div className="flex gap-3 border-t border-border/80 pt-5">
               <button className="flex-1 py-2.5 bg-accent hover:bg-[#5ac5ff] text-black text-xs font-mono font-bold rounded-lg transition-all shadow-[0_0_15px_rgba(55,185,255,0.3)] active:scale-95">VIEW CAMERA</button>
               <button className="flex-1 py-2.5 border border-border/80 text-gray-300 hover:text-white hover:border-accent/40 text-xs font-mono font-bold rounded-lg transition-all active:scale-95">EVENTS LOG</button>
             </div>
          </div>
        </div>
        <div className="flex-1 order-1 md:order-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 border border-accent/30 text-accent text-xs font-mono font-bold tracking-[0.15em] uppercase mb-4 shadow-[0_0_15px_rgba(55,185,255,0.15)]">
            <Camera className="w-3.5 h-3.5" />
            <span>CAMERA INTELLIGENCE</span>
          </div>
          <h2 className="text-4xl md:text-[48px] font-[family-name:var(--font-display)] text-white mb-6 leading-[1.15] tracking-tight">
            Your Existing Cameras.<br />Now Fully Intelligent.
          </h2>
          <p className="text-[#d0d0d0] text-[17px] leading-relaxed opacity-85">
            Connect existing IP CCTV infrastructure to IBVAP and centrally orchestrate stream availability, neural analytics, threat rules, and hardware health.
          </p>
        </div>
      </section>

      {/* 10. Border Map */}
      <section className="relative z-10 w-full max-w-5xl mx-auto px-6 py-24 flex flex-col md:flex-row items-center gap-16 border-t border-border/50">
        <div className="flex-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#F5A623]/10 border border-[#F5A623]/30 text-[#F5A623] text-xs font-mono font-bold tracking-[0.15em] uppercase mb-4 shadow-[0_0_15px_rgba(245,166,35,0.15)]">
            <MapPin className="w-3.5 h-3.5" />
            <span>BORDER INTELLIGENCE MAP</span>
          </div>
          <h2 className="text-4xl md:text-[48px] font-[family-name:var(--font-display)] text-white mb-6 leading-[1.15] tracking-tight">
            See the Border as a<br />Live Tactical Network.
          </h2>
          <p className="text-[#d0d0d0] text-[17px] leading-relaxed opacity-85">
            Visualize outpost clusters, camera telemetry, restricted geofences, intrusions, and sentry dispatches across the operational zone.
          </p>
        </div>
        <div className="flex-1 w-full">
           <div className="bg-[#0B1116]/90 backdrop-blur-2xl border border-[#F5A623]/35 rounded-2xl p-6 sm:p-7 max-w-md mx-auto shadow-[0_20px_50px_rgba(0,0,0,0.8),0_0_30px_rgba(245,166,35,0.12)] ring-1 ring-white/10">
             <div className="flex justify-between items-center mb-6">
               <div className="text-white font-mono font-bold text-lg tracking-wide flex items-center gap-2">
                 <span className="w-2 h-2 rounded-full bg-[#F5A623] animate-pulse" />
                 <span>SECTOR NORTH-04</span>
               </div>
               <span className="text-xs font-mono text-[#F5A623] bg-[#F5A623]/15 px-2.5 py-1 rounded-full border border-[#F5A623]/30 font-semibold">
                 DEFCON 3
               </span>
             </div>
             <div className="space-y-3 text-xs font-mono text-muted-foreground">
               <div className="flex justify-between items-center bg-[#0e1620]/90 p-2.5 rounded-lg border border-border/70"><span>Active BOPs:</span> <span className="text-white font-bold text-sm">08 Outposts</span></div>
               <div className="flex justify-between items-center bg-[#0e1620]/90 p-2.5 rounded-lg border border-border/70"><span>Camera Nodes:</span> <span className="text-white font-bold text-sm">24 Feeds</span></div>
               <div className="flex justify-between items-center bg-[#0e1620]/90 p-2.5 rounded-lg border border-border/70"><span>Online Streams:</span> <span className="text-green-400 font-bold text-sm">23 / 24</span></div>
               <div className="flex justify-between items-center bg-[#0e1620]/90 p-2.5 rounded-lg border border-border/70"><span>Active Alerts:</span> <span className="text-red-400 font-bold text-sm">02 Critical</span></div>
               <div className="flex justify-between items-center bg-[#0e1620]/90 p-2.5 rounded-lg border border-border/70"><span>Threat Posture:</span> <span className="text-[#F5A623] font-bold text-sm">ELEVATED WATCH</span></div>
             </div>
           </div>
        </div>
      </section>

      {/* 11. Investigation */}
      <section className="relative z-10 w-full max-w-6xl mx-auto px-6 py-24 flex flex-col md:flex-row items-center gap-16 border-t border-border/50">
        <div className="flex-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 border border-accent/30 text-accent text-xs font-mono font-bold tracking-[0.15em] uppercase mb-4 shadow-[0_0_15px_rgba(55,185,255,0.15)]">
            <FileSearch className="w-3.5 h-3.5" />
            <span>SECURITY INVESTIGATION</span>
          </div>
          <h2 className="text-4xl md:text-[48px] font-[family-name:var(--font-display)] text-white mb-12 leading-[1.15] tracking-tight">
            Follow Every Event<br />From Detection to Evidence.
          </h2>
          <div className="grid grid-cols-2 gap-3 text-sm text-muted-foreground">
            {[
              'Camera footage', 'Detection information', 'Event details', 'Threat score',
              'Alert history', 'Evidence', 'SHA-256 hash', 'Blockchain record', 'Audit history'
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2 font-mono text-xs">
                <div className="w-1.5 h-1.5 rounded-full bg-accent" /> {item}
              </div>
            ))}
          </div>
        </div>
        <div className="flex-1 w-full bg-[#0B1116]/85 backdrop-blur-xl border border-border/80 rounded-2xl p-8 shadow-[0_20px_50px_rgba(0,0,0,0.6)]">
           <div className="space-y-6 relative before:absolute before:inset-0 before:ml-[11px] before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-[#37B9FF]/40 before:to-transparent">
             {[
               { time: '02:41:32', text: 'Person detected at perimeter line.' },
               { time: '02:41:34', text: 'Restricted virtual fence breached.' },
               { time: '02:41:36', text: 'Threat score elevated to 87/100.', color: 'text-[#F5A623]' },
               { time: '02:41:38', text: 'DEFCON 1 tactical alert dispatched.', color: 'text-red-400' },
               { time: '02:41:39', text: 'High-res evidence frame preserved.', color: 'text-[#8b5cf6]' },
               { time: '02:41:40', text: 'SHA-256 hash anchored to Fabric.', color: 'text-green-400' },
             ].map((step, i) => (
               <div key={i} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-card border border-[#37B9FF] text-accent shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                    <div className="w-2 h-2 bg-accent rounded-full animate-pulse"></div>
                  </div>
                  <div className="w-[calc(100%-3rem)] md:w-[calc(50%-2rem)] bg-[#0e1620]/90 p-4 rounded-xl border border-border/80 shadow-md">
                    <div className="text-accent font-mono text-xs mb-1 font-semibold">{step.time} IST</div>
                    <div className={`text-sm font-sans ${step.color || 'text-gray-300'}`}>{step.text}</div>
                  </div>
               </div>
             ))}
           </div>
        </div>
      </section>

      {/* 12. Security Section */}
      <section className="relative z-10 w-full max-w-5xl mx-auto px-6 py-24 flex flex-col items-center border-t border-border/50">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/10 border border-green-500/30 text-green-400 text-xs font-mono font-bold tracking-[0.15em] uppercase mb-4 shadow-[0_0_15px_rgba(57,217,138,0.15)]">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>SECURITY BY DESIGN</span>
        </div>
        <h2 className="text-4xl md:text-[48px] font-[family-name:var(--font-display)] text-white text-center mb-16 leading-[1.15] tracking-tight">
          Built for Sensitive Operations.
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 w-full">
          {[
            { title: 'Role-Based Access Control', desc: 'Granular permissions restrict operator actions strictly according to assigned defense duties.' },
            { title: 'Encrypted RTSP Credentials', desc: 'Camera credentials are encrypted at rest and never exposed to the frontend browser.' },
            { title: 'Hardened JWT Sessions', desc: 'Cryptographically signed tokens with strict expiration and automated revocation on idle.' },
            { title: 'SHA-256 Fingerprints', desc: 'Every captured digital asset generates an immutable checksum preventing post-facto alteration.' },
            { title: 'Permissioned Fabric Ledger', desc: 'Audit trail verified across authorized defense peer nodes with Byzantine fault tolerance.' },
            { title: 'Immutable Audit Trails', desc: 'Every user search, video download, and status update is logged with forensic precision.' },
          ].map((item, i) => (
             <div
               key={i}
               className="group bg-[#0B1116]/85 backdrop-blur-xl border border-border/80 hover:border-green-500/50 p-6 rounded-xl transition-all duration-300 shadow-md hover:shadow-[0_10px_25px_rgba(57,217,138,0.12)] hover:-translate-y-1"
             >
               <h3 className="text-white font-bold text-base mb-2 group-hover:text-green-400 transition-colors tracking-tight">{item.title}</h3>
               <p className="text-muted-foreground text-xs leading-relaxed font-sans">{item.desc}</p>
             </div>
          ))}
        </div>
      </section>

      {/* 13. Operational Use Cases */}
      <section className="relative z-10 w-full max-w-5xl mx-auto px-6 py-24 border-t border-border/50">
         <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 border border-accent/30 text-accent text-xs font-mono font-bold tracking-[0.15em] uppercase mb-4 mx-auto block w-max shadow-[0_0_15px_rgba(55,185,255,0.15)]">
           <Radio className="w-3.5 h-3.5 inline mr-1" />
           <span>OPERATIONAL DEPLOYMENTS</span>
         </div>
         <h2 className="text-4xl md:text-[48px] font-[family-name:var(--font-display)] text-white text-center mb-16 leading-[1.15] tracking-tight">
           Engineered for Critical Border Sectors.
         </h2>
         <div className="grid grid-cols-2 md:grid-cols-3 gap-4 w-full">
           {[
             { title: 'Frontier Outposts (BOPs)', desc: 'Autonomous sentry coverage across high-risk perimeter lines.' },
             { title: 'Integrated Check Posts', desc: 'ANPR and vehicle biometric validation at entry check-points.' },
             { title: 'Strategic Patrol Corridors', desc: 'Multi-camera handover tracking across desert and mountain roads.' },
             { title: 'Restricted Defense Zones', desc: 'Zero-tolerance virtual tripwires with immediate C2 sirens.' },
             { title: 'High-Altitude Forward Bases', desc: 'Extreme-weather sub-zero monitoring with infrared sensors.' },
             { title: 'Night Sentry Operations', desc: 'Zero-lux thermal computer vision detecting crawling targets.' },
           ].map((item, i) => (
             <div
               key={i}
               className="group bg-[#0B1116]/85 backdrop-blur-xl border border-border/80 hover:border-accent/50 p-6 rounded-xl transition-all duration-300 shadow-md hover:shadow-[0_10px_25px_rgba(55,185,255,0.12)] hover:-translate-y-1 text-center"
             >
               <h3 className="text-white font-bold text-sm mb-2 group-hover:text-accent transition-colors tracking-tight">{item.title}</h3>
               <p className="text-muted-foreground text-xs leading-relaxed font-sans">{item.desc}</p>
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
