// frontend/src/components/premium-ui/shared/MonitoringChartCard.tsx
'use client';

import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

export interface RiskStatusItem {
  label: string;
  level: 'Low' | 'Moderate' | 'High';
  detail?: string;
}

export function RiskStatusStrip({ items }: { items: RiskStatusItem[] }) {
  return (
    <div className="space-y-2">
      {items.map((item) => {
        const barColor =
          item.level === 'High'
            ? 'bg-red-600'
            : item.level === 'Moderate'
              ? 'bg-amber-500'
              : 'bg-[#36784D]';
        const textColor =
          item.level === 'High'
            ? 'text-red-700'
            : item.level === 'Moderate'
              ? 'text-amber-700'
              : 'text-[#173C2B]';
        const widthPct = item.level === 'High' ? 88 : item.level === 'Moderate' ? 56 : 24;

        return (
          <div key={item.label} className="text-xs space-y-1">
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium text-[#26332B] dark:text-zinc-200">{item.label}</span>
              <span className={`font-semibold ${textColor}`}>{item.level}</span>
            </div>
            <div className="h-1.5 rounded-full bg-[#E9E5D8] dark:bg-zinc-800 overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${barColor}`}
                style={{ width: `${widthPct}%` }}
              />
            </div>
            {item.detail && <p className="text-[11px] text-zinc-500">{item.detail}</p>}
          </div>
        );
      })}
    </div>
  );
}

export interface MonitoringChartCardProps {
  title: string;
  subtitle?: string;
  data: { name: string; value: number }[];
  unitPrefix?: string;
}

export function MonitoringChartCard({
  title,
  subtitle,
  data,
  unitPrefix = '₹',
}: MonitoringChartCardProps) {
  return (
    <div className="rounded-xl border border-[#E9E5D8] dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-[#26332B] dark:text-zinc-100">{title}</h3>
        {subtitle && <p className="text-xs text-zinc-500">{subtitle}</p>}
      </div>
      <div className="h-52 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E9E5D8" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#26332B' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#8D7357' }} axisLine={false} tickLine={false} />
            <Tooltip
              formatter={(v: any) => `${unitPrefix}${Number(v).toLocaleString('en-IN')}`}
              contentStyle={{
                borderRadius: '10px',
                borderColor: '#E9E5D8',
                fontSize: '12px',
              }}
            />
            <Bar dataKey="value" fill="#36784D" radius={[6, 6, 0, 0]} animationDuration={500} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
