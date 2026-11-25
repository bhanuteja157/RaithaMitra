// frontend/src/components/biointel/BioIntelNurseryFinder.tsx
'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useFarm } from '@/context/FarmContext';
import { fetchNearbyNurseries, fetchNurseryProducts } from '@/lib/biointelApi';
import { Nursery, NurseryProduct } from '@/types';
import {
  Store,
  MapPin,
  Phone,
  ExternalLink,
  CheckCircle2,
  RotateCw,
  MessageCircle,
  Navigation,
  AlertCircle,
} from 'lucide-react';

interface BioIntelNurseryFinderProps {
  crop: string;
  varietyName: string;
  requiredSeedKg: number;
  budgetInr: number;
}

export function BioIntelNurseryFinder({
  crop,
  varietyName,
  requiredSeedKg,
  budgetInr,
}: BioIntelNurseryFinderProps) {
  const { currentFarm } = useFarm();
  const lat = currentFarm?.latitude ?? 13.3409;
  const lon = currentFarm?.longitude ?? 77.101;
  const locationLabel = currentFarm
    ? `${currentFarm.village || ''}${currentFarm.village && currentFarm.district ? ', ' : ''}${currentFarm.district || ''}`
    : 'Tumakuru, Karnataka';

  const [nurseries, setNurseries] = useState<Nursery[]>([]);
  const [products, setProducts] = useState<NurseryProduct[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [radiusKm, setRadiusKm] = useState<number>(50);

  const loadSuppliers = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const [nRes, pRes] = await Promise.all([
        fetchNearbyNurseries(lat, lon, radiusKm),
        fetchNurseryProducts({ crop, query: varietyName || crop }),
      ]);
      setNurseries(Array.isArray(nRes) ? nRes : []);
      setProducts(Array.isArray(pRes) ? pRes : []);
    } catch {
      setErrorMsg('Unable to reach nursery supplier service right now. Please verify the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSuppliers();
  }, [crop, varietyName, lat, lon, radiusKm]);

  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-5 sm:p-6 space-y-5 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 shrink-0">
            <Store className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-zinc-900 dark:text-white">
              3. Find Nearby Nurseries &amp; Seed Suppliers
            </h3>
            <p className="text-xs text-zinc-500">
              Automatically prefilled from your crop plan — no re-entry needed.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={radiusKm}
            onChange={(e) => setRadiusKm(Number(e.target.value))}
            aria-label="Search radius"
            className="px-3 py-1.5 rounded-xl border border-zinc-300 dark:border-zinc-700 text-xs font-semibold bg-zinc-50 dark:bg-zinc-900"
          >
            <option value={10}>Within 10 km</option>
            <option value={25}>Within 25 km</option>
            <option value={50}>Within 50 km</option>
            <option value={100}>Within 100 km</option>
          </select>
          <button
            type="button"
            onClick={loadSuppliers}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-zinc-300 dark:border-zinc-700 text-xs font-semibold hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Prefilled Plan Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 p-3.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900 text-xs">
        <div>
          <span className="text-zinc-500 block">Selected Crop</span>
          <strong className="text-emerald-900 dark:text-emerald-200">{crop}</strong>
        </div>
        <div>
          <span className="text-zinc-500 block">Selected Variety</span>
          <strong className="text-emerald-900 dark:text-emerald-200">{varietyName || 'Recommended'}</strong>
        </div>
        <div>
          <span className="text-zinc-500 block">Seed Needed</span>
          <strong>{requiredSeedKg} kg</strong>
        </div>
        <div>
          <span className="text-zinc-500 block">Farm Location</span>
          <strong className="truncate block">{locationLabel}</strong>
        </div>
        <div>
          <span className="text-zinc-500 block">Budget</span>
          <strong>₹{budgetInr.toLocaleString('en-IN')}</strong>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-28 rounded-xl bg-zinc-100 dark:bg-zinc-900 animate-pulse" />
          ))}
        </div>
      ) : nurseries.length === 0 && products.length === 0 ? (
        <div className="p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 text-center space-y-2 text-xs text-zinc-500">
          <p>No live nursery suppliers found within {radiusKm} km for {crop}.</p>
          <Link
            href={`/nursery-marketplace?crop=${encodeURIComponent(crop)}&query=${encodeURIComponent(varietyName || '')}`}
            className="inline-flex items-center gap-1.5 font-semibold text-emerald-700 hover:underline"
          >
            Open Full Nursery &amp; Bio-Input Directory <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Matching Seed & Bio-Input Products */}
          {products.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                Matching Seeds &amp; Bio-Inputs ({products.length})
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {products.slice(0, 4).map((prod) => (
                  <div
                    key={prod.id}
                    className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900 space-y-1.5 text-xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <strong className="text-sm text-zinc-900 dark:text-white">
                          {prod.variety_name || prod.crop_name}
                        </strong>
                        <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                          {prod.data_source === 'demo_data'
                            ? 'Demo Data'
                            : prod.data_source === 'google_places_supplier'
                              ? 'Google Places'
                              : 'Direct Inventory'}
                        </span>
                      </div>
                      <span className="font-bold text-emerald-700">
                        {prod.price_per_unit ? `₹${prod.price_per_unit}/${prod.pricing_unit}` : 'Price on inquiry'}
                      </span>
                    </div>
                    <div className="text-zinc-600 dark:text-zinc-400">
                      Supplier: {prod.nursery_name || 'Verified Supplier'} ·{' '}
                      <span className="text-emerald-700 font-medium">
                        {prod.availability_status.replace(/_/g, ' ')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Nearby Nurseries */}
          {nurseries.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                  Nearby Nurseries ({nurseries.length})
                </span>
                <Link
                  href={`/nursery-marketplace?crop=${encodeURIComponent(crop)}&query=${encodeURIComponent(varietyName || '')}`}
                  className="text-xs font-semibold text-emerald-700 hover:underline inline-flex items-center gap-1"
                >
                  Full Nursery Filters <ExternalLink className="w-3 h-3" />
                </Link>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {nurseries.slice(0, 4).map((n) => {
                  const cleanPhone = (n.phone || '').replace(/[^\d+]/g, '');
                  const mapsUrl =
                    n.google_maps_uri ||
                    (n.latitude && n.longitude
                      ? `https://www.google.com/maps/dir/?api=1&destination=${n.latitude},${n.longitude}`
                      : undefined);
                  return (
                    <div
                      key={n.id}
                      className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-2 text-xs"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <strong className="text-sm text-zinc-900 dark:text-white">{n.name}</strong>
                          <div className="text-zinc-500 flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3.5 h-3.5 text-emerald-700" />
                            <span>{n.address || n.district}</span>
                          </div>
                        </div>
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800">
                          {n.is_verified && <CheckCircle2 className="w-3 h-3" />}
                          {n.data_source === 'demo_data'
                            ? 'Demo'
                            : n.data_source === 'google_places_supplier'
                              ? 'Live Places'
                              : 'Verified'}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-2 pt-1">
                        {cleanPhone && (
                          <a
                            href={`tel:${cleanPhone}`}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-700 text-white font-semibold"
                          >
                            <Phone className="w-3 h-3" /> Call
                          </a>
                        )}
                        {cleanPhone && (
                          <a
                            href={`https://wa.me/${cleanPhone.replace(/^\+/, '')}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-green-600 text-white font-semibold"
                          >
                            <MessageCircle className="w-3 h-3" /> WhatsApp
                          </a>
                        )}
                        {mapsUrl && (
                          <a
                            href={mapsUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 font-semibold"
                          >
                            <Navigation className="w-3 h-3" /> Directions
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
