/**
 * DocumentViewerContent — React component rendered inside the existing popup body.
 *
 * Reference pattern: PopupComponentFormIO — uses openPopup with onMount to inject
 * custom React content into the popup body via createRoot.
 *
 * Handles:
 *  - PDF preview via react-pdf (imported dynamically — react-pdf is a peerDependency)
 *  - Image preview with error fallback
 *  - Unsupported file types with fallback text and optional download link
 *
 * Worker setup:
 *   Call `setupDocumentViewerWorker(workerSrc)` once in your app entry point
 *   to configure the PDF.js worker URL. If not called, a CDN fallback is used
 *   (unpkg.com) which is suitable for development.
 *
 *   Example:
 *     import { setupDocumentViewerWorker } from 'kolea-shared-package/client'
 *     setupDocumentViewerWorker(`https://unpkg.com/pdfjs-dist@VERSION/build/pdf.worker.min.mjs`)
 */

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { createComponentLogger } from '../../utils/logger'

const documentViewerLogger = createComponentLogger({ component: 'DocumentViewer' })

// ── Worker Configuration ─────────────────────────────────────────────────────

/**
 * Global worker src store — set by consumer via setupDocumentViewerWorker().
 * Read by PdfViewer at mount time before loading react-pdf.
 */
let _workerSrc = ''

/**
 * Call this once in your app entry point to configure the PDF.js worker URL.
 * If not called, a CDN URL (unpkg.com) is used as a convenience fallback.
 */
export function setupDocumentViewerWorker(src: string): void {
  _workerSrc = src
}

// ── react-pdf Layer CSS ──────────────────────────────────────────────────────
// Embedded as strings and injected once into document.head — same pattern as
// formio-overrides.ts. This avoids bundler CSS handling issues in a shared lib.

const TEXT_LAYER_CSS = `
:root { --react-pdf-text-layer: 1; }
.textLayer { position: absolute; text-align: initial; inset: 0; overflow: hidden;
  line-height: 1; text-size-adjust: none; forced-color-adjust: none;
  transform-origin: 0 0; z-index: 2; }
.textLayer :is(span, br) { color: transparent; position: absolute; white-space: pre;
  cursor: text; margin: 0; transform-origin: 0 0; }
.textLayer .highlight { margin: -1px; padding: 1px;
  background-color: rgba(180, 0, 170, 0.5); border-radius: 4px; }
.textLayer .highlight.selected { background-color: rgba(0, 100, 0, 0.5); }
.textLayer br::selection { background: transparent; }
.textLayer .endOfContent { display: block; position: absolute; inset: 100% 0 0;
  z-index: -1; cursor: default; user-select: none; }
.textLayer.selecting .endOfContent { top: 0; }
`

const ANNOTATION_LAYER_CSS = `
:root {
  --react-pdf-annotation-layer: 1;
  --input-focus-border-color: Highlight; --input-focus-outline: 1px solid Canvas;
  --input-unfocused-border-color: transparent; --input-disabled-border-color: transparent;
  --input-hover-border-color: black; --link-outline: none;
}
.annotationLayer { position: absolute; top: 0; left: 0; pointer-events: none;
  transform-origin: 0 0; z-index: 3; }
.annotationLayer canvas { position: absolute; width: 100%; height: 100%; }
.annotationLayer section { position: absolute; text-align: initial;
  pointer-events: auto; box-sizing: border-box; margin: 0; transform-origin: 0 0; }
.annotationLayer .linkAnnotation { outline: var(--link-outline); }
.textLayer.selecting ~ .annotationLayer section { pointer-events: none; }
.annotationLayer :is(.linkAnnotation, .buttonWidgetAnnotation.pushButton) > a {
  position: absolute; font-size: 1em; top: 0; left: 0; width: 100%; height: 100%; }
.annotationLayer :is(.linkAnnotation, .buttonWidgetAnnotation.pushButton) > a:hover {
  opacity: 0.2; background: rgba(255,255,0,1); box-shadow: 0 2px 10px rgba(255,255,0,1); }
.annotationLayer .textWidgetAnnotation :is(input, textarea),
.annotationLayer .choiceWidgetAnnotation select,
.annotationLayer .buttonWidgetAnnotation:is(.checkBox, .radioButton) input {
  border: 2px solid var(--input-unfocused-border-color); box-sizing: border-box;
  font: calc(9px * var(--scale-factor)) sans-serif; height: 100%;
  margin: 0; vertical-align: top; width: 100%; }
.annotationLayer .textWidgetAnnotation :is(input, textarea):hover,
.annotationLayer .choiceWidgetAnnotation select:hover,
.annotationLayer .buttonWidgetAnnotation:is(.checkBox, .radioButton) input:hover {
  border: 2px solid var(--input-hover-border-color); }
.annotationLayer .textWidgetAnnotation :is(input, textarea):focus,
.annotationLayer .choiceWidgetAnnotation select:focus {
  background: none; border: 2px solid var(--input-focus-border-color);
  border-radius: 2px; outline: var(--input-focus-outline); }
.annotationLayer .highlightAnnotation, .annotationLayer .underlineAnnotation,
.annotationLayer .squigglyAnnotation, .annotationLayer .strikeoutAnnotation,
.annotationLayer .freeTextAnnotation, .annotationLayer .lineAnnotation svg line,
.annotationLayer .squareAnnotation svg rect, .annotationLayer .circleAnnotation svg ellipse,
.annotationLayer .stampAnnotation, .annotationLayer .fileAttachmentAnnotation { cursor: pointer; }
.annotationLayer section svg { position: absolute; width: 100%; height: 100%; top: 0; left: 0; }
.annotationLayer .annotationTextContent { position: absolute; width: 100%; height: 100%;
  opacity: 0; color: transparent; user-select: none; pointer-events: none; }
.annotationLayer .annotationTextContent span { width: 100%; display: inline-block; }
`

