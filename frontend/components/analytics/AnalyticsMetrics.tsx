"use client";

import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

interface AnalyticsMetricsProps {
  eventsByDay: { date: string; persons: number; vehicles: number; intrusions: number; anpr: number }[];
  threatDistribution: { name: string; value: number; color: string }[];
  bopEvents: { name: string; events: number; alerts: number }[];
  className?: string;
}

export function AnalyticsMetrics({
  eventsByDay,
  threatDistribution,
  bopEvents,
  className = '',
}: AnalyticsMetricsProps) {
  return (
    <div className={`space-y-6 ${className}`}>
      {/* Top 2 charts: Daily Detection Breakdown & Threat Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Detection Trends */}
        <div className="lg:col-span-8 bg-card border border-border rounded-none p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-foreground">7-Day AI Detection Volume</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Person, vehicle, intrusion & ANPR activity breakdown</p>
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={eventsByDay} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#263442" vertical={false} />
                <XAxis dataKey="date" stroke="#6E7B87" fontSize={11} tickLine={false} />
                <YAxis stroke="#6E7B87" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#18222C',
                    borderColor: '#344454',
                    borderRadius: '8px',
                    color: '#F3F6F8',
                    fontSize: '12px',
                  }}
                />
                <Legend
                  wrapperStyle={{ fontSize: '11px', color: '#A7B2BD', paddingTop: '10px' }}
                />
                <Bar dataKey="persons" name="Person Detections" fill="#37B9FF" radius={[3, 3, 0, 0]} />
                <Bar dataKey="vehicles" name="Vehicle Detections" fill="#F4C95D" radius={[3, 3, 0, 0]} />
                <Bar dataKey="intrusions" name="Virtual Fence Breaches" fill="#FF5C67" radius={[3, 3, 0, 0]} />
                <Bar dataKey="anpr" name="ANPR Plate Matches" fill="#39D98A" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Threat Distribution Donut */}
        <div className="lg:col-span-4 bg-card border border-border rounded-none p-5 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Threat Distribution</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Categorized by threat severity index</p>
          </div>

          <div className="h-60 w-full my-auto flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={threatDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {threatDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="#141C24" strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#18222C',
                    borderColor: '#344454',
                    borderRadius: '8px',
                    color: '#F3F6F8',
                    fontSize: '12px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border text-xs">
            {threatDistribution.map((item) => (
              <div key={item.name} className="flex items-center gap-1.5 text-muted-foreground">
                <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: item.color }} />
                <span>{item.name}:</span>
                <strong className="text-foreground font-mono">{item.value}</strong>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* BOP Comparison Bar */}
      <div className="bg-card border border-border rounded-none p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Sector-Wise BOP Event Distribution</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Comparison of active surveillance telemetry across Border Outposts
            </p>
          </div>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={bopEvents} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#263442" vertical={false} />
              <XAxis dataKey="name" stroke="#6E7B87" fontSize={11} tickLine={false} />
              <YAxis stroke="#6E7B87" fontSize={11} tickLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#18222C',
                  borderColor: '#344454',
                  borderRadius: '8px',
                  color: '#F3F6F8',
                  fontSize: '12px',
                }}
              />
              <Legend wrapperStyle={{ fontSize: '11px', color: '#A7B2BD', paddingTop: '10px' }} />
              <Bar dataKey="events" name="Total Events Logged" fill="#63A8FF" radius={[3, 3, 0, 0]} />
              <Bar dataKey="alerts" name="High/Critical Alerts" fill="#FF5C67" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
