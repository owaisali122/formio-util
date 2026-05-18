'use client'

import React from 'react'

import { TransStackReact } from '../../../coreHelper/TransStackCore/TransStackCore'
import type { ReactTranstackTableProps } from './ReactTranstackTable.types'

/**
 * ReactTranstackTable — standalone React wrapper for the TanStack Table component.
 *
 * Renders TransStackCore directly. Adds optional className/style chrome.
 */
export function ReactTranstackTable({
  className,
  style,
  ...coreProps
}: ReactTranstackTableProps) {
  return (
    <div className={className} style={style}>
      <TransStackReact {...coreProps} />
    </div>
  )
}
