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
  shared/        types, sample data, and the compute logic (factors, est-size, totals)
                 — ported verbatim from the prototype so numbers match the design.
  main/          Electron main process
    sharp-service.ts        real resize / format / quality engine (sharp)
    sources/photo-source.ts PhotoSource interface + StubPhotoSource (Photos library stub)
    upscaly/engine.ts       UpscalyEngine interface + StubUpscalyEngine (AI upscaler stub)
    ipc.ts                  IPC handlers + runExport() pipeline
    index.ts                window creation
  preload/       contextBridge — exposes a typed `window.desqueeze` API, no Node leak
  renderer/      React UI (one component per design region)
```

### What's real vs. stubbed

- **Real:** all UI + interaction states, selection, view toggle, format/dimension/resize/quality
  controls, the computed scale % / est. size / per-batch totals, and the **sharp** image
  pipeline (resize, format conversion, quality) wired over IPC. The Export button runs it for
  real and writes files named `{name}@{w}w.{ext}`.
- **Stubbed behind clean interfaces:**
  - `PhotoSource` — `StubPhotoSource` returns the design's 12-item sample batch and synthesizes
    real source rasters (from the gradient stand-ins) so sharp has genuine pixels to work on.
    Swap in a PhotoKit-backed implementation later.
  - `UpscalyEngine` — `StubUpscalyEngine` does a Lanczos enlarge (honouring the 4× max factor)
    as a placeholder for the on-device AI model.

## Not yet designed

Dark mode, preset library manager, crop/rotate editor, export progress, settings — these are
listed in the handoff as planned. The export currently runs the pipeline and shows a small
toast + reveals the output folder; the dedicated progress screen comes next.
