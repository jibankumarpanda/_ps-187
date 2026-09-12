"use client";

import React, { useState, useEffect } from 'react';
import { Users, Car, Plus, Search, ShieldCheck } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { WatchlistPersonTable } from '@/components/watchlist/WatchlistPersonTable';
import { WatchlistVehicleTable } from '@/components/watchlist/WatchlistVehicleTable';
import { AddWatchlistModal } from '@/components/watchlist/AddWatchlistModal';
import { TableSkeleton } from '@/components/ui/LoadingSkeleton';
import { getWatchlist, addWatchlistPerson, addWatchlistVehicle } from '@/lib/api';
import type { WatchlistPerson, WatchlistVehicle } from '@/types/watchlist';

export default function WatchlistPage() {
  const [activeTab, setActiveTab] = useState<'persons' | 'vehicles'>('persons');
  const [persons, setPersons] = useState<WatchlistPerson[]>([]);
  const [vehicles, setVehicles] = useState<WatchlistVehicle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const loadData = async () => {
    setIsLoading(true);
    const data = await getWatchlist();
    setPersons(data.persons);
    setVehicles(data.vehicles);
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddPerson = async (data: any) => {
    const created = await addWatchlistPerson(data);
    setPersons((prev) => [created, ...prev]);
    return created;
  };

  const handleAddVehicle = async (data: any) => {
    const created = await addWatchlistVehicle(data);
    setVehicles((prev) => [created, ...prev]);
    return created;
  };

  const filteredPersons = persons.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.referenceId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredVehicles = vehicles.filter(
    (v) =>
      v.numberPlate.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.vehicleId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.vehicleType.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Surveillance Watchlist"
        subtitle="Monitored persons of interest and registered suspect vehicles cross-checked via Edge AI models."
        actions={
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-accent hover:bg-accent/90 text-[#071018] rounded-none text-xs font-bold transition-all shadow-lg"
          >
            <Plus className="w-4 h-4" />
            {activeTab === 'persons' ? 'Add Person' : 'Add Vehicle'}
          </button>
        }
      />

      {/* Tabs and Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Navigation Tabs (Section 36) */}
        <div className="flex bg-card border border-border rounded-none p-1 w-max">
          <button
            onClick={() => setActiveTab('persons')}
            className={`flex items-center gap-2 px-4 py-2 rounded-none text-xs font-semibold transition-colors ${
              activeTab === 'persons'
                ? 'bg-muted text-foreground shadow'
                : 'text-[#8D99A5] hover:text-foreground'
            }`}
          >
            <Users className="w-4 h-4 text-accent" />
            Persons of Interest ({persons.length})
          </button>
          <button
            onClick={() => setActiveTab('vehicles')}
            className={`flex items-center gap-2 px-4 py-2 rounded-none text-xs font-semibold transition-colors ${
              activeTab === 'vehicles'
                ? 'bg-muted text-foreground shadow'
                : 'text-[#8D99A5] hover:text-foreground'
            }`}
          >
            <Car className="w-4 h-4 text-[#F4C95D]" />
            ANPR Suspect Vehicles ({vehicles.length})
          </button>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={activeTab === 'persons' ? 'Search by name or reference...' : 'Search license plate...'}
            className="w-full bg-[#0F151C] border border-border rounded-none pl-9 pr-4 h-9 text-xs text-foreground placeholder:text-[#677480] focus:border-[#37B9FF] focus:outline-none"
          />
        </div>
      </div>

      {/* Tables based on active tab */}
      {isLoading ? (
        <TableSkeleton rows={6} cols={6} />
      ) : activeTab === 'persons' ? (
        <WatchlistPersonTable persons={filteredPersons} />
      ) : (
        <WatchlistVehicleTable vehicles={filteredVehicles} />
      )}

      {/* Add Modal */}
      <AddWatchlistModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        activeTab={activeTab}
        onAddPerson={handleAddPerson}
        onAddVehicle={handleAddVehicle}
      />
    </div>
  );
}
