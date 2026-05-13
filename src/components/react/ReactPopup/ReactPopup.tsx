'use client'

/**
 * ReactPopup — standalone React popup/modal.
 *
 * Thin wrapper over the shared PopupModal core (src/client/popup/PopupModal.tsx),
 * following the same pattern as ReactFileUploader → FileUploaderCore.
 *
 * Any change to popup rendering, variants, icons, defaults, or behavior belongs
 * in PopupModal.tsx — it is automatically reflected here without code changes.
 *
 * This component adds only:
 *   - Controlled `open` prop (the consumer owns visibility state)
 *   - BootstrapProvider (ensures scoped CSS in standalone React contexts)
 *   - React Portal (renders into document.body, above all z-index layers)
 *   - SSR guard (returns null on the server)
 */

import React from 'react'
import { createPortal } from 'react-dom'

import { BootstrapProvider } from '../../BootstrapProvider'
import { PopupModal } from '../../../coreHelper/PopupCore/PopupCore'
import type { ReactPopupProps } from './ReactPopup.types'

/**
 * Usage:
 *   const [open, setOpen] = useState(false)
 *   <ReactPopup
 *     open={open}
 *     title="Delete record?"
 *     message="This action cannot be undone."
 *     variant="delete"
 *     payload={{ recordId: 42 }}
 *     onAction={(key, p) => key === 'delete' && deleteRecord(p.recordId as number)}
 *     onClose={() => setOpen(false)}
 *   />
 */
export function ReactPopup({
  open,
  payload = {},
  className,
  children,
  onClose,
  ...config
}: ReactPopupProps) {
  if (!open) return null
  if (typeof document === 'undefined') return null

  return (
    <BootstrapProvider>
      {createPortal(
        <PopupModal
          config={config}
          payload={payload}
          onClose={onClose ?? (() => {})}
          className={className}
        >
          {children}
        </PopupModal>,
        document.body,
      )}
    </BootstrapProvider>
  )
}

export default ReactPopup

