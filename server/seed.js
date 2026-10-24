// Resets the database and loads sample creators and stories.
// Run with: npm run seed
import { readFileSync, writeFileSync } from 'node:fs'
import { randomBytes } from 'node:crypto'
import { join } from 'node:path'
import { db, ROOT } from './db.js'
import { hashPassword } from './auth.js'
import { photoFor } from './photos.js'
import { isSection, slugify } from '../src/data/site.js'

const DATA = join(ROOT, 'server', 'seed-data')
const stories = JSON.parse(readFileSync(join(DATA, 'stories-2026.json'), 'utf8'))
const columns = JSON.parse(readFileSync(join(DATA, 'opinion.json'), 'utf8'))

// Sample creator accounts. These are fictional people: replace them with real staff before launch.
const CREATORS = [
  { name: 'Mei Ling Tan', title: 'Technology editor', beats: ['tech'], bio: 'Leads our technology coverage, from chips and cables to AI and the apps people use every day.' },
  { name: 'Priyanka Nair', title: 'Technology reporter', beats: ['tech'], bio: 'Covers start-ups, gadgets and digital policy across Southeast Asia.' },
  { name: 'Arjun Pillai', title: 'Business correspondent', beats: ['business'], bio: 'Writes about companies, trade and the money moving through the region.' },
  { name: 'Ethan Koh', title: 'Markets reporter', beats: ['business'], bio: 'Follows stocks, currencies and central banks, and explains what they mean for your wallet.' },
  { name: 'Sarah Lim', title: 'World affairs editor', beats: ['world'], bio: 'Explains global politics and diplomacy for readers in Singapore and beyond.' },
  { name: 'Hafiz Rahman', title: 'Asia correspondent', beats: ['asia'], bio: 'Reports on politics and society across Southeast Asia.' },
  { name: 'Kenji Watanabe', title: 'North Asia reporter', beats: ['asia', 'world'], bio: 'Covers Japan, Korea and China, with a focus on technology and trade.' },
  { name: 'Joanne Ng', title: 'Singapore reporter', beats: ['singapore'], bio: 'Covers housing, transport and public policy in Singapore.' },
  { name: 'Daniel Goh', title: 'Climate and science reporter', beats: ['climate'], bio: 'Writes about heat, water, energy and how the region is adapting to a warmer world.' },
  { name: 'Nurul Aisyah', title: 'Life and culture writer', beats: ['life'], bio: 'Writes about food, travel, design and culture.' },
  { name: 'Marcus Chia', title: 'Sports reporter', beats: ['sport'], bio: 'Covers sport in Singapore and Asia, from the national team to motor racing.' },
  { name: 'Rebecca Teo', title: 'Columnist', beats: ['opinion'], bio: 'Writes a weekly column on cities, technology and how we live together.' },
]

const email = (name) => `${slugify(name).replace(/-/g, '.')}@technews-sg.test`
const password = () => randomBytes(9).toString('base64url')

// Deterministic pseudo-random numbers so every seed run produces the same archive.
let state = 20260101
const rand = () => ((state = (state * 1664525 + 1013904223) % 4294967296) / 4294967296)
const between = (a, b) => Math.round(a + rand() * (b - a))

db.exec('DELETE FROM sessions; DELETE FROM articles; DELETE FROM users;')

const credentials = []
const insertUser = db.prepare(
  `INSERT INTO users (name, slug, email, role, title, bio, password_hash, is_sample, created_at)
   VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)`
)

const adminPass = password()
insertUser.run('Newsroom Admin', 'newsroom-admin', 'admin@technews-sg.test', 'admin', 'Administrator', '', hashPassword(adminPass), '2025-11-03T02:00:00.000Z')
credentials.push(['Newsroom Admin', 'admin', 'admin@technews-sg.test', adminPass])

const ids = {}
for (const c of CREATORS) {
  const pass = password()
  const joined = `2025-${String(between(11, 12)).padStart(2, '0')}-${String(between(1, 28)).padStart(2, '0')}T02:00:00.000Z`
  const { lastInsertRowid } = insertUser.run(c.name, slugify(c.name), email(c.name), 'creator', c.title, c.bio, hashPassword(pass), joined)
  ids[c.name] = Number(lastInsertRowid)
  credentials.push([c.name, 'creator', email(c.name), pass])
}

// Round-robin each section's stories across the creators who cover it.
const turn = {}
function authorFor(section) {
  const team = CREATORS.filter((c) => c.beats.includes(section))
  const pool = team.length ? team : CREATORS
  turn[section] = (turn[section] || 0) + 1
  return ids[pool[(turn[section] - 1) % pool.length].name]
}

// Published between 7am and 10pm Singapore time on the given date.
function publishedAt(date) {
  const minutes = between(7 * 60, 22 * 60)
  const d = new Date(`${date}T00:00:00+08:00`)
  d.setMinutes(minutes)
  return d > new Date() ? new Date(Date.now() - between(20, 240) * 60e3) : d
}

function views(published) {
  const days = (Date.now() - published) / 864e5
  if (days < 1) return between(150, 2400)
  return Math.round(between(1500, 9000) + Math.min(days, 120) * between(40, 260))
}

const insertArticle = db.prepare(
  `INSERT INTO articles (slug, section, title, dek, body, image_url, caption, quote, source_name, source_url,
                         author_id, read_minutes, views, is_sample, published_at, updated_at)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`
)
const taken = new Set()
function slugFor(title) {
  let slug = slugify(title)
  for (let i = 2; taken.has(slug); i++) slug = `${slugify(title)}-${i}`
  taken.add(slug)
  return slug
}

let count = 0
for (const s of [...stories, ...columns].sort((a, b) => a.date.localeCompare(b.date))) {
  if (!isSection(s.section)) continue
  const when = publishedAt(s.date)
  const words = s.body.join(' ').split(/\s+/).length
  insertArticle.run(
    slugFor(s.title), s.section, s.title, s.dek, JSON.stringify(s.body), photoFor(s.photo_topic),
    s.caption || '', s.quote || null, s.source_name || null, s.source_url || null,
    s.section === 'opinion' ? ids['Rebecca Teo'] : authorFor(s.section),
    Math.max(2, Math.ceil(words / 200)), views(when), when.toISOString(), when.toISOString()
  )
  count++
}

const file = join(ROOT, 'server', 'seed-credentials.local.md')
writeFileSync(
  file,
  `# Sample accounts (local only, not committed)\n\nThese are test logins for the sample data. Re-running \`npm run seed\` replaces them.\n\n| Name | Role | Email | Password |\n| --- | --- | --- | --- |\n${credentials
    .map((c) => `| ${c.join(' | ')} |`)
    .join('\n')}\n`
)

console.log(`Seeded ${CREATORS.length} creators, 1 admin and ${count} stories.`)
console.log(`Sign-in details written to ${file}`)
