'use client'

import React, { useEffect, useState } from 'react'
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
  const base = window.__formioConfig?.fontAwesomeFontsUrl ?? '/fonts/'
  const baseNorm = base.endsWith('/') ? base : base + '/'
  return raw.replace(/url\s*\(\s*['"]?\.\.\/fonts\//gi, `url('${baseNorm}`)
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

export function BootstrapProvider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const isFirst = (window.__formBuilderBootstrapCount ?? 0) === 0
    window.__formBuilderBootstrapCount = (window.__formBuilderBootstrapCount ?? 0) + 1

    if (!isFirst) {
      setMounted(true)
      return () => { window.__formBuilderBootstrapCount! -= 1 }
    }

    const ids = {
      main: 'form-builder-bootstrap-scoped',
      dialogs: 'form-builder-bootstrap-dialogs',
      formio: 'form-builder-formio-css',
      fontAwesome: 'form-builder-font-awesome',
    }

    const bootstrapUrl = window.__formioConfig?.bootstrapCssUrl ?? '/api/bootstrap-css'
    const formioUrl = window.__formioConfig?.formioCssUrl ?? '/api/formio-css'

    Promise.all([
      fetch(bootstrapUrl).then((r) => r.text()),
      fetch(formioUrl).then((r) => r.text()),
    ]).then(([bootstrapCss, formioCss]) => {
      const extra = `
        .bootstrap-scope { isolation: isolate; contain: layout style paint; }
        .formio-modal, .formio-dialog, .formio-edit-form, .formio-builder-dialog, .modal { isolation: isolate; }
      `
      getOrCreateStyle(ids.main).textContent = scopeCss(bootstrapCss, SCOPE_MAIN) + extra
      getOrCreateStyle(ids.dialogs).textContent = scopeCss(bootstrapCss, SCOPE_DIALOGS)
      getOrCreateStyle(ids.formio).textContent = formioCss
      getOrCreateStyle(ids.fontAwesome).textContent = getFontAwesomeCss()

      const order = [ids.main, ids.formio, ids.dialogs, ids.fontAwesome]
      order.forEach((id) => {
        const el = document.getElementById(id)
        if (el) {
          el.remove()
          document.head.appendChild(el)
        }
      })

      setMounted(true)
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
    <div className="bootstrap-scope formio-builder formbuilder">
      {mounted ? children : null}
    </div>
  )
}
