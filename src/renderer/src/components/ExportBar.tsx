import React from 'react'
import { DownloadTray } from './Icons'

function ExportBar({
  headline,
  totalSize,
  exportDisabled,
  exporting,
  onExport
}: {
  headline: string
  totalSize: string
  exportDisabled: boolean
  exporting: boolean
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
        <span style={{ font: '400 11px -apple-system', color: '#8a8a8e' }}>Est. output {totalSize}</span>
      </div>
      {/* One action: pick the destination folder, then export to it. */}
      <button
        onClick={onExport}
        disabled={disabled}
        title={exportDisabled ? 'Select photos to export' : 'Choose a folder and export'}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 7,
          height: 30,
          padding: '0 16px',
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
        {exporting ? 'Exporting…' : 'Export…'}
      </button>
    </div>
  )
}

export default React.memo(ExportBar)
