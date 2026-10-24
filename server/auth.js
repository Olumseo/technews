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
        `SELECT u.id, u.name, u.slug, u.email, u.role, u.title, u.bio, u.trusted
           FROM sessions s JOIN users u ON u.id = s.user_id
          WHERE s.token_hash = ? AND s.expires_at > ? AND u.status = 'active'`
      )
      .get(sha(token), new Date().toISOString())
    if (row) req.user = { ...row, trusted: Boolean(row.trusted) || row.role === 'admin' }
  }
  next()
}

export function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Sign in to continue.' })
  next()
}

export function requireAdmin(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Sign in to continue.' })
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Only newsroom admins can do this.' })
  next()
}

// Simple in-memory limiter per IP address.
function limiter(max, windowMs, message) {
  const hits = new Map()
  return (req, res, next) => {
    const now = Date.now()
    const entry = hits.get(req.ip) || { count: 0, reset: now + windowMs }
    if (now > entry.reset) Object.assign(entry, { count: 0, reset: now + windowMs })
    entry.count += 1
    hits.set(req.ip, entry)
    if (entry.count > max) return res.status(429).json({ error: message })
    next()
  }
}

export const loginLimiter = limiter(8, 15 * 60e3, 'Too many sign-in attempts. Wait 15 minutes and try again.')
// Sign-up attempts (including typos) are capped loosely; accounts actually created are capped tightly.
export const signupLimiter = limiter(30, 60 * 60e3, 'Too many sign-up attempts from this connection. Try again in an hour.')

const created = new Map()
export function canCreateAccount(ip) {
  const now = Date.now()
  const recent = (created.get(ip) || []).filter((t) => now - t < 24 * 3600e3)
  created.set(ip, recent)
  return recent.length < 5
}
export function recordAccount(ip) {
  created.get(ip)?.push(Date.now()) ?? created.set(ip, [Date.now()])
}
