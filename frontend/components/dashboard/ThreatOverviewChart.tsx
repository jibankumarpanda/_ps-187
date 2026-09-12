"use client";

import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

interface ThreatChartData {
  hour: string;
  critical: number;
  high: number;
  medium: number;
  low: number;
}

interface ThreatOverviewChartProps {
  data: ThreatChartData[];
  className?: string;
}

export function ThreatOverviewChart({ data, className = '' }: ThreatOverviewChartProps) {
  return (
    <div className={`bg-card border border-border rounded-none p-5 flex flex-col ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Threat Activity & Severity Trend</h3>
          <p className="text-xs text-muted-foreground mt-0.5">24-hour border security threat volume overview</p>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <span className="w-2.5 h-2.5 rounded-sm bg-red-500" /> Critical
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#FF8A4C]" /> High
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#F4C95D]" /> Medium
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#63A8FF]" /> Low
          </div>
        </div>
      </div>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="critGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#FF5C67" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#FF5C67" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="highGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#FF8A4C" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#FF8A4C" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="medGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#F4C95D" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#F4C95D" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#263442" vertical={false} />
            <XAxis
              dataKey="hour"
              stroke="#6E7B87"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: '#263442' }}
            />
            <YAxis
              stroke="#6E7B87"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: '#263442' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#18222C',
                borderColor: '#344454',
                borderRadius: '8px',
                color: '#F3F6F8',
                fontSize: '12px',
                boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
              }}
              labelStyle={{ color: '#A7B2BD', fontWeight: 'bold', marginBottom: '4px' }}
            />
            <Area
              type="monotone"
              dataKey="critical"
              name="Critical"
              stroke="#FF5C67"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#critGrad)"
            />
            <Area
              type="monotone"
              dataKey="high"
              name="High"
              stroke="#FF8A4C"
              strokeWidth={1.5}
              fillOpacity={1}
              fill="url(#highGrad)"
            />
            <Area
              type="monotone"
              dataKey="medium"
              name="Medium"
              stroke="#F4C95D"
              strokeWidth={1.5}
              fillOpacity={1}
              fill="url(#medGrad)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
