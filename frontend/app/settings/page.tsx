"use client";

import React, { useState } from 'react';
import {
  Settings,
  User,
  Shield,
  Bell,
  Sliders,
  Camera,
  Server,
  Save,
  RotateCcw,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { useToast } from '@/components/ui/Toast';

export default function SettingsPage() {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<
    'profile' | 'security' | 'notifications' | 'thresholds' | 'scoring' | 'camera' | 'system'
  >('profile');

  // Form states
  const [operatorName, setOperatorName] = useState('Saikat Bera');
  const [operatorEmail, setOperatorEmail] = useState('saikat.bera@ibvap.gov.in');
  const [operatorBOP, setOperatorBOP] = useState('BOP-12 (North Sector)');

  const [minConfidence, setMinConfidence] = useState(85);
  const [intrusionSensitivity, setIntrusionSensitivity] = useState(90);
  const [autoAcknowledgeLow, setAutoAcknowledgeLow] = useState(false);
  const [audioAlerts, setAudioAlerts] = useState(true);
  const [defaultStreamQuality, setDefaultStreamQuality] = useState('1080p');

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    showToast({
      title: 'Configuration Saved',
      message: 'Operator preferences and detection thresholds have been synchronized.',
      type: 'success',
    });
  };

  const handleReset = () => {
    setMinConfidence(85);
    setIntrusionSensitivity(90);
    setAutoAcknowledgeLow(false);
    setAudioAlerts(true);
    setDefaultStreamQuality('1080p');
    showToast({
      title: 'Preferences Reset',
      message: 'Default command center values restored.',
      type: 'info',
    });
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'thresholds', label: 'Alert Thresholds', icon: Sliders },
    { id: 'scoring', label: 'Threat Scoring', icon: Shield },
    { id: 'camera', label: 'Camera Preferences', icon: Camera },
    { id: 'system', label: 'System', icon: Server },
  ] as const;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings & Preferences"
        subtitle="Manage command center operator credentials, detection confidence thresholds, and system preferences."
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Navigation Sidebar Tabs (Section 39) */}
        <div className="lg:col-span-3 bg-card border border-border rounded-none p-2 space-y-1 h-fit">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-none text-xs font-semibold transition-colors text-left ${
                  isActive
                    ? 'bg-muted text-accent border border-border'
                    : 'text-[#8D99A5] hover:bg-muted/60 hover:text-foreground'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-accent' : 'text-muted-foreground'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Form Content */}
        <div className="lg:col-span-9 bg-card border border-border rounded-none p-6">
          <form onSubmit={handleSave} className="space-y-6">
            {activeTab === 'profile' && (
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-foreground border-b border-border pb-3">
                  Operator Identity & Duty Assignment
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground block mb-1">Full Name</label>
                    <input
                      type="text"
                      value={operatorName}
                      onChange={(e) => setOperatorName(e.target.value)}
                      className="w-full bg-[#0F151C] border border-[#2B3947] rounded-none px-3 h-10 text-xs text-foreground focus:border-[#37B9FF] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground block mb-1">Official Gov Email</label>
                    <input
                      type="email"
                      value={operatorEmail}
                      onChange={(e) => setOperatorEmail(e.target.value)}
                      className="w-full bg-[#0F151C] border border-[#2B3947] rounded-none px-3 h-10 text-xs text-foreground focus:border-[#37B9FF] focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">Assigned Base Sector</label>
                  <input
                    type="text"
                    disabled
                    value={operatorBOP}
                    className="w-full bg-[#0F151C] border border-[#2B3947] rounded-none px-3 h-10 text-xs text-muted-foreground font-mono cursor-not-allowed"
                  />
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Duty assignments can only be changed by the Border Sector Commander.
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'thresholds' && (
              <div className="space-y-5">
                <h3 className="text-sm font-semibold text-foreground border-b border-border pb-3">
                  AI Model Detection Sensitivity & Confidence
                </h3>
                <div>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="font-semibold text-muted-foreground">Minimum AI Detection Confidence</span>
                    <span className="font-mono text-accent font-bold">{minConfidence}%</span>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="99"
                    value={minConfidence}
                    onChange={(e) => setMinConfidence(Number(e.target.value))}
                    className="w-full accent-[#37B9FF] cursor-pointer"
                  />
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Detections with confidence below this threshold are discarded to prevent false alarms.
                  </p>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="font-semibold text-muted-foreground">Virtual Fence Intrusion Sensitivity</span>
                    <span className="font-mono text-red-500 font-bold">{intrusionSensitivity}%</span>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="100"
                    value={intrusionSensitivity}
                    onChange={(e) => setIntrusionSensitivity(Number(e.target.value))}
                    className="w-full accent-[#FF5C67] cursor-pointer"
                  />
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Higher sensitivity triggers immediate alarm upon single-pixel polygon boundary intersection.
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'notifications' && (
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-foreground border-b border-border pb-3">
                  Dispatch & Sound Preferences
                </h3>
                <div className="space-y-3 text-xs">
                  <label className="flex items-center gap-2.5 text-foreground cursor-pointer">
                    <input
                      type="checkbox"
                      checked={audioAlerts}
                      onChange={(e) => setAudioAlerts(e.target.checked)}
                      className="rounded bg-[#0F151C] border-[#2B3947] text-accent focus:ring-0"
                    />
                    <span>Audio siren for CRITICAL intrusion breaches</span>
                  </label>

                  <label className="flex items-center gap-2.5 text-foreground cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoAcknowledgeLow}
                      onChange={(e) => setAutoAcknowledgeLow(e.target.checked)}
                      className="rounded bg-[#0F151C] border-[#2B3947] text-accent focus:ring-0"
                    />
                    <span>Auto-acknowledge LOW severity wildlife/weather detections</span>
                  </label>
                </div>
              </div>
            )}

            {activeTab === 'camera' && (
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-foreground border-b border-border pb-3">
                  Streaming Quality
                </h3>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">
                    Default Video Decoder Quality
                  </label>
                  <select
                    value={defaultStreamQuality}
                    onChange={(e) => setDefaultStreamQuality(e.target.value)}
                    className="w-full sm:w-64 bg-[#0F151C] border border-[#2B3947] rounded-none px-3 h-10 text-xs text-foreground focus:border-[#37B9FF] focus:outline-none cursor-pointer"
                  >
                    <option value="1080p">High Definition (1080p / 30 FPS)</option>
                    <option value="720p">Standard Definition (720p / 25 FPS)</option>
                    <option value="4k">Ultra HD (4K / 30 FPS - High Bandwidth)</option>
                  </select>
                </div>
              </div>
            )}

            {(activeTab === 'security' || activeTab === 'scoring' || activeTab === 'system') && (
              <div className="space-y-3 py-4 text-xs text-muted-foreground">
                <div className="font-semibold text-foreground uppercase tracking-wider text-sm">
                  {tabs.find((t) => t.id === activeTab)?.label} Configuration
                </div>
                <p>
                  Settings for this policy module are currently enforced by the Central Border Security Agency
                  (BSF HQ Policy Engine). Modifications require Two-Officer authentication rule.
                </p>
              </div>
            )}

            {/* Action buttons (Section 39) */}
            <div className="pt-4 border-t border-border flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={handleReset}
                className="px-4 py-2 text-xs font-semibold text-[#D8E0E6] bg-muted border border-border rounded-none hover:bg-muted transition-colors flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-bold text-[#071018] bg-accent hover:bg-accent/90 rounded-none transition-colors flex items-center gap-1.5 shadow-lg"
              >
                <Save className="w-3.5 h-3.5" />
                Save Changes
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
