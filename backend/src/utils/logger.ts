/**
 * utils/logger.ts
 *
 * Winston wrapper — single logger instance untuk seluruh aplikasi.
 *
 * WAJIB: Import dari sini, jangan import winston langsung.
 * DILARANG: Menggunakan console.log di production code.
 *
 * Levels:
 *   info  → console only
 *   warn  → console + file (log/warn/YYYY-MM-DD.log)
 *   error → console + file (log/error/YYYY-MM-DD.log)
 *
 * HTTP Request Logger — format colorized untuk terminal:
 *   → GET /api/v1/users
 *   ← GET /api/v1/users 200 12ms - 127.0.0.1 - uuid - Mozilla/5.0...
 *
 * Usage:
 *   import { logger, logHttpRequest, logHttpResponse } from '@/utils/logger'
 *   logger.info('Server started', { port: 3000 })
 *   logger.warn('Rate limit approaching', { ip, count })
 *   logger.error('DB query failed', { request_id, error: err.message })
 */

import winston from 'winston'
import DailyRotateFile from 'winston-daily-rotate-file'
import { env } from '@/config/env'

const { combine, timestamp, json, colorize, printf } = winston.format

// Format untuk console output
const consoleFormat = printf(({ level, message, timestamp: ts, ...meta }) => {
  const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : ''
  return `${ts} [${level}] ${message}${metaStr}`
})

// Redact fields yang mengandung PII / sensitive data
const REDACT_KEYS = ['password', 'token', 'secret', 'authorization', 'cookie', 'access_key']

const redactFormat = winston.format((info) => {
  const redact = (obj: Record<string, unknown>): Record<string, unknown> => {
    return Object.fromEntries(
      Object.entries(obj).map(([key, value]) => {
        if (REDACT_KEYS.some((k) => key.toLowerCase().includes(k))) {
          return [key, '***']
        }
        if (value && typeof value === 'object' && !Array.isArray(value)) {
          return [key, redact(value as Record<string, unknown>)]
        }
        return [key, value]
      }),
    )
  }

  return redact(info as unknown as Record<string, unknown>) as typeof info
})()

const transports: winston.transport[] = [
  // Console — semua level
  new winston.transports.Console({
    format: combine(
      colorize(),
      timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      consoleFormat,
    ),
  }),

  // File warn — hanya warn ke atas
  new DailyRotateFile({
    level: 'warn',
    dirname: 'log/warn',
    filename: '%DATE%.log',
    datePattern: 'YYYY-MM-DD',
    maxFiles: '30d',
    format: combine(timestamp(), json()),
  }),

  // File error — hanya error
  new DailyRotateFile({
    level: 'error',
    dirname: 'log/error',
    filename: '%DATE%.log',
    datePattern: 'YYYY-MM-DD',
    maxFiles: '30d',
    format: combine(timestamp(), json()),
  }),
]

export const logger = winston.createLogger({
  level: env.NODE_ENV === 'production' ? 'warn' : 'info',
  format: combine(redactFormat, timestamp()),
  transports,
  exitOnError: false,
})

// ─── HTTP Request Logger — Colorized Terminal Output ────────────────────────────

// ANSI Colors
const RESET = '\x1b[0m'
const BOLD = '\x1b[1m'
const DIM = '\x1b[2m'

const COLOR: Record<string, string> = {
  purple: '\x1b[35m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  amber: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
  white: '\x1b[37m',
}

const METHOD_COLORS: Record<string, string> = {
  GET: COLOR.green,
  POST: COLOR.blue,
  PUT: COLOR.amber,
  PATCH: COLOR.amber,
  DELETE: COLOR.red,
}

function getMethodColor(method: string): string {
  return METHOD_COLORS[method] ?? COLOR.cyan
}

function getStatusColor(status: number): string {
  if (status >= 500) return COLOR.red
  if (status >= 400) return COLOR.amber
  return COLOR.green
}

function formatTimestamp(): string {
  return new Date().toISOString().replace('T', ' ').replace('Z', '')
}

/**
 * Log HTTP request ke terminal (colorized).
 *
 * Output: "→ GET /api/v1/users"
 *
 * @param method - HTTP method (GET, POST, PUT, PATCH, DELETE)
 * @param path - URL path + query string
 */
export function logHttpRequest(method: string, path: string): void {
  const methodColor = getMethodColor(method)
  const ts = formatTimestamp()
  console.log(
    `${DIM}${ts}${RESET} ${BOLD}${methodColor}→${RESET} ${methodColor}${BOLD}${method}${RESET} ${DIM}${path}${RESET}`,
  )
}

/**
 * Log HTTP response ke terminal (colorized) + Winston (persistensi file).
 *
 * Terminal: "← GET /api/v1/users 200 12ms - 127.0.0.1 - uuid - Mozilla/5.0..."
 * Winston : "[timestamp] GET /api/v1/users 200 12ms - 127.0.0.1 - uuid - useragent"
 *
 * @param method   - HTTP method
 * @param path     - URL path + query string
 * @param status   - HTTP status code
 * @param duration - Response time in ms
 * @param ip       - Client IP address
 * @param requestId- Request tracing ID
 * @param userAgent- User-Agent string
 */
export function logHttpResponse(
  method: string,
  path: string,
  status: number,
  duration: number,
  ip: string,
  requestId: string,
  userAgent: string,
): void {
  const methodColor = getMethodColor(method)
  const statusColor = getStatusColor(status)
  const statusStr = status >= 400
    ? `${BOLD}${statusColor}${status}${RESET}`
    : `${statusColor}${status}${RESET}`
  const durStr = duration >= 1000
    ? `${COLOR.red}${duration}ms${RESET}`
    : `${DIM}${duration}ms${RESET}`
  const ts = formatTimestamp()

  // Terminal output (colorized)
  const line = [
    `${DIM}${ts}${RESET}`,
    `${methodColor}←${RESET}`,
    `${methodColor}${method}${RESET}`,
    `${DIM}${path}${RESET}`,
    `${statusStr}`,
    `${durStr}`,
    `${DIM}- ${ip} - ${requestId} - ${userAgent}${RESET}`,
  ].join(' ')

  console.log(line)

  // Winston output — untuk persistensi ke file (log/warn/ log/error/)
  const winstonLine = `[${ts}] ${method} ${path} ${status} ${duration}ms - ${ip} - ${requestId} - ${userAgent}`
  if (status >= 500) {
    logger.error(winstonLine)
  } else if (status >= 400) {
    logger.warn(winstonLine)
  } else {
    logger.info(winstonLine)
  }
}