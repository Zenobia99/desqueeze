import { ipcMain, dialog, shell, app } from 'electron'
import { promises as fs } from 'fs'
import { join, basename, extname } from 'path'
import { processImage, extForResolvedFormat, cropBuffer, orientBuffer, sharp } from './sharp-service'
import { PhotosLibrarySource } from './sources/photos-library'
import { createUpscalyEngine } from './upscaly/engine'
import { getColouriseEngine, installColouriseModel } from './colourise/engine'
import { SPEED_CAP } from '@shared/data'
import type {
  ExportProgress,
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

const IMAGE_EXTS = new Set([
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.tiff',
  '.tif',
  '.heic',
  '.heif',
  '.gif',
  '.bmp',
  '.avif'
])

/** Expand dropped paths into image files (recurses one level into folders). */
async function expandToImageFiles(paths: string[]): Promise<string[]> {
  const out: string[] = []
  for (const p of paths) {
    try {
      const st = await fs.stat(p)
      if (st.isDirectory()) {
        const entries = await fs.readdir(p)
        for (const name of entries) {
          if (IMAGE_EXTS.has(extname(name).toLowerCase())) out.push(join(p, name))
        }
      } else if (IMAGE_EXTS.has(extname(p).toLowerCase())) {
        out.push(p)
      }
    } catch {
      /* skip unreadable paths */
    }
  }
  return out
}

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

/** EXIF-oriented (display) dimensions of an image file, or null if unreadable. */
async function orientedSize(path: string): Promise<{ w: number; h: number } | null> {
  try {
    const meta = await sharp(path, { failOn: 'none' }).metadata()
    let w = meta.width ?? 0
    let h = meta.height ?? 0
    if (!w || !h) return null
    // EXIF orientation 5–8 rotate the image 90/270°, so the displayed
    // dimensions are the swap of the stored pixel dimensions.
    if ((meta.orientation ?? 1) >= 5) [w, h] = [h, w]
    return { w, h }
  } catch {
    return null
  }
}

/** Read real metadata + a small thumbnail for a file the user picked. */
async function importFile(path: string): Promise<ImportedPhoto | null> {
  try {
    const meta = await sharp(path, { failOn: 'none' }).metadata()
    let w = meta.width ?? 0
    let h = meta.height ?? 0
    if (!w || !h) return null
    // EXIF orientation 5–8 rotate the image 90/270°, so the displayed
    // dimensions are the swap of the stored pixel dimensions.
    if ((meta.orientation ?? 1) >= 5) [w, h] = [h, w]
    const thumb = await sharp(path, { failOn: 'none' })
      .rotate()
      .resize({ width: 176, height: 120, fit: 'cover' })
      .png()
      .toBuffer()
    // Date the import "now" so the freshest import sorts to the top of Last
    // Import under Recent-first (library assets carry their real creationDate).
    const date = Date.now()
    return {
      name: basename(path, extname(path)),
      w,
      h,
      fmt: mapFormat(meta.format),
      favourite: false,
      gradient: 'linear-gradient(165deg,#c9c9ce,#a8a8ad)',
      thumbnailUrl: `data:image/png;base64,${thumb.toString('base64')}`,
      path,
      date
    }
  } catch {
    return null
  }
}

const photosLibrary = new PhotosLibrarySource()
const upscaly = createUpscalyEngine()
const colourise = getColouriseEngine()

/** Core export pipeline — shared by the IPC handler and verification harness. */
export async function runExport(
  req: ExportRequest,
  onProgress?: (p: ExportProgress) => void
): Promise<ExportResult> {
  const destination = req.destination || join(app.getPath('downloads'), 'Desqueeze')
  await fs.mkdir(destination, { recursive: true })

  const results: ExportItemResult[] = []
  const total = req.items.length

  for (let i = 0; i < req.items.length; i++) {
    const item = req.items[i]
    // Resolve source pixels: Photos-library asset or imported file on disk.
    const fromLibrary = !!item.photosId
    const fromDisk = !!item.sourcePath
    if (!fromLibrary && !fromDisk) {
      results.push({ id: item.id, ok: false, error: 'no source for item' })
      continue
    }
    // Announce the current stage (with `index` = items finished so far) so the
    // UI can show "Upscaling…/Colourising…/Resizing…" live, not just a count.
    const stage = (phase: 'colourising' | 'upscaling' | 'resizing' | 'saving'): void =>
      onProgress?.({ index: i, total, id: item.id, name: item.name, ok: true, phase })
    try {
      let input = fromLibrary
        ? await photosLibrary.getImageBuffer(item.photosId as string)
        : await fs.readFile(item.sourcePath as string)
      // Bake EXIF orientation first so crop coords and the resize box match how
      // the photo actually displays, then crop so the kept region drives
      // upscaling and resize.
      input = await orientBuffer(input)
      input = await cropBuffer(input, item.crop)

      // Colourise (B&W → colour) before any enlargement, when requested and the
      // Core ML model is installed.
      let coloured = false
      if (item.colourise && colourise.available()) {
        stage('colourising')
        input = await colourise.colourise(input)
        coloured = true
      }

      let upscaled = false
      let upFactor = 0

      // Route through the Upscaly engine when the target exceeds source.
      if (item.needsUpscale && upscaly.available()) {
        stage('upscaling')
        const up = await upscaly.upscale({
          input,
          model: item.upModel,
          scale: item.maxFactor,
          targetLongest: Math.max(item.width, item.height),
          inputCap: SPEED_CAP[item.upSpeed ?? 'Balanced']
        })
        input = up.buffer
        upscaled = true
        upFactor = up.scale
      }

      stage('resizing')
      const out = await processImage({
        input,
        width: item.width,
        height: item.height,
        format: item.format,
        quality: item.quality,
        fit: item.fit,
        rotation: item.rotation,
        flipH: item.flipH,
        grayscale: item.grayscale,
        maxSizeKb: item.maxSizeKb
      })

      const ext = extForResolvedFormat(out.format)
      // Tag AI outputs so variants of the same photo don't overwrite each other:
      // the upscale factor and a colour marker.
      const aiTag = upscaled ? `-ai${upFactor}x` : ''
      const colourTag = coloured ? '-color' : ''
      const outputPath = join(destination, `${item.name}@${item.width}w${aiTag}${colourTag}.${ext}`)
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
    const last = results[results.length - 1]
    onProgress?.({ index: i + 1, total, id: item.id, name: item.name, ok: last.ok })
  }

  return { ok: results.every((r) => r.ok), destination, items: results }
}

const PREVIEW_MAX = 1100
// Larger cap for the pannable 1:1 detail view (AI upscale comparison).
const PAN_MAX = 2000
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
        .rotate() // bake EXIF orientation so the cached base displays upright
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

    // Crop editor: return the raw (un-cropped) source scaled to fit, plus its
    // native dimensions, so the renderer can draw the crop region over it.
    if (req.sourceView) {
      const base = await previewBase(sourceKey, loadSource)
      const meta = await sharp(base, { failOn: 'none' }).metadata()
      const display = await sharpResizeDisplay(base, PREVIEW_MAX, 86)
      return {
        ok: true,
        dataUrl: `data:image/${display.mime};base64,${display.data.toString('base64')}`,
        width: meta.width ?? 0,
        height: meta.height ?? 0
      }
    }

    // The plain fast preview resizes from a cached, downscaled base (already
    // EXIF-oriented); the heavy paths (real-resolution estimate, AI upscale) use
    // the full-res original, so bake orientation into it here.
    let input =
      req.fullEstimate || req.needsUpscale
        ? await orientBuffer(await loadSource())
        : await previewBase(sourceKey, loadSource)
    // Crop the source first so the preview reflects the kept region.
    input = await cropBuffer(input, req.crop)

    // Colourise the preview too (so it's WYSIWYG); fall back to the original on
    // any failure so a preview never hangs or breaks.
    if (req.colourise && colourise.available()) {
      try {
        input = await colourise.colourise(input)
      } catch {
        /* keep the un-colourised input */
      }
    }

    if (req.needsUpscale && upscaly.available()) {
      const up = await upscaly.upscale({
        input,
        model: req.upModel,
        scale: req.maxFactor,
        targetLongest: Math.max(req.width, req.height),
        // Full estimate matches the export's AI input cap; fast preview stays tiny.
        inputCap: req.fullEstimate ? SPEED_CAP[req.upSpeed ?? 'Balanced'] : 320
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
        flipH: req.flipH,
        grayscale: req.grayscale,
        maxSizeKb: req.maxSizeKb
      })
      // For display: when cropPreview is set, return a high-resolution image
      // (capped) that the renderer shows at 1:1 and lets the user pan over, so AI
      // detail is visible; otherwise the whole image downscaled to fit. Alpha is
      // kept (PNG) so transparency shows; TIFF/HEIC are re-encoded for <img>.
      const display = req.cropPreview
        ? await sharpResizeDisplay(out.buffer, PAN_MAX, 88)
        : await sharpResizeDisplay(out.buffer, PREVIEW_MAX)
      return {
        ok: true,
        dataUrl: `data:image/${display.mime};base64,${display.data.toString('base64')}`,
        width: out.width,
        height: out.height,
        bytes: out.bytes
      }
    }

    // Fast path: capped box. Keep transparency (render PNG) when the source has
    // alpha and the chosen format would preserve it, so the preview shows the
    // checkerboard; otherwise JPEG for speed.
    const longest = Math.max(req.width, req.height)
    const f = longest > PREVIEW_MAX ? PREVIEW_MAX / longest : 1
    const pw = Math.max(1, Math.round(req.width * f))
    const ph = Math.max(1, Math.round(req.height * f))
    const fastMeta = await sharp(input, { failOn: 'none' }).metadata().catch(() => null)
    const srcHasAlpha = !!fastMeta?.hasAlpha
    const keepAlpha =
      srcHasAlpha && (req.format === 'PNG' || req.format === 'WebP' || req.format === 'Auto')
    const out = await processImage({
      input,
      width: pw,
      height: ph,
      format: keepAlpha ? 'PNG' : 'JPEG',
      quality: req.quality,
      fit: req.fit,
      rotation: req.rotation,
      flipH: req.flipH,
      grayscale: req.grayscale
    })
    return {
      ok: true,
      dataUrl: `data:image/${keepAlpha ? 'png' : 'jpeg'};base64,${out.buffer.toString('base64')}`,
      width: out.width,
      height: out.height,
      bytes: out.bytes
    }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}

/** Decode any format and re-encode a downscaled JPEG for on-screen display. */
async function sharpResizeJpeg(buf: Buffer, max: number, quality = 80): Promise<Buffer> {
  return sharp(buf, { failOn: 'none' })
    .resize({ width: max, height: max, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality })
    .toBuffer()
}

/**
 * Downscale for on-screen display, keeping transparency (PNG) when present so
 * the preview shows the checkerboard rather than a flattened fill; otherwise
 * JPEG. Returns the data plus its mime subtype.
 */
async function sharpResizeDisplay(
  buf: Buffer,
  max: number,
  quality = 80
): Promise<{ data: Buffer; mime: 'png' | 'jpeg' }> {
  const meta = await sharp(buf, { failOn: 'none' }).metadata().catch(() => null)
  const hasAlpha = !!meta?.hasAlpha
  const p = sharp(buf, { failOn: 'none' }).resize({ width: max, height: max, fit: 'inside', withoutEnlargement: true })
  return hasAlpha
    ? { data: await p.png().toBuffer(), mime: 'png' }
    : { data: await p.jpeg({ quality }).toBuffer(), mime: 'jpeg' }
}

// Map a sidebar Library source onto a PhotoKit query kind.
const SOURCE_KIND: Record<LibrarySource, 'recents' | 'favorites' | 'recently-added'> = {
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

  ipcMain.handle('photos:import', async (_e, paths: string[]): Promise<ImportedPhoto[]> => {
    const files = await expandToImageFiles(paths)
    const imported = await Promise.all(files.map(importFile))
    return imported.filter((p): p is ImportedPhoto => p !== null)
  })

  // Self-heal: re-read EXIF-oriented dimensions for queued, file-backed photos
  // (corrects items captured before orientation was honored).
  ipcMain.handle(
    'photos:measure',
    async (_e, items: { id: number; sourcePath: string }[]): Promise<{ id: number; w: number; h: number }[]> => {
      const out: { id: number; w: number; h: number }[] = []
      for (const it of items) {
        if (!it.sourcePath) continue
        const size = await orientedSize(it.sourcePath)
        if (size) out.push({ id: it.id, w: size.w, h: size.h })
      }
      return out
    }
  )

  ipcMain.handle('caps:get', async (): Promise<{ colourise: boolean }> => {
    return { colourise: colourise.available() }
  })

  // Default export folder for a fresh install: a dedicated subfolder so exports
  // stay grouped rather than cluttering Downloads.
  ipcMain.handle('paths:defaultDestination', async (): Promise<string> =>
    join(app.getPath('downloads'), 'Desqueeze')
  )

  // Let the user pick a Core ML colourise model; copy it into the model folder.
  ipcMain.handle(
    'colourise:install',
    async (): Promise<{ ok: boolean; available: boolean; error?: string }> => {
      const res = await dialog.showOpenDialog({
        title: 'Choose a Core ML colourise model',
        buttonLabel: 'Use Model',
        // openDirectory so .mlmodelc folders are selectable; showHiddenFiles so
        // models living under dot-folders (e.g. ~/.gemini/…) are visible.
        properties: ['openFile', 'openDirectory', 'showHiddenFiles'],
        filters: [{ name: 'Core ML model', extensions: ['mlmodel', 'mlpackage', 'mlmodelc'] }]
      })
      if (res.canceled || !res.filePaths[0]) return { ok: false, available: colourise.available() }
      try {
        const available = await installColouriseModel(res.filePaths[0])
        return { ok: true, available }
      } catch (e) {
        return { ok: false, available: colourise.available(), error: e instanceof Error ? e.message : String(e) }
      }
    }
  )

  ipcMain.handle(
    'dialog:chooseDestination',
    async (_e, defaultPath?: string): Promise<string | null> => {
      const res = await dialog.showOpenDialog({
        title: 'Export to…',
        properties: ['openDirectory', 'createDirectory'],
        buttonLabel: 'Export Here',
        ...(defaultPath ? { defaultPath } : {})
      })
      return res.canceled || res.filePaths.length === 0 ? null : res.filePaths[0]
    }
  )

  ipcMain.handle('export:run', async (e, req: ExportRequest): Promise<ExportResult> => {
    return runExport(req, (p: ExportProgress) => {
      if (!e.sender.isDestroyed()) e.sender.send('export:progress', p)
    })
  })

  ipcMain.handle('shell:reveal', async (_e, path: string): Promise<void> => {
    shell.showItemInFolder(path)
  })
}
