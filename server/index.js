import express from 'express'
import multer from 'multer'
import { randomBytes } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, unlinkSync } from 'node:fs'
import { join, basename } from 'node:path'
import { db, ROOT } from './db.js'
import { canCreateAccount, createSession, destroySession, hashPassword, loadUser, loginLimiter, recordAccount, requireAdmin, requireAuth, signupLimiter, verifyPassword } from './auth.js'
import { isSection, sectionBySlug, slugify, SECTIONS } from '../src/data/site.js'

const PORT = Number(process.env.PORT) || 5174
// New creators' stories wait for an admin to approve them. Set REQUIRE_REVIEW=false to publish everything instantly.
const REQUIRE_REVIEW = process.env.REQUIRE_REVIEW !== 'false'
const UPLOADS = join(ROOT, 'uploads')
const DIST = join(ROOT, 'dist')
mkdirSync(UPLOADS, { recursive: true })

const app = express()
app.disable('x-powered-by')
app.set('trust proxy', 1)

app.use((_req, res, next) => {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'X-Frame-Options': 'SAMEORIGIN',
  })
  next()
})
app.use(express.json({ limit: '200kb' }))
app.use(loadUser)

// State-changing API calls must carry this header. Browsers can't add it cross-site
// without a CORS preflight (which this server never approves), so it blocks CSRF.
app.use('/api', (req, res, next) => {
  if (req.method !== 'GET' && req.get('X-Requested-With') !== 'tns') {
    return res.status(403).json({ error: 'Request blocked.' })
  }
  next()
})

/* ---------- Serialisers ---------- */

const ARTICLE_COLUMNS = `
  a.slug, a.section, a.title, a.dek, a.body, a.image_url, a.caption, a.quote,
  a.source_name, a.source_url, a.read_minutes, a.views, a.published_at, a.updated_at, a.breaking_until,
  a.status, a.review_note,
  u.name AS author_name, u.slug AS author_slug, u.title AS author_title, u.trusted AS author_trusted, u.role AS author_role`

// Only approved stories by active accounts are ever shown to the public.
const PUBLIC = `a.status = 'published' AND u.status = 'active'`

const BREAKING_HOURS = 12
const isBreaking = (row) => Boolean(row.breaking_until && row.breaking_until > new Date().toISOString())

function toArticle(row, { full = false } = {}) {
  const article = {
    slug: row.slug,
    section: row.section,
    title: row.title,
    dek: row.dek,
    image: row.image_url,
    caption: row.caption,
    author: row.author_name,
    authorSlug: row.author_slug,
    role: row.author_title,
    read: row.read_minutes,
    views: row.views,
    publishedAt: row.published_at,
    source: row.source_name ? { name: row.source_name, url: row.source_url } : null,
    breaking: isBreaking(row),
    community: !row.author_trusted && row.author_role !== 'admin',
  }
  if (full) {
    article.body = JSON.parse(row.body)
    article.quote = row.quote
    article.updatedAt = row.updated_at
  }
  return article
}

const list = (sql, ...params) => db.prepare(sql).all(...params).map((r) => toArticle(r))

/* ---------- Public routes ---------- */

app.get('/api/home', (_req, res) => {
  const latest = list(
    `SELECT ${ARTICLE_COLUMNS} FROM articles a JOIN users u ON u.id = a.author_id
      WHERE ${PUBLIC} ORDER BY a.published_at DESC LIMIT 80`
  )
  const mostRead = list(
    `SELECT ${ARTICLE_COLUMNS} FROM articles a JOIN users u ON u.id = a.author_id
      WHERE ${PUBLIC} AND a.published_at > ? ORDER BY a.views DESC LIMIT 5`,
    new Date(Date.now() - 45 * 864e5).toISOString()
  )
  res.json({ latest, mostRead })
})

app.get('/api/breaking', (_req, res) => {
  const items = list(
    `SELECT ${ARTICLE_COLUMNS} FROM articles a JOIN users u ON u.id = a.author_id
      WHERE ${PUBLIC} AND a.breaking_until > ? ORDER BY a.published_at DESC LIMIT 20`,
    new Date().toISOString()
  )
  res.json({ items })
})

