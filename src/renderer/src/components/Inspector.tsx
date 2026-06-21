import React from 'react'
import type { OutputFormat, PresetGroup, ResizeMode } from '@shared/types'
import {
  ChevronDown,
  PresetStackIcon,
  LockIcon,
  SwapIcon,
  RotateCCW,
  RotateCW,
  FlipIcon,
  FillIcon,
  FitIcon,
  StretchIcon,
  SearchIcon,
  CheckIcon
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

function DimField({
  label,
  value,
  onCommit
}: {
  label: string
  value: number
  onCommit: (n: number) => void
}) {
  const [text, setText] = React.useState(String(value))
  React.useEffect(() => setText(String(value)), [value])
  const commit = () => {
    const n = parseInt(text.replace(/[^0-9]/g, ''), 10)
    if (Number.isFinite(n) && n > 0 && n !== value) onCommit(n)
    else setText(String(value))
  }
  return (
    <div style={{ flex: 1 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          height: 34,
          padding: '0 10px',
          background: '#ffffff',
          border: '0.5px solid #d8d8dc',
          borderRadius: 8
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
            width: '100%',
            border: 'none',
            background: 'transparent',
            font: 'inherit',
            fontFamily: mono,
            fontSize: 14,
            fontWeight: 600,
            color: '#1d1d1f'
          }}
        />
        <span style={{ marginLeft: 'auto', font: '400 11px -apple-system', color: '#b0b0b5' }}>
          {label}
        </span>
      </div>
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
  preset: { id: string; name: string; dim: string }
  presetGroups: PresetGroup[]
  onSelectPreset: (groupIndex: number, itemIndex: number) => void
  format: OutputFormat
  setFormat: (f: OutputFormat) => void
  targetW: number
  targetH: number
  setTargetW: (w: number) => void
  setTargetH: (h: number) => void
  aspectLocked: boolean
  onToggleAspectLock: () => void
  onSwapDims: () => void
  fit: ResizeMode
  setFit: (f: ResizeMode) => void
  quality: number
  setQuality: (q: number) => void
  rotation: number
  flipH: boolean
  onRotateCW: () => void
  onRotateCCW: () => void
  onToggleFlip: () => void
}

function Inspector(p: InspectorProps) {
  const [presetOpen, setPresetOpen] = React.useState(false)
  const [presetFilter, setPresetFilter] = React.useState('')
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
          <span style={{ font: '600 16px -apple-system', color: '#1d1d1f' }}>Output</span>
          <span style={{ font: '400 12.5px -apple-system', color: p.disabled ? '#b0b0b5' : '#8a8a8e' }}>
            {p.disabled ? 'Select photos to edit' : `${p.selCount} selected`}
          </span>
        </div>
      </div>

      {/* Preset chip → opens the preset (template) picker, in-panel. */}
      <div style={{ padding: '4px 18px 14px' }}>
        <button
          onClick={() => setPresetOpen((o) => !o)}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            height: 42,
            padding: '0 12px',
            border: `0.5px solid ${presetOpen ? '#1473e6' : '#d8d8dc'}`,
            borderRadius: 9,
            background: '#ffffff',
            boxShadow: '0 1px 2px rgba(0,0,0,.04)',
            cursor: 'pointer'
          }}
        >
          <div
            style={{
              width: 26,
              height: 26,
              borderRadius: 7,
              background: 'linear-gradient(180deg,#3b86f2,#1366d6)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flex: 'none'
            }}
          >
            <PresetStackIcon />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', minWidth: 0 }}>
            <span style={{ font: '600 13.5px -apple-system', color: '#1d1d1f' }}>{p.preset.name}</span>
            <span style={{ font: '400 11.5px -apple-system', color: '#8a8a8e' }}>{p.preset.dim}</span>
          </div>
          <ChevronDown style={{ marginLeft: 'auto', transform: presetOpen ? 'rotate(180deg)' : 'none' }} />
        </button>

        {presetOpen && (
          <div
            style={{
              marginTop: 8,
              border: '0.5px solid #d8d8dc',
              borderRadius: 9,
              background: '#ffffff',
              boxShadow: '0 4px 14px rgba(0,0,0,.10)',
              overflow: 'hidden'
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                height: 30,
                margin: 8,
                padding: '0 9px',
                background: '#eef0f2',
                borderRadius: 6
              }}
            >
              <SearchIcon size={12} />
              <input
                className="dq-in"
                placeholder="Filter presets"
                value={presetFilter}
                autoFocus
                onChange={(e) => setPresetFilter(e.target.value)}
                style={{
                  border: 'none',
                  background: 'transparent',
                  font: '400 12.5px -apple-system',
                  color: '#1d1d1f',
                  width: '100%'
                }}
              />
            </div>
            <div className="dq-scroll" style={{ maxHeight: 260, overflowY: 'auto', padding: '0 8px 8px' }}>
              {p.presetGroups.map((grp, gi) => {
                const items = grp.items
                  .map((it, ii) => ({ it, ii }))
                  .filter(({ it }) => it.name.toLowerCase().includes(presetFilter.toLowerCase()))
                if (items.length === 0) return null
                return (
                  <div key={grp.name}>
                    <div
                      style={{
                        font: '600 10.5px -apple-system',
                        letterSpacing: '.03em',
                        textTransform: 'uppercase',
                        color: '#b0b0b5',
                        padding: '8px 6px 3px'
                      }}
                    >
                      {grp.name}
                    </div>
                    {items.map(({ it, ii }) => {
                      const active = p.preset.id === it.id
                      return (
                        <div
                          key={it.id}
                          className={active ? '' : 'dq-hover'}
                          onClick={() => {
                            p.onSelectPreset(gi, ii)
                            setPresetOpen(false)
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            padding: '6px 8px',
                            borderRadius: 6,
                            cursor: 'pointer',
                            background: active ? '#1473e6' : 'transparent'
                          }}
                        >
                          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                            <span
                              style={{
                                font: '500 13px -apple-system',
                                color: active ? '#fff' : '#1d1d1f',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                              }}
                            >
                              {it.name}
                            </span>
                            <span
                              style={{
                                font: '400 11px ui-monospace,Menlo,monospace',
                                color: active ? 'rgba(255,255,255,.8)' : '#a8a8ad'
                              }}
                            >
                              {it.dim}
                            </span>
                          </div>
                          {active && <CheckIcon style={{ marginLeft: 'auto' }} />}
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          </div>
        )}
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

      {/* Dimensions */}
      <div style={{ padding: '0 18px 14px' }}>
        <div style={groupLabel}>Dimensions</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <DimField label="W" value={p.targetW} onCommit={p.setTargetW} />
          <button
            onClick={p.onToggleAspectLock}
            title="Lock aspect ratio"
            style={{
              width: 34,
              height: 34,
              flex: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 8,
              cursor: 'pointer',
              border: `0.5px solid ${p.aspectLocked ? '#1473e6' : '#d8d8dc'}`,
              background: p.aspectLocked ? 'rgba(20,115,230,.08)' : '#ffffff',
              color: p.aspectLocked ? '#1473e6' : '#a8a8ad'
            }}
          >
            <LockIcon />
          </button>
          <DimField label="H" value={p.targetH} onCommit={p.setTargetH} />
          <button
            onClick={p.onSwapDims}
            title="Swap width and height"
            style={{
              width: 34,
              height: 34,
              flex: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '0.5px solid #d8d8dc',
              borderRadius: 8,
              background: '#ffffff',
              cursor: 'pointer'
            }}
          >
            <SwapIcon />
          </button>
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
            style={{
              flex: 1,
              height: 38,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 5,
              border: '0.5px solid #d8d8dc',
              borderRadius: 8,
              background: '#ffffff',
              cursor: 'pointer'
            }}
          >
            <span style={{ font: '500 12px -apple-system', color: '#3a3a3f' }}>16:9</span>
            <ChevronDown />
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
            marginTop: 11,
            padding: '9px 11px',
            background: '#ffffff',
            border: '0.5px solid #d8d8dc',
            borderRadius: 8
          }}
        >
          <span style={{ font: '400 12.5px -apple-system', color: '#3a3a3f' }}>Target max size</span>
          <span style={{ font: `600 12.5px ${mono}`, color: '#1d1d1f' }}>500 KB</span>
        </div>
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
