import { execFile } from 'node:child_process'
import { existsSync } from 'node:fs'
import fs from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createHash, randomBytes } from 'node:crypto'
import { app } from 'electron'

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

// Where the user drops the model. A compiled `.mlmodelc` is preferred (no
// per-run compile); a raw `.mlmodel` also works (compiled on first use).
function modelDir(): string {
  return join(app.getPath('userData'), 'models')
}
function findModel(): string | null {
  const dir = modelDir()
  for (const name of ['colourise.mlmodelc', 'colourise.mlmodel', 'colourise.mlpackage']) {
    const p = join(dir, name)
    if (existsSync(p)) return p
  }
  return null
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
      await fs.writeFile(inPath, input)
      await new Promise<void>((resolve, reject) => {
        execFile(bin, [model, inPath, outPath], { timeout: 120000 }, (err, _o, stderr) =>
          err ? reject(new Error(`colourise failed: ${stderr || err.message}`)) : resolve()
        )
      })
      return await fs.readFile(outPath)
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

export function logColouriseRuntime(): void {
  const model = findModel()
  const ok = process.platform === 'darwin' && model !== null
  // eslint-disable-next-line no-console
  console.log(
    `[colourise] available=${ok} · platform=${process.platform} · model=${model ?? `none (drop a Core ML model in ${modelDir()})`}`
  )
}
