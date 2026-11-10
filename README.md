# technews

**Tech News Singapore**: a news site with a React front end, an Express API and a SQLite database. Signed-in creators can write, upload and edit stories in a private studio.

## Run it locally

Needs Node 22.13 or newer (it uses Node's built-in SQLite).

```bash
npm install
npm run seed
npm run dev
```

- Site: http://localhost:5173
- API: http://localhost:5174

`npm run seed` resets the database and deletes uploaded photos, then loads 12 sample creator accounts, 1 admin and the 2026 story archive. It writes the sample logins to `server/seed-credentials.local.md`. That file is git-ignored; don't commit it.

## Production

```bash
npm run build
npm start
```

`npm start` serves the built site, the API and uploaded photos from one Node process on `PORT` (default 5174). Run it behind HTTPS so the session cookie is marked secure (`NODE_ENV=production`). Keep the `data/` and `uploads/` folders on persistent storage.

### Deploying on Vercel

Vercel works, but **read-only**, because it has no permanent storage for the database or uploaded photos. The build creates a database from the seed data (`npm run seed`), and `api/index.js` serves it as a serverless function. Readers get the full site, but sign-up, sign-in and publishing are switched off, and new stories only appear by adding them to `server/seed-data/` and redeploying. For accounts and the studio, use a host with a permanent disk (`npm start`, as above).

## How it fits together

| Part | Where |
| --- | --- |
| Pages and components | `src/` |
| Shared section list and site settings | `src/data/site.js` |
| API server | `server/index.js` |
| Database schema | `server/db.js` (SQLite file in `data/technews.db`) |
| Sign-in, sessions and passwords | `server/auth.js` |
| Seed script and archive data | `server/seed.js`, `server/seed-data/` |

### Creator marketplace

Anyone can open a creator account at `/join` and publish through the studio.

- **New creators are reviewed.** Stories from community creators wait in the admin's **Review** queue (`/studio/review`) until an editor approves them or sends them back with a note. Creators see each story's status (Published, In review, Not approved) in their studio, and editing a story sends it back for review.
- **Trusted creators publish instantly.** The admin can trust, untrust, suspend or reinstate accounts at `/studio/creators`. Only trusted creators and admins can flag breaking news. Suspending an account hides its stories and signs it out. The seeded newsroom creators start as trusted.
- **Readers can tell who wrote what.** Stories by community creators carry a "Community contributor" label. `/creators` lists newsroom and community creators, and `/guidelines` sets out the rules creators agree to.
- **Spam protection:** a hidden honeypot field, at most 30 sign-up attempts an hour and 5 new accounts a day per IP address, plus the existing CSRF header check.
- **Instant publishing for everyone:** set `REQUIRE_REVIEW=false`. Not recommended for a public site.
- **Email:** new accounts are not email-verified yet, because the site has no email service. Add verification before opening sign-up widely.

### Story formatting

Story bodies are split into blocks by blank lines. In the studio, creators can also use:

- `## Heading` on its own line for a subheading
- lines starting with `- ` for a bullet list
- `[link text](https://example.com)` for a link (only `http` and `https` links become clickable)

Everything is rendered as text, so a story can't inject HTML into the page.

`server/seed-data/features.json` holds full-length features written for the site, such as the October tech-stocks analysis. `npm run seed` loads them with their real dates and named creators.

### Breaking news

- Creators flag a story as breaking with the **Breaking news** switch in the studio. The flag lasts 12 hours (`breaking_until` in the database), then the story becomes a normal story again.
- While anything is breaking, a red banner replaces the "Latest" ticker on every page, the home page opens with a Breaking news block, and a red **Breaking** link appears in the menu.
- `/breaking` lists current breaking stories, newest first. Readers can hide the banner for the rest of their visit.
- `npm run seed` loads the stories in `server/seed-data/breaking.json`. They count as breaking for 48 hours after their publish time, so older ones load as normal stories and never bring the banner back.

### Feeds and sharing

- `/rss.xml`: the 30 latest stories
- `/sitemap.xml`: every page, for search engines
- `/robots.txt`: keeps the studio, sign-in and API out of search results
- In production (`npm start`), each story page's HTML includes its own title, description and Open Graph image, so shared links show a preview card. Set `SITE_URL` (for example `https://technews.sg`) so these links are absolute.
- The header's weather is live Singapore data from Open-Meteo, cached on the server for 15 minutes.

### API

Public:

- `GET /api/home`: latest stories and most read
- `GET /api/breaking`: stories flagged as breaking right now
- `GET /api/articles?section=&q=&limit=&offset=`: story lists and search
- `GET /api/articles/:slug`: one story plus related stories (counts a read)
- `GET /api/authors`, `GET /api/authors/:slug`: creators and their stories

Sign-in:

- `POST /api/auth/signup`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`

Signed-in creators only (creators can change their own stories; admins can change any):

- `PUT /api/studio/profile`: name, short description and bio

- `GET /api/studio/articles`: my stories
- `POST /api/studio/articles`: publish (multipart form with an `image` file)
- `GET /api/studio/articles/:slug`, `PUT /api/studio/articles/:slug`, `DELETE /api/studio/articles/:slug`

Admins only:

- `GET /api/studio/review`, `POST /api/studio/review/:slug/approve`, `POST /api/studio/review/:slug/reject` (with a `note`)
- `GET /api/studio/creators`, `PATCH /api/studio/creators/:slug` (`trusted`, `status`)

Security notes:

- Passwords are hashed with scrypt.
- Sessions are random tokens stored hashed, sent as an `httpOnly`, `SameSite=Lax` cookie.
- Every non-GET request must send `X-Requested-With: tns`, which blocks cross-site form posts.
- Sign-in is rate limited.
- Uploads accept JPG, PNG or WebP up to 5 MB and are saved under random file names.

## About the content

- **Archive:** the 2026 stories summarise real news in our own words. Each one links to the report it is based on. Spot-check facts and sources before publishing.
- **Sample accounts:** the creator accounts are fictional and flagged `is_sample = 1` in the database. Replace them with real staff before the site goes public.
- **Photos:** archive photos come from Unsplash and are free to use under the Unsplash License.
- **Forms:** the newsletter and contact forms are not connected to an email service yet.
