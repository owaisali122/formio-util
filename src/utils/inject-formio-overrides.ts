import { formioOverridesCss } from '../styles/formio-overrides'

const STYLE_ID = 'form-builder-formio-overrides'

/** Injects formio overrides into document.head. Safe to call from FormBuilder or FormRenderer on mount. */
export function injectFormioOverrides(): void {
  if (typeof document === 'undefined') return
  let el = document.getElementById(STYLE_ID) as HTMLStyleElement | null
  if (!el) {
    el = document.createElement('style')
    el.id = STYLE_ID
    document.head.appendChild(el)
  }
  el.textContent = formioOverridesCss
}
