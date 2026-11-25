// frontend/src/app/dashboard/buyer/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useFarm } from '@/context/FarmContext';
import { BiddingListing, PurchaseOrder } from '@/types';
import {
  ShoppingBag,
  TrendingUp,
  Gavel,
  ShieldCheck,
  Truck,
  ArrowRight,
  ExternalLink,
  MapPin,
  CheckCircle2
} from 'lucide-react';

export default function BuyerDashboardPage() {
  const { currentUser } = useFarm();
  const [listings, setListings] = useState<BiddingListing[]>([]);
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchBuyerData() {
      setLoading(true);
      try {
        const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api/v1';
        const listRes = await fetch(`${backendUrl}/bidding/listings?status_filter=active`);
        if (listRes.ok) setListings(await listRes.json());
        const ordersRes = await fetch(`${backendUrl}/bidding/orders`);
        if (ordersRes.ok) setOrders(await ordersRes.json());
      } catch (e) {
        console.warn(e);
      } finally {
        setLoading(false);
      }
    }
    fetchBuyerData();
  }, []);

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="p-6 md:p-8 bg-gradient-to-r from-emerald-950 via-zinc-900 to-teal-950 border border-emerald-800/60 rounded-3xl shadow-xl text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
            Wholesale Procurement Portal
          </span>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight mt-2">
            Welcome, {currentUser.name}
          </h1>
          <p className="text-sm text-zinc-300 mt-1">
            Browse verified farm-gate produce lots, participate in transparent competitive auctions, and generate compliant purchase orders.
          </p>
        </div>

        <Link
          href="/bidding"
          className="px-5 py-3 rounded-xl bg-rm-accent hover:bg-emerald-400 text-zinc-950 font-bold text-sm shadow-md transition-transform hover:scale-105 self-start md:self-auto shrink-0"
        >
          View Live Auction Desk
        </Link>
      </div>

      {/* KPI Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm space-y-1">
          <div className="text-xs font-semibold text-zinc-500">Active Produce Auctions</div>
          <div className="text-3xl font-black text-zinc-900 dark:text-white">{listings.length}</div>
          <div className="text-[11px] text-emerald-600">Direct from Mandya & Ramanagara farmers</div>
        </div>

        <div className="p-5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm space-y-1">
          <div className="text-xs font-semibold text-zinc-500">Confirmed Purchases</div>
          <div className="text-3xl font-black text-emerald-600">{orders.length} Orders</div>
          <div className="text-[11px] text-zinc-400">Atomic purchase orders issued</div>
        </div>

        <div className="p-5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm space-y-1">
          <div className="text-xs font-semibold text-zinc-500">Procurement Account Status</div>
          <div className="text-2xl font-bold text-purple-600">APMC Verified</div>
          <div className="text-[11px] text-zinc-400">Licence: KA-APMC-BNG-8491</div>
        </div>
      </div>

      {/* Live Produce for Bidding */}
      <div className="p-6 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
          <div className="flex items-center gap-2">
            <Gavel className="w-5 h-5 text-rm-primary dark:text-rm-accent" />
            <h2 className="text-base font-bold text-zinc-900 dark:text-white">
              Available Farm-Gate Lots for Bidding
            </h2>
          </div>
          <Link href="/bidding" className="text-xs font-bold text-rm-primary hover:underline">
            Go to Bidding Desk →
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {listings.map((l) => (
            <div
              key={l.id}
              className="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40 space-y-3"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-base text-zinc-900 dark:text-white">{l.crop_name}</h3>
                  <p className="text-xs text-zinc-500">{l.variety || 'A-Grade'}</p>
                </div>
                <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  {l.quantity_kg.toLocaleString()} kg
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs text-zinc-600 dark:text-zinc-400">
                <span>📍 {l.location}</span>
                <span>🌾 Farmer: <strong>{l.farmer_name}</strong></span>
                <span>Reserve: <strong>₹{l.min_price_per_kg}/kg</strong></span>
                <span>Top Offer: <strong className="text-emerald-600">₹{l.highest_bid_amount || l.min_price_per_kg}/kg</strong></span>
              </div>

              <Link
                href="/bidding"
                className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-rm-primary hover:bg-rm-dark text-white text-xs font-bold shadow-sm transition-colors"
              >
                <span>Place Competing Bid</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
