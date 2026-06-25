import React from 'react'
import type { LibrarySource, PresetGroup, UpscaleModel, UpscaleSpeed } from '@shared/types'
import photosIcon from '../assets/photos-icon.png'
import { PhotoMountainIcon } from './Icons'
import UpscalyPanel from './UpscalyPanel'
import ColourisePanel from './ColourisePanel'
import OutputSize from './OutputSize'

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
  output,
  upscale,
  setUpscale,
  upModel,
  setUpModel,
  upSpeed,
  setUpSpeed,
  maxFactor,
  setMaxFactor,
  upscaleDisabled,
  colourise,
  setColourise,
  colouriseAvailable,
  onInstallColourise,
  outputSummary,
  onEnableAi,
  hasPhotos,
  onAddPhotos
}: {
  activeSource: LibrarySource
  onSelectSource: (s: LibrarySource) => void
  output: {
    preset: { id: string; name: string; dim: string }
    presetGroups: PresetGroup[]
    onSelectPreset: (gi: number, ii: number) => void
    targetW: number
    targetH: number
    setTargetW: (w: number) => void
    setTargetH: (h: number) => void
    aspectLocked: boolean
    onToggleAspectLock: () => void
    onSwapDims: () => void
    sourceLabel?: string
    sourceClass?: string
    onMatchSource?: () => void
  }
  upscale: boolean
  setUpscale: (b: boolean) => void
  upModel: UpscaleModel
  setUpModel: (m: UpscaleModel) => void
  upSpeed: UpscaleSpeed
  setUpSpeed: (s: UpscaleSpeed) => void
  maxFactor: number
  setMaxFactor: (n: number) => void
  upscaleDisabled: boolean
  colourise: boolean
  setColourise: (b: boolean) => void
  colouriseAvailable: boolean
  onInstallColourise: () => void
  outputSummary?: OutputSummary | null
  onEnableAi?: () => void
  /** Whether the queue already has photos (drag card reappears after first add). */
  hasPhotos: boolean
  onAddPhotos: () => void
}) {
  return (
    <div
      className="dq-scroll"
      style={{
        width: 252,
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
          selected={activeSource === 'last-import'}
          onClick={() => onSelectSource('last-import')}
          icon={<PhotoMountainIcon color={activeSource === 'last-import' ? '#fff' : '#0a84ff'} />}
          label="Last Import"
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
        />
      </div>

      <div style={{ ...sectionLabel, padding: '20px 8px 8px' }}>Output Size</div>
      <OutputSize {...output} disabled={upscaleDisabled} />

      <div style={{ ...sectionLabel, padding: '18px 8px 8px' }}>AI Upscale</div>
      <UpscalyPanel
        upscale={upscale}
        setUpscale={setUpscale}
        upModel={upModel}
        setUpModel={setUpModel}
        upSpeed={upSpeed}
        setUpSpeed={setUpSpeed}
        maxFactor={maxFactor}
        setMaxFactor={setMaxFactor}
        upscaling={outputSummary?.kind === 'ai'}
        disabled={upscaleDisabled}
      />

      {/* Bottom group: per-photo summary, the Colourise engine, then the
          drop-to-add card — pinned to the bottom, filling the dead space. */}
      <div style={{ marginTop: 'auto', paddingTop: 18, display: 'flex', flexDirection: 'column' }}>
        {outputSummary && (
          <div style={{ marginBottom: 14 }}>
            <OutputSummaryCard s={outputSummary} onEnableAi={onEnableAi} />
          </div>
        )}
        <div style={{ ...sectionLabel, padding: '0 8px 8px' }}>Colourise</div>
        <ColourisePanel
          colourise={colourise}
          setColourise={setColourise}
          available={colouriseAvailable}
          onInstall={onInstallColourise}
          disabled={upscaleDisabled}
        />
        {hasPhotos && (
          <div style={{ marginTop: 14 }}>
            <DropHintCard onAddPhotos={onAddPhotos} />
          </div>
        )}
      </div>
    </div>
  )
}

export interface OutputSummary {
  srcClass: string
  outClass: string
  factorLabel: string
  kind: 'ai' | 'reduce' | 'same'
  /** Whether AI Upscale is currently on for this photo. */
  aiOn: boolean
}

// Natural-language explainer of the current settings for the selected photo.
function OutputSummaryCard({ s, onEnableAi }: { s: OutputSummary; onEnableAi?: () => void }) {
  const flow = (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, flexWrap: 'wrap' }}>
      <Pill>{s.srcClass}</Pill>
      <span style={{ color: '#9a9aa0', font: '600 13px -apple-system' }}>→</span>
      <Pill accent>{s.outClass}</Pill>
    </div>
  )
  // When the output exceeds the source we always frame it as the AI-upscale
  // path; if AI is off, the card actively offers to turn it on.
  let tint = '#f4f4f6'
  let bd = '#dcdce0'
  let head = 'Exporting at source size'
  let body = `This image will be exported at its original ${s.srcClass} size.`
  if (s.kind === 'ai') {
    tint = '#eef5ff'
    bd = '#bcd6ff'
    head = '✨ AI Upscaling'
    body = s.aiOn
      ? `On-device AI enlarges this ${s.srcClass} image to ${s.outClass} (about ${s.factorLabel}) — sharp detail, nothing sent to the cloud.`
      : `This ${s.srcClass} image can be enlarged to ${s.outClass} (about ${s.factorLabel}) with sharp, on-device AI detail.`
  } else if (s.kind === 'reduce') {
    head = 'Resizing down'
    body = `This ${s.srcClass} image will be reduced to ${s.outClass}. AI upscaling isn't needed.`
  }
  return (
    <div
      style={{
        width: '100%',
        padding: '13px 13px 14px',
        background: tint,
        border: `1px solid ${bd}`,
        borderRadius: 10,
        display: 'flex',
        flexDirection: 'column',
        gap: 9
      }}
    >
      {flow}
      <div style={{ font: '600 12px -apple-system', color: '#2a2a2f' }}>{head}</div>
      <div style={{ font: '400 11.5px -apple-system', color: '#6a6a70', lineHeight: 1.5 }}>{body}</div>
      {s.kind === 'ai' && !s.aiOn && onEnableAi && (
        <button
          onClick={onEnableAi}
          style={{
            height: 30,
            border: 'none',
            borderRadius: 7,
            background: '#1366d6',
            color: '#fff',
            font: '600 12px -apple-system',
            cursor: 'pointer'
          }}
        >
          Enable AI Upscale
        </button>
      )}
    </div>
  )
}