app.get('/api/articles', (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 24, 60)
  const offset = Math.max(Number(req.query.offset) || 0, 0)
  const where = [PUBLIC]
  const params = []
  if (req.query.section && isSection(req.query.section)) {
    where.push('a.section = ?')
    params.push(req.query.section)
  }
  if (req.query.q) {
    where.push('(a.title LIKE ? OR a.dek LIKE ? OR u.name LIKE ?)')
    const q = `%${String(req.query.q).slice(0, 80)}%`
    params.push(q, q, q)
  }
  const clause = `WHERE ${where.join(' AND ')}`
  const items = list(
    `SELECT ${ARTICLE_COLUMNS} FROM articles a JOIN users u ON u.id = a.author_id
      ${clause} ORDER BY a.published_at DESC LIMIT ? OFFSET ?`,
    ...params, limit, offset
  )
  const { total } = db.prepare(`SELECT COUNT(*) AS total FROM articles a JOIN users u ON u.id = a.author_id ${clause}`).get(...params)
  res.json({ items, total })
})

app.get('/api/articles/:slug', (req, res) => {
  const row = db
    .prepare(`SELECT ${ARTICLE_COLUMNS}, a.id, a.author_id, u.bio AS author_bio, u.status AS author_status FROM articles a JOIN users u ON u.id = a.author_id WHERE a.slug = ?`)
    .get(req.params.slug)
  if (!row) return res.status(404).json({ error: 'Story not found.' })
  const isPublic = row.status === 'published' && row.author_status === 'active'
  const canPreview = req.user && (req.user.role === 'admin' || req.user.id === row.author_id)
  if (!isPublic && !canPreview) return res.status(404).json({ error: 'Story not found.' })
  if (isPublic) db.prepare('UPDATE articles SET views = views + 1 WHERE id = ?').run(row.id)
  const related = list(
    `SELECT ${ARTICLE_COLUMNS} FROM articles a JOIN users u ON u.id = a.author_id
      WHERE ${PUBLIC} AND a.section = ? AND a.slug != ? ORDER BY a.published_at DESC LIMIT 3`,
    row.section, row.slug
  )
  const byAuthor = list(
    `SELECT ${ARTICLE_COLUMNS} FROM articles a JOIN users u ON u.id = a.author_id
      WHERE ${PUBLIC} AND a.author_id = ? AND a.slug != ? ORDER BY a.published_at DESC LIMIT 3`,
    row.author_id, row.slug
  )
  const article = { ...toArticle(row, { full: true }), authorBio: row.author_bio }
  if (!isPublic) Object.assign(article, { preview: true, status: row.status, reviewNote: row.review_note })
  res.json({ article, related, byAuthor })
})

app.get('/api/authors', (_req, res) => {
  const rows = db
    .prepare(
      `SELECT u.name, u.slug, u.title, u.bio, u.trusted, u.created_at,
              COUNT(a.id) AS stories, MAX(a.published_at) AS last_published
         FROM users u LEFT JOIN articles a ON a.author_id = u.id AND a.status = 'published'
        WHERE u.role = 'creator' AND u.status = 'active'
        GROUP BY u.id HAVING stories > 0
        ORDER BY u.trusted DESC, stories DESC, u.name`
    )
    .all()
  res.json({
    items: rows.map((r) => ({
      name: r.name, slug: r.slug, role: r.title, bio: r.bio, stories: r.stories,
      community: !r.trusted, joinedAt: r.created_at, lastPublished: r.last_published,
    })),
  })
})

app.get('/api/authors/:slug', (req, res) => {
  const user = db.prepare(`SELECT id, name, slug, title, bio, trusted, role, created_at FROM users WHERE slug = ? AND status = 'active'`).get(req.params.slug)
  if (!user) return res.status(404).json({ error: 'Creator not found.' })
  const stories = list(
    `SELECT ${ARTICLE_COLUMNS} FROM articles a JOIN users u ON u.id = a.author_id
      WHERE ${PUBLIC} AND a.author_id = ? ORDER BY a.published_at DESC LIMIT 50`,
    user.id
  )
  res.json({
    author: {
      name: user.name, slug: user.slug, role: user.title, bio: user.bio,
      community: !user.trusted && user.role !== 'admin', joinedAt: user.created_at,
    },
    stories,
  })
})

/* ---------- Auth ---------- */

