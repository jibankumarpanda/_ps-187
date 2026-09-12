import dynamic from 'next/dynamic';
import React from 'react';
import type { Camera as CameraType, BOP } from '@/types/camera';
import type { Alert } from '@/types/alert';

// Dynamically import the MapLibreMap component
// MapLibre is generally safer for SSR but Next.js dynamic is still good for heavy client libraries
const MapLibreMap = dynamic(() => import('./MapLibreMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full min-h-[400px] flex items-center justify-center bg-[#070D12] rounded-none border border-border">
      <div className="flex flex-col items-center gap-4">
        <div className="w-8 h-8 border-2 border-[#37B9FF] border-t-transparent rounded-full animate-spin"></div>
        <span className="text-muted-foreground font-mono text-sm">Initializing Tactical Map...</span>
      </div>
    </div>
  ),
});

interface BorderMapProps {
  cameras: CameraType[];
  bops: BOP[];
  alerts: Alert[];
  className?: string;
  selectedCameraId?: string;
  onSelectCamera?: (id: string) => void;
}

export function DynamicBorderMap(props: BorderMapProps) {
  return <MapLibreMap {...props} />;
}
