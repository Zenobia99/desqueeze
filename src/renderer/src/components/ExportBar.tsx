import React from 'react'
import { ChevronDown, DownloadTray } from './Icons'

export default function ExportBar({
  headline,
  totalSize,
  savings,
  exportCount,
  exportDisabled,
  destinationLabel,
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
  exporting: boolean
  onChooseDestination: () => void
  onExport: () => void
}) {
  const disabled = exportDisabled || exporting
  return (
    <div
      style={{
        height: 58,
        flex: 'none',
        display: 'flex',
        alignItems: 'center',
        padding: '0 18px',
        background: 'linear-gradient(#fbfbfc,#f1f1f3)',
        borderTop: '0.5px solid #d8d8db',
        gap: 14
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
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          height: 34,
          padding: '0 20px',
          border: '0.5px solid #d2d2d6',
          borderRadius: 8,
          background: '#ffffff',
          cursor: 'pointer',
          font: '600 13.5px -apple-system',
          color: '#1d1d1f'
        }}
      >
        {destinationLabel}
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
