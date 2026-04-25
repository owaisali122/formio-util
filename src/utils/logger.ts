/**
 * Centralized structured logger for the kolea shared package.
 *
 * ── Node.js (server, build, SSR) ──────────────────────────────────────────
 * Winston is the active logger. The root Winston logger is created once and
 * every `createComponentLogger()` call returns a `winston.child()` instance
 * bound to that component's context object. This means component metadata
 * (component name, form key, action, …) is attached natively by Winston at
 * the transport level — no manual payload merging required.
 *
 * Output format (Node): JSON lines via `winston.format.json()`.
 *   { "level":"info","message":"…","component":"DatePicker","key":"dob",
 *     "timestamp":"2026-04-25T00:00:00.000Z" }
 *
 * ── Browser / edge runtime ────────────────────────────────────────────────
 * Winston is a Node-only library. When `window` is defined the logger falls
 * back to a structured `console.*` shim. The fallback output matches the
 * same payload shape so log drain tools that capture `console` output
 * receive identical fields.
 *
 * Winston is **never bundled** into the client output:
 *  1. It is listed as `external` in `tsup.config.ts`.
 *  2. The runtime `require('winston')` call is hidden from bundlers via a
 *     `Function(…)()` indirection so static analysis never resolves it.
 *  3. The `typeof window !== 'undefined'` guard prevents the require from
 *     running in browser contexts.
 *
 * ── Level / enable toggles (highest → lowest priority) ──────────────────
 * 1. configureSharedLogger({ level, enabled })     → runtime API override
 * 2. NEXT_PUBLIC_SHARED_PACKAGE_LOG_LEVEL          → env-var level override
 *    NEXT_PUBLIC_ENABLE_SHARED_PACKAGE_LOGS=true   → force-enable debug
 *    window.__KOLEA_SHARED_LOG_LEVEL__             → runtime window override
 *    window.__KOLEA_SHARED_LOGS__ = true           → runtime debug enable
 * 3. src/utils/logger.config.ts loggerConfig table → per-environment defaults
 *
 * ── Public API ────────────────────────────────────────────────────────────
 * • createComponentLogger(context) → ComponentLogger
 * • packageLogger
 * • configureSharedLogger({ level })
 * • maskTaxId, describeFile, truncate
 * • ComponentLogger, LogContext, LogLevel (types)
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent'

import { type AppEnvironment, loggerConfig } from './logger.config'

export interface LogContext {
  component: string
  key?: string
  action?: string
  [extra: string]: unknown
}

export interface ComponentLogger {
  debug: (message: string, meta?: Record<string, unknown>) => void
  info: (message: string, meta?: Record<string, unknown>) => void
  warn: (message: string, meta?: Record<string, unknown>) => void
  error: (message: string, error?: unknown, meta?: Record<string, unknown>) => void
  child: (extra: Record<string, unknown>) => ComponentLogger
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* Config                                                                      */
/* ─────────────────────────────────────────────────────────────────────────── */

interface LoggerConfig {
  level: LogLevel
  enabled: boolean
}

const LEVEL_RANK: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
  silent: 100,
}

function readEnv(name: string): string | undefined {
  try {
    const proc = (globalThis as unknown as { process?: { env?: Record<string, string | undefined> } }).process
    const v = proc?.env?.[name]
    return typeof v === 'string' ? v : undefined
  } catch {
    return undefined
  }
}

function readWindowFlag<T>(name: string): T | undefined {
  try {
    if (typeof window !== 'undefined') {
      return (window as unknown as Record<string, T | undefined>)[name]
    }
  } catch { /* no-op */ }
  return undefined
}

function resolveConfig(): LoggerConfig {
  // ── Priority 2: explicit env-var / window overrides ────────────────────
  const explicitLevel = (
    readEnv('NEXT_PUBLIC_SHARED_PACKAGE_LOG_LEVEL') ||
    readWindowFlag<string>('__KOLEA_SHARED_LOG_LEVEL__')
  ) as LogLevel | undefined

  const forceDebug =
    readEnv('NEXT_PUBLIC_ENABLE_SHARED_PACKAGE_LOGS') === 'true' ||
    readWindowFlag<boolean>('__KOLEA_SHARED_LOGS__') === true

  if (explicitLevel && explicitLevel in LEVEL_RANK) {
    return { level: explicitLevel, enabled: explicitLevel !== 'silent' }
  }
  if (forceDebug) return { level: 'debug', enabled: true }

  // ── Priority 3: per-environment config table (logger.config.ts) ────────
  const rawEnv =
    readEnv('NEXT_PUBLIC_APP_ENV') ||
    readEnv('NODE_ENV') ||
    'development'

  const knownEnvs: AppEnvironment[] = ['development', 'staging', 'production']
  const env: AppEnvironment = knownEnvs.includes(rawEnv as AppEnvironment)
    ? (rawEnv as AppEnvironment)
    : 'development'

  const envCfg = loggerConfig[env]
  return {
    level: envCfg.enabled ? envCfg.level : 'silent',
    enabled: envCfg.enabled && envCfg.level !== 'silent',
  }
}

