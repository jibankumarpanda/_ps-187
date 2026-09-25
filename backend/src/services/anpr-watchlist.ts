export type WatchlistVehicle = {
  id: string;
  vehicleId: string;
  numberPlate: string;
  status: string;
  vehicleType?: string | null;
  category?: string | null;
  description?: string | null;
  addedBy?: string | null;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function stringValue(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

export function normalizePlate(value: unknown): string {
  const text = stringValue(value);
  return text ? text.toUpperCase().replace(/[^A-Z0-9]/g, '') : '';
}

export function selectAnprWatchlistMatch(
  metadata: Record<string, unknown>,
  vehicles: readonly WatchlistVehicle[],
): WatchlistVehicle | null {
  const plate = normalizePlate(metadata.plate);
  if (!plate) return null;

  const candidates = vehicles.filter((vehicle) =>
    typeof vehicle.status === 'string'
    && vehicle.status.trim().toUpperCase() === 'ACTIVE'
    && normalizePlate(vehicle.numberPlate) === plate,
  );
  const nested = asRecord(metadata.watchlist);
  const reference = stringValue(metadata.watchlist_vehicle_id)
    || stringValue(metadata.watchlist_id)
    || (nested ? stringValue(nested.vehicleId) || stringValue(nested.id) : null);
  if (reference) {
    return candidates.find((vehicle) => vehicle.id === reference || vehicle.vehicleId === reference) || null;
  }
  return candidates.length === 1 ? candidates[0] : null;
}

const WATCHLIST_METADATA_FIELDS = [
  'matched_plate',
  'watchlist',
  'watchlist_id',
  'watchlist_number_plate',
  'watchlist_vehicle_id',
  'watchlist_status',
  'watchlist_vehicle_type',
  'watchlist_category',
  'watchlist_description',
];

export function buildAnprMatchMetadata(
  metadata: Record<string, unknown>,
  match: WatchlistVehicle | null,
): Record<string, unknown> {
  const result: Record<string, unknown> = { ...metadata, watchlist_match: Boolean(match) };
  const normalizedPlate = normalizePlate(metadata.plate);
  if (normalizedPlate) result.plate = normalizedPlate;
  for (const field of WATCHLIST_METADATA_FIELDS) {
    delete result[field];
  }
  if (!match) return result;

  return {
    ...result,
    matched_plate: normalizePlate(match.numberPlate),
    watchlist_id: match.id,
    watchlist_number_plate: match.numberPlate,
    watchlist_vehicle_id: match.vehicleId,
    watchlist_status: match.status,
    watchlist_vehicle_type: match.vehicleType ?? null,
    watchlist_category: match.category ?? null,
    watchlist_description: match.description ?? null,
    watchlist: {
      id: match.id,
      vehicleId: match.vehicleId,
      numberPlate: match.numberPlate,
      vehicleType: match.vehicleType ?? null,
      status: match.status,
      category: match.category ?? null,
      description: match.description ?? null,
      addedBy: match.addedBy ?? null,
    },
  };
}
