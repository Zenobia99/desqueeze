#!/usr/bin/env node
// Make a macOS-compliant app icon from a designed PNG.
//
//   node scripts/make-icon.mjs <source.png> [output.png]
//   node scripts/make-icon.mjs ~/Downloads/my-icon.png
//
// Defaults output to build/icon.png (what electron-builder packages).
//
// What it fixes:
//   1. Transparent corners — flood-fills the near-white background inward from
//      the canvas edges, so white *artwork inside* the squircle is preserved
//      (it isn't connected to the border through white pixels).
//   2. Auto-trim — crops to the actual artwork bounding box.
//   3. Apple grid inset — centres the art in an 824×824 safe area on a
//      transparent 1024×1024 canvas (~10% margin), matching macOS Big Sur+.
//
// Uses the sharp already in dependencies. No extra installs.

import sharp from 'sharp'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(__dirname, '..')

const CANVAS = 1024 // final icon size
const SAFE = 824 // Apple macOS rounded-rect content area within 1024
const WHITE = 232 // r,g,b all >= this counts as "background white"

const srcArg = process.argv[2]
const outArg = process.argv[3] ?? resolve(repoRoot, 'build/icon.png')

if (!srcArg) {
  console.error('Usage: node scripts/make-icon.mjs <source.png> [output.png]')
  process.exit(1)
}
const src = resolve(srcArg.replace(/^~/, process.env.HOME ?? '~'))

const { data, info } = await sharp(src)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true })

const { width: W, height: H, channels: C } = info
if (C !== 4) throw new Error(`expected RGBA, got ${C} channels`)

const isWhite = (i) => data[i] >= WHITE && data[i + 1] >= WHITE && data[i + 2] >= WHITE

// Flood-fill from every border pixel, knocking out connected near-white.
const visited = new Uint8Array(W * H)
const stack = []
const pushIf = (x, y) => {
  if (x < 0 || y < 0 || x >= W || y >= H) return
  const p = y * W + x
  if (visited[p]) return
  visited[p] = 1
  if (isWhite(p * 4)) stack.push(p)
}
for (let x = 0; x < W; x++) {
  pushIf(x, 0)
  pushIf(x, H - 1)
}
for (let y = 0; y < H; y++) {
  pushIf(0, y)
  pushIf(W - 1, y)
}
let cleared = 0
while (stack.length) {
  const p = stack.pop()
  data[p * 4 + 3] = 0 // alpha → transparent
  cleared++
  const x = p % W
  const y = (p - x) / W
  pushIf(x - 1, y)
  pushIf(x + 1, y)
  pushIf(x, y - 1)
  pushIf(x, y + 1)
}

// Trim to the bounding box of pixels that are still opaque-ish.
let minX = W, minY = H, maxX = -1, maxY = -1
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    if (data[(y * W + x) * 4 + 3] > 8) {
      if (x < minX) minX = x
      if (x > maxX) maxX = x
      if (y < minY) minY = y
      if (y > maxY) maxY = y
    }
  }
}
if (maxX < 0) throw new Error('nothing left after background removal — check WHITE threshold')

const cropW = maxX - minX + 1
const cropH = maxY - minY + 1

const trimmed = await sharp(data, { raw: { width: W, height: H, channels: 4 } })
  .extract({ left: minX, top: minY, width: cropW, height: cropH })
  .resize(SAFE, SAFE, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png()
  .toBuffer()

const pad = Math.round((CANVAS - SAFE) / 2)
await sharp({
  create: { width: CANVAS, height: CANVAS, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } }
})
  .composite([{ input: trimmed, left: pad, top: pad }])
  .png()
  .toFile(outArg)

console.log(`✓ wrote ${outArg}`)
console.log(`  source ${W}×${H} → trimmed ${cropW}×${cropH} → ${CANVAS}×${CANVAS} (art in ${SAFE}px safe area)`)
console.log(`  cleared ${cleared.toLocaleString()} background px to transparent`)
