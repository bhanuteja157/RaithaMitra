// frontend/src/app/smart-market/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import BiddingPage from '@/app/bidding/page';
import MarketIntelligencePage from '@/app/market-intelligence/page';
import { HarvestToBiddingDraft, loadHarvestToBiddingDraft } from '@/lib/workflowBridge';
import { useFarm } from '@/context/FarmContext';
import {
  confirmDirectProposal,
  createDirectProposal,
  DirectSaleProposal,
  discoverBuyers,
  listDirectProposals,
  listPurchaseOrders,
  RegisteredBuyer,
  respondDirectProposal,
} from '@/lib/marketplaceApi';
import {
  BellRing,
  CheckCircle2,
  ClipboardList,
  Gavel,
  Handshake,
  MapPin,
  Search,
  Store,
  TrendingUp,
  Truck,
} from 'lucide-react';

type Section =
  | 'today_prices'
  | 'auction'
  | 'find_buyers'
  | 'direct_selling'
  | 'orders'
  | 'forecasting';

export default function SmartMarketPage() {
  const { currentUser, currentFarm, token } = useFarm();
  const [section, setSection] = useState<Section>('today_prices');
  const [draft, setDraft] = useState<HarvestToBiddingDraft | null>(null);

  // Registered Buyer Discovery state
  const [buyers, setBuyers] = useState<RegisteredBuyer[]>([]);
  const [buyerCropFilter, setBuyerCropFilter] = useState<string>('');
  const [buyerDistrictFilter, setBuyerDistrictFilter] = useState<string>('');
  const [buyerCategoryFilter, setBuyerCategoryFilter] = useState<string>('');
  const [buyersLoading, setBuyersLoading] = useState(false);

  // Direct Selling & Orders state
  const [proposals, setProposals] = useState<DirectSaleProposal[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [selectedBuyer, setSelectedBuyer] = useState<RegisteredBuyer | null>(null);
  const [propCrop, setPropCrop] = useState<string>('Tomato');
  const [propQty, setPropQty] = useState<number>(1000);
  const [propPrice, setPropPrice] = useState<number>(24);
  const [propNotes, setPropNotes] = useState<string>('');
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    const sec = new URLSearchParams(window.location.search).get('section');
    if (
      sec === 'today_prices' ||
      sec === 'auction' ||
      sec === 'find_buyers' ||
      sec === 'direct_selling' ||
      sec === 'orders' ||
      sec === 'forecasting'
    ) {
      setSection(sec);
    } else if (sec === 'bidding') {
      setSection('auction');
    } else if (sec === 'market_intel') {
      setSection('today_prices');
    } else if (sec === 'marketplace') {
      setSection('find_buyers');
    }
    setDraft(loadHarvestToBiddingDraft(currentUser.id));
    if (currentFarm?.primary_crop) {
      setPropCrop(currentFarm.primary_crop);
    }
  }, [currentUser.id, currentFarm?.primary_crop]);

  const loadBuyers = async () => {
    setBuyersLoading(true);
    try {
      const list = await discoverBuyers({
        crop: buyerCropFilter || undefined,
        district: buyerDistrictFilter || undefined,
        category: buyerCategoryFilter || undefined,
        lat: currentFarm?.latitude,
        lon: currentFarm?.longitude,
      });
      setBuyers(list);
    } catch (err: any) {
      setActionError(err?.message || 'Unable to load buyers.');
    } finally {
      setBuyersLoading(false);
    }
  };

  const loadProposalsAndOrders = async () => {
    try {
      const [pList, oList] = await Promise.all([
        listDirectProposals(token),
        listPurchaseOrders(token),
      ]);
      setProposals(pList);
      setOrders(oList);
    } catch {
      // Unauthenticated visitors see empty private proposal/order lists
    }
  };

  useEffect(() => {
    if (section === 'find_buyers') loadBuyers();
    if (section === 'direct_selling' || section === 'orders') {
      loadBuyers();
      loadProposalsAndOrders();
    }
  }, [section]);

  const handleSubmitDirectProposal = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    setActionMessage(null);
    if (!selectedBuyer) {
      setActionError('Please select a registered buyer first.');
      return;
    }
    try {
      await createDirectProposal(
        {
          farm_id: currentFarm?.id,
          buyer_id: selectedBuyer.buyer_id,
          crop_name: propCrop,
          quantity_kg: propQty,
          proposed_price_per_kg: propPrice,
          delivery_location: selectedBuyer.delivery_address,
          payment_terms: selectedBuyer.payment_terms,
          notes: propNotes || undefined,
        },
        token
      );
      setActionMessage(`Direct sale proposal sent to ${selectedBuyer.business_name}.`);
      setPropNotes('');
      await loadProposalsAndOrders();
    } catch (err: any) {
      setActionError(err?.message || 'Could not submit direct sale proposal.');
    }
  };

  const handleProposalAction = async (
    proposalId: string,
    action: 'accept' | 'counter' | 'reject' | 'confirm'
  ) => {
    setActionError(null);
    setActionMessage(null);
    try {
      if (action === 'confirm') {
        const res = await confirmDirectProposal(proposalId, token);
        setActionMessage(
          res.order_id
            ? `Confirmed by both parties! Purchase Order ${res.order_id} created.`
            : 'Confirmation recorded. Awaiting counterparty confirmation.'
        );
      } else {
        let counterPrice: number | undefined;
        if (action === 'counter') {
          const raw = window.prompt('Enter counteroffer price (INR/kg):');
          if (!raw) return;
          counterPrice = Number(raw);
          if (!Number.isFinite(counterPrice) || counterPrice <= 0) {
            setActionError('Enter a valid positive counteroffer price.');
            return;
          }
        }
        await respondDirectProposal(proposalId, { action, counter_price_per_kg: counterPrice }, token);
        setActionMessage(`Proposal ${action}ed successfully.`);
      }
      await loadProposalsAndOrders();
    } catch (err: any) {
      setActionError(err?.message || 'Action failed.');
    }
  };

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white">
              Unified Agricultural Marketplace &amp; Live Market Intelligence
            </h1>
            <p className="text-xs sm:text-sm text-zinc-500 mt-1">
              Check official mandi rates, discover registered buyers, negotiate direct sales or auctions, and manage orders.
            </p>
          </div>
          {currentFarm && (
            <div className="text-xs px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-300 font-medium">
              {currentFarm.farm_name} · {currentFarm.district}, {currentFarm.state}
            </div>
          )}
        </div>
      </div>

      {draft && (
        <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 text-xs text-amber-950 dark:text-amber-200">
          <strong>Draft Harvest Ready for Review:</strong> {draft.cropName} ·{' '}
          {draft.quantityKg.toLocaleString('en-IN')} kg · {draft.location} · Suggested floor ₹
          {draft.expectedPricePerKg}/kg (Review &amp; publish — no automatic sale created)
        </div>
      )}

      {actionMessage && (
        <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs font-medium text-emerald-800 dark:text-emerald-300">
          {actionMessage}
        </div>
      )}
      {actionError && (
        <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs font-medium text-red-800 dark:text-red-300">
          {actionError}
        </div>
      )}

      {/* 6 Primary Marketplace Sections */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {[
          { id: 'today_prices' as const, label: "Today's Market Prices", icon: TrendingUp },
          { id: 'auction' as const, label: 'Auction My Harvest', icon: Gavel },
          { id: 'find_buyers' as const, label: 'Find Buyers', icon: Store },
          { id: 'direct_selling' as const, label: 'Direct Selling', icon: Handshake },
          { id: 'orders' as const, label: 'My Offers & Orders', icon: ClipboardList },
          { id: 'forecasting' as const, label: 'Forecasts & Alerts', icon: BellRing },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSection(tab.id)}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs sm:text-sm font-semibold border transition ${
                section === tab.id
                  ? 'bg-emerald-800 text-white border-emerald-800 shadow-sm'
                  : 'bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-200 hover:border-emerald-400'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="truncate">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Section Content */}
      <div>
        {(section === 'today_prices' || section === 'forecasting') && <MarketIntelligencePage />}
        {section === 'auction' && <BiddingPage />}

        {section === 'find_buyers' && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 grid grid-cols-1 sm:grid-cols-4 gap-3">
              <input
                type="text"
                value={buyerCropFilter}
                onChange={(e) => setBuyerCropFilter(e.target.value)}
                placeholder="Filter by crop (e.g. Tomato)"
                className="px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-sm"
              />
              <input
                type="text"
                value={buyerDistrictFilter}
                onChange={(e) => setBuyerDistrictFilter(e.target.value)}
                placeholder="Filter by district (e.g. Mysuru)"
                className="px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-sm"
              />
              <select
                value={buyerCategoryFilter}
                onChange={(e) => setBuyerCategoryFilter(e.target.value)}
                className="px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-sm"
              >
                <option value="">All Buyer Categories</option>
                <option value="wholesaler">Wholesaler</option>
                <option value="supermarket">Supermarket</option>
                <option value="retailer">Retailer</option>
                <option value="food_processor">Food Processor</option>
                <option value="fpo">FPO</option>
                <option value="exporter">Exporter</option>
              </select>
              <button
                type="button"
                onClick={loadBuyers}
                className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-emerald-800 text-white text-sm font-semibold hover:bg-emerald-700"
              >
                <Search className="w-4 h-4" /> Search Buyers
              </button>
            </div>

            {buyersLoading ? (
              <div className="p-6 text-center text-sm text-zinc-500">Loading registered buyers...</div>
            ) : buyers.length === 0 ? (
              <div className="p-6 rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-sm text-zinc-500">
                No registered buyers matched your filters.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {buyers.map((b) => (
                  <div
                    key={b.buyer_id}
                    className="p-5 rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-bold text-base text-zinc-900 dark:text-white">{b.business_name}</h3>
                        <p className="text-xs text-zinc-500 capitalize">
                          {b.buyer_category.replace('_', ' ')} · {b.district}, {b.state}
                          {b.distance_km != null ? ` · ~${b.distance_km} km away` : ''}
                        </p>
                      </div>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                        {b.verification_status === 'demonstration_account' ? 'Demo Buyer' : b.verification_status}
                      </span>
                    </div>
                    <div className="text-xs text-zinc-600 dark:text-zinc-400 space-y-1">
                      <div><strong>Buying:</strong> {b.required_commodities.join(', ') || 'General Produce'}</div>
                      <div><strong>Qty Range:</strong> {b.min_quantity_kg.toLocaleString('en-IN')} – {b.max_quantity_kg.toLocaleString('en-IN')} kg</div>
                      {b.expected_price_min_inr && b.expected_price_max_inr && (
                        <div><strong>Indicative Rate:</strong> ₹{b.expected_price_min_inr} – ₹{b.expected_price_max_inr}/kg</div>
                      )}
                      <div><strong>Delivery:</strong> {b.delivery_address || `${b.district} Yard`}</div>
                      <div><strong>Payment Terms:</strong> {b.payment_terms}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedBuyer(b);
                        setSection('direct_selling');
                      }}
                      className="w-full py-2 rounded-xl bg-emerald-800 text-white text-xs font-semibold hover:bg-emerald-700"
                    >
                      Propose Direct Sale to {b.business_name}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {section === 'direct_selling' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <form
              onSubmit={handleSubmitDirectProposal}
              className="p-5 rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 space-y-4"
            >
              <h2 className="text-base font-bold text-zinc-900 dark:text-white">
                Send Direct Sale Proposal
              </h2>
              <div>
                <label className="block text-xs font-semibold text-zinc-600 mb-1">Registered Buyer</label>
                <select
                  value={selectedBuyer?.buyer_id || ''}
                  onChange={(e) => {
                    const found = buyers.find((b) => b.buyer_id === e.target.value) || null;
                    setSelectedBuyer(found);
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-sm"
                  required
                >
                  <option value="">Select a registered buyer...</option>
                  {buyers.map((b) => (
                    <option key={b.buyer_id} value={b.buyer_id}>
                      {b.business_name} ({b.district})
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-600 mb-1">Crop</label>
                  <input
                    type="text"
                    value={propCrop}
                    onChange={(e) => setPropCrop(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-600 mb-1">Qty (kg)</label>
                  <input
                    type="number"
                    min={1}
                    value={propQty}
                    onChange={(e) => setPropQty(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-600 mb-1">Price (₹/kg)</label>
                  <input
                    type="number"
                    min={1}
                    step="0.5"
                    value={propPrice}
                    onChange={(e) => setPropPrice(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-sm"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-600 mb-1">Notes / Quality Details</label>
                <input
                  type="text"
                  value={propNotes}
                  onChange={(e) => setPropNotes(e.target.value)}
                  placeholder="Harvest date, packaging readiness, grade..."
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-sm"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-emerald-800 text-white text-sm font-semibold hover:bg-emerald-700"
              >
                Submit Direct Proposal (Requires Buyer Confirmation)
              </button>
            </form>

            <div className="p-5 rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 space-y-3">
              <h2 className="text-base font-bold text-zinc-900 dark:text-white">Active Direct Proposals</h2>
              {proposals.length === 0 ? (
                <p className="text-xs text-zinc-500">No direct proposals recorded yet.</p>
              ) : (
                proposals.map((p) => (
                  <div key={p.id} className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-2 text-xs">
                    <div className="flex justify-between font-bold">
                      <span>{p.crop_name} · {p.quantity_kg} kg → {p.buyer_name}</span>
                      <span className="uppercase text-emerald-700">{p.status.replace('_', ' ')}</span>
                    </div>
                    <div className="text-zinc-500">
                      Proposed: ₹{p.proposed_price_per_kg}/kg
                      {p.counter_price_per_kg ? ` · Counter: ₹${p.counter_price_per_kg}/kg` : ''}
                      {' · '}Delivery: {p.delivery_location}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {currentUser.role === 'buyer' && p.status === 'proposed' && (
                        <>
                          <button type="button" onClick={() => handleProposalAction(p.id, 'accept')} className="px-2.5 py-1 rounded bg-emerald-700 text-white font-semibold">Accept</button>
                          <button type="button" onClick={() => handleProposalAction(p.id, 'counter')} className="px-2.5 py-1 rounded bg-amber-600 text-white font-semibold">Counter</button>
                          <button type="button" onClick={() => handleProposalAction(p.id, 'reject')} className="px-2.5 py-1 rounded bg-red-600 text-white font-semibold">Reject</button>
                        </>
                      )}
                      {['accepted_by_buyer', 'countered'].includes(p.status) && !p.purchase_order_id && (
                        <button type="button" onClick={() => handleProposalAction(p.id, 'confirm')} className="px-3 py-1 rounded bg-emerald-800 text-white font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Confirm &amp; Generate Purchase Order
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {section === 'orders' && (
          <div className="p-5 rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 space-y-4">
            <h2 className="text-base font-bold text-zinc-900 dark:text-white">Confirmed Purchase Orders</h2>
            {orders.length === 0 ? (
              <p className="text-xs text-zinc-500">No confirmed purchase orders yet. Sign in and confirm an auction or direct sale.</p>
            ) : (
              <div className="space-y-3">
                {orders.map((o) => (
                  <div key={o.id} className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div className="space-y-1">
                      <div className="font-bold text-sm text-zinc-900 dark:text-white">
                        {o.crop_name} · {Number(o.quantity_kg).toLocaleString('en-IN')} kg @ ₹{o.price_per_kg}/kg = ₹{Number(o.total_amount).toLocaleString('en-IN')}
                      </div>
                      <div className="text-zinc-500 flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5" /> {o.pickup_location} → {o.delivery_location} · Buyer: {o.buyer_name}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={`/transport?po_id=${o.id}&crop=${encodeURIComponent(o.crop_name)}&weight=${o.quantity_kg}&pickup=${encodeURIComponent(o.pickup_location)}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-800 text-white font-semibold"
                      >
                        <Truck className="w-3.5 h-3.5" /> Arrange Transport
                      </Link>
                      <Link
                        href="/post-harvest"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 font-semibold"
                      >
                        Packaging &amp; Passport
                      </Link>
                      <Link
                        href="/finance"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 font-semibold"
                      >
                        Record Payment
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
