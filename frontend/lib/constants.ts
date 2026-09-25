export const THEME_COLORS = {
  bgPrimary: '#0A0F14',
  bgSecondary: '#0F151C',
  surface: '#141C24',
  surfaceElevated: '#18222C',
  border: '#263442',
  borderStrong: '#344454',
  textPrimary: '#F3F6F8',
  textSecondary: '#A7B2BD',
  textMuted: '#6E7B87',
  textDisabled: '#4E5A64',
  accent: '#37B9FF',
  success: '#39D98A',
  warning: '#F4C95D',
  danger: '#FF5C67',
  highThreat: '#FF8A4C',
  info: '#63A8FF',
  sidebarBg: '#0B1117',
} as const;

export const SEVERITY_COLORS = {
  CRITICAL: {
    bg: 'bg-[#FF5C67]/15',
    text: 'text-[#FF5C67]',
    border: 'border-[#FF5C67]/40',
    dot: 'bg-[#FF5C67]',
    badgeBg: '#FF5C67',
  },
  HIGH: {
    bg: 'bg-[#FF8A4C]/15',
    text: 'text-[#FF8A4C]',
    border: 'border-[#FF8A4C]/40',
    dot: 'bg-[#FF8A4C]',
    badgeBg: '#FF8A4C',
  },
  MEDIUM: {
    bg: 'bg-[#F4C95D]/15',
    text: 'text-[#F4C95D]',
    border: 'border-[#F4C95D]/40',
    dot: 'bg-[#F4C95D]',
    badgeBg: '#F4C95D',
  },
  LOW: {
    bg: 'bg-[#63A8FF]/15',
    text: 'text-[#63A8FF]',
    border: 'border-[#63A8FF]/40',
    dot: 'bg-[#63A8FF]',
    badgeBg: '#63A8FF',
  },
} as const;

export const STATUS_COLORS = {
  ONLINE: { bg: 'bg-[#39D98A]/15', text: 'text-[#39D98A]', border: 'border-[#39D98A]/30', dot: 'bg-[#39D98A]' },
  OFFLINE: { bg: 'bg-[#FF5C67]/15', text: 'text-[#FF5C67]', border: 'border-[#FF5C67]/30', dot: 'bg-[#FF5C67]' },
  DEGRADED: { bg: 'bg-[#F4C95D]/15', text: 'text-[#F4C95D]', border: 'border-[#F4C95D]/30', dot: 'bg-[#F4C95D]' },
  ACTIVE: { bg: 'bg-[#39D98A]/15', text: 'text-[#39D98A]', border: 'border-[#39D98A]/30', dot: 'bg-[#39D98A]' },
  INACTIVE: { bg: 'bg-[#6E7B87]/15', text: 'text-[#6E7B87]', border: 'border-[#6E7B87]/30', dot: 'bg-[#6E7B87]' },
  ERROR: { bg: 'bg-[#FF5C67]/15', text: 'text-[#FF5C67]', border: 'border-[#FF5C67]/30', dot: 'bg-[#FF5C67]' },
  OPERATIONAL: { bg: 'bg-[#39D98A]/15', text: 'text-[#39D98A]', border: 'border-[#39D98A]/30', dot: 'bg-[#39D98A]' },
  VERIFIED: { bg: 'bg-[#39D98A]/15', text: 'text-[#39D98A]', border: 'border-[#39D98A]/30', dot: 'bg-[#39D98A]' },
  FAILED: { bg: 'bg-[#FF5C67]/15', text: 'text-[#FF5C67]', border: 'border-[#FF5C67]/30', dot: 'bg-[#FF5C67]' },
  PENDING: { bg: 'bg-[#F4C95D]/15', text: 'text-[#F4C95D]', border: 'border-[#F4C95D]/30', dot: 'bg-[#F4C95D]' },
  ACKNOWLEDGED: { bg: 'bg-[#63A8FF]/15', text: 'text-[#63A8FF]', border: 'border-[#63A8FF]/30', dot: 'bg-[#63A8FF]' },
  RESOLVED: { bg: 'bg-[#39D98A]/15', text: 'text-[#39D98A]', border: 'border-[#39D98A]/30', dot: 'bg-[#39D98A]' },
  ESCALATED: { bg: 'bg-[#FF5C67]/15', text: 'text-[#FF5C67]', border: 'border-[#FF5C67]/30', dot: 'bg-[#FF5C67]' },
  NEW: { bg: 'bg-[#37B9FF]/15', text: 'text-[#37B9FF]', border: 'border-[#37B9FF]/30', dot: 'bg-[#37B9FF]' },
  INVESTIGATING: { bg: 'bg-[#FF8A4C]/15', text: 'text-[#FF8A4C]', border: 'border-[#FF8A4C]/30', dot: 'bg-[#FF8A4C]' },
} as const;

export const EVENT_TYPE_LABELS: Record<string, string> = {
  PERSON_DETECTED: 'Person Detected',
  VEHICLE_DETECTED: 'Vehicle Detected',
  ANPR_MATCH: 'ANPR Match',
  FACE_MATCH: 'Face Match',
  INTRUSION: 'Intrusion Alert',
  LOITERING: 'Loitering Alert',
  ABANDONED_OBJECT: 'Abandoned Object',
  SUSPICIOUS_ACTIVITY: 'Crowd Gathering / Suspicious',
  NIGHT_ACTIVITY: 'Night Perimeter Activity',
};

export const NAV_ITEMS = {
  OPERATIONS: [
    { label: 'Dashboard', href: '/dashboard', icon: 'LayoutDashboard' },
    { label: 'Live Surveillance', href: '/live', icon: 'MonitorPlay' },
    { label: 'Cameras', href: '/cameras', icon: 'Camera' },
    { label: 'Alerts', href: '/alerts', icon: 'AlertTriangle' },
  ],
  INTELLIGENCE: [
    { label: 'Events', href: '/events', icon: 'Activity' },
    { label: 'Investigation', href: '/investigation', icon: 'Search' },
    { label: 'Evidence', href: '/evidence', icon: 'FileCheck' },
    { label: 'Border Map', href: '/map', icon: 'Map' },
    { label: 'Watchlist', href: '/watchlist', icon: 'Users' },
    { label: 'Analytics', href: '/analytics', icon: 'BarChart3' },
  ],
  SYSTEM: [
    { label: 'System Health', href: '/system-health', icon: 'Activity' },
    { label: 'Settings', href: '/settings', icon: 'Settings' },
  ],
} as const;
