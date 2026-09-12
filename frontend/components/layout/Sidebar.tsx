"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { NAV_ITEMS } from '@/lib/constants';
import * as LucideIcons from 'lucide-react';
import { Shield, ChevronLeft, ChevronRight, LogOut } from 'lucide-react';

interface SidebarProps {
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function Sidebar({ collapsed = false, onToggleCollapse }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = () => {
    router.push('/login');
  };

  return (
    <aside
      className={`${
        collapsed ? 'w-[72px]' : 'w-[260px]'
      } transition-all duration-200 flex-shrink-0 bg-[#0B1117] border-r border-border flex flex-col h-screen select-none z-30`}
    >
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-border bg-background">
        <Link href="/dashboard" className="flex items-center gap-3 overflow-hidden">
          <div className="w-9 h-9 rounded-none bg-accent/15 border border-[#37B9FF]/30 flex items-center justify-center flex-shrink-0 overflow-hidden">
            <Image src="/logo.png" alt="Logo" width={36} height={36} className="w-full h-full object-cover" priority />
          </div>
          {!collapsed && (
            <div className="truncate">
              <span className="text-sm font-bold tracking-wider text-foreground block leading-none">
                IBVAP
              </span>
              <span className="text-[9px] uppercase font-semibold text-muted-foreground tracking-[0.06em] block mt-1">
                Border Surveillance
              </span>
            </div>
          )}
        </Link>
        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className="p-1 rounded-none text-muted-foreground hover:text-foreground hover:bg-card transition-colors"
            title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        )}
      </div>

      {/* Nav groups */}
      <div className="flex-1 py-4 px-2.5 overflow-y-auto space-y-5">
        {Object.entries(NAV_ITEMS).map(([groupKey, items]) => (
          <div key={groupKey}>
            {!collapsed && (
              <div className="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-[0.06em] text-muted-foreground">
                {groupKey}
              </div>
            )}
            <div className="space-y-0.5">
              {items.map((item) => {
                // @ts-ignore
                const IconComponent = LucideIcons[item.icon] || LucideIcons.Activity;
                const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={collapsed ? item.label : undefined}
                    className={`relative flex items-center gap-3 h-[42px] px-3 rounded-none text-sm font-medium transition-colors group ${
                      isActive
                        ? 'bg-[#162636] text-foreground'
                        : 'text-[#8D99A5] hover:bg-card hover:text-foreground'
                    }`}
                  >
                    {isActive && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-accent rounded-r-full" />
                    )}
                    <IconComponent
                      className={`w-[18px] h-[18px] flex-shrink-0 ${
                        isActive ? 'text-accent' : 'text-[#8D99A5] group-hover:text-foreground'
                      }`}
                    />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* User footer */}
      <div className="p-3 border-t border-border bg-background/70">
        <div className={`flex items-center ${collapsed ? 'justify-center' : 'justify-between'} gap-2`}>
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-none bg-card border border-border flex items-center justify-center font-bold text-xs text-accent flex-shrink-0">
              SB
            </div>
            {!collapsed && (
              <div className="truncate">
                <div className="text-xs font-semibold text-foreground truncate">Saikat Bera</div>
                <div className="text-[10px] text-muted-foreground font-mono">OPERATOR • BOP-12</div>
              </div>
            )}
          </div>
          {!collapsed && (
            <button
              onClick={handleLogout}
              className="p-1.5 rounded-none text-muted-foreground hover:text-red-500 hover:bg-card transition-colors"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
