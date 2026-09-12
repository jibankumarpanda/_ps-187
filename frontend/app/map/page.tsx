"use client";

import React, { useState, useEffect } from 'react';
import { Map, Layers, Radio, Camera, ShieldAlert, RefreshCw, Eye } from 'lucide-react';
import Link from 'next/link';
import { PageHeader } from '@/components/layout/PageHeader';
import { DynamicBorderMap } from '@/components/map/DynamicBorderMap';
import { getCameras, getBOPs, getAlerts } from '@/lib/api';
import type { Camera as CameraType, BOP } from '@/types/camera';
import type { Alert } from '@/types/alert';

export default function MapPage() {
  const [cameras, setCameras] = useState<CameraType[]>([]);
  const [bops, setBops] = useState<BOP[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCameraId, setSelectedCameraId] = useState<string | undefined>();

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [camsData, bopsData, alertsData] = await Promise.all([
        getCameras(),
        getBOPs(),
        getAlerts(),
      ]);
      setCameras(camsData);
      setBops(bopsData);
      setAlerts(alertsData);
    } catch (err: any) {
      console.error('Failed to load map data:', err);
      if (err.message?.includes('token') || err.message?.includes('failed (401)')) {
         window.location.href = '/login';
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const activeAlerts = alerts.filter(a => a.status !== 'RESOLVED');

  return (
    <div className="space-y-4 flex flex-col h-[calc(100vh-100px)]">
      <PageHeader
        title="Border Tactical Map"
        subtitle="Geospatial tactical view of all Border Outposts (BOPs), sensor coverage cones, and intrusion alerts."
        actions={
          <button
            onClick={loadData}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-none bg-muted hover:bg-muted border border-border text-xs font-semibold text-foreground transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-accent ${isLoading ? 'animate-spin' : ''}`} />
            Refresh Radars
          </button>
        }
      />

      <div className="flex-1 min-h-[550px] flex flex-col lg:flex-row gap-4">
        {/* Main Map Area */}
        <div className="flex-[3] flex flex-col min-h-[500px]">
          <DynamicBorderMap 
            cameras={cameras} 
            bops={bops} 
            alerts={alerts} 
            className="flex-1 h-full shadow-2xl" 
            selectedCameraId={selectedCameraId}
            onSelectCamera={setSelectedCameraId}
          />
        </div>

        {/* Side Panel Area */}
        <div className="flex-1 min-w-[300px] flex flex-col gap-4">
          <div className="bg-card border border-border rounded-none p-4 flex flex-col flex-1 shadow-lg overflow-hidden">
            <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-red-500" />
              Active Tactical Alerts
            </h3>
            
            <div className="flex-1 overflow-y-auto pr-2 space-y-3">
              {activeAlerts.length === 0 ? (
                <div className="text-sm text-muted-foreground text-center py-8">
                  No active alerts in this sector.
                </div>
              ) : (
                activeAlerts.map(alert => {
                  const cam = cameras.find(c => c.id === alert.cameraId);
                  return (
                    <div 
                      key={alert.alertId} 
                      className="bg-muted border border-border rounded-none p-3 hover:border-[#FF5C67]/50 transition-colors cursor-pointer"
                      onClick={() => setSelectedCameraId(alert.cameraId)}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-xs font-bold text-red-500">{alert.eventType}</span>
                        <span className="text-[10px] text-muted-foreground font-mono">{cam?.bopId || 'Unknown'}</span>
                      </div>
                      <p className="text-xs text-foreground mb-2">{alert.description}</p>
                      <div className="flex justify-between items-center text-[10px]">
                        <span className="text-muted-foreground">{new Date(alert.timestamp).toLocaleTimeString()}</span>
                        <Link
                          href={`/cameras/${alert.cameraId}`}
                          className="text-accent hover:text-accent/80 flex items-center gap-1 font-semibold"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Eye className="w-3 h-3" /> View Feed
                        </Link>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="bg-card border border-border rounded-none p-4 shadow-lg">
            <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
              <Radio className="w-4 h-4 text-green-500" />
              Sector Status
            </h3>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-background border border-border rounded p-2 text-center">
                <div className="text-muted-foreground mb-1">Total BOPs</div>
                <div className="text-xl font-bold text-foreground">{bops.length}</div>
              </div>
              <div className="bg-background border border-border rounded p-2 text-center">
                <div className="text-muted-foreground mb-1">Cameras Online</div>
                <div className="text-xl font-bold text-green-500">{cameras.filter(c => c.status === 'ONLINE').length} / {cameras.length}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
