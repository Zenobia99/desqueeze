import { app } from 'electron'
import { spawn, execFile } from 'child_process'
import { promises as fs } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { createHash } from 'crypto'
import type { ImportedPhoto, OutputFormat } from '@shared/types'

// A tiny PhotoKit command-line helper. Compiled on demand with swiftc and cached
// in userData. Subcommands:
//   list-favorites <limit> <thumbMax>   → JSON [{id,filename,width,height,uti,thumb}]
//   export <localIdentifier> <destPath> → writes original image data to destPath
const SWIFT_SOURCE = String.raw`
import Foundation
import Photos
import AppKit

func requestAuth() -> Bool {
  let status = PHPhotoLibrary.authorizationStatus(for: .readWrite)
  if status == .authorized || status == .limited { return true }
  if status == .denied || status == .restricted { return false }
  let sem = DispatchSemaphore(value: 0)
  var ok = false
  PHPhotoLibrary.requestAuthorization(for: .readWrite) { s in
    ok = (s == .authorized || s == .limited)
    sem.signal()
  }
  sem.wait()
  return ok
}

func filename(_ a: PHAsset) -> String {
  let r = PHAssetResource.assetResources(for: a)
  return r.first?.originalFilename ?? a.localIdentifier
}

func uti(_ a: PHAsset) -> String {
  let r = PHAssetResource.assetResources(for: a)
  return r.first?.uniformTypeIdentifier ?? ""
}

func collect(_ res: PHFetchResult<PHAsset>) -> [PHAsset] {
  var out: [PHAsset] = []
  res.enumerateObjects { a, _, _ in out.append(a) }
  return out
}

func assetsForKind(_ kind: String, _ limit: Int) -> [PHAsset] {
  let opts = PHFetchOptions()
  opts.sortDescriptors = [NSSortDescriptor(key: "creationDate", ascending: false)]
  if limit > 0 { opts.fetchLimit = limit }
  switch kind {
  case "favorites":
    opts.predicate = NSPredicate(format: "favorite == YES && mediaType == %d", PHAssetMediaType.image.rawValue)
    return collect(PHAsset.fetchAssets(with: opts))
  case "recently-added":
    let cols = PHAssetCollection.fetchAssetCollections(with: .smartAlbum, subtype: .smartAlbumRecentlyAdded, options: nil)
    guard let col = cols.firstObject else { return [] }
    let imgOpts = PHFetchOptions()
    imgOpts.predicate = NSPredicate(format: "mediaType == %d", PHAssetMediaType.image.rawValue)
    imgOpts.sortDescriptors = [NSSortDescriptor(key: "creationDate", ascending: false)]
    if limit > 0 { imgOpts.fetchLimit = limit }
    return collect(PHAsset.fetchAssets(in: col, options: imgOpts))
  default: // "recents"
    opts.predicate = NSPredicate(format: "mediaType == %d", PHAssetMediaType.image.rawValue)
    return collect(PHAsset.fetchAssets(with: opts))
  }
}

func thumbBase64(_ a: PHAsset, _ maxPx: CGFloat) -> String? {
  let m = PHImageManager.default()
  let opts = PHImageRequestOptions()
  opts.isSynchronous = true
  opts.deliveryMode = .highQualityFormat
  opts.resizeMode = .fast
  opts.isNetworkAccessAllowed = true
  var b64: String? = nil
  m.requestImage(for: a, targetSize: CGSize(width: maxPx, height: maxPx), contentMode: .aspectFill, options: opts) { img, _ in
    guard let img = img, let tiff = img.tiffRepresentation, let rep = NSBitmapImageRep(data: tiff),
          let jpeg = rep.representation(using: .jpeg, properties: [.compressionFactor: 0.72]) else { return }
    b64 = jpeg.base64EncodedString()
  }
  return b64
}

func exportData(_ a: PHAsset, _ path: String) -> Bool {
  let m = PHImageManager.default()
  let opts = PHImageRequestOptions()
  opts.isSynchronous = true
  opts.deliveryMode = .highQualityFormat
  opts.isNetworkAccessAllowed = true
  opts.version = .current
  var ok = false
  m.requestImageDataAndOrientation(for: a, options: opts) { data, _, _, _ in
    if let data = data { ok = ((try? data.write(to: URL(fileURLWithPath: path))) != nil) }
  }
  return ok
}

func emit(_ obj: Any) {
  let data = try! JSONSerialization.data(withJSONObject: obj, options: [])
  FileHandle.standardOutput.write(data)
}

let args = CommandLine.arguments
guard args.count >= 2 else { emit(["error": "usage"]); exit(0) }
let cmd = args[1]
guard requestAuth() else { emit(["error": "denied"]); exit(0) }

switch cmd {
case "list":
  let kind = args.count > 2 ? args[2] : "recents"
  let limit = args.count > 3 ? (Int(args[3]) ?? 100) : 100
  let thumbMax = args.count > 4 ? CGFloat(Double(args[4]) ?? 256) : 256
  var arr: [[String: Any]] = []
  for a in assetsForKind(kind, limit) {
    var d: [String: Any] = [
      "id": a.localIdentifier,
      "filename": filename(a),
      "width": a.pixelWidth,
      "height": a.pixelHeight,
      "uti": uti(a)
    ]
    if let t = thumbBase64(a, thumbMax) { d["thumb"] = t }
    arr.append(d)
  }
  emit(arr)
case "export":
  guard args.count >= 4 else { emit(["error": "usage"]); exit(0) }
  guard let a = PHAsset.fetchAssets(withLocalIdentifiers: [args[2]], options: nil).firstObject else {
    emit(["error": "notfound"]); exit(0)
  }
  emit(exportData(a, args[3]) ? ["ok": true] : ["error": "export"])
default:
  emit(["error": "unknown"])
}
`

