"use client";

import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';

interface AddWatchlistModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: 'persons' | 'vehicles';
  onAddPerson: (data: any) => Promise<any>;
  onAddVehicle: (data: any) => Promise<any>;
}

export function AddWatchlistModal({
  isOpen,
  onClose,
  activeTab,
  onAddPerson,
  onAddVehicle,
}: AddWatchlistModalProps) {
  const { showToast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [personForm, setPersonForm] = useState({
    name: '',
    category: 'HIGH PRIORITY',
    description: '',
    addedBy: 'Saikat Bera (Operator)',
  });
  const [vehicleForm, setVehicleForm] = useState({
    numberPlate: '',
    vehicleType: 'SUV',
    category: 'HIGH PRIORITY',
    description: '',
    addedBy: 'Saikat Bera (Operator)',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      if (activeTab === 'persons') {
        if (!personForm.name) return;
        await onAddPerson({
          ...personForm,
          status: 'ACTIVE',
          lastMatch: null,
        });
        showToast({
          title: 'Target Registered',
          message: `${personForm.name} added to security watchlist.`,
          type: 'success',
        });
      } else {
        if (!vehicleForm.numberPlate) return;
        await onAddVehicle({
          ...vehicleForm,
          status: 'ACTIVE',
          lastMatch: null,
        });
        showToast({
          title: 'Vehicle Enlisted',
          message: `${vehicleForm.numberPlate} added to ANPR watchlist.`,
          type: 'success',
        });
      }
      onClose();
    } catch (err) {
      showToast({
        title: 'Registration Error',
        message: 'Could not sync with central watchlist server.',
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
      title={activeTab === 'persons' ? 'Enlist Person of Interest' : 'Enlist Watchlist Vehicle (ANPR)'}
      description="Register targets for continuous edge AI surveillance cross-referencing."
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-xs font-semibold text-[#D8E0E6] bg-muted border border-border rounded-none hover:bg-muted"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-4 py-2 text-xs font-bold text-[#071018] bg-accent hover:bg-accent/90 rounded-none flex items-center gap-1.5"
          >
            {isSubmitting ? 'Registering...' : 'Add to Watchlist'}
          </button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {activeTab === 'persons' ? (
          <>
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">Target Name / Alias</label>
              <input
                type="text"
                required
                value={personForm.name}
                onChange={(e) => setPersonForm({ ...personForm, name: e.target.value })}
                placeholder="e.g. Subject Fox-1"
                className="w-full bg-[#0F151C] border border-[#2B3947] rounded-none px-3 h-10 text-xs text-foreground focus:border-[#37B9FF] focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">Priority Classification</label>
              <select
                value={personForm.category}
                onChange={(e) => setPersonForm({ ...personForm, category: e.target.value })}
                className="w-full bg-[#0F151C] border border-[#2B3947] rounded-none px-3 h-10 text-xs text-foreground focus:border-[#37B9FF] focus:outline-none cursor-pointer"
              >
                <option value="HIGH PRIORITY">HIGH PRIORITY</option>
                <option value="MEDIUM PRIORITY">MEDIUM PRIORITY</option>
                <option value="LOW PRIORITY">LOW PRIORITY</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">Case Notes / Reason for Watch</label>
              <textarea
                rows={3}
                value={personForm.description}
                onChange={(e) => setPersonForm({ ...personForm, description: e.target.value })}
                placeholder="Reason for inclusion in border surveillance monitor..."
                className="w-full bg-[#0F151C] border border-[#2B3947] rounded-none p-3 text-xs text-foreground focus:border-[#37B9FF] focus:outline-none"
              />
            </div>
          </>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">License Plate Number</label>
                <input
                  type="text"
                  required
                  value={vehicleForm.numberPlate}
                  onChange={(e) => setVehicleForm({ ...vehicleForm, numberPlate: e.target.value.toUpperCase() })}
                  placeholder="e.g. RJ-14-XY-9876"
                  className="w-full bg-[#0F151C] border border-[#2B3947] rounded-none px-3 h-10 text-xs text-foreground font-mono focus:border-[#37B9FF] focus:outline-none uppercase"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">Vehicle Classification</label>
                <select
                  value={vehicleForm.vehicleType}
                  onChange={(e) => setVehicleForm({ ...vehicleForm, vehicleType: e.target.value })}
                  className="w-full bg-[#0F151C] border border-[#2B3947] rounded-none px-3 h-10 text-xs text-foreground focus:border-[#37B9FF] focus:outline-none cursor-pointer"
                >
                  <option value="SUV">SUV</option>
                  <option value="Truck">Heavy Commercial Truck</option>
                  <option value="Pickup">Pickup / Utility</option>
                  <option value="Sedan">Sedan</option>
                  <option value="Motorcycle">Motorcycle</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">Priority Classification</label>
              <select
                value={vehicleForm.category}
                onChange={(e) => setVehicleForm({ ...vehicleForm, category: e.target.value })}
                className="w-full bg-[#0F151C] border border-[#2B3947] rounded-none px-3 h-10 text-xs text-foreground focus:border-[#37B9FF] focus:outline-none cursor-pointer"
              >
                <option value="HIGH PRIORITY">HIGH PRIORITY</option>
                <option value="MEDIUM PRIORITY">MEDIUM PRIORITY</option>
                <option value="LOW PRIORITY">LOW PRIORITY</option>
              </select>
            </div>
          </>
        )}
      </form>
    </Modal>
  );
}
