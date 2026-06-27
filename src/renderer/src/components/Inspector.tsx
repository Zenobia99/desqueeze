import React from 'react'
import type { MonoTone, OutputFormat, ResizeMode, ViewMode } from '@shared/types'
import ColourisePanel from './ColourisePanel'
import {
  CropIcon,
  RotateCCW,
  RotateCW,
  FlipIcon,
  FillIcon,
  FitIcon,
  StretchIcon,
  ListIcon,
  GridIcon
} from './Icons'

const mono = 'ui-monospace,Menlo,monospace'

const groupLabel: React.CSSProperties = {
  font: '600 11px -apple-system',
  letterSpacing: '.04em',
  textTransform: 'uppercase',
  color: '#9a9aa0',
  marginBottom: 7
}

const FORMATS: OutputFormat[] = ['Auto', 'PNG', 'JPEG', 'TIFF', 'HEIC', 'WebP']
// Mono tones + a swatch hinting the tint (matches sharp's TONE_TINT).
const TONES: { key: MonoTone; label: string; swatch: string }[] = [
  { key: 'neutral', label: 'Neutral', swatch: '#9a9a9a' },
  { key: 'sepia', label: 'Sepia', swatch: '#a5784a' },
  { key: 'selenium', label: 'Selenium', swatch: '#7c6f96' },
  { key: 'cyanotype', label: 'Cyanotype', swatch: '#325fa0' }
]
const FITS: { name: ResizeMode; Icon: React.ComponentType<{ size?: number; color?: string }> }[] = [
  { name: 'Fill', Icon: FillIcon },
  { name: 'Fit', Icon: FitIcon },
  { name: 'Stretch', Icon: StretchIcon }
]

function SizeField({ value, onCommit }: { value: number; onCommit: (n: number) => void }) {
  const [text, setText] = React.useState(String(value))
  React.useEffect(() => setText(String(value)), [value])
  const commit = (): void => {
    const n = parseInt(text.replace(/[^0-9]/g, ''), 10)
    if (Number.isFinite(n) && n > 0) onCommit(n)
    else setText(String(value))
  }
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        height: 24,
        padding: '0 8px',
        background: '#f2f2f4',
        border: '0.5px solid #d8d8dc',
        borderRadius: 6
      }}
    >
      <input
        className="dq-in"
        value={text}
        inputMode="numeric"
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
        }}
        style={{
          width: 46,
          border: 'none',
          background: 'transparent',
          font: `600 12px ${mono}`,
          color: '#1d1d1f',
          textAlign: 'right'
        }}
      />
      <span style={{ font: '400 11px -apple-system', color: '#b0b0b5' }}>KB</span>
    </div>
  )
}

// Segmented list/gallery toggle for the queue view (sits in the panel header):
// icon + word label, active state in blue.
function ViewBtn({
  active,
  onClick,
  label,
  children
}: {
  active: boolean
  onClick: () => void
  label: string
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        height: 28,
        padding: '0 12px',
        border: 'none',
        borderRadius: 6,
        cursor: 'pointer',
        font: '600 12px -apple-system',
        color: active ? '#1473e6' : '#6a6a70',
        background: active ? '#ffffff' : 'transparent',
        boxShadow: active ? '0 1px 2px rgba(0,0,0,.14)' : 'none'
      }}
    >
      {children}
      {label}
    </button>
  )
}

function CropBtn({
  onClick,
  active,
  children
}: {
  onClick: () => void
  active?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1,
        height: 38,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: `0.5px solid ${active ? '#1473e6' : '#d8d8dc'}`,
        borderRadius: 8,
        background: active ? 'rgba(20,115,230,.08)' : '#ffffff',
        cursor: 'pointer'
      }}
    >
      {children}
    </button>
  )
}