function Pill({ children, accent }: { children: React.ReactNode; accent?: boolean }) {
  return (
    <span
      style={{
        padding: '3px 9px',
        borderRadius: 6,
        font: '700 13px -apple-system',
        background: accent ? '#1366d6' : '#fff',
        color: accent ? '#fff' : '#2a2a2f',
        border: accent ? 'none' : '1px solid #d8d8dc'
      }}
    >
      {children}
    </span>
  )
}

// Persistent add affordance once photos exist: drop here, or click to pick.
function DropHintCard({ onAddPhotos }: { onAddPhotos: () => void }) {
  return (
    <button
      className="dq-hover"
      onClick={onAddPhotos}
      title="Add more photos"
      style={{
        width: '100%',
        padding: '14px 12px',
        border: '1.5px dashed #cfcfd6',
        borderRadius: 10,
        background: 'transparent',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 7,
        textAlign: 'center'
      }}
    >
      <DropGlyph />
      <div style={{ font: '400 11.5px -apple-system', color: '#8a8a90', lineHeight: 1.45 }}>
        Drag photos here, or click to add.
      </div>
    </button>
  )
}

// A photo tile with a downward "drop here" arrow.
function DropGlyph() {
  return (
    <svg width="36" height="36" viewBox="0 0 52 52" fill="none" aria-hidden>
      <rect x="6" y="10" width="40" height="30" rx="5" stroke="#c8c8cf" strokeWidth="2.5" />
      <circle cx="17" cy="20" r="3.5" fill="#d4d4da" />
      <path d="M9 35l11-11 8 8 6-5 9 9" stroke="#d4d4da" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M26 28v15m0 0l-5-5m5 5l5-5" stroke="#1366d6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default React.memo(Sidebar)
