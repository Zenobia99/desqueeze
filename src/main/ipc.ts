import { ipcMain, dialog, shell, app } from 'electron'
import { promises as fs } from 'fs'
import { join, basename, extname } from 'path'
import { processImage, fileExtension, sharp } from './sharp-service'
import { PhotosLibrarySource } from './sources/photos-library'
import { createUpscalyEngine } from './upscaly/engine'
import type {
  ExportRequest,
  ExportResult,
  ExportItemResult,
  ImportedPhoto,
  LibrarySource,
  OutputFormat,
  PreviewRequest,
  PreviewResult,
  SourceLoadResult
} from '@shared/types'

function mapFormat(f: string | undefined): OutputFormat {
  switch ((f || '').toLowerCase()) {
    case 'png':
      return 'PNG'
    case 'webp':
      return 'WebP'
    case 'tiff':
    case 'tif':
      return 'TIFF'
    case 'heif':
    case 'heic':
      return 'HEIC'
    case 'jpeg':
    case 'jpg':
    default:
      return 'JPEG'
  }
}

/** Read real metadata + a small thumbnail for a file the user picked. */
async function importFile(path: string): Promise<ImportedPhoto | null> {
  try {
    const meta = await sharp(path, { failOn: 'none' }).metadata()
    const w = meta.width ?? 0
    const h = meta.height ?? 0
    if (!w || !h) return null
    const thumb = await sharp(path, { failOn: 'none' })
      .resize({ width: 176, height: 120, fit: 'cover' })
      .png()
      .toBuffer()
    return {
      name: basename(path, extname(path)),
      w,
      h,
      fmt: mapFormat(meta.format),
      favourite: false,
      gradient: 'linear-gradient(165deg,#c9c9ce,#a8a8ad)',
      thumbnailUrl: `data:image/png;base64,${thumb.toString('base64')}`,
      path
    }
  } catch {
    return null
  }
}

const photosLibrary = new PhotosLibrarySource()
const upscaly = createUpscalyEngine()

/** Core export pipeline — shared by the IPC handler and verification harness. */
export async function runExport(req: ExportRequest): Promise<ExportResult> {
  const destination = req.destination || join(app.getPath('downloads'), 'Desqueeze Export')
  await fs.mkdir(destination, { recursive: true })

  const results: ExportItemResult[] = []

  for (const item of req.items) {
    // Resolve source pixels: Photos-library asset or imported file on disk.
    const fromLibrary = !!item.photosId
    const fromDisk = !!item.sourcePath
    if (!fromLibrary && !fromDisk) {
      results.push({ id: item.id, ok: false, error: 'no source for item' })
      continue
    }
    try {
      let input = fromLibrary
        ? await photosLibrary.getImageBuffer(item.photosId as string)
        : await fs.readFile(item.sourcePath as string)
      let upscaled = false

      // Route through the Upscaly engine when the target exceeds source.
      if (item.needsUpscale && upscaly.available()) {
        const up = await upscaly.upscale({
          input,
          model: item.upModel,
          scale: item.maxFactor,
          targetLongest: Math.max(item.width, item.height),
          inputCap: 1536
        })
        input = up.buffer
        upscaled = true
      }

      const out = await processImage({
        input,
        width: item.width,
        height: item.height,
        format: item.format,
        quality: item.quality,
        fit: item.fit,
        rotation: item.rotation,
        flipH: item.flipH
      })

      const ext = fileExtension(item.format)
      const outputPath = join(destination, `${item.name}@${item.width}w.${ext}`)
      await fs.writeFile(outputPath, out.buffer)

      results.push({
        id: item.id,
        ok: true,
        outputPath,
        bytes: out.bytes,
        width: out.width,
        height: out.height,
        upscaled
      })
    } catch (err) {
      results.push({
        id: item.id,
        ok: false,
        error: err instanceof Error ? err.message : String(err)
      })
    }
  }

  return { ok: results.every((r) => r.ok), destination, items: results }
}

const PREVIEW_MAX = 1100
// A downscaled, decoded copy of each source kept in memory so repeated fast
// previews (e.g. dragging the quality slider) don't re-decode the full-res
// original every time. Capped slightly above PREVIEW_MAX so the displayed
// preview keeps full quality.
const PREVIEW_BASE_CAP = 1600
const PREVIEW_BASE_LIMIT = 8
const previewBaseCache = new Map<string, Promise<Buffer>>()

async function previewBase(key: string, load: () => Promise<Buffer>): Promise<Buffer> {
  let cached = previewBaseCache.get(key)
  if (!cached) {
    cached = (async () => {
      const raw = await load()
      return sharp(raw, { failOn: 'none' })
        .resize({ width: PREVIEW_BASE_CAP, height: PREVIEW_BASE_CAP, fit: 'inside', withoutEnlargement: true })
        .png()
        .toBuffer()
    })()
    // Drop the failed entry so a transient read error doesn't poison the cache.
    cached.catch(() => previewBaseCache.delete(key))
    previewBaseCache.set(key, cached)
    if (previewBaseCache.size > PREVIEW_BASE_LIMIT) {
      const oldest = previewBaseCache.keys().next().value
      if (oldest !== undefined) previewBaseCache.delete(oldest)
    }
  }
  return cached
}

/** Render a browser-displayable preview of the processed output.
 *
 * Two modes:
 *  - fast (default): small box, JPEG, for the live preview image.
 *  - fullEstimate: render at the REAL export box + chosen format to report the
 *    exact output byte count (used by on-demand Upscaly preview), plus a
 *    downscaled JPEG for display.
 */
