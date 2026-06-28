import React from 'react'

type P = { size?: number; color?: string; strokeWidth?: number; style?: React.CSSProperties }

const base = (color = 'currentColor'): React.SVGProps<SVGSVGElement> => ({
  fill: 'none',
  stroke: color,
  strokeLinecap: 'round',
  strokeLinejoin: 'round'
})

export const PlusIcon = ({ size = 13, color = '#1d1d1f' }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...base(color)} strokeWidth={2.1}>
    <path d="M12 5v14M5 12h14" />
  </svg>
)

export const ChevronDown = ({ size = 9, color = '#8a8a8e', strokeWidth = 1.7 }: P) => (
  <svg width={size} height={size} viewBox="0 0 12 12" {...base(color)} strokeWidth={strokeWidth}>
    <path d="M2 4l4 4 4-4" />
  </svg>
)

export const ChevronRight = ({ size = 11, color = '#a8a8ad', strokeWidth = 1.7, style }: P) => (
  <svg width={size} height={size} viewBox="0 0 12 12" {...base(color)} strokeWidth={strokeWidth} style={style}>
    <path d="M3 2l4 4-4 4" />
  </svg>
)

export const ListIcon = ({ size = 15 }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...base('currentColor')} strokeWidth={1.9}>
    <path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01" />
  </svg>
)

export const GridIcon = ({ size = 15 }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9}>
    <rect x="3.5" y="3.5" width="7" height="7" rx="1.4" />
    <rect x="13.5" y="3.5" width="7" height="7" rx="1.4" />
    <rect x="3.5" y="13.5" width="7" height="7" rx="1.4" />
    <rect x="13.5" y="13.5" width="7" height="7" rx="1.4" />
  </svg>
)

export const SearchIcon = ({ size = 13, color = '#a0a0a5', strokeWidth = 2 }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth}>
    <circle cx="11" cy="11" r="7" />
    <path d="M21 21l-4.3-4.3" strokeLinecap="round" />
  </svg>
)

export const SlidersIcon = ({ size = 16, color = '#5a5a5f' }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...base(color)} strokeWidth={1.9}>
    <path d="M4 7h11M19 7h1M4 17h1M9 17h11" />
    <circle cx="17" cy="7" r="2.3" />
    <circle cx="7" cy="17" r="2.3" />
  </svg>
)

export const ClockIcon = ({ size = 15, color = '#fff' }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" strokeLinecap="round" />
  </svg>
)

export const PhotoMountainIcon = ({ size = 15, color = '#0a84ff' }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2}>
    <path d="M21 15l-5-5L5 21" strokeLinecap="round" strokeLinejoin="round" />
    <rect x="3" y="3" width="18" height="18" rx="2.4" />
    <circle cx="8.5" cy="8.5" r="1.6" fill={color} stroke="none" />
  </svg>
)

export const AlbumsIcon = ({ size = 15, color = '#8a8a8e' }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2}>
    <rect x="3" y="6" width="18" height="14" rx="2.2" />
    <path d="M3 8l4-3h4l2 3" strokeLinejoin="round" />
  </svg>
)

export const CheckIcon = ({ size = 13, color = '#fff', strokeWidth = 2.4, style }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...base(color)} strokeWidth={strokeWidth} style={style}>
    <path d="M5 13l4 4L19 7" />
  </svg>
)

export const ArrowRight = ({ size = 13, color = 'currentColor' }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...base(color)} strokeWidth={2}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
)

export const HeartIcon = ({ size = 8, color = '#fff' }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
  </svg>
)

export const PresetStackIcon = ({ size = 15, color = '#fff' }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...base(color)} strokeWidth={2}>
    <path d="M4 7l4-4h8l4 4M4 7v12a2 2 0 002 2h12a2 2 0 002-2V7M4 7h16" />
  </svg>
)

export const LockIcon = ({ size = 14, color = 'currentColor' }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2}>
    <rect x="5" y="11" width="14" height="9" rx="2" />
    <path d="M8 11V7a4 4 0 018 0v4" strokeLinecap="round" />
  </svg>
)

export const ColourDropIcon = ({ size = 16, color = '#fff' }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3s6 6.5 6 10.5a6 6 0 0 1-12 0C6 9.5 12 3 12 3z" />
  </svg>
)

export const CropIcon = ({ size = 15, color = '#3a3a3f' }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 2v14a2 2 0 0 0 2 2h14" />
    <path d="M18 22V8a2 2 0 0 0-2-2H2" />
  </svg>
)

export const SwapIcon = ({ size = 15, color = '#5a5a5f' }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...base(color)} strokeWidth={2}>
    <path d="M16 3h5v5M21 3l-7 7M8 21H3v-5M3 21l7-7" />
  </svg>
)

export const SparkleIcon = ({ size = 16, color = '#fff' }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...base(color)} strokeWidth={2}>
    <path d="M12 3l2.2 4.8L19 9l-3.5 3.4.9 5L12 15l-4.4 2.4.9-5L5 9l4.8-1.2z" />
  </svg>
)

export const RotateCCW = ({ size = 17, color = '#3a3a3f' }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...base(color)} strokeWidth={1.9}>
    <polyline points="2.5 5 2.5 10.5 8 10.5" />
    <path d="M4.6 15a8 8 0 1 0 1.9-8.3L2.5 10.5" />
  </svg>
)

export const RotateCW = ({ size = 17, color = '#3a3a3f' }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...base(color)} strokeWidth={1.9}>
    <polyline points="21.5 5 21.5 10.5 16 10.5" />
    <path d="M19.4 15a8 8 0 1 1-1.9-8.3l4 3.8" />
  </svg>
)

export const FlipIcon = ({ size = 16, color = '#3a3a3f' }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinejoin="round">
    {/* mirror line + two triangles pointing outward (flip horizontal) */}
    <line x1="12" y1="2.5" x2="12" y2="21.5" strokeDasharray="2.5 2.5" strokeLinecap="round" />
    <path d="M9.5 7.5l-5 4.5 5 4.5z" fill={color} stroke="none" />
    <path d="M14.5 7.5l5 4.5-5 4.5z" fill={color} stroke="none" />
  </svg>
)

export const DownloadTray = ({ size = 15, color = '#fff' }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...base(color)} strokeWidth={2.1}>
    <path d="M12 3v12M7 10l5 5 5-5M5 21h14" />
  </svg>
)

// Resize-mode glyphs — proper vector icons matching fill / fit / stretch.
export const FillIcon = ({ size = 18, color = 'currentColor' }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke="none">
    <rect x="4" y="4" width="16" height="16" rx="2.5" />
  </svg>
)
export const FitIcon = ({ size = 18, color = 'currentColor' }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2}>
    <rect x="4" y="4" width="16" height="16" rx="2.5" />
  </svg>
)
export const StretchIcon = ({ size = 18, color = 'currentColor' }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...base(color)} strokeWidth={2}>
    <path d="M3 12h18M3 12l4-4M3 12l4 4M21 12l-4-4M21 12l-4 4" />
  </svg>
)
