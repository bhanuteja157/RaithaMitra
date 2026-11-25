// frontend/src/lib/locationApi.ts
import { GeocodeSearchResponse, ReverseGeocodeResponse } from '@/types';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api/v1';

export function validateCoordinates(
  latInput: string,
  lonInput: string
): { valid: true; lat: number; lon: number } | { valid: false; error: string } {
  const latTrim = latInput.trim();
  const lonTrim = lonInput.trim();

  if (!latTrim || !lonTrim) {
    return { valid: false, error: 'Latitude and longitude are required.' };
  }

  const lat = Number(latTrim);
  const lon = Number(lonTrim);

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return { valid: false, error: 'Coordinates must be valid decimal numbers.' };
  }

  if (lat < -90 || lat > 90) {
    return { valid: false, error: 'Latitude must be between -90 and +90.' };
  }

  if (lon < -180 || lon > 180) {
    return { valid: false, error: 'Longitude must be between -180 and +180.' };
  }

  return { valid: true, lat: Number(lat.toFixed(6)), lon: Number(lon.toFixed(6)) };
}

export async function searchLocations(query: string, limit = 6): Promise<GeocodeSearchResponse> {
  const params = new URLSearchParams({ q: query.trim(), limit: String(limit) });
  try {
    const res = await fetch(`${BASE_URL}/locations/search?${params.toString()}`);
    if (res.ok) {
      return await res.json();
    }
    return {
      query,
      results: [],
      attribution: '© OpenStreetMap contributors (Nominatim)',
      cached: false,
      is_live: false,
      error_message: `Location search failed (HTTP ${res.status}).`,
    };
  } catch {
    return {
      query,
      results: [],
      attribution: '© OpenStreetMap contributors (Nominatim)',
      cached: false,
      is_live: false,
      error_message: 'Unable to reach geocoding service. You can select on the map or enter coordinates manually.',
    };
  }
}

export async function reverseGeocode(lat: number, lon: number): Promise<ReverseGeocodeResponse> {
  const params = new URLSearchParams({ lat: String(lat), lon: String(lon) });
  try {
    const res = await fetch(`${BASE_URL}/locations/reverse?${params.toString()}`);
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Graceful fallback without fabricating addresses
  }
  return {
    latitude: lat,
    longitude: lon,
    attribution: '© OpenStreetMap contributors (Nominatim)',
    cached: false,
    is_live: false,
    unavailable_reason: 'Reverse geocoding unavailable; coordinates saved without fabricated address.',
  };
}
