/**
 * TransStackCore — pure helper functions for the TanStack Table component.
 *
 * Framework-agnostic. No React hooks, no JSX, no Form.io runtime.
 * Used by both TransStackFormIO and ReactTranstackTable.
 */

import type {
  IconRule,
  TransStackFetchParams,
  TransStackFetchResult,
  TransStackRow,
  TransStackServiceConfig,
  TanStackTableActionHandlers,
} from './TransStackCore.types'

// ── URL Interpolation ────────────────────────────────────────────────

/** Interpolate {{fieldKey}} tokens in a URL template using row data */
export function interpolateUrl(template: string, row: TransStackRow): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) =>
    encodeURIComponent(String(row[key] ?? '')),
  )
}

// ── File Extension / Type Detection ──────────────────────────────────

export const FILE_EXT_MAP: Record<string, 'image' | 'pdf' | 'video' | 'audio'> = {
  jpg: 'image', jpeg: 'image', png: 'image', gif: 'image', webp: 'image', svg: 'image', bmp: 'image',
  pdf: 'pdf',
  mp4: 'video', webm: 'video', ogg: 'video', ogv: 'video', mov: 'video',
  mp3: 'audio', wav: 'audio', oga: 'audio', m4a: 'audio', flac: 'audio',
}

export function getFileExt(url: string): string {
  try {
    const p = new URL(url, 'https://x').pathname
    const d = p.lastIndexOf('.')
    return d === -1 ? '' : p.slice(d + 1).toLowerCase()
  } catch {
    const d = url.lastIndexOf('.')
    return d === -1 ? '' : url.slice(d + 1).toLowerCase().split(/[?#]/)[0]
  }
}

export function escAttr(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// ── Icon Rule Parsing ────────────────────────────────────────────────

/** Parse icon map JSON into ordered rules. Keys support glob patterns:
 *  - "active"   → exact match (case-insensitive)
 *  - "active*"  → starts with
 *  - "*active"  → ends with
 *  - "*active*" → contains
 *  - "*"        → catch-all wildcard
 */
export function parseIconRules(raw?: string): IconRule[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    const rules: IconRule[] = []
    for (const [k, v] of Object.entries(parsed)) {
      const key = k.toLowerCase()
      let iconClass: string
      let text: string | undefined
      if (typeof v === 'object' && v !== null) {
        const obj = v as Record<string, unknown>
        iconClass = String(obj.icon ?? '')
        text = obj.text != null ? String(obj.text) : undefined
      } else {
        iconClass = String(v)
      }
      if (key === '*') {
        rules.push({ pattern: '*', iconClass, text, type: 'wildcard' })
      } else if (key.startsWith('*') && key.endsWith('*') && key.length > 2) {
        rules.push({ pattern: key.slice(1, -1), iconClass, text, type: 'contains' })
      } else if (key.endsWith('*')) {
        rules.push({ pattern: key.slice(0, -1), iconClass, text, type: 'startsWith' })
      } else if (key.startsWith('*')) {
        rules.push({ pattern: key.slice(1), iconClass, text, type: 'endsWith' })
      } else {
        rules.push({ pattern: key, iconClass, text, type: 'exact' })
      }
    }
    return rules
  } catch { return [] }
}

/** Resolve an icon rule using ordered rules. First match wins. Returns null if no match. */
export function resolveIconRule(rules: IconRule[], rawValue: string): IconRule | null {
  const lower = rawValue.toLowerCase()
  for (const rule of rules) {
    switch (rule.type) {
      case 'exact':      if (lower === rule.pattern) return rule; break
      case 'startsWith': if (lower.startsWith(rule.pattern)) return rule; break
      case 'endsWith':   if (lower.endsWith(rule.pattern)) return rule; break
      case 'contains':   if (lower.includes(rule.pattern)) return rule; break
      case 'wildcard':   return rule
    }
  }
  return null
}

// ── Data Service ─────────────────────────────────────────────────────

/**
 * Resolve a dot-path like "data.items" on an object.
 */
export function resolvePath(obj: unknown, path: string): unknown {
  if (!path) return obj
  return path.split('.').reduce<unknown>((o, key) => {
    if (o && typeof o === 'object' && key in (o as Record<string, unknown>)) {
      return (o as Record<string, unknown>)[key]
    }
    return undefined
  }, obj)
}

/**
 * Generic fetch function for server-side mode.
 * Builds query params from the component schema config and normalises the response.
 * Supports secure API calls with Basic Auth and partner-id header.
 */
export async function fetchServerData(
  config: TransStackServiceConfig,
  params: TransStackFetchParams,
): Promise<TransStackFetchResult> {
  const url = new URL(config.apiEndpoint, window.location.origin)

  url.searchParams.set(config.pageParamName, String(params.page))
  url.searchParams.set(config.pageSizeParamName, String(params.pageSize))

  if (params.sortField) {
    url.searchParams.set(config.sortFieldParamName, params.sortField)
    url.searchParams.set(config.sortDirectionParamName, params.sortDirection || 'asc')
  }
  if (params.search) {
    url.searchParams.set(config.searchParamName, params.search)
  }
  if (params.group) {
    url.searchParams.set(config.groupParamName, params.group)
  }

  // Build request headers — add auth/partner-id for secure API
  const headers: Record<string, string> = {}
  if (config.apiType === 'secure') {
    if (config.authType === 'basic' && config.authUsername) {
      headers['Authorization'] = `Basic ${btoa(`${config.authUsername}:${config.authPassword || ''}`)}`
    }
    if (config.partnerId) {
      headers['partner-id'] = config.partnerId
    }
  }

  const res = await fetch(url.toString(), {
    method: config.apiMethod,
    ...(Object.keys(headers).length > 0 ? { headers } : {}),
  })
  if (!res.ok) throw new Error(`Data fetch failed: ${res.status}`)

  const json = await res.json()
  const rows = (resolvePath(json, config.dataPath) as TransStackRow[]) || []
  const total = (resolvePath(json, config.totalCountPath) as number) || rows.length

  return { rows, total }
}

// ── Action Handler Registry ──────────────────────────────────────────

let _handlers: TanStackTableActionHandlers = {}

/** Register action handlers for the TanStack Table component. Call from the renderer app. */
export function registerTanStackTableHandlers(handlers: TanStackTableActionHandlers): void {
  _handlers = { ..._handlers, ...handlers }
}

/** Get the currently registered action handlers. Used internally by the table component. */
export function getTanStackTableHandlers(): TanStackTableActionHandlers {
  return _handlers
}
