import React from 'react'
import type { PresetGroup } from '@shared/types'
import { ChevronDown, PresetStackIcon, LockIcon, SwapIcon, SearchIcon, CheckIcon } from './Icons'

const mono = 'ui-monospace,Menlo,monospace'

export interface OutputSizeProps {
  preset: { id: string; name: string; dim: string }
  presetGroups: PresetGroup[]
  onSelectPreset: (gi: number, ii: number) => void
  targetW: number
  targetH: number
  setTargetW: (w: number) => void
  setTargetH: (h: number) => void
  aspectLocked: boolean
  onToggleAspectLock: () => void
  onSwapDims: () => void
  /** Selected photo's native dimensions label, e.g. "3,840 × 2,160". */
  sourceLabel?: string
  /** Selected photo's resolution class, e.g. "4K". */
  sourceClass?: string
  /** Set the output to each selected photo's own source size. */
  onMatchSource?: () => void
  disabled?: boolean
}

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
    <div style={{ flex: 1, minWidth: 0 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          height: 32,
          padding: '0 9px',
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
            minWidth: 0,
            border: 'none',
            background: 'transparent',
            fontFamily: mono,
            fontSize: 13.5,
            fontWeight: 600,
            color: '#1d1d1f'
          }}
        />
        <span style={{ marginLeft: 6, font: '400 11px -apple-system', color: '#b0b0b5' }}>{label}</span>
      </div>
    </div>
  )
}

function OutputSize(p: OutputSizeProps) {
  const [presetOpen, setPresetOpen] = React.useState(false)
  const [presetFilter, setPresetFilter] = React.useState('')
  return (
    <div
      style={{
        opacity: p.disabled ? 0.5 : 1,
        pointerEvents: p.disabled ? 'none' : 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 9
      }}
    >
      {/* Preset chip → opens the preset (template) picker inline. */}
      <div>
        <button
          onClick={() => setPresetOpen((o) => !o)}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: 9,
            height: 42,
            padding: '0 11px',
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
            <span
              style={{
                font: '600 13px -apple-system',
                color: '#1d1d1f',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: 150
              }}
            >
              {p.preset.name}
            </span>
            <span style={{ font: '400 11px -apple-system', color: '#8a8a8e' }}>{p.preset.dim}</span>
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
            <div className="dq-scroll" style={{ maxHeight: 240, overflowY: 'auto', padding: '0 8px 8px' }}>
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
                                font: `400 11px ${mono}`,
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

      {/* Source readout + one-click match */}
      {p.sourceLabel && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
          <span style={{ font: '400 11px -apple-system', color: '#9a9aa0', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            Source: {p.sourceLabel}
            {p.sourceClass ? ` · ${p.sourceClass}` : ''}
          </span>
          {p.onMatchSource && (
            <button
              onClick={p.onMatchSource}
              title="Set the output to this photo's original dimensions"
              style={{
                flex: 'none',
                height: 22,
                padding: '0 9px',
                border: '0.5px solid #d8d8dc',
                borderRadius: 6,
                background: '#ffffff',
                color: '#1366d6',
                font: '600 11px -apple-system',
                cursor: 'pointer'
              }}
            >
              Match
            </button>
          )}
        </div>
      )}

      {/* W / lock / H / swap */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <DimField label="W" value={p.targetW} onCommit={p.setTargetW} />
        <button
          onClick={p.onToggleAspectLock}
          title="Lock aspect ratio"
          style={{
            width: 32,
            height: 32,
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
            width: 32,
            height: 32,
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
  )
}

export default React.memo(OutputSize)
