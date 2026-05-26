/**
 * FormIO: Content Management Runtime Component
 *
 * Reference pattern: ProgressBarFormIO — render HTML via Form.io's render()
 * and update the DOM in attach(). No React dependency; pure HTML/DOM.
 *
 * Fetches content from Payload CMS REST API and renders it according to
 * the configured render mode (html, richText).
 *
 * Cache strategy: module-level Map keyed by a composite of component key +
 * API URL + collection + contentId + contentSlug + queryParams + response
 * paths. When enableCache is true, cached responses are served immediately
 * and the component does not re-fetch.
 */

import { CONTENT_MANAGEMENT_TYPE } from '../../components/ContentManagement'

// ── Response cache ──────────────────────────────────────────────────────────

interface CachedEntry {
  title: string
  content: unknown
  timestamp: number
}

const _responseCache = new Map<string, CachedEntry>()

/** Build a deterministic cache key from component config. */
function buildCacheKey(c: Record<string, unknown>): string {
  return [
    c.key ?? '',
    c.payloadApiUrl ?? '',
    c.collectionSlug ?? '',
    c.contentId ?? '',
    c.contentSlug ?? '',
    c.queryParams ?? '',
    c.responseDataPath ?? '',
    c.titleFieldPath ?? '',
    c.contentFieldPath ?? '',
    c.renderMode ?? '',
  ].join('|')
}

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Resolve a dot-notation path against an object. */
function resolvePath(obj: unknown, path: string): unknown {
  if (!path || obj == null) return obj
  const parts = path.split('.')
  let current: unknown = obj
  for (const part of parts) {
    if (current == null || typeof current !== 'object') return undefined
    current = (current as Record<string, unknown>)[part]
  }
  return current
}

/** Build the full request URL from component config. */
function buildRequestUrl(c: Record<string, unknown>): string {
  const base = String(c.payloadApiUrl || '/api').replace(/\/+$/, '')
  const collection = String(c.collectionSlug || '').replace(/^\/+|\/+$/g, '')
  const contentId = String(c.contentId || '').trim()
  const contentSlug = String(c.contentSlug || '').trim()
  const queryParams = String(c.queryParams || '').trim()

  // Build path: /api/{collection}/{id} or /api/{collection}/slug/{slug}
  let url = collection ? `${base}/${collection}` : base
  if (contentId) {
    url += `/${encodeURIComponent(contentId)}`
  } else if (contentSlug) {
    url += `/slug/${encodeURIComponent(contentSlug)}`
  }

  // Append additional query params
  if (queryParams) {
    url += `?${queryParams}`
  }

  return url
}

/**
 * Minimal HTML sanitizer. Removes script/iframe/object/embed tags and
 * event-handler attributes. For production, consumers should install
 * DOMPurify; this provides a baseline defense.
 */
