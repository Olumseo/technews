import { randomBytes, scryptSync, timingSafeEqual, createHash } from 'node:crypto'
import { db } from './db.js'

const COOKIE = 'tns_session'
const SESSION_DAYS = 7

export function hashPassword(password) {
  const salt = randomBytes(16)
  const hash = scryptSync(password, salt, 64)
  return `scrypt:${salt.toString('hex')}:${hash.toString('hex')}`
}

export function verifyPassword(password, stored) {
  const [scheme, saltHex, hashHex] = stored.split(':')
  if (scheme !== 'scrypt') return false
  const expected = Buffer.from(hashHex, 'hex')
  const actual = scryptSync(password, Buffer.from(saltHex, 'hex'), expected.length)
  return timingSafeEqual(expected, actual)
}

const sha = (s) => createHash('sha256').update(s).digest('hex')

export function createSession(res, userId) {
  const token = randomBytes(32).toString('base64url')
  const expires = new Date(Date.now() + SESSION_DAYS * 864e5)
  db.prepare('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)').run(sha(token), userId, expires.toISOString())
  res.cookie(COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    expires,
    path: '/',
  })
}

export function destroySession(req, res) {
  const token = readCookie(req)
  if (token) db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(sha(token))
  res.clearCookie(COOKIE, { path: '/' })
}

function readCookie(req) {
  const header = req.headers.cookie || ''
  for (const part of header.split(';')) {
    const [k, ...v] = part.trim().split('=')
    if (k === COOKIE) return decodeURIComponent(v.join('='))
  }
  return null
}

// Attaches req.user when a valid session cookie is present.
export function loadUser(req, _res, next) {
  const token = readCookie(req)
  if (token) {
    const row = db
      .prepare(
        `SELECT u.id, u.name, u.slug, u.email, u.role, u.title
           FROM sessions s JOIN users u ON u.id = s.user_id
          WHERE s.token_hash = ? AND s.expires_at > ?`
      )
      .get(sha(token), new Date().toISOString())
    if (row) req.user = { ...row }
  }
  next()
}

export function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Sign in to continue.' })
  next()
}

// Simple in-memory limiter for login attempts: 8 tries per 15 minutes per IP.
const attempts = new Map()
export function loginLimiter(req, res, next) {
  const key = req.ip
  const now = Date.now()
  const entry = attempts.get(key) || { count: 0, reset: now + 15 * 60e3 }
  if (now > entry.reset) Object.assign(entry, { count: 0, reset: now + 15 * 60e3 })
  entry.count += 1
  attempts.set(key, entry)
  if (entry.count > 8) return res.status(429).json({ error: 'Too many sign-in attempts. Wait 15 minutes and try again.' })
  next()
}
