// frontend/src/components/premium-ui/driver/PremiumDriverDashboard.tsx
'use client';

import React from 'react';
import { Truck, MapPin, Package, IndianRupee, ArrowRight } from 'lucide-react';
import { AgriImage, AGRI_IMAGE_ASSETS } from '../shared/AgriImage';

export interface DriverLoadCard {
  id: string;
  pickupLocation: string;
  deliveryDestination: string;
  produceName: string;
  loadWeightLabel: string;
  quotedChargeLabel: string;
  status: 'Requested' | 'Accepted' | 'In Transit' | 'Delivered';
  progressPct: number;
}

export interface PremiumDriverDashboardProps {
  driverName: string;
  vehicleLabel: string;
  loads: DriverLoadCard[];
  onLoadAction?: (loadId: string) => void;
}

export function PremiumDriverDashboard({
  driverName,
  vehicleLabel,
  loads,
  onLoadAction,
}: PremiumDriverDashboardProps) {
  return (
    <div className="rm-premium-root space-y-6 rm-animate-in">
      <div className="relative rounded-3xl overflow-hidden bg-[#14532D] text-white">
        <div className="absolute inset-0">
          <AgriImage src={AGRI_IMAGE_ASSETS.roleDriver} alt="Agricultural transport vehicle" aspectClass="w-full h-full" />
          <div className="absolute inset-0 bg-[#17251D]/80" />
        </div>
        <div className="relative z-10 p-6 sm:p-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="text-xs text-emerald-200 font-semibold">Transport Connect · Driver</span>
            <h1 className="text-2xl font-bold mt-0.5">{driverName}</h1>
            <p className="text-xs text-emerald-100 mt-1">Vehicle: {vehicleLabel}</p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            {['Find Loads', 'Booking Requests', 'My Trips', 'My Vehicle', 'My Earnings'].map((pill) => (
              <span key={pill} className="px-3 py-1.5 rounded-xl bg-white/15 font-semibold">
                {pill}
              </span>
            ))}
          </div>
        </div>
      </div>

      {loads.length === 0 ? (
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 text-center text-sm text-zinc-500">
          <Truck className="w-8 h-8 mx-auto mb-2 text-zinc-400" />
          No active transport loads assigned right now.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {loads.map((load) => (
            <div
              key={load.id}
              className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 space-y-3 rm-card-hover"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-[#17251D] dark:text-white flex items-center gap-1.5">
                  <Package className="w-4 h-4 text-[#166534]" /> {load.produceName} ({load.loadWeightLabel})
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-[#166534]">
                  {load.status}
                </span>
              </div>

              <div className="text-xs text-zinc-600 dark:text-zinc-300 flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                <span>{load.pickupLocation}</span>
                <ArrowRight className="w-3.5 h-3.5 shrink-0" />
                <span>{load.deliveryDestination}</span>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-[11px] text-zinc-500">
                  <span>Route Progress</span>
                  <span>{load.progressPct}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
                  <div className="h-full bg-[#059669]" style={{ width: `${load.progressPct}%` }} />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-zinc-100 dark:border-zinc-800">
                <span className="text-xs font-bold text-[#17251D] dark:text-white flex items-center gap-1">
                  <IndianRupee className="w-3.5 h-3.5 text-[#166534]" /> {load.quotedChargeLabel}
                </span>
                <button
                  type="button"
                  onClick={() => onLoadAction?.(load.id)}
                  className="px-4 py-2 rounded-xl bg-[#166534] hover:bg-[#14532D] text-white text-xs font-semibold"
                >
                  {load.status === 'Requested' ? 'Accept Load' : 'Update Trip'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
