import React from 'react'
import type { OutputFormat, ResizeMode } from '@shared/types'
import {
  CropIcon,
  RotateCCW,
  RotateCW,
  FlipIcon,
  FillIcon,
  FitIcon,
  StretchIcon
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
  format: OutputFormat
  setFormat: (f: OutputFormat) => void
  fit: ResizeMode
  setFit: (f: ResizeMode) => void
  quality: number
  setQuality: (q: number) => void
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
        position: 'relative'
      }}
    >
      {/* Disabled veil + hint when nothing is selected */}
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
      {/* Header */}
      <div style={{ padding: '16px 18px 8px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <span style={{ font: '600 16px -apple-system', color: '#1d1d1f' }}>Format &amp; Adjust</span>
          <span style={{ font: '400 12.5px -apple-system', color: p.disabled ? '#b0b0b5' : '#8a8a8e' }}>
            {p.disabled ? 'Select photos to edit' : `${p.selCount} selected`}
          </span>
        </div>
      </div>

      {/* Format */}
      <div style={{ padding: '0 18px 14px' }}>
        <div style={groupLabel}>Format</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
          {FORMATS.map((f) => {
            const a = p.format === f
            return (
              <button
                key={f}
                onClick={() => p.setFormat(f)}
                style={{
                  flex: 'none',
                  height: 30,
                  padding: '0 12px',
                  borderRadius: 7,
                  cursor: 'pointer',
                  font: '600 12px -apple-system',
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
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 4,
                  height: 54,
                  borderRadius: 9,
                  cursor: 'pointer',
                  border: `0.5px solid ${a ? '#1473e6' : '#d8d8dc'}`,
                  background: a ? 'rgba(20,115,230,.08)' : '#ffffff',
                  color
                }}
              >
                <Icon size={18} color={color} />
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

      {/* Quality */}
      <div style={{ padding: '0 18px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ ...groupLabel, marginBottom: 0 }}>Quality</span>
          <span style={{ font: `600 12px ${mono}`, color: '#1d1d1f' }}>{p.quality}%</span>
        </div>
        <input
          className="dq-range"
          type="range"
          min={10}
          max={100}
          value={p.quality}
          onChange={(e) => p.setQuality(+e.target.value)}
          style={{ width: '100%' }}
        />
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
            marginTop: 11,
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

      {/* Filename */}
      <div style={{ padding: '0 18px 22px' }}>
        <div style={groupLabel}>Filename</div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            height: 34,
            padding: '0 10px',
            background: '#ffffff',
            border: '0.5px solid #d8d8dc',
            borderRadius: 8,
            gap: 6
          }}
        >
          <span style={{ font: `400 12.5px ${mono}`, color: '#1d1d1f' }}>{'{name}'}</span>
          <span style={{ font: `400 12.5px ${mono}`, color: '#0a84ff' }}>@{'{w}'}w</span>
          <span style={{ marginLeft: 'auto', font: '400 11.5px -apple-system', color: '#b0b0b5' }}>
            .{'{ext}'}
          </span>
        </div>
        <div style={{ font: '400 11px -apple-system', color: '#a0a0a5', marginTop: 6 }}>
          e.g. IMG_4821@1600w.jpg
        </div>
      </div>
      </fieldset>
    </div>
  )
}

export default React.memo(Inspector)
