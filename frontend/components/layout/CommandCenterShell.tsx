"use client";

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { GlobalSearchModal } from '@/components/ui/GlobalSearchModal';
import { ToastProvider, useToast } from '@/components/ui/Toast';
import { wsClient } from '@/lib/websocket';

function ShellInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const { showToast } = useToast();

  const isExcludedPage = pathname === '/login' || pathname === '/';

  // Global keyboard shortcut for search (Cmd+K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Connect mock websocket for real-time alerts
  useEffect(() => {
    wsClient.connect();

    const handleNewAlert = (data: Record<string, unknown>) => {
      if (data?.alertId) {
        showToast({
          title: `Active Alert: ${data.alertId}`,
          message: `${data.eventType} detected (${data.severity})`,
          type: data.severity === 'CRITICAL' ? 'error' : 'warning',
        });
      }
    };

    wsClient.on('new_alert', handleNewAlert);

    return () => {
      wsClient.off('new_alert', handleNewAlert);
      wsClient.disconnect();
    };
  }, [showToast]);

  if (isExcludedPage) {
    return <main className="h-screen overflow-y-auto overflow-x-hidden">{children}</main>;
  }

  return (
    <div className="flex h-screen bg-background text-foreground font-sans overflow-hidden">
      {/* Persistent Left Sidebar */}
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden min-w-0">
        <Header onOpenSearch={() => setIsSearchOpen(true)} />
        <main className="flex-1 overflow-y-auto bg-background p-5 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>

      {/* Global Command Center Search Modal */}
      <GlobalSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
      />
    </div>
  );
}

export function CommandCenterShell({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <ShellInner>{children}</ShellInner>
    </ToastProvider>
  );
}
