// frontend/src/lib/digital-farming/geo.ts
// Geodesic polygon area, perimeter, centroid, validation, and local GeoJSON persistence.

export interface LatLonPoint {
  lat: number;
  lon: number;
}

export interface GeoAreaBreakdown {
  sqMeters: number;
  acres: number;
  hectares: number;
  guntas: number;
  cents: number;
}

export interface PolygonMetrics {
  valid: boolean;
  error?: string;
  pointCount: number;
  area: GeoAreaBreakdown;
  perimeterMeters: number;
  centroid: LatLonPoint;
  geoJsonPolygon: {
    type: 'Polygon';
    coordinates: [number, number][][];
  };
}

export interface SavedVirtualFarm {
  id: string;
  name: string;
  locationLabel: string;
  points: LatLonPoint[];
  area: GeoAreaBreakdown;
  perimeterMeters: number;
  centroid: LatLonPoint;
  geoJson: {
    type: 'Feature';
    properties: {
      id: string;
      name: string;
      locationLabel: string;
      areaAcres: number;
      createdAt: string;
    };
    geometry: {
      type: 'Polygon';
      coordinates: [number, number][][];
    };
  };
  createdAt: string;
  isDemo?: boolean;
}

export interface HarvestToMarketPayload {
  farmName: string;
  locationLabel: string;
  latitude: number;
  longitude: number;
  areaAcres: number;
  cropId: string;
  cropName: string;
  harvestQuantityKg: number;
  cultivationExpensesInr: number;
  expectedSellingPricePerKg: number;
  cultivationDurationDays: number;
  transferredAt: string;
}

const EARTH_RADIUS_M = 6378137; // WGS84 equatorial radius matching @turf/area
const SQ_METERS_PER_ACRE = 4046.8564224;
const SQ_METERS_PER_HECTARE = 10000;

export const SAVED_FARMS_STORAGE_KEY = 'raithamitra_digital_farms_v1';
export const HARVEST_TRANSFER_STORAGE_KEY = 'raithamitra_df_to_market_v1';

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function isValidCoordinate(lat: number, lon: number): boolean {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lon) &&
    lat >= -90 &&
    lat <= 90 &&
    lon >= -180 &&
    lon <= 180
  );
}

/**
 * Remove consecutive duplicate points (within ~0.1m).
 */
export function deduplicatePoints(points: LatLonPoint[]): LatLonPoint[] {
  const cleaned: LatLonPoint[] = [];
  for (const pt of points) {
    if (!isValidCoordinate(pt.lat, pt.lon)) continue;
    const prev = cleaned[cleaned.length - 1];
    if (!prev || Math.abs(prev.lat - pt.lat) > 1e-6 || Math.abs(prev.lon - pt.lon) > 1e-6) {
      cleaned.push({
        lat: Number(pt.lat.toFixed(6)),
        lon: Number(pt.lon.toFixed(6)),
      });
    }
  }
  // Also drop closing point if identical to first point
  if (cleaned.length > 1) {
    const first = cleaned[0];
    const last = cleaned[cleaned.length - 1];
    if (Math.abs(first.lat - last.lat) <= 1e-6 && Math.abs(first.lon - last.lon) <= 1e-6) {
      cleaned.pop();
    }
  }
  return cleaned;
}

function orientation(p: LatLonPoint, q: LatLonPoint, r: LatLonPoint): number {
  const val = (q.lon - p.lon) * (r.lat - q.lat) - (q.lat - p.lat) * (r.lon - q.lon);
  if (Math.abs(val) < 1e-12) return 0;
  return val > 0 ? 1 : 2;
}

function onSegment(p: LatLonPoint, q: LatLonPoint, r: LatLonPoint): boolean {
  return (
    q.lon <= Math.max(p.lon, r.lon) + 1e-12 &&
    q.lon >= Math.min(p.lon, r.lon) - 1e-12 &&
    q.lat <= Math.max(p.lat, r.lat) + 1e-12 &&
    q.lat >= Math.min(p.lat, r.lat) - 1e-12
  );
}

