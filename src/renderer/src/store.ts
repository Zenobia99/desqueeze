import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { DEFAULT_SETTINGS, PRESET_GROUPS } from '@shared/data'
import { computeRow, computeTotals, withCommas } from '@shared/compute'
import type { ItemSettings, Photo, Preset, ViewMode } from '@shared/types'

type Overrides = Record<number, ItemSettings>

export function useDesqueeze(photos: Photo[]) {
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [selected, setSelected] = useState<number[]>([])
  // Latest selection, readable inside other state updaters without nesting
  // setState calls (which double-fires under StrictMode and breaks toggles).
  const selectedRef = useRef(selected)
  useEffect(() => {
    selectedRef.current = selected
  }, [selected])
  // Per-photo settings. A photo with no entry uses DEFAULT_SETTINGS.
  const [overrides, setOverrides] = useState<Overrides>({})

  const effectiveFor = useCallback(
    (id: number): ItemSettings => overrides[id] ?? DEFAULT_SETTINGS,
    [overrides]
  )

  const toggle = useCallback((id: number) => {
    setSelected((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]))
  }, [])
  const selectAll = useCallback(() => setSelected(photos.map((p) => p.id)), [photos])
  const clearSelection = useCallback(() => setSelected([]), [])
  /** Replace the selection with a single photo (e.g. auto-select on import). */
  const selectOne = useCallback((id: number) => setSelected([id]), [])

  // Apply a per-item update to every selected photo (no-op without a selection).
  // A single, pure setOverrides call — no nested setState — so it behaves
  // correctly when StrictMode double-invokes the updater.
  const applyEach = useCallback(
    (update: (cur: ItemSettings) => Partial<ItemSettings>) => {
      const sel = selectedRef.current
      if (sel.length === 0) return
      setOverrides((ov) => {
        const next = { ...ov }
        for (const id of sel) {
          const cur = next[id] ?? DEFAULT_SETTINGS
          next[id] = { ...cur, ...update(cur) }
        }
        return next
      })
    },
    []
  )

  const applyPatch = useCallback(
    (patch: Partial<ItemSettings>) => applyEach(() => patch),
    [applyEach]
  )

  // Settings actions (apply only to the current selection).
  const setFormat = useCallback((format: ItemSettings['format']) => applyPatch({ format }), [applyPatch])
  const setFit = useCallback((fit: ItemSettings['fit']) => applyPatch({ fit }), [applyPatch])
  const setQuality = useCallback((quality: number) => applyPatch({ quality }), [applyPatch])
  const setUpscale = useCallback((upscale: boolean) => applyPatch({ upscale }), [applyPatch])
  // Colourise and grayscale are opposites — enabling one clears the other.
  const setColourise = useCallback(
    (colourise: boolean) => applyPatch(colourise ? { colourise: true, grayscale: false } : { colourise: false }),
    [applyPatch]
  )
  const setGrayscale = useCallback(
    (grayscale: boolean) => applyPatch(grayscale ? { grayscale: true, colourise: false } : { grayscale: false }),
    [applyPatch]
  )
  const setUpModel = useCallback(
    (upModel: ItemSettings['upModel']) => applyPatch({ upModel }),
    [applyPatch]
  )
  const setUpSpeed = useCallback(
    (upSpeed: ItemSettings['upSpeed']) => applyPatch({ upSpeed }),
    [applyPatch]
  )
  const setMaxFactor = useCallback((maxFactor: number) => applyPatch({ maxFactor }), [applyPatch])
  const setMaxSizeKb = useCallback((maxSizeKb: number) => applyPatch({ maxSizeKb }), [applyPatch])
  const rotateCW = useCallback(
    () => applyEach((c) => ({ rotation: (c.rotation + 90) % 360 })),
    [applyEach]
  )
  const rotateCCW = useCallback(
    () => applyEach((c) => ({ rotation: (c.rotation + 270) % 360 })),
    [applyEach]
  )
  const toggleFlip = useCallback(() => applyEach((c) => ({ flipH: !c.flipH })), [applyEach])
  // Crop (normalized) applies to the whole selection; clear with undefined.
  const setCrop = useCallback((crop: ItemSettings['crop']) => applyPatch({ crop }), [applyPatch])
  const toggleAspectLock = useCallback(
    () => applyEach((c) => ({ aspectLocked: !c.aspectLocked })),
    [applyEach]
  )

  const setTargetW = useCallback(
    (w: number) =>
      applyEach((c) => {
        const targetH = c.aspectLocked && c.targetW > 0 ? Math.round(w * (c.targetH / c.targetW)) : c.targetH
        return { targetW: w, targetH, presetId: '', presetName: 'Custom', presetDim: `${w} × ${targetH}` }
      }),
    [applyEach]
  )
  const setTargetH = useCallback(
    (h: number) =>
      applyEach((c) => {
        const targetW = c.aspectLocked && c.targetH > 0 ? Math.round(h * (c.targetW / c.targetH)) : c.targetW
        return { targetH: h, targetW, presetId: '', presetName: 'Custom', presetDim: `${targetW} × ${h}` }
      }),
    [applyEach]
  )

  const swapDims = useCallback(
    () =>
      applyEach((c) => ({
        targetW: c.targetH,
        targetH: c.targetW,
        presetId: '',
        presetName: 'Custom',
        presetDim: `${c.targetH} × ${c.targetW}`
      })),
    [applyEach]
  )

  // Default freshly-imported photos to their own native size, so importing a 4K
  // file doesn't silently downscale it to the global preset. Won't clobber a
  // photo that already has settings.
  const seedSourceSizes = useCallback((items: Photo[]) => {
    setOverrides((ov) => {
      const next = { ...ov }
      for (const p of items) {
        if (next[p.id] || !p.w || !p.h) continue
        next[p.id] = {
          ...DEFAULT_SETTINGS,
          targetW: p.w,
          targetH: p.h,
          presetId: '',
          presetName: 'Original',
          presetDim: `${p.w} × ${p.h}`
        }
      }
      return next
    })
  }, [])

  // Set each selected photo's output to its OWN source dimensions ("Match").
  const matchSourceSizes = useCallback(() => {
    const sel = selectedRef.current
    if (sel.length === 0) return
    setOverrides((ov) => {
      const next = { ...ov }
      for (const id of sel) {
        const p = photos.find((x) => x.id === id)
        if (!p || !p.w || !p.h) continue
        const cur = next[id] ?? DEFAULT_SETTINGS
        next[id] = {
          ...cur,
          targetW: p.w,
          targetH: p.h,
          presetId: '',
          presetName: 'Original',
          presetDim: `${p.w} × ${p.h}`
        }
      }
      return next
    })
  }, [photos])

  const applyPreset = useCallback(
    (p: Preset) =>
      applyPatch({
        targetW: p.w,
        targetH: p.h,
        presetId: p.id,
        presetName: p.name,
        presetDim: p.dim
      }),
    [applyPatch]
  )

  const rows = useMemo(
    () =>
      photos.map((p) => {
        const e = overrides[p.id] ?? DEFAULT_SETTINGS
        return computeRow(
          p,
          {
            format: e.format,
            targetW: e.targetW,
            targetH: e.targetH,
            fit: e.fit,
            quality: e.quality,
            maxSizeKb: e.maxSizeKb,
            rotation: e.rotation,
            flipH: e.flipH,
            crop: e.crop
          },
          p.id in overrides
        )
      }),
    [photos, overrides]
  )
  const totals = useMemo(() => computeTotals(rows), [rows])

  // The "lead" selected photo drives the preview / inspector representation.
  const leadId = selected.length > 0 ? selected[selected.length - 1] : null
  const repr: ItemSettings = leadId != null ? effectiveFor(leadId) : DEFAULT_SETTINGS
  const hasSelection = selected.length > 0
  // Stable object so a memoized Inspector doesn't re-render on unrelated state.
  const preset = useMemo(
    () => ({ id: repr.presetId, name: repr.presetName, dim: repr.presetDim }),
    [repr.presetId, repr.presetName, repr.presetDim]
  )

  return {
    photos,
    presetGroups: PRESET_GROUPS,
    // selection / view
    viewMode,
    setViewMode,
    selected,
    selCount: selected.length,
    hasSelection,
    leadId,
    toggle,
    selectAll,
    clearSelection,
    selectOne,
    effectiveFor,
    // representative settings (what the inspector shows)
    format: repr.format,
    fit: repr.fit,
    quality: repr.quality,
    upscale: repr.upscale,
    colourise: repr.colourise,
    grayscale: repr.grayscale,
    upModel: repr.upModel,
    upSpeed: repr.upSpeed,
    maxFactor: repr.maxFactor,
    maxSizeKb: repr.maxSizeKb,
    rotation: repr.rotation,
    flipH: repr.flipH,
    crop: repr.crop,
    aspectLocked: repr.aspectLocked,
    preset,
    targetW: repr.targetW,
    targetH: repr.targetH,
    dimW: withCommas(repr.targetW),
    dimH: withCommas(repr.targetH),
    // derived
    rows,
    totals,
    // setters
    setFormat,
    setFit,
    setQuality,
    setUpscale,
    setColourise,
    setGrayscale,
    setUpModel,
    setUpSpeed,
    setMaxFactor,
    setMaxSizeKb,
    setTargetW,
    setTargetH,
    rotateCW,
    rotateCCW,
    toggleFlip,
    setCrop,
    toggleAspectLock,
    swapDims,
    applyPreset,
    seedSourceSizes,
    matchSourceSizes
  }
}

export type Store = ReturnType<typeof useDesqueeze>
