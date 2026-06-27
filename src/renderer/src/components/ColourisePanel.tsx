import React from 'react'
import { ColourDropIcon } from './Icons'

export interface ColourisePanelProps {
  colourise: boolean
  setColourise: (b: boolean) => void
  /** Whether the on-device Core ML model is installed (and platform supports it). */
  available: boolean
  /** Open a picker to install the Core ML colourise model. */
  onInstall: () => void
  /** Greyed out / non-interactive when nothing is selected. */
  disabled?: boolean
}

/** On-device B&W → colour, sibling to the Upscaly engine in the sidebar. */
function ColourisePanel(p: ColourisePanelProps) {
  const active = p.colourise && p.available
  return (
    <div style={{ opacity: p.disabled ? 0.5 : 1, pointerEvents: p.disabled ? 'none' : 'auto' }}>
      <div
        style={{
          border: `0.5px solid ${active ? 'rgba(212,103,255,.45)' : '#dcdce0'}`,
          borderRadius: 10,
          background: active ? 'rgba(212,103,255,.06)' : '#ffffff',
          overflow: 'hidden'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 12px' }}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              flex: 'none',
              background: 'linear-gradient(135deg,#d467ff,#ff7eb3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: p.available ? 1 : 0.5
            }}
          >
            <ColourDropIcon />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ font: '600 13px -apple-system', color: '#1d1d1f' }}>Colourise B&amp;W</div>
            <div style={{ font: '400 11px -apple-system', color: '#8a8a8e' }}>
              {p.available ? 'On-device · Neural Engine' : 'Model not installed'}
            </div>
          </div>
          {p.available ? (
            <button
              onClick={() => p.setColourise(!p.colourise)}
              style={{
                width: 40,
                height: 24,
                flex: 'none',
                border: 'none',
                borderRadius: 12,
                cursor: 'pointer',
                padding: 2,
                display: 'flex',
                alignItems: 'center',
                background: p.colourise ? '#34c759' : '#d4d4d9',
                justifyContent: p.colourise ? 'flex-end' : 'flex-start'
              }}
            >
              <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,.3)' }} />
            </button>
          ) : (
            <button
              onClick={p.onInstall}
              style={{
                flex: 'none',
                height: 26,
                padding: '0 11px',
                border: 'none',
                borderRadius: 7,
                background: '#1366d6',
                color: '#fff',
                font: '600 11.5px -apple-system',
                cursor: 'pointer'
              }}
            >
              Choose model…
            </button>
          )}
        </div>
        {!p.available && (
          <div style={{ padding: '0 12px 12px', font: '400 11px -apple-system', color: '#9a9aa0', lineHeight: 1.45 }}>
            Pick your Core ML model (.mlmodel / .mlpackage) once — it installs locally and runs
            privately on-device, no server.
          </div>
        )}
        {p.available && p.colourise && (
          <div style={{ padding: '0 12px 11px', font: '400 11px -apple-system', color: '#9a9aa0', lineHeight: 1.45 }}>
            Applies to black &amp; white photos only — colour photos are left unchanged.
          </div>
        )}
      </div>
    </div>
  )
}

export default React.memo(ColourisePanel)