export interface InspectorProps {
  selCount: number
  disabled: boolean
  /** Queue list/grid view toggle (lives in this panel's header now). */
  viewMode: ViewMode
  setViewMode: (v: ViewMode) => void
  format: OutputFormat
  setFormat: (f: OutputFormat) => void
  fit: ResizeMode
  setFit: (f: ResizeMode) => void
  maxSizeKb: number
  setMaxSizeKb: (n: number) => void
  rotation: number
  flipH: boolean
  onRotateCW: () => void
  onRotateCCW: () => void
  onToggleFlip: () => void
  /** Whether a crop region is currently set on the selection. */
  cropActive: boolean
  /** Whether the crop editor is open. */
  cropEditing: boolean
  onCropEdit: () => void
  /** Queue has photos → show the drop-to-add card in the panel's dead space. */
  hasPhotos: boolean
  onAddPhotos: () => void
  /** Colourise (B&W → colour) toggle + whether the on-device model is installed. */
  colourise: boolean
  setColourise: (b: boolean) => void
  colouriseAvailable: boolean
  onInstallColourise: () => void
  /** Convert to true (gamma-correct) black & white. */
  grayscale: boolean
  setGrayscale: (b: boolean) => void
  /** Mono tone (shown when B&W is on). */
  tone: MonoTone
  setTone: (t: MonoTone) => void
}

