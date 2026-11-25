// frontend/src/app/dashboard/driver/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useFarm } from '@/context/FarmContext';
import {
  Truck,
  Search,
  CalendarCheck,
  Coins,
  ShieldCheck,
  MapPin,
  Clock,
  ArrowRight
} from 'lucide-react';

export default function DriverDashboardPage() {
  const { currentUser } = useFarm();
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (currentUser.role !== 'driver') {
      setBookings([]);
      return;
    }
    async function loadDriverData() {
      setLoading(true);
      try {
        const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api/v1';
        const res = await fetch(`${backendUrl}/transport/bookings?user_id=${currentUser.id}&role=driver`);
        if (res.ok) setBookings(await res.json());
      } catch (e) {
        console.warn(e);
      } finally {
        setLoading(false);
      }
    }
    loadDriverData();
  }, [currentUser.id, currentUser.role]);

  const totalEarnings = bookings
    .filter(b => b.status === 'delivered')
    .reduce((acc, b) => acc + (b.total_fare || 0), 12500);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Driver Greeting Header */}
      <div className="p-6 bg-gradient-to-r from-purple-950 via-zinc-900 to-purple-900 border border-purple-800/60 rounded-3xl shadow-xl text-white space-y-2">
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full text-xs font-bold tracking-wider uppercase bg-purple-500/20 text-purple-300 border border-purple-500/40">
            Logistics Console
          </span>
          <span className="text-xs text-zinc-400">Direct Farm-Gate Freight Dispatch</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
          ನಮಸ್ಕಾರ / Hello, {currentUser.name}
        </h1>
        <p className="text-sm text-zinc-300">
          Accept farm produce freight requests directly from local farmers, update trip milestones, and track guaranteed delivery earnings.
        </p>
      </div>

      {/* 4 Large Mobile-Friendly Primary Action Cards */}
      <div className="grid grid-cols-2 gap-4">
        {/* Action 1: Find Loads */}
        <Link
          href="/transport"
          className="p-6 rounded-3xl bg-white dark:bg-zinc-950 border-2 border-zinc-200 dark:border-zinc-800 hover:border-purple-500 hover:shadow-xl transition-all flex flex-col items-center text-center space-y-3 group"
        >
          <div className="w-16 h-16 rounded-2xl bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-400 flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm">
            <Search className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-lg font-black text-zinc-900 dark:text-white">
              Find Loads
            </h2>
            <p className="text-xs text-zinc-500 mt-1">
              Browse farmer booking requests
            </p>
          </div>
        </Link>

        {/* Action 2: My Bookings */}
        <div
          className="p-6 rounded-3xl bg-white dark:bg-zinc-950 border-2 border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col items-center text-center space-y-3"
        >
          <div className="w-16 h-16 rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shadow-sm">
            <CalendarCheck className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-lg font-black text-zinc-900 dark:text-white">
              My Trips ({bookings.length})
            </h2>
            <p className="text-xs text-zinc-500 mt-1">
              {bookings.filter(b => b.status !== 'delivered').length} active dispatches
            </p>
          </div>
        </div>

        {/* Action 3: My Vehicle */}
        <div
          className="p-6 rounded-3xl bg-white dark:bg-zinc-950 border-2 border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col items-center text-center space-y-3"
        >
          <div className="w-16 h-16 rounded-2xl bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400 flex items-center justify-center shadow-sm">
            <Truck className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-lg font-black text-zinc-900 dark:text-white">
              Tata Ace
            </h2>
            <p className="text-xs text-zinc-500 mt-1">
              KA-11-EA-4521 • 1500 kg Cap
            </p>
          </div>
        </div>

        {/* Action 4: My Earnings */}
        <div
          className="p-6 rounded-3xl bg-white dark:bg-zinc-950 border-2 border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col items-center text-center space-y-3"
        >
          <div className="w-16 h-16 rounded-2xl bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400 flex items-center justify-center shadow-sm">
            <Coins className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-lg font-black text-zinc-900 dark:text-white">
              ₹{totalEarnings.toLocaleString('en-IN')}
            </h2>
            <p className="text-xs text-zinc-500 mt-1">
              Completed freight receipts
            </p>
          </div>
        </div>
      </div>

      {/* Driver Booking Dispatches List */}
      <div className="p-6 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
          <h3 className="text-base font-bold text-zinc-900 dark:text-white">
            Trip Milestone Execution
          </h3>
          <Link href="/transport" className="text-xs font-bold text-purple-600 hover:underline">
            Manage All Dispatches →
          </Link>
        </div>

        {bookings.length > 0 ? (
          <div className="space-y-3">
            {bookings.map((b) => (
              <div
                key={b.id}
                className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-zinc-900 dark:text-white">
                      Trip #{b.id.slice(3, 8)} • {b.produce_type} ({b.weight_kg} kg)
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 uppercase">
                      {b.status}
                    </span>
                  </div>
                  <strong className="text-sm font-extrabold text-emerald-600">
                    ₹{b.total_fare.toLocaleString('en-IN')}
                  </strong>
                </div>

                <div className="text-xs text-zinc-500">
                  Farmer: <strong>{b.farmer_name}</strong> | From: {b.pickup_location} → To: {b.delivery_destination}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-zinc-400 p-4 text-center">
            No active trips assigned. Click 'Find Loads' to accept farmer bookings!
          </p>
        )}
      </div>
    </div>
  );
}
