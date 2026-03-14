/**
 * Server utilities for form schema retrieval.
 * LOCKED: App passes SCHEMA_DATABASE_URL (and optional table/schema) to library on each call; library does not read env.
 */

export { getFormBySlug, getFormById, getFormsBySlugs } from './schema-reader'
export type { DbConfig, Form, FormMetadata } from './types'
export type { SchemaConnectionOptions } from './schema-reader'
