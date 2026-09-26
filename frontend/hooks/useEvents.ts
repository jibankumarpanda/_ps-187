"use client";

import { useState, useEffect, useCallback } from 'react';
import { getEvents } from '@/lib/api';
import { mockEvents } from '@/lib/mock-data';
import { useWebSocket } from '@/hooks/useWebSocket';
import type { IBVAPEvent } from '@/types/event';

export function useEvents() {
  const [events, setEvents] = useState<IBVAPEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEvents = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await getEvents();
      if (Array.isArray(data) && data.length > 0) {
        setEvents(data);
      } else {
        // Fall back to pre-seeded telemetry events
        setEvents(mockEvents);
      }
    } catch (err) {
      setError('Failed to fetch events from backend');
      // Graceful fallback to mockEvents so operator always has surveillance telemetry
      setEvents(mockEvents);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Real-time WebSocket listener for newly detected surveillance events
  useWebSocket('new_event', (newEvent: any) => {
    if (!newEvent || !newEvent.eventId) return;
    setEvents((prev) => {
      if (prev.some((e) => e.eventId === newEvent.eventId)) return prev;
      return [newEvent as IBVAPEvent, ...prev];
    });
  });

  return {
    events,
    isLoading,
    error,
    refetch: fetchEvents,
  };
}
