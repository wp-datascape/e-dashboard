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
 * Usage:
 *   import { logger } from '@/utils/logger'
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