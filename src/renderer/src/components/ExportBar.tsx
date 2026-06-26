import React from 'react'
import { ChevronDown, DownloadTray } from './Icons'

function FolderIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6a6a70" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6.5A1.5 1.5 0 0 1 4.5 5h4l2 2.2h7A1.5 1.5 0 0 1 19 8.7V17a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 3 17z" />
    </svg>
  )
}

function ExportBar({
  headline,
  totalSize,
  savings,
  exportDisabled,
  destinationLabel,
  destinationHint,
  exporting,
  onChooseDestination,
  onExport
}: {
  headline: string
  totalSize: string
  savings: string
  exportDisabled: boolean
  destinationLabel: string
  destinationHint: string
  exporting: boolean
  onChooseDestination: () => void
  onExport: () => void
}) {
  const disabled = exportDisabled || exporting
  return (
    <div
      style={{
        height: 44,
        flex: 'none',
        display: 'flex',
        alignItems: 'center',
        padding: '0 14px',
        background: 'linear-gradient(#fbfbfc,#f1f1f3)',
        borderTop: '0.5px solid #d8d8db',
        gap: 12
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <span style={{ font: '600 12.5px -apple-system', color: '#1d1d1f' }}>{headline}</span>
        <span style={{ font: '400 11px -apple-system', color: '#8a8a8e' }}>
          Est. {totalSize} · saves ~{savings}
        </span>
      </div>
      <div style={{ flex: 1 }} />
      {/* Destination: click to pick a folder; the choice is remembered. */}
      <button
        onClick={onChooseDestination}
        title={`Export folder: ${destinationHint} — click to change`}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          height: 30,
          padding: '0 11px',
          border: '0.5px solid #d2d2d6',
          borderRadius: 8,
          background: '#ffffff',
          cursor: 'pointer',
          font: '500 12.5px -apple-system',
          color: '#1d1d1f'
        }}
      >
        <FolderIcon />
        <span style={{ maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {destinationLabel}
        </span>
        <ChevronDown />
      </button>
      <button
        onClick={onExport}
        disabled={disabled}
        title={exportDisabled ? 'Select photos to export' : undefined}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          height: 30,
          padding: '0 13px',
          border: 'none',
          borderRadius: 8,
          background: disabled
            ? 'linear-gradient(180deg,#b9c6d8,#9fb0c6)'
            : 'linear-gradient(180deg,#4a91f5,#1366d6)',
          boxShadow: disabled ? 'none' : 'inset 0 1px 0 rgba(255,255,255,.4), 0 1px 3px rgba(19,102,214,.45)',
          cursor: exporting ? 'progress' : exportDisabled ? 'not-allowed' : 'pointer',
          font: '600 13px -apple-system',
          color: '#fff'
        }}
      >
        <DownloadTray />
        {exporting ? 'Exporting…' : 'Export'}
      </button>
    </div>
  )
}

export default React.memo(ExportBar)
