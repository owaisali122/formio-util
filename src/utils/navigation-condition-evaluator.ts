import type { NavigationCondition } from '../types/wizard-navigation'

/**
 * Evaluates a single navigation condition against form submission data.
 * Uses safe operators only — no eval, no new Function.
 */
function evaluateSingleCondition(
  condition: NavigationCondition,
  data: Record<string, unknown>
): boolean {
  const { field, operator, value } = condition
  const fieldValue = getNestedValue(data, field)

  switch (operator) {
    case 'equals':
      return fieldValue === value
    case 'notEquals':
      return fieldValue !== value
    case 'exists':
      return fieldValue !== undefined && fieldValue !== null
    case 'notExists':
      return fieldValue === undefined || fieldValue === null
    case 'truthy':
      return !!fieldValue
    case 'falsy':
      return !fieldValue
    default:
      return true
  }
}

/**
 * Safely retrieves a nested value from an object using dot-notation path.
 * Example: getNestedValue({ a: { b: 1 } }, 'a.b') => 1
 */
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  if (!path || !obj) return undefined
  const parts = path.split('.')
  let current: unknown = obj
  for (const part of parts) {
    if (current == null || typeof current !== 'object') return undefined
    current = (current as Record<string, unknown>)[part]
  }
  return current
}

/**
 * Evaluates an array of conditions (AND logic). All must pass for result to be true.
 * Returns true if conditions array is empty or undefined.
 */
export function evaluateConditions(
  conditions: NavigationCondition[] | undefined,
  data: Record<string, unknown>
): boolean {
  if (!conditions || conditions.length === 0) return true
  return conditions.every((c) => evaluateSingleCondition(c, data))
}
