import { execFile } from 'node:child_process'
import { existsSync, readdirSync } from 'node:fs'
import fs from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createHash, randomBytes } from 'node:crypto'
import { app } from 'electron'
import { sharp } from '../sharp-service'

/**
 * On-device photo colouriser ("Colourise Engine"), behind a clean interface so
 * the rest of the app stays engine-agnostic — same shape as the Upscaly engine.
 *
 * The real implementation runs a Core ML model (e.g. a DeOldify conversion) on
 * Apple Silicon's Neural Engine, via a tiny Swift helper compiled on first use
 * (the same lazy-compile pattern the Photos library helper uses). It is gated on
 * the model being present, so there's no dead button when it isn't installed.
 */
export interface ColouriseEngine {
  readonly name: string
  available(): boolean
  colourise(input: Buffer): Promise<Buffer>
}

// Where the user drops the model. Any Core ML model in this folder is used —
// the filename doesn't matter — preferring a compiled .mlmodelc (no per-run
// compile), then .mlpackage, then a raw .mlmodel.
function modelDir(): string {
  return join(app.getPath('userData'), 'models')
}
function modelExt(name: string): number {
  const n = name.toLowerCase()
  if (n.endsWith('.mlmodelc')) return 0
  if (n.endsWith('.mlpackage')) return 1
  if (n.endsWith('.mlmodel')) return 2
  return 99
}
function findModel(): string | null {
  const dir = modelDir()
  let entries: string[]
  try {
    entries = readdirSync(dir)
  } catch {
    return null
  }
  const models = entries.filter((e) => modelExt(e) < 99).sort((a, b) => modelExt(a) - modelExt(b))
  return models.length ? join(dir, models[0]) : null
}

/** Cap the image fed to the model (its colour is low-frequency, and Vision
 * rescales to the model's baked input anyway) to keep the temp PNG small. */
async function capForModel(input: Buffer, cap = 1280): Promise<Buffer> {
  const meta = await sharp(input).metadata()
  if (Math.max(meta.width ?? 0, meta.height ?? 0) <= cap) return input
  return sharp(input).resize({ width: cap, height: cap, fit: 'inside', withoutEnlargement: true }).png().toBuffer()
}

/**
 * DeOldify post-step: keep the model's colour but the ORIGINAL's full-resolution
 * detail. Transfer chroma (Cb/Cr, Rec.601) from the colourised result onto the
 * original's luminance (Y), so output is as sharp as the source, not the model.
 */
async function mergeLuminance(original: Buffer, colour: Buffer): Promise<Buffer> {
  const meta = await sharp(original).metadata()
  const W = meta.width ?? 0
  const H = meta.height ?? 0
  if (!W || !H) return colour
  const orig = await sharp(original).removeAlpha().toColourspace('srgb').raw().toBuffer()
  const col = await sharp(colour)
    .removeAlpha()
    .toColourspace('srgb')
    .resize({ width: W, height: H, fit: 'fill', kernel: 'cubic' })
    .raw()
    .toBuffer()
  const out = Buffer.allocUnsafe(W * H * 3)
  const clamp = (n: number): number => (n < 0 ? 0 : n > 255 ? 255 : n)
  for (let p = 0, j = 0; p < W * H; p++, j += 3) {
    const Y = 0.299 * orig[j] + 0.587 * orig[j + 1] + 0.114 * orig[j + 2]
    const R = col[j]
    const G = col[j + 1]
    const B = col[j + 2]
    let cb = -0.168736 * R - 0.331264 * G + 0.5 * B
    let cr = 0.5 * R - 0.418688 * G - 0.081312 * B

    // Localised edge desaturation (prevents light background color from bleeding onto dark foreground silhouettes)
    const Y_col = 0.299 * R + 0.587 * G + 0.114 * B
    const diff = Y_col - Y
    if (diff > 20) {
      const factor = Math.max(0, 1.0 - (diff - 20) / 40.0)
      cb *= factor
      cr *= factor
    }

    // Smooth desaturation for highlights (Y > 235) and shadows (Y < 80)
    if (Y > 235) {
      const x = (255.0 - Y) / (255.0 - 235.0)
      const factor = x * x
      cb *= factor
      cr *= factor
    } else if (Y < 80) {
      const x = Y / 80.0
      const factor = x * x
      cb *= factor
      cr *= factor
    }

    out[j] = clamp(Y + 1.402 * cr)
    out[j + 1] = clamp(Y - 0.344136 * cb - 0.714136 * cr)
    out[j + 2] = clamp(Y + 1.772 * cb)
  }
  return sharp(out, { raw: { width: W, height: H, channels: 3 } }).png().toBuffer()
}

