"use client";

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Shield, ArrowRight, Video, Lock, Radio, Activity } from 'lucide-react';
import './landing.css';
import { 
  ProblemSection, 
  SolutionSection, 
  AiCapabilitiesSection, 
  ResponseSection, 
  EvidenceSection, 
  BlockchainSection, 
  CommandCenterSection, 
  AdditionalSections, 
  LandingFooter 
} from './components/landing/LandingSections';
import { TacticalImageStack } from './components/landing/TacticalImageStack';

export default function LandingPage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const statsRef = useRef<HTMLElement>(null);
  const [hasAnimated, setHasAnimated] = useState(false);

  const toggleMenu = () => {
    setIsMenuOpen((prev) => !prev);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMenuOpen) {
        setIsMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMenuOpen]);

  // Numbers counter animation for stats
  useEffect(() => {
    if (hasAnimated || !statsRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasAnimated) {
            setHasAnimated(true);
            const counts = document.querySelectorAll('.landing-count');
            counts.forEach((count, i) => {
              const el = count as HTMLElement;
              const target = parseFloat(el.getAttribute('data-target') || '0');
              const decimals = parseInt(el.getAttribute('data-decimals') || '0', 10);
              const duration = 1400 + i * 80;
              const delay = 300 + i * 90;

              let startTimestamp: number | null = null;

              setTimeout(() => {
                const step = (timestamp: number) => {
                  if (!startTimestamp) startTimestamp = timestamp;
                  const progress = Math.min((timestamp - startTimestamp) / duration, 1);
                  const easeProgress = 1 - Math.pow(1 - progress, 3);
                  const current = Math.min(easeProgress * target, target);

                  el.innerText = current.toFixed(decimals);

                  if (progress < 1) {
                    window.requestAnimationFrame(step);
                  } else {
                    el.innerText = target.toFixed(decimals);
                  }
                };
                window.requestAnimationFrame(step);
              }, delay);
            });
            observer.disconnect();
          }
        });
      },
      { threshold: 0.2 }
    );

    observer.observe(statsRef.current);
    return () => observer.disconnect();
  }, [hasAnimated]);

  return (
    <div className="landing-container">
      <main className="landing-page">
        {/* ─── HERO BACKGROUND VIDEO ─── */}
        <div className="landing-bg" aria-hidden="true">
          <video
            className="landing-bg-video"
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
          >
            <source src="/landing.webm" type="video/webm" />
          </video>
          <div className="landing-overlay" />
        </div>

        {/* ─── FLOATING PILL HEADER ─── */}
        <header className="landing-header">
          <Link href="/" className="landing-logo overflow-hidden flex items-center justify-center p-1" aria-label="IBVAP Home">
            <Image src="/logo.png" alt="Logo" width={40} height={40} className="w-full h-full object-contain" priority />
          </Link>

          <nav className="landing-nav-pill landing-desktop-nav">
            <Link href="/" className="landing-nav-link active">
              Overview
            </Link>
            <Link href="/live" className="landing-nav-link">
              Live Feed
            </Link>
            <Link href="/map" className="landing-nav-link">
              Border Map
            </Link>
            <Link href="/evidence" className="landing-nav-link">
              Blockchain Ledger
            </Link>
          </nav>

          <Link href="/login" className="landing-sign-in landing-desktop-nav">
            <Lock className="w-3.5 h-3.5 mr-1.5" />
            Sign in
          </Link>

          {/* Mobile hamburger */}
          <button
            className="landing-mobile-only p-2.5 rounded-full bg-card text-white border border-border"
            onClick={toggleMenu}
            aria-label="Toggle Navigation Menu"
          >
            <div className="space-y-1 w-5">
              <span className="block h-0.5 bg-white rounded" />
              <span className="block h-0.5 bg-white rounded" />
              <span className="block h-0.5 bg-white rounded" />
            </div>
          </button>
        </header>

        {/* ─── HERO SECTION ─── */}
        <section className="landing-hero">
          {/* Trust Row */}
          <div
            className="landing-trust-row landing-anim"
            style={{ '--d': '0.05s' } as React.CSSProperties}
          >
            <div className="landing-avatars">
              <div className="landing-avatar a1">
                <div className="inner">
                  <Radio className="w-3 h-3 text-accent" />
                </div>
              </div>
              <div className="landing-avatar a2">
                <div className="inner">
                  <Shield className="w-3 h-3 text-green-500" />
                </div>
              </div>
              <div className="landing-avatar a3">
                <div className="inner">
                  <Activity className="w-3 h-3 text-red-500" />
                </div>
              </div>
              <div className="landing-trust-pill">
                National Border Security & C2 Operations Platform
              </div>
            </div>
          </div>

          {/* Animated Headline */}
          <h1 className="landing-headline">
            <span className="line" style={{ '--d': '0.12s' } as React.CSSProperties}>
              Autonomous Border Intelligence
            </span>
            <br />
            <span
              className="line text-accent"
              style={{ '--d': '0.28s' } as React.CSSProperties}
            >
              Designed To Protect
            </span>
          </h1>

          {/* Subheading */}
          <p
            className="landing-subhead landing-anim"
            style={{ '--d': '0.25s' } as React.CSSProperties}
          >
            Real-time edge computer vision for multi-camera object tracking, virtual-fence
            intrusion scoring, and Hyperledger Fabric blockchain evidence verification.
          </p>

          {/* CTA Buttons */}
          <div
            className="landing-cta-wrapper landing-anim"
            style={{ '--d': '0.38s' } as React.CSSProperties}
          >
            <Link href="/login" className="landing-cta flex items-center gap-2">
              <span>Enter Command Center</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </section>

        {/* ─── BOTTOM KPI METRICS ─── */}
        <footer className="landing-stats" ref={statsRef}>
          <div className="landing-stat landing-anim" style={{ '--d': '0.45s' } as React.CSSProperties}>
            <div className="landing-stat-value">
              <span>&lt;</span>
              <span className="landing-count" data-target="120" data-decimals="0">
                120
              </span>
              <span className="text-sm font-normal text-muted-foreground">ms</span>
            </div>
            <div className="landing-stat-label">Inference Latency</div>
          </div>

          <div className="landing-stat landing-anim" style={{ '--d': '0.52s' } as React.CSSProperties}>
            <div className="landing-stat-value">
              <span className="landing-count" data-target="99.99" data-decimals="2">
                99.99
              </span>
              <span className="text-sm font-normal text-muted-foreground">%</span>
            </div>
            <div className="landing-stat-label">Platform Uptime</div>
          </div>

          <div className="landing-stat landing-anim" style={{ '--d': '0.6s' } as React.CSSProperties}>
            <div className="landing-stat-value">
              <span className="landing-count" data-target="24" data-decimals="0">
                24
              </span>
              <span className="text-sm font-normal text-muted-foreground">/7</span>
            </div>
            <div className="landing-stat-label">Autonomous Watch</div>
          </div>

          <div className="landing-stat landing-anim" style={{ '--d': '0.68s' } as React.CSSProperties}>
            <div className="landing-stat-value">
              <span className="landing-count" data-target="30" data-decimals="0">
                30
              </span>
              <span className="text-sm font-normal text-accent">+</span>
            </div>
            <div className="landing-stat-label">CCTV Nodes Monitored</div>
          </div>
        </footer>
      </main>

      {/* TACTICAL RECONNAISSANCE IMAGE STACK */}
      <TacticalImageStack />

      {/* NEW MARKETING SECTIONS */}
      <ProblemSection />
      <SolutionSection />
      <AiCapabilitiesSection />
      <ResponseSection />
      <EvidenceSection />
      <BlockchainSection />
      <CommandCenterSection />
      <AdditionalSections />
      <LandingFooter />

      {/* Mobile Drawer Navigation */}
      {isMenuOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex flex-col p-6 animate-fade-in"
          onClick={() => setIsMenuOpen(false)}
        >
          <div className="flex justify-between items-center pb-6 border-b border-border">
            <div className="flex items-center gap-2 text-white font-bold">
              <div className="w-7 h-7 rounded-none bg-accent/15 border border-[#37B9FF]/30 flex items-center justify-center overflow-hidden">
                <Image src="/logo.png" alt="Logo" width={28} height={28} className="w-full h-full object-cover" />
              </div>
              <span>IBVAP Command</span>
            </div>
            <button
              onClick={() => setIsMenuOpen(false)}
              className="text-muted-foreground hover:text-white p-2"
            >
              ✕
            </button>
          </div>

          <div className="flex flex-col gap-4 py-8 text-base font-semibold">
            <Link href="/" className="text-white hover:text-accent">
              Overview
            </Link>
            <Link href="/live" className="text-white hover:text-accent">
              Live Feed
            </Link>
            <Link href="/map" className="text-white hover:text-accent">
              Border Map
            </Link>
            <Link href="/evidence" className="text-white hover:text-accent">
              Blockchain Ledger
            </Link>
          </div>

          <div className="mt-auto pt-6 border-t border-border">
            <Link
              href="/login"
              className="w-full py-3 bg-accent text-[#071018] rounded-none font-bold flex items-center justify-center gap-2"
            >
              <Lock className="w-4 h-4" />
              Sign In to Command Center
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
