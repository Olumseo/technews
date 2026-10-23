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
- Section pages at `/section/:slug`, article pages at `/article/:slug`
- Article pages have a reading progress bar, a "Listen" button that reads the story aloud, and a copy-link button
- Search overlay (press `/`), a light/dark theme toggle and a mobile menu
- Fonts: Newsreader for headlines and body text, Schibsted Grotesk for the interface

Story content lives in `src/data/articles.js`. All stories, people and market figures are fictional placeholders, and the images come from picsum.photos. Replace them with your CMS or API.

`vercel.json` sets up the SPA rewrites needed to deploy on Vercel.
