// Shared types used across main, preload, and renderer.

export type OutputFormat = 'Auto' | 'PNG' | 'JPEG' | 'TIFF' | 'HEIC' | 'WebP'
export type ResizeMode = 'Fill' | 'Fit' | 'Stretch'
export type ViewMode = 'list' | 'grid'
export type UpscaleModel = 'Standard' | 'Photo' | 'Art'
/** AI upscale quality/speed trade-off (caps the pixels fed to the model). */
export type UpscaleSpeed = 'Fastest' | 'Balanced' | 'Max'

/** A per-file override that wins over the global batch settings. */
export interface PhotoOverride {
  w: number
  fmt: OutputFormat
}

/** Immutable metadata for one photo in the queue. */
export interface Photo {
  id: number
  name: string
  /** Source pixel dimensions. */
  w: number
  h: number
  /** Source (input) format, shown as the format badge. */
  fmt: OutputFormat
  favourite: boolean
  /** CSS gradient stand-in for the thumbnail (used by the sample batch). */
  gradient: string
  /** Real thumbnail (data URL) for imported/library files — preferred over the gradient. */
  thumbnailUrl?: string
  /** Absolute path on disk for imported files (sample photos have none). */
  path?: string
  /** PhotoKit local identifier for assets that live in the macOS Photos library. */
  photosId?: string
  override?: PhotoOverride
}

/** A photo imported from disk, before the renderer assigns it a queue id. */
export type ImportedPhoto = Omit<Photo, 'id'>

/** Result of loading a macOS Photos library source. */
export interface SourceLoadResult {
  ok: boolean
  /** 'denied' | 'unavailable' | 'error' when ok is false. */
  reason?: string
  photos: ImportedPhoto[]
}

/** Which Library source is active in the sidebar. */
export type LibrarySource = 'recents' | 'favourites' | 'last-import' | 'albums'

/**
 * A crop region in normalized [0,1] coordinates relative to the (un-rotated)
 * source image. Undefined / full-frame means no crop. Applied before resize.
 */
export interface CropRect {
  x: number
  y: number
  w: number
  h: number
}

/** The full configurable output settings for a photo (or the batch default). */
export interface ItemSettings {
  /** Optional source crop, applied before resize/upscale. */
  crop?: CropRect
  format: OutputFormat
  fit: ResizeMode
  /** Target box dimensions. */
  targetW: number
  targetH: number
  aspectLocked: boolean
  quality: number
  /** 0 | 90 | 180 | 270 (clockwise). */
  rotation: number
  flipH: boolean
  upscale: boolean
  /** Colourise (B&W → colour) via the on-device Core ML engine. */
  colourise: boolean
  upModel: UpscaleModel
  /** AI upscale quality/speed trade-off. */
  upSpeed: UpscaleSpeed
  /** AI upscale factor (Upscayl -s): 2 | 3 | 4. */
  maxFactor: number
  /** Cap output to this many KB by auto-tuning quality (0 = off, lossy only). */
  maxSizeKb: number
  presetId: string
  presetName: string
  presetDim: string
}

export interface Preset {
  id: string
  name: string
  dim: string
  /** Target box width applied when the preset is selected. */
  w: number
  /** Target box height applied when the preset is selected. */
  h: number
}

export interface PresetGroup {
  name: string
  items: Preset[]
}

// ---- IPC contract ----

export interface ExportItemRequest {
  id: number
  /** Output filename stem (no extension). */
  name: string
  /** Absolute source path for imported photos; sample photos resolve by id. */
  sourcePath?: string
  /** PhotoKit local identifier for macOS Photos library assets. */
  photosId?: string
  /** Target output width in px. */
  width: number
  /** Target output height in px. */
  height: number
  format: OutputFormat
  quality: number
  fit: ResizeMode
  /** Rotation applied after resize: 0 | 90 | 180 | 270 (clockwise). */
  rotation?: number
  /** Mirror horizontally. */
  flipH?: boolean
  /** Optional source crop (normalized), applied before resize/upscale. */
  crop?: CropRect
  /** Whether the target exceeds the source and needs the Upscaly engine. */
  needsUpscale: boolean
  /** Colourise (B&W → colour) via the on-device Core ML engine. */
  colourise?: boolean
  upModel: UpscaleModel
  /** AI upscale quality/speed trade-off. */
  upSpeed?: UpscaleSpeed
  /** AI upscale factor (Upscayl -s). */
  maxFactor?: number
  /** Cap output to this many KB by auto-tuning quality (0/undefined = off). */
  maxSizeKb?: number
}

export interface ExportRequest {
  items: ExportItemRequest[]
  destination: string
}

/** Per-item progress emitted during an export run. */
export interface ExportProgress {
  /** 1-based index of the item that just finished. */
  index: number
  total: number
  id: number
  name: string
  ok: boolean
}

export interface ExportItemResult {
  id: number
  ok: boolean
  outputPath?: string
  bytes?: number
  width?: number
  height?: number
  upscaled?: boolean
  error?: string
}

export interface ExportResult {
  ok: boolean
  destination: string
  items: ExportItemResult[]
}

export interface PreviewRequest {
  sourcePath?: string
  photosId?: string
  /** Target box. */
  width: number
  height: number
  format: OutputFormat
  quality: number
  fit: ResizeMode
  rotation?: number
  flipH?: boolean
  /** Optional source crop (normalized), applied before resize/upscale. */
  crop?: CropRect
  needsUpscale: boolean
  /** Colourise (B&W → colour) via the on-device Core ML engine. */
  colourise?: boolean
  upModel: UpscaleModel
  /** AI upscale quality/speed trade-off. */
  upSpeed?: UpscaleSpeed
  /** AI upscale factor (Upscayl -s). */
  maxFactor?: number
  /** Cap output to this many KB by auto-tuning quality (0/undefined = off). */
  maxSizeKb?: number
  /** Render at the real export box + format to report exact output bytes. */
  fullEstimate?: boolean
  /**
   * Return the raw source image (capped, no crop/resize/rotation) plus its
   * native dimensions, for the interactive crop editor to draw a region on.
   */
  sourceView?: boolean
  /**
   * Return a native-resolution center crop of the output (instead of the whole
   * image downscaled to fit), so fine detail — e.g. AI upscaling — is visible
   * at 100%. Implies a full-resolution render.
   */
  cropPreview?: boolean
}

export interface PreviewResult {
  ok: boolean
  /** Processed image as a data URL when ok. */
  dataUrl?: string
  /** Actual output pixel dimensions. */
  width?: number
  height?: number
  bytes?: number
  error?: string
}

/** Optional on-device engines the renderer can query to gate their UI. */
export interface Capabilities {
  /** The Core ML colourise model is installed and the platform supports it. */
  colourise: boolean
}
