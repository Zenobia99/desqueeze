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
  upscaleDisabled
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
}) {
  return (
    <div
      className="dq-scroll"
      style={{
        width: 236,
        flex: 'none',
        background: '#f4f4f6',
        borderRight: '0.5px solid #dcdce0',
        overflowY: 'auto',
        padding: '12px 10px 18px'
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
    </div>
  )
}

export default React.memo(Sidebar)