function segmentsIntersect(p1: LatLonPoint, q1: LatLonPoint, p2: LatLonPoint, q2: LatLonPoint): boolean {
  const o1 = orientation(p1, q1, p2);
  const o2 = orientation(p1, q1, q2);
  const o3 = orientation(p2, q2, p1);
  const o4 = orientation(p2, q2, q1);

  if (o1 !== o2 && o3 !== o4) return true;
  if (o1 === 0 && onSegment(p1, p2, q1)) return true;
  if (o2 === 0 && onSegment(p1, q2, q1)) return true;
  if (o3 === 0 && onSegment(p2, p1, q2)) return true;
  if (o4 === 0 && onSegment(p2, q1, q2)) return true;
  return false;
}

/**
 * Rejects self-intersecting polygons by checking non-adjacent edge pairs.
 */
export function hasSelfIntersection(points: LatLonPoint[]): boolean {
  const n = points.length;
  if (n < 4) return false;
  for (let i = 0; i < n; i++) {
    const a1 = points[i];
    const a2 = points[(i + 1) % n];
    for (let j = i + 1; j < n; j++) {
      // Skip adjacent edges (including wrap-around first/last)
      if (j === i || j === (i + 1) % n || (i === 0 && j === n - 1)) continue;
      const b1 = points[j];
      const b2 = points[(j + 1) % n];
      if (segmentsIntersect(a1, a2, b1, b2)) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Spherical excess polygon area in square metres (matching @turf/area / geojson-area).
 * Coordinates in GeoJSON ring must be ordered [lon, lat].
 */
export function calculateGeoPolygonAreaSqMeters(points: LatLonPoint[]): number {
  const clean = deduplicatePoints(points);
  if (clean.length < 3) return 0;

  // Build closed ring in [lon, lat] order
  const ring: [number, number][] = clean.map((p) => [p.lon, p.lat]);
  ring.push([clean[0].lon, clean[0].lat]);

  let total = 0;
  const len = ring.length - 1;
  for (let i = 0; i < len; i++) {
    const lower = ring[i];
    const middle = ring[(i + 1) % len];
    const upper = ring[(i + 2) % len];

    const lowerX = toRad(lower[0]);
    const middleY = toRad(middle[1]);
    const upperX = toRad(upper[0]);

    total += (upperX - lowerX) * Math.sin(middleY);
  }

  return Math.abs((total * EARTH_RADIUS_M * EARTH_RADIUS_M) / 2);
}

export function haversineDistanceMeters(a: LatLonPoint, b: LatLonPoint): number {
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const sinLat = Math.sin(dLat / 2);
  const sinLon = Math.sin(dLon / 2);
  const h = sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLon * sinLon;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function calculateGeoPerimeterMeters(points: LatLonPoint[]): number {
  const clean = deduplicatePoints(points);
  if (clean.length < 2) return 0;
  let total = 0;
  for (let i = 0; i < clean.length; i++) {
    total += haversineDistanceMeters(clean[i], clean[(i + 1) % clean.length]);
  }
  return total;
}

export function calculateGeoCentroid(points: LatLonPoint[]): LatLonPoint {
  const clean = deduplicatePoints(points);
  if (clean.length === 0) return { lat: 13.3392, lon: 77.114 }; // Tumakuru default centre
  let sumLat = 0;
  let sumLon = 0;
  for (const pt of clean) {
    sumLat += pt.lat;
    sumLon += pt.lon;
  }
  return {
    lat: Number((sumLat / clean.length).toFixed(6)),
    lon: Number((sumLon / clean.length).toFixed(6)),
  };
}

export function convertSqMetersToUnits(sqMeters: number): GeoAreaBreakdown {
  const safeSqM = Math.max(0, Number.isFinite(sqMeters) ? sqMeters : 0);
  const acres = safeSqM / SQ_METERS_PER_ACRE;
  return {
    sqMeters: Number(safeSqM.toFixed(2)),
    acres: Number(acres.toFixed(4)),
    hectares: Number((safeSqM / SQ_METERS_PER_HECTARE).toFixed(4)),
    guntas: Number((acres * 40).toFixed(2)),
    cents: Number((acres * 100).toFixed(2)),
  };
}

export function evaluateFarmPolygon(rawPoints: LatLonPoint[]): PolygonMetrics {
  const clean = deduplicatePoints(rawPoints);
  const centroid = calculateGeoCentroid(clean);
  const closedRing: [number, number][] =
    clean.length >= 3
      ? [...clean.map((p): [number, number] => [p.lon, p.lat]), [clean[0].lon, clean[0].lat]]
      : clean.map((p): [number, number] => [p.lon, p.lat]);

  if (clean.length < 3) {
    return {
      valid: false,
      error: 'Select at least 3 distinct boundary points to form a farmland polygon.',
      pointCount: clean.length,
      area: convertSqMetersToUnits(0),
      perimeterMeters: Number(calculateGeoPerimeterMeters(clean).toFixed(1)),
      centroid,
      geoJsonPolygon: { type: 'Polygon', coordinates: [closedRing] },
    };
  }

  if (hasSelfIntersection(clean)) {
    return {
      valid: false,
      error: 'Boundary lines cross each other (self-intersecting polygon). Drag or undo crossing points.',
      pointCount: clean.length,
      area: convertSqMetersToUnits(0),
      perimeterMeters: Number(calculateGeoPerimeterMeters(clean).toFixed(1)),
      centroid,
      geoJsonPolygon: { type: 'Polygon', coordinates: [closedRing] },
    };
  }

  const sqMeters = calculateGeoPolygonAreaSqMeters(clean);
  if (sqMeters < 10) {
    return {
      valid: false,
      error: 'Selected polygon area is too small (< 10 m²). Place points around the field perimeter.',
      pointCount: clean.length,
      area: convertSqMetersToUnits(sqMeters),
      perimeterMeters: Number(calculateGeoPerimeterMeters(clean).toFixed(1)),
      centroid,
      geoJsonPolygon: { type: 'Polygon', coordinates: [closedRing] },
    };
  }

  return {
    valid: true,
    pointCount: clean.length,
    area: convertSqMetersToUnits(sqMeters),
    perimeterMeters: Number(calculateGeoPerimeterMeters(clean).toFixed(1)),
    centroid,
    geoJsonPolygon: { type: 'Polygon', coordinates: [closedRing] },
  };
}

export function buildSavedVirtualFarm(
  name: string,
  locationLabel: string,
  points: LatLonPoint[],
  existingId?: string,
  isDemo = false
): SavedVirtualFarm | null {
  const metrics = evaluateFarmPolygon(points);
  if (!metrics.valid) return null;
  const clean = deduplicatePoints(points);
  const id = existingId || `df_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const createdAt = new Date().toISOString();

  return {
    id,
    name: name.trim() || 'My Mapped Farmland',
    locationLabel: locationLabel.trim() || `${metrics.centroid.lat}, ${metrics.centroid.lon}`,
    points: clean,
    area: metrics.area,
    perimeterMeters: metrics.perimeterMeters,
    centroid: metrics.centroid,
    geoJson: {
      type: 'Feature',
      properties: {
        id,
        name: name.trim() || 'My Mapped Farmland',
        locationLabel: locationLabel.trim() || `${metrics.centroid.lat}, ${metrics.centroid.lon}`,
        areaAcres: metrics.area.acres,
        createdAt,
      },
      geometry: metrics.geoJsonPolygon,
    },
    createdAt,
    isDemo,
  };
}

export function loadSavedFarmsFromStorage(): SavedVirtualFarm[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(SAVED_FARMS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveFarmsToStorage(farms: SavedVirtualFarm[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(SAVED_FARMS_STORAGE_KEY, JSON.stringify(farms));
  } catch {
    // Ignore storage quota errors
  }
}

export function saveHarvestTransferPayload(payload: HarvestToMarketPayload): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(HARVEST_TRANSFER_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Ignore storage quota errors
  }
}

export function loadHarvestTransferPayload(): HarvestToMarketPayload | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(HARVEST_TRANSFER_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as HarvestToMarketPayload;
  } catch {
    return null;
  }
}

/**
 * Fictional demonstration farmland near Tumakuru, Karnataka (~2.25 acres).
 * Clearly labelled as a fictional demonstration example.
 */
export function getTumakuruDemoFarm(): SavedVirtualFarm {
  const demoPoints: LatLonPoint[] = [
    { lat: 13.3412, lon: 77.1135 },
    { lat: 13.3412, lon: 77.1144 },
    { lat: 13.3403, lon: 77.1145 },
    { lat: 13.3402, lon: 77.1134 },
  ];
  return buildSavedVirtualFarm(
    'Tumakuru Demo Plot (Fictional)',
    'Near Tumakuru, Karnataka (Demo)',
    demoPoints,
    'demo_tumakuru_01',
    true
  )!;
}
