/**
 * Per-environment logging configuration for the kolea shared package.
 *
 * This is the single file to edit when you need to change logging behaviour
 * for a specific deployment environment.
 *
 * ── Override precedence (highest → lowest) ───────────────────────────────
 *  1. Runtime API call  : configureSharedLogger({ level, enabled })
 *  2. Env-var override  : NEXT_PUBLIC_SHARED_PACKAGE_LOG_LEVEL
 *                         NEXT_PUBLIC_ENABLE_SHARED_PACKAGE_LOGS=true
 *                         window.__KOLEA_SHARED_LOG_LEVEL__
 *                         window.__KOLEA_SHARED_LOGS__
 *  3. This config file  : loggerConfig[appEnvironment] (edit here)
 *
 * ── Environment detection ─────────────────────────────────────────────────
 * The active environment is read from NEXT_PUBLIC_APP_ENV first, then
 * NODE_ENV. Any unknown value falls back to 'development'.
 *
 * ── Disabling logging ─────────────────────────────────────────────────────
 * Set `enabled: false` for the target environment, or set `level` to
 * 'silent' — either will suppress all output for that environment.
 */

export type AppEnvironment = 'development' | 'staging' | 'production'

export interface LoggerEnvironmentConfig {
  /** Whether the logger emits any output in this environment. */
  enabled: boolean
  /**
   * Minimum level to emit.
   * Messages below this level are silently dropped.
   * 'silent' suppresses everything regardless of `enabled`.
   */
  level: 'debug' | 'info' | 'warn' | 'error' | 'silent'
}

/**
 * Edit this table to control logging per environment.
 *
 * To disable logging in an environment, either:
 *   • set  enabled: false, or
 *   • set  level: 'silent'
 */
export const loggerConfig: Record<AppEnvironment, LoggerEnvironmentConfig> = {
  development: {
    enabled: true,
    level: 'debug',
  },
  staging: {
    enabled: true,
    level: 'info',
  },
  production: {
    enabled: true,
    level: 'error',
  },
}
