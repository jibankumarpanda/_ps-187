"use client";

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { PageHeader } from '@/components/layout/PageHeader';
import { InvestigationWorkspace } from '@/components/investigation/InvestigationWorkspace';
import { useEvents } from '@/hooks/useEvents';

function InvestigationContent() {
  const searchParams = useSearchParams();
  const eventId = searchParams.get('eventId') || undefined;
  const { events, isLoading } = useEvents();

  if (isLoading) {
    return (
      <div className="p-12 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
        <span className="w-4 h-4 border-2 border-[#37B9FF] border-t-transparent rounded-full animate-spin" />
        Loading multi-camera forensic workspace...
      </div>
    );
  }

  return <InvestigationWorkspace events={events} initialEventId={eventId} />;
}

export default function InvestigationPage() {
  return (
    <div className="space-y-4">
      <PageHeader
        title="Investigation Workspace"
        subtitle="Multi-camera cross-correlation, spatial tracking trajectories, and chain-of-custody case assembly."
      />

      <Suspense
        fallback={
          <div className="p-12 text-center text-xs text-muted-foreground">
            Initializing investigation environment...
          </div>
        }
      >
        <InvestigationContent />
      </Suspense>
    </div>
  );
}