function Inspector(p: InspectorProps) {
  return (
    <div
      className="dq-scroll"
      style={{
        width: 360,
        flex: 'none',
        background: '#f7f7f9',
        borderLeft: '0.5px solid #dcdce0',
        overflowY: 'auto',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      {/* Header — outside the disabled fieldset so the queue view toggle always
          works, even with no selection. */}
      <div style={{ padding: '12px 16px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <span style={{ font: '600 15px -apple-system', color: '#1d1d1f' }}>Format &amp; Adjust</span>
        <div style={{ display: 'flex', alignItems: 'center', background: '#e7e7ea', borderRadius: 8, padding: 2, gap: 2 }}>
          <ViewBtn active={p.viewMode === 'list'} onClick={() => p.setViewMode('list')} label="List">
            <ListIcon size={16} />
          </ViewBtn>
          <ViewBtn active={p.viewMode === 'grid'} onClick={() => p.setViewMode('grid')} label="Gallery">
            <GridIcon size={16} />
          </ViewBtn>
        </div>
      </div>

      <div style={{ position: 'relative' }}>
        {/* Disabled veil when nothing is selected */}
        {p.disabled && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              zIndex: 5,
              background: 'rgba(247,247,249,.55)',
              cursor: 'default'
            }}
          />
        )}
        <fieldset
          disabled={p.disabled}
          style={{
            border: 'none',
            margin: 0,
            padding: 0,
            minInlineSize: 'auto',
            opacity: p.disabled ? 0.5 : 1
          }}
        >

      {/* Format */}
      <div style={{ padding: '0 18px 14px' }}>
        <div style={groupLabel}>Format</div>
        <div style={{ display: 'flex', gap: 5 }}>
          {FORMATS.map((f) => {
            const a = p.format === f
            return (
              <button
                key={f}
                onClick={() => p.setFormat(f)}
                style={{
                  flex: 1,
                  minWidth: 0,
                  height: 30,
                  padding: '0 4px',
                  borderRadius: 7,
                  cursor: 'pointer',
                  font: '600 11.5px -apple-system',
                  border: `0.5px solid ${a ? '#1473e6' : '#d8d8dc'}`,
                  background: a ? '#1473e6' : '#ffffff',
                  color: a ? '#fff' : '#3a3a3f'
                }}
              >
                {f}
              </button>
            )
          })}
        </div>
      </div>

      {/* Resize Mode */}
      <div style={{ padding: '0 18px 14px' }}>
        <div style={groupLabel}>Resize Mode</div>
        <div style={{ display: 'flex', gap: 6 }}>
          {FITS.map(({ name, Icon }) => {
            const a = p.fit === name
            const color = a ? '#1473e6' : '#5a5a5f'
            return (
              <button
                key={name}
                onClick={() => p.setFit(name)}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 5,
                  height: 38,
                  borderRadius: 8,
                  cursor: 'pointer',
                  border: `0.5px solid ${a ? '#1473e6' : '#d8d8dc'}`,
                  background: a ? 'rgba(20,115,230,.08)' : '#ffffff',
                  color
                }}
              >
                <Icon size={15} color={color} />
                <span style={{ font: '500 11.5px -apple-system' }}>{name}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Crop & Rotate */}
      <div style={{ padding: '0 18px 14px' }}>
        <div
          style={{
            ...groupLabel,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <span>Crop &amp; Rotate</span>
          {(p.rotation !== 0 || p.flipH) && (
            <span style={{ font: `600 10.5px ${mono}`, color: '#1473e6', textTransform: 'none' }}>
              {p.rotation !== 0 ? `${p.rotation}°` : ''}
              {p.rotation !== 0 && p.flipH ? ' · ' : ''}
              {p.flipH ? 'flip' : ''}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <CropBtn onClick={p.onRotateCCW}>
            <RotateCCW />
          </CropBtn>
          <CropBtn onClick={p.onRotateCW}>
            <RotateCW />
          </CropBtn>
          <CropBtn onClick={p.onToggleFlip} active={p.flipH}>
            <FlipIcon color={p.flipH ? '#1473e6' : '#3a3a3f'} />
          </CropBtn>
          <button
            onClick={p.onCropEdit}
            title="Crop: drag a region on the preview"
            style={{
              flex: 1,
              height: 38,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              border: `0.5px solid ${p.cropEditing || p.cropActive ? '#1473e6' : '#d8d8dc'}`,
              borderRadius: 8,
              background: p.cropEditing
                ? '#1473e6'
                : p.cropActive
                  ? 'rgba(20,115,230,.08)'
                  : '#ffffff',
              cursor: 'pointer'
            }}
          >
            <CropIcon color={p.cropEditing ? '#fff' : p.cropActive ? '#1473e6' : '#3a3a3f'} />
            <span
              style={{
                font: '600 12px -apple-system',
                color: p.cropEditing ? '#fff' : p.cropActive ? '#1473e6' : '#3a3a3f'
              }}
            >
              {p.cropEditing && p.cropActive ? 'Cropping…' : p.cropActive ? 'Cropped' : 'Crop'}
            </span>
          </button>
        </div>
      </div>

      {/* File size cap (quality auto-tunes to hit it) */}
      <div style={{ padding: '0 18px 22px' }}>
        <div style={groupLabel}>File Size</div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
            padding: '9px 11px',
            background: '#ffffff',
            border: '0.5px solid #d8d8dc',
            borderRadius: 8
          }}
        >
          <span style={{ font: '400 12.5px -apple-system', color: '#3a3a3f' }}>Target max size</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {p.maxSizeKb > 0 && (
              <SizeField value={p.maxSizeKb} onCommit={(n) => p.setMaxSizeKb(n)} />
            )}
            <button
              onClick={() => p.setMaxSizeKb(p.maxSizeKb > 0 ? 0 : 500)}
              title="Auto-tune quality to keep each file under this size (JPEG/WebP/HEIC)"
              style={{
                width: 40,
                height: 22,
                flex: 'none',
                border: 'none',
                borderRadius: 11,
                cursor: 'pointer',
                padding: 2,
                display: 'flex',
                alignItems: 'center',
                background: p.maxSizeKb > 0 ? '#34c759' : '#d4d4d9',
                justifyContent: p.maxSizeKb > 0 ? 'flex-end' : 'flex-start'
              }}
            >
              <div
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: '50%',
                  background: '#fff',
                  boxShadow: '0 1px 3px rgba(0,0,0,.3)'
                }}
              />
            </button>
          </div>
        </div>
        {p.maxSizeKb > 0 && (
          <div style={{ font: '400 11px -apple-system', color: '#a0a0a5', marginTop: 6 }}>
            Quality is auto-tuned per image to stay under {p.maxSizeKb} KB (lossy formats).
          </div>
        )}
      </div>

      {/* Colour: on-device colourise + true black & white */}
      <div style={{ padding: '0 18px 16px' }}>
        <div style={groupLabel}>Colour</div>
        <ColourisePanel
          colourise={p.colourise}
          setColourise={p.setColourise}
          available={p.colouriseAvailable}
          onInstall={p.onInstallColourise}
        />
        <div
          onClick={() => p.setGrayscale(!p.grayscale)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
            marginTop: 8,
            padding: '9px 12px',
            background: p.grayscale ? '#f1f1f3' : '#ffffff',
            border: '0.5px solid #dcdce0',
            borderRadius: 10,
            cursor: 'pointer'
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div style={{ font: '600 13px -apple-system', color: '#1d1d1f' }}>Black &amp; White</div>
            <div style={{ font: '400 11px -apple-system', color: '#8a8a8e' }}>True luminance (linear-light)</div>
          </div>
          {/* presentational switch — the row handles the click */}
          <div
            style={{
              width: 40,
              height: 24,
              flex: 'none',
              borderRadius: 12,
              padding: 2,
              display: 'flex',
              alignItems: 'center',
              background: p.grayscale ? '#34c759' : '#d4d4d9',
              justifyContent: p.grayscale ? 'flex-end' : 'flex-start'
            }}
          >
            <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,.3)' }} />
          </div>
        </div>
        {p.grayscale && (
          <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
            {TONES.map((t) => {
              const a = p.tone === t.key
              return (
                <button
                  key={t.key}
                  onClick={() => p.setTone(t.key)}
                  title={t.label}
                  style={{
                    flex: 1,
                    height: 30,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    borderRadius: 7,
                    cursor: 'pointer',
                    font: '500 11.5px -apple-system',
                    border: `0.5px solid ${a ? '#1473e6' : '#d8d8dc'}`,
                    background: a ? 'rgba(20,115,230,.08)' : '#ffffff',
                    color: a ? '#1473e6' : '#5a5a5f'
                  }}
                >
                  <span
                    style={{
                      width: 11,
                      height: 11,
                      borderRadius: '50%',
                      flex: 'none',
                      background: t.swatch,
                      boxShadow: 'inset 0 0 0 0.5px rgba(0,0,0,.15)'
                    }}
                  />
                  {t.label}
                </button>
              )
            })}
          </div>
        )}
      </div>
        </fieldset>
      </div>

      {/* Persistent add affordance in the panel's stable dead space. */}
      {p.hasPhotos && (
        <button
          className="dq-hover"
          onClick={p.onAddPhotos}
          title="Add more photos"
          style={{
            position: 'relative',
            zIndex: 6,
            margin: 'auto 18px 18px',
            padding: '16px 12px',
            border: '1.5px dashed #cfcfd6',
            borderRadius: 10,
            background: '#ffffff',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 8,
            textAlign: 'center'
          }}
        >
          <svg width="38" height="38" viewBox="0 0 52 52" fill="none" aria-hidden>
            <rect x="6" y="10" width="40" height="30" rx="5" stroke="#c8c8cf" strokeWidth="2.5" />
            <circle cx="17" cy="20" r="3.5" fill="#d4d4da" />
            <path d="M9 35l11-11 8 8 6-5 9 9" stroke="#d4d4da" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M26 28v15m0 0l-5-5m5 5l5-5" stroke="#1366d6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span style={{ font: '400 11.5px -apple-system', color: '#8a8a90', lineHeight: 1.45 }}>
            Drag photos here, or click to add.
          </span>
        </button>
      )}
    </div>
  )
}

export default React.memo(Inspector)
