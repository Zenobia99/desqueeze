import sharp from 'sharp'
import type { OutputFormat, ResizeMode } from '@shared/types'

export interface ProcessOptions {
  /** Source image as a path or in-memory buffer. */
  input: Buffer | string
  width: number
  height: number
  format: OutputFormat
  /** 1–100 quality (ignored by lossless formats). */
  quality: number
  fit: ResizeMode
  /** Rotation applied after resize: 0 | 90 | 180 | 270 (clockwise). */
  rotation?: number
  /** Mirror horizontally. */
  flipH?: boolean
}

export interface ProcessOutput {
  buffer: Buffer
  width: number
  height: number
  format: string
  bytes: number
}

// Map the design's resize modes onto sharp's fit strategies. Every mode fills
// the exact target box, so the three are visually distinct:
//  Fill    → crop to fill the box           (cover)
//  Fit     → letterbox the whole image      (contain, padded to W×H)
//  Stretch → distort to exact W×H           (fill)
function sharpFit(mode: ResizeMode): keyof sharp.FitEnum {
  switch (mode) {
    case 'Fill':
      return 'cover'
    case 'Fit':
      return 'contain'
    case 'Stretch':
      return 'fill'
  }
}

// Letterbox bars for Fit mode (opaque black, all formats).
const LETTERBOX_BG = { r: 0, g: 0, b: 0, alpha: 1 }

/**
 * Resize + convert + re-encode an image in the main process.
 * This is the real engine — format, dimensions, and quality are all honoured.
 */
export async function processImage(opts: ProcessOptions): Promise<ProcessOutput> {
  // Pass 1: resize to the target box.
  const needsManip = !!opts.rotation || !!opts.flipH
  const resized = sharp(opts.input, { failOn: 'none' }).resize({
    width: opts.width,
    height: opts.height,
    fit: sharpFit(opts.fit),
    background: LETTERBOX_BG,
    withoutEnlargement: false
  })

  // Pass 2 (only when manipulating): rotate/mirror AFTER resize, via a raw
  // intermediate, so a 90°/270° turn actually swaps the output dimensions
  // (sharp otherwise applies rotate before resize and the box absorbs it).
  let pipeline: sharp.Sharp
  if (needsManip) {
    const { data, info } = await resized.ensureAlpha().raw().toBuffer({ resolveWithObject: true })
    pipeline = sharp(data, {
      raw: { width: info.width, height: info.height, channels: info.channels }
    })
    if (opts.rotation) pipeline.rotate(opts.rotation)
    if (opts.flipH) pipeline.flop()
  } else {
    pipeline = resized
  }

  const q = Math.max(1, Math.min(100, Math.round(opts.quality)))
  const fmt = resolveFormat(opts.format)

  switch (fmt) {
    case 'png':
      pipeline.png({ quality: q, compressionLevel: 9 })
      break
    case 'webp':
      pipeline.webp({ quality: q })
      break
    case 'tiff':
      pipeline.tiff({ quality: q })
      break
    case 'heif':
      // HEIC encoding requires a libheif-enabled sharp build; fall back gracefully.
      pipeline.heif({ quality: q, compression: 'hevc' })
      break
    case 'jpeg':
    default:
      pipeline.jpeg({ quality: q, mozjpeg: true })
      break
  }

  const { data, info } = await pipeline.toBuffer({ resolveWithObject: true })
  return {
    buffer: data,
    width: info.width,
    height: info.height,
    format: info.format,
    bytes: info.size ?? data.length
  }
}

/** Map our OutputFormat (incl. "Auto") onto a concrete sharp encoder. */
function resolveFormat(format: OutputFormat): 'jpeg' | 'png' | 'webp' | 'tiff' | 'heif' {
  switch (format) {
    case 'PNG':
      return 'png'
    case 'WebP':
      return 'webp'
    case 'TIFF':
      return 'tiff'
    case 'HEIC':
      return 'heif'
    case 'JPEG':
    case 'Auto':
    default:
      return 'jpeg'
  }
}

export function fileExtension(format: OutputFormat): string {
  switch (format) {
    case 'PNG':
      return 'png'
    case 'WebP':
      return 'webp'
    case 'TIFF':
      return 'tiff'
    case 'HEIC':
      return 'heic'
    case 'JPEG':
    case 'Auto':
    default:
      return 'jpg'
  }
}

/**
 * Log the sharp/libvips runtime once at startup. Confirms the native binary
 * matches the host architecture (an arm64 build on Apple Silicon) and that SIMD
 * acceleration is on — a mismatch here is the usual cause of slow resizes.
 */
export function logSharpRuntime(): void {
  try {
    const simd = sharp.simd()
    const concurrency = sharp.concurrency()
    // eslint-disable-next-line no-console
    console.log(
      `[sharp] libvips ${sharp.versions.vips} · ${process.platform}/${process.arch} · simd=${simd} · concurrency=${concurrency}`
    )
    if (!simd) {
      // eslint-disable-next-line no-console
      console.warn('[sharp] SIMD disabled — resizes will be slower than expected')
    }
  } catch {
    /* diagnostics only */
  }
}

export { sharp }