let _pdfCssInjected = false

// ── Document Viewer Layout CSS ───────────────────────────────────────────────
// Injected alongside react-pdf layer CSS. Uses kv-dv- prefix for namespacing.

const DOCUMENT_VIEWER_CSS = `
/* Toolbar */
.kv-dv-toolbar { display: flex; align-items: center; padding: 4px; gap: 4px; flex-wrap: nowrap; }
.kv-dv-toolbar-group { display: flex; align-items: center; gap: 2px; }
.kv-dv-spacer { flex: 1; }
.kv-dv-toolbar-divider { display: inline-block; width: 1px; height: 20px; background: #ddd; margin: 0 4px; }
.kv-dv-page-input { width: 34px; text-align: center; height: 24px; margin: 0 2px; padding: 2px 3px; border: 1px solid #ccc; border-radius: 3px; font-size: 12px; }
.kv-dv-page-count { white-space: nowrap; margin-right: 2px; }
.kv-dv-zoom-select { width: auto; display: inline-block; margin-left: 4px; }

/* Find bar */
.kv-dv-findbar { display: flex; align-items: center; gap: 6px; margin: 0; border-radius: 0; border-left: none; border-right: none; border-top: none; }
.kv-dv-find-input { max-width: 220px; }
.kv-dv-find-status { white-space: nowrap; min-width: 90px; }

/* Body container (relative for overlay) */
.kv-dv-body { position: relative; overflow: hidden; }

/* Loading overlay */
.kv-dv-overlay { position: absolute; inset: 0; background: #525659; z-index: 5; display: flex; flex-direction: column; align-items: center; justify-content: center; }
.kv-dv-overlay-icon { color: #bbb; }
.kv-dv-overlay-text { color: #bbb; margin-top: 12px; }

/* PDF flex container */
.kv-dv-viewer { display: flex; overflow: hidden; }

/* Thumbnail sidebar */
.kv-dv-sidebar { width: 148px; flex-shrink: 0; overflow-y: auto; background: #3d3d3d; border-right: 1px solid #222; padding: 8px 4px; }
.kv-dv-thumb { cursor: pointer; padding: 4px 4px 2px; text-align: center; margin-bottom: 6px; border-radius: 2px; border-left: 3px solid transparent; }
.kv-dv-thumb.active { background: rgba(255,255,255,0.12); }
.kv-dv-thumb-label { color: #ccc; display: block; margin-top: 3px; }

/* Main canvas */
.kv-dv-canvas { flex: 1; overflow-y: auto; overflow-x: auto; background: #525659; padding: 8px 0; min-width: 0; }
.kv-dv-page { margin-bottom: 8px; }

/* Error / status blocks */
.kv-dv-status { text-align: center; padding: 24px 16px; }
.kv-dv-status-icon { margin-bottom: 8px; }

/* Image viewer */
.kv-dv-img-loading { padding: 60px 0; }
.kv-dv-img-loading-text { margin-top: 12px; }

/* Fallback */
.kv-dv-fallback-btn { margin-top: 8px; }
`

/** Inject annotation + text layer + viewer layout CSS into document.head once. */
function injectPdfCss() {
  if (_pdfCssInjected || typeof document === 'undefined') return
  _pdfCssInjected = true
  const id = 'kolea-react-pdf-layers'
  if (document.getElementById(id)) return
  const style = document.createElement('style')
  style.id = id
  style.textContent = TEXT_LAYER_CSS + ANNOTATION_LAYER_CSS + DOCUMENT_VIEWER_CSS
  document.head.appendChild(style)
}

/**
 * Stable Document options object — defined at module level so react-pdf never
 * sees it as a new reference (react-pdf requirement). Populated once after the
 * first dynamic import resolves the pdfjs-dist version.
 */
let _pdfDocumentOptions: Record<string, unknown> | null = null

// ── File Type Resolution ─────────────────────────────────────────────────────

const IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'])

