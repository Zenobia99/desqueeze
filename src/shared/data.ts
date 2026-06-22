import type { ItemSettings, Preset, PresetGroup, UpscaleSpeed } from './types'

// Longest side fed to the AI upscaler per speed setting. Model time scales
// ~quadratically with this, so it's the main quality/speed lever.
export const SPEED_CAP: Record<UpscaleSpeed, number> = {
  Fastest: 768,
  Balanced: 1024,
  Max: 1536
}

const slug = (s: string): string =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

const T = (name: string, w: number, h: number): Preset => ({
  id: slug(name),
  name,
  w,
  h,
  dim: `${w} × ${h}`
})

// Output presets, ported from the DesqueezeMac template library.
export const PRESET_GROUPS: PresetGroup[] = [
  {
    name: 'Social',
    items: [
      T('Square Post', 1080, 1080),
      T('Landscape Post', 1080, 566),
      T('Story / Reel', 1080, 1920),
      T('Twitter Post', 1200, 675),
      T('Twitter Header', 1500, 500),
      T('Facebook Cover', 1640, 624),
      T('LinkedIn Post', 1200, 627),
      T('LinkedIn Banner', 1584, 396),
      T('Pinterest Pin', 1000, 1500)
    ]
  },
  {
    name: 'Video',
    items: [
      T('YouTube Thumbnail', 1280, 720),
      T('YouTube Banner', 2560, 1440),
      T('Full HD', 1920, 1080),
      T('4K UHD', 3840, 2160),
      T('5K', 5120, 2880),
      T('6K', 6144, 3456),
      T('8K UHD', 7680, 4320),
      T('8K DCI', 8192, 4320)
    ]
  },
  {
    name: 'Print',
    items: [
      T('4×6 Portrait', 1200, 1800),
      T('6×4 Landscape', 1800, 1200),
      T('5×7 Portrait', 1500, 2100),
      T('7×5 Landscape', 2100, 1500),
      T('8×10 Portrait', 2400, 3000),
      T('10×8 Landscape', 3000, 2400),
      T('11×14 Portrait', 3300, 4200),
      T('14×11 Landscape', 4200, 3300),
      T('16×20 Portrait', 4800, 6000),
      T('20×16 Landscape', 6000, 4800),
      T('20×24 Portrait', 6000, 7200),
      T('24×20 Landscape', 7200, 6000),
      T('20×30 Portrait', 6000, 9000),
      T('30×20 Landscape', 9000, 6000),
      T('A5 Portrait', 1748, 2480),
      T('A5 Landscape', 2480, 1748),
      T('A4 Portrait', 2480, 3508),
      T('A4 Landscape', 3508, 2480),
      T('A3 Portrait', 3508, 4961),
      T('A3 Landscape', 4961, 3508),
      T('A2 Portrait', 4961, 7016),
      T('A2 Landscape', 7016, 4961),
      T('Letter Portrait', 2550, 3300),
      T('Letter Landscape', 3300, 2550),
      T('Legal Portrait', 2550, 4200),
      T('Legal Landscape', 4200, 2550),
      T('8K Photo 3:2 Portrait', 5464, 8192),
      T('8K Photo 3:2 Landscape', 8192, 5464)
    ]
  },
  {
    name: 'Commerce',
    items: [T('Etsy Listing', 2000, 2000), T('Amazon Product', 1000, 1000), T('eBay Photo', 1600, 1600)]
  },
  {
    name: 'Web',
    items: [
      T('OG Image', 1200, 630),
      T('Hero Banner', 1920, 1080),
      T('Web Large', 2400, 1600),
      T('Web Retina', 1440, 960)
    ]
  },
  {
    name: 'Frame TV',
    items: [T('Frame TV 4K Art', 3840, 2160)]
  },
  {
    name: 'Desqueeze',
    items: [
      T('Anamorphic 1.33x', 2560, 1440),
      T('Anamorphic 1.5x', 2880, 1440),
      T('Anamorphic 2x', 3840, 1440),
      T('Cinemascope', 2560, 1072)
    ]
  }
]

export const PRESET_TOTAL = PRESET_GROUPS.reduce((n, g) => n + g.items.length, 0)

const DEFAULT_PRESET = PRESET_GROUPS[1].items[2] // Full HD 1920×1080

export const DEFAULT_SETTINGS: ItemSettings = {
  format: 'JPEG',
  fit: 'Fit',
  targetW: DEFAULT_PRESET.w,
  targetH: DEFAULT_PRESET.h,
  aspectLocked: false,
  quality: 85,
  rotation: 0,
  flipH: false,
  upscale: false,
  upModel: 'Standard',
  upSpeed: 'Balanced',
  maxFactor: 4,
  maxSizeKb: 0,
  presetId: DEFAULT_PRESET.id,
  presetName: DEFAULT_PRESET.name,
  presetDim: DEFAULT_PRESET.dim
}