function sanitizeHtml(raw: string): string {
  // Remove dangerous tags
  let clean = raw.replace(
    /<\s*\/?\s*(script|iframe|object|embed|applet|form|meta|link|base)\b[^>]*>/gi,
    '',
  )
  // Remove on* event handlers
  clean = clean.replace(/\s+on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
  // Remove javascript: hrefs
  clean = clean.replace(/href\s*=\s*(?:"javascript:[^"]*"|'javascript:[^']*')/gi, '')
  return clean
}

/**
 * Convert Payload CMS Lexical/Slate rich text JSON to simple HTML.
 * Handles common node types; passes through unknown nodes as text.
 */
function richTextToHtml(node: unknown): string {
  if (node == null) return ''
  if (typeof node === 'string') return escapeHtml(node)

  // Array of nodes
  if (Array.isArray(node)) {
    return node.map(richTextToHtml).join('')
  }

  if (typeof node !== 'object') return escapeHtml(String(node))

  const n = node as Record<string, unknown>

  // Lexical text node
  if (n.type === 'text' || (!n.type && typeof n.text === 'string')) {
    let text = escapeHtml(String(n.text ?? ''))
    const format = Number(n.format) || 0
    if (format & 1) text = `<strong>${text}</strong>`
    if (format & 2) text = `<em>${text}</em>`
    if (format & 4) text = `<s>${text}</s>`
    if (format & 8) text = `<u>${text}</u>`
    if (format & 16) text = `<code>${text}</code>`
    return text
  }

  const children = Array.isArray(n.children)
    ? (n.children as unknown[]).map(richTextToHtml).join('')
    : ''

  // Slate leaf node
  if (typeof n.text === 'string') {
    let text = escapeHtml(n.text)
    if (n.bold) text = `<strong>${text}</strong>`
    if (n.italic) text = `<em>${text}</em>`
    if (n.underline) text = `<u>${text}</u>`
    if (n.strikethrough) text = `<s>${text}</s>`
    if (n.code) text = `<code>${text}</code>`
    return text
  }

  // Lexical root
  if (n.root && typeof n.root === 'object') {
    return richTextToHtml(n.root)
  }

  const type = String(n.type || '')

  switch (type) {
    case 'root':
      return children
    case 'heading': {
      const tag = String(n.tag || 'h2')
      return `<${tag}>${children}</${tag}>`
    }
    case 'paragraph':
    case 'p':
      return `<p>${children}</p>`
    case 'quote':
    case 'blockquote':
      return `<blockquote>${children}</blockquote>`
    case 'list': {
      const tag = n.listType === 'number' || n.tag === 'ol' ? 'ol' : 'ul'
      return `<${tag}>${children}</${tag}>`
    }
    case 'listitem':
    case 'list-item':
    case 'li':
      return `<li>${children}</li>`
    case 'link': {
      const href = escapeHtml(String(n.url || n.href || '#'))
      return `<a href="${href}" rel="noopener noreferrer">${children}</a>`
    }
    case 'upload':
    case 'image': {
      const src = escapeHtml(String(n.url || (n.value as Record<string, unknown>)?.url || ''))
      const alt = escapeHtml(String(n.alt || n.altText || ''))
      return src ? `<img src="${src}" alt="${alt}" class="img-fluid" />` : ''
    }
    case 'horizontalrule':
    case 'hr':
      return '<hr />'
    default:
      return children || ''
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// ── Component Factory ───────────────────────────────────────────────────────

export function createContentManagementClass(FieldComponent: any) {
  return class ContentManagementFormIO extends FieldComponent {
    _abortController: AbortController | null = null
    /** Direct DOM reference — survives async gaps where this.refs goes stale. */
    _containerEl: HTMLElement | null = null

    static schema(...extend: any[]) {
      return FieldComponent.schema(
        {
          type: CONTENT_MANAGEMENT_TYPE,
          label: 'Content Management',
          key: 'contentManagement',
          input: false,
          tableView: false,
          hidden: false,
          disabled: false,
          customClass: '',
          enableCache: true,
          payloadApiUrl: '',
          collectionSlug: '',
          contentId: '',
          contentSlug: '',
          queryParams: '',
          responseDataPath: '',
          titleFieldPath: '',
          contentFieldPath: '',
          renderMode: 'richText',
        },
        ...extend,
      )
    }

    static get builderInfo() {
      return {
        title: 'Content Management',
        group: 'basic',
        icon: 'file-text-o',
        weight: 38,
        schema: ContentManagementFormIO.schema(),
      }
    }

    get defaultSchema() {
      return ContentManagementFormIO.schema()
    }

    // ── Render ──────────────────────────────────────────────────────────

    render() {
      return super.render(`
        <div ref="cmsRoot" class="cms-content-management">
          <div class="text-muted small p-2">
            <i class="fa fa-spinner fa-spin"></i> Loading content&hellip;
          </div>
        </div>
      `)
    }

    // ── Attach ──────────────────────────────────────────────────────────

    attach(element: HTMLElement) {
      const result = super.attach(element)

      this.loadRefs(element, { cmsRoot: 'single' })

      const root = (this.refs as any)?.cmsRoot as HTMLElement | undefined
      if (root) {
        this._containerEl = root
      }

      this._fetchAndRender()
      return result
    }

    // ── Fetch & Render ──────────────────────────────────────────────────

    async _fetchAndRender() {
      const c = this.component
      const el = this._containerEl
      if (!el) return

      const cacheKey = buildCacheKey(c)
      const enableCache = c.enableCache !== false

      // Serve from cache immediately
      if (enableCache) {
        const cached = _responseCache.get(cacheKey)
        if (cached) {
          this._setContentHtml(el, cached.title, cached.content)
          return
        }
      }

      // Show loading
      el.innerHTML =
        '<div class="text-muted small p-2"><i class="fa fa-spinner fa-spin"></i> Loading content&hellip;</div>'

      const url = buildRequestUrl(c)
      if (!url || url === '/api' || url === '/api/') {
        el.innerHTML =
          '<div class="text-muted small p-2">No content available.</div>'
        return
      }

      // Cancel previous in-flight request
      if (this._abortController) {
        this._abortController.abort()
      }
      this._abortController = new AbortController()

      try {
        const response = await fetch(url, {
          signal: this._abortController.signal,
          headers: { Accept: 'application/json' },
        })

        // Re-check container is still in the DOM after async gap
        if (!this._containerEl || !this._containerEl.isConnected) return

        if (!response.ok) {
          el.innerHTML = `<div class="text-danger small p-2">Failed to load content (${response.status})</div>`
          return
        }

        const json = await response.json()
        if (!this._containerEl || !this._containerEl.isConnected) return

        // Resolve document from response
        const doc = c.responseDataPath
          ? resolvePath(json, c.responseDataPath)
          : json

        if (doc == null) {
          el.innerHTML =
            '<div class="text-muted small p-2">No content available.</div>'
          return
        }

        // Resolve title and content fields
        const title = c.titleFieldPath
          ? resolvePath(doc, c.titleFieldPath)
          : undefined

        // Auto-select content field based on renderMode when contentFieldPath is empty
        const mode: string = String(c.renderMode || 'richText')
        let contentPath = String(c.contentFieldPath || '').trim()
        if (!contentPath) {
          contentPath = mode === 'html' ? 'htmlContent' : 'content'
        }
        const content = resolvePath(doc, contentPath)

        // Store in cache
        if (enableCache) {
          _responseCache.set(cacheKey, {
            title: title != null ? String(title) : '',
            content,
            timestamp: Date.now(),
          })
        }

        this._setContentHtml(
          el,
          title != null ? String(title) : '',
          content,
        )
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === 'AbortError') return
        const message =
          err instanceof Error ? err.message : 'Unknown error loading content'
        if (this._containerEl?.isConnected) {
          el.innerHTML = `<div class="text-danger small p-2">${escapeHtml(message)}</div>`
        }
      }
    }

    // ── Build final HTML and set it on the container ────────────────────

    _setContentHtml(el: HTMLElement, title: string, content: unknown) {
      const c = this.component

      if (content == null || content === '') {
        el.innerHTML =
          '<div class="text-muted small p-2">No content available.</div>'
        return
      }

      const mode: string = c.renderMode || 'richText'
      let titleHtml = ''
      let bodyHtml = ''

      // Title
      if (title) {
        titleHtml = `<div class="h5 mb-2">${escapeHtml(title)}</div>`
      }

      // Body
      switch (mode) {
        case 'html': {
          const raw = typeof content === 'string' ? content : String(content)
          bodyHtml = `<div class="cms-content-body">${sanitizeHtml(raw)}</div>`
          break
        }
        case 'richText':
        default: {
          const html = richTextToHtml(content)
          bodyHtml = `<div class="cms-content-body">${sanitizeHtml(html)}</div>`
          break
        }
      }

      el.innerHTML = titleHtml + bodyHtml
    }

    // ── Cleanup ─────────────────────────────────────────────────────────

    destroy() {
      if (this._abortController) {
        this._abortController.abort()
        this._abortController = null
      }
      this._containerEl = null
      return super.destroy()
    }
  }
}

export default createContentManagementClass
