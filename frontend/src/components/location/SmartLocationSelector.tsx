// frontend/src/components/location/SmartLocationSelector.tsx
'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useFarm } from '@/context/FarmContext';
import {
  LocationSource,
  SelectedLocation,
  GeocodeSearchResult,
} from '@/types';
import {
  searchLocations,
  reverseGeocode,
  validateCoordinates,
} from '@/lib/locationApi';
import {
  MapPin,
  Search,
  Crosshair,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Navigation,
  Edit3,
} from 'lucide-react';

const LeafletMapInner = dynamic(
  () => import('@/components/location/LeafletMapInner'),
  {
    ssr: false,
    loading: () => (
      <div className="h-64 sm:h-72 w-full rounded-2xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-xs text-zinc-500">
        Loading interactive map...
      </div>
    ),
  }
);

export interface SmartLocationSelectorProps {
  initialLocation?: Partial<SelectedLocation>;
  role?: 'farmer' | 'buyer' | 'labour';
  title?: string;
  subtitle?: string;
  compactMap?: boolean;
  onConfirmLocation: (location: SelectedLocation) => void | Promise<void>;
  confirmLabel?: string;
}

export function SmartLocationSelector({
  initialLocation,
  role = 'farmer',
  title,
  subtitle,
  compactMap = false,
  onConfirmLocation,
  confirmLabel,
}: SmartLocationSelectorProps) {
  const { t } = useFarm();

  // Coordinates state (kept separate from saved farm until confirmed)
  const [lat, setLat] = useState<number>(initialLocation?.latitude ?? 12.5234);
  const [lon, setLon] = useState<number>(initialLocation?.longitude ?? 76.8976);
  const [latInput, setLatInput] = useState<string>(String(initialLocation?.latitude ?? 12.5234));
  const [lonInput, setLonInput] = useState<string>(String(initialLocation?.longitude ?? 76.8976));
  const [coordError, setCoordError] = useState<string | null>(null);

  // Address fields
  const [village, setVillage] = useState<string>(initialLocation?.village ?? '');
  const [district, setDistrict] = useState<string>(initialLocation?.district ?? '');
  const [stateName, setStateName] = useState<string>(initialLocation?.state ?? '');
  const [pinCode, setPinCode] = useState<string>(initialLocation?.pin_code ?? '');
  const [formattedAddress, setFormattedAddress] = useState<string>(initialLocation?.formatted_address ?? '');

  // Source & accuracy metadata
  const [locationSource, setLocationSource] = useState<LocationSource>(
    initialLocation?.location_source ?? 'map'
  );
  const [accuracyMeters, setAccuracyMeters] = useState<number | undefined>(
    initialLocation?.location_accuracy_m
  );

  // Search state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<GeocodeSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // GPS & Reverse Geocode state
  const [isLocatingGps, setIsLocatingGps] = useState<boolean>(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [isReversing, setIsReversing] = useState<boolean>(false);
  const [reverseNote, setReverseNote] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [savedFeedback, setSavedFeedback] = useState<string | null>(null);

  // Sync if initialLocation changes externally
  useEffect(() => {
    if (initialLocation?.latitude !== undefined && initialLocation?.longitude !== undefined) {
      setLat(initialLocation.latitude);
      setLon(initialLocation.longitude);
      setLatInput(String(initialLocation.latitude));
      setLonInput(String(initialLocation.longitude));
    }
    if (initialLocation?.village !== undefined) setVillage(initialLocation.village);
    if (initialLocation?.district !== undefined) setDistrict(initialLocation.district);
    if (initialLocation?.state !== undefined) setStateName(initialLocation.state);
    if (initialLocation?.pin_code !== undefined) setPinCode(initialLocation.pin_code || '');
    if (initialLocation?.formatted_address !== undefined) {
      setFormattedAddress(initialLocation.formatted_address || '');
    }
  }, [
    initialLocation?.latitude,
    initialLocation?.longitude,
    initialLocation?.village,
    initialLocation?.district,
    initialLocation?.state,
  ]);

  const performReverseGeocode = async (targetLat: number, targetLon: number) => {
    setIsReversing(true);
    setReverseNote(null);
    const rev = await reverseGeocode(targetLat, targetLon);
    setIsReversing(false);

    if (rev.unavailable_reason) {
      setReverseNote(rev.unavailable_reason);
      return;
    }

    if (rev.village_or_locality) setVillage(rev.village_or_locality);
    if (rev.district) setDistrict(rev.district);
    if (rev.state) setStateName(rev.state);
    if (rev.pin_code) setPinCode(rev.pin_code);
    if (rev.formatted_address) setFormattedAddress(rev.formatted_address);
  };

  // Method 1: Explicit Location Search
  const handleSearchSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (searchQuery.trim().length < 2) {
      setSearchError('Enter at least 2 characters (village, city, district, state, or PIN code).');
      return;
    }
    setIsSearching(true);
    setSearchError(null);
    setSavedFeedback(null);
    const res = await searchLocations(searchQuery);
    setIsSearching(false);
    if (res.error_message) {
      setSearchError(res.error_message);
    }
    setSearchResults(res.results || []);
    if (!res.error_message && res.results.length === 0) {
      setSearchError('No matching locations found. Try a nearby town, district, or PIN code.');
    }
  };

  const handleSelectSearchResult = (item: GeocodeSearchResult) => {
    setLat(item.latitude);
    setLon(item.longitude);
    setLatInput(String(item.latitude));
    setLonInput(String(item.longitude));
    setVillage(item.village_or_locality || '');
    setDistrict(item.district || '');
    setStateName(item.state || '');
    setPinCode(item.pin_code || '');
    setFormattedAddress(item.display_name);
    setLocationSource('search');
    setAccuracyMeters(undefined);
    setCoordError(null);
    setGpsError(null);
    setSearchResults([]);
    setSavedFeedback(null);
  };

  // Method 2: Interactive Map click or marker drag
  const handleMapSelect = (newLat: number, newLon: number) => {
    setLat(newLat);
    setLon(newLon);
    setLatInput(String(newLat));
    setLonInput(String(newLon));
    setLocationSource('map');
    setAccuracyMeters(undefined);
    setCoordError(null);
    setSavedFeedback(null);
    performReverseGeocode(newLat, newLon);
  };

  // Method 3: Use My Current Location (one-shot GPS)
  const handleUseCurrentLocation = () => {
    setGpsError(null);
    setSavedFeedback(null);

    if (typeof window === 'undefined' || !('geolocation' in navigator)) {
      setGpsError('Geolocation is not supported by this browser.');
      return;
    }

    setIsLocatingGps(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const detectedLat = Number(position.coords.latitude.toFixed(6));
        const detectedLon = Number(position.coords.longitude.toFixed(6));
        const acc = Math.round(position.coords.accuracy);

        setLat(detectedLat);
        setLon(detectedLon);
        setLatInput(String(detectedLat));
        setLonInput(String(detectedLon));
        setAccuracyMeters(acc);
        setLocationSource('gps');
        setCoordError(null);
        setIsLocatingGps(false);

        performReverseGeocode(detectedLat, detectedLon);
      },
      (err) => {
        setIsLocatingGps(false);
        if (err.code === err.PERMISSION_DENIED) {
          setGpsError('Location permission denied. Please enable location access or select on the map.');
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          setGpsError('Device location unavailable. Please search or click on the map.');
        } else if (err.code === err.TIMEOUT) {
          setGpsError('Location request timed out. Please try again or enter coordinates manually.');
        } else {
          setGpsError('Unable to detect device location.');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  // Method 4: Manual Coordinates + Locate on Map
  const handleLocateManual = () => {
    setCoordError(null);
    setSavedFeedback(null);
    const check = validateCoordinates(latInput, lonInput);
    if (!check.valid) {
      setCoordError(check.error);
      return;
    }
    setLat(check.lat);
    setLon(check.lon);
    setLatInput(String(check.lat));
    setLonInput(String(check.lon));
    setLocationSource('manual');
    setAccuracyMeters(undefined);
    performReverseGeocode(check.lat, check.lon);
  };

  // Confirm and Save Location
  const handleConfirm = async () => {
    const check = validateCoordinates(latInput, lonInput);
    if (!check.valid) {
      setCoordError(check.error);
      return;
    }
    setIsSaving(true);
    setCoordError(null);
    const payload: SelectedLocation = {
      latitude: check.lat,
      longitude: check.lon,
      village: village.trim() || 'Rural Locality',
      district: district.trim() || 'Mandya',
      state: stateName.trim() || 'Karnataka',
      pin_code: pinCode.trim() || undefined,
      formatted_address: formattedAddress.trim() || undefined,
      location_source: locationSource,
      location_accuracy_m: accuracyMeters,
      updated_at: new Date().toISOString(),
    };
    try {
      await onConfirmLocation(payload);
      setSavedFeedback('Location confirmed and saved.');
    } finally {
      setIsSaving(false);
    }
  };

  // Simplified Labour Dashboard View (Requirement 9)
  if (role === 'labour') {
    return (
      <div className="p-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h3 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
              <MapPin className="w-4 h-4 text-green-700" />
              {title || t('labourLocationTitle')}
            </h3>
            <p className="text-xs text-zinc-500">
              {subtitle || 'Find nearby agricultural work by GPS or entering your village.'}
            </p>
          </div>
          <button
            type="button"
            onClick={handleUseCurrentLocation}
            disabled={isLocatingGps}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-green-800 hover:bg-green-700 text-white text-xs font-semibold transition disabled:opacity-60"
          >
            {isLocatingGps ? <Loader2 className="w-4 h-4 animate-spin" /> : <Crosshair className="w-4 h-4" />}
            {t('useMyCurrentLocation')}
          </button>
        </div>

        {gpsError && (
          <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{gpsError}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div>
            <label className="block font-medium text-zinc-600 dark:text-zinc-400 mb-1">Village / Locality</label>
            <input
              type="text"
              value={village}
              onChange={(e) => setVillage(e.target.value)}
              placeholder="e.g. Gubbi"
              className="w-full p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700"
            />
          </div>
          <div>
            <label className="block font-medium text-zinc-600 dark:text-zinc-400 mb-1">District</label>
            <input
              type="text"
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
              placeholder="e.g. Tumakuru"
              className="w-full p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700"
            />
          </div>
          <div className="flex items-end">
            <button
              type="button"
              onClick={handleConfirm}
              disabled={isSaving}
              className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition"
            >
              {confirmLabel || t('confirmAndSaveLocation')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-sm space-y-4">
      {/* Header + Use My Current Location */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-100 dark:border-zinc-800 pb-3">
        <div>
          <h3 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
            <MapPin className="w-4 h-4 text-green-700 dark:text-green-400" />
            {title || (role === 'buyer' ? t('buyerDeliveryLocation') : t('smartLocationSelector'))}
          </h3>
          <p className="text-xs text-zinc-500">
            {subtitle || 'Search a place, click or drag the map pin, detect GPS, or enter coordinates.'}
          </p>
        </div>

        <button
          type="button"
          onClick={handleUseCurrentLocation}
          disabled={isLocatingGps}
          className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-green-800 hover:bg-green-700 text-white text-xs font-semibold transition shadow-sm disabled:opacity-60 shrink-0"
        >
          {isLocatingGps ? <Loader2 className="w-4 h-4 animate-spin" /> : <Crosshair className="w-4 h-4 text-emerald-300" />}
          {t('useMyCurrentLocation')}
        </button>
      </div>

      {/* Method 1: Search Bar */}
      <div className="space-y-2">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSearchSubmit();
                }
              }}
              placeholder={t('searchLocationPlaceholder')}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 focus:outline-none focus:ring-1 focus:ring-green-700"
            />
          </div>
          <button
            type="button"
            onClick={() => handleSearchSubmit()}
            disabled={isSearching}
            className="px-4 py-2 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-semibold hover:opacity-90 transition disabled:opacity-60"
          >
            {isSearching ? 'Searching...' : 'Search'}
          </button>
        </div>

        {searchError && (
          <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{searchError}</span>
          </div>
        )}

        {searchResults.length > 0 && (
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/60 divide-y divide-zinc-200 dark:divide-zinc-700 max-h-44 overflow-y-auto">
            {searchResults.map((item, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelectSearchResult(item)}
                className="w-full text-left px-3 py-2 text-xs hover:bg-green-50 dark:hover:bg-green-950/30 transition flex items-start justify-between gap-2"
              >
                <div>
                  <div className="font-semibold text-zinc-900 dark:text-white line-clamp-1">
                    {item.village_or_locality || item.district || item.display_name.split(',')[0]}
                  </div>
                  <div className="text-[11px] text-zinc-500 line-clamp-1">{item.display_name}</div>
                </div>
                <span className="text-[10px] font-mono text-zinc-400 shrink-0">
                  {item.latitude.toFixed(4)}, {item.longitude.toFixed(4)}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* GPS Status / Error */}
      {gpsError && (
        <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{gpsError}</span>
        </div>
      )}

      {locationSource === 'gps' && accuracyMeters !== undefined && (
        <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 text-xs flex items-center justify-between">
          <span className="flex items-center gap-1.5 font-medium">
            <Navigation className="w-3.5 h-3.5" />
            Device GPS detected (Accuracy: ±{accuracyMeters} m). Review and confirm before saving.
          </span>
        </div>
      )}

      {/* Method 2: Interactive OpenStreetMap */}
      <LeafletMapInner
        latitude={lat}
        longitude={lon}
        onSelectCoordinates={handleMapSelect}
        heightClass={compactMap ? 'h-48' : 'h-64 sm:h-72'}
      />

      {/* Method 4: Manual Coordinates Input */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs items-end">
        <div>
          <label className="block font-medium text-zinc-600 dark:text-zinc-400 mb-1">
            {t('latitudeLabel')} (-90 to +90)
          </label>
          <input
            type="text"
            inputMode="decimal"
            value={latInput}
            onChange={(e) => setLatInput(e.target.value)}
            className="w-full p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 font-mono"
          />
        </div>

        <div>
          <label className="block font-medium text-zinc-600 dark:text-zinc-400 mb-1">
            {t('longitudeLabel')} (-180 to +180)
          </label>
          <input
            type="text"
            inputMode="decimal"
            value={lonInput}
            onChange={(e) => setLonInput(e.target.value)}
            className="w-full p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 font-mono"
          />
        </div>

        <button
          type="button"
          onClick={handleLocateManual}
          className="py-2.5 px-4 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-semibold transition"
        >
          {t('locateOnMap')}
        </button>
      </div>

      {coordError && (
        <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{coordError}</span>
        </div>
      )}

      {/* Resolved Address & Manual Corrections */}
      <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-700 space-y-3 text-xs">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
            <Edit3 className="w-3.5 h-3.5 text-green-700" />
            Resolved Address Details (Editable)
          </span>
          {isReversing && (
            <span className="text-[11px] text-zinc-500 flex items-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin" /> Looking up address...
            </span>
          )}
        </div>

        {reverseNote && <p className="text-[11px] text-amber-600">{reverseNote}</p>}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          <div>
            <label className="block text-[11px] text-zinc-500 mb-0.5">Village / Locality</label>
            <input
              type="text"
              value={village}
              onChange={(e) => setVillage(e.target.value)}
              placeholder="Village or locality"
              className="w-full p-2 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700"
            />
          </div>
          <div>
            <label className="block text-[11px] text-zinc-500 mb-0.5">District</label>
            <input
              type="text"
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
              placeholder="District"
              className="w-full p-2 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700"
            />
          </div>
          <div>
            <label className="block text-[11px] text-zinc-500 mb-0.5">State</label>
            <input
              type="text"
              value={stateName}
              onChange={(e) => setStateName(e.target.value)}
              placeholder="State"
              className="w-full p-2 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700"
            />
          </div>
          <div>
            <label className="block text-[11px] text-zinc-500 mb-0.5">PIN Code</label>
            <input
              type="text"
              value={pinCode}
              onChange={(e) => setPinCode(e.target.value)}
              placeholder="e.g. 571401"
              className="w-full p-2 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700"
            />
          </div>
        </div>

        {formattedAddress && (
          <div className="text-[11px] text-zinc-500">
            <strong>Address:</strong> {formattedAddress}
          </div>
        )}
      </div>

      {/* Footer: Source badge + Confirm & Save button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
        <div className="text-[11px] text-zinc-500 flex items-center gap-2 flex-wrap">
          <span>
            Source: <strong className="uppercase">{locationSource}</strong>
          </span>
          <span>•</span>
          <span>Selected: {lat.toFixed(5)}, {lon.toFixed(5)}</span>
          {savedFeedback && (
            <span className="text-emerald-600 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> {savedFeedback}
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={handleConfirm}
          disabled={isSaving}
          className="px-5 py-2.5 rounded-xl bg-green-800 hover:bg-green-700 text-white font-semibold text-xs flex items-center justify-center gap-2 transition shadow-sm disabled:opacity-60"
        >
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4 text-emerald-300" />}
          {confirmLabel || t('confirmAndSaveLocation')}
        </button>
      </div>
    </div>
  );
}
