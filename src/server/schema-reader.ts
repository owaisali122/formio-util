/**
 * Server-side Form Schema Reader
 * ---------------------------------------------------------------------------
 * LOCKED: Schema API is stable. Do not change.
 * App (e.g. app-renderer) always passes parameters to the library on each call:
 *   - connection: SCHEMA_DATABASE_URL (or full DbConfig)
 *   - optional: tableName, schemaName via options
 * Library does not read env; app sends whatever URL/table/schema it uses.
 * ---------------------------------------------------------------------------
 *
 * Example:
 *   const form = await getFormBySlug(process.env.SCHEMA_DATABASE_URL!, 'contact-us')
 * Or with table/schema:
 *   const form = await getFormBySlug(process.env.SCHEMA_DATABASE_URL!, slug, { tableName: 'forms', schemaName: 'public' })
 */

import postgres from 'postgres'
import { type DbConfig, type Form } from './types'

export type SchemaConnectionOptions = {
  tableName?: string
  schemaName?: string
}

function normalizeDbConfig(
  connectionOrConfig: string | DbConfig,
  options?: SchemaConnectionOptions
): DbConfig {
  if (typeof connectionOrConfig === 'string') {
    if (!connectionOrConfig) throw new Error('SCHEMA_DATABASE_URL (connection string) is required')
    return {
      connectionString: connectionOrConfig,
      tableName: options?.tableName ?? 'forms',
      schemaName: options?.schemaName ?? 'public',
    }
  }
  return connectionOrConfig
}

/**
 * Get a single form by slug from database.
 * @param connectionOrConfig - SCHEMA_DATABASE_URL (string) or full DbConfig; app passes e.g. process.env.SCHEMA_DATABASE_URL
 * @param slug - Form slug
 * @param options - Optional when using connection string: tableName, schemaName
 * @returns Form or null if not found / not published
 */
export async function getFormBySlug(
  connectionOrConfig: string | DbConfig,
  slug: string,
  options?: SchemaConnectionOptions
): Promise<Form | null> {
  const dbConfig = normalizeDbConfig(
    connectionOrConfig,
    typeof connectionOrConfig === 'object' ? undefined : options
  )
  try {
    if (!dbConfig?.connectionString) {
      throw new Error('DbConfig.connectionString is required')
    }

    if (!dbConfig.tableName) {
      throw new Error('DbConfig.tableName is required')
    }

    const tableName = dbConfig.tableName
    const schemaName = dbConfig.schemaName || 'public'
    const fullTableName = `${schemaName}.${tableName}`

    const sql = postgres(dbConfig.connectionString)

    try {
      const result = await sql`
        SELECT 
          id,
          title,
          slug,
          description,
          status,
          schema,
          settings_submit_button_text,
          settings_success_message,
          settings_allow_multiple_submissions,
          created_at,
          updated_at
        FROM ${sql(fullTableName)}
        WHERE slug = ${slug} AND status = 'published'
        LIMIT 1
      `

      if (result.length === 0) {
        return null
      }

      const row = result[0]
      return {
        id: row.id as number,
        title: row.title as string,
        slug: row.slug as string,
        description: (row.description as string) || undefined,
        status: (row.status as 'draft' | 'published') || 'published',
        schema: typeof row.schema === 'string' ? JSON.parse(row.schema as string) : row.schema,
        settings: {
          submitButtonText: (row.settings_submit_button_text as string) || undefined,
          successMessage: (row.settings_success_message as string) || undefined,
          allowMultipleSubmissions: (row.settings_allow_multiple_submissions as boolean) ?? undefined,
        },
        created_at: row.created_at as Date | undefined,
        updated_at: row.updated_at as Date | undefined,
      } as Form
    } finally {
      await sql.end()
    }
  } catch (error) {
    console.error('Error fetching form by slug:', error)
    throw error
  }
}

/**
 * Get a single form by ID from database
 * Returns null if not found or not published
 */
export async function getFormById(
  dbConfig: DbConfig,
  id: number
): Promise<Form | null> {
  try {
    if (!dbConfig?.connectionString) {
      throw new Error('DbConfig.connectionString is required')
    }

    if (!dbConfig.tableName) {
      throw new Error('DbConfig.tableName is required')
    }

    const tableName = dbConfig.tableName
    const schemaName = dbConfig.schemaName || 'public'
    const fullTableName = `${schemaName}.${tableName}`

    const sql = postgres(dbConfig.connectionString)

    try {
      const result = await sql`
        SELECT 
          id,
          title,
          slug,
          description,
          status,
          schema,
          settings_submit_button_text,
          settings_success_message,
          settings_allow_multiple_submissions,
          created_at,
          updated_at
        FROM ${sql(fullTableName)}
        WHERE id = ${id} AND status = 'published'
        LIMIT 1
      `

      if (result.length === 0) {
        return null
      }

      const row = result[0]
      return {
        id: row.id as number,
        title: row.title as string,
        slug: row.slug as string,
        description: (row.description as string) || undefined,
        status: (row.status as 'draft' | 'published') || 'published',
        schema: typeof row.schema === 'string' ? JSON.parse(row.schema as string) : row.schema,
        settings: {
          submitButtonText: (row.settings_submit_button_text as string) || undefined,
          successMessage: (row.settings_success_message as string) || undefined,
          allowMultipleSubmissions: (row.settings_allow_multiple_submissions as boolean) ?? undefined,
        },
        created_at: row.created_at as Date | undefined,
        updated_at: row.updated_at as Date | undefined,
      } as Form
    } finally {
      await sql.end()
    }
  } catch (error) {
    console.error('Error fetching form by id:', error)
    throw error
  }
}

/**
 * Get multiple forms by slugs from database
 * Returns only published forms, in the order requested
 */
export async function getFormsBySlugs(
  dbConfig: DbConfig,
  slugs: string[]
): Promise<Form[]> {
  try {
    if (!dbConfig?.connectionString) {
      throw new Error('DbConfig.connectionString is required')
    }

    if (slugs.length === 0) return []

    if (!dbConfig.tableName) {
      throw new Error('DbConfig.tableName is required')
    }

    const tableName = dbConfig.tableName
    const schemaName = dbConfig.schemaName || 'public'
    const fullTableName = `${schemaName}.${tableName}`

    const sql = postgres(dbConfig.connectionString)

    try {
      const result = await sql`
        SELECT 
          id,
          title,
          slug,
          description,
          status,
          schema,
          settings_submit_button_text,
          settings_success_message,
          settings_allow_multiple_submissions,
          created_at,
          updated_at
        FROM ${sql(fullTableName)}
        WHERE slug = ANY(${slugs}) AND status = 'published'
        ORDER BY array_position(${slugs}::text[], slug)
      `

      return result.map((row: any) => ({
        id: row.id as number,
        title: row.title as string,
        slug: row.slug as string,
        description: (row.description as string) || undefined,
        status: (row.status as 'draft' | 'published') || 'published',
        schema: typeof row.schema === 'string' ? JSON.parse(row.schema as string) : row.schema,
        settings: {
          submitButtonText: (row.settings_submit_button_text as string) || undefined,
          successMessage: (row.settings_success_message as string) || undefined,
          allowMultipleSubmissions: (row.settings_allow_multiple_submissions as boolean) ?? undefined,
        },
        created_at: row.created_at as Date | undefined,
        updated_at: row.updated_at as Date | undefined,
      })) as Form[]
    } finally {
      await sql.end()
    }
  } catch (error) {
    console.error('Error fetching forms by slugs:', error)
    throw error
  }
}
