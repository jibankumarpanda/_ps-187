import { describe, expect, it } from 'vitest';
import {
  buildAnprMatchMetadata,
  normalizePlate,
  selectAnprWatchlistMatch,
  type WatchlistVehicle,
} from '../src/services/anpr-watchlist';

const activeVehicle: WatchlistVehicle = {
  id: 'vehicle-uuid',
  vehicleId: 'WLV-001',
  numberPlate: 'ab-12 cd 3456',
  status: 'ACTIVE',
  vehicleType: 'CAR',
  category: 'VIP',
};

describe('ANPR watchlist matching', () => {
  it('normalizes plates and selects the referenced active record', () => {
    expect(normalizePlate(' ab-12_cd 3456 ')).toBe('AB12CD3456');
    expect(selectAnprWatchlistMatch({ plate: 'AB12CD3456', watchlist_vehicle_id: 'WLV-001' }, [activeVehicle])).toEqual(activeVehicle);
  });

  it('does not match inactive, ambiguous, or missing entries', () => {
    expect(selectAnprWatchlistMatch({ plate: 'AB12CD3456' }, [
      { ...activeVehicle, status: 'INACTIVE' },
    ])).toBeNull();
    expect(selectAnprWatchlistMatch({ plate: 'AB12CD3456' }, [
      activeVehicle,
      { ...activeVehicle, id: 'vehicle-uuid-2', vehicleId: 'WLV-002' },
    ])).toBeNull();
    expect(selectAnprWatchlistMatch({ plate: 'AB12CD3456' }, [])).toBeNull();
  });

  it('builds confirmed metadata and clears unconfirmed match fields', () => {
    const confirmed = buildAnprMatchMetadata({ plate: 'AB12CD3456' }, activeVehicle);
    expect(confirmed.watchlist_match).toBe(true);
    expect(confirmed.watchlist_vehicle_id).toBe('WLV-001');
    expect(confirmed.watchlist_id).toBe('vehicle-uuid');
    expect(confirmed.watchlist_number_plate).toBe('ab-12 cd 3456');
    expect(confirmed.watchlist_status).toBe('ACTIVE');
    expect(confirmed.watchlist_category).toBe('VIP');

    const unconfirmed = buildAnprMatchMetadata({
      plate: 'AB12CD3456',
      watchlist_match: true,
      watchlist_vehicle_id: 'WLV-001',
      watchlist_category: 'untrusted',
      watchlist_description: 'untrusted',
    }, null);
    expect(unconfirmed.watchlist_match).toBe(false);
    expect(unconfirmed.watchlist_vehicle_id).toBeUndefined();
    expect(unconfirmed.watchlist_category).toBeUndefined();
    expect(unconfirmed.watchlist_description).toBeUndefined();
  });
});
