# Desqueeze

Batch resize & convert photos — Electron + React + TypeScript (Vite via `electron-vite`).

This implements the **Main / Start window** from `design_handoff_desqueeze_macos/` pixel-accurately:
toolbar, sidebar (Library + Presets), queue (List/Grid), inspector (Format / Dimensions /
Resize mode / Upscaly engine / Crop & Rotate / Quality / Filename), and the export bar with
computed scale % / est. size / batch totals.

## Run it

```bash
npm install      # already done if you cloned a populated tree
npm run dev      # launch in development (hot reload)
```

Other scripts:

```bash
npm run build      # type-check-free production bundle into out/
npm run start      # preview the production build
npm run typecheck  # tsc for both the node (main/preload) and web (renderer) projects
```

> Requires Node 18+ (developed on Node 23). On first `npm install`, Electron and the native
> `sharp` binaries are downloaded for your platform/ABI.

## Architecture

```
src/
  shared/        types, presets, and the compute logic (format factors,
                 quality-aware est-size, batch totals).
  main/          Electron main process
    sharp-service.ts          real resize / format / quality engine (sharp);
                              Fill=cover, Fit=letterbox-to-box, Stretch=fill
    sources/photos-library.ts macOS Photos source via an on-demand Swift
                              (PhotoKit) helper
    upscaly/engine.ts         UpscalyEngine — RealUpscalyEngine (Upscayl CLI)
                              with a Lanczos fallback; minimal-factor scaling
    ipc.ts                    IPC handlers + runExport()/runPreview() pipelines
    index.ts                  window creation + [sharp]/[upscaly] diagnostics
  preload/       contextBridge — exposes a typed `window.desqueeze` API, no Node leak
  renderer/      React UI (one component per design region)
```

### What's real

- **UI + interaction:** all states, selection, view toggle, format/dimension/resize/quality
  controls, the computed scale % / quality-aware est. size / per-batch totals.
- **Image pipeline (sharp):** resize, format conversion, and quality, wired over IPC. The three
  resize modes produce the exact target box and are visually distinct (Fit letterboxes with
  black bars). Export writes files named `{name}@{w}w.{ext}`.
- **macOS Photos library:** `PhotosLibrarySource` reads Recents/Favourites/Recently-Added via a
  Swift PhotoKit helper compiled on demand.
- **AI upscaling:** `RealUpscalyEngine` shells out to the Upscayl CLI (expects `Upscayl.app`
  installed); falls back to a plain Lanczos enlarge when it's absent. It upscales by the minimal
  factor needed and caps model input per the Speed setting (Fastest/Balanced/Max). The preview
  offers a 1:1 AI-vs-Original compare with drag-to-pan.

> **No built-in sample photos.** Populate the queue from the macOS Photos library (loaded
> automatically) or via **Add Photos** (file import). Under an unsigned `npm run dev` launch,
> macOS may deny Photos access (TCC) — use **Add Photos** to test. The startup `[sharp]` and
> `[upscaly]` log lines report the active native binaries (arch/SIMD and Upscayl vs fallback).

## Not yet designed

Dark mode, preset library manager, crop/rotate editor, export progress, settings — these are
listed in the handoff as planned. The export currently runs the pipeline and shows a small
toast + reveals the output folder; the dedicated progress screen comes next.