app.post('/api/auth/login', loginLimiter, (req, res) => {
  const { email, password } = req.body || {}
  if (typeof email !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ error: 'Enter your email and password.' })
  }
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.trim())
  if (!user || !verifyPassword(password, user.password_hash)) {
    return res.status(401).json({ error: 'That email and password don’t match an account.' })
  }
  if (user.status !== 'active') {
    return res.status(403).json({ error: 'This account has been suspended. Contact the newsroom if you think this is a mistake.' })
  }
  db.prepare('DELETE FROM sessions WHERE expires_at < ?').run(new Date().toISOString())
  createSession(res, user.id)
  res.json({ user: publicUser(user) })
})

const publicUser = (u) => {
  const trusted = Boolean(u.trusted) || u.role === 'admin'
  return {
    name: u.name, slug: u.slug, email: u.email, role: u.role, title: u.title, bio: u.bio || '',
    trusted, publishesInstantly: trusted || !REQUIRE_REVIEW,
  }
}

function uniqueUserSlug(name) {
  const base = slugify(name) || 'creator'
  let slug = base
  for (let i = 2; db.prepare('SELECT 1 FROM users WHERE slug = ?').get(slug); i++) slug = `${base}-${i}`
  return slug
}

// Anyone can open a creator account. New accounts are 'community' creators until an admin trusts them.
app.post('/api/auth/signup', signupLimiter, (req, res) => {
  const b = req.body || {}
  // Hidden field that people never see; bots that fill in every field get a quiet, fake success.
  if (b.website) return res.status(201).json({ user: null })
  const clean = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '')
  const name = clean(b.name, 60).replace(/\s+/g, ' ')
  const email = clean(b.email, 120).toLowerCase()
  const password = typeof b.password === 'string' ? b.password : ''
  const bio = clean(b.bio, 300)
  const fields = {}
  if (name.length < 2) fields.name = 'Enter your name as you want it shown on your stories.'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fields.email = 'Enter an email address like name@example.com.'
  if (password.length < 10) fields.password = 'Use at least 10 characters.'
  else if (password.toLowerCase().includes(email.split('@')[0]) && email) fields.password = 'Don’t include your email name in your password.'
  if (b.acceptGuidelines !== true) fields.acceptGuidelines = 'Agree to the creator guidelines to continue.'
  if (Object.keys(fields).length) return res.status(400).json({ error: 'Check the highlighted fields.', fields })
  if (!canCreateAccount(req.ip)) {
    return res.status(429).json({ error: 'Too many new accounts from this connection today. Try again tomorrow.' })
  }
  if (db.prepare('SELECT 1 FROM users WHERE email = ?').get(email)) {
    return res.status(409).json({ error: 'An account with this email already exists. Sign in instead.', fields: { email: 'This email already has an account.' } })
  }
  const { lastInsertRowid } = db
    .prepare(
      `INSERT INTO users (name, slug, email, role, title, bio, password_hash, is_sample, created_at, trusted, status)
       VALUES (?, ?, ?, 'creator', 'Community contributor', ?, ?, 0, ?, 0, 'active')`
    )
    .run(name, uniqueUserSlug(name), email, bio, hashPassword(password), new Date().toISOString())
  recordAccount(req.ip)
  createSession(res, Number(lastInsertRowid))
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(lastInsertRowid)
  res.status(201).json({ user: publicUser(user) })
})

app.post('/api/auth/logout', (req, res) => {
  destroySession(req, res)
  res.json({ ok: true })
})

app.get('/api/auth/me', (req, res) => {
  res.json({ user: req.user ? publicUser(req.user) : null })
})

app.put('/api/studio/profile', requireAuth, (req, res) => {
  const clean = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '')
  const name = clean(req.body?.name, 60).replace(/\s+/g, ' ')
  const title = clean(req.body?.title, 60)
  const bio = clean(req.body?.bio, 400)
  const fields = {}
  if (name.length < 2) fields.name = 'Enter your name as you want it shown on your stories.'
  if (title.length < 2) fields.title = 'Add a short description, for example "Freelance tech writer".'
  if (Object.keys(fields).length) return res.status(400).json({ error: 'Check the highlighted fields.', fields })
  db.prepare('UPDATE users SET name = ?, title = ?, bio = ? WHERE id = ?').run(name, title, bio, req.user.id)
  res.json({ user: publicUser(db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id)) })
})

/* ---------- Creator studio (signed-in only) ---------- */

