# technews

**Tech News Singapore**: a news site built with React and Vite. It covers technology, business and world news from Singapore.

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:5173.

## Build

```bash
npm run build
npm run preview
```

## What's inside

- Front page: lead story, a live "Latest" timeline, a markets strip, an Asia block, world clocks, opinion, most read, a newsletter sign-up and section rails
- Section pages at `/section/:slug`, article pages at `/article/:slug`, reporter pages at `/author/:slug`
- Newsletters (`/newsletters`), About, Contact, Corrections and Privacy pages; forms validate but send nothing
- 36 stories, four in every section, plus a back-to-top button on long pages
- Article pages have a reading progress bar, a "Listen" button that reads the story aloud, and a copy-link button
- Simple text menu for sections, with a labelled Menu button on phones
- Light theme with one accent colour (deep red), set in Archivo; search opens with the `/` key

Story content lives in `src/data/articles.js`. All stories, people and market figures are fictional placeholders, Photos come from Unsplash and are free to use under the Unsplash License. Replace the stories with your CMS or API.

`vercel.json` sets up the SPA rewrites needed to deploy on Vercel.
