'use strict';
/**
 * SATYA — Structured Logger (Winston)
 * ─────────────────────────────────────
 * Menggantikan console.error/console.log di seluruh service.
 *
 * Level:
 *   - error  : error yang perlu investigasi segera
 *   - warn   : kondisi tidak normal tapi tidak crash
 *   - info   : event bisnis penting (submit, approve, verify, login)
 *   - debug  : detail teknis untuk debugging (aktif hanya di development)
 *
 * Format:
 *   - Production (JSON): mudah diindeks oleh log aggregator (ELK, CloudWatch, dll.)
 *   - Development (colored): mudah dibaca di terminal
 *
 * Penggunaan:
 *   const logger = require('../config/logger');
 *   logger.info('Target disubmit', { targetId, userId });
 *   logger.error('Gagal kirim email', { error: err.message, stack: err.stack });
 */

const winston = require('winston');

const { combine, timestamp, json, colorize, printf, errors } = winston.format;

const isDevelopment = process.env.NODE_ENV === 'development';
const isTest = process.env.NODE_ENV === 'test';

// Format untuk development — mudah dibaca di terminal
const devFormat = combine(
  colorize({ all: true }),
  timestamp({ format: 'HH:mm:ss' }),
  errors({ stack: true }),
  printf(({ level, message, timestamp: ts, stack, ...meta }) => {
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return `${ts} [${level}]: ${message}${stack ? `\n${stack}` : ''}${metaStr}`;
  })
);

// Format untuk production — JSON terstruktur
const prodFormat = combine(
  timestamp(),
  errors({ stack: true }),
  json()
);

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info'),
  format: isDevelopment ? devFormat : prodFormat,
  defaultMeta: { service: 'satya-api' },
  // Saat test: silent — tidak pollute output Jest
  silent: isTest,
  transports: [
    new winston.transports.Console(),
  ],
});

module.exports = logger;
