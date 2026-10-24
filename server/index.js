import express from 'express'
import multer from 'multer'
import { randomBytes } from 'node:crypto'
import { existsSync, mkdirSync, unlinkSync } from 'node:fs'
import { join, basename } from 'node:path'
import { db, ROOT } from './db.js'
import { createSession, destroySession, loadUser, loginLimiter, requireAuth, verifyPassword } from './auth.js'
import { isSection, slugify } from '../src/data/site.js'

const PORT = Number(process.env.PORT) || 5174
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
  a.source_name, a.source_url, a.read_minutes, a.views, a.published_at, a.updated_at,
  u.name AS author_name, u.slug AS author_slug, u.title AS author_title`

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
      ORDER BY a.published_at DESC LIMIT 80`
  )
  const mostRead = list(
    `SELECT ${ARTICLE_COLUMNS} FROM articles a JOIN users u ON u.id = a.author_id
      WHERE a.published_at > ? ORDER BY a.views DESC LIMIT 5`,
    new Date(Date.now() - 45 * 864e5).toISOString()
  )
  res.json({ latest, mostRead })
})

app.get('/api/articles', (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 24, 60)
  const offset = Math.max(Number(req.query.offset) || 0, 0)
  const where = []
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
  const clause = where.length ? `WHERE ${where.join(' AND ')}` : ''
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
    .prepare(`SELECT ${ARTICLE_COLUMNS}, a.id FROM articles a JOIN users u ON u.id = a.author_id WHERE a.slug = ?`)
    .get(req.params.slug)
  if (!row) return res.status(404).json({ error: 'Story not found.' })
  db.prepare('UPDATE articles SET views = views + 1 WHERE id = ?').run(row.id)
  const related = list(
    `SELECT ${ARTICLE_COLUMNS} FROM articles a JOIN users u ON u.id = a.author_id
      WHERE a.section = ? AND a.slug != ? ORDER BY a.published_at DESC LIMIT 3`,
    row.section, row.slug
  )
  res.json({ article: toArticle(row, { full: true }), related })
})

app.get('/api/authors', (_req, res) => {
  const rows = db
    .prepare(
      `SELECT u.name, u.slug, u.title, COUNT(a.id) AS stories
         FROM users u LEFT JOIN articles a ON a.author_id = u.id
        WHERE u.role = 'creator' GROUP BY u.id ORDER BY u.name`
    )
    .all()
  res.json({ items: rows.map((r) => ({ ...r })) })
})

app.get('/api/authors/:slug', (req, res) => {
  const user = db.prepare(`SELECT id, name, slug, title, bio FROM users WHERE slug = ?`).get(req.params.slug)
  if (!user) return res.status(404).json({ error: 'Reporter not found.' })
  const stories = list(
    `SELECT ${ARTICLE_COLUMNS} FROM articles a JOIN users u ON u.id = a.author_id
      WHERE a.author_id = ? ORDER BY a.published_at DESC LIMIT 50`,
    user.id
  )
  res.json({ author: { name: user.name, slug: user.slug, role: user.title, bio: user.bio }, stories })
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
  db.prepare('DELETE FROM sessions WHERE expires_at < ?').run(new Date().toISOString())
  createSession(res, user.id)
  res.json({ user: { name: user.name, slug: user.slug, email: user.email, role: user.role, title: user.title } })
})

app.post('/api/auth/logout', (req, res) => {
  destroySession(req, res)
  res.json({ ok: true })
})

app.get('/api/auth/me', (req, res) => {
  res.json({ user: req.user || null })
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
  const items = list(
    `SELECT ${ARTICLE_COLUMNS} FROM articles a JOIN users u ON u.id = a.author_id ${mine}
      ORDER BY a.published_at DESC LIMIT 200`,
    ...params
  )
  res.json({ items })
})

app.get('/api/studio/articles/:slug', requireAuth, (req, res) => {
  const row = ownedArticle(req, res)
  if (!row) return
  res.json({
    article: {
      slug: row.slug, section: row.section, title: row.title, dek: row.dek, caption: row.caption,
      quote: row.quote || '', sourceName: row.source_name || '', sourceUrl: row.source_url || '',
      body: JSON.parse(row.body).join('\n\n'), image: row.image_url,
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
  db.prepare(
    `INSERT INTO articles (slug, section, title, dek, body, image_url, caption, quote, source_name, source_url,
                           author_id, read_minutes, published_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    slug, input.section, input.title, input.dek, JSON.stringify(input.paragraphs), `/uploads/${req.file.filename}`,
    input.caption, input.quote, input.source_name, input.source_url, req.user.id, readMinutes(input.paragraphs), now, now
  )
  res.status(201).json({ slug })
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
  db.prepare(
    `UPDATE articles SET section = ?, title = ?, dek = ?, body = ?, image_url = ?, caption = ?, quote = ?,
            source_name = ?, source_url = ?, read_minutes = ?, updated_at = ? WHERE id = ?`
  ).run(
    input.section, input.title, input.dek, JSON.stringify(input.paragraphs), image, input.caption, input.quote,
    input.source_name, input.source_url, readMinutes(input.paragraphs), new Date().toISOString(), row.id
  )
  res.json({ slug: row.slug })
})

app.delete('/api/studio/articles/:slug', requireAuth, (req, res) => {
  const row = ownedArticle(req, res)
  if (!row) return
  db.prepare('DELETE FROM articles WHERE id = ?').run(row.id)
  removeUpload(row.image_url)
  res.json({ ok: true })
})

/* ---------- Static files ---------- */

app.use('/uploads', express.static(UPLOADS, { maxAge: '30d', immutable: true }))
app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found.' }))

if (existsSync(DIST)) {
  app.use(express.static(DIST, { index: false }))
  app.get('*', (_req, res) => res.sendFile(join(DIST, 'index.html')))
}

// Errors from multer and elsewhere come back as plain JSON messages.
app.use((err, _req, res, _next) => {
  const status = err.status || (err.code === 'LIMIT_FILE_SIZE' ? 400 : 500)
  const message = err.code === 'LIMIT_FILE_SIZE' ? 'The photo must be 5 MB or smaller.' : status === 500 ? 'Something went wrong on the server.' : err.message
  if (status === 500) console.error(err)
  res.status(status).json({ error: message })
})

app.listen(PORT, () => console.log(`API ready on http://localhost:${PORT}`))
