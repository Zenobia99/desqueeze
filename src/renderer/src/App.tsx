import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type {
  ExportItemRequest,
  ImportedPhoto,
  LibrarySource,
  Photo,
  PreviewRequest,
  PreviewResult
} from '@shared/types'
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

  // Imported files surface at the FRONT of Recents and Last Import (most recent
  // first); they shouldn't appear under Favourites/Albums.
  const sourcePhotos = useMemo(() => {
    const base = cache[source] ?? []
    if (source === 'recents' || source === 'last-import') return [...imported, ...base]
    return base
  }, [cache, source, imported])

  const s = useDesqueeze(sourcePhotos)
  const [search, setSearch] = useState('')
  const [destination, setDestination] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)
  const [progress, setProgress] = useState<{ done: number; total: number; name: string } | null>(null)
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

  const showToast = useCallback((msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 6000)
  }, [])

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
      upSpeed: e.upSpeed,
      maxFactor: e.maxFactor,
      maxSizeKb: e.maxSizeKb
    }
  }, [leadRow, s, canUpscale])
  const previewKey = previewReq ? JSON.stringify(previewReq) : ''

  type PreviewInfo = { url: string; bytes: number; w: number; h: number }
  const [fast, setFast] = useState<PreviewInfo | null>(null)
  const [fastLoading, setFastLoading] = useState(false)
  // On-demand AI preview (heavy), tied to the exact settings it ran for. Both a
  // 100% center crop of the AI result and of the plain (no-AI) resize are
  // rendered for the same region, so the user can compare detail side by side.
  const [upRes, setUpRes] = useState<PreviewInfo | null>(null)
  const [origRes, setOrigRes] = useState<PreviewInfo | null>(null)
  const [upscaleKey, setUpscaleKey] = useState<string>('')
  const [upscaleLoading, setUpscaleLoading] = useState(false)
  // While the AI preview is up: false → show AI crop, true → show plain crop.
  const [compareOrig, setCompareOrig] = useState(false)
  // Upscale preview view: false → whole image (true proportions), true → 1:1 zoom.
  const [zoom, setZoom] = useState(false)

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
      setOrigRes(null)
      setUpscaleKey('')
      setCompareOrig(false)
      setZoom(false)
    }
  }, [previewKey, upscaleKey])

  const onToggleCompare = useCallback(() => setCompareOrig((v) => !v), [])
  const onToggleZoom = useCallback(() => setZoom((v) => !v), [])

  const handlePreviewUpscale = useCallback(async () => {
    if (!previewReq || !window.desqueeze || upscaleLoading) return
    setUpscaleLoading(true)
    const keyAtStart = previewKey
    const toInfo = (res: PreviewResult): PreviewInfo | null =>
      res.ok && res.dataUrl
        ? { url: res.dataUrl, bytes: res.bytes ?? 0, w: res.width ?? 0, h: res.height ?? 0 }
        : null
    // Full-resolution renders → exact byte count + a 100% center crop. Render
    // the AI and the plain (no-AI) version of the same region for comparison.
    const [ai, orig] = await Promise.all([
      window.desqueeze.preview({ ...previewReq, needsUpscale: true, fullEstimate: true, cropPreview: true }),
      window.desqueeze.preview({ ...previewReq, needsUpscale: false, fullEstimate: true, cropPreview: true })
    ])
    const aiInfo = toInfo(ai)
    if (aiInfo) {
      setUpRes(aiInfo)
      setOrigRes(toInfo(orig))
      setUpscaleKey(keyAtStart)
      setCompareOrig(false)
      setZoom(false)
    }
    setUpscaleLoading(false)
  }, [previewReq, previewKey, upscaleLoading])

  const showingUpscaled = !!upRes && upscaleKey === previewKey
  const previewUrl = showingUpscaled
    ? (compareOrig && origRes ? origRes.url : upRes!.url)
    : (fast?.url ?? null)

  // When the AI preview is shown it carries the EXACT export byte count
  // (rendered at real resolution + format); otherwise use the static estimate.
  const captionEstLabel = useMemo(() => {
    if (!leadRow) return ''
    if (showingUpscaled && upRes && upRes.bytes > 0) return fmtSize(upRes.bytes / 1024)
    return leadRow.estLabel
  }, [leadRow, showingUpscaled, upRes])

  const handleSelectSource = useCallback(
    (next: LibrarySource) => {
      setSource(next)
      s.clearSelection()
      loadSource(next)
    },
    [s.clearSelection, loadSource]
  )

  const onSelectPreset = useCallback(
    (gi: number, ii: number) => s.applyPreset(s.presetGroups[gi].items[ii]),
    [s.applyPreset, s.presetGroups]
  )

  // Merge a batch of imported photos: dedupe by path, newest-first, surface them
  // in Last Import, and report what happened. Shared by the dialog and drag-drop.
  const addImported = useCallback(
    (items: ImportedPhoto[]) => {
      if (!items.length) {
        showToast('No images found to add')
        return
      }
      const seen = new Set(imported.map((p) => p.path).filter(Boolean))
      const fresh = items.filter((p) => !p.path || !seen.has(p.path))
      const withIds: Photo[] = fresh.map((p) => ({ ...p, id: nextId.current++ }))
      if (withIds.length) {
        setImported((prev) => [...withIds, ...prev])
        setSource('last-import')
        loadSource('last-import')
      }
      const dup = items.length - withIds.length
      showToast(
        withIds.length
          ? `Added ${withIds.length} photo${withIds.length === 1 ? '' : 's'}${dup ? ` · ${dup} already added` : ''}`
          : 'Those photos are already in the queue'
      )
    },
    [imported, showToast, loadSource]
  )

  const handleAddPhotos = useCallback(async () => {
    if (!window.desqueeze) return
    const added = await window.desqueeze.addPhotos()
    if (added?.length) addImported(added)
  }, [addImported])

  const [dragging, setDragging] = useState(false)
  const onDropFiles = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault()
      setDragging(false)
      if (!window.desqueeze) return
      const files = Array.from(e.dataTransfer.files)
      if (!files.length) return
      const paths = files.map((f) => window.desqueeze!.getPathForFile(f)).filter(Boolean)
      if (!paths.length) return
      addImported(await window.desqueeze.importPaths(paths))
    },
    [addImported]
  )

  const removeSelected = useCallback(() => {
    if (s.selected.length === 0) return
    const sel = new Set(s.selected)
    setCache((c) => (c[source] ? { ...c, [source]: c[source]!.filter((p) => !sel.has(p.id)) } : c))
    setImported((prev) => prev.filter((p) => !sel.has(p.id)))
    s.clearSelection()
  }, [s.selected, s.clearSelection, source])

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

  // Stop the window from navigating to a dropped file when a drop lands outside
  // the React drop target, and keep the overlay reliable across child elements.
  useEffect(() => {
    const prevent = (e: DragEvent): void => e.preventDefault()
    window.addEventListener('dragover', prevent)
    window.addEventListener('drop', prevent)
    return () => {
      window.removeEventListener('dragover', prevent)
      window.removeEventListener('drop', prevent)
    }
  }, [])

  const handleChooseDestination = useCallback(async () => {
    const dir = await window.desqueeze?.chooseDestination()
    if (dir) setDestination(dir)
  }, [])

  const handleExport = useCallback(async () => {
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
          upSpeed: e.upSpeed,
          maxFactor: e.maxFactor,
          maxSizeKb: e.maxSizeKb
        }
      })
      setProgress({ done: 0, total: items.length, name: '' })
      const off = window.desqueeze.onExportProgress((p) =>
        setProgress({ done: p.index, total: p.total, name: p.name })
      )
      try {
        const res = await window.desqueeze.exportPhotos({ items, destination: destination ?? '' })
        const ok = res.items.filter((i) => i.ok).length
        const failed = res.items.length - ok
        showToast(
          `Exported ${ok}/${res.items.length}${failed ? ` · ${failed} failed` : ''} → ${res.destination}`
        )
        const first = res.items.find((i) => i.ok && i.outputPath)
        if (first?.outputPath) window.desqueeze.reveal(first.outputPath)
      } finally {
        off()
        setProgress(null)
      }
    } catch (err) {
      showToast(`Export failed: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setExporting(false)
    }
  }, [exporting, s.rows, s.selected, s.effectiveFor, destination, showToast])

  const isLoading = loadingSource === source && !cache[source]
  const emptyMessage = isLoading
    ? 'Loading your photos…'
    : visibleRows.length === 0
      ? errorMsg ?? 'No photos to show'
      : undefined

  return (
    <div
      style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#fff', position: 'relative' }}
      onDragEnter={(e) => {
        e.preventDefault()
        if (!dragging) setDragging(true)
      }}
      onDragOver={(e) => {
        e.preventDefault()
        if (!dragging) setDragging(true)
      }}
      onDragLeave={(e) => {
        if (!e.relatedTarget) setDragging(false)
      }}
      onDrop={onDropFiles}
    >
      <Toolbar
        viewMode={s.viewMode}
        setViewMode={s.setViewMode}
        search={search}
        setSearch={setSearch}
        onAddPhotos={handleAddPhotos}
      />

      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        <Sidebar
          activeSource={source}
          onSelectSource={handleSelectSource}
          upscale={s.upscale}
          setUpscale={s.setUpscale}
          upModel={s.upModel}
          setUpModel={s.setUpModel}
          upSpeed={s.upSpeed}
          setUpSpeed={s.setUpSpeed}
          maxFactor={s.maxFactor}
          setMaxFactor={s.setMaxFactor}
          upscaleDisabled={!s.hasSelection}
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
              comparing={compareOrig}
              hasComparison={!!origRes}
              onToggleCompare={onToggleCompare}
              zoom={zoom}
              onToggleZoom={onToggleZoom}
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
            onAddPhotos={handleAddPhotos}
            loading={isLoading}
            emptyMessage={emptyMessage}
          />
        </div>

        <Inspector
          selCount={s.selCount}
          disabled={!s.hasSelection}
          preset={s.preset}
          presetGroups={s.presetGroups}
          onSelectPreset={onSelectPreset}
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
          quality={s.quality}
          setQuality={s.setQuality}
          maxSizeKb={s.maxSizeKb}
          setMaxSizeKb={s.setMaxSizeKb}
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

      {progress && (
        <div
          style={{
            position: 'fixed',
            bottom: 72,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 360,
            maxWidth: '80%',
            background: 'rgba(28,28,30,.94)',
            color: '#fff',
            padding: '11px 14px',
            borderRadius: 10,
            boxShadow: '0 6px 20px rgba(0,0,0,.3)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', font: '500 12px -apple-system', marginBottom: 7 }}>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginRight: 8 }}>
              {progress.name ? `Exporting ${progress.name}` : 'Exporting…'}
            </span>
            <span style={{ flex: 'none', color: 'rgba(255,255,255,.75)' }}>
              {progress.done}/{progress.total}
            </span>
          </div>
          <div style={{ height: 5, borderRadius: 3, background: 'rgba(255,255,255,.18)', overflow: 'hidden' }}>
            <div
              style={{
                height: '100%',
                width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%`,
                background: 'linear-gradient(90deg,#4a91f5,#1366d6)',
                transition: 'width .15s ease'
              }}
            />
          </div>
        </div>
      )}

      {dragging && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 50,
            pointerEvents: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(20,115,230,.10)',
            border: '3px dashed rgba(20,115,230,.6)',
            borderRadius: 8
          }}
        >
          <div
            style={{
              padding: '14px 22px',
              borderRadius: 12,
              background: 'rgba(28,28,30,.92)',
              color: '#fff',
              font: '600 15px -apple-system',
              boxShadow: '0 8px 24px rgba(0,0,0,.35)'
            }}
          >
            Drop photos to add
          </div>
        </div>
      )}

      {toast && !progress && (
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