const INFO_PLIST = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>CFBundleIdentifier</key><string>com.desqueeze.photoshelper</string>
  <key>CFBundleName</key><string>Desqueeze Photos Helper</string>
  <key>NSPhotoLibraryUsageDescription</key>
  <string>Desqueeze reads your Photos Favourites to resize, convert, and export them.</string>
</dict></plist>
`

interface RawAsset {
  id: string
  filename: string
  width: number
  height: number
  uti: string
  thumb?: string
}

function utiToFormat(uti: string, filename: string): OutputFormat {
  const u = uti.toLowerCase()
  const ext = (filename.split('.').pop() || '').toLowerCase()
  if (u.includes('png') || ext === 'png') return 'PNG'
  if (u.includes('webp') || ext === 'webp') return 'WebP'
  if (u.includes('tiff') || ext === 'tiff' || ext === 'tif') return 'TIFF'
  if (u.includes('heic') || u.includes('heif') || ext === 'heic' || ext === 'heif') return 'HEIC'
  return 'JPEG'
}

/**
 * macOS Photos library source, backed by a PhotoKit helper. Implements just the
 * Favourites album for now; kept self-contained so it can be swapped/extended.
 */
export class PhotosLibrarySource {
  private binPromise: Promise<string> | null = null

  /** Ensure the Swift helper is compiled & cached; returns its path. */
  private async ensureHelper(): Promise<string> {
    if (this.binPromise) return this.binPromise
    this.binPromise = (async () => {
      const hash = createHash('sha1').update(SWIFT_SOURCE).digest('hex').slice(0, 10)
      const binDir = join(app.getPath('userData'), 'bin')
      const bin = join(binDir, `desqueeze-photos-${hash}`)
      await fs.mkdir(binDir, { recursive: true })
      try {
        await fs.access(bin)
        return bin
      } catch {
        // not built yet
      }
      const work = await fs.mkdtemp(join(tmpdir(), 'dq-swift-'))
      const src = join(work, 'helper.swift')
      const plist = join(work, 'Info.plist')
      await fs.writeFile(src, SWIFT_SOURCE)
      await fs.writeFile(plist, INFO_PLIST)
      await new Promise<void>((resolve, reject) => {
        execFile(
          'swiftc',
          [
            src,
            '-O',
            '-o',
            bin,
            '-framework',
            'Photos',
            '-framework',
            'AppKit',
            '-Xlinker',
            '-sectcreate',
            '-Xlinker',
            '__TEXT',
            '-Xlinker',
            '__info_plist',
            '-Xlinker',
            plist
          ],
          { timeout: 120000 },
          (err, _stdout, stderr) => {
            if (err) reject(new Error(`swiftc failed: ${stderr || err.message}`))
            else resolve()
          }
        )
      })
      return bin
    })()
    return this.binPromise
  }

  private run(args: string[], maxBuffer = 256 * 1024 * 1024): Promise<string> {
    return new Promise(async (resolve, reject) => {
      let bin: string
      try {
        bin = await this.ensureHelper()
      } catch (e) {
        return reject(e)
      }
      const child = spawn(bin, args)
      const chunks: Buffer[] = []
      const errChunks: Buffer[] = []
      let size = 0
      child.stdout.on('data', (d: Buffer) => {
        size += d.length
        if (size > maxBuffer) {
          child.kill()
          return reject(new Error('helper output too large'))
        }
        chunks.push(d)
      })
      child.stderr.on('data', (d: Buffer) => errChunks.push(d))
      child.on('error', reject)
      child.on('close', (code) => {
        if (code !== 0 && chunks.length === 0) {
          reject(new Error(Buffer.concat(errChunks).toString() || `exit ${code}`))
        } else {
          resolve(Buffer.concat(chunks).toString('utf8'))
        }
      })
    })
  }

  /** Load a library source ('recents' | 'favorites' | 'recently-added') as
   *  queue-ready photos with real thumbnails. */
  async listAssets(
    kind: 'recents' | 'favorites' | 'recently-added',
    limit = 200,
    thumbMax = 320
  ): Promise<ImportedPhoto[]> {
    const out = await this.run(['list', kind, String(limit), String(thumbMax)])
    const parsed = JSON.parse(out) as RawAsset[] | { error: string }
    if (!Array.isArray(parsed)) {
      throw new Error(parsed.error || 'error')
    }
    return parsed.map((a) => ({
      name: a.filename.replace(/\.[^.]+$/, ''),
      w: a.width,
      h: a.height,
      fmt: utiToFormat(a.uti, a.filename),
      favourite: kind === 'favorites',
      gradient: 'linear-gradient(165deg,#c9c9ce,#a8a8ad)',
      thumbnailUrl: a.thumb ? `data:image/jpeg;base64,${a.thumb}` : undefined,
      photosId: a.id
    }))
  }

  /** Export an asset's original image data to a temp file; returns its bytes. */
  async getImageBuffer(photosId: string): Promise<Buffer> {
    const dest = join(await fs.mkdtemp(join(tmpdir(), 'dq-photo-')), 'asset.bin')
    const out = await this.run(['export', photosId, dest])
    const parsed = JSON.parse(out) as { ok?: boolean; error?: string }
    if (!parsed.ok) throw new Error(parsed.error || 'export failed')
    const buf = await fs.readFile(dest)
    fs.rm(dest, { force: true }).catch(() => {})
    return buf
  }
}
