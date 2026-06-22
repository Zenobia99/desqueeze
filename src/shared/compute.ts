import type { OutputFormat, Photo, ResizeMode } from './types'

// Per-format byte weight (KB per output pixel). Ported verbatim from the
// prototype so totals/est. sizes stay consistent.
const FORMAT_FACTOR: Record<OutputFormat, number> = {
  JPEG: 0.000165,
  WebP: 0.00011,
  PNG: 0.00072,
  HEIC: 0.00009,
  TIFF: 0.0028,
  Auto: 0.000165
}

export function factor(f: OutputFormat): number {
  return FORMAT_FACTOR[f] ?? 0.000165
}

// Lossy encoders whose output size tracks the quality slider. PNG/TIFF are
// treated as quality-flat (their FORMAT_FACTOR already models a near-lossless
// byte cost).
const LOSSY: Record<OutputFormat, boolean> = {
  JPEG: true,
  WebP: true,
  HEIC: true,
  Auto: true,
  PNG: false,
  TIFF: false
}

// Size relative to the quality=85 baseline that FORMAT_FACTOR is calibrated to.
// Monotonic curve with the characteristic steep climb toward quality 100.
const QUALITY_CURVE: [q: number, mul: number][] = [
  [10, 0.3],
  [40, 0.5],
  [60, 0.68],
  [75, 0.85],
  [85, 1.0],
  [92, 1.3],
  [100, 2.3]
]

/**
 * Multiplier applied to the per-pixel byte cost so the estimate responds to the
 * quality slider (lossy formats only). 1.0 at quality 85 (the calibration point).
 */
export function qualityMultiplier(format: OutputFormat, quality: number): number {
  if (!LOSSY[format]) return 1
  const q = Math.max(1, Math.min(100, quality))
  const pts = QUALITY_CURVE
  if (q <= pts[0][0]) return pts[0][1]
  if (q >= pts[pts.length - 1][0]) return pts[pts.length - 1][1]
  for (let i = 1; i < pts.length; i++) {
    const [q0, m0] = pts[i - 1]
    const [q1, m1] = pts[i]
    if (q <= q1) return m0 + ((m1 - m0) * (q - q0)) / (q1 - q0)
  }
  return 1
}

/** Estimated encoded size in KB for an output of outW×outH at a given format + quality. */
export function estimateKb(
  outW: number,
  outH: number,
  format: OutputFormat,
  quality: number
): number {
  return outW * outH * factor(format) * qualityMultiplier(format, quality)
}

/** Format a size given in KB → "238 KB" / "1.7 MB". */
export function fmtSize(kb: number): string {
  return kb >= 1024 ? (kb / 1024).toFixed(1) + ' MB' : Math.round(kb) + ' KB'
}

/** Group-with-commas, e.g. 3840 → "3,840". */
export function withCommas(n: number): string {
  return n.toLocaleString('en-US')
}

/**
 * Plain-language resolution class for a longest-side pixel count, so the UI can
 * say "4K → 8K" instead of raw dimensions. Buckets are deliberately loose so
 * off-standard camera/source sizes still land on a familiar label.
 */
export function resolutionClass(longest: number): string {
  if (longest >= 7000) return '8K'
  if (longest >= 5800) return '6K'
  if (longest >= 4800) return '5K'
  if (longest >= 3500) return '4K'
  if (longest >= 2300) return '2K'
  if (longest >= 1700) return 'Full HD'
  if (longest >= 1100) return 'HD'
  return 'SD'
}

/** The subset of an item's settings that affects the computed output. */
export interface RowSettings {
  format: OutputFormat
  /** Target box dimensions. */
  targetW: number
  targetH: number
  fit: ResizeMode
  /** 1–100 encode quality (drives the size estimate for lossy formats). */
  quality: number
  /** Cap output to this many KB (0/undefined = off; lossy formats only). */
  maxSizeKb?: number
  /** 0 | 90 | 180 | 270 (clockwise). */
  rotation?: number
  flipH?: boolean
}

export interface ComputedRow {
  photo: Photo
  format: OutputFormat
  /** Box the pipeline resizes into (before rotation). */
  boxW: number
  boxH: number
  /** Actual output pixels (fit-aware), before rotation. */
  outW: number
  outH: number
  /** Output exceeds source → needs the Upscaly engine. */
  upscale: boolean
  /** scale% of output vs source. */
  scale: number
  scaleLabel: string
  srcLabel: string
  targetLabel: string
  estKb: number
  estLabel: string
  /** Effective manipulation, for live thumbnail preview. */
  rotation: number
  flipH: boolean
  /** True when this photo has a per-photo override (shows the "custom" badge). */
  hasOverride: boolean
}

/**
 * Compute the output for one photo: map its source into the target W×H box per
 * the resize mode, accounting for rotation (90°/270° swap the final dimensions).
 */
export function computeRow(photo: Photo, s: RowSettings, hasOverride: boolean): ComputedRow {
  const { targetW: W, targetH: H, fit } = s
  const rW = W / photo.w
  const rH = H / photo.h

  // All three modes now produce the exact target box on disk:
  //  Fit     → letterbox (whole image + bars),  ratio = min (content scale)
  //  Fill    → crop to fill,                     ratio = max
  //  Stretch → distort to fill,                  ratio = max
  // so the output canvas is always W×H; only `ratio` (the content scale used for
  // the scale%/upscale flag) differs.
  const outW = W
  const outH = H
  const ratio = fit === 'Fit' ? Math.min(rW, rH) : Math.max(rW, rH)

  const upscale = ratio > 1
  const scale = ratio * 100
  const scaleLabel = (scale >= 100 ? '+' : '') + Math.round(scale) + '%'
  let estKb = estimateKb(outW, outH, s.format, s.quality)
  // A file-size cap (lossy only) means the export auto-tunes quality to fit.
  if (s.maxSizeKb && s.maxSizeKb > 0 && LOSSY[s.format]) estKb = Math.min(estKb, s.maxSizeKb)

  const quarterTurned = ((s.rotation ?? 0) / 90) % 2 !== 0
  const dispW = quarterTurned ? outH : outW
  const dispH = quarterTurned ? outW : outH

  return {
    photo,
    format: s.format,
    boxW: W,
    boxH: H,
    outW,
    outH,
    upscale,
    scale,
    scaleLabel,
    srcLabel: `${withCommas(photo.w)} × ${withCommas(photo.h)}`,
    targetLabel: `${withCommas(dispW)} × ${withCommas(dispH)}`,
    estKb,
    estLabel: fmtSize(estKb),
    rotation: s.rotation ?? 0,
    flipH: !!s.flipH,
    hasOverride
  }
}

export interface BatchTotals {
  totalKb: number
  srcKb: number
  totalSize: string
  savings: string
}

export function computeTotals(rows: ComputedRow[]): BatchTotals {
  const totalKb = rows.reduce((a, r) => a + r.estKb, 0)
  const srcKb = rows.reduce((a, r) => a + r.photo.w * r.photo.h * factor(r.photo.fmt), 0)
  return {
    totalKb,
    srcKb,
    totalSize: fmtSize(totalKb),
    savings: srcKb > 0 ? Math.round((1 - totalKb / srcKb) * 100) + '%' : '0%'
  }
}
