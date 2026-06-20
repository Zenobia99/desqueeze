/// <reference types="vite/client" />

declare module '*.png' {
  const src: string
  export default src
}

import type { DesqueezeApi } from '../../preload'

declare global {
  interface Window {
    desqueeze: DesqueezeApi
  }
}

export {}
