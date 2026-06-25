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
  exportCount,
  exportDisabled,
  destinationLabel,
  destinationHint,
  destinationIsDefault,
  exporting,
  onChooseDestination,
  onExport
}: {
  headline: string
  totalSize: string
  savings: string
  exportCount: number
  exportDisabled: boolean
  destinationLabel: string
  destinationHint: string
  destinationIsDefault: boolean
  exporting: boolean
  onChooseDestination: () => void
  onExport: () => void
}) {
  const disabled = exportDisabled || exporting
  return (
    <div
      style={{
        height: 48,
        flex: 'none',
        display: 'flex',
        alignItems: 'center',
        padding: '0 16px',
        background: 'linear-gradient(#fbfbfc,#f1f1f3)',
        borderTop: '0.5px solid #d8d8db',
        gap: 12
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <span style={{ font: '600 13px -apple-system', color: '#1d1d1f' }}>{headline}</span>
        <span style={{ font: '400 11.5px -apple-system', color: '#8a8a8e' }}>
          Est. output {totalSize} · saves ~{savings}
        </span>
      </div>
      <div style={{ flex: 1 }} />
      <button
        onClick={onChooseDestination}
        title={`Choose export folder — currently ${destinationHint}`}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 7,
          height: 34,
          padding: '0 14px',
          border: '0.5px solid #d2d2d6',
          borderRadius: 8,
          background: '#ffffff',
          cursor: 'pointer',
          font: '600 13px -apple-system',
          color: '#1d1d1f'
        }}
      >
        <FolderIcon />
        <span style={{ font: '400 11px -apple-system', color: '#9a9aa0' }}>Save to</span>
        <span style={{ maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {destinationLabel}
        </span>
        {destinationIsDefault && (
          <span style={{ font: '400 10.5px -apple-system', color: '#b0b0b5' }}>(default)</span>
        )}
        <ChevronDown />
      </button>
      <button
        onClick={onExport}
        disabled={disabled}
        title={exportDisabled ? 'Select photos to export' : undefined}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          height: 34,
          padding: '0 20px',
          border: 'none',
          borderRadius: 8,
          background: disabled
            ? 'linear-gradient(180deg,#b9c6d8,#9fb0c6)'
            : 'linear-gradient(180deg,#4a91f5,#1366d6)',
          boxShadow: disabled ? 'none' : 'inset 0 1px 0 rgba(255,255,255,.4), 0 1px 3px rgba(19,102,214,.45)',
          cursor: exporting ? 'progress' : exportDisabled ? 'not-allowed' : 'pointer',
          font: '600 13.5px -apple-system',
          color: '#fff'
        }}
      >
        <DownloadTray />
        {exporting
          ? 'Exporting…'
          : exportCount === 0
            ? 'Select Photos to Export'
            : `Export ${exportCount} ${exportCount === 1 ? 'Photo' : 'Photos'}`}
      </button>
    </div>
  )
}

export default React.memo(ExportBar)
