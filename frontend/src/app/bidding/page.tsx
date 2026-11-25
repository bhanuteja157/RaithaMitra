// frontend/src/app/bidding/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useFarm } from '@/context/FarmContext';
import { BiddingListing, PurchaseOrder } from '@/types';
import {
  Gavel,
  PlusCircle,
  TrendingUp,
  CheckCircle2,
  Clock,
  MapPin,
  Scale,
  Sparkles,
  Truck,
  ArrowRight,
  ShieldCheck,
  Coins
} from 'lucide-react';

export default function SmartBiddingPage() {
  const { currentFarm, currentUser } = useFarm();
  const [listings, setListings] = useState<BiddingListing[]>([]);
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [selectedListing, setSelectedListing] = useState<BiddingListing | null>(null);
  const [bidAmount, setBidAmount] = useState<number>(24);
  const [isListingModalOpen, setIsListingModalOpen] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [newListing, setNewListing] = useState({
    crop_name: currentFarm?.primary_crop || "Tomato",
    variety: currentFarm?.crop_variety || "Arka Rakshak (A-Grade)",
    quantity_kg: 3000,
    min_price_per_kg: 22,
    harvest_date: "2026-11-30",
    location: `${currentFarm?.village || 'Mandya Rural'}, ${currentFarm?.district || 'Mandya'}`,
    bidding_deadline: "2026-11-28T18:00:00Z"
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api/v1';
      const listRes = await fetch(`${backendUrl}/bidding/listings`);
      if (listRes.ok) {
        const lData = await listRes.json();
        setListings(lData);
        if (lData.length > 0 && !selectedListing) {
          fetchListingDetails(lData[0].id);
        }
      }
      const ordersRes = await fetch(`${backendUrl}/bidding/orders`);
      if (ordersRes.ok) setOrders(await ordersRes.json());
    } catch (e) {
      console.warn("Bidding fetch error:", e);
    } finally {
      setLoading(false);
    }
  };

  const fetchListingDetails = async (id: string) => {
    try {
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api/v1';
      const res = await fetch(`${backendUrl}/bidding/listings/${id}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedListing(data);
        setBidAmount(Math.max(data.min_price_per_kg, (data.intelligence?.highest_eligible_offer || data.min_price_per_kg) + 1));
      }
    } catch (e) {
      console.warn(e);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateListing = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api/v1';
      const res = await fetch(`${backendUrl}/bidding/listings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          farmer_id: currentUser.id,
          farmer_name: currentUser.name,
          farm_id: currentFarm?.id,
          ...newListing
        })
      });
      if (res.ok) {
        setIsListingModalOpen(false);
        setFeedback("Produce auction published to APMC buyers!");
        loadData();
        setTimeout(() => setFeedback(null), 4000);
      }
    } catch (e) {
      console.warn(e);
    }
  };

  const handleSubmitBid = async () => {
    if (!selectedListing) return;
    try {
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api/v1';
      const res = await fetch(`${backendUrl}/bidding/listings/${selectedListing.id}/bid`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          buyer_id: currentUser.id,
          buyer_name: currentUser.name,
          buyer_phone: currentUser.phone,
          bid_per_kg: bidAmount
        })
      });
      if (res.ok) {
        setFeedback(`Bid of ₹${bidAmount}/kg submitted!`);
        fetchListingDetails(selectedListing.id);
        loadData();
        setTimeout(() => setFeedback(null), 4000);
      } else {
        const err = await res.json();
        alert(err.detail || "Could not place bid");
      }
    } catch (e) {
      console.warn(e);
    }
  };

  const handleConfirmSale = async (listingId: string) => {
    try {
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api/v1';
      const res = await fetch(`${backendUrl}/bidding/listings/${listingId}/confirm?farmer_id=${currentUser.id}`, {
        method: 'POST'
      });
      if (res.ok) {
        setFeedback("Sale confirmed! Purchase order created. Click 'Arrange Transportation' below.");
        fetchListingDetails(listingId);
        loadData();
        setTimeout(() => setFeedback(null), 5000);
      } else {
        const err = await res.json();
        alert(err.detail || "Could not confirm sale");
      }
    } catch (e) {
      console.warn(e);
    }
  };

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="p-6 md:p-8 bg-gradient-to-r from-amber-950 via-zinc-900 to-amber-900 border border-amber-800/60 rounded-3xl shadow-xl text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-2 max-w-2xl">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-bold tracking-wider uppercase bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              Flagship Innovation #3
            </span>
            <span className="text-xs text-zinc-400">Competitive Produce Auction & Atomic PO Generation</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
            Smart Bidding — Competitive Agricultural Marketplace
          </h1>
          <p className="text-sm text-zinc-300">
            Enabling farmers to discover true market clearing prices. Buyers compete transparently; farmers retain sole authority to accept the winning offer and trigger automated logistics.
          </p>
        </div>

        <button
          onClick={() => setIsListingModalOpen(true)}
          className="flex items-center gap-2 px-5 py-3 rounded-xl bg-rm-accent hover:bg-emerald-400 text-zinc-950 font-bold text-sm shadow-lg transition-transform hover:scale-105 self-start md:self-auto shrink-0"
        >
          <PlusCircle className="w-5 h-5" />
          <span>List Harvest Lot</span>
        </button>
      </div>

      {feedback && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-sm font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Main Grid: Listings vs Bidding Intelligence Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Active Produce Listings */}
        <div className="lg:col-span-1 space-y-3">
          <h2 className="text-base font-bold text-zinc-900 dark:text-white flex items-center justify-between">
            <span>Produce Lots for Auction</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500">
              {listings.length} Lots
            </span>
          </h2>

          <div className="space-y-3">
            {listings.map((l) => {
              const isSelected = selectedListing?.id === l.id;
              return (
                <div
                  key={l.id}
                  onClick={() => fetchListingDetails(l.id)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'border-rm-primary bg-emerald-50/50 dark:bg-emerald-950/30 shadow-md ring-1 ring-rm-primary'
                      : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 hover:border-zinc-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-900 dark:text-white">
                      {l.crop_name}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      l.status === 'confirmed' ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300' :
                      'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                    }`}>
                      {l.status === 'confirmed' ? 'Sale Confirmed' : 'Live Bidding'}
                    </span>
                  </div>
                  <div className="text-xs text-zinc-500 mt-0.5">{l.variety || 'A-Grade'}</div>

                  <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800 text-xs">
                    <div>
                      <span className="text-zinc-400 block text-[10px]">Quantity</span>
                      <strong className="text-zinc-800 dark:text-zinc-200">{l.quantity_kg.toLocaleString()} kg</strong>
                    </div>
                    <div>
                      <span className="text-zinc-400 block text-[10px]">Top Offer</span>
                      <strong className="text-emerald-600 dark:text-emerald-400">
                        ₹{l.highest_bid_amount || l.min_price_per_kg} / kg
                      </strong>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Bidding Intelligence & Action Desk */}
        <div className="lg:col-span-2 space-y-4">
          {selectedListing ? (
            <div className="p-6 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm space-y-6">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-zinc-100 dark:border-zinc-800 gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold text-zinc-900 dark:text-white">
                      {selectedListing.crop_name} — {selectedListing.variety}
                    </h2>
                    <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                      Reserve: ₹{selectedListing.min_price_per_kg}/kg
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500 mt-1">
                    Farmer: <strong>{selectedListing.farmer_name}</strong> • 📍 {selectedListing.location}
                  </p>
                </div>

                <div className="text-right">
                  <div className="text-xs text-zinc-400">Lot Volume</div>
                  <div className="text-2xl font-black text-zinc-900 dark:text-white">
                    {selectedListing.quantity_kg.toLocaleString()} kg
                  </div>
                </div>
              </div>

              {/* Bidding Intelligence Analytics Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                <div>
                  <span className="text-[10px] text-zinc-500 uppercase font-semibold block">Highest Eligible Offer</span>
                  <span className="text-xl font-black text-emerald-600">
                    ₹{selectedListing.intelligence?.highest_eligible_offer || selectedListing.min_price_per_kg} / kg
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-500 uppercase font-semibold block">Total Sale Gross Value</span>
                  <span className="text-xl font-black text-zinc-900 dark:text-white">
                    ₹{(selectedListing.intelligence?.total_sale_value_inr || 0).toLocaleString('en-IN')}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-500 uppercase font-semibold block">Farmer Premium Gain</span>
                  <span className="text-xl font-black text-emerald-600">
                    +₹{(selectedListing.intelligence?.premium_gain_inr || 0).toLocaleString('en-IN')} ({selectedListing.intelligence?.premium_gain_pct || 0}%)
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-500 uppercase font-semibold block">Competing Buyers</span>
                  <span className="text-xl font-black text-purple-600">
                    {selectedListing.intelligence?.competing_buyers_count || 0} Licensed
                  </span>
                </div>
              </div>

              {/* Live Bids Board */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center justify-between">
                  <span>Live Competitive Bids</span>
                  <span className="text-xs text-zinc-400">Real-time ranking</span>
                </h3>

                {selectedListing.bids && selectedListing.bids.length > 0 ? (
                  <div className="space-y-2">
                    {selectedListing.bids.map((b, idx) => (
                      <div
                        key={b.id}
                        className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
                          idx === 0
                            ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 font-bold'
                            : 'border-zinc-200 dark:border-zinc-800'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                            idx === 0 ? 'bg-emerald-600 text-white' : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-600'
                          }`}>
                            {idx + 1}
                          </span>
                          <div>
                            <div className="text-zinc-900 dark:text-white">{b.buyer_name}</div>
                            <div className="text-[10px] text-zinc-400">Timestamp: {b.created_at.slice(11, 19)} UTC</div>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="font-extrabold text-sm text-emerald-600">
                            ₹{b.bid_per_kg} / kg
                          </div>
                          <div className="text-[10px] text-zinc-400">
                            Total: ₹{b.total_amount.toLocaleString('en-IN')}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-zinc-400 p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900 text-center">
                    No bids received yet. Be the first licensed APMC buyer to place an offer!
                  </p>
                )}
              </div>

              {/* Action Area: Buyer Submit Bid OR Farmer Confirm Sale */}
              <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                {selectedListing.status === 'confirmed' ? (
                  <div className="w-full p-4 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-sm text-purple-900 dark:text-purple-300">
                        Purchase Order Confirmed!
                      </div>
                      <div className="text-xs text-purple-700 dark:text-purple-400">
                        Winning Buyer: {selectedListing.intelligence?.highest_bidder} at ₹{selectedListing.intelligence?.highest_eligible_offer}/kg
                      </div>
                    </div>
                    <Link
                      href="/transport"
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-md transition-colors"
                    >
                      <Truck className="w-4 h-4" />
                      <span>Arrange Transportation</span>
                    </Link>
                  </div>
                ) : (
                  <>
                    {/* Buyer Bid Input */}
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <span className="text-xs font-semibold text-zinc-500 whitespace-nowrap">Your Bid (₹/kg):</span>
                      <input
                        type="number"
                        step="0.5"
                        value={bidAmount}
                        onChange={(e) => setBidAmount(parseFloat(e.target.value) || 0)}
                        className="w-24 px-3 py-1.5 text-sm font-bold rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white"
                      />
                      <button
                        onClick={handleSubmitBid}
                        className="px-4 py-2 rounded-lg bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-bold text-xs shadow-sm hover:opacity-90"
                      >
                        Submit Bid
                      </button>
                    </div>

                    {/* Farmer Confirm Button */}
                    <button
                      onClick={() => handleConfirmSale(selectedListing.id)}
                      disabled={!selectedListing.intelligence?.has_bids}
                      className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-rm-primary hover:bg-rm-dark text-white font-bold text-xs shadow-md transition-colors disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Confirm Highest Sale</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-zinc-400 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl">
              Select an active produce auction on the left to view competitive bids
            </div>
          )}
        </div>
      </div>

      {/* Confirmed Purchase Orders Section */}
      {orders.length > 0 && (
        <div className="p-6 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
            <h2 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              <span>Confirmed Purchase Orders ({orders.length})</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {orders.map((po) => (
              <div
                key={po.id}
                className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40 space-y-2 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-zinc-900 dark:text-white">
                      PO #{po.id.slice(3, 8)} • {po.crop_name}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 uppercase">
                      {po.status}
                    </span>
                  </div>
                  <div className="text-xs text-zinc-500 mt-1">
                    Buyer: <strong>{po.buyer_name}</strong> | Farmer: <strong>{po.farmer_name}</strong>
                  </div>
                  <div className="text-xs text-zinc-700 dark:text-zinc-300 mt-1">
                    {po.quantity_kg.toLocaleString()} kg @ ₹{po.price_per_kg}/kg = <strong>₹{po.total_amount.toLocaleString('en-IN')}</strong>
                  </div>
                </div>

                <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
                  <span className="text-[10px] text-zinc-400">
                    Pickup: {po.pickup_location}
                  </span>
                  <Link
                    href={`/transport?po_id=${po.id}&weight=${po.quantity_kg}&crop=${po.crop_name}&pickup=${encodeURIComponent(po.pickup_location)}`}
                    className="flex items-center gap-1 text-xs font-bold text-rm-primary dark:text-rm-accent hover:underline"
                  >
                    <span>Book Logistics</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Produce Listing Creation Modal */}
      {isListingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-white">
              List Produce Lot for Competitive Bidding
            </h2>
            <form onSubmit={handleCreateListing} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 block mb-1">Crop Name *</label>
                  <input
                    type="text"
                    required
                    value={newListing.crop_name}
                    onChange={(e) => setNewListing({ ...newListing, crop_name: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 block mb-1">Variety / Grade</label>
                  <input
                    type="text"
                    value={newListing.variety}
                    onChange={(e) => setNewListing({ ...newListing, variety: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 block mb-1">Total Quantity (kg) *</label>
                  <input
                    type="number"
                    required
                    value={newListing.quantity_kg}
                    onChange={(e) => setNewListing({ ...newListing, quantity_kg: parseFloat(e.target.value) || 100 })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 block mb-1">Reserve Floor (₹/kg) *</label>
                  <input
                    type="number"
                    required
                    value={newListing.min_price_per_kg}
                    onChange={(e) => setNewListing({ ...newListing, min_price_per_kg: parseFloat(e.target.value) || 10 })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 block mb-1">Pickup Farm Address *</label>
                <input
                  type="text"
                  required
                  value={newListing.location}
                  onChange={(e) => setNewListing({ ...newListing, location: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-zinc-200 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsListingModalOpen(false)}
                  className="px-4 py-2 text-sm text-zinc-600 dark:text-zinc-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-bold rounded-lg bg-rm-primary text-white shadow"
                >
                  Publish Auction
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
