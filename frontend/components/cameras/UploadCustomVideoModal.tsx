import React, { useState } from 'react';
import { UploadCloud, X, MapPin, Calendar, Clock, Crosshair } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { fetchWithAuth } from '@/lib/api';

interface UploadCustomVideoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function UploadCustomVideoModal({ isOpen, onClose }: UploadCustomVideoModalProps) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    bopId: 'BOP-12', // default BOP for now
    latitude: '',
    longitude: '',
    date: '',
    time: ''
  });

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError("Please select a video file");
      return;
    }
    
    setIsSubmitting(true);
    setError(null);

    try {
      // 1. Create the Camera
      const cameraRes = await fetchWithAuth('/cameras', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cameraCode: `VID-${Date.now()}`,
          name: formData.name,
          location: formData.location,
          bopCode: formData.bopId,
          latitude: parseFloat(formData.latitude) || 0,
          longitude: parseFloat(formData.longitude) || 0,
          sourceType: 'VIDEO'
        })
      });

      const cameraPayload = await cameraRes.json().catch(() => null);
      if (!cameraRes.ok) {
        throw new Error(cameraPayload?.error?.message || 'Failed to create virtual camera record');
      }
      const camera = cameraPayload?.data;
      if (!camera?.id) {
        throw new Error('Camera was created but the response did not include an id');
      }

      // 2. Upload the video
      const uploadData = new FormData();
      uploadData.append('video', file);
      // Optional: append date/time if backend needs to save it in metadata
      uploadData.append('date', formData.date);
      uploadData.append('time', formData.time);

      const uploadRes = await fetchWithAuth(`/videos/${camera.id}/upload`, {
        method: 'POST',
        body: uploadData
      });

      if (!uploadRes.ok) {
        const uploadPayload = await uploadRes.json().catch(() => null);
        throw new Error(uploadPayload?.error?.message || 'Failed to upload video');
      }

      onClose();
      // Redirect to the camera page on the video tab
      router.push(`/cameras/${camera.id}?tab=VIDEO`);

    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An error occurred');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-none w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
            <UploadCloud className="w-4 h-4 text-accent" />
            Upload Custom Video
          </h2>
          <button onClick={onClose} className="p-1 text-muted-foreground hover:text-foreground transition-colors rounded-none hover:bg-muted">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto">
          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded text-xs">
              {error}
            </div>
          )}
          
          <form id="custom-video-form" onSubmit={handleSubmit} className="space-y-4">
            
            {/* File Upload Area */}
            <div className="border-2 border-dashed border-border rounded-none p-6 bg-[#0F151C] text-center">
              <UploadCloud className="w-8 h-8 text-accent mx-auto mb-2" />
              <input 
                  type="file" 
                  accept="video/mp4,video/x-m4v,video/*" 
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="text-xs text-muted-foreground w-full"
                  required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Camera/Video Name</label>
                <input
                  type="text"
                  name="name"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full bg-[#0F151C] border border-border rounded-none px-3 h-9 text-xs text-foreground focus:border-[#37B9FF] focus:outline-none"
                  placeholder="e.g. Drone Survey 1"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Location Name</label>
                <input
                  type="text"
                  name="location"
                  required
                  value={formData.location}
                  onChange={handleChange}
                  className="w-full bg-[#0F151C] border border-border rounded-none px-3 h-9 text-xs text-foreground focus:border-[#37B9FF] focus:outline-none"
                  placeholder="e.g. Sector 4 East"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1"><Crosshair className="w-3 h-3"/> Latitude</label>
                <input
                  type="number"
                  step="any"
                  name="latitude"
                  required
                  value={formData.latitude}
                  onChange={handleChange}
                  className="w-full bg-[#0F151C] border border-border rounded-none px-3 h-9 text-xs text-foreground focus:border-[#37B9FF] focus:outline-none"
                  placeholder="e.g. 28.6139"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1"><MapPin className="w-3 h-3"/> Longitude</label>
                <input
                  type="number"
                  step="any"
                  name="longitude"
                  required
                  value={formData.longitude}
                  onChange={handleChange}
                  className="w-full bg-[#0F151C] border border-border rounded-none px-3 h-9 text-xs text-foreground focus:border-[#37B9FF] focus:outline-none"
                  placeholder="e.g. 77.2090"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1"><Calendar className="w-3 h-3"/> Capture Date</label>
                <input
                  type="date"
                  name="date"
                  required
                  value={formData.date}
                  onChange={handleChange}
                  className="w-full bg-[#0F151C] border border-border rounded-none px-3 h-9 text-xs text-foreground focus:border-[#37B9FF] focus:outline-none"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3"/> Capture Time</label>
                <input
                  type="time"
                  name="time"
                  required
                  value={formData.time}
                  onChange={handleChange}
                  className="w-full bg-[#0F151C] border border-border rounded-none px-3 h-9 text-xs text-foreground focus:border-[#37B9FF] focus:outline-none"
                />
              </div>
            </div>

            <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">BOP Assignment</label>
                <select
                  name="bopId"
                  value={formData.bopId}
                  onChange={handleChange}
                  className="w-full bg-[#0F151C] border border-border rounded-none px-3 h-9 text-xs text-foreground focus:border-[#37B9FF] focus:outline-none"
                >
                    <option value="BOP-12">BOP-12 (North Sector)</option>
                    <option value="BOP-18">BOP-18 (East Sector)</option>
                    <option value="BOP-21">BOP-21 (South Sector)</option>
                </select>
            </div>

          </form>
        </div>

        <div className="p-4 border-t border-border flex justify-end gap-2 bg-[#0F151C]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-muted text-foreground text-xs font-bold rounded-none hover:bg-muted transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="custom-video-form"
            disabled={isSubmitting}
            className="px-4 py-2 bg-accent text-[#0A0F14] text-xs font-bold rounded-none hover:bg-accent/90 transition-colors shadow-lg disabled:opacity-50 flex items-center gap-2"
          >
            {isSubmitting ? 'Uploading & Analyzing...' : 'Start AI Analysis'}
          </button>
        </div>

      </div>
    </div>
  );
}
