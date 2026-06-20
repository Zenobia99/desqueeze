import React, { useState } from 'react'
import type { LibrarySource, PresetGroup } from '@shared/types'
import { PRESET_TOTAL } from '@shared/data'
import photosIcon from '../assets/photos-icon.png'
import {
  ClockIcon,
  PhotoMountainIcon,
  AlbumsIcon,
  SearchIcon,
  CheckIcon
} from './Icons'

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

export default function Sidebar({
  presetGroups,
  activePresetId,
  onSelectPreset,
  activeSource,
  onSelectSource
}: {
  presetGroups: PresetGroup[]
  activePresetId: string
  onSelectPreset: (groupIndex: number, itemIndex: number) => void
  activeSource: LibrarySource
  onSelectSource: (s: LibrarySource) => void
}) {
  const [filter, setFilter] = useState('')

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
        <LibRow
          selected={activeSource === 'albums'}
          onClick={() => onSelectSource('albums')}
          icon={<AlbumsIcon color={activeSource === 'albums' ? '#fff' : '#8a8a8e'} />}
          label="Albums"
        />
      </div>

      <div
        style={{
          ...sectionLabel,
          padding: '18px 8px 5px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}
      >
        <span>Presets</span>
        <span
          style={{
            font: '500 11px -apple-system',
            color: '#b6b6bb',
            textTransform: 'none',
            letterSpacing: 0
          }}
        >
          {PRESET_TOTAL}
        </span>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          height: 28,
          margin: '0 4px 8px',
          padding: '0 9px',
          background: '#e9e9ec',
          borderRadius: 6
        }}
      >
        <SearchIcon size={12} />
        <input
          className="dq-in"
          placeholder="Filter presets"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={{
            border: 'none',
            background: 'transparent',
            font: '400 12.5px -apple-system',
            color: '#1d1d1f',
            width: '100%'
          }}
        />
      </div>

      {presetGroups.map((grp, gi) => {
        const items = grp.items
          .map((it, ii) => ({ it, ii }))
          .filter(({ it }) => it.name.toLowerCase().includes(filter.toLowerCase()))
        if (items.length === 0) return null
        return (
          <div key={grp.name}>
            <div
              style={{
                font: '600 10.5px -apple-system',
                letterSpacing: '.03em',
                textTransform: 'uppercase',
                color: '#b0b0b5',
                padding: '8px 8px 3px'
              }}
            >
              {grp.name}
            </div>
            {items.map(({ it, ii }) => {
              const active = activePresetId === it.id
              return (
                <div
                  key={it.id}
                  className={active ? '' : 'dq-hover'}
                  onClick={() => onSelectPreset(gi, ii)}
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
                        font: "400 11px ui-monospace,Menlo,monospace",
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
  )
}