// Swift helper: load the Core ML model (Neural Engine via .all compute units),
// run it through Vision as an image→image request, and write a PNG. Assumes a
// model with an image input and an image output (the common DeOldify Core ML
// conversion). If a model emits a multiarray instead, this is where we'd adapt.
const SWIFT_SOURCE = `
import Foundation
import CoreML
import Vision
import AppKit
import CoreImage

let args = CommandLine.arguments
guard args.count == 4 else {
  FileHandle.standardError.write("usage: colourise <model> <in> <out>\\n".data(using: .utf8)!)
  exit(2)
}
let modelPath = args[1], inPath = args[2], outPath = args[3]
let modelURL = URL(fileURLWithPath: modelPath)

func loadModel() throws -> MLModel {
  let config = MLModelConfiguration()
  config.computeUnits = .all
  if modelPath.hasSuffix(".mlmodelc") {
    return try MLModel(contentsOf: modelURL, configuration: config)
  }
  let compiled = try MLModel.compileModel(at: modelURL)
  return try MLModel(contentsOf: compiled, configuration: config)
}

do {
  let mlModel = try loadModel()
  let vnModel = try VNCoreMLModel(for: mlModel)
  let request = VNCoreMLRequest(model: vnModel)
  request.imageCropAndScaleOption = .scaleFill
  let handler = VNImageRequestHandler(url: URL(fileURLWithPath: inPath), options: [:])
  try handler.perform([request])
  guard let obs = request.results?.first as? VNPixelBufferObservation else {
    FileHandle.standardError.write("model did not return an image output\\n".data(using: .utf8)!)
    exit(3)
  }
  let ci = CIImage(cvPixelBuffer: obs.pixelBuffer)
  let rep = NSCIImageRep(ciImage: ci)
  let img = NSImage(size: rep.size)
  img.addRepresentation(rep)
  guard let tiff = img.tiffRepresentation,
        let bmp = NSBitmapImageRep(data: tiff),
        let png = bmp.representation(using: .png, properties: [:]) else {
    FileHandle.standardError.write("encode failed\\n".data(using: .utf8)!)
    exit(4)
  }
  try png.write(to: URL(fileURLWithPath: outPath))
} catch {
  FileHandle.standardError.write("colourise error: \\(error)\\n".data(using: .utf8)!)
  exit(1)
}
`

class CoreMLColouriseEngine implements ColouriseEngine {
  readonly name = 'coreml'
  private binPromise: Promise<string> | null = null
  available(): boolean {
    return process.platform === 'darwin' && findModel() !== null
  }

  /** Compile (once) and cache the Swift helper, keyed by source hash. */
  private ensureHelper(): Promise<string> {
    if (this.binPromise) return this.binPromise
    this.binPromise = (async () => {
      const hash = createHash('sha1').update(SWIFT_SOURCE).digest('hex').slice(0, 10)
      const binDir = join(app.getPath('userData'), 'bin')
      const bin = join(binDir, `desqueeze-colourise-${hash}`)
      await fs.mkdir(binDir, { recursive: true })
      if (existsSync(bin)) return bin
      const work = await fs.mkdtemp(join(tmpdir(), 'dq-colourise-build-'))
      const src = join(work, 'colourise.swift')
      await fs.writeFile(src, SWIFT_SOURCE)
      await new Promise<void>((resolve, reject) => {
        execFile(
          'swiftc',
          [src, '-O', '-o', bin, '-framework', 'CoreML', '-framework', 'Vision', '-framework', 'AppKit', '-framework', 'CoreImage'],
          { timeout: 120000 },
          (err, _stdout, stderr) => (err ? reject(new Error(`swiftc failed: ${stderr || err.message}`)) : resolve())
        )
      }).finally(() => fs.rm(work, { recursive: true, force: true }).catch(() => {}))
      return bin
    })()
    this.binPromise.catch(() => {
      this.binPromise = null
    })
    return this.binPromise
  }

  async colourise(input: Buffer): Promise<Buffer> {
    const model = findModel()
    if (!model) throw new Error('colourise model not installed')
    const bin = await this.ensureHelper()
    const dir = await fs.mkdtemp(join(tmpdir(), 'dq-colourise-'))
    const id = randomBytes(4).toString('hex')
    const inPath = join(dir, `in_${id}.png`)
    const outPath = join(dir, `out_${id}.png`)
    try {
      await fs.writeFile(inPath, await capForModel(input))
      await new Promise<void>((resolve, reject) => {
        execFile(bin, [model, inPath, outPath], { timeout: 120000 }, (err, _o, stderr) =>
          err ? reject(new Error(`colourise failed: ${stderr || err.message}`)) : resolve()
        )
      })
      const modelOut = await fs.readFile(outPath)
      // Recombine the model's colour with the original full-res luminance.
      return await mergeLuminance(input, modelOut)
    } finally {
      fs.rm(dir, { recursive: true, force: true }).catch(() => {})
    }
  }
}

let engine: ColouriseEngine | null = null
export function getColouriseEngine(): ColouriseEngine {
  if (!engine) engine = new CoreMLColouriseEngine()
  return engine
}

/**
 * Install a user-picked Core ML model into the app's model folder (copying the
 * file/bundle), replacing any existing one. Returns whether colourise is now
 * available. Lets the UI offer a "Choose model…" picker instead of asking the
 * user to find a hidden folder.
 */
export async function installColouriseModel(srcPath: string): Promise<boolean> {
  const dir = modelDir()
  await fs.mkdir(dir, { recursive: true })
  for (const name of ['colourise.mlmodelc', 'colourise.mlmodel', 'colourise.mlpackage']) {
    await fs.rm(join(dir, name), { recursive: true, force: true }).catch(() => {})
  }
  const lower = srcPath.toLowerCase()
  const ext = lower.endsWith('.mlmodelc') ? 'mlmodelc' : lower.endsWith('.mlpackage') ? 'mlpackage' : 'mlmodel'
  await fs.cp(srcPath, join(dir, `colourise.${ext}`), { recursive: true })
  return getColouriseEngine().available()
}

export function logColouriseRuntime(): void {
  const dir = modelDir()
  const model = findModel()
  const ok = process.platform === 'darwin' && model !== null
  let contents = '(no such folder)'
  try {
    contents = readdirSync(dir).join(', ') || '(empty)'
  } catch {
    /* folder doesn't exist yet */
  }
  // eslint-disable-next-line no-console
  console.log(
    `[colourise] available=${ok} · platform=${process.platform} · dir=${dir} · contents=[${contents}] · model=${model ?? 'none'}`
  )
}
