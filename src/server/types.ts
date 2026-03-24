/**
 * Database Configuration for Form Schema Retrieval
 * 
 * Required for consuming Next.js apps to initialize schema fetching.
 * Each app configures this once with their own DB connection details.
 */
export interface DbConfig {
  /** PostgreSQL connection string (e.g., postgresql://user:pass@localhost:5432/dbname) */
  connectionString: string
  
  /** Table name where forms are stored (required, e.g. 'forms') */
  tableName: string
  
  /** Schema name in database (default: 'public') */
  schemaName?: string
}

/**
 * Form Schema Type returned from database
 */
export interface Form {
  id: number
  title: string
  slug: string
  description?: string
  status: 'draft' | 'published'
  schema: any // FormIO JSON schema
  settings?: {
    submitButtonText?: string
    successMessage?: string
    allowMultipleSubmissions?: boolean
  }
  created_at?: Date
  updated_at?: Date
}

/**
 * Form Metadata for client components
 */
export interface FormMetadata {
  id: number
  title: string
  slug: string
  description?: string
}
