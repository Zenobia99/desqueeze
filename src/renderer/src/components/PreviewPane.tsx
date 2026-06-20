import React from 'react'

export default function PreviewPane({
  name,
  dataUrl,
  loading,
  dimsLabel,
  estLabel,
  canUpscale,
  showingUpscaled,
  upscaleLoading,
  onPreviewUpscale
}: {
  name: string
  dataUrl: string | null
  loading: boolean
  dimsLabel: string
  estLabel: string
  /** AI upscaling applies (target > source and Upscaly on). */
  canUpscale: boolean
  /** Currently displaying the AI-upscaled render. */
  showingUpscaled: boolean
  upscaleLoading: boolean
  onPreviewUpscale: () => void
}) {
  return (
    <div
      style={{
        flex: 'none',
        height: 320,
        borderBottom: '0.5px solid #ededf0',
        background: '#f2f2f4',
        backgroundImage:
          'linear-gradient(45deg,#e9e9ec 25%,transparent 25%),linear-gradient(-45deg,#e9e9ec 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#e9e9ec 75%),linear-gradient(-45deg,transparent 75%,#e9e9ec 75%)',
        backgroundSize: '18px 18px',
        backgroundPosition: '0 0,0 9px,9px -9px,-9px 0',
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 18
      }}
    >
      {dataUrl ? (
        <img
          src={dataUrl}
          alt={name}
          style={{
            maxWidth: '100%',
            maxHeight: '100%',
            objectFit: 'contain',
            borderRadius: 4,
            boxShadow: '0 2px 10px rgba(0,0,0,.18), 0 0 0 0.5px rgba(0,0,0,.12)',
            opacity: loading ? 0.55 : 1,
            transition: 'opacity .12s'
          }}
        />
      ) : (
        <span style={{ font: '400 13px -apple-system', color: '#9a9aa0' }}>
          {loading ? 'Rendering preview…' : 'Select a photo to preview the result'}
        </span>
      )}

      {/* Caption */}
      <div
        style={{
          position: 'absolute',
          left: 14,
          bottom: 12,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '5px 10px',
          borderRadius: 7,
          background: 'rgba(28,28,30,.72)',
          backdropFilter: 'blur(8px)'
        }}
      >
        <span style={{ font: '600 12px -apple-system', color: '#fff' }}>{name}</span>
        <span style={{ font: "500 11.5px ui-monospace,Menlo,monospace", color: 'rgba(255,255,255,.85)' }}>
          {dimsLabel}
        </span>
        <span style={{ font: '400 11.5px -apple-system', color: 'rgba(255,255,255,.7)' }}>
          {estLabel}
        </span>
        {showingUpscaled && (
          <span
            style={{
              font: '600 9.5px -apple-system',
              padding: '2px 5px',
              borderRadius: 4,
              background: 'linear-gradient(135deg,#7b5cff,#b44cff)',
              color: '#fff'
            }}
          >
            ✓ Upscaly
          </span>
        )}
      </div>

      {/* On-demand AI preview control (heavy → never auto-runs) */}
      {canUpscale && !showingUpscaled && (
        <button
          onClick={onPreviewUpscale}
          disabled={upscaleLoading}
          style={{
            position: 'absolute',
            right: 14,
            bottom: 12,
            display: 'flex',
            alignItems: 'center',
            gap: 7,
            height: 30,
            padding: '0 13px',
            borderRadius: 8,
            border: 'none',
            cursor: upscaleLoading ? 'progress' : 'pointer',
            background: 'linear-gradient(135deg,#7b5cff,#b44cff)',
            boxShadow: '0 1px 4px rgba(123,92,255,.5)',
            font: '600 12px -apple-system',
            color: '#fff',
            opacity: upscaleLoading ? 0.85 : 1
          }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3l2.2 4.8L19 9l-3.5 3.4.9 5L12 15l-4.4 2.4.9-5L5 9l4.8-1.2z" />
          </svg>
          {upscaleLoading ? 'Upscaling…' : 'Preview Upscaly'}
        </button>
      )}
    </div>
  )
}
