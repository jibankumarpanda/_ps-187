"use client";

import React, { useRef, useState, useMemo } from 'react';
import Map, { Marker, Popup, NavigationControl, ViewStateChangeEvent } from 'react-map-gl/maplibre';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import Link from 'next/link';
import { Camera, Shield, Eye, AlertTriangle } from 'lucide-react';
import type { Camera as CameraType, BOP } from '@/types/camera';
import type { Alert } from '@/types/alert';

interface MapLibreMapProps {
  cameras: CameraType[];
  bops: BOP[];
  alerts: Alert[];
  className?: string;
  selectedCameraId?: string;
  onSelectCamera?: (id: string) => void;
}

const DEFAULT_CENTER = {
  longitude: 77.2090,
  latitude: 28.6139,
  zoom: 12,
  pitch: 60,
  bearing: -20,
};

// Use environment variable if provided, otherwise fallback to Carto's dark raster tiles without API key (which may fail)
const getTileUrl = () => {
  return process.env.NEXT_PUBLIC_MAP_TILE_URL || 'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png';
};

const getMapStyle = () => ({
  version: 8 as const,
  sources: {
    'carto-dark': {
      type: 'raster' as const,
      tiles: [getTileUrl()],
      tileSize: 256,
      attribution: process.env.NEXT_PUBLIC_MAP_ATTRIBUTION || '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    }
  },
  layers: [
    {
      id: 'carto-dark-layer',
      type: 'raster' as const,
      source: 'carto-dark',
      minzoom: 0,
      maxzoom: 22
    }
  ]
});

export default function MapLibreMap({
  cameras,
  bops,
  alerts,
  className = '',
  selectedCameraId,
  onSelectCamera,
}: MapLibreMapProps) {
  const mapRef = useRef<any>(null);
  
  // Get style dynamically so env vars are read correctly on client
  const mapStyle = useMemo(() => getMapStyle(), []);

  const [viewState, setViewState] = useState({
    longitude: cameras.length > 0 ? cameras[0].longitude : DEFAULT_CENTER.longitude,
    latitude: cameras.length > 0 ? cameras[0].latitude : DEFAULT_CENTER.latitude,
    zoom: DEFAULT_CENTER.zoom,
    pitch: DEFAULT_CENTER.pitch,
    bearing: DEFAULT_CENTER.bearing,
  });

  // Handle flying to selected camera
  React.useEffect(() => {
    if (selectedCameraId && mapRef.current) {
      const selectedCam = cameras.find(c => c.id === selectedCameraId);
      if (selectedCam) {
        mapRef.current.flyTo({
          center: [selectedCam.longitude, selectedCam.latitude],
          zoom: 16,
          duration: 1500,
          pitch: 60,
        });
      }
    }
  }, [selectedCameraId, cameras]);

  const activeMarker = useMemo(() => {
    if (!selectedCameraId) return null;
    const cam = cameras.find(c => c.id === selectedCameraId);
    if (!cam) return null;
    const camAlert = alerts.find(a => a.cameraId === cam.id && a.status !== 'RESOLVED');
    return { camera: cam, alert: camAlert };
  }, [selectedCameraId, cameras, alerts]);

  return (
    <div className={`relative w-full h-full bg-[#070D12] rounded-none overflow-hidden border border-border shadow-xl ${className}`}>
      <Map
        ref={mapRef}
        {...viewState}
        onMove={(evt: ViewStateChangeEvent) => setViewState(evt.viewState)}
        mapStyle={mapStyle}
        mapLib={maplibregl}
        style={{ width: '100%', height: '100%' }}
      >
        <NavigationControl position="bottom-right" visualizePitch={true} />

        {/* Render BOPs */}
        {bops.map(bop => (
          <Marker
            key={`bop-${bop.id}`}
            longitude={bop.longitude}
            latitude={bop.latitude}
            anchor="bottom"
          >
            <div className="flex flex-col items-center cursor-pointer transition-transform hover:scale-110">
              <div className="w-8 h-8 rounded-full border border-[#37B9FF]/60 bg-[#0F151C]/90 flex items-center justify-center shadow-[0_0_15px_rgba(55,185,255,0.3)]">
                <Shield className="w-4 h-4 text-accent" />
              </div>
              <span className="text-[10px] font-mono font-bold text-foreground bg-black/80 px-1.5 py-0.5 rounded border border-border mt-1 whitespace-nowrap">
                {bop.id}
              </span>
            </div>
          </Marker>
        ))}

        {/* Render Cameras */}
        {cameras.map(cam => {
          const camAlert = alerts.find(a => a.cameraId === cam.id && a.status !== 'RESOLVED');
          const isCritical = camAlert?.severity === 'CRITICAL';
          const isAlert = !!camAlert;
          const isOffline = cam.status === 'OFFLINE';

          let pinColor = '#39D98A';
          if (isOffline) pinColor = '#6E7B87';
          if (isAlert) pinColor = '#FF8A4C';
          if (isCritical) pinColor = '#FF5C67';

          return (
            <Marker
              key={`cam-${cam.id}`}
              longitude={cam.longitude}
              latitude={cam.latitude}
              anchor="center"
              onClick={e => {
                e.originalEvent.stopPropagation();
                if (onSelectCamera) onSelectCamera(cam.id);
              }}
            >
              <div className="relative flex items-center justify-center w-8 h-8 group hover:scale-125 transition-transform duration-200 cursor-pointer">
                {isCritical && (
                  <span className="absolute w-8 h-8 rounded-full bg-red-500 opacity-75 animate-ping" />
                )}
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center border-2 border-[#0A0F14] shadow-md z-10"
                  style={{ backgroundColor: pinColor }}
                >
                  <Camera className="w-3 h-3 text-[#0A0F14]" />
                </div>
              </div>
            </Marker>
          );
        })}

        {/* Custom Popup for Selected Camera */}
        {activeMarker && (
          <Popup
            longitude={activeMarker.camera.longitude}
            latitude={activeMarker.camera.latitude}
            anchor="bottom"
            onClose={() => { if (onSelectCamera) onSelectCamera(''); }}
            closeOnClick={false}
            offset={20}
            className="z-50"
          >
            <div className="flex flex-col min-w-[240px] p-3">
              <div className="flex items-start justify-between mb-2 pr-4">
                <div>
                  <span className="text-sm font-mono font-bold text-foreground">
                    {activeMarker.camera.name || activeMarker.camera.id}
                  </span>
                  <span className="text-xs text-muted-foreground block font-mono mt-0.5">
                    {activeMarker.camera.bopId} • {activeMarker.camera.status}
                  </span>
                </div>
              </div>

              {activeMarker.alert ? (
                <div className="p-2.5 rounded bg-red-500/10 border border-[#FF5C67]/30 my-2 text-xs">
                  <div className="font-bold text-red-500 flex items-center gap-1.5 mb-1">
                    <AlertTriangle className="w-4 h-4" /> {activeMarker.alert.eventType}
                  </div>
                  <div className="text-foreground text-[11px] leading-relaxed">{activeMarker.alert.description}</div>
                </div>
              ) : (
                <div className="text-xs text-green-500 my-2 font-medium bg-[#39D98A]/10 border border-[#39D98A]/20 p-2 rounded">
                  Sector Secured • AI Active ({activeMarker.camera.fps} FPS)
                </div>
              )}

              <div className="flex items-center gap-2 pt-3 mt-1 border-t border-border">
                <Link
                  href={`/cameras/${activeMarker.camera.id}`}
                  className="flex-1 py-2 bg-accent hover:bg-accent/90 text-[#071018] rounded-none text-xs font-bold text-center transition-colors flex items-center justify-center gap-1.5"
                >
                  <Eye className="w-4 h-4" />
                  Open Camera Feed
                </Link>
              </div>
            </div>
          </Popup>
        )}
      </Map>
    </div>
  );
}