function extractExtension(source: string): string {
  if (!source) return ''
  try {
    const pathname = new URL(source, 'http://x').pathname
    const dot = pathname.lastIndexOf('.')
    return dot !== -1 ? pathname.slice(dot + 1).toLowerCase() : ''
  } catch {
    const clean = source.split('?')[0].split('#')[0]
    const dot = clean.lastIndexOf('.')
    return dot !== -1 ? clean.slice(dot + 1).toLowerCase() : ''
  }
}

/**
 * Resolves the effective file type from the configured forceFileType, file name,
 * and URL. Pure function — safe to call with any combination of undefined values.
 */
export function resolveFileType(
  forceFileType: 'auto' | 'pdf' | 'image' | 'text' | 'other',
  fileName?: string,
  url?: string,
): 'pdf' | 'image' | 'text' | 'other' {
  if (forceFileType !== 'auto') return forceFileType
  const ext = extractExtension(fileName || '') || extractExtension(url || '')
  if (!ext) return 'other'
  if (ext === 'pdf') return 'pdf'
  if (IMAGE_EXTENSIONS.has(ext)) return 'image'
  // Text files show a download link fallback — inline fetch has CORS complexity
  // outside the scope of this component.
  return 'other'
}

// ── Props ────────────────────────────────────────────────────────────────────

export interface DocumentViewerContentProps {
  url: string
  fileType: 'pdf' | 'image' | 'text' | 'other'
  fileName?: string
  viewerHeight: string
  maxWidth: string
  fallbackText: string
  /** 'page' renders one page at a time with navigation. 'scroll' renders all pages stacked. */
  viewMode?: 'page' | 'scroll'
  /** Designer-controlled toolbar feature flags — all default to true. */
  showToolbarSidebar?: boolean
  showToolbarFind?: boolean
  showToolbarNavigation?: boolean
  showToolbarZoom?: boolean
  showToolbarRotate?: boolean
  showToolbarPrint?: boolean
  showToolbarDownload?: boolean
}

// ── PDF Viewer ───────────────────────────────────────────────────────────────

/** Zoom scale steps for the ± buttons (matches PDF.js viewer presets). */
const ZOOM_STEPS = [0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 2.0, 3.0, 4.0]

type ZoomMode = 'fit-width' | number

interface PdfViewerProps {
  url: string
  fileName?: string
  viewerHeight: string
  maxWidth: string
  viewMode: 'page' | 'scroll'
  showToolbarSidebar: boolean
  showToolbarFind: boolean
  showToolbarNavigation: boolean
  showToolbarZoom: boolean
  showToolbarRotate: boolean
  showToolbarPrint: boolean
  showToolbarDownload: boolean
}

