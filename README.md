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

`npm run seed` resets the database, then loads 12 sample creator accounts, 1 admin and the 2026 story archive. It writes the sample logins to `server/seed-credentials.local.md`. That file is git-ignored; don't commit it.

## Production

```bash
npm run build
npm start
```

`npm start` serves the built site, the API and uploaded photos from one Node process on `PORT` (default 5174). Run it behind HTTPS so the session cookie is marked secure (`NODE_ENV=production`). Keep the `data/` and `uploads/` folders on persistent storage.

## How it fits together

| Part | Where |
| --- | --- |
| Pages and components | `src/` |
| Shared section list and site settings | `src/data/site.js` |
| API server | `server/index.js` |
| Database schema | `server/db.js` (SQLite file in `data/technews.db`) |
| Sign-in, sessions and passwords | `server/auth.js` |
| Seed script and archive data | `server/seed.js`, `server/seed-data/` |

### API

Public:

- `GET /api/home`: latest stories and most read
- `GET /api/articles?section=&q=&limit=&offset=`: story lists and search
- `GET /api/articles/:slug`: one story plus related stories (counts a read)
- `GET /api/authors`, `GET /api/authors/:slug`: creators and their stories

Sign-in:

- `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`

Signed-in creators only (creators can change their own stories; admins can change any):

- `GET /api/studio/articles`: my stories
- `POST /api/studio/articles`: publish (multipart form with an `image` file)
- `GET /api/studio/articles/:slug`, `PUT /api/studio/articles/:slug`, `DELETE /api/studio/articles/:slug`

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
