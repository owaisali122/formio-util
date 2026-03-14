'use client'

import React, { useEffect } from 'react'
import fontAwesomeCss from 'font-awesome/css/font-awesome.css'

const SCOPE_MAIN = '.bootstrap-scope, .formio-builder, .formbuilder'
const SCOPE_DIALOGS = '.formio-modal, .formio-dialog, .formio-edit-form, .formio-builder-dialog, .modal'

declare global {
  interface Window {
    __formBuilderBootstrapCount?: number
    __formioConfig?: {
      bootstrapCssUrl?: string
      formioCssUrl?: string
      fontAwesomeFontsUrl?: string
    }
  }
}

function toCssString(css: unknown): string {
  if (typeof css === 'string') return css
  const def = (css as { default?: string })?.default
  return typeof def === 'string' ? def : ''
}

function getFontAwesomeCss(): string {
  const raw = toCssString(fontAwesomeCss)
  const base =
    window.__formioConfig?.fontAwesomeFontsUrl ??
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/fonts/'
  const baseNorm = base.endsWith('/') ? base : base + '/'
  return raw
    .replace(/url\s*\(\s*['"]?\.\.\/fonts\//gi, `url('${baseNorm}`)
    .replace(/url\s*\(\s*['"]?\/fonts\//gi, `url('${baseNorm}`)
}

function rewriteCssAssetUrls(css: string, sourceUrl: string, fontAwesomeBase: string): string {
  if (!css) return css
  const faBase = fontAwesomeBase.endsWith('/') ? fontAwesomeBase : `${fontAwesomeBase}/`
  return css.replace(/url\(\s*(['"]?)(.*?)\1\s*\)/gi, (_m, quote: string, rawPath: string) => {
    const p = String(rawPath || '').trim()
    if (!p) return _m
    if (
      p.startsWith('data:') ||
      p.startsWith('http://') ||
      p.startsWith('https://') ||
      p.startsWith('//') ||
      p.startsWith('#')
    ) {
      return `url(${quote}${p}${quote})`
    }

    // Form.io/FA sometimes references root /fonts/* which breaks in consumers.
    if (/^\/fonts\/fontawesome-webfont\./i.test(p)) {
      const fileWithQuery = p.replace(/^\/fonts\//i, '')
      return `url(${quote}${faBase}${fileWithQuery}${quote})`
    }

    try {
      const abs = new URL(p, sourceUrl).toString()
      return `url(${quote}${abs}${quote})`
    } catch {
      return `url(${quote}${p}${quote})`
    }
  })
}

function scopeCss(css: string, scope: string): string {
  const skip = /@(?:media|keyframes|import|supports)\b/
  const lines = css.split('\n')
  const out: string[] = []
  let inRule = false
  let sel: string[] = []
  let body = ''

  for (const line of lines) {
    if (skip.test(line.trim()) || line.trim().startsWith('@')) {
      if (inRule && sel.length) {
        out.push(sel.map((s) => `${scope} ${s}`).join(', ') + body)
        inRule = false
        sel = []
        body = ''
      }
      out.push(line)
      continue
    }
    const i = line.indexOf('{')
    if (i !== -1) {
      const parts = line.slice(0, i).split(',').map((s) => s.trim()).filter(Boolean)
      const b = line.slice(i)
      if (parts.length) {
        out.push(parts.map((s) => `${scope} ${s}`).join(', ') + b)
      } else {
        out.push(line)
      }
      inRule = line.indexOf('}') === -1
      continue
    }
    if (inRule) {
      out.push(line)
      if (line.includes('}')) inRule = false
    } else {
      out.push(line)
    }
  }
  return out.join('\n')
}

function getOrCreateStyle(id: string): HTMLStyleElement {
  let el = document.getElementById(id) as HTMLStyleElement | null
  if (!el) {
    el = document.createElement('style')
    el.id = id
    document.head.appendChild(el)
  }
  return el
}

function stripSourceMapComments(css: string): string {
  return css
    .replace(/\/\*# sourceMappingURL=.*?\*\//g, '')
    .replace(/\/\/# sourceMappingURL=.*$/gm, '')
}

export function BootstrapProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const isFirst = (window.__formBuilderBootstrapCount ?? 0) === 0
    window.__formBuilderBootstrapCount = (window.__formBuilderBootstrapCount ?? 0) + 1

    if (!isFirst) {
      return () => { window.__formBuilderBootstrapCount! -= 1 }
    }

    const ids = {
      main: 'form-builder-bootstrap-scoped',
      dialogs: 'form-builder-bootstrap-dialogs',
      formio: 'form-builder-formio-css',
      fontAwesome: 'form-builder-font-awesome',
    }

    const BOOTSTRAP_CDN = 'https://cdn.jsdelivr.net/npm/bootstrap@3.4.1/dist/css/bootstrap.min.css'
    const FORMIO_CDN = 'https://cdn.jsdelivr.net/npm/formiojs@4.21.7/dist/formio.full.min.css'

    const bootstrapUrl = window.__formioConfig?.bootstrapCssUrl ?? BOOTSTRAP_CDN
    const formioUrl = window.__formioConfig?.formioCssUrl ?? FORMIO_CDN

    const fetchWithFallback = async (
      url: string,
      cdnUrl: string
    ): Promise<{ css: string; sourceUrl: string }> => {
      try {
        const r = await fetch(url)
        if (r.ok) return { css: await r.text(), sourceUrl: r.url || url }
      } catch {
        // ignore and try fallback
      }
      try {
        const r2 = await fetch(cdnUrl)
        if (r2.ok) return { css: await r2.text(), sourceUrl: r2.url || cdnUrl }
      } catch {
        // ignore and return empty css so UI still mounts
      }
      return { css: '', sourceUrl: cdnUrl }
    }

    Promise.all([
      fetchWithFallback(bootstrapUrl, BOOTSTRAP_CDN),
      fetchWithFallback(formioUrl, FORMIO_CDN),
    ]).then(([bootstrapResult, formioResult]) => {
      const fontBase =
        window.__formioConfig?.fontAwesomeFontsUrl ??
        'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/fonts/'
      const bootstrapCssClean = stripSourceMapComments(
        rewriteCssAssetUrls(bootstrapResult.css, bootstrapResult.sourceUrl, fontBase)
      )
      const formioCssClean = stripSourceMapComments(
        rewriteCssAssetUrls(formioResult.css, formioResult.sourceUrl, fontBase)
      )
      const extra = `
        .bootstrap-scope { isolation: isolate; contain: layout style paint; }
        .formio-modal, .formio-dialog, .formio-edit-form, .formio-builder-dialog, .modal { isolation: isolate; }
      `
      getOrCreateStyle(ids.main).textContent = scopeCss(bootstrapCssClean, SCOPE_MAIN) + extra
      getOrCreateStyle(ids.dialogs).textContent = scopeCss(bootstrapCssClean, SCOPE_DIALOGS)
      getOrCreateStyle(ids.formio).textContent = formioCssClean
      getOrCreateStyle(ids.fontAwesome).textContent = getFontAwesomeCss()

      const order = [ids.main, ids.formio, ids.dialogs, ids.fontAwesome]
      order.forEach((id) => {
        const el = document.getElementById(id)
        if (el) {
          el.remove()
          document.head.appendChild(el)
        }
      })

    }).catch(() => {
      // Never block form rendering if CSS loading fails.
    })

    return () => {
      window.__formBuilderBootstrapCount! -= 1
      if (window.__formBuilderBootstrapCount === 0) {
        [ids.main, ids.dialogs, ids.formio, ids.fontAwesome].forEach((id) =>
          document.getElementById(id)?.remove()
        )
      }
    }
  }, [])

  return (
    <div className="bootstrap-scope">
      {children}
    </div>
  )
}