let _config: LoggerConfig | null = null

function getConfig(): LoggerConfig {
  if (!_config) _config = resolveConfig()
  return _config
}

/** Override logger config at runtime (e.g. from tests or app bootstrap). */
export function configureSharedLogger(partial: Partial<LoggerConfig>): void {
  _config = { ...getConfig(), ...partial }
  // Drop the cached root logger so it is rebuilt with the updated level.
  _rootWinston = null
  _rootWinstonChecked = false
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* Winston backend (Node only, lazy-loaded)                                   */
/* ─────────────────────────────────────────────────────────────────────────── */

/**
 * Minimal structural interface for a Winston logger / child logger.
 * Typed here rather than via `import type winston` to avoid requiring
 * `@types/node` (Winston's own .d.ts files reference Node stream types).
 */
interface WinstonLike {
  log(level: string, message: string, meta?: Record<string, unknown>): void
  /** Create a child logger that includes `defaultMeta` on every entry. */
  child(defaultMeta: Record<string, unknown>): WinstonLike
}

let _rootWinston: WinstonLike | null = null
let _rootWinstonChecked = false

/**
 * Return the singleton Winston root logger, or null when running in a browser
 * / environment where Winston cannot be loaded.
 *
 * The `require('winston')` call is wrapped in `Function(…)()` so bundlers
 * (webpack, esbuild, tsup) do not statically resolve it. Combined with the
 * `typeof window` guard and marking `winston` as `external` in tsup, Winston
 * code never reaches client bundles.
 */
function getRootWinstonLogger(): WinstonLike | null {
  if (_rootWinstonChecked) return _rootWinston
  _rootWinstonChecked = true

  // Browser / edge runtimes where Winston is not available.
  if (typeof window !== 'undefined') return null

  try {
    // Retrieve `require` at runtime, opaquely, so bundlers skip this call.
    const req = Function(
      'return typeof require !== "undefined" ? require : null',
    )() as ((id: string) => unknown) | null

    if (!req) return null

    const w = req('winston') as {
      createLogger?: (opts: Record<string, unknown>) => WinstonLike
      format: {
        combine:   (...fmts: unknown[]) => unknown
        timestamp: (opts?: Record<string, unknown>) => unknown
        errors:    (opts: { stack: boolean }) => unknown
        json:      () => unknown
        colorize?: () => unknown
        simple?:   () => unknown
      }
      transports: { Console: new (opts?: Record<string, unknown>) => unknown }
    }
    if (!w?.createLogger) return null

    const cfg   = getConfig()
    const level = cfg.level === 'silent' ? 'error' : cfg.level

    _rootWinston = w.createLogger({
      level,
      silent: cfg.level === 'silent',
      defaultMeta: { service: 'kolea-shared-package' },
      format: w.format.combine(
        w.format.timestamp({ format: 'YYYY-MM-DDTHH:mm:ss.SSSZ' }),
        w.format.errors({ stack: true }),
        w.format.json(),
      ),
      transports: [new w.transports.Console()],
    })
    return _rootWinston
  } catch {
    return null
  }
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* Browser console fallback                                                    */
/* ─────────────────────────────────────────────────────────────────────────── */

function consoleFallback(
  level: Exclude<LogLevel, 'silent'>,
  context: LogContext,
  message: string,
  payload: Record<string, unknown>,
): void {
  const prefix = `[kolea/${context.component}${context.key ? `:${context.key}` : ''}]`
  // Merge context into payload to mirror what Winston would attach via child().
  const full: Record<string, unknown> = { ...context, ...payload }
  const fn =
    level === 'error' ? console.error :
    level === 'warn'  ? console.warn  :
    level === 'debug' ? (console.debug ?? console.log) :
                        (console.info  ?? console.log)
  try {
    fn.call(console, prefix, message, full)
  } catch { /* console unavailable (SSR edge runtime) — ignore */ }
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* Shared helpers                                                              */
/* ─────────────────────────────────────────────────────────────────────────── */

function shouldLog(level: LogLevel): boolean {
  const cfg = getConfig()
  return cfg.enabled && LEVEL_RANK[level] >= LEVEL_RANK[cfg.level]
}

function safeError(err: unknown): Record<string, unknown> | undefined {
  if (err === undefined) return undefined
  if (err instanceof Error) {
    return { name: err.name, message: err.message, stack: err.stack }
  }
  if (typeof err === 'object' && err !== null) {
    try   { return { value: JSON.parse(JSON.stringify(err)) as unknown } }
    catch { return { value: String(err) } }
  }
  return { value: String(err) }
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* ComponentLogger factory                                                     */
/* ─────────────────────────────────────────────────────────────────────────── */

/**
 * Build and return a ComponentLogger.
 *
 * In Node: the logger is a `winston.child({ ...context })` instance.
 *   - All context fields (component, key, action, …) are attached natively
 *     by Winston's transport on every log entry.
 *   - Additional `meta` passed at call-site is merged into the log entry.
 *   - Error objects are serialised to { name, message, stack }.
 *
 * In browser: the logger emits structured `console.*` calls with the same
 *   payload shape so devtools / log-drain tools receive equivalent data.
 */
export function createComponentLogger(context: LogContext): ComponentLogger {
  const ctx = { ...context }

  /**
   * Get a Winston child logger for the current context.
   * Called lazily per-emit so that `configureSharedLogger()` is always
   * respected even for already-created component loggers.
   */
  function getChildWinston(): WinstonLike | null {
    const root = getRootWinstonLogger()
    return root ? root.child(ctx) : null
  }

  function emit(
    level: Exclude<LogLevel, 'silent'>,
    message: string,
    meta?: Record<string, unknown>,
    error?: unknown,
  ): void {
    if (!shouldLog(level)) return

    const errInfo = safeError(error)

    const childW = getChildWinston()
    if (childW) {
      // Winston path: context metadata is bound to the child logger.
      // We only pass additional call-site fields as the meta argument.
      const wMeta: Record<string, unknown> = {}
      if (meta)    Object.assign(wMeta, meta)
      if (errInfo) wMeta.error = errInfo
      childW.log(level, message, Object.keys(wMeta).length ? wMeta : undefined)
      return
    }

    // Browser / console fallback.
    const payload: Record<string, unknown> = {}
    if (meta)    Object.assign(payload, meta)
    if (errInfo) payload.error = errInfo
    consoleFallback(level, ctx, message, payload)
  }

  return {
    debug: (m, meta)       => emit('debug', m, meta),
    info:  (m, meta)       => emit('info',  m, meta),
    warn:  (m, meta)       => emit('warn',  m, meta),
    error: (m, err, meta)  => emit('error', m, meta, err),
    /**
     * Derive a child logger that merges `extra` into the existing context.
     * In Node this creates a new Winston child logger; in the browser it
     * creates a new console-fallback logger with the merged context.
     */
    child: (extra) => createComponentLogger({ ...ctx, ...extra }),
  }
}

/** Package-level logger for shared code paths (registry, server utils, etc.). */
export const packageLogger = createComponentLogger({ component: 'shared-package' })

/* ─────────────────────────────────────────────────────────────────────────── */
/* Sensitive-data helpers                                                      */
/* ─────────────────────────────────────────────────────────────────────────── */

/** Mask a tax-ID-like string, exposing only the last `keepLast` digits. */
export function maskTaxId(value: unknown, keepLast = 4): string {
  if (value == null) return ''
  const s = String(value).replace(/\D/g, '')
  if (!s) return ''
  if (s.length <= keepLast) return '*'.repeat(s.length)
  return '*'.repeat(s.length - keepLast) + s.slice(-keepLast)
}

/**
 * Return safe file metadata for logging — never includes base64 content.
 * Use this whenever logging information about an uploaded file.
 */
export function describeFile(file: {
  name?: unknown
  type?: unknown
  size?: unknown
  base64?: unknown
}): Record<string, unknown> {
  const base64 = typeof file?.base64 === 'string' ? file.base64 : undefined
  return {
    fileName:     typeof file?.name === 'string' ? file.name   : undefined,
    mimeType:     typeof file?.type === 'string' ? file.type   : undefined,
    sizeBytes:    typeof file?.size === 'number' ? file.size   : undefined,
    base64Length: base64 ? base64.length : undefined,
  }
}

/** Truncate a string to `max` characters for safe debug logging. */
export function truncate(value: unknown, max = 80): string {
  const s = value == null ? '' : String(value)
  return s.length <= max ? s : `${s.slice(0, max)}…(${s.length})`
}
