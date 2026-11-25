// frontend/src/components/dashboard/AnalyticsCharts.tsx
'use client';

import React from 'react';
import { useFarm } from '@/context/FarmContext';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  AreaChart,
  Area,
  CartesianGrid
} from 'recharts';
import { BarChart3, LineChart as LineChartIcon } from 'lucide-react';

export function AnalyticsCharts() {
  const { weather, summary, currentFarm } = useFarm();

  // Prepare water balance time-series
  const forecastDays = weather?.daily_forecast || [];
  const waterChartData = forecastDays.map((d, index) => ({
    name: d.date.slice(5), // MM-DD
    evapotranspiration: d.et0_fao56_mm,
    rainfall: d.precipitation_sum_mm,
    deficit: Math.max(0, +(d.et0_fao56_mm - d.precipitation_sum_mm).toFixed(2)),
  }));

  // Cost vs revenue breakdown
  const financialData = [
    { category: 'Seeds & Saplings', cost: 12000, revenue: 0 },
    { category: 'Fertilizers & NPK', cost: 24000, revenue: 0 },
    { category: 'Irrigation & Power', cost: 14500, revenue: 0 },
    { category: 'Crop Protection', cost: 11000, revenue: 0 },
    { category: 'Labour & Harvest', cost: 26000, revenue: 0 },
    { category: 'Expected Harvest Return', cost: 0, revenue: summary?.expected_revenue_inr || 1375000 },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Chart 1: 7-Day Water Demand vs Forecast Rainfall */}
      <div className="p-6 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
          <div className="flex items-center gap-2">
            <LineChartIcon className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
            <h3 className="text-base font-bold text-zinc-900 dark:text-white">
              7-Day Crop Water Demand vs Rainfall
            </h3>
          </div>
          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-cyan-50 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-300">
            FAO-56 ET0
          </span>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={waterChartData.length > 0 ? waterChartData : [
              { name: 'Day 1', evapotranspiration: 4.6, rainfall: 0.0, deficit: 4.6 },
              { name: 'Day 2', evapotranspiration: 4.8, rainfall: 0.0, deficit: 4.8 },
              { name: 'Day 3', evapotranspiration: 4.2, rainfall: 2.5, deficit: 1.7 },
              { name: 'Day 4', evapotranspiration: 3.5, rainfall: 12.0, deficit: 0.0 },
              { name: 'Day 5', evapotranspiration: 3.8, rainfall: 5.0, deficit: 0.0 },
              { name: 'Day 6', evapotranspiration: 4.4, rainfall: 0.0, deficit: 4.4 },
              { name: 'Day 7', evapotranspiration: 4.6, rainfall: 0.0, deficit: 4.6 },
            ]}>
              <defs>
                <linearGradient id="colorEt" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0284c7" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#0284c7" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorRain" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
              <XAxis dataKey="name" fontSize={11} stroke="#888888" />
              <YAxis fontSize={11} stroke="#888888" unit=" mm" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#18181b',
                  borderColor: '#27272a',
                  borderRadius: '0.75rem',
                  fontSize: '0.75rem',
                  color: '#fff'
                }}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
              <Area type="monotone" dataKey="evapotranspiration" name="Water Demand (ET0 mm)" stroke="#0284c7" fillOpacity={1} fill="url(#colorEt)" />
              <Area type="monotone" dataKey="rainfall" name="Rainfall (mm)" stroke="#22c55e" fillOpacity={1} fill="url(#colorRain)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Chart 2: Cultivation Expenses & Economic Revenue */}
      <div className="p-6 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-rm-primary dark:text-rm-accent" />
            <h3 className="text-base font-bold text-zinc-900 dark:text-white">
              Cultivation Cost Structure (₹ INR)
            </h3>
          </div>
          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
            ₹{(summary?.total_expenses_inr || 87500).toLocaleString('en-IN')} Total
          </span>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={financialData.slice(0, 5)} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" opacity={0.15} horizontal={false} />
              <XAxis type="number" fontSize={11} stroke="#888888" tickFormatter={(v) => `₹${v/1000}k`} />
              <YAxis dataKey="category" type="category" width={110} fontSize={10} stroke="#888888" />
              <Tooltip
                formatter={(val: any) => [`₹${Number(val).toLocaleString('en-IN')}`, 'Expenditure']}
                contentStyle={{
                  backgroundColor: '#18181b',
                  borderColor: '#27272a',
                  borderRadius: '0.75rem',
                  fontSize: '0.75rem',
                  color: '#fff'
                }}
              />
              <Bar dataKey="cost" name="Expenditure" fill="#166534" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
