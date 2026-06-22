import React from 'react'
import type { LibrarySource, UpscaleModel, UpscaleSpeed } from '@shared/types'
import photosIcon from '../assets/photos-icon.png'
import { ClockIcon, PhotoMountainIcon } from './Icons'
import UpscalyPanel from './UpscalyPanel'

const sectionLabel: React.CSSProperties = {
  font: '600 11px -apple-system',
  letterSpacing: '.04em',
  textTransform: 'uppercase',
  color: '#9a9aa0'
}

function LibRow({
  selected,
  icon,
  label,
  count,
  countColor = '#a8a8ad',
  onClick
}: {
  selected?: boolean
  icon: React.ReactNode
  label: string
  count?: string
  countColor?: string
  onClick?: () => void
}) {
  return (
    <div
      className={selected ? '' : 'dq-hover'}
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 9,
        height: 30,
        padding: '0 8px',
        borderRadius: 6,
        cursor: 'pointer',
        background: selected ? '#1473e6' : 'transparent',
        color: selected ? '#fff' : '#1d1d1f',
        font: `${selected ? 500 : 400} 13.5px -apple-system`
      }}
    >
      {icon}
      {label}
      {count !== undefined && (
        <span
          style={{
            marginLeft: 'auto',
            font: '500 12px -apple-system',
            color: selected ? 'rgba(255,255,255,.8)' : countColor
          }}
        >
          {count}
        </span>
      )}
    </div>
  )
}

function Sidebar({
  activeSource,
  onSelectSource,
  upscale,
  setUpscale,
  upModel,
  setUpModel,
  upSpeed,
  setUpSpeed,
  maxFactor,
  setMaxFactor,
  upscaleDisabled,
  onAddPhotos
}: {
  activeSource: LibrarySource
  onSelectSource: (s: LibrarySource) => void
  upscale: boolean
  setUpscale: (b: boolean) => void
  upModel: UpscaleModel
  setUpModel: (m: UpscaleModel) => void
  upSpeed: UpscaleSpeed
  setUpSpeed: (s: UpscaleSpeed) => void
  maxFactor: number
  setMaxFactor: (n: number) => void
  upscaleDisabled: boolean
  onAddPhotos?: () => void
}) {
  return (
    <div
      className="dq-scroll"
      style={{
        width: 236,
        flex: 'none',
        display: 'flex',
        flexDirection: 'column',
        background: '#f4f4f6',
        borderRight: '0.5px solid #dcdce0',
        overflowY: 'auto',
        padding: '12px 10px 14px'
      }}
    >
      <div style={{ ...sectionLabel, padding: '6px 8px 5px' }}>Library</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        <LibRow
          selected={activeSource === 'recents'}
          onClick={() => onSelectSource('recents')}
          icon={<ClockIcon color={activeSource === 'recents' ? '#fff' : '#8a8a8e'} />}
          label="Recents"
          count="248"
        />
        <LibRow
          selected={activeSource === 'favourites'}
          onClick={() => onSelectSource('favourites')}
          icon={
            <img
              src={photosIcon}
              width={17}
              height={17}
              alt="Photos"
              style={{ display: 'block', flex: 'none', borderRadius: 4 }}
            />
          }
          label="Favourites"
          count="37"
        />
        <LibRow
          selected={activeSource === 'last-import'}
          onClick={() => onSelectSource('last-import')}
          icon={<PhotoMountainIcon color={activeSource === 'last-import' ? '#fff' : '#0a84ff'} />}
          label="Last Import"
          count="12"
        />
      </div>

      <div style={{ ...sectionLabel, padding: '20px 8px 8px' }}>AI Upscale</div>
      <UpscalyPanel
        upscale={upscale}
        setUpscale={setUpscale}
        upModel={upModel}
        setUpModel={setUpModel}
        upSpeed={upSpeed}
        setUpSpeed={setUpSpeed}
        maxFactor={maxFactor}
        setMaxFactor={setMaxFactor}
        disabled={upscaleDisabled}
      />

      {/* Pinned to the bottom of the sidebar's empty space: how to add photos. */}
      <div
        style={{
          marginTop: 'auto',
          paddingTop: 18,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 9,
          textAlign: 'center'
        }}
      >
        <div
          style={{
            width: '100%',
            padding: '16px 12px',
            border: '1.5px dashed #cfcfd6',
            borderRadius: 10,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 8
          }}
        >
          <DropGlyph />
          <div style={{ font: '400 11.5px -apple-system', color: '#8a8a90', lineHeight: 1.45 }}>
            Drag &amp; drop photos or a folder anywhere in the window.
          </div>
          {onAddPhotos && (
            <button
              onClick={onAddPhotos}
              style={{
                marginTop: 2,
                height: 28,
                padding: '0 14px',
                border: 'none',
                borderRadius: 7,
                background: '#1366d6',
                color: '#fff',
                font: '600 12px -apple-system',
                cursor: 'pointer'
              }}
            >
              Add Photos…
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// Empty-state glyph: a photo tile with a downward "drop here" arrow.
function DropGlyph() {
  return (
    <svg width="40" height="40" viewBox="0 0 52 52" fill="none" aria-hidden>
      <rect x="6" y="10" width="40" height="30" rx="5" stroke="#c8c8cf" strokeWidth="2.5" />
      <circle cx="17" cy="20" r="3.5" fill="#d4d4da" />
      <path d="M9 35l11-11 8 8 6-5 9 9" stroke="#d4d4da" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M26 28v15m0 0l-5-5m5 5l5-5" stroke="#1366d6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default React.memo(Sidebar)