function PdfViewer({
  url,
  fileName,
  viewerHeight,
  maxWidth,
  viewMode,
  showToolbarSidebar,
  showToolbarFind,
  showToolbarNavigation,
  showToolbarZoom,
  showToolbarRotate,
  showToolbarPrint,
  showToolbarDownload,
}: PdfViewerProps) {
  const isScrollMode = viewMode === 'scroll'

  // react-pdf module (loaded dynamically)
  const [pdfMod, setPdfMod] = useState<{ Document: any; Page: any } | null>(null)
  const [pdfModError, setPdfModError] = useState(false)

  // Raw pdfjs PDFDocumentProxy — captured from onLoadSuccess, used for find text search.
  const [pdfDoc, setPdfDoc] = useState<any>(null)

  // Page state
  const [numPages, setNumPages] = useState(0)
  const [pageNumber, setPageNumber] = useState(1)
  const [pageInput, setPageInput] = useState('1')
  const [loadError, setLoadError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Viewer controls
  const [zoomMode, setZoomMode] = useState<ZoomMode>('fit-width')
  const [rotation, setRotation] = useState(0)

  // UI panel toggles (mirrors PDF.js sidebar + find bar)
  const [showSidebar, setShowSidebar] = useState(false)
  const [showFind, setShowFind] = useState(false)

  // Find / search state
  const [findQuery, setFindQuery] = useState('')
  const [findResults, setFindResults] = useState<number[]>([])
  const [findCurrentIdx, setFindCurrentIdx] = useState(-1)
  const [findSearching, setFindSearching] = useState(false)
  const findInputRef = useRef<HTMLInputElement>(null)

  // Container ref for ResizeObserver — tracks canvas area width for fit-width mode.
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = useState<number | undefined>(undefined)

  // In scroll mode each page div is stored here so goToPage can scrollIntoView.
  const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map())

  // ── Load react-pdf ───────────────────────────────────────────────────────
  // Per react-pdf docs: workerSrc MUST be set in the same module that renders
  // <Document>/<Page> and must always be assigned explicitly.
  useEffect(() => {
    let cancelled = false
    import('react-pdf')
      .then((mod) => {
        if (cancelled) return
        const { pdfjs } = mod
        pdfjs.GlobalWorkerOptions.workerSrc = _workerSrc
          || `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`
        if (!_pdfDocumentOptions) {
          _pdfDocumentOptions = {
            cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/cmaps/`,
            cMapPacked: true,
            standardFontDataUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/standard_fonts/`,
          }
        }
        injectPdfCss()
        setPdfMod({ Document: mod.Document, Page: mod.Page })
      })
      .catch((err) => {
        if (!cancelled) {
          documentViewerLogger.error('Failed to load react-pdf module', err, { action: 'load.reactPdf' })
          setPdfModError(true)
        }
      })
    return () => { cancelled = true }
  }, [])

  // ── Responsive width ─────────────────────────────────────────────────────
  // Re-observe when sidebar toggles because the canvas area width changes.
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    setContainerWidth(el.clientWidth || undefined)
    if (typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(([entry]) => {
      setContainerWidth(entry.contentRect.width || undefined)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [showSidebar])

  // ── Reset on URL change ──────────────────────────────────────────────────
  useEffect(() => {
    setPageNumber(1)
    setPageInput('1')
    setNumPages(0)
    setIsLoading(true)
    setLoadError(null)
    setPdfDoc(null)
    setFindResults([])
    setFindCurrentIdx(-1)
    setFindQuery('')
  }, [url])

  // ── Focus find input when bar opens ─────────────────────────────────────
  useEffect(() => {
    if (showFind) setTimeout(() => findInputRef.current?.focus(), 40)
  }, [showFind])

  // ── Document callbacks ───────────────────────────────────────────────────
  const onDocumentLoadSuccess = useCallback((doc: any) => {
    setPdfDoc(doc)           // store PDFDocumentProxy for find + sidebar reuse
    setNumPages(doc.numPages)
    setIsLoading(false)
    setLoadError(null)
  }, [])

  const onDocumentLoadError = useCallback((error: Error) => {
    setLoadError(error?.message || 'Failed to load PDF.')
    setIsLoading(false)
  }, [])

  // ── Navigation ───────────────────────────────────────────────────────────
  const goToPage = useCallback((n: number) => {
    const clamped = Math.max(1, Math.min(numPages || 1, n))
    setPageNumber(clamped)
    setPageInput(String(clamped))
    if (isScrollMode) {
      // In scroll mode, scroll the target page div into view.
      pageRefs.current.get(clamped)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [numPages, isScrollMode])

  const commitPageInput = useCallback(() => {
    const n = parseInt(pageInput, 10)
    if (!isNaN(n)) goToPage(n)
    else setPageInput(String(pageNumber))
  }, [pageInput, pageNumber, goToPage])

  // ── Zoom ─────────────────────────────────────────────────────────────────
  const zoomIn = useCallback(() => {
    if (zoomMode === 'fit-width') { setZoomMode(1.0); return }
    const idx = ZOOM_STEPS.indexOf(zoomMode as number)
    setZoomMode(ZOOM_STEPS[Math.min(ZOOM_STEPS.length - 1, idx === -1 ? 3 : idx + 1)])
  }, [zoomMode])

  const zoomOut = useCallback(() => {
    if (zoomMode === 'fit-width') { setZoomMode(0.75); return }
    const idx = ZOOM_STEPS.indexOf(zoomMode as number)
    setZoomMode(ZOOM_STEPS[Math.max(0, idx <= 0 ? 0 : idx - 1)])
  }, [zoomMode])

  const handleZoomSelect = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const v = e.target.value
    setZoomMode(v === 'fit-width' ? 'fit-width' : parseFloat(v))
  }, [])

  // ── Rotate ───────────────────────────────────────────────────────────────
  const rotateCW  = useCallback(() => setRotation((r) => (r + 90) % 360), [])
  const rotateCCW = useCallback(() => setRotation((r) => (r - 90 + 360) % 360), [])

  // ── Download ──────────────────────────────────────────────────────────────
  // Fetch the file as a blob then trigger a programmatic download via a
  // temporary object URL. This works for cross-origin files where the browser
  // ignores the HTML `download` attribute and would navigate instead.
  const handleDownload = useCallback(async () => {
    const name = fileName || url.split('/').pop()?.split('?')[0] || 'download'
    try {
      const response = await fetch(url, { credentials: 'same-origin' })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const blob = await response.blob()
      const objectUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = objectUrl
      a.download = name
      a.style.display = 'none'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      // Delay revoke so the browser has time to start the download.
      setTimeout(() => URL.revokeObjectURL(objectUrl), 10000)
    } catch (_) {
      // Fallback: open in new tab if fetch fails (e.g. CORS-restricted resource).
      window.open(url, '_blank', 'noopener,noreferrer')
    }
  }, [url, fileName])

  // ── Print ─────────────────────────────────────────────────────────────────
  // Hidden iframe approach — triggers the browser's native print dialog for
  // the PDF, identical to how PDF.js's print button works.
  const handlePrint = useCallback(() => {
    const iframe = document.createElement('iframe')
    iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;border:none'
    iframe.src = url
    document.body.appendChild(iframe)
    iframe.onload = () => {
      try { iframe.contentWindow?.print() } catch (_) { window.open(url, '_blank') }
      setTimeout(() => { try { document.body.removeChild(iframe) } catch (_) {} }, 10000)
    }
  }, [url])

  // ── Find / Search ─────────────────────────────────────────────────────────
  // Page-level search: uses the pdfjs document proxy's getPage/getTextContent
  // to find pages containing the query. Navigates to matching pages.
  // (Word-level highlight requires PDF.js's FindController — not in react-pdf.)
  const performFind = useCallback(async (query: string) => {
    if (!pdfDoc || !query.trim()) { setFindResults([]); setFindCurrentIdx(-1); return }
    setFindSearching(true)
    const q = query.toLowerCase().trim()
    const matches: number[] = []
    for (let i = 1; i <= numPages; i++) {
      try {
        const page = await pdfDoc.getPage(i)
        const content = await page.getTextContent()
        const text = (content.items as any[]).map((item: any) => item.str ?? '').join('')
        if (text.toLowerCase().includes(q)) matches.push(i)
      } catch (_) { /* skip page on error */ }
    }
    setFindResults(matches)
    const idx = matches.length > 0 ? 0 : -1
    setFindCurrentIdx(idx)
    if (idx >= 0) goToPage(matches[idx])
    setFindSearching(false)
  }, [pdfDoc, numPages, goToPage])

  const findNext = useCallback(() => {
    if (findResults.length === 0) return
    const next = (findCurrentIdx + 1) % findResults.length
    setFindCurrentIdx(next)
    goToPage(findResults[next])
  }, [findResults, findCurrentIdx, goToPage])

  const findPrev = useCallback(() => {
    if (findResults.length === 0) return
    const prev = (findCurrentIdx - 1 + findResults.length) % findResults.length
    setFindCurrentIdx(prev)
    goToPage(findResults[prev])
  }, [findResults, findCurrentIdx, goToPage])

  const closeFindBar = useCallback(() => {
    setShowFind(false)
    setFindQuery('')
    setFindResults([])
    setFindCurrentIdx(-1)
  }, [])

  // ── Scroll-mode page tracking via IntersectionObserver ───────────────────
  // Watches which page div is most visible in the scroll container and updates
  // pageNumber / pageInput accordingly so the toolbar indicator stays in sync.
  useEffect(() => {
    if (!isScrollMode || typeof IntersectionObserver === 'undefined') return
    const ratios = new Map<number, number>()
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const pg = parseInt((entry.target as HTMLElement).dataset.page ?? '0', 10)
          if (pg) ratios.set(pg, entry.intersectionRatio)
        }
        let bestPage = 1, bestRatio = -1
        ratios.forEach((ratio, pg) => { if (ratio > bestRatio) { bestRatio = ratio; bestPage = pg } })
        if (bestPage !== pageNumber && bestRatio > 0) {
          setPageNumber(bestPage)
          setPageInput(String(bestPage))
        }
      },
      { root: containerRef.current, threshold: [0, 0.25, 0.5, 0.75, 1] },
    )
    pageRefs.current.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  // Re-run when numPages changes (page divs are re-mounted after load).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isScrollMode, numPages])

  // ── Derived values ────────────────────────────────────────────────────────
  // react-pdf: pass width OR scale — never both.
  const pageWidth  = zoomMode === 'fit-width' ? containerWidth : undefined
  const pageScale  = typeof zoomMode === 'number' ? (zoomMode as number) : undefined
  const zoomSelectValue = zoomMode === 'fit-width' ? 'fit-width' : String(zoomMode)
  const canNav      = !isLoading && numPages > 0
  const isAtMaxZoom = typeof zoomMode === 'number' && zoomMode >= ZOOM_STEPS[ZOOM_STEPS.length - 1]
  const isAtMinZoom = typeof zoomMode === 'number' && zoomMode <= ZOOM_STEPS[0]

  // Build className string for Bootstrap toolbar buttons.
  const tbBtn = (active = false, isDisabled = false) =>
    ['btn', 'btn-default', 'btn-xs', active ? 'active' : '', isDisabled ? 'disabled' : ''].filter(Boolean).join(' ')

  // ── Guard: module load error ──────────────────────────────────────────────
  if (pdfModError) {
    return (
      <div className="text-center kv-dv-status">
        <i className="fa fa-exclamation-circle text-danger fa-2x kv-dv-status-icon" aria-hidden="true" />
        <p className="text-muted">
          PDF viewer unavailable. Please ensure <code>react-pdf</code> is installed.
        </p>
      </div>
    )
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="panel panel-default" style={{ maxWidth, margin: '0 auto', overflow: 'hidden' }}>
      {/* ── Toolbar — mirrors PDF.js web viewer layout ───────────────────── */}
      <div
        role="toolbar"
        aria-label="PDF viewer controls"
        className="panel-heading kv-dv-toolbar"
      >

        {/* LEFT: sidebar | find | prev | page/of-N | next */}
        <div className="kv-dv-toolbar-group">
          {showToolbarSidebar && (
            <>
              <button
                type="button"
                title="Toggle page thumbnails"
                aria-label="Toggle thumbnails sidebar"
                aria-pressed={showSidebar}
                className={tbBtn(showSidebar)}
                onClick={() => setShowSidebar((s) => !s)}
              >
                <i className="fa fa-th-list" aria-hidden="true" />
              </button>
              <span aria-hidden="true" className="kv-dv-toolbar-divider" />
            </>
          )}

          {showToolbarFind && (
            <>
              <button
                type="button"
                title="Find in document"
                aria-label="Find in document"
                aria-pressed={showFind}
                className={tbBtn(showFind)}
                onClick={() => setShowFind((f) => !f)}
              >
                <i className="fa fa-search" aria-hidden="true" />
              </button>
              <span aria-hidden="true" className="kv-dv-toolbar-divider" />
            </>
          )}

          {showToolbarNavigation && (
            <>
              <button
                type="button"
                title="Previous page"
                aria-label="Previous page"
                disabled={!canNav || pageNumber <= 1}
                className={tbBtn(false, !canNav || pageNumber <= 1)}
                onClick={() => goToPage(pageNumber - 1)}
              >
                <i className="fa fa-angle-up" aria-hidden="true" />
              </button>
              <input
                type="text"
                aria-label="Current page number"
                value={pageInput}
                disabled={!canNav}
                onChange={(e) => setPageInput(e.target.value)}
                onBlur={commitPageInput}
                onKeyDown={(e) => { if (e.key === 'Enter') commitPageInput() }}
                className="kv-dv-page-input"
              />
              <small className="text-muted kv-dv-page-count">
                of&nbsp;{numPages > 0 ? numPages : '—'}
              </small>
              <button
                type="button"
                title="Next page"
                aria-label="Next page"
                disabled={!canNav || pageNumber >= numPages}
                className={tbBtn(false, !canNav || pageNumber >= numPages)}
                onClick={() => goToPage(pageNumber + 1)}
              >
                <i className="fa fa-angle-down" aria-hidden="true" />
              </button>
            </>
          )}
        </div>

        {/* FLEX SPACER */}
        <div className="kv-dv-spacer" />

        {/* CENTER: zoom */}
        {showToolbarZoom && (
          <div className="kv-dv-toolbar-group">
            <button
              type="button"
              title="Zoom out"
              aria-label="Zoom out"
              disabled={isLoading || isAtMinZoom}
              className={tbBtn(false, isLoading || isAtMinZoom)}
              onClick={zoomOut}
            >
              <i className="fa fa-minus" aria-hidden="true" />
            </button>
            <span aria-hidden="true" className="kv-dv-toolbar-divider" />
            <button
              type="button"
              title="Zoom in"
              aria-label="Zoom in"
              disabled={isLoading || isAtMaxZoom}
              className={tbBtn(false, isLoading || isAtMaxZoom)}
              onClick={zoomIn}
            >
              <i className="fa fa-plus" aria-hidden="true" />
            </button>
            <select
              value={zoomSelectValue}
              onChange={handleZoomSelect}
              disabled={isLoading}
              aria-label="Zoom level"
              title="Zoom level"
              className="form-control input-sm kv-dv-zoom-select"
            >
              <option value="fit-width">Page Width</option>
              <option value="0.25">25%</option>
              <option value="0.5">50%</option>
              <option value="0.75">75%</option>
              <option value="1">100%</option>
              <option value="1.25">125%</option>
              <option value="1.5">150%</option>
              <option value="2">200%</option>
              <option value="3">300%</option>
              <option value="4">400%</option>
            </select>
          </div>
        )}

        {/* FLEX SPACER */}
        <div className="kv-dv-spacer" />

        {/* RIGHT: rotate | print | download — each conditionally shown */}
        {(showToolbarRotate || showToolbarPrint || showToolbarDownload) && (
          <div className="kv-dv-toolbar-group">
            {showToolbarRotate && (
              <>
                <button
                  type="button"
                  title="Rotate counterclockwise"
                  aria-label="Rotate counterclockwise"
                  disabled={isLoading}
                  className={tbBtn(false, isLoading)}
                  onClick={rotateCCW}
                >
                  <i className="fa fa-undo" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  title="Rotate clockwise"
                  aria-label="Rotate clockwise"
                  disabled={isLoading}
                  className={tbBtn(false, isLoading)}
                  onClick={rotateCW}
                >
                  <i className="fa fa-repeat" aria-hidden="true" />
                </button>
                {(showToolbarPrint || showToolbarDownload) && <span aria-hidden="true" className="kv-dv-toolbar-divider" />}
              </>
            )}
            {showToolbarPrint && (
              <button
                type="button"
                title="Print"
                aria-label="Print"
                className={tbBtn()}
                onClick={handlePrint}
              >
                <i className="fa fa-print" aria-hidden="true" />
              </button>
            )}
            {showToolbarDownload && (
              <button
                type="button"
                title="Download"
                aria-label="Download"
                className={tbBtn()}
                onClick={handleDownload}
              >
                <i className="fa fa-download" aria-hidden="true" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Find bar ─────────────────────────────────────────────────────── */}
      {showFind && (
        <div className="well well-sm kv-dv-findbar">
          <input
            ref={findInputRef}
            type="search"
            placeholder="Find in document…"
            value={findQuery}
            onChange={(e) => setFindQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.shiftKey
                  ? findPrev()
                  : findResults.length > 0 ? findNext() : performFind(findQuery)
              }
              if (e.key === 'Escape') closeFindBar()
            }}
            aria-label="Search text"
            className="form-control kv-dv-find-input"
          />
          <button
            type="button"
            className="btn btn-default btn-xs"
            title="Find"
            disabled={findSearching || !findQuery.trim()}
            onClick={() => performFind(findQuery)}
          >
            {findSearching
              ? <i className="fa fa-spinner fa-spin" aria-hidden="true" />
              : 'Find'}
          </button>
          <button
            type="button"
            className="btn btn-default btn-xs"
            title="Previous match"
            aria-label="Previous match"
            disabled={findResults.length === 0}
            onClick={findPrev}
          >
            <i className="fa fa-chevron-up" aria-hidden="true" />
          </button>
          <button
            type="button"
            className="btn btn-default btn-xs"
            title="Next match"
            aria-label="Next match"
            disabled={findResults.length === 0}
            onClick={findNext}
          >
            <i className="fa fa-chevron-down" aria-hidden="true" />
          </button>
          <small className="text-muted kv-dv-find-status">
            {findQuery.trim() && !findSearching && (
              findResults.length === 0
                ? 'No results'
                : `${findCurrentIdx + 1} / ${findResults.length} page${findResults.length !== 1 ? 's' : ''}`
            )}
          </small>
          <button
            type="button"
            title="Close"
            aria-label="Close find bar"
            className={tbBtn()}
            onClick={closeFindBar}
          >
            <i className="fa fa-times" aria-hidden="true" />
          </button>
        </div>
      )}

      {/* ── Body — fixed height so the spinner overlay always has room ─────────── */}
      <div className="kv-dv-body" style={{ height: viewerHeight }}>

        {/* Loading overlay — covers body while module is loading or PDF is fetching */}
        {(!pdfMod || isLoading) && !pdfModError && !loadError && (
          <div className="kv-dv-overlay">
            <i className="fa fa-spinner fa-spin fa-3x kv-dv-overlay-icon" aria-hidden="true" />
            <p className="kv-dv-overlay-text">
              {!pdfMod ? 'Loading PDF viewer…' : 'Loading document…'}
            </p>
          </div>
        )}

        {/* Load error */}
        {loadError && (
          <div className="kv-dv-status">
            <i className="fa fa-exclamation-triangle fa-2x text-warning kv-dv-status-icon" aria-hidden="true" />
            <p className="text-muted">
              Failed to load PDF. The file may be unavailable or inaccessible.
            </p>
          </div>
        )}

        {/* Single Document — sidebar thumbnails + main canvas share one fetch */}
        {pdfMod && (
          <pdfMod.Document
            file={url}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={onDocumentLoadError}
            loading={null}
            error={null}
            options={_pdfDocumentOptions ?? undefined}
          >
            {!loadError && (
              <div className="kv-dv-viewer" style={{ height: viewerHeight }}>

                {/* Thumbnail sidebar — reuses the same Document, zero extra network requests */}
                {showSidebar && numPages > 0 && (
                  <div className="kv-dv-sidebar">
                    {Array.from({ length: numPages }, (_, i) => {
                      const pg = i + 1
                      const isActive = pageNumber === pg
                      return (
                        <div
                          key={pg}
                          role="button"
                          tabIndex={0}
                          aria-label={`Go to page ${pg}`}
                          aria-current={isActive ? 'true' : undefined}
                          onClick={() => goToPage(pg)}
                          onKeyDown={(e) => { if (e.key === 'Enter') goToPage(pg) }}
                          className={`kv-dv-thumb${isActive ? ' active' : ''}`}
                          style={{ borderLeftColor: isActive ? '#4a9edd' : 'transparent' }}
                        >
                          <pdfMod.Page
                            pageNumber={pg}
                            width={122}
                            renderAnnotationLayer={false}
                            renderTextLayer={false}
                          />
                          <small className="kv-dv-thumb-label">{pg}</small>
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* Main PDF canvas */}
                <div ref={containerRef} className="kv-dv-canvas">
                  {/* Page mode: single page with prev/next navigation */}
                  {!isLoading && numPages > 0 && !isScrollMode && (
                    <div className="text-center">
                      <pdfMod.Page
                        pageNumber={pageNumber}
                        width={pageWidth}
                        scale={pageScale}
                        rotate={rotation}
                        renderAnnotationLayer={true}
                        renderTextLayer={true}
                      />
                    </div>
                  )}

                  {/* Scroll mode: all pages stacked */}
                  {!isLoading && numPages > 0 && isScrollMode && (
                    Array.from({ length: numPages }, (_, i) => {
                      const pg = i + 1
                      return (
                        <div
                          key={pg}
                          data-page={pg}
                          ref={(el) => {
                            if (el) pageRefs.current.set(pg, el)
                            else pageRefs.current.delete(pg)
                          }}
                          className="text-center kv-dv-page"
                        >
                          <pdfMod.Page
                            pageNumber={pg}
                            width={pageWidth}
                            scale={pageScale}
                            rotate={rotation}
                            renderAnnotationLayer={true}
                            renderTextLayer={true}
                          />
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            )}
          </pdfMod.Document>
        )}
      </div>
    </div>
  )
}

// ── Image Viewer ─────────────────────────────────────────────────────────────

interface ImageViewerProps {
  url: string
  viewerHeight: string
  maxWidth: string
  fallbackText: string
}

function ImageViewer({ url, viewerHeight, maxWidth, fallbackText }: ImageViewerProps) {
  const [imgError, setImgError] = useState(false)
  const [imgLoaded, setImgLoaded] = useState(false)

  if (imgError) {
    return (
      <div className="kv-dv-status">
        <i className="fa fa-exclamation-triangle fa-2x text-warning kv-dv-status-icon" aria-hidden="true" />
        <p className="text-muted">{fallbackText}</p>
      </div>
    )
  }

  return (
    <div className="text-center">
      {!imgLoaded && (
        <div className="kv-dv-img-loading">
          <i className="fa fa-spinner fa-spin fa-3x text-muted" aria-hidden="true" />
          <p className="text-muted kv-dv-img-loading-text">Loading image&hellip;</p>
        </div>
      )}
      <img
        src={url}
        alt="Document preview"
        onError={() => setImgError(true)}
        onLoad={() => setImgLoaded(true)}
        style={{ maxHeight: viewerHeight, maxWidth, objectFit: 'contain', display: imgLoaded ? 'block' : 'none', margin: '0 auto' }}
      />
    </div>
  )
}

// ── Fallback Block ───────────────────────────────────────────────────────────

interface FallbackBlockProps {
  fallbackText: string
  url?: string
}

function FallbackBlock({ fallbackText, url }: FallbackBlockProps) {
  return (
    <div className="kv-dv-status">
      <i className="fa fa-file-o fa-2x text-muted kv-dv-status-icon" aria-hidden="true" />
      <p className="text-muted">{fallbackText}</p>
      {url && (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-default btn-sm kv-dv-fallback-btn"
        >
          <i className="fa fa-external-link" aria-hidden="true" />{' '}Open in New Tab
        </a>
      )}
    </div>
  )
}

// ── Main Component ───────────────────────────────────────────────────────────

/**
 * Root component rendered inside the popup body via createRoot + onMount.
 * Resolves the appropriate viewer based on fileType.
 */
export function DocumentViewerContent({
  url,
  fileType,
  fileName,
  viewerHeight,
  maxWidth,
  fallbackText,
  viewMode,
  showToolbarSidebar,
  showToolbarFind,
  showToolbarNavigation,
  showToolbarZoom,
  showToolbarRotate,
  showToolbarPrint,
  showToolbarDownload,
}: DocumentViewerContentProps) {
  const renderViewer = () => {
    if (!url) {
      return <FallbackBlock fallbackText={fallbackText} />
    }

    switch (fileType) {
      case 'pdf':
        return (
          <PdfViewer
            url={url}
            fileName={fileName}
            viewerHeight={viewerHeight}
            maxWidth={maxWidth}
            viewMode={viewMode ?? 'page'}
            showToolbarSidebar={showToolbarSidebar ?? true}
            showToolbarFind={showToolbarFind ?? true}
            showToolbarNavigation={showToolbarNavigation ?? true}
            showToolbarZoom={showToolbarZoom ?? true}
            showToolbarRotate={showToolbarRotate ?? true}
            showToolbarPrint={showToolbarPrint ?? true}
            showToolbarDownload={showToolbarDownload ?? true}
          />
        )

      case 'image':
        return (
          <ImageViewer
            url={url}
            viewerHeight={viewerHeight}
            maxWidth={maxWidth}
            fallbackText={fallbackText}
          />
        )

      default:
        // 'text' and 'other' — show fallback with open-in-new-tab link.
        return <FallbackBlock fallbackText={fallbackText} url={url} />
    }
  }

  return (
    <div>
      {renderViewer()}
    </div>
  )
}
