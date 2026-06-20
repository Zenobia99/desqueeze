import React from 'react'
import type { ViewMode } from '@shared/types'
import {
  PlusIcon,
  ChevronDown,
  ListIcon,
  GridIcon,
  SearchIcon,
  SlidersIcon
} from './Icons'

const btnChrome: React.CSSProperties = {
  border: '0.5px solid #d2d2d6',
  borderRadius: 7,
  background: 'linear-gradient(#ffffff,#f4f4f6)',
  boxShadow: '0 1px 1.5px rgba(0,0,0,.05)',
  cursor: 'pointer'
}

function SegBtn({
  active,
  onClick,
  children
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      className="dq-no-drag"
      onClick={onClick}
      style={{
        width: 30,
        height: 26,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: 'none',
        borderRadius: 6,
        cursor: 'pointer',
        color: active ? '#1d1d1f' : '#9a9aa0',
        background: active ? '#ffffff' : 'transparent',
        boxShadow: active ? '0 1px 2px rgba(0,0,0,.12)' : 'none'
      }}
    >
      {children}
    </button>
  )
}

export default function Toolbar({
  viewMode,
  setViewMode,
  search,
  setSearch,
  onAddPhotos
}: {
  viewMode: ViewMode
  setViewMode: (v: ViewMode) => void
  search: string
  setSearch: (s: string) => void
  onAddPhotos: () => void
}) {
  return (
    <div
      style={{
        height: 52,
        flex: 'none',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        // left padding clears the OS traffic lights (hiddenInset title bar)
        padding: '0 14px 0 88px',
        background: 'linear-gradient(#fbfbfc,#f1f1f3)',
        borderBottom: '0.5px solid #d8d8db'
      }}
    >
      <button
        className="dq-no-drag"
        onClick={onAddPhotos}
        style={{
          ...btnChrome,
          display: 'flex',
          alignItems: 'center',
          gap: 7,
          height: 30,
          padding: '0 13px',
          font: '500 13px -apple-system',
          color: '#1d1d1f'
        }}
      >
        <PlusIcon />
        Add Photos
      </button>

      <button
        className="dq-no-drag"
        style={{
          ...btnChrome,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          height: 30,
          padding: '0 11px 0 13px',
          font: '500 13px -apple-system',
          color: '#1d1d1f'
        }}
      >
        Recents
        <ChevronDown />
      </button>

      {/* Only this empty gap drags the window — every control stays clickable. */}
      <div className="dq-drag" style={{ flex: 1, alignSelf: 'stretch' }} />

      <div
        className="dq-no-drag"
        style={{
          display: 'flex',
          alignItems: 'center',
          background: '#e7e7ea',
          borderRadius: 7,
          padding: 2,
          gap: 2
        }}
      >
        <SegBtn active={viewMode === 'list'} onClick={() => setViewMode('list')}>
          <ListIcon />
        </SegBtn>
        <SegBtn active={viewMode === 'grid'} onClick={() => setViewMode('grid')}>
          <GridIcon />
        </SegBtn>
      </div>

      <div
        className="dq-no-drag"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          width: 184,
          height: 30,
          padding: '0 10px',
          background: '#ffffff',
          border: '0.5px solid #d6d6da',
          borderRadius: 7
        }}
      >
        <SearchIcon />
        <input
          className="dq-in"
          placeholder="Search photos"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            border: 'none',
            background: 'transparent',
            font: '400 13px -apple-system',
            color: '#1d1d1f',
            width: '100%'
          }}
        />
      </div>

      <button
        className="dq-no-drag"
        style={{
          ...btnChrome,
          width: 30,
          height: 30,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <SlidersIcon />
      </button>
    </div>
  )
}