export async function runPreview(req: PreviewRequest): Promise<PreviewResult> {
  try {
    const sourceKey = req.photosId ?? req.sourcePath
    if (!sourceKey) return { ok: false, error: 'no source' }
    const loadSource = (): Promise<Buffer> =>
      req.photosId ? photosLibrary.getImageBuffer(req.photosId) : fs.readFile(req.sourcePath as string)

    // The plain fast preview resizes from a cached, downscaled base; the heavy
    // paths (real-resolution estimate, AI upscale) need the full-res original.
    let input =
      req.fullEstimate || req.needsUpscale ? await loadSource() : await previewBase(sourceKey, loadSource)

    if (req.needsUpscale && upscaly.available()) {
      const up = await upscaly.upscale({
        input,
        model: req.upModel,
        scale: req.maxFactor,
        targetLongest: Math.max(req.width, req.height),
        // Full estimate uses the export-grade AI input; fast preview stays tiny.
        inputCap: req.fullEstimate ? 1536 : 320
      })
      input = up.buffer
    }

    if (req.fullEstimate) {
      // Real export render (true dimensions + chosen format) → exact byte count.
      const out = await processImage({
        input,
        width: req.width,
        height: req.height,
        format: req.format,
        quality: req.quality,
        fit: req.fit,
        rotation: req.rotation,
        flipH: req.flipH
      })
      // For display: a native-resolution center crop (so AI detail is visible at
      // 100%), or the whole image downscaled to fit. Either way TIFF/HEIC are
      // re-encoded to JPEG since <img> can't render them.
      const display = req.cropPreview
        ? await sharpCenterCropJpeg(out.buffer, PREVIEW_MAX)
        : await sharpResizeJpeg(out.buffer, PREVIEW_MAX)
      return {
        ok: true,
        dataUrl: `data:image/jpeg;base64,${display.toString('base64')}`,
        width: out.width,
        height: out.height,
        bytes: out.bytes
      }
    }

    // Fast path: capped box, JPEG.
    const longest = Math.max(req.width, req.height)
    const f = longest > PREVIEW_MAX ? PREVIEW_MAX / longest : 1
    const pw = Math.max(1, Math.round(req.width * f))
    const ph = Math.max(1, Math.round(req.height * f))
    const out = await processImage({
      input,
      width: pw,
      height: ph,
      format: 'JPEG',
      quality: req.quality,
      fit: req.fit,
      rotation: req.rotation,
      flipH: req.flipH
    })
    return {
      ok: true,
      dataUrl: `data:image/jpeg;base64,${out.buffer.toString('base64')}`,
      width: out.width,
      height: out.height,
      bytes: out.bytes
    }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}

/** Decode any format and re-encode a downscaled JPEG for on-screen display. */
async function sharpResizeJpeg(buf: Buffer, max: number): Promise<Buffer> {
  return sharp(buf, { failOn: 'none' })
    .resize({ width: max, height: max, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 80 })
    .toBuffer()
}

/**
 * Native-resolution center crop (up to max×max) re-encoded as JPEG. Reveals
 * real per-pixel detail at 100% instead of shrinking the whole image to fit.
 */
async function sharpCenterCropJpeg(buf: Buffer, max: number): Promise<Buffer> {
  const img = sharp(buf, { failOn: 'none' })
  const meta = await img.metadata()
  const w = meta.width ?? 0
  const h = meta.height ?? 0
  if (w <= max && h <= max) {
    return img.jpeg({ quality: 90 }).toBuffer()
  }
  const cw = Math.min(max, w)
  const ch = Math.min(max, h)
  return sharp(buf, { failOn: 'none' })
    .extract({
      left: Math.floor((w - cw) / 2),
      top: Math.floor((h - ch) / 2),
      width: cw,
      height: ch
    })
    .jpeg({ quality: 90 })
    .toBuffer()
}

// Map a sidebar Library source onto a PhotoKit query kind.
const SOURCE_KIND: Record<LibrarySource, 'recents' | 'favorites' | 'recently-added'> = {
  recents: 'recents',
  favourites: 'favorites',
  'last-import': 'recently-added',
  albums: 'recents'
}

export function registerIpc(): void {
  ipcMain.handle('photos:preview', async (_e, req: PreviewRequest): Promise<PreviewResult> => {
    return runPreview(req)
  })

  ipcMain.handle(
    'photos:source',
    async (_e, source: LibrarySource): Promise<SourceLoadResult> => {
      try {
        const photos = await photosLibrary.listAssets(SOURCE_KIND[source] ?? 'recents')
        return { ok: true, photos }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        const reason = msg.includes('denied')
          ? 'denied'
          : msg.includes('swiftc')
            ? 'unavailable'
            : 'error'
        return { ok: false, reason, photos: [] }
      }
    }
  )

  ipcMain.handle('photos:add', async (): Promise<ImportedPhoto[]> => {
    const res = await dialog.showOpenDialog({
      title: 'Add Photos',
      buttonLabel: 'Add',
      properties: ['openFile', 'multiSelections'],
      filters: [
        { name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'webp', 'tiff', 'tif', 'heic', 'heif', 'gif', 'bmp'] }
      ]
    })
    if (res.canceled) return []
    const imported = await Promise.all(res.filePaths.map(importFile))
    return imported.filter((p): p is ImportedPhoto => p !== null)
  })

  ipcMain.handle('dialog:chooseDestination', async (): Promise<string | null> => {
    const res = await dialog.showOpenDialog({
      title: 'Choose export destination',
      properties: ['openDirectory', 'createDirectory'],
      buttonLabel: 'Choose'
    })
    return res.canceled || res.filePaths.length === 0 ? null : res.filePaths[0]
  })

  ipcMain.handle('export:run', async (_e, req: ExportRequest): Promise<ExportResult> => {
    return runExport(req)
  })

  ipcMain.handle('shell:reveal', async (_e, path: string): Promise<void> => {
    shell.showItemInFolder(path)
  })
}
