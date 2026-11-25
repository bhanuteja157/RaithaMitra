// frontend/src/components/premium-ui/buyer/PremiumBuyerDashboard.tsx
'use client';

import React from 'react';
import { Gavel, MapPin, Clock, PackageCheck, Truck } from 'lucide-react';
import { AgriImage, AGRI_IMAGE_ASSETS } from '../shared/AgriImage';

export interface BuyerProduceListing {
  id: string;
  cropName: string;
  quantityLabel: string;
  location: string;
  currentOfferLabel: string;
  deadlineLabel: string;
  imageUrl?: string;
}

export interface PremiumBuyerDashboardProps {
  buyerName: string;
  stats: {
    availableCount: number;
    activeAuctions: number;
    myBids: number;
    confirmedPurchases: number;
    inTransitCount: number;
  };
  listings: BuyerProduceListing[];
  onViewDetails?: (listingId: string) => void;
  onPlaceBid?: (listingId: string) => void;
}

export function PremiumBuyerDashboard({
  buyerName,
  stats,
  listings,
  onViewDetails,
  onPlaceBid,
}: PremiumBuyerDashboardProps) {
  return (
    <div className="rm-premium-root space-y-6 rm-animate-in">
      <div className="rounded-3xl bg-[#14532D] text-white p-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-xs text-emerald-200 font-semibold">Buyer Marketplace</span>
          <h1 className="text-2xl font-bold mt-0.5">Welcome, {buyerName}</h1>
          <p className="text-xs text-emerald-100 mt-1">
            Source verified agricultural produce directly from farmers and track confirmed deliveries.
          </p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          {[
            { label: 'Available Lots', val: stats.availableCount },
            { label: 'Active Auctions', val: stats.activeAuctions },
            { label: 'My Bids', val: stats.myBids },
            { label: 'Confirmed', val: stats.confirmedPurchases },
          ].map((s) => (
            <div key={s.label} className="px-3.5 py-2.5 rounded-2xl bg-white/10">
              <div className="text-emerald-200 text-[10px]">{s.label}</div>
              <div className="text-lg font-bold">{s.val}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-[#17251D] dark:text-white">
          Available Agricultural Produce
        </h2>
        <span className="text-xs text-zinc-500 inline-flex items-center gap-1">
          <Truck className="w-3.5 h-3.5" /> {stats.inTransitCount} deliveries in transit
        </span>
      </div>

      {listings.length === 0 ? (
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-8 text-center text-sm text-zinc-500">
          <PackageCheck className="w-8 h-8 mx-auto mb-2 text-zinc-400" />
          No active produce listings are available right now.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {listings.map((item) => {
            const cropKey = item.cropName.toLowerCase();
            const img = item.imageUrl || AGRI_IMAGE_ASSETS.crops[cropKey] || AGRI_IMAGE_ASSETS.roleBuyer;
            return (
              <div
                key={item.id}
                className="group rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex flex-col justify-between rm-card-hover"
              >
                <div>
                  <AgriImage src={img} alt={item.cropName} aspectClass="aspect-[16/10]" />
                  <div className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-base text-[#17251D] dark:text-white">{item.cropName}</h3>
                      <span className="text-xs font-bold text-[#166534] bg-emerald-50 px-2.5 py-1 rounded-full">
                        {item.quantityLabel}
                      </span>
                    </div>
                    <div className="text-xs text-zinc-500 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5" /> {item.location}
                    </div>
                    <div className="text-xs text-zinc-500 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" /> Ends: {item.deadlineLabel}
                    </div>
                    <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 text-xs">
                      Current Eligible Offer:{' '}
                      <strong className="text-sm text-[#17251D] dark:text-white">{item.currentOfferLabel}</strong>
                    </div>
                  </div>
                </div>
                <div className="p-4 pt-0 flex gap-2">
                  <button
                    type="button"
                    onClick={() => onViewDetails?.(item.id)}
                    className="flex-1 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 text-xs font-semibold hover:bg-zinc-50 dark:hover:bg-zinc-800"
                  >
                    View Details
                  </button>
                  <button
                    type="button"
                    onClick={() => onPlaceBid?.(item.id)}
                    className="flex-1 py-2 rounded-xl bg-[#166534] hover:bg-[#14532D] text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5"
                  >
                    <Gavel className="w-3.5 h-3.5" /> Place Bid
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
