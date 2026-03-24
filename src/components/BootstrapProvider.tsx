'use client'

import React, { useEffect } from 'react'
import fontFacesCss from '../styles/generated/font-faces'
import isolationCss from '../styles/generated/isolation'
import bootstrapMainCss from '../styles/generated/bootstrap-main'
import bootstrapDialogsCss from '../styles/generated/bootstrap-dialogs'
import formioMainCss from '../styles/generated/formio-main'
import fontAwesomeScopedCss from '../styles/generated/font-awesome-scoped'

declare global {
  interface Window {
    __formBuilderBootstrapCount?: number
  }
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
  useEffect(() => {
    const isFirst = (window.__formBuilderBootstrapCount ?? 0) === 0
    window.__formBuilderBootstrapCount = (window.__formBuilderBootstrapCount ?? 0) + 1

    if (!isFirst) {
      return () => { window.__formBuilderBootstrapCount! -= 1 }
    }

    const ids = {
      fontFaces: 'form-builder-font-faces',
      isolation: 'form-builder-isolation',
      main: 'form-builder-bootstrap-scoped',
      dialogs: 'form-builder-bootstrap-dialogs',
      formio: 'form-builder-formio-css',
      fontAwesome: 'form-builder-font-awesome',
    }

    // All CSS is pre-scoped at build time — just inject as-is.
    getOrCreateStyle(ids.fontFaces).textContent = fontFacesCss
    getOrCreateStyle(ids.isolation).textContent = isolationCss
    getOrCreateStyle(ids.main).textContent = bootstrapMainCss
    getOrCreateStyle(ids.dialogs).textContent = bootstrapDialogsCss
    getOrCreateStyle(ids.formio).textContent = formioMainCss
    getOrCreateStyle(ids.fontAwesome).textContent = fontAwesomeScopedCss

    const order = [ids.fontFaces, ids.isolation, ids.main, ids.formio, ids.dialogs, ids.fontAwesome]
    order.forEach((id) => {
      const el = document.getElementById(id)
      if (el) {
        el.remove()
        document.head.appendChild(el)
      }
    })

    return () => {
      window.__formBuilderBootstrapCount! -= 1
      if (window.__formBuilderBootstrapCount === 0) {
        [ids.fontFaces, ids.isolation, ids.main, ids.dialogs, ids.formio, ids.fontAwesome].forEach((id) =>
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
