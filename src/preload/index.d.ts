import type { DesqueezeApi } from './index'

declare global {
  interface Window {
    desqueeze: DesqueezeApi
  }
}

export {}