const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOADS,
    filename: (_req, file, cb) => {
      const ext = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' }[file.mimetype]
      cb(null, `${Date.now()}-${randomBytes(6).toString('hex')}${ext}`)
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    const ok = ['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)
    cb(ok ? null : Object.assign(new Error('Upload a JPG, PNG or WebP image.'), { status: 400 }), ok)
  },
})

function removeUpload(url) {
  if (!url?.startsWith('/uploads/')) return
  const file = join(UPLOADS, basename(url))
  if (existsSync(file)) unlinkSync(file)
}

function readArticleInput(body) {
  const clean = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '')
  const input = {
    title: clean(body.title, 160),
    dek: clean(body.dek, 400),
    section: clean(body.section, 20),
    caption: clean(body.caption, 200),
    quote: clean(body.quote, 300) || null,
    source_name: clean(body.sourceName, 80) || null,
    source_url: clean(body.sourceUrl, 500) || null,
    breaking: body.breaking === 'true' || body.breaking === 'on',
    paragraphs: clean(body.body, 20000).split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean),
  }
  const errors = {}
  if (input.title.length < 10) errors.title = 'Write a headline of at least 10 characters.'
  if (input.dek.length < 20) errors.dek = 'Write a summary of at least 20 characters.'
  if (!isSection(input.section)) errors.section = 'Choose a section.'
  if (!input.paragraphs.length || input.paragraphs.join(' ').length < 80) errors.body = 'Write at least a paragraph (80 characters or more).'
  if (input.source_url && !/^https?:\/\//i.test(input.source_url)) errors.sourceUrl = 'The source link must start with http:// or https://.'
  return { input, errors }
}

const breakingUntil = () => new Date(Date.now() + BREAKING_HOURS * 3600e3).toISOString()

const readMinutes = (paragraphs) => Math.max(2, Math.ceil(paragraphs.join(' ').split(/\s+/).length / 200))

function uniqueSlug(title, ignoreId = 0) {
  const base = slugify(title) || 'story'
  let slug = base
  for (let i = 2; db.prepare('SELECT 1 FROM articles WHERE slug = ? AND id != ?').get(slug, ignoreId); i++) slug = `${base}-${i}`
  return slug
}

function ownedArticle(req, res) {
  const row = db.prepare('SELECT * FROM articles WHERE slug = ?').get(req.params.slug)
  if (!row) {
    res.status(404).json({ error: 'Story not found.' })
    return null
  }
  if (req.user.role !== 'admin' && row.author_id !== req.user.id) {
    res.status(403).json({ error: 'You can only change your own stories.' })
    return null
  }
  return row
}

app.get('/api/studio/articles', requireAuth, (req, res) => {
  const mine = req.user.role === 'admin' ? '' : 'WHERE a.author_id = ?'
  const params = req.user.role === 'admin' ? [] : [req.user.id]
  const rows = db
    .prepare(
      `SELECT ${ARTICLE_COLUMNS} FROM articles a JOIN users u ON u.id = a.author_id ${mine}
        ORDER BY a.updated_at DESC LIMIT 200`
    )
    .all(...params)
  res.json({ items: rows.map((r) => ({ ...toArticle(r), status: r.status, reviewNote: r.review_note || '' })) })
})

app.get('/api/studio/articles/:slug', requireAuth, (req, res) => {
  const row = ownedArticle(req, res)
  if (!row) return
  res.json({
    article: {
      slug: row.slug, section: row.section, title: row.title, dek: row.dek, caption: row.caption,
      quote: row.quote || '', sourceName: row.source_name || '', sourceUrl: row.source_url || '',
      body: JSON.parse(row.body).join('\n\n'), image: row.image_url, breaking: isBreaking(row),
      status: row.status, reviewNote: row.review_note || '',
    },
  })
})

