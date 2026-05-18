import type { TransStackCoreProps } from '../../../coreHelper/TransStackCore/TransStackCore.types'

/**
 * ReactTranstackTable — public standalone props.
 *
 * Extends TransStackCoreProps with optional chrome (className, style).
 */
export interface ReactTranstackTableProps extends TransStackCoreProps {
  /** Additional className applied to the wrapper div. */
  className?: string
  /** Inline style on the wrapper div. */
  style?: React.CSSProperties
}
