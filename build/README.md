# build resources

electron-builder picks up packaging assets from this folder
(`directories.buildResources` in `electron-builder.yml`).

## App icon

Place your designed icon here as **`icon.png`** — a single square PNG,
**1024×1024** (or at least 512×512). electron-builder converts it into the
macOS `.icns` automatically at build time.

```
build/icon.png      ← 1024×1024 PNG  (recommended)
```

If you'd rather supply a pre-made macOS icon set, drop `build/icon.icns`
instead and change `mac.icon` in `electron-builder.yml` to `build/icon.icns`.

Tips for a crisp result:
- Export at exactly 1024×1024 with transparency where you want it.
- macOS app icons are usually inset ~10% with rounded-square artwork; if your
  design already includes the rounded background, export it edge-to-edge.

No icon here yet → the build falls back to the default Electron icon.
