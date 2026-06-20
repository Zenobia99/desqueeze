import { existsSync } from 'fs'
import { promises as fs } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { randomBytes } from 'crypto'
import { execFile } from 'child_process'
import { sharp } from '../sharp-service'
import type { UpscaleModel } from '@shared/types'

export interface UpscaleRequest {
  input: Buffer
  model: UpscaleModel
  /** AI upscale factor (Upscayl -s): 2 | 3 | 4. Defaults to 4. */
  scale?: number
  /**
   * Cap the longest side of the image fed to the AI model. The model enlarges
   * by `scale`, so a small cap keeps preview fast; export uses a larger cap.
   */
  inputCap?: number
}

export interface UpscaleResult {
  buffer: Buffer
  width: number
  height: number
  /** Identifies the implementation that produced this (for diagnostics). */
  engine: string
}

/**
 * The local, on-device AI upscaler ("Upscaly Engine"), behind a clean interface
 * so the rest of the app is engine-agnostic. {@link RealUpscalyEngine} drives the
 * Upscayl CLI; {@link LanczosUpscalyEngine} is the fallback when it's absent.
 */
export interface UpscalyEngine {
  readonly name: string
  available(): boolean
  upscale(req: UpscaleRequest): Promise<UpscaleResult>
}

const UPSCAYL_BIN = '/Applications/Upscayl.app/Contents/Resources/bin/upscayl-bin'
const UPSCAYL_MODELS = '/Applications/Upscayl.app/Contents/Resources/models'

// Map the inspector's model picker onto installed Upscayl models.
const MODEL_MAP: Record<UpscaleModel, string> = {
  Standard: 'upscayl-standard-4x',
  Photo: 'high-fidelity-4x',
  Art: 'digital-art-4x'
}

/** Downscale (never enlarge) so the AI model receives a bounded input. */
async function capInput(input: Buffer, cap: number): Promise<Buffer> {
  const meta = await sharp(input).metadata()
  const longest = Math.max(meta.width ?? 0, meta.height ?? 0)
  if (longest <= cap) return input
  return sharp(input)
    .resize({ width: cap, height: cap, fit: 'inside', withoutEnlargement: true })
    .png()
    .toBuffer()
}

/** Real engine: shells out to the Upscayl CLI (Real-ESRGAN / ncnn-vulkan). */
export class RealUpscalyEngine implements UpscalyEngine {
  readonly name = 'upscayl'

  available(): boolean {
    return existsSync(UPSCAYL_BIN) && existsSync(UPSCAYL_MODELS)
  }

  async upscale(req: UpscaleRequest): Promise<UpscaleResult> {
    const work = await fs.mkdtemp(join(tmpdir(), 'desqueeze-upscale-'))
    const id = randomBytes(4).toString('hex')
    const inPath = join(work, `in_${id}.png`)
    const outPath = join(work, `out_${id}.png`)
    try {
      const prepared = await capInput(req.input, req.inputCap ?? 1280)
      await fs.writeFile(inPath, prepared)
      const model = MODEL_MAP[req.model] ?? MODEL_MAP.Photo
      const scale = String(Math.max(2, Math.min(4, Math.round(req.scale ?? 4))))

      await new Promise<void>((resolve, reject) => {
        execFile(
          UPSCAYL_BIN,
          ['-i', inPath, '-o', outPath, '-m', UPSCAYL_MODELS, '-n', model, '-s', scale],
          { timeout: 120000 },
          (err, _stdout, stderr) => {
            if (err) reject(new Error(`upscayl failed: ${stderr || err.message}`))
            else resolve()
          }
        )
      })

      const buffer = await fs.readFile(outPath)
      const meta = await sharp(buffer).metadata()
      return { buffer, width: meta.width ?? 0, height: meta.height ?? 0, engine: this.name }
    } finally {
      fs.rm(work, { recursive: true, force: true }).catch(() => {})
    }
  }
}

/** Fallback engine: plain Lanczos enlarge via sharp (used when Upscayl is absent). */
export class LanczosUpscalyEngine implements UpscalyEngine {
  readonly name = 'lanczos'

  available(): boolean {
    return true
  }

  async upscale(req: UpscaleRequest): Promise<UpscaleResult> {
    const capped = await capInput(req.input, req.inputCap ?? 1280)
    const scale = Math.max(2, Math.min(4, Math.round(req.scale ?? 4)))
    const meta = await sharp(capped).metadata()
    const width = Math.round((meta.width ?? 0) * scale)
    const height = Math.round((meta.height ?? 0) * scale)
    const buffer = await sharp(capped).resize({ width, height, kernel: 'lanczos3' }).png().toBuffer()
    return { buffer, width, height, engine: this.name }
  }
}

/** Pick the best available engine (Upscayl when installed, else Lanczos). */
export function createUpscalyEngine(): UpscalyEngine {
  const real = new RealUpscalyEngine()
  return real.available() ? real : new LanczosUpscalyEngine()
}
