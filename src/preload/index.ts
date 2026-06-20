import { contextBridge, ipcRenderer } from 'electron'
import type {
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
  chooseDestination: (): Promise<string | null> =>
    ipcRenderer.invoke('dialog:chooseDestination'),
  exportPhotos: (req: ExportRequest): Promise<ExportResult> =>
    ipcRenderer.invoke('export:run', req),
  reveal: (path: string): Promise<void> => ipcRenderer.invoke('shell:reveal', path)
}

export type DesqueezeApi = typeof api

contextBridge.exposeInMainWorld('desqueeze', api)
