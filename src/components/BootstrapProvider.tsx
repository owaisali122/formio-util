'use client'

import React, { useEffect, useState } from 'react'

const SCOPE_SELECTORS = [
  '.bootstrap-scope',
  '.formio-modal',
  '.formio-dialog',
  '.formio-edit-form',
  '.formio-builder-dialog',
  '.formio-builder',
  '.formbuilder',
].join(', ')

function scopeBootstrapCss(css: string): string {
  const skipPattern = /@(?:media|keyframes|import|supports)\b/
  const lines = css.split('\n')
  const out: string[] = []
  let inRule = false
  let currentSelectors: string[] = []
  let currentBody = ''

  for (const line of lines) {
    if (skipPattern.test(line.trim()) || line.trim().startsWith('@')) {
      if (inRule) {
        out.push(
          currentSelectors.map((s) => `${SCOPE_SELECTORS} ${s}`).join(', ') + currentBody
        )
        inRule = false
      }
      out.push(line)
      continue
    }

    const open = line.indexOf('{')
    if (open !== -1) {
      const selectors = line
        .slice(0, open)
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
      const body = line.slice(open)
      if (selectors.length) {
        const scoped = selectors.map((s) => `${SCOPE_SELECTORS} ${s}`).join(', ')
        out.push(scoped + body)
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

declare global {
  interface Window {
    __formBuilderBootstrapCount?: number
    __formioConfig?: { bootstrapCssUrl?: string; formioCssUrl?: string }
  }
}

function getBootstrapCssUrl(): string {
  const url =
    typeof window !== 'undefined' ? window.__formioConfig?.bootstrapCssUrl : undefined
  return url ?? '/api/bootstrap-css'
}

function getFormioCssUrl(): string {
  const url =
    typeof window !== 'undefined' ? window.__formioConfig?.formioCssUrl : undefined
  return url ?? '/api/formio-css'
}

export function BootstrapProvider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const isFirst = (window.__formBuilderBootstrapCount ?? 0) === 0
    window.__formBuilderBootstrapCount = (window.__formBuilderBootstrapCount ?? 0) + 1

    if (!isFirst) {
      setMounted(true)
      return () => {
        window.__formBuilderBootstrapCount! -= 1
      }
    }

    const styleId = 'form-builder-bootstrap-scoped'
    const formioStyleId = 'form-builder-formio-css'

    Promise.all([
      fetch(getBootstrapCssUrl()).then((r) => r.text()),
      fetch(getFormioCssUrl()).then((r) => r.text()),
    ]).then(([bootstrapCss, formioCss]) => {
      const scoped = scopeBootstrapCss(bootstrapCss)
      const extra = `
        .bootstrap-scope { isolation: isolate; contain: layout style paint; }
        .formio-modal, .formio-dialog, .formio-edit-form, .formio-builder-dialog { isolation: isolate; }
      `
      let el = document.getElementById(styleId)
      if (!el) {
        el = document.createElement('style')
        el.id = styleId
        document.head.appendChild(el)
      }
      el.textContent = scoped + extra

      let formioEl = document.getElementById(formioStyleId)
      if (!formioEl) {
        formioEl = document.createElement('style')
        formioEl.id = formioStyleId
        document.head.appendChild(formioEl)
      }
      formioEl.textContent = formioCss
      setMounted(true)
    })

    return () => {
      window.__formBuilderBootstrapCount! -= 1
      if (window.__formBuilderBootstrapCount === 0) {
        document.getElementById(styleId)?.remove()
        document.getElementById(formioStyleId)?.remove()
      }
    }
  }, [])

  return (
    <div className="bootstrap-scope formio-builder formbuilder">
      {mounted ? children : null}
    </div>
  )
}
