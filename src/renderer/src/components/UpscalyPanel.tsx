import React from 'react'
import type { UpscaleModel, UpscaleSpeed } from '@shared/types'
import { SparkleIcon } from './Icons'

const MODELS: UpscaleModel[] = ['Standard', 'Photo', 'Art']
const SPEEDS: UpscaleSpeed[] = ['Fastest', 'Balanced', 'Max']

export interface UpscalyPanelProps {
  upscale: boolean
  setUpscale: (b: boolean) => void
  upModel: UpscaleModel
  setUpModel: (m: UpscaleModel) => void
  upSpeed: UpscaleSpeed
  setUpSpeed: (s: UpscaleSpeed) => void
  maxFactor: number
  setMaxFactor: (n: number) => void
  /** Whether the chosen output is larger than the source (AI actually runs). */
  upscaling: boolean
  /** Greyed out / non-interactive when nothing is selected. */
  disabled?: boolean
}

function UpscalyPanel(p: UpscalyPanelProps) {
  // AI is the default; the options only matter when the output is an
  // enlargement. When it's not, the engine is dormant — say so instead of
  // showing controls that would do nothing.
  const active = p.upscaling && p.upscale
  return (
    <div
      style={{
        opacity: p.disabled ? 0.5 : 1,
        pointerEvents: p.disabled ? 'none' : 'auto'
      }}
    >
      <div
        style={{
          border: `0.5px solid ${active ? 'rgba(123,92,255,.40)' : '#dcdce0'}`,
          borderRadius: 10,
          background: active ? 'rgba(123,92,255,.06)' : '#ffffff',
          overflow: 'hidden'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 12px' }}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              background: 'linear-gradient(135deg,#7b5cff,#b44cff)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flex: 'none'
            }}
          >
            <SparkleIcon />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ font: '600 13.5px -apple-system', color: '#1d1d1f' }}>Upscaly Engine</div>
            <div style={{ font: '400 11px -apple-system', color: '#8a8a8e' }}>Runs locally · on-device</div>
          </div>
        </div>

        {/* "Use AI for enlargements" opt-out (only meaningful when enlarging). */}
        {p.upscaling ? (
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '0 12px 11px',
              cursor: 'pointer',
              font: '400 12px -apple-system',
              color: '#3a3a3f'
            }}
          >
            <input
              type="checkbox"
              checked={p.upscale}
              onChange={(e) => p.setUpscale(e.target.checked)}
              style={{ accentColor: '#7b5cff', width: 15, height: 15, cursor: 'pointer' }}
            />
            Use AI for this enlargement
          </label>
        ) : (
          <div style={{ padding: '0 12px 12px', font: '400 11.5px -apple-system', color: '#9a9aa0', lineHeight: 1.45 }}>
            Engages automatically when the output is larger than the source.
          </div>
        )}

        {active && (
          <div style={{ padding: '2px 12px 14px' }}>
            <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
              {MODELS.map((m) => {
                const a = p.upModel === m
                return (
                  <button
                    key={m}
                    onClick={() => p.setUpModel(m)}
                    style={{
                      flex: 1,
                      height: 28,
                      borderRadius: 7,
                      cursor: 'pointer',
                      font: '500 11.5px -apple-system',
                      border: `0.5px solid ${a ? '#1473e6' : '#dcdce0'}`,
                      background: a ? '#1473e6' : '#ffffff',
                      color: a ? '#fff' : '#5a5a5f'
                    }}
                  >
                    {m}
                  </button>
                )
              })}
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 8,
                font: '400 11.5px -apple-system',
                color: '#8a8a8e'
              }}
            >
              <span>Max factor</span>
              <div style={{ display: 'flex', gap: 4 }}>
                {[2, 3, 4].map((n) => {
                  const a = p.maxFactor === n
                  return (
                    <button
                      key={n}
                      onClick={() => p.setMaxFactor(n)}
                      style={{
                        minWidth: 34,
                        height: 24,
                        borderRadius: 6,
                        cursor: 'pointer',
                        font: '600 11.5px -apple-system',
                        border: `0.5px solid ${a ? '#7b5cff' : '#dcdce0'}`,
                        background: a ? '#7b5cff' : '#ffffff',
                        color: a ? '#fff' : '#5a5a5f'
                      }}
                    >
                      {n}×
                    </button>
                  )
                })}
              </div>
            </div>
            {/* Speed vs quality: caps how many pixels are fed to the model. */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 8,
                marginTop: 12,
                font: '400 11.5px -apple-system',
                color: '#8a8a8e'
              }}
            >
              <span>Speed</span>
              <div style={{ display: 'flex', gap: 4 }}>
                {SPEEDS.map((sp) => {
                  const a = p.upSpeed === sp
                  return (
                    <button
                      key={sp}
                      onClick={() => p.setUpSpeed(sp)}
                      title={
                        sp === 'Fastest'
                          ? 'Fastest — softer on large enlargements'
                          : sp === 'Balanced'
                            ? 'Balanced — recommended'
                            : 'Max quality — slowest'
                      }
                      style={{
                        minWidth: 34,
                        height: 24,
                        padding: '0 8px',
                        borderRadius: 6,
                        cursor: 'pointer',
                        font: '600 11px -apple-system',
                        border: `0.5px solid ${a ? '#7b5cff' : '#dcdce0'}`,
                        background: a ? '#7b5cff' : '#ffffff',
                        color: a ? '#fff' : '#5a5a5f'
                      }}
                    >
                      {sp}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default React.memo(UpscalyPanel)