app.post('/api/studio/articles', requireAuth, upload.single('image'), (req, res) => {
  const { input, errors } = readArticleInput(req.body)
  if (!req.file) errors.image = 'Add a photo for the story.'
  if (Object.keys(errors).length) {
    if (req.file) removeUpload(`/uploads/${req.file.filename}`)
    return res.status(400).json({ error: 'Check the highlighted fields.', fields: errors })
  }
  const now = new Date().toISOString()
  const slug = uniqueSlug(input.title)
  const instant = req.user.trusted || !REQUIRE_REVIEW
  db.prepare(
    `INSERT INTO articles (slug, section, title, dek, body, image_url, caption, quote, source_name, source_url,
                           author_id, read_minutes, published_at, updated_at, breaking_until, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    slug, input.section, input.title, input.dek, JSON.stringify(input.paragraphs), `/uploads/${req.file.filename}`,
    input.caption, input.quote, input.source_name, input.source_url, req.user.id, readMinutes(input.paragraphs), now, now,
    input.breaking && req.user.trusted ? breakingUntil() : null, instant ? 'published' : 'pending'
  )
  res.status(201).json({ slug, status: instant ? 'published' : 'pending' })
})

app.put('/api/studio/articles/:slug', requireAuth, upload.single('image'), (req, res) => {
  const row = ownedArticle(req, res)
  if (!row) {
    if (req.file) removeUpload(`/uploads/${req.file.filename}`)
    return
  }
  const { input, errors } = readArticleInput(req.body)
  if (Object.keys(errors).length) {
    if (req.file) removeUpload(`/uploads/${req.file.filename}`)
    return res.status(400).json({ error: 'Check the highlighted fields.', fields: errors })
  }
  const image = req.file ? `/uploads/${req.file.filename}` : row.image_url
  if (req.file) removeUpload(row.image_url)
  // Keep an existing breaking window running; start a new one only when the flag is switched on.
  // Only trusted creators and admins can change the flag; for everyone else it stays as it was.
  const breaking = req.user.trusted
    ? (input.breaking ? (isBreaking(row) ? row.breaking_until : breakingUntil()) : null)
    : row.breaking_until
  // Edits by community creators go back to the review queue before they appear again.
  const status = req.user.trusted || !REQUIRE_REVIEW ? (row.status === 'rejected' ? 'published' : row.status === 'pending' ? 'published' : row.status) : 'pending'
  db.prepare(
    `UPDATE articles SET section = ?, title = ?, dek = ?, body = ?, image_url = ?, caption = ?, quote = ?,
            source_name = ?, source_url = ?, read_minutes = ?, updated_at = ?, breaking_until = ?, status = ?,
            review_note = CASE WHEN ? = 'pending' THEN NULL ELSE review_note END WHERE id = ?`
  ).run(
    input.section, input.title, input.dek, JSON.stringify(input.paragraphs), image, input.caption, input.quote,
    input.source_name, input.source_url, readMinutes(input.paragraphs), new Date().toISOString(), breaking, status, status, row.id
  )
  res.json({ slug: row.slug, status })
})

app.delete('/api/studio/articles/:slug', requireAuth, (req, res) => {
  const row = ownedArticle(req, res)
  if (!row) return
  db.prepare('DELETE FROM articles WHERE id = ?').run(row.id)
  removeUpload(row.image_url)
  res.json({ ok: true })
})

/* ---------- Admin: review queue and creators ---------- */

app.get('/api/studio/review', requireAdmin, (_req, res) => {
  const rows = db
    .prepare(
      `SELECT ${ARTICLE_COLUMNS}, u.email AS author_email, u.created_at AS author_joined
         FROM articles a JOIN users u ON u.id = a.author_id
        WHERE a.status = 'pending' ORDER BY a.updated_at ASC LIMIT 100`
    )
    .all()
  res.json({
    items: rows.map((r) => ({
      ...toArticle(r, { full: true }), submittedAt: r.updated_at, authorEmail: r.author_email, authorJoined: r.author_joined,
    })),
  })
})

app.post('/api/studio/review/:slug/approve', requireAdmin, (req, res) => {
  const row = db.prepare(`SELECT id FROM articles WHERE slug = ? AND status = 'pending'`).get(req.params.slug)
  if (!row) return res.status(404).json({ error: 'This story is no longer waiting for review.' })
  const now = new Date().toISOString()
  db.prepare(`UPDATE articles SET status = 'published', review_note = NULL, published_at = ?, updated_at = ? WHERE id = ?`).run(now, now, row.id)
  res.json({ ok: true })
})

app.post('/api/studio/review/:slug/reject', requireAdmin, (req, res) => {
  const note = typeof req.body?.note === 'string' ? req.body.note.trim().slice(0, 500) : ''
  if (note.length < 5) return res.status(400).json({ error: 'Tell the creator what to change.', fields: { note: 'Write a short reason (at least 5 characters).' } })
  const row = db.prepare(`SELECT id FROM articles WHERE slug = ? AND status = 'pending'`).get(req.params.slug)
  if (!row) return res.status(404).json({ error: 'This story is no longer waiting for review.' })
  db.prepare(`UPDATE articles SET status = 'rejected', review_note = ? WHERE id = ?`).run(note, row.id)
  res.json({ ok: true })
})

app.get('/api/studio/creators', requireAdmin, (_req, res) => {
  const rows = db
    .prepare(
      `SELECT u.name, u.slug, u.email, u.title, u.trusted, u.status, u.created_at,
              SUM(a.status = 'published') AS published, SUM(a.status = 'pending') AS pending
         FROM users u LEFT JOIN articles a ON a.author_id = u.id
        WHERE u.role = 'creator' GROUP BY u.id ORDER BY u.trusted ASC, u.created_at DESC`
    )
    .all()
  res.json({
    items: rows.map((r) => ({
      name: r.name, slug: r.slug, email: r.email, title: r.title, trusted: Boolean(r.trusted),
      status: r.status, joinedAt: r.created_at, published: r.published || 0, pending: r.pending || 0,
    })),
  })
})

app.patch('/api/studio/creators/:slug', requireAdmin, (req, res) => {
  const user = db.prepare(`SELECT id, role FROM users WHERE slug = ?`).get(req.params.slug)
  if (!user || user.role !== 'creator') return res.status(404).json({ error: 'Creator not found.' })
  const { trusted, status } = req.body || {}
  if (typeof trusted === 'boolean') db.prepare('UPDATE users SET trusted = ? WHERE id = ?').run(trusted ? 1 : 0, user.id)
  if (status === 'active' || status === 'suspended') {
    db.prepare('UPDATE users SET status = ? WHERE id = ?').run(status, user.id)
    if (status === 'suspended') db.prepare('DELETE FROM sessions WHERE user_id = ?').run(user.id)
  }
  res.json({ ok: true })
})

/* ---------- Weather (Open-Meteo, cached for 15 minutes) ---------- */

const WEATHER_TEXT = [
  [[0], 'Clear'], [[1, 2], 'Partly cloudy'], [[3], 'Cloudy'], [[45, 48], 'Fog'],
  [[51, 53, 55, 56, 57], 'Drizzle'], [[61, 63, 65, 66, 67], 'Rain'], [[80, 81, 82], 'Showers'], [[95, 96, 99], 'Thunderstorms'],
]
let weatherCache = { at: 0, data: null }

app.get('/api/weather', async (_req, res) => {
  if (Date.now() - weatherCache.at < 15 * 60e3 && weatherCache.data) return res.json(weatherCache.data)
  try {
    const r = await fetch('https://api.open-meteo.com/v1/forecast?latitude=1.2897&longitude=103.8501&current=temperature_2m,weather_code&timezone=Asia%2FSingapore', { signal: AbortSignal.timeout(4000) })
    const { current } = await r.json()
    const text = WEATHER_TEXT.find(([codes]) => codes.includes(current.weather_code))?.[1] || ''
    weatherCache = { at: Date.now(), data: { temperature: Math.round(current.temperature_2m), text } }
    res.json(weatherCache.data)
  } catch {
    res.status(503).json({ error: 'Weather is unavailable right now.' })
  }
})

/* ---------- Feeds, sitemap and link previews ---------- */

const siteUrl = (req) => (process.env.SITE_URL || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '')
const xml = (v = '') => String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const absolute = (base, url) => (url.startsWith('http') ? url : `${base}${url}`)

app.get('/rss.xml', (req, res) => {
  const base = siteUrl(req)
  const items = list(`SELECT ${ARTICLE_COLUMNS} FROM articles a JOIN users u ON u.id = a.author_id WHERE ${PUBLIC} ORDER BY a.published_at DESC LIMIT 30`)
  res.type('application/rss+xml').send(`<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">
<channel>
  <title>Tech News Singapore</title>
  <link>${base}/</link>
  <atom:link href="${base}/rss.xml" rel="self" type="application/rss+xml" />
  <description>Technology, business and world news from Singapore.</description>
  <language>en-sg</language>
${items.map((a) => `  <item>
    <title>${xml(a.title)}</title>
    <link>${base}/article/${a.slug}</link>
    <guid isPermaLink="true">${base}/article/${a.slug}</guid>
    <description>${xml(a.dek)}</description>
    <category>${xml(sectionBySlug(a.section)?.name)}</category>
    <dc:creator>${xml(a.author)}</dc:creator>
    <pubDate>${new Date(a.publishedAt).toUTCString()}</pubDate>
  </item>`).join('\n')}
</channel>
</rss>`)
})

app.get('/sitemap.xml', (req, res) => {
  const base = siteUrl(req)
  const stories = db.prepare(`SELECT a.slug, a.updated_at FROM articles a JOIN users u ON u.id = a.author_id WHERE ${PUBLIC} ORDER BY a.published_at DESC`).all()
  const authors = db.prepare(`SELECT DISTINCT u.slug FROM users u JOIN articles a ON a.author_id = u.id WHERE ${PUBLIC} AND u.role = 'creator'`).all()
  const urls = [
    `${base}/`,
    ...SECTIONS.map((s) => `${base}/section/${s.slug}`),
    ...authors.map((a) => `${base}/author/${a.slug}`),
    ...['breaking', 'creators', 'join', 'guidelines', 'about', 'contact', 'corrections', 'privacy', 'newsletters'].map((p) => `${base}/${p}`),
  ]
  res.type('application/xml').send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${u}</loc></url>`).join('\n')}
${stories.map((s) => `  <url><loc>${base}/article/${s.slug}</loc><lastmod>${s.updated_at.slice(0, 10)}</lastmod></url>`).join('\n')}
</urlset>`)
})

app.get('/robots.txt', (req, res) => {
  res.type('text/plain').send(`User-agent: *
Disallow: /studio
Disallow: /login
Disallow: /api/

Sitemap: ${siteUrl(req)}/sitemap.xml
`)
})

/* ---------- Static files ---------- */

app.use('/uploads', express.static(UPLOADS, { maxAge: '30d', immutable: true }))
app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found.' }))

// In production, story pages get their own title, description and preview image in the HTML,
// so links shared on WhatsApp, Telegram, X or LinkedIn show a proper preview card.
if (existsSync(DIST)) {
  const shell = readFileSync(join(DIST, 'index.html'), 'utf8')
  const page = (req, { title, description, image, type = 'website' }) => {
    const base = siteUrl(req)
    const tags = [
      `<title>${xml(title)}</title>`,
      `<meta name="description" content="${xml(description)}" />`,
      `<link rel="canonical" href="${base}${req.path}" />`,
      `<meta property="og:type" content="${type}" />`,
      `<meta property="og:title" content="${xml(title)}" />`,
      `<meta property="og:description" content="${xml(description)}" />`,
      `<meta property="og:url" content="${base}${req.path}" />`,
      image && `<meta property="og:image" content="${xml(absolute(base, image))}" />`,
      `<meta name="twitter:card" content="${image ? 'summary_large_image' : 'summary'}" />`,
    ].filter(Boolean).join('\n    ')
    return shell
      .replace(/<title>.*?<\/title>/s, '')
      .replace(/<meta name="description"[^>]*>/, '')
      .replace('</head>', `    ${tags}
  </head>`)
  }

  app.use(express.static(DIST, { index: false }))
  app.get('/article/:slug', (req, res) => {
    const a = db.prepare(`SELECT a.title, a.dek, a.image_url FROM articles a JOIN users u ON u.id = a.author_id WHERE a.slug = ? AND ${PUBLIC}`).get(req.params.slug)
    if (!a) return res.status(404).send(page(req, { title: 'Page not found | Tech News Singapore', description: 'This page has moved or never existed.' }))
    res.send(page(req, { title: `${a.title} | Tech News Singapore`, description: a.dek, image: a.image_url, type: 'article' }))
  })
  app.get('*', (req, res) =>
    res.send(page(req, { title: 'Tech News Singapore', description: 'Technology, business and world news from Singapore.' }))
  )
}

// Errors from multer and elsewhere come back as plain JSON messages.
app.use((err, _req, res, _next) => {
  const status = err.status || (err.code === 'LIMIT_FILE_SIZE' ? 400 : 500)
  const message = err.code === 'LIMIT_FILE_SIZE' ? 'The photo must be 5 MB or smaller.' : status === 500 ? 'Something went wrong on the server.' : err.message
  if (status === 500) console.error(err)
  res.status(status).json({ error: message })
})

app.listen(PORT, () => console.log(`API ready on http://localhost:${PORT}`))
