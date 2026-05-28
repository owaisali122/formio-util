/**
 * Form.io Progress Bar — Designer (builder-side) component definition.
 *
 * Reference pattern: PopupComponent (src/components/PopupComponent.tsx)
 *
 * Three modes:
 *  - manual : a fixed percentage set directly in the Configure tab
 *  - values : provide a "current" data key and a "total" data key;
 *             the component calculates (current / total) × 100 live
 *  - auto   : automatically tracks the parent wizard's current page position;
 *             progress = ((page + 1) / totalPages) × 100
 */

export const PROGRESS_BAR_TYPE = 'progressBar'

export interface ProgressBarSchema {
  type: string
  label: string
  key: string
  input: boolean
  tableView: boolean
  /** 'manual' | 'values' | 'auto' */
  progressMode: string
  /** 0–100; used when progressMode === 'manual' */
  manualValue: number
  /** Form data key for the current count; used when progressMode === 'values' */
  currentValueKey: string
  /** Form data key for the total count; used when progressMode === 'values' */
  totalValueKey: string
  /** Bootstrap contextual color: primary | success | info | warning | danger */
  barColor: string
  /** CSS height string, e.g. '20px' */
  barHeight: string
  /** Show the percentage as text inside the bar */
  showPercentLabel: boolean
  /** Animate width changes with a CSS transition */
  animated: boolean
  /** Show "Step X of Y" text */
  showStepText: boolean
  /** Position of step text relative to the bar */
  stepTextPosition: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
  /** Optional override for the current step number */
  currentStep?: number
  /** Optional override for the total steps number */
  totalSteps?: number
  [k: string]: unknown
}

export class ProgressBarComponent {
  static schema(overrides?: Partial<ProgressBarSchema>): ProgressBarSchema {
    return {
      type: PROGRESS_BAR_TYPE,
      label: 'Progress Bar',
      key: 'progressBar',
      input: false,
      tableView: false,
      progressMode: 'manual',
      manualValue: 50,
      currentValueKey: '',
      totalValueKey: '',
      barColor: 'primary',
      barHeight: '20px',
      showPercentLabel: true,
      animated: true,
      showStepText: false,
      stepTextPosition: 'top-left',
      ...overrides,
    }
  }

  static get builderInfo() {
    return {
      title: 'Progress Bar',
      group: 'basic',
      icon: 'tasks',
      weight: 36,
      documentation: 'Animated progress bar. Manual, calculated (current ÷ total), or auto wizard-page tracking.',
      schema: ProgressBarComponent.schema(),
    }
  }

  static editForm() {
    return {
      components: [
        {
          type: 'tabs',
          key: 'tabs',
          components: [
            // ── Display tab ────────────────────────────────────────────────
            {
              label: 'Display',
              key: 'display',
              components: [
                {
                  type: 'textfield',
                  key: 'label',
                  label: 'Label',
                  input: true,
                  defaultValue: 'Progress Bar',
                  weight: 5,
                },
                {
                  type: 'textfield',
                  key: 'key',
                  label: 'Property Name',
                  input: true,
                  required: true,
                  weight: 10,
                },
                {
                  type: 'checkbox',
                  key: 'showStepText',
                  label: 'Show Step Text',
                  input: true,
                  defaultValue: false,
                  weight: 15,
                  description: 'When enabled, displays "Step X of Y" text near the progress bar.',
                },
                {
                  type: 'select',
                  key: 'stepTextPosition',
                  label: 'Step Text Position',
                  input: true,
                  defaultValue: 'top-left',
                  weight: 16,
                  conditional: { show: true, when: 'showStepText', eq: true },
                  data: {
                    values: [
                      { label: 'Top Left', value: 'top-left' },
                      { label: 'Top Right', value: 'top-right' },
                      { label: 'Bottom Left', value: 'bottom-left' },
                      { label: 'Bottom Right', value: 'bottom-right' },
                    ],
                  },
                },
                {
                  type: 'number',
                  key: 'currentStep',
                  label: 'Current Step',
                  input: true,
                  weight: 17,
                  conditional: { show: true, when: 'showStepText', eq: true },
                  description: 'Optional override. If empty, uses wizard page position.',
                },
                {
                  type: 'number',
                  key: 'totalSteps',
                  label: 'Total Steps',
                  input: true,
                  weight: 18,
                  conditional: { show: true, when: 'showStepText', eq: true },
                  description: 'Optional override. If empty, uses wizard total page count.',
                },
              ],
            },
            // ── Configure tab ──────────────────────────────────────────────
            {
              label: 'Configure',
              key: 'configure',
              components: [
                {
                  type: 'select',
                  key: 'progressMode',
                  label: 'Progress Mode',
                  input: true,
                  defaultValue: 'manual',
                  weight: 10,
                  data: {
                    values: [
                      { label: 'Manual (fixed percentage)', value: 'manual' },
                      { label: 'Values (current ÷ total)', value: 'values' },
                      { label: 'Auto (wizard page position)', value: 'auto' },
                    ],
                  },
                  description:
                    'Manual: enter a fixed %. Values: provide two data keys and the component calculates the %. Auto: tracks the parent wizard page automatically.',
                },
                // manual ─────────────────────────────────────────────────────
                {
                  type: 'number',
                  key: 'manualValue',
                  label: 'Progress Value (0–100)',
                  input: true,
                  defaultValue: 50,
                  weight: 20,
                  validate: { min: 0, max: 100 },
                  conditional: { show: true, when: 'progressMode', eq: 'manual' },
                  description: 'Fixed percentage to display.',
                },
                // values ──────────────────────────────────────────────────────
                {
                  type: 'textfield',
                  key: 'currentValueKey',
                  label: 'Current Value Key',
                  input: true,
                  weight: 20,
                  conditional: { show: true, when: 'progressMode', eq: 'values' },
                  description:
                    'Form data key that holds the current progress count (e.g. "completedSteps").',
                },
                {
                  type: 'textfield',
                  key: 'totalValueKey',
                  label: 'Total Value Key',
                  input: true,
                  weight: 30,
                  conditional: { show: true, when: 'progressMode', eq: 'values' },
                  description:
                    'Form data key that holds the total count (e.g. "totalSteps"). Progress = current ÷ total × 100.',
                },
                // shared ──────────────────────────────────────────────────────
                {
                  type: 'select',
                  key: 'barColor',
                  label: 'Color',
                  input: true,
                  defaultValue: 'primary',
                  weight: 40,
                  data: {
                    values: [
                      { label: 'Primary (blue)', value: 'primary' },
                      { label: 'Success (green)', value: 'success' },
                      { label: 'Info (cyan)', value: 'info' },
                      { label: 'Warning (yellow)', value: 'warning' },
                      { label: 'Danger (red)', value: 'danger' },
                    ],
                  },
                },
                {
                  type: 'textfield',
                  key: 'barHeight',
                  label: 'Bar Height',
                  input: true,
                  defaultValue: '20px',
                  weight: 50,
                  description: 'CSS height value (e.g. "20px", "1.5rem").',
                },
                {
                  type: 'checkbox',
                  key: 'showPercentLabel',
                  label: 'Show Percentage Label',
                  input: true,
                  defaultValue: true,
                  weight: 60,
                },
                {
                  type: 'checkbox',
                  key: 'animated',
                  label: 'Animated (smooth width transition)',
                  input: true,
                  defaultValue: true,
                  weight: 70,
                },
              ],
            },
          ],
        },
      ],
    }
  }
}
