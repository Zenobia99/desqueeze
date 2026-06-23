import React from 'react'
import type { CropRect } from '@shared/types'

const FULL: CropRect = { x: 0, y: 0, w: 1, h: 1 }
const MIN = 0.05 // smallest crop, as a fraction of each axis
const clamp = (n: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, n))

// h/v: which edge a handle drives (-1 = left/top, 1 = right/bottom, 0 = none).
// {0,0} is the body (move). The 8 outer handles resize.
type Anchor = { h: -1 | 0 | 1; v: -1 | 0 | 1 }
const HANDLES: { a: Anchor; cursor: string }[] = [
  { a: { h: -1, v: -1 }, cursor: 'nwse-resize' },
  { a: { h: 0, v: -1 }, cursor: 'ns-resize' },
  { a: { h: 1, v: -1 }, cursor: 'nesw-resize' },
  { a: { h: -1, v: 0 }, cursor: 'ew-resize' },
  { a: { h: 1, v: 0 }, cursor: 'ew-resize' },
  { a: { h: -1, v: 1 }, cursor: 'nesw-resize' },
  { a: { h: 0, v: 1 }, cursor: 'ns-resize' },
  { a: { h: 1, v: 1 }, cursor: 'nwse-resize' }
]

/**
 * Interactive crop editor: draws the source image (letterboxed to fit) with a
 * draggable / resizable region. Commits the normalized rect on pointer-up.
 */
export default function CropStage({
  src,
  natW,
  natH,
  crop,
  onCommit
}: {
  src: string
  natW: number
  natH: number
  crop?: CropRect
  onCommit: (r: CropRect) => void
}) {
  const stageRef = React.useRef<HTMLDivElement>(null)
  const [size, setSize] = React.useState({ cw: 0, ch: 0 })
  const [rect, setRect] = React.useState<CropRect>(crop ?? FULL)
  React.useEffect(() => setRect(crop ?? FULL), [crop])

  React.useLayoutEffect(() => {
    const el = stageRef.current
    if (!el) return
    const measure = (): void => setSize({ cw: el.clientWidth, ch: el.clientHeight })
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Displayed image box (object-fit: contain) within the stage.
  const aspect = natW > 0 && natH > 0 ? natW / natH : 1
  let dispW = size.cw
  let dispH = size.cw / aspect
  if (dispH > size.ch) {
    dispH = size.ch
    dispW = size.ch * aspect
  }
  const offX = (size.cw - dispW) / 2
  const offY = (size.ch - dispH) / 2

  const drag = React.useRef<{ a: Anchor; sx: number; sy: number; start: CropRect } | null>(null)

  const begin = (a: Anchor) => (e: React.PointerEvent) => {
    e.preventDefault()
    e.stopPropagation()
    stageRef.current?.setPointerCapture(e.pointerId)
    drag.current = { a, sx: e.clientX, sy: e.clientY, start: rect }
  }
  const onMove = (e: React.PointerEvent): void => {
    const d = drag.current
    if (!d || dispW <= 0 || dispH <= 0) return
    const dx = (e.clientX - d.sx) / dispW
    const dy = (e.clientY - d.sy) / dispH
    const s = d.start
    if (d.a.h === 0 && d.a.v === 0) {
      setRect({ x: clamp(s.x + dx, 0, 1 - s.w), y: clamp(s.y + dy, 0, 1 - s.h), w: s.w, h: s.h })
      return
    }
    let l = s.x
    let r = s.x + s.w
    let t = s.y
    let b = s.y + s.h
    if (d.a.h === -1) l = clamp(l + dx, 0, r - MIN)
    if (d.a.h === 1) r = clamp(r + dx, l + MIN, 1)
    if (d.a.v === -1) t = clamp(t + dy, 0, b - MIN)
    if (d.a.v === 1) b = clamp(b + dy, t + MIN, 1)
    setRect({ x: l, y: t, w: r - l, h: b - t })
  }
  const onUp = (e: React.PointerEvent): void => {
    if (!drag.current) return
    drag.current = null
    stageRef.current?.releasePointerCapture?.(e.pointerId)
    onCommit(rect)
  }

  // Crop rect in stage pixels.
  const px = {
    left: offX + rect.x * dispW,
    top: offY + rect.y * dispH,
    width: rect.w * dispW,
    height: rect.h * dispH
  }
  const ready = dispW > 0

  return (
    <div
      ref={stageRef}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      style={{ position: 'absolute', inset: '20px 28px 52px', touchAction: 'none', userSelect: 'none' }}
    >
      <img
        src={src}
        alt="crop source"
        draggable={false}
        style={{
          position: 'absolute',
          left: offX,
          top: offY,
          width: dispW,
          height: dispH,
          borderRadius: 2
        }}
      />
      {ready && (
        <div
          onPointerDown={begin({ h: 0, v: 0 })}
          style={{
            position: 'absolute',
            left: px.left,
            top: px.top,
            width: px.width,
            height: px.height,
            border: '1px solid rgba(255,255,255,.95)',
            boxShadow: '0 0 0 9999px rgba(0,0,0,.5)',
            cursor: 'move',
            boxSizing: 'border-box'
          }}
        >
          {/* Rule-of-thirds guides */}
          {[1, 2].map((i) => (
            <React.Fragment key={i}>
              <div style={{ position: 'absolute', left: `${(i * 100) / 3}%`, top: 0, bottom: 0, width: 1, background: 'rgba(255,255,255,.35)' }} />
              <div style={{ position: 'absolute', top: `${(i * 100) / 3}%`, left: 0, right: 0, height: 1, background: 'rgba(255,255,255,.35)' }} />
            </React.Fragment>
          ))}
          {HANDLES.map(({ a, cursor }) => {
            const hx = a.h === -1 ? 0 : a.h === 1 ? '100%' : '50%'
            const vy = a.v === -1 ? 0 : a.v === 1 ? '100%' : '50%'
            return (
              <div
                key={`${a.h},${a.v}`}
                onPointerDown={begin(a)}
                style={{
                  position: 'absolute',
                  left: hx,
                  top: vy,
                  width: 12,
                  height: 12,
                  marginLeft: -6,
                  marginTop: -6,
                  borderRadius: 3,
                  background: '#fff',
                  boxShadow: '0 1px 3px rgba(0,0,0,.5)',
                  cursor
                }}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}
