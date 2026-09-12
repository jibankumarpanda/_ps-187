"use client";

import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import type { CameraRegistration } from '@/lib/api';

interface AddCameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (cam: CameraRegistration) => Promise<any>;
}

export function AddCameraModal({ isOpen, onClose, onAdd }: AddCameraModalProps) {
  const { showToast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    cameraCode: '',
    name: '',
    bopId: 'BOP-12',
    location: '',
    resolution: '1920x1080',
    latitude: 26.912,
    longitude: 75.787,
    streamUrl: '',
    rtspUsername: '',
    rtspPassword: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.cameraCode || !formData.name || !formData.location || !formData.streamUrl) {
      showToast({
        title: 'Validation Error',
        message: 'Camera ID, name, location, and stream URL are required.',
        type: 'warning',
      });
      return;
    }

    try {
      setIsSubmitting(true);
      await onAdd(formData);
      showToast({
        title: 'Camera Provisioned',
        message: `Camera ${formData.name} successfully registered to ${formData.bopId}.`,
        type: 'success',
      });
      onClose();
    } catch (err) {
      showToast({
        title: 'Provisioning Failed',
        message: 'Could not connect to camera node.',
        type: 'error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Register Border CCTV Camera"
      description="Connect a physical IP camera feed to the IBVAP AI processing pipeline."
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-xs font-semibold text-[#D8E0E6] bg-muted border border-border rounded-none hover:bg-muted transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-4 py-2 text-xs font-bold text-[#071018] bg-accent hover:bg-accent/90 rounded-none transition-colors flex items-center gap-1.5"
          >
            {isSubmitting ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-[#071018] border-t-transparent rounded-full animate-spin" />
                Saving...
              </>
            ) : (
              'Add Camera'
            )}
          </button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-1">Camera ID</label>
            <input
              type="text"
              required
              value={formData.cameraCode}
              onChange={(e) => setFormData({ ...formData, cameraCode: e.target.value.toUpperCase() })}
              placeholder="e.g. BOP12-CAM09"
              className="w-full bg-[#0F151C] border border-[#2B3947] rounded-none px-3 h-10 text-xs text-foreground focus:border-[#37B9FF] focus:outline-none font-mono"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-1">Camera Name</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. North Fence Cam 09"
              className="w-full bg-[#0F151C] border border-[#2B3947] rounded-none px-3 h-10 text-xs text-foreground focus:border-[#37B9FF] focus:outline-none"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-1">Border Outpost (BOP)</label>
            <select
              value={formData.bopId}
              onChange={(e) => setFormData({ ...formData, bopId: e.target.value })}
              className="w-full bg-[#0F151C] border border-[#2B3947] rounded-none px-3 h-10 text-xs text-foreground focus:border-[#37B9FF] focus:outline-none cursor-pointer"
            >
              <option value="BOP-12">BOP-12 (North Sector)</option>
              <option value="BOP-18">BOP-18 (East Sector)</option>
              <option value="BOP-21">BOP-21 (West Sector)</option>
              <option value="BOP-07">BOP-07 (South Sector)</option>
              <option value="BOP-33">BOP-33 (Northeast Sector)</option>
            </select>
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-muted-foreground block mb-1">Physical Sector / Location</label>
          <input
            type="text"
            required
            value={formData.location}
            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            placeholder="e.g. Sector 4 East River Crossing"
            className="w-full bg-[#0F151C] border border-[#2B3947] rounded-none px-3 h-10 text-xs text-foreground focus:border-[#37B9FF] focus:outline-none"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-1">Resolution</label>
            <select
              value={formData.resolution}
              onChange={(e) => setFormData({ ...formData, resolution: e.target.value })}
              className="w-full bg-[#0F151C] border border-[#2B3947] rounded-none px-3 h-10 text-xs text-foreground focus:border-[#37B9FF] focus:outline-none cursor-pointer"
            >
              <option value="1920x1080">1080p FHD (1920x1080)</option>
              <option value="2560x1440">2K QHD (2560x1440)</option>
              <option value="3840x2160">4K UHD (3840x2160)</option>
              <option value="1280x720">720p HD (1280x720)</option>
            </select>
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-muted-foreground block mb-1">RTSP or NVR Stream URL</label>
          <input
            type="text"
            required
            value={formData.streamUrl}
            onChange={(e) => setFormData({ ...formData, streamUrl: e.target.value })}
            placeholder="rtsp://camera-host:554/stream"
            className="w-full bg-[#0F151C] border border-[#2B3947] rounded-none px-3 h-10 text-xs text-foreground focus:border-[#37B9FF] focus:outline-none font-mono"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-1">Camera Username</label>
            <input
              type="text"
              autoComplete="off"
              value={formData.rtspUsername}
              onChange={(e) => setFormData({ ...formData, rtspUsername: e.target.value })}
              className="w-full bg-[#0F151C] border border-[#2B3947] rounded-none px-3 h-10 text-xs text-foreground focus:border-[#37B9FF] focus:outline-none"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-1">Camera Password</label>
            <input
              type="password"
              autoComplete="new-password"
              value={formData.rtspPassword}
              onChange={(e) => setFormData({ ...formData, rtspPassword: e.target.value })}
              className="w-full bg-[#0F151C] border border-[#2B3947] rounded-none px-3 h-10 text-xs text-foreground focus:border-[#37B9FF] focus:outline-none"
            />
          </div>
        </div>
      </form>
    </Modal>
  );
}
