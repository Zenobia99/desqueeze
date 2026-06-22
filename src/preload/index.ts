import { contextBridge, ipcRenderer, webUtils } from 'electron'
import type {
  ExportProgress,
  ExportRequest,
  ExportResult,
  ImportedPhoto,
  LibrarySource,
  PreviewRequest,
  PreviewResult,
  SourceLoadResult
} from '@shared/types'

// The typed surface the renderer is allowed to touch. No Node, no ipcRenderer
// leak — everything goes through these explicit, awaited calls.
const api = {
  loadSource: (source: LibrarySource): Promise<SourceLoadResult> =>
    ipcRenderer.invoke('photos:source', source),
  preview: (req: PreviewRequest): Promise<PreviewResult> => ipcRenderer.invoke('photos:preview', req),
  addPhotos: (): Promise<ImportedPhoto[]> => ipcRenderer.invoke('photos:add'),
  /** Import dropped files/folders by absolute path. */
  importPaths: (paths: string[]): Promise<ImportedPhoto[]> =>
    ipcRenderer.invoke('photos:import', paths),
  /** Resolve a dropped File's absolute path (Electron webUtils). */
  getPathForFile: (file: File): string => webUtils.getPathForFile(file),
  chooseDestination: (): Promise<string | null> =>
    ipcRenderer.invoke('dialog:chooseDestination'),
  exportPhotos: (req: ExportRequest): Promise<ExportResult> =>
    ipcRenderer.invoke('export:run', req),
  /** Subscribe to per-item export progress; returns an unsubscribe fn. */
  onExportProgress: (cb: (p: ExportProgress) => void): (() => void) => {
    const listener = (_e: unknown, p: ExportProgress): void => cb(p)
    ipcRenderer.on('export:progress', listener)
    return () => ipcRenderer.removeListener('export:progress', listener)
  },
  reveal: (path: string): Promise<void> => ipcRenderer.invoke('shell:reveal', path)
}

export type DesqueezeApi = typeof api

contextBridge.exposeInMainWorld('desqueeze', api)
