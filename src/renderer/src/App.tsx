import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ExportItemRequest, LibrarySource, Photo, PreviewRequest } from '@shared/types'
import { computeTotals, fmtSize } from '@shared/compute'
import { useDesqueeze } from './store'
import Toolbar from './components/Toolbar'
import Sidebar from './components/Sidebar'
import Queue from './components/Queue'
import Inspector from './components/Inspector'
import ExportBar from './components/ExportBar'
import PreviewPane from './components/PreviewPane'

type SourceCache = Partial<Record<LibrarySource, Photo[]>>

export default function App() {
  const [source, setSource] = useState<LibrarySource>('recents')
  const [cache, setCache] = useState<SourceCache>({})
  const [imported, setImported] = useState<Photo[]>([])
  const [loadingSource, setLoadingSource] = useState<LibrarySource | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const nextId = useRef(1)

  const loadSource = useCallback(
    async (src: LibrarySource) => {
      if (!window.desqueeze || cache[src]) return
      setLoadingSource(src)
      setErrorMsg(null)
      try {
        const res = await window.desqueeze.loadSource(src)
        if (res.ok) {
          const withIds: Photo[] = res.photos.map((p) => ({ ...p, id: nextId.current++ }))
          setCache((c) => ({ ...c, [src]: withIds }))
        } else {
          setCache((c) => ({ ...c, [src]: [] }))
          setErrorMsg(
            res.reason === 'denied'
              ? 'Photos access denied — enable it in System Settings ▸ Privacy & Security ▸ Photos'
              : res.reason === 'unavailable'
                ? 'Photos integration unavailable (Swift toolchain missing)'
                : 'Could not read your Photos library'
          )
        }
      } catch {
        setCache((c) => ({ ...c, [src]: [] }))
        setErrorMsg('Could not read your Photos library')
      } finally {
        setLoadingSource(null)
      }
    },
    [cache]
  )

  useEffect(() => {
    loadSource('recents')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const sourcePhotos = useMemo(() => [...(cache[source] ?? []), ...imported], [cache, source, imported])

  const s = useDesqueeze(sourcePhotos)
  const [search, setSearch] = useState('')
  const [destination, setDestination] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const visibleRows = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return s.rows
    return s.rows.filter((r) => r.photo.name.toLowerCase().includes(q))
  }, [s.rows, search])

  // Export-bar estimate reflects the selection (what will export); the whole
  // queue when nothing is selected (informational only).
  const exportTotals = useMemo(() => {
    const rows = s.selCount > 0 ? s.rows.filter((r) => s.selected.includes(r.photo.id)) : s.rows
    return computeTotals(rows)
  }, [s.rows, s.selected, s.selCount])

  const destinationLabel = destination ? destination.split('/').pop() || 'Optimised' : 'Optimised'

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 6000)
  }

  // ---- Live preview of the lead-selected photo ----
  const leadRow = useMemo(
    () => (s.leadId != null ? s.rows.find((r) => r.photo.id === s.leadId) ?? null : null),
    [s.leadId, s.rows]
  )
  // AI upscaling applies only when the target exceeds the source AND the
  // Upscaly toggle is on for this photo.
  const canUpscale = !!leadRow && leadRow.upscale && (s.leadId != null && s.effectiveFor(s.leadId).upscale)

  const previewReq = useMemo<PreviewRequest | null>(() => {
    if (!leadRow || s.leadId == null) return null
    const e = s.effectiveFor(s.leadId)
    return {
      photosId: leadRow.photo.photosId,
      sourcePath: leadRow.photo.path,
      width: e.targetW,
      height: e.targetH,
      format: e.format,
      quality: e.quality,
      fit: e.fit,
      rotation: e.rotation,
      flipH: e.flipH,
      needsUpscale: canUpscale,
      upModel: e.upModel,
      maxFactor: e.maxFactor
    }
  }, [leadRow, s, canUpscale])
  const previewKey = previewReq ? JSON.stringify(previewReq) : ''

  type PreviewInfo = { url: string; bytes: number; w: number; h: number }
  const [fast, setFast] = useState<PreviewInfo | null>(null)
  const [fastLoading, setFastLoading] = useState(false)
  // On-demand AI-upscaled preview (heavy), tied to the exact settings it ran for.
  const [upRes, setUpRes] = useState<PreviewInfo | null>(null)
  const [upscaleKey, setUpscaleKey] = useState<string>('')
  const [upscaleLoading, setUpscaleLoading] = useState(false)

  // Fast preview (no AI) renders automatically on every change.
  useEffect(() => {
    if (!previewReq || !window.desqueeze) {
      setFast(null)
      return
    }
    let cancelled = false
    setFastLoading(true)
    const t = setTimeout(async () => {
      const res = await window.desqueeze!.preview({ ...previewReq, needsUpscale: false })
      if (cancelled) return
      setFast(
        res.ok && res.dataUrl
          ? { url: res.dataUrl, bytes: res.bytes ?? 0, w: res.width ?? 0, h: res.height ?? 0 }
          : null
      )
      setFastLoading(false)
    }, 180)
    return () => {
      cancelled = true
      clearTimeout(t)
    }
  }, [previewKey]) // eslint-disable-line react-hooks/exhaustive-deps

  // Any settings change invalidates a previously-rendered AI preview.
  useEffect(() => {
    if (upscaleKey && upscaleKey !== previewKey) {
      setUpRes(null)
      setUpscaleKey('')
    }
  }, [previewKey, upscaleKey])

  async function handlePreviewUpscale() {
    if (!previewReq || !window.desqueeze || upscaleLoading) return
    setUpscaleLoading(true)
    const keyAtStart = previewKey
    // Full-resolution render → exact output byte count for the estimate.
    const res = await window.desqueeze.preview({ ...previewReq, needsUpscale: true, fullEstimate: true })
    if (res.ok && res.dataUrl) {
      setUpRes({ url: res.dataUrl, bytes: res.bytes ?? 0, w: res.width ?? 0, h: res.height ?? 0 })
      setUpscaleKey(keyAtStart)
    }
    setUpscaleLoading(false)
  }

  const showingUpscaled = !!upRes && upscaleKey === previewKey
  const previewUrl = showingUpscaled ? upRes!.url : (fast?.url ?? null)

  // When the AI preview is shown it carries the EXACT export byte count
  // (rendered at real resolution + format); otherwise use the static estimate.
  const captionEstLabel = useMemo(() => {
    if (!leadRow) return ''
    if (showingUpscaled && upRes && upRes.bytes > 0) return fmtSize(upRes.bytes / 1024)
    return leadRow.estLabel
  }, [leadRow, showingUpscaled, upRes])

  async function handleSelectSource(next: LibrarySource) {
    setSource(next)
    s.clearSelection()
    loadSource(next)
  }

  async function handleAddPhotos() {
    if (!window.desqueeze) return
    const added = await window.desqueeze.addPhotos()
    if (!added?.length) return
    const withIds: Photo[] = added.map((p) => ({ ...p, id: nextId.current++ }))
    setImported((prev) => [...prev, ...withIds])
    showToast(`Added ${withIds.length} photo${withIds.length === 1 ? '' : 's'}`)
  }

  const removeSelected = useCallback(() => {
    if (s.selected.length === 0) return
    const sel = new Set(s.selected)
    setCache((c) => (c[source] ? { ...c, [source]: c[source]!.filter((p) => !sel.has(p.id)) } : c))
    setImported((prev) => prev.filter((p) => !sel.has(p.id)))
    s.clearSelection()
  }, [s, source])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA')) return
      if ((e.key === 'Delete' || e.key === 'Backspace') && s.selected.length > 0) {
        e.preventDefault()
        removeSelected()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [removeSelected, s.selected.length])

  async function handleChooseDestination() {
    const dir = await window.desqueeze?.chooseDestination()
    if (dir) setDestination(dir)
  }

  async function handleExport() {
    if (exporting || !window.desqueeze) return
    // Export the selected photos only.
    const toExport = s.rows.filter((r) => s.selected.includes(r.photo.id))
    if (toExport.length === 0) {
      showToast('Select photos to export')
      return
    }
    setExporting(true)
    setToast(null)
    try {
      const items: ExportItemRequest[] = toExport.map((r) => {
        const e = s.effectiveFor(r.photo.id)
        return {
          id: r.photo.id,
          name: r.photo.name,
          sourcePath: r.photo.path,
          photosId: r.photo.photosId,
          width: e.targetW,
          height: e.targetH,
          format: e.format,
          quality: e.quality,
          fit: e.fit,
          rotation: e.rotation,
          flipH: e.flipH,
          needsUpscale: r.upscale && e.upscale,
          upModel: e.upModel,
          maxFactor: e.maxFactor
        }
      })
      const res = await window.desqueeze.exportPhotos({ items, destination: destination ?? '' })
      const ok = res.items.filter((i) => i.ok).length
      showToast(`Exported ${ok}/${res.items.length} → ${res.destination}`)
      const first = res.items.find((i) => i.ok && i.outputPath)
      if (first?.outputPath) window.desqueeze.reveal(first.outputPath)
    } catch (err) {
      showToast(`Export failed: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setExporting(false)
    }
  }

  const isLoading = loadingSource === source && !cache[source]
  const emptyMessage = isLoading
    ? 'Loading your photos…'
    : visibleRows.length === 0
      ? errorMsg ?? 'No photos to show'
      : undefined

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#fff' }}>
      <Toolbar
        viewMode={s.viewMode}
        setViewMode={s.setViewMode}
        search={search}
        setSearch={setSearch}
        onAddPhotos={handleAddPhotos}
      />

      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        <Sidebar
          presetGroups={s.presetGroups}
          activePresetId={s.preset.id}
          onSelectPreset={(gi, ii) => s.applyPreset(s.presetGroups[gi].items[ii])}
          activeSource={source}
          onSelectSource={handleSelectSource}
        />

        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          {leadRow && (
            <PreviewPane
              name={leadRow.photo.name}
              dataUrl={previewUrl}
              loading={fastLoading}
              dimsLabel={leadRow.targetLabel}
              estLabel={captionEstLabel}
              canUpscale={canUpscale}
              showingUpscaled={showingUpscaled}
              upscaleLoading={upscaleLoading}
              onPreviewUpscale={handlePreviewUpscale}
            />
          )}
          <Queue
            rows={visibleRows}
            totalCount={s.photos.length}
            selected={s.selected}
            selCount={s.selCount}
            viewMode={s.viewMode}
            onToggle={s.toggle}
            onSelectAll={s.selectAll}
            onRemoveSelected={removeSelected}
            emptyMessage={emptyMessage}
          />
        </div>

        <Inspector
          selCount={s.selCount}
          disabled={!s.hasSelection}
          preset={s.preset}
          format={s.format}
          setFormat={s.setFormat}
          targetW={s.targetW}
          targetH={s.targetH}
          setTargetW={s.setTargetW}
          setTargetH={s.setTargetH}
          aspectLocked={s.aspectLocked}
          onToggleAspectLock={s.toggleAspectLock}
          onSwapDims={s.swapDims}
          fit={s.fit}
          setFit={s.setFit}
          upscale={s.upscale}
          setUpscale={s.setUpscale}
          upModel={s.upModel}
          setUpModel={s.setUpModel}
          maxFactor={s.maxFactor}
          setMaxFactor={s.setMaxFactor}
          quality={s.quality}
          setQuality={s.setQuality}
          rotation={s.rotation}
          flipH={s.flipH}
          onRotateCW={s.rotateCW}
          onRotateCCW={s.rotateCCW}
          onToggleFlip={s.toggleFlip}
        />
      </div>

      <ExportBar
        headline={
          s.selCount > 0
            ? `${s.selCount} selected`
            : `${s.photos.length} ${s.photos.length === 1 ? 'photo' : 'photos'} queued`
        }
        totalSize={exportTotals.totalSize}
        savings={exportTotals.savings}
        exportCount={s.selCount}
        exportDisabled={s.selCount === 0}
        destinationLabel={destinationLabel}
        exporting={exporting}
        onChooseDestination={handleChooseDestination}
        onExport={handleExport}
      />

      {toast && (
        <div
          style={{
            position: 'fixed',
            bottom: 72,
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(28,28,30,.92)',
            color: '#fff',
            font: '500 12.5px -apple-system',
            padding: '9px 14px',
            borderRadius: 9,
            boxShadow: '0 6px 20px rgba(0,0,0,.3)',
            maxWidth: 620,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}
        >
          {toast}
        </div>
      )}
    </div>
  )
}
