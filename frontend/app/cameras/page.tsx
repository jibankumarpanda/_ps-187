"use client";

import React, { useState } from 'react';
import { Camera, Plus, Search } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { CameraTable } from '@/components/cameras/CameraTable';
import { AddCameraModal } from '@/components/cameras/AddCameraModal';
import { UploadCustomVideoModal } from '@/components/cameras/UploadCustomVideoModal';
import { FilterBar } from '@/components/ui/FilterBar';
import { useCameras } from '@/hooks/useCameras';
import { TableSkeleton } from '@/components/ui/LoadingSkeleton';

export default function CamerasPage() {
  const { cameras, isLoading, addCamera, deleteCamera, toggleStatus } = useCameras();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [bopFilter, setBopFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const filteredCameras = cameras.filter((cam) => {
    const matchesQuery =
      cam.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cam.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cam.location.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesBop = !bopFilter || cam.bopId === bopFilter;
    const matchesStatus = !statusFilter || cam.status === statusFilter;
    return matchesQuery && matchesBop && matchesStatus;
  });

  const activeFilterCount = (bopFilter ? 1 : 0) + (statusFilter ? 1 : 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cameras"
        subtitle="Manage connected border surveillance cameras, RTSP streams, and edge AI detection models."
        actions={
          <div className="flex gap-2">
            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-muted border border-border hover:bg-muted text-foreground rounded-none text-xs font-bold transition-all shadow-lg"
            >
              Upload Custom Video
            </button>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-accent hover:bg-accent/90 text-[#071018] rounded-none text-xs font-bold transition-all shadow-lg"
            >
              <Plus className="w-4 h-4" />
              Add Camera
            </button>
          </div>
        }
      />

      {/* Filter and Search Bar */}
      <div className="bg-card border border-border rounded-none p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by ID, name, or sector location..."
            className="w-full bg-[#0F151C] border border-border rounded-none pl-9 pr-4 h-9 text-xs text-foreground placeholder:text-[#677480] focus:border-[#37B9FF] focus:outline-none"
          />
        </div>

        <FilterBar
          filters={[
            {
              key: 'bop',
              label: 'BOPs',
              options: [
                { label: 'BOP-12', value: 'BOP-12' },
                { label: 'BOP-18', value: 'BOP-18' },
                { label: 'BOP-21', value: 'BOP-21' },
                { label: 'BOP-07', value: 'BOP-07' },
                { label: 'BOP-33', value: 'BOP-33' },
              ],
              value: bopFilter,
              onChange: setBopFilter,
            },
            {
              key: 'status',
              label: 'Statuses',
              options: [
                { label: 'Online', value: 'ONLINE' },
                { label: 'Degraded', value: 'DEGRADED' },
                { label: 'Offline', value: 'OFFLINE' },
              ],
              value: statusFilter,
              onChange: setStatusFilter,
            },
          ]}
          activeCount={activeFilterCount}
          onReset={() => {
            setBopFilter('');
            setStatusFilter('');
          }}
        />
      </div>

      {/* Main Table */}
      {isLoading ? (
        <TableSkeleton rows={8} cols={7} />
      ) : (
        <CameraTable
          cameras={filteredCameras}
          onToggleStatus={toggleStatus}
          onDelete={deleteCamera}
        />
      )}

      {/* Add Camera Modal */}
      <AddCameraModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={addCamera}
      />

      {/* Upload Custom Video Modal */}
      <UploadCustomVideoModal 
        isOpen={isUploadModalOpen} 
        onClose={() => setIsUploadModalOpen(false)} 
      />
    </div>
  );
}
