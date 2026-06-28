import React from 'react'
import type { ComputedRow } from '@shared/compute'
import type { ViewMode } from '@shared/types'
import { ChevronDown, ChevronRight, ArrowRight, HeartIcon, CheckIcon } from './Icons'

const mono = "ui-monospace,'SF Mono',Menlo,monospace"

export type SortKey = 'recent' | 'oldest' | 'name'
const SORT_LABEL: Record<SortKey, string> = {
  recent: 'Recent first',
  oldest: 'Oldest first',
  name: 'Name'
}

// Prefer a real thumbnail; otherwise fall back to the gradient stand-in.
function thumbBackground(photo: { thumbnailUrl?: string; gradient: string }): React.CSSProperties {
  return photo.thumbnailUrl
    ? {
        backgroundImage: `url(${photo.thumbnailUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }
    : { background: photo.gradient }
}

/** Thumbnail with live rotate/flip preview; badges render over it (untransformed). */
function Thumb({
  photo,
  radius,
  rotation,
  flipH,
  children
}: {
  photo: { thumbnailUrl?: string; gradient: string }
  radius: number
  rotation: number
  flipH: boolean
  children?: React.ReactNode
}) {
  return (
    <>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: radius,
          transform: `rotate(${rotation}deg) scaleX(${flipH ? -1 : 1})`,
          transition: 'transform .15s ease',
          ...thumbBackground(photo)
        }}
      />
      {children}
    </>
  )
}

function FormatBadge({ label, selected }: { label: string; selected: boolean }) {
  return (
    <span
      style={{
        flex: 'none',
        font: '600 9.5px -apple-system',
        letterSpacing: '.03em',
        padding: '2px 5px',
        borderRadius: 4,
        background: selected ? 'rgba(255,255,255,.22)' : '#ececef',
        color: selected ? '#fff' : '#7a7a80'
      }}
    >
      {label}
    </span>
  )
}

function CustomBadge({ selected }: { selected: boolean }) {
  return (
    <span
      style={{
        flex: 'none',
        font: '600 9.5px -apple-system',
        letterSpacing: '.03em',
        padding: '2px 5px',
        borderRadius: 4,
        background: selected ? 'rgba(255,255,255,.22)' : '#e8f1fd',
        color: selected ? '#fff' : '#1473e6'
      }}
    >
      custom
    </span>
  )
}

function UpscalyBadge({ selected }: { selected: boolean }) {
  return (
    <span
      style={{
        flex: 'none',
        font: '600 9.5px -apple-system',
        padding: '2px 5px',
        borderRadius: 4,
        background: selected ? 'rgba(255,255,255,.22)' : 'linear-gradient(135deg,#f0eaff,#eef4ff)',
        color: selected ? '#fff' : '#7b5cff'
      }}
    >
      ↑ Upscaly
    </span>
  )
}

function ListRow({
  r,
  selected,
  rotation,
  flipH,
  onClick
}: {
  r: ComputedRow
  selected: boolean
  rotation: number
  flipH: boolean
  onClick: () => void
}) {
  const subColor = selected ? 'rgba(255,255,255,.78)' : '#9a9aa0'
  const scaleColor = selected
    ? 'rgba(255,255,255,.92)'
    : r.scale >= 100
      ? '#1473e6'
      : '#5a5a5f'
  return (
    <div
      className={`dq-row-hover ${selected ? 'is-selected' : ''}`}
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        height: 46,
        padding: '0 18px',
        borderBottom: '0.5px solid #f2f2f4',
        background: selected ? '#1473e6' : 'transparent'
      }}
    >
      <div style={{ width: 54, flex: 'none', display: 'flex', alignItems: 'center' }}>
        <div
          style={{
            width: 44,
            height: 30,
            borderRadius: 4,
            boxShadow: 'inset 0 0 0 0.5px rgba(0,0,0,.12)',
            position: 'relative',
            overflow: 'hidden',
            flex: 'none'
          }}
        >
          <Thumb photo={r.photo} radius={4} rotation={rotation} flipH={flipH}>
            {r.photo.favourite && (
              <div
                style={{
                  position: 'absolute',
                  right: 2,
                  bottom: 2,
                  width: 13,
                  height: 13,
                  borderRadius: '50%',
                  background: 'rgba(0,0,0,.35)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <HeartIcon size={8} />
              </div>
            )}
          </Thumb>
        </div>
      </div>

      <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
        <span
          title={r.photo.name}
          style={{
            font: '500 13px -apple-system',
            color: selected ? '#fff' : '#1d1d1f',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            minWidth: 0,
            flexShrink: 1
          }}
        >
          {r.photo.name}
        </span>
        <FormatBadge label={r.photo.fmt} selected={selected} />
        {r.hasOverride && <CustomBadge selected={selected} />}
      </div>

      <div
        style={{
          width: 122,
          flex: 'none',
          whiteSpace: 'nowrap',
          font: `400 12.5px ${mono}`,
          color: subColor
        }}
      >
        {r.srcLabel}
      </div>

      <div
        style={{
          width: 24,
          flex: 'none',
          display: 'flex',
          alignItems: 'center',
          color: selected ? 'rgba(255,255,255,.6)' : '#c8c8cd'
        }}
      >
        <ArrowRight />
      </div>

      <div
        style={{
          width: 150,
          flex: 'none',
          whiteSpace: 'nowrap',
          display: 'flex',
          alignItems: 'center',
          gap: 6
        }}
      >
        <span style={{ font: `600 12.5px ${mono}`, color: selected ? '#fff' : '#1d1d1f' }}>
          {r.targetLabel}
        </span>
        {r.upscale && <UpscalyBadge selected={selected} />}
      </div>

      <div
        style={{
          width: 60,
          flex: 'none',
          textAlign: 'right',
          font: `500 12.5px ${mono}`,
          color: scaleColor
        }}
      >
        {r.scaleLabel}
      </div>

      <div
        style={{
          width: 74,
          flex: 'none',
          textAlign: 'right',
          font: `400 12.5px ${mono}`,
          color: subColor
        }}
      >
        {r.estLabel}
      </div>
    </div>
  )
}

function GridCard({
  r,
  selected,
  rotation,
  flipH,
  onClick
}: {
  r: ComputedRow
  selected: boolean
  rotation: number
  flipH: boolean
  onClick: () => void
}) {
  return (
    <div
      onClick={onClick}
      style={{
        borderRadius: 9,
        padding: 6,
        cursor: 'default',
        width: '100%',
        maxWidth: 200,
        background: selected ? 'rgba(20,115,230,.10)' : 'transparent',
        boxShadow: selected ? '0 0 0 2px #1473e6' : 'none'
      }}
    >
      <div
        style={{
          aspectRatio: '16 / 9',
          borderRadius: 7,
          boxShadow: 'inset 0 0 0 0.5px rgba(0,0,0,.1)',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <Thumb photo={r.photo} radius={7} rotation={rotation} flipH={flipH} />
        {r.photo.favourite && (
          <div
            style={{
              position: 'absolute',
              right: 7,
              bottom: 7,
              width: 20,
              height: 20,
              borderRadius: '50%',
              background: 'rgba(0,0,0,.34)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <HeartIcon size={11} />
          </div>
        )}
        {selected && (
          <div
            style={{
              position: 'absolute',
              left: 7,
              top: 7,
              width: 20,
              height: 20,
              borderRadius: '50%',
              background: '#1473e6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 1px 3px rgba(0,0,0,.3)'
            }}
          >
            <CheckIcon size={12} strokeWidth={3} />
          </div>
        )}
      </div>
      <div style={{ padding: '8px 2px 2px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ font: '600 12.5px -apple-system', color: '#1d1d1f' }}>
            {r.targetLabel}
          </span>
          <FormatBadge label={r.photo.fmt} selected={false} />
        </div>
        <div style={{ font: '400 11.5px -apple-system', color: '#a0a0a5', marginTop: 2 }}>
          {r.srcLabel} · {r.estLabel}
        </div>
      </div>
    </div>
  )
}

function PageArrow({
  dir,
  disabled,
  onClick
}: {
  dir: 'left' | 'right'
  disabled: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={dir === 'left' ? 'Previous photos' : 'Next photos'}
      style={{
        flex: 'none',
        width: 38,
        height: 38,
        margin: '0 6px',
        borderRadius: '50%',
        border: '0.5px solid #e2e2e6',
        background: '#ffffff',
        boxShadow: disabled ? 'none' : '0 1px 4px rgba(0,0,0,.10)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.3 : 1,
        transition: 'opacity .12s'
      }}
    >
      <ChevronRight size={16} color="#5a5a5f" style={{ transform: dir === 'left' ? 'rotate(180deg)' : 'none' }} />
    </button>
  )
}

// Empty-state glyph: a photo tile with a downward "drop here" arrow.
function DropGlyph() {
  return (
    <svg width="52" height="52" viewBox="0 0 52 52" fill="none" aria-hidden>
      <rect x="6" y="10" width="40" height="30" rx="5" stroke="#c8c8cf" strokeWidth="2.5" />
      <circle cx="17" cy="20" r="3.5" fill="#d4d4da" />
      <path d="M9 35l11-11 8 8 6-5 9 9" stroke="#d4d4da" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M26 28v15m0 0l-5-5m5 5l5-5" stroke="#1366d6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function Queue({
  rows,
  totalCount,
  selected,
  selCount,
  viewMode,
  onToggle,
  onSelectAll,
  onRemoveSelected,
  onAddPhotos,
  loading,
  emptyMessage,
  sort,
  onSortChange
}: {
  rows: ComputedRow[]
  totalCount: number
  selected: number[]
  selCount: number
  viewMode: ViewMode
  onToggle: (id: number) => void
  onSelectAll: () => void
  onRemoveSelected: () => void
  onAddPhotos?: () => void
  loading?: boolean
  emptyMessage?: string
  sort: SortKey
  onSortChange: (s: SortKey) => void
}) {
  const isSel = (id: number) => selected.includes(id)
  const [sortOpen, setSortOpen] = React.useState(false)

  // Lightweight list virtualization: only the rows in (and near) the viewport
  // are mounted, so a 1000-photo queue re-renders a handful of rows per frame
  // instead of all of them (e.g. while dragging Quality). Rows are a fixed
  // height (46px + 0.5px divider), so the window is pure arithmetic.
  const ROW_H = 46.5
  const OVERSCAN = 6
  const scrollRef = React.useRef<HTMLDivElement>(null)
  const [scrollTop, setScrollTop] = React.useState(0)
  const [viewportH, setViewportH] = React.useState(0)
  React.useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const measure = (): void => {
      setViewportH(el.clientHeight)
      setScrollTop(el.scrollTop)
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [viewMode])
  const start = Math.max(0, Math.floor(scrollTop / ROW_H) - OVERSCAN)
  const end = Math.min(rows.length, Math.ceil((scrollTop + (viewportH || 700)) / ROW_H) + OVERSCAN)

  // Gallery view: a page of 6 photos at a time, shuffled with side arrows.
  const PAGE = 6
  const [page, setPage] = React.useState(0)
  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE))
  React.useEffect(() => {
    setPage((p) => Math.min(p, pageCount - 1))
  }, [pageCount])
  const pageStart = page * PAGE
  const pageRows = rows.slice(pageStart, pageStart + PAGE)

  return (
    <div
      style={{
        flex: 1,
        minWidth: 0,
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        background: '#ffffff'
      }}
    >
      {/* queue header */}
      <div
        style={{
          height: 40,
          flex: 'none',
          display: 'flex',
          alignItems: 'center',
          padding: '0 18px',
          borderBottom: '0.5px solid #ededf0',
          gap: 10
        }}
      >
        <span style={{ font: '600 13px -apple-system', color: '#1d1d1f' }}>
          {totalCount} Photos
        </span>
        <span style={{ font: '400 13px -apple-system', color: '#8a8a8e' }}>·</span>
        <span style={{ font: '400 13px -apple-system', color: '#1473e6' }}>
          {selCount} selected
        </span>
        <div style={{ flex: 1 }} />
        {selCount > 0 && (
          <button
            onClick={onRemoveSelected}
            title="Remove selected from queue (⌫)"
            style={{
              border: 'none',
              background: 'transparent',
              font: '500 12.5px -apple-system',
              color: '#ff3b30',
              cursor: 'pointer',
              padding: '4px 6px'
            }}
          >
            Remove
          </button>
        )}
        <button
          onClick={onSelectAll}
          style={{
            border: 'none',
            background: 'transparent',
            font: '500 12.5px -apple-system',
            color: '#0a84ff',
            cursor: 'pointer',
            padding: '4px 6px'
          }}
        >
          Select All
        </button>
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setSortOpen((o) => !o)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              border: 'none',
              background: 'transparent',
              font: '400 12.5px -apple-system',
              color: sortOpen ? '#1d1d1f' : '#5a5a5f',
              cursor: 'pointer',
              padding: '4px 4px'
            }}
          >
            {SORT_LABEL[sort]}
            <ChevronDown />
          </button>
          {sortOpen && (
            <>
              <div style={{ position: 'fixed', inset: 0, zIndex: 9 }} onClick={() => setSortOpen(false)} />
              <div
                style={{
                  position: 'absolute',
                  top: 26,
                  right: 0,
                  zIndex: 10,
                  minWidth: 150,
                  background: '#fff',
                  border: '0.5px solid #d8d8dc',
                  borderRadius: 8,
                  boxShadow: '0 6px 18px rgba(0,0,0,.14)',
                  padding: 4
                }}
              >
                {(Object.keys(SORT_LABEL) as SortKey[]).map((k) => (
                  <div
                    key={k}
                    className={k === sort ? '' : 'dq-hover'}
                    onClick={() => {
                      onSortChange(k)
                      setSortOpen(false)
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '6px 9px',
                      borderRadius: 6,
                      cursor: 'pointer',
                      font: '500 12.5px -apple-system',
                      color: '#1d1d1f',
                      background: k === sort ? '#1473e6' : 'transparent'
                    }}
                  >
                    <span style={{ color: k === sort ? '#fff' : '#1d1d1f' }}>{SORT_LABEL[k]}</span>
                    {k === sort && <CheckIcon style={{ marginLeft: 'auto' }} />}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {emptyMessage && rows.length === 0 ? (
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 14,
            padding: 32,
            textAlign: 'center'
          }}
        >
          {loading ? (
            <div style={{ font: '400 13px -apple-system', color: '#9a9aa0' }}>{emptyMessage}</div>
          ) : (
            <>
              <DropGlyph />
              <div style={{ font: '600 14px -apple-system', color: '#48484c' }}>{emptyMessage}</div>
              <div style={{ font: '400 12.5px -apple-system', color: '#9a9aa0', maxWidth: 260, lineHeight: 1.5 }}>
                Drag &amp; drop photos or a folder here, or browse to add them.
              </div>
              {onAddPhotos && (
                <button
                  onClick={onAddPhotos}
                  className="dq-no-drag"
                  style={{
                    marginTop: 2,
                    height: 30,
                    padding: '0 16px',
                    border: 'none',
                    borderRadius: 8,
                    background: '#1366d6',
                    color: '#fff',
                    font: '600 12.5px -apple-system',
                    cursor: 'pointer'
                  }}
                >
                  Add Photos…
                </button>
              )}
            </>
          )}
        </div>
      ) : viewMode === 'list' ? (
        <>
          {/* column header row */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              height: 28,
              flex: 'none',
              padding: '0 18px',
              background: '#fafafb',
              borderBottom: '0.5px solid #ededf0',
              font: '600 11px -apple-system',
              letterSpacing: '.02em',
              textTransform: 'uppercase',
              color: '#a4a4a9'
            }}
          >
            <div style={{ width: 54, flex: 'none' }} />
            <div style={{ flex: 1, minWidth: 0 }}>Photo</div>
            <div style={{ width: 122, flex: 'none', whiteSpace: 'nowrap' }}>Source</div>
            <div style={{ width: 24, flex: 'none' }} />
            <div style={{ width: 150, flex: 'none', whiteSpace: 'nowrap' }}>Output</div>
            <div style={{ width: 60, flex: 'none', textAlign: 'right' }}>Scale</div>
            <div style={{ width: 74, flex: 'none', textAlign: 'right', whiteSpace: 'nowrap' }}>
              Est. Size
            </div>
          </div>
          <div
            className="dq-scroll"
            ref={scrollRef}
            onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
            style={{ flex: 1, overflowY: 'auto' }}
          >
            <div style={{ paddingTop: start * ROW_H, paddingBottom: Math.max(0, (rows.length - end) * ROW_H) }}>
              {rows.slice(start, end).map((r) => (
                <ListRow
                  key={r.photo.id}
                  r={r}
                  selected={isSel(r.photo.id)}
                  rotation={r.rotation}
                  flipH={r.flipH}
                  onClick={() => onToggle(r.photo.id)}
                />
              ))}
            </div>
          </div>
        </>
      ) : (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', minHeight: 0, padding: '0 8px' }}>
            <PageArrow dir="left" disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))} />
            <div
              className="dq-scroll"
              style={{
                flex: 1,
                minWidth: 0,
                alignSelf: 'stretch',
                overflowY: 'auto',
                display: 'grid',
                gridTemplateColumns: 'repeat(3,1fr)',
                gridAutoRows: 'min-content',
                justifyItems: 'center',
                gap: 14,
                padding: '12px 10px',
                alignContent: 'start'
              }}
            >
              {pageRows.map((r) => (
                <GridCard
                  key={r.photo.id}
                  r={r}
                  selected={isSel(r.photo.id)}
                  rotation={r.rotation}
                  flipH={r.flipH}
                  onClick={() => onToggle(r.photo.id)}
                />
              ))}
            </div>
            <PageArrow
              dir="right"
              disabled={page >= pageCount - 1}
              onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
            />
          </div>
          <div
            style={{
              flex: 'none',
              height: 38,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 12,
              borderTop: '0.5px solid #f2f2f4',
              font: '500 11.5px -apple-system',
              color: '#8a8a8e'
            }}
          >
            <span>
              {rows.length === 0 ? '0' : `${pageStart + 1}–${Math.min(pageStart + PAGE, rows.length)}`} of{' '}
              {rows.length}
            </span>
            <span style={{ color: '#c8c8cc' }}>·</span>
            <span>
              Page {page + 1} / {pageCount}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

export default React.memo(Queue)
