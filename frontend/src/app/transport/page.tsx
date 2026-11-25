// frontend/src/app/transport/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useFarm } from '@/context/FarmContext';
import { TransportVehicle, TransportBooking } from '@/types';
import { loadOrderToTransportTransfer } from '@/lib/workflowBridge';
import PostHarvestPage from '@/app/post-harvest/page';
import {
  Truck,
  PlusCircle,
  MapPin,
  Clock,
  Coins,
  CheckCircle2,
  Sparkles,
  Phone,
  ArrowRight,
  ShieldAlert,
  Boxes,
  Compass,
  Warehouse
} from 'lucide-react';

function TransportConnectContent() {
  const searchParams = useSearchParams();
  const { currentFarm, currentUser } = useFarm();
  const [section, setSection] = useState<'transport' | 'post_harvest'>('transport');

  const [drivers, setDrivers] = useState<TransportVehicle[]>([]);
  const [bookings, setBookings] = useState<TransportBooking[]>([]);
  const [cargoWeight, setCargoWeight] = useState<number>(
    parseFloat(searchParams.get('weight') || '1200')
  );
  const [produceCrop, setProduceCrop] = useState<string>(
    searchParams.get('crop') || currentFarm?.primary_crop || 'Tomato'
  );
  const [pickupAddr, setPickupAddr] = useState<string>(
    searchParams.get('pickup') || `${currentFarm?.village || 'Mandya Rural'}, ${currentFarm?.district || 'Mandya'}`
  );
  const [destAddr, setDestAddr] = useState<string>("Yeshwanthpur APMC Yard, Bengaluru");

  const [sharedOptResult, setSharedOptResult] = useState<any>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api/v1';
      // Load drivers matching capacity
      const driversRes = await fetch(`${backendUrl}/transport/drivers?min_capacity_kg=${cargoWeight}`);
      if (driversRes.ok) setDrivers(await driversRes.json());

      // Load bookings
      const bookRes = await fetch(`${backendUrl}/transport/bookings`);
      if (bookRes.ok) setBookings(await bookRes.json());
    } catch (e) {
      console.warn("Transport data fetch error:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [cargoWeight]);

  useEffect(() => {
    const transfer = loadOrderToTransportTransfer(currentUser.id);
    if (transfer) {
      if (!searchParams.get('crop')) setProduceCrop(transfer.cropName);
      if (!searchParams.get('weight')) setCargoWeight(transfer.quantityKg);
      if (!searchParams.get('pickup')) setPickupAddr(transfer.pickupLocation);
      setDestAddr(transfer.deliveryLocation);
    }
  }, [currentUser.id, searchParams]);

  const handleBookDriver = async (driver: TransportVehicle) => {
    const estDistance = 60.0;
    const fare = estDistance * driver.base_fare_per_km;
    try {
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api/v1';
      const res = await fetch(`${backendUrl}/transport/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          farmer_id: currentUser.id,
          farmer_name: currentUser.name,
          driver_id: driver.driver_id,
          driver_name: driver.driver_name,
          driver_phone: driver.driver_phone,
          purchase_order_id: searchParams.get('po_id') || undefined,
          produce_type: produceCrop,
          weight_kg: cargoWeight,
          pickup_location: pickupAddr,
          delivery_destination: destAddr,
          pickup_time: "Tomorrow 06:30 AM",
          vehicle_type: driver.vehicle_type,
          estimated_distance_km: estDistance,
          total_fare: fare
        })
      });
      if (res.ok) {
        setFeedback(`Transport booking requested with ${driver.driver_name} (${driver.vehicle_type})!`);
        loadData();
        setTimeout(() => setFeedback(null), 5000);
      }
    } catch (e) {
      console.warn(e);
    }
  };

  const handleUpdateStatus = async (bookingId: string, status: string) => {
    try {
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api/v1';
      const res = await fetch(`${backendUrl}/transport/bookings/${bookingId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        setFeedback(`Status updated to: ${status.replace('_', ' ').toUpperCase()}`);
        loadData();
        setTimeout(() => setFeedback(null), 4000);
      } else {
        const err = await res.json();
        alert(err.detail || "Transition failed");
      }
    } catch (e) {
      console.warn(e);
    }
  };

  const handleRunSharedOptimization = async () => {
    try {
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api/v1';
      const res = await fetch(`${backendUrl}/transport/optimize-shared`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          total_produce_kg: cargoWeight,
          farmers_count: 2,
          distance_km: 65.0,
          vehicle_type: "Tata Ace"
        })
      });
      if (res.ok) {
        setSharedOptResult(await res.json());
      }
    } catch (e) {
      console.warn(e);
    }
  };

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="p-6 md:p-8 bg-gradient-to-r from-purple-950 via-zinc-900 to-purple-900 border border-purple-800/60 rounded-3xl shadow-xl text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-2 max-w-2xl">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-bold tracking-wider uppercase bg-purple-500/20 text-purple-300 border border-purple-500/40 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              Flagship Innovation #4
            </span>
            <span className="text-xs text-zinc-400">Direct Farm-to-Mandi Logistics & OR-Tools Pooling</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
            Transport Connect — Agricultural Logistics & Shared Fleet
          </h1>
          <p className="text-sm text-zinc-300">
            Eliminates transport middlemen. Filter vehicles with verified capacity for your cargo weight, compare transparent per-km rates, track trip milestones, and pool shared vehicles using OR-Tools routing.
          </p>
        </div>

        <button
          onClick={handleRunSharedOptimization}
          className="flex items-center gap-2 px-5 py-3 rounded-xl bg-purple-500 hover:bg-purple-400 text-white font-bold text-sm shadow-lg transition-transform hover:scale-105 self-start md:self-auto shrink-0"
        >
          <Boxes className="w-5 h-5" />
          <span>Evaluate Shared Load</span>
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2 max-w-md">
        {[
          { id: 'transport' as const, label: 'Book Transport', icon: Truck },
          { id: 'post_harvest' as const, label: 'Post-Harvest & Storage', icon: Warehouse },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSection(tab.id)}
              className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition ${
                section === tab.id
                  ? 'bg-purple-700 text-white border-purple-700'
                  : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {section === 'post_harvest' ? (
        <PostHarvestPage />
      ) : (
        <>

      {feedback && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-sm font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Shared Logistics OR-Tools Optimization Card */}
      {sharedOptResult && (
        <div className="p-5 rounded-2xl bg-gradient-to-br from-purple-900/40 via-zinc-900 to-zinc-900 border border-purple-500/40 text-white space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-purple-300 flex items-center gap-1.5">
              <Compass className="w-4 h-4 text-purple-400" />
              Google OR-Tools Collective Routing Result
            </span>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-emerald-500/20 text-emerald-300">
              {sharedOptResult.savings_percentage}% Cost Reduction
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div>
              <span className="text-zinc-400 block text-[10px]">Independent Cost</span>
              <strong className="text-sm">₹{sharedOptResult.independent_trip_cost_inr}</strong>
            </div>
            <div>
              <span className="text-zinc-400 block text-[10px]">Pooled Cost per Farmer</span>
              <strong className="text-sm text-emerald-400">₹{sharedOptResult.shared_cost_per_farmer_inr}</strong>
            </div>
            <div>
              <span className="text-zinc-400 block text-[10px]">Total Savings</span>
              <strong className="text-sm text-emerald-400">₹{sharedOptResult.savings_per_farmer_inr}</strong>
            </div>
            <div>
              <span className="text-zinc-400 block text-[10px]">Vehicle Capacity Fill</span>
              <strong className="text-sm">{sharedOptResult.capacity_utilization_pct}% ({sharedOptResult.vehicle_type})</strong>
            </div>
          </div>
        </div>
      )}

      {/* Cargo & Route Prefill Bar */}
      <div className="p-6 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm space-y-4">
        <h2 className="text-base font-bold text-zinc-900 dark:text-white">
          Cargo Specifications & Route Setup
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="text-xs font-semibold text-zinc-500 block mb-1">Cargo Weight (kg)</label>
            <input
              type="number"
              value={cargoWeight}
              onChange={(e) => setCargoWeight(parseFloat(e.target.value) || 100)}
              className="w-full px-3 py-2 text-sm font-bold rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-zinc-500 block mb-1">Produce Type</label>
            <input
              type="text"
              value={produceCrop}
              onChange={(e) => setProduceCrop(e.target.value)}
              className="w-full px-3 py-2 text-sm font-bold rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-zinc-500 block mb-1">Pickup Location</label>
            <input
              type="text"
              value={pickupAddr}
              onChange={(e) => setPickupAddr(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-zinc-500 block mb-1">Destination Market</label>
            <input
              type="text"
              value={destAddr}
              onChange={(e) => setDestAddr(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white"
            />
          </div>
        </div>
      </div>

      {/* Available Vehicles / Drivers Matching Capacity */}
      <div className="p-6 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
          <div className="flex items-center gap-2">
            <Truck className="w-5 h-5 text-rm-primary dark:text-rm-accent" />
            <h2 className="text-base font-bold text-zinc-900 dark:text-white">
              Eligible Goods Vehicles (Capacity ≥ {cargoWeight} kg)
            </h2>
          </div>
          <span className="text-xs text-zinc-500">
            Direct farmer-driver dispatch
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {drivers.map((d) => {
            const estFare = Math.round(60 * d.base_fare_per_km);
            return (
              <div
                key={d.id}
                className="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40 space-y-3 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300">
                      {d.vehicle_type}
                    </span>
                    <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                      ~{d.approx_distance_km} km away
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-zinc-900 dark:text-white mt-2">
                    {d.driver_name}
                  </h3>
                  <div className="text-xs text-zinc-500">
                    Reg: <strong>{d.vehicle_reg_number}</strong> • Operating: {d.service_area}
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-zinc-200 dark:border-zinc-800 text-xs">
                    <div>
                      <span className="text-zinc-400 block text-[10px]">Payload Capacity</span>
                      <strong className="text-zinc-900 dark:text-white text-sm">{d.capacity_kg} kg</strong>
                    </div>
                    <div>
                      <span className="text-zinc-400 block text-[10px]">Estimated Trip Fare (~60km)</span>
                      <strong className="text-emerald-600 dark:text-emerald-400 text-sm">
                        ₹{estFare} (₹{d.base_fare_per_km}/km)
                      </strong>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-2">
                  <a
                    href={`https://wa.me/91${d.driver_phone.replace(/[^0-9]/g, '')}?text=Hello%20${d.driver_name},%20we%20need%20transportation%20for%20${cargoWeight}kg%20${produceCrop}%20on%20RaithaMitra`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 px-3 py-2 rounded-xl bg-zinc-200 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 text-xs font-semibold hover:bg-zinc-300"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>WhatsApp</span>
                  </a>

                  <button
                    onClick={() => handleBookDriver(d)}
                    className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-rm-primary hover:bg-rm-dark text-white text-xs font-bold shadow-sm transition-colors"
                  >
                    <span>Request Booking</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Active Trip Bookings & Tracking Timeline */}
      <div className="p-6 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm space-y-4">
        <h2 className="text-base font-bold text-zinc-900 dark:text-white">
          Active Trip Bookings & Delivery Milestone Tracking ({bookings.length})
        </h2>

        <div className="space-y-3">
          {bookings.map((b) => (
            <div
              key={b.id}
              className="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40 space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-zinc-900 dark:text-white">
                      Trip #{b.id.slice(3, 8)} • {b.produce_type} ({b.weight_kg} kg)
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 uppercase">
                      {b.status.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="text-xs text-zinc-500 mt-1">
                    Driver: <strong>{b.driver_name}</strong> • Vehicle: {b.vehicle_type}
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xs text-zinc-400">Total Agreed Fare</div>
                  <div className="text-base font-extrabold text-emerald-600">
                    ₹{b.total_fare.toLocaleString('en-IN')}
                  </div>
                </div>
              </div>

              {/* Status Timeline */}
              <div className="grid grid-cols-5 gap-1 pt-2 border-t border-zinc-200 dark:border-zinc-800 text-[10px] text-center font-bold">
                <div className={`p-1.5 rounded ${b.status !== 'requested' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                  1. Requested
                </div>
                <div className={`p-1.5 rounded ${['accepted', 'pickup_scheduled', 'picked_up', 'in_transit', 'delivered'].includes(b.status) ? 'bg-emerald-100 text-emerald-800' : 'bg-zinc-100 text-zinc-400'}`}>
                  2. Accepted
                </div>
                <div className={`p-1.5 rounded ${['picked_up', 'in_transit', 'delivered'].includes(b.status) ? 'bg-emerald-100 text-emerald-800' : 'bg-zinc-100 text-zinc-400'}`}>
                  3. Picked Up
                </div>
                <div className={`p-1.5 rounded ${['in_transit', 'delivered'].includes(b.status) ? 'bg-emerald-100 text-emerald-800' : 'bg-zinc-100 text-zinc-400'}`}>
                  4. In Transit
                </div>
                <div className={`p-1.5 rounded ${b.status === 'delivered' ? 'bg-emerald-600 text-white' : 'bg-zinc-100 text-zinc-400'}`}>
                  5. Delivered
                </div>
              </div>

              {/* Status Update Control for Driver */}
              {currentUser.role === 'driver' && b.status !== 'delivered' && (
                <div className="pt-2 flex items-center justify-end gap-2">
                  {b.status === 'requested' && (
                    <button
                      onClick={() => handleUpdateStatus(b.id, 'accepted')}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-bold text-xs"
                    >
                      Accept Trip
                    </button>
                  )}
                  {b.status === 'accepted' && (
                    <button
                      onClick={() => handleUpdateStatus(b.id, 'pickup_scheduled')}
                      className="px-3 py-1.5 rounded-lg bg-blue-600 text-white font-bold text-xs"
                    >
                      Confirm Schedule
                    </button>
                  )}
                  {b.status === 'pickup_scheduled' && (
                    <button
                      onClick={() => handleUpdateStatus(b.id, 'picked_up')}
                      className="px-3 py-1.5 rounded-lg bg-amber-600 text-white font-bold text-xs"
                    >
                      Confirm Picked Up
                    </button>
                  )}
                  {b.status === 'picked_up' && (
                    <button
                      onClick={() => handleUpdateStatus(b.id, 'in_transit')}
                      className="px-3 py-1.5 rounded-lg bg-purple-600 text-white font-bold text-xs"
                    >
                      Start Transit
                    </button>
                  )}
                  {b.status === 'in_transit' && (
                    <button
                      onClick={() => handleUpdateStatus(b.id, 'delivered')}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-bold text-xs"
                    >
                      Mark Delivered
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
        </>
      )}
    </div>
  );
}

export default function TransportConnectPage() {
  return (
    <React.Suspense fallback={<div className="p-8 text-center text-slate-400">Loading Transport Connect...</div>}>
      <TransportConnectContent />
    </React.Suspense>
  );
}
