import sharp from 'sharp'
import type { CropRect, OutputFormat, ResizeMode } from '@shared/types'

/**
 * Bake EXIF orientation into the pixels (so width/height and all downstream
 * crops/resizes match how the image actually displays), returning a new buffer.
 * No-op for images that are already upright (orientation 1 / absent).
 */
export async function orientBuffer(input: Buffer): Promise<Buffer> {
  try {
    const meta = await sharp(input, { failOn: 'none' }).metadata()
    if (!meta.orientation || meta.orientation === 1) return input
    return await sharp(input, { failOn: 'none' }).rotate().toBuffer()
  } catch {
    return input
  }
}

/**
 * Crop a source buffer to a normalized [0,1] region, returning a new buffer.
 * No-op (returns the input) when the rect is missing or effectively full-frame.
 * Applied before resize/upscale so the engine works on just the kept region.
 */
export async function cropBuffer(input: Buffer, crop: CropRect | undefined): Promise<Buffer> {
  if (!crop) return input
  const full = crop.x <= 0.0001 && crop.y <= 0.0001 && crop.w >= 0.9999 && crop.h >= 0.9999
  if (full) return input
  const img = sharp(input, { failOn: 'none' })
  const meta = await img.metadata()
  const W = meta.width ?? 0
  const H = meta.height ?? 0
  if (!W || !H) return input
  const left = Math.max(0, Math.min(W - 1, Math.round(crop.x * W)))
  const top = Math.max(0, Math.min(H - 1, Math.round(crop.y * H)))
  const width = Math.max(1, Math.min(W - left, Math.round(crop.w * W)))
  const height = Math.max(1, Math.min(H - top, Math.round(crop.h * H)))
  return img.extract({ left, top, width, height }).toBuffer()
}

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
  /** Convert to black & white (greyscale). */
  grayscale?: boolean
  /** Cap output to this many KB by auto-tuning quality (0/undefined = off). */
  maxSizeKb?: number
}

export interface ProcessOutput {
  buffer: Buffer
  width: number
  height: number
  format: string
  bytes: number
}

// Map the design's resize modes onto sharp's fit strategies:
//  Fill    → crop to fill the box           (cover, output = box)
//  Fit     → scale to fit within the box     (inside, no padding, output ≤ box)
//  Stretch → distort to exact W×H            (fill, output = box)
function sharpFit(mode: ResizeMode): keyof sharp.FitEnum {
  switch (mode) {
    case 'Fill':
      return 'cover'
    case 'Fit':
      return 'inside'
    case 'Stretch':
      return 'fill'
  }
}

// Transparent pixels are flattened onto white (when the target can't keep alpha).
const WHITE_BG = { r: 255, g: 255, b: 255, alpha: 1 }

/**
 * Resize + convert + re-encode an image in the main process.
 * This is the real engine — format, dimensions, and quality are all honoured.
 */
export async function processImage(opts: ProcessOptions): Promise<ProcessOutput> {
  // Transparency handling: keep alpha for formats that support it (and let
  // "Auto" pick PNG for transparent sources); otherwise flatten to white rather
  // than black. (No resize mode pads anymore, so there are no letterbox bars.)
  const srcMeta = await sharp(opts.input, { failOn: 'none' }).metadata().catch(() => null)
  const srcHasAlpha = !!srcMeta?.hasAlpha
  const fmt = resolveFormat(opts.format, srcHasAlpha)
  const keepAlpha = fmt === 'png' || fmt === 'webp'

  // Pass 1: auto-orient from EXIF, then resize to the target box.
  const needsManip = !!opts.rotation || !!opts.flipH
  const resized = sharp(opts.input, { failOn: 'none' }).rotate().resize({
    width: opts.width,
    height: opts.height,
    fit: sharpFit(opts.fit),
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

  // Dropping alpha for a no-alpha format → flatten transparent pixels to white.
  if (!keepAlpha && srcHasAlpha) pipeline = pipeline.flatten({ background: WHITE_BG })

  // Black & white conversion (the inverse of colourise).
  if (opts.grayscale) pipeline = pipeline.greyscale()

  const q = Math.max(1, Math.min(100, Math.round(opts.quality)))

  // Encode the (cloned) pipeline at a given quality. Cloning lets us try several
  // qualities when hitting a target file size.
  const encodeAt = (qq: number): Promise<{ data: Buffer; info: sharp.OutputInfo }> => {
    const p = pipeline.clone()
    switch (fmt) {
      case 'png':
        p.png({ quality: qq, compressionLevel: 9 })
        break
      case 'webp':
        p.webp({ quality: qq })
        break
      case 'tiff':
        p.tiff({ quality: qq })
        break
      case 'heif':
        // HEIC encoding requires a libheif-enabled sharp build; fall back gracefully.
        p.heif({ quality: qq, compression: 'hevc' })
        break
      case 'jpeg':
      default:
        p.jpeg({ quality: qq, mozjpeg: true })
        break
    }
    return p.toBuffer({ resolveWithObject: true })
  }

  const targetBytes = opts.maxSizeKb && opts.maxSizeKb > 0 ? opts.maxSizeKb * 1024 : 0
  const lossy = fmt === 'jpeg' || fmt === 'webp' || fmt === 'heif'
  const sizeOf = (r: { data: Buffer; info: sharp.OutputInfo }): number => r.info.size ?? r.data.length

  let out = await encodeAt(q)
  if (targetBytes && lossy && sizeOf(out) > targetBytes) {
    // Highest quality (≤ requested) that fits the target, via binary search.
    let lo = 10
    let hi = q - 1
    let best: typeof out | null = null
    while (lo <= hi) {
      const mid = Math.floor((lo + hi) / 2)
      const r = await encodeAt(mid)
      if (sizeOf(r) <= targetBytes) {
        best = r
        lo = mid + 1
      } else {
        hi = mid - 1
      }
    }
    out = best ?? (await encodeAt(10)) // smallest we can do if nothing fits
  }

  const { data, info } = out
  return {
    buffer: data,
    width: info.width,
    height: info.height,
    format: info.format,
    bytes: info.size ?? data.length
  }
}

/**
 * Map our OutputFormat (incl. "Auto") onto a concrete sharp encoder. "Auto"
 * preserves transparency by choosing PNG for sources with an alpha channel,
 * and JPEG otherwise.
 */
function resolveFormat(
  format: OutputFormat,
  srcHasAlpha = false
): 'jpeg' | 'png' | 'webp' | 'tiff' | 'heif' {
  switch (format) {
    case 'PNG':
      return 'png'
    case 'WebP':
      return 'webp'
    case 'TIFF':
      return 'tiff'
    case 'HEIC':
      return 'heif'
    case 'Auto':
      return srcHasAlpha ? 'png' : 'jpeg'
    case 'JPEG':
    default:
      return 'jpeg'
  }
}

/** Extension for an actual sharp output format string (post-resolution). */
export function extForResolvedFormat(sharpFormat: string): string {
  switch (sharpFormat) {
    case 'png':
      return 'png'
    case 'webp':
      return 'webp'
    case 'tiff':
      return 'tif'
    case 'heif':
      return 'heic'
    default:
      return 'jpg'
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
