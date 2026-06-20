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

/** Format a size given in KB → "238 KB" / "1.7 MB". */
export function fmtSize(kb: number): string {
  return kb >= 1024 ? (kb / 1024).toFixed(1) + ' MB' : Math.round(kb) + ' KB'
}

/** Group-with-commas, e.g. 3840 → "3,840". */
export function withCommas(n: number): string {
  return n.toLocaleString('en-US')
}

/** The subset of an item's settings that affects the computed output. */
export interface RowSettings {
  format: OutputFormat
  /** Target box dimensions. */
  targetW: number
  targetH: number
  fit: ResizeMode
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

  let outW: number
  let outH: number
  let ratio: number
  if (fit === 'Fit') {
    ratio = Math.min(rW, rH)
    outW = Math.round(photo.w * ratio)
    outH = Math.round(photo.h * ratio)
  } else if (fit === 'Fill') {
    ratio = Math.max(rW, rH)
    outW = W
    outH = H
  } else {
    // Stretch
    ratio = Math.max(rW, rH)
    outW = W
    outH = H
  }

  const upscale = ratio > 1
  const scale = ratio * 100
  const scaleLabel = (scale >= 100 ? '+' : '') + Math.round(scale) + '%'
  const estKb = outW * outH * factor(s.format)

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
