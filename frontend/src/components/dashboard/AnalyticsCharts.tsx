// frontend/src/components/dashboard/AnalyticsCharts.tsx
'use client';

import React from 'react';
import { useFarm } from '@/context/FarmContext';
import { formatLocalizedCurrency } from '@/lib/translations';
import { Language } from '@/types';
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

const CHART_I18N: Record<Language, {
  waterTitle: string; et0Badge: string; waterDemandSeries: string; rainSeries: string;
  costTitle: string; totalSuffix: string; expenditure: string;
  cats: string[];
}> = {
  en: {
    waterTitle: '7-Day Crop Water Demand vs Rainfall', et0Badge: 'Daily ET0',
    waterDemandSeries: 'Water Demand (mm)', rainSeries: 'Rainfall (mm)',
    costTitle: 'Cultivation Cost Structure (₹ INR)', totalSuffix: 'Total', expenditure: 'Expenditure',
    cats: ['Seeds & Saplings', 'Fertilizers & NPK', 'Irrigation & Power', 'Crop Protection', 'Labour & Harvest', 'Expected Revenue'],
  },
  kn: {
    waterTitle: '7-ದಿನದ ಬೆಳೆ ನೀರಿನ ಅಗತ್ಯ ಮತ್ತು ಮಳೆ', et0Badge: 'ದೈನಂದಿನ ET0',
    waterDemandSeries: 'ನೀರಿನ ಅಗತ್ಯ (ಮಿ.ಮೀ)', rainSeries: 'ಮಳೆ (ಮಿ.ಮೀ)',
    costTitle: 'ಬೇಸಾಯ ವೆಚ್ಚದ ವಿವರ (₹ INR)', totalSuffix: 'ಒಟ್ಟು', expenditure: 'ಖರ್ಚು',
    cats: ['ಬೀಜ ಮತ್ತು ಸಸಿಗಳು', 'ಗೊಬ್ಬರ ಮತ್ತು NPK', 'ನೀರಾವರಿ ಮತ್ತು ವಿದ್ಯುತ್', 'ಬೆಳೆ ರಕ್ಷಣೆ', 'ಕೂಲಿ ಮತ್ತು ಕೊಯ್ಲು', 'ನಿರೀಕ್ಷಿತ ಆದಾಯ'],
  },
  hi: {
    waterTitle: '7-दिन फसल पानी की मांग बनाम वर्षा', et0Badge: 'दैनिक ET0',
    waterDemandSeries: 'पानी की मांग (मिमी)', rainSeries: 'वर्षा (मिमी)',
    costTitle: 'खेती खर्च विवरण (₹ INR)', totalSuffix: 'कुल', expenditure: 'खर्च',
    cats: ['बीज व पौध', 'खाद व NPK', 'सिंचाई व बिजली', 'फसल सुरक्षा', 'मजदूरी व कटाई', 'अपेक्षित आमदनी'],
  },
  te: {
    waterTitle: '7-రోజుల పంట నీటి అవసరం vs వర్షపాతం', et0Badge: 'రోజువారీ ET0',
    waterDemandSeries: 'నీటి అవసరం (మి.మీ)', rainSeries: 'వర్షపాతం (మి.మీ)',
    costTitle: 'సాగు ఖర్చుల వివరాలు (₹ INR)', totalSuffix: 'మొత్తం', expenditure: 'ఖర్చు',
    cats: ['విత్తనాలు & మొక్కలు', 'ఎరువులు & NPK', 'నీటిపారుదల & విద్యుత్', 'పంట రక్షణ', 'కూలీ & కోత', 'అంచనా ఆదాయం'],
  },
};

export function AnalyticsCharts() {
  const { weather, summary, language } = useFarm();
  const L = CHART_I18N[language] || CHART_I18N.en;

  // Prepare water balance time-series
  const forecastDays = weather?.daily_forecast || [];
  const waterChartData = forecastDays.map((d) => ({
    name: d.date.slice(5), // MM-DD
    evapotranspiration: d.et0_fao56_mm || 0,
    rainfall: d.precipitation_sum_mm,
    deficit: Math.max(0, +((d.et0_fao56_mm || 0) - d.precipitation_sum_mm).toFixed(2)),
  }));

  // Cost vs revenue breakdown
  const financialData = [
    { category: L.cats[0], cost: 12000, revenue: 0 },
    { category: L.cats[1], cost: 24000, revenue: 0 },
    { category: L.cats[2], cost: 14500, revenue: 0 },
    { category: L.cats[3], cost: 11000, revenue: 0 },
    { category: L.cats[4], cost: 26000, revenue: 0 },
    { category: L.cats[5], cost: 0, revenue: summary?.expected_revenue_inr || 1375000 },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Chart 1: 7-Day Water Demand vs Forecast Rainfall */}
      <div className="p-6 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
          <div className="flex items-center gap-2">
            <LineChartIcon className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
            <h3 className="text-base font-bold text-zinc-900 dark:text-white">
              {L.waterTitle}
            </h3>
          </div>
          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-cyan-50 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-300">
            {L.et0Badge}
          </span>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={waterChartData.length > 0 ? waterChartData : [
              { name: 'D1', evapotranspiration: 4.6, rainfall: 0.0, deficit: 4.6 },
              { name: 'D2', evapotranspiration: 4.8, rainfall: 0.0, deficit: 4.8 },
              { name: 'D3', evapotranspiration: 4.2, rainfall: 2.5, deficit: 1.7 },
              { name: 'D4', evapotranspiration: 3.5, rainfall: 12.0, deficit: 0.0 },
              { name: 'D5', evapotranspiration: 3.8, rainfall: 5.0, deficit: 0.0 },
              { name: 'D6', evapotranspiration: 4.4, rainfall: 0.0, deficit: 4.4 },
              { name: 'D7', evapotranspiration: 4.6, rainfall: 0.0, deficit: 4.6 },
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
              <Area type="monotone" dataKey="evapotranspiration" name={L.waterDemandSeries} stroke="#0284c7" fillOpacity={1} fill="url(#colorEt)" />
              <Area type="monotone" dataKey="rainfall" name={L.rainSeries} stroke="#22c55e" fillOpacity={1} fill="url(#colorRain)" />
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
              {L.costTitle}
            </h3>
          </div>
          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
            {formatLocalizedCurrency(summary?.total_expenses_inr || 87500, language)} {L.totalSuffix}
          </span>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={financialData.slice(0, 5)} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" opacity={0.15} horizontal={false} />
              <XAxis type="number" fontSize={11} stroke="#888888" tickFormatter={(v) => `₹${v/1000}k`} />
              <YAxis dataKey="category" type="category" width={115} fontSize={10} stroke="#888888" />
              <Tooltip
                formatter={(val: any) => [formatLocalizedCurrency(Number(val), language), L.expenditure]}
                contentStyle={{
                  backgroundColor: '#18181b',
                  borderColor: '#27272a',
                  borderRadius: '0.75rem',
                  fontSize: '0.75rem',
                  color: '#fff'
                }}
              />
              <Bar dataKey="cost" name={L.expenditure} fill="#166534" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
