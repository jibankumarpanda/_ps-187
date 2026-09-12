"use client";

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { NAV_ITEMS } from '@/lib/constants';
import { Search, Bell, Wifi, CheckCircle2, Shield, X, ExternalLink } from 'lucide-react';
import Link from 'next/link';

interface HeaderProps {
  onOpenSearch: () => void;
}

export function Header({ onOpenSearch }: HeaderProps) {
  const pathname = usePathname();
  const [showNotifications, setShowNotifications] = useState(false);
  const [currentTime, setCurrentTime] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        }) + ' IST'
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Determine current page title
  let pageTitle = 'Dashboard';
  Object.values(NAV_ITEMS)
    .flat()
    .forEach((item) => {
      if (pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))) {
        pageTitle = item.label;
      }
    });

  if (pathname.startsWith('/cameras/')) pageTitle = 'Camera Inspection';
  if (pathname.startsWith('/events/')) pageTitle = 'Event Forensic Details';
  if (pathname.startsWith('/evidence/')) pageTitle = 'Blockchain Evidence Verification';

  return (
    <header className="h-16 flex-shrink-0 bg-background border-b border-border flex items-center justify-between px-6 z-20">
      {/* Left: Current Page / Breadcrumb */}
      <div className="flex items-center gap-3">
        <h1 className="text-base sm:text-lg font-semibold text-foreground tracking-tight">
          {pageTitle}
        </h1>
      </div>

      {/* Center: Operational System Status (Section 10) */}
      <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-card border border-border rounded-full">
        <span className="w-2 h-2 rounded-full bg-[#39D98A] animate-pulse" />
        <span className="text-xs font-semibold text-muted-foreground">System Status</span>
        <span className="text-xs font-bold text-green-500">Operational</span>
        <span className="text-muted-foreground text-xs">|</span>
        <span className="text-[11px] font-mono text-muted-foreground">{currentTime}</span>
      </div>

      {/* Right side: Search, Notifications, Connection, Profile */}
      <div className="flex items-center gap-3">
        {/* Global Search trigger */}
        <button
          onClick={onOpenSearch}
          className="flex items-center gap-2 px-3 py-1.5 bg-[#0F151C] hover:bg-muted border border-border rounded-none text-xs text-muted-foreground transition-colors"
          title="Search (Cmd+K)"
        >
          <Search className="w-3.5 h-3.5 text-accent" />
          <span className="hidden sm:inline">Search...</span>
          <kbd className="hidden lg:inline-block px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground bg-card border border-border rounded">
            ⌘K
          </kbd>
        </button>

        {/* Notifications dropdown trigger */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 rounded-none bg-card hover:bg-muted border border-border text-muted-foreground hover:text-foreground transition-colors"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-card border border-border rounded-none shadow-2xl z-50 overflow-hidden animate-fade-in">
              <div className="p-3 border-b border-border bg-muted flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground">Recent Security Alerts</span>
                <button
                  onClick={() => setShowNotifications(false)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="divide-y divide-[#263442] max-h-72 overflow-y-auto">
                <div className="p-3 hover:bg-muted transition-colors">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-red-500">CRITICAL INTRUSION</span>
                    <span className="text-[10px] text-muted-foreground font-mono">02:31 IST</span>
                  </div>
                  <p className="text-xs text-foreground mt-1">Person crossed North Fence boundary at BOP-12.</p>
                  <Link
                    href="/events/EVT-10001"
                    onClick={() => setShowNotifications(false)}
                    className="text-[11px] text-accent font-medium flex items-center gap-1 mt-1.5 hover:underline"
                  >
                    View Forensic Event <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>
                <div className="p-3 hover:bg-muted transition-colors">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-orange-500">ANPR WATCHLIST MATCH</span>
                    <span className="text-[10px] text-muted-foreground font-mono">04:55 IST</span>
                  </div>
                  <p className="text-xs text-foreground mt-1">Vehicle RJ-14-AB-1234 matched at NE Gate BOP-33.</p>
                  <Link
                    href="/alerts"
                    onClick={() => setShowNotifications(false)}
                    className="text-[11px] text-accent font-medium flex items-center gap-1 mt-1.5 hover:underline"
                  >
                    Review in Alert Center <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>
              </div>
              <div className="p-2 border-t border-border bg-[#0F151C] text-center">
                <Link
                  href="/alerts"
                  onClick={() => setShowNotifications(false)}
                  className="text-xs font-semibold text-accent hover:underline"
                >
                  View All Alerts
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Live Network Indicator */}
        <div
          className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-none bg-card border border-border"
          title="Edge AI C2 Mesh Active"
        >
          <Wifi className="w-3.5 h-3.5 text-green-500" />
          <span className="text-[11px] font-mono text-muted-foreground">12ms</span>
        </div>

        {/* User Pill */}
        <div className="flex items-center gap-2 pl-2 border-l border-border">
          <div className="w-7 h-7 rounded-full bg-muted border border-[#37B9FF]/40 flex items-center justify-center font-bold text-[11px] text-accent">
            SB
          </div>
          <div className="hidden xl:block">
            <span className="text-xs font-semibold text-foreground block leading-none">Saikat Bera</span>
            <span className="text-[10px] text-muted-foreground font-mono leading-tight">Operator</span>
          </div>
        </div>
      </div>
    </header>
  );
}
