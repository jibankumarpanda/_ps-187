import React, { useState, useEffect } from 'react';
import { UploadCloud, RefreshCw, CheckCircle, AlertTriangle, Car, User, Clock } from 'lucide-react';
import { io } from 'socket.io-client';
import { fetchWithAuth, getToken } from '@/lib/api';

interface VideoAnalysisProps {
  cameraId: string;
}

interface RecentEvent {
  type: string;
  subType?: string;
  trackId?: number | string;
  frame?: number;
  confidence?: number;
}

export function VideoAnalysis({ cameraId }: VideoAnalysisProps) {
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [videoId, setVideoId] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('IDLE');
  const [progress, setProgress] = useState(0);
  const [recentEvents, setRecentEvents] = useState<RecentEvent[]>([]);
  const [stats, setStats] = useState({
    persons: 0,
    vehicles: 0,
    intrusions: 0,
    loitering: 0,
  });

  // Load existing job for this camera on mount
  useEffect(() => {
    let isMounted = true;
    async function loadLatestJob() {
      try {
        const res = await fetchWithAuth(`/videos/camera/${cameraId}`);
        if (!res.ok) return;
        const payload = await res.json().catch(() => null);
        const job = payload?.data;
        if (job && isMounted) {
          setVideoId(job.id);
          setStatus(job.status);
          setProgress(job.progress || 0);
          setFileName(job.filename);
          setStats({
            persons: job.personsDetected || 0,
            vehicles: job.vehiclesDetected || 0,
            intrusions: job.intrusionCount || 0,
            loitering: job.loiteringCount || 0,
          });
          if (Array.isArray(job.events) && job.events.length > 0) {
            setRecentEvents(job.events.slice(0, 10).map((e: any) => ({
              type: e.type,
              subType: e.metadata?.subType || e.type,
              trackId: e.trackId,
              frame: e.frameNumber,
              confidence: e.confidence,
            })));
          }
        }
      } catch (err) {
        console.error('Error loading latest video job:', err);
      }
    }
    loadLatestJob();
    return () => { isMounted = false; };
  }, [cameraId]);

  useEffect(() => {
    const token = getToken();
    if (!token) return;

    const socket = io(process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:4000', {
      auth: (cb) => {
        cb({ token: getToken() });
      },
      transports: ['websocket', 'polling'],
    });

    socket.on('video:progress', (data) => {
      if (!videoId || data.videoId === videoId) {
        if (!videoId && data.videoId) setVideoId(data.videoId);
        setProgress(data.progress ?? 0);
        setStatus(data.status);
        if (data.vehiclesDetected !== undefined || data.personsDetected !== undefined) {
          setStats(prev => ({
            ...prev,
            vehicles: data.vehiclesDetected ?? prev.vehicles,
            persons: data.personsDetected ?? prev.persons,
            intrusions: data.intrusionCount ?? prev.intrusions,
            loitering: data.loiteringCount ?? prev.loitering,
          }));
        }
      }
    });

    socket.on('video:event', (data) => {
      if (!videoId || data.videoId === videoId) {
        const type = String(data.type || data.objectType).toUpperCase();
        const statKeyByType: Record<string, keyof typeof stats> = {
          PERSON: 'persons',
          PERSON_DETECTED: 'persons',
          VEHICLE: 'vehicles',
          VEHICLE_DETECTED: 'vehicles',
          INTRUSION: 'intrusions',
          LOITERING: 'loitering',
        };
        const key = statKeyByType[type];
        if (key) {
          setStats(prev => ({
            ...prev,
            [key]: prev[key] + 1
          }));
        }

        setRecentEvents(prev => [
          {
            type: data.type,
            subType: data.subType,
            trackId: data.trackId,
            frame: data.frame,
            confidence: data.confidence,
          },
          ...prev.slice(0, 9)
        ]);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [videoId]);

  const handleUpload = async () => {
    if (!file) return;
    setIsUploading(true);
    setStatus('UPLOADING');
    
    const formData = new FormData();
    formData.append('video', file);

    try {
      const res = await fetchWithAuth(`/videos/${cameraId}/upload`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json().catch(() => null);
      if (res.ok) {
        const newId = data?.data?.id || data?.id;
        setVideoId(newId);
        setFileName(file.name);
        setStatus('QUEUED');
        setProgress(0);
        setStats({ persons: 0, vehicles: 0, intrusions: 0, loitering: 0 });
        setRecentEvents([]);
      } else {
        setStatus('ERROR');
      }
    } catch (error) {
      console.error('Upload failed', error);
      setStatus('ERROR');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRetry = async () => {
    if (!videoId) return;
    setIsRetrying(true);
    try {
      const res = await fetchWithAuth(`/videos/${videoId}/retry`, {
        method: 'POST'
      });
      if (res.ok) {
        setStatus('QUEUED');
        setProgress(0);
        setStats({ persons: 0, vehicles: 0, intrusions: 0, loitering: 0 });
        setRecentEvents([]);
      }
    } catch (err) {
      console.error('Retry failed', err);
    } finally {
      setIsRetrying(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-card border border-border rounded-none p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
          <div>
            <h3 className="text-base font-bold text-foreground">CCTV Video Edge AI Analysis</h3>
            <p className="text-xs text-muted-foreground">Frame-by-frame object detection, vehicle tracking, and event classification.</p>
          </div>
          {videoId && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleRetry}
                disabled={isRetrying || status === 'PROCESSING'}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-muted border border-border hover:bg-muted text-foreground rounded-none text-xs font-semibold disabled:opacity-50 transition-colors"
                title="Re-run AI analysis with YOLO model"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-accent ${isRetrying || status === 'PROCESSING' ? 'animate-spin' : ''}`} />
                {isRetrying ? 'Re-queueing...' : 'Re-run Analysis'}
              </button>
              <button
                onClick={() => { setVideoId(null); setFile(null); setStatus('IDLE'); }}
                className="px-3 py-1.5 bg-muted border border-border hover:bg-muted text-muted-foreground hover:text-foreground rounded-none text-xs font-semibold transition-colors"
              >
                Upload Another
              </button>
            </div>
          )}
        </div>

        {!videoId && (
          <div className="max-w-md mx-auto border-2 border-dashed border-border rounded-none p-8 bg-[#0F151C] text-center">
            <UploadCloud className="w-8 h-8 text-accent mx-auto mb-3" />
            <input 
              type="file" 
              accept="video/mp4,video/x-m4v,video/*" 
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="text-xs text-muted-foreground w-full cursor-pointer"
            />
            <button
              onClick={handleUpload}
              disabled={!file || isUploading}
              className="mt-4 w-full px-4 py-2 bg-accent text-[#0A0F14] text-xs font-bold rounded-none hover:bg-accent/90 transition-colors disabled:opacity-50"
            >
              {isUploading ? 'Uploading & Queueing...' : 'Upload & Start AI Analysis'}
            </button>
          </div>
        )}

        {videoId && (
          <div className="space-y-6">
            <div className="p-4 bg-[#0F151C] border border-border rounded-none">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold text-foreground truncate max-w-[280px]">
                  {fileName || file?.name || 'Uploaded Video'}
                </span>
                <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded flex items-center gap-1 ${
                  status === 'COMPLETED' ? 'bg-[#39D98A]/15 text-green-500' :
                  status === 'PROCESSING' ? 'bg-accent/15 text-accent animate-pulse' :
                  status === 'QUEUED' ? 'bg-[#F4C95D]/15 text-[#F4C95D]' :
                  'bg-red-500/15 text-red-500'
                }`}>
                  {status === 'COMPLETED' && <CheckCircle className="w-3 h-3" />}
                  {status === 'QUEUED' && <Clock className="w-3 h-3" />}
                  {status === 'ERROR' && <AlertTriangle className="w-3 h-3" />}
                  {status}
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2.5 mb-1.5 overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-300 ${
                    status === 'COMPLETED' ? 'bg-[#39D98A]' : 'bg-accent'
                  }`} 
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] text-muted-foreground font-mono">
                <span>{status === 'PROCESSING' ? 'AI Model Analyzing Frames...' : status === 'QUEUED' ? 'Waiting for ML Worker...' : 'Analysis Complete'}</span>
                <span>{progress}%</span>
              </div>
            </div>

            {/* AI Object Detection Counters */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatBox 
                label="VEHICLES DETECTED" 
                value={stats.vehicles} 
                icon={<Car className="w-4 h-4 text-[#F4C95D]" />}
                color="#F4C95D"
              />
              <StatBox 
                label="PERSONS DETECTED" 
                value={stats.persons} 
                icon={<User className="w-4 h-4 text-accent" />}
                color="#37B9FF"
              />
              <StatBox 
                label="INTRUSIONS" 
                value={stats.intrusions} 
                icon={<AlertTriangle className="w-4 h-4 text-red-500" />}
                color="#FF5C67"
              />
              <StatBox 
                label="LOITERING" 
                value={stats.loitering} 
                icon={<Clock className="w-4 h-4 text-[#FF9F43]" />}
                color="#FF9F43"
              />
            </div>

            {/* Recent Detection Stream */}
            {recentEvents.length > 0 && (
              <div className="bg-[#0F151C] border border-border rounded-none p-4 space-y-3">
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                  <span>Live Object Detection Feed</span>
                  <span className="text-[10px] text-green-500 font-mono">ByteTrack Active</span>
                </div>
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {recentEvents.map((ev, i) => (
                    <div key={i} className="flex items-center justify-between text-xs py-1.5 px-2.5 rounded bg-card border border-border/60">
                      <div className="flex items-center gap-2">
                        {ev.type.includes('VEHICLE') ? (
                          <Car className="w-3.5 h-3.5 text-[#F4C95D]" />
                        ) : (
                          <User className="w-3.5 h-3.5 text-accent" />
                        )}
                        <span className="font-semibold text-foreground capitalize">{ev.subType || ev.type}</span>
                        {ev.trackId !== undefined && (
                          <span className="text-[10px] font-mono text-muted-foreground">Track #{ev.trackId}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 font-mono text-[10px] text-muted-foreground">
                        {ev.frame !== undefined && <span>Frame {ev.frame}</span>}
                        {ev.confidence !== undefined && (
                          <span className="text-green-500">{Math.round(ev.confidence * 100)}% conf</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function StatBox({ label, value, icon, color }: { label: string; value: number; icon?: React.ReactNode; color?: string }) {
  return (
    <div className="p-4 bg-[#0F151C] border border-border rounded-none flex flex-col justify-between">
      <div className="flex items-center justify-between mb-2">
        <div className="text-[10px] uppercase font-bold text-muted-foreground">{label}</div>
        {icon}
      </div>
      <div className="text-2xl font-bold text-foreground" style={{ color: value > 0 && color ? color : undefined }}>
        {value}
      </div>
    </div>
  );
}

